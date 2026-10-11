/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 流派技能 (starter active skills). The layer is opt-in per run, so a third of these tests exist to
// prove the untouched path: a run without the marker must have no skill, write no field and keep a
// byte-identical snapshot. The rest drive one release per starter and check that the release spends
// the resource the table names, drives the mechanic its own starter already has, and leaves exactly
// one settlement receipt behind.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {SKILLS,SKILL_VERSION,SKILL_EMPOWER_WINDOW,SKILL_ALLY_HASTE,SKILL_GUARD_WINDOW,SKILL_GUARD_BONUS,SKILL_GUARD_SHIELD,skillIds,skillById,skillForPath,skillCostOf,skillResourceLabel,skillPool,skillEffectText,skillDeclared} from '../gameplay/skills.js';
import {DEFAULT_KEYS,bindingError,invalidBindings} from '../gameplay/keybindings.js';
import {initialSave} from '../gameplay/data.js';
import {normalizeSave} from '../gameplay/save-store.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const step=(b,n)=>{for(let i=0;i<n;i++)b.update(1/60);};
const battle=(options={})=>{const b=new Expedition({seed:'starter-1',path:0,...options});b.start();if(b.cinematic)b.advanceCinematic(true);return b;};
// Test battles must not receive director reinforcements, so `controlled` shadows the spawner. Units
// are placed by the test itself with a huge HP pool so one assertion cannot be masked by a kill.
const controlled=b=>{b.updateDirector=null;b.boss=null;b.enemies=[];b.waveTime=0;b.place=b.spawn.bind(b);b.spawn=()=>null;return b;};
const unit=(b,opts={})=>{const e=b.place(0,{hp:1e9,speed:0,...opts});b.rebuildHash();return e;};
// A declared run with both pools topped up, allies already deployed, and the fight out of reach so
// only the skill under test can move the numbers.
const armed=(path,extra={})=>{
 const b=controlled(battle({path,skillVersion:SKILL_VERSION,...extra}));
 b.player.mana=100;b.player.reserve=b.player.maxReserve;
 step(b,1);
 return b;
};
const plain=path=>controlled(battle({path}));

void test('the skill table names one skill per starter with a unique id and a real cost',()=>{
 assert.equal(SKILL_VERSION,1);
 assert.equal(SKILLS.length,6);
 assert.equal(new Set(skillIds).size,SKILLS.length);
 assert.deepEqual(SKILLS.map(s=>s.path),[0,1,2,3,4,5]);
 for(const s of SKILLS){
  assert.equal(typeof s.id,'string');
  assert.equal(typeof s.name,'string');
  assert.equal(typeof s.desc,'string');
  assert.ok(['mana','reserve'].includes(s.resource),s.id+' names an unknown resource');
  assert.ok(Number.isFinite(s.cost)&&s.cost>0,s.id+' has no cost');
  assert.equal(skillById(s.id),s);
  assert.equal(skillForPath(s.path),s);
 }
 assert.equal(skillById('does-not-exist'),null);
 assert.equal(skillForPath(6),null);
 assert.equal(skillForPath(undefined),null);
 assert.equal(skillCostOf(null),0);
 assert.equal(skillCostOf(skillForPath(1)),15);
 assert.equal(skillResourceLabel(skillForPath(1)),'雷源');
 assert.equal(skillResourceLabel(skillForPath(0)),'灵力');
 assert.equal(skillResourceLabel(null),'灵力');
});

void test('the pool a skill draws on is the resource the table names',()=>{
 const mana=armed(0),reserve=armed(1);
 mana.player.mana=42.5;mana.player.reserve=7;
 assert.equal(skillPool(mana,skillForPath(0)),42.5);
 assert.equal(skillPool(mana,skillForPath(1)),7);
 reserve.player.mana=33;reserve.player.reserve=88;
 assert.equal(skillPool(reserve,skillForPath(1)),88,'the 雷法 pool is 雷源');
 assert.equal(skillPool(reserve,skillForPath(0)),33,'the same run still reports 灵力 for a 灵力 skill');
 assert.equal(skillPool(null,skillForPath(0)),0);
 assert.equal(skillPool(mana,null),0);
});

void test('a run without the marker gets no skill, writes no field and keeps its snapshot clean',()=>{
 const b=plain(0);
 assert.equal(skillDeclared(b.options),false);
 assert.equal(skillDeclared({}),false);
 assert.equal(skillDeclared({skillVersion:0}),false);
 assert.equal(b.skillCasts,undefined);
 assert.equal(b.skillReceipts,undefined);
 assert.equal(b.useSkill(),false);
 assert.deepEqual(b.skillReadiness(),{skill:null,cost:0,resource:'mana',ready:false,pool:0,blocked:'未启用',label:'未启用'});
 b.player.mana=100;
 assert.equal(b.useSkill(),false,'the refusal is the marker, not the resource');
 assert.equal(b.skillCasts,undefined);
 const d=b.serialize();
 assert.equal('skillCasts' in d,false);
 assert.equal('skillReceipts' in d,false);
 assert.equal(Object.keys(d.options).some(k=>k.startsWith('skill')),false);
 assert.equal(JSON.stringify(d).includes('skill'),false,'no skill field leaks into a markerless run');
 assert.equal(skillEffectText(0,{}),'');
 assert.equal(skillEffectText(0,{skillVersion:0}),'');
 assert.equal(skillEffectText(0,{skillVersion:SKILL_VERSION}).startsWith('聚锋引（耗灵力 35）：'),true);
});

void test('a markerless snapshot refuses a cast counter or a receipt',()=>{
 const b=plain(0);
 const d=copy(b.serialize());
 for(const mutate of [
  t=>{t.skillCasts=1},
  t=>{t.skillReceipts=['0-1']},
  t=>{t.skillReceipts=[]},
 ]){
  const tampered=copy(d);mutate(tampered);
  assert.throws(()=>Expedition.restore(tampered),/流派技能/);
 }
});

void test('聚锋引 banks one guaranteed empowered strike inside its window',()=>{
 const b=armed(0);
 assert.equal(b.skillReadiness().skill.id,'focusLead');
 assert.equal(b.player.mana,100);
 assert.equal(b.useSkill(),true);
 assert.equal(b.player.mana,65,'the cost comes off 灵力');
 assert.ok(b.player.buffs.skillEmpower>b.time,'the window is armed');
 assert.ok(b.player.buffs.skillEmpower<=b.time+SKILL_EMPOWER_WINDOW+1e-6);
 const e=unit(b,{x:b.player.x+60,y:b.player.y});
 b.hit(e,10,'sword');
 assert.equal(b.player.buffs.skillEmpower,0,'the next sword hit spends the window');
 assert.ok(e.hp<1e9);
});

void test('聚锋引 does not stack a second bonus on a hit that already empowered itself',()=>{
 // 御剑's own 四击聚锋 sets the same flag, so the banked window must be consumed without doubling.
 const b=armed(0);
 const e=unit(b,{x:b.player.x+60,y:b.player.y});
 e.focusHits=3;e.focusUntil=b.time+2;
 assert.equal(b.useSkill(),true);
 const before=e.hp;
 b.hit(e,10,'sword');
 assert.equal(b.player.buffs.skillEmpower,0);
 assert.ok(before-e.hp>10,'the strike is still empowered once');
});

void test('引雷 buys the whole thunder with 雷源 instead of 灵力',()=>{
 const b=armed(1);
 const reserve=b.player.reserve,thunders=b.thunders;
 b.player.mana=0;
 assert.equal(b.skillReadiness().skill.id,'callThunder');
 assert.equal(b.useSkill(),true);
 assert.equal(b.player.mana,100,'灵力 is filled, not spent');
 assert.equal(b.player.reserve,reserve-15,'the cost comes off 雷源');
 assert.equal(b.thunders,thunders+1,'the release is a real 辟邪神雷');
 assert.equal(b.thunderTime,b.time,'the 余雷 window is refreshed');
});

void test('弩机齐射 empties every puppet cooldown and doubles their cadence',()=>{
 const b=armed(2);
 assert.ok(b.puppets.length>0,'the 傀儡 starter fields its puppets');
 assert.equal(b.skillReadiness().skill.id,'volley');
 for(const a of b.puppets)a.cool=5;
 assert.equal(b.useSkill(),true);
 assert.ok(b.puppets.every(a=>a.cool===0),'the volley is immediate');
 assert.ok(b.player.buffs.skillPuppetHaste>b.time);
 const target=unit(b,{x:b.player.x+90,y:b.player.y});
 step(b,2);
 assert.ok(b.puppets.some(a=>a.cool>0),'the puppets fired');
 assert.ok(b.puppets.every(a=>a.cool<=.7/2+1e-6),'the cadence is at least doubled');
 step(b,20);
 assert.ok(target.hp<1e9,'the volley shot reaches the target');
});

void test('虫噬号令 sends the swarm at the focus target and halves its bite interval',()=>{
 const b=armed(3);
 assert.ok(b.insects.length>0,'the 御虫 starter fields its bugs');
 assert.equal(b.skillReadiness().skill.id,'swarmOrder');
 const near=unit(b,{x:b.player.x+180,y:b.player.y});
 const far=unit(b,{x:b.player.x+520,y:b.player.y+40});
 assert.equal(b.insectOrderTarget(),near,'without an aim point the closest enemy is ordered');
 b.input.focus=true;b.input.aim={x:far.x,y:far.y};
 assert.equal(b.insectOrderTarget(),far,'an aim point overrides the closest enemy');
 b.input.focus=false;b.input.aim=null;
 assert.equal(b.useSkill(),true);
 assert.ok(b.insects.every(a=>Math.hypot(a.x-near.x,a.y-near.y)<40),'the swarm is moved onto the target');
 assert.ok(b.player.buffs.skillInsectHaste>b.time);
 step(b,2);
 assert.ok(b.insects.every(a=>a.cool<=.65/2+1e-6),'the bite interval is at least halved');
});

void test('引符 places a sigil at the player and ignores the independent cooldown',()=>{
 const b=armed(4);
 assert.equal(b.skillReadiness().skill.id,'sigilLead');
 b.lastSigil=b.time; // the dash would be on cooldown here
 assert.equal(b.dash(),true);
 assert.equal(b.zones.filter(z=>z.sigil).length,0,'the dash respects its cooldown');
 assert.equal(b.useSkill(),true);
 const placed=b.zones.filter(z=>z.sigil);
 assert.equal(placed.length,1,'引符 places anyway');
 assert.equal(placed[0].kind,'sigil');
 assert.ok(Math.abs(placed[0].x-b.player.x)<1e-6&&Math.abs(placed[0].y-b.player.y)<1e-6);
 assert.equal(b.lastSigil,b.time,'the cooldown restarts from the skill');
 assert.equal(b.player.mana,100-35);
});

void test('守元 grants shield, widens the 化解 window and raises counter damage',()=>{
 const b=armed(5);
 const shield=b.player.shield,window=b.counterWindow();
 assert.equal(b.skillReadiness().skill.id,'wardUp');
 assert.equal(b.useSkill(),true);
 assert.ok(Math.abs(b.player.shield-(shield+SKILL_GUARD_SHIELD))<1e-6);
 assert.ok(b.player.buffs.skillGuard>b.time);
 assert.ok(Math.abs(b.counterWindow()-(window+SKILL_GUARD_WINDOW))<1e-6,'the window widens by the table value');
 assert.ok(SKILL_GUARD_BONUS>0);
});

void test('the window of 守元 closes on its own and the extra shield is capped by 常规上限',()=>{
 const b=armed(5);
 b.useSkill();
 const guard=b.player.buffs.skillGuard;
 step(b,Math.ceil(SKILL_ALLY_HASTE*60)+4);
 assert.ok(b.player.buffs.skillGuard<=b.time,'the buff expires');
 assert.ok(b.counterWindow()<SKILL_GUARD_WINDOW+ .25+1e-6);
 // A second cast while already over the regular cap only tops up to 常规上限 + 25.
 b.player.mana=100;
 const before=b.player.shield;
 assert.equal(b.useSkill(),true);
 assert.ok(b.player.shield<=b.player.maxShield+SKILL_GUARD_SHIELD+1e-6);
 assert.ok(b.player.shield>=before-1e-6);
 assert.ok(guard>0);
});

void test('a short pool refuses the release without spending it or writing a receipt',()=>{
 const mana=armed(0);
 mana.player.mana=10;
 assert.equal(mana.skillReadiness().ready,false);
 assert.equal(mana.skillReadiness().label,'灵力 10 / 35');
 assert.equal(mana.useSkill(),false);
 assert.equal(mana.player.mana,10,'a refused release spends nothing');
 assert.equal(mana.skillCasts,0);
 assert.deepEqual(mana.skillReceipts,[]);
 assert.equal(mana.player.buffs.skillEmpower,undefined);
 const reserve=armed(1);
 reserve.player.reserve=5;
 assert.equal(reserve.skillReadiness().ready,false);
 assert.equal(reserve.skillReadiness().label,'雷源 5 / 15');
 assert.equal(reserve.useSkill(),false);
 assert.equal(reserve.player.reserve,5);
 assert.equal(reserve.skillCasts,0);
});

void test('a release outside battle is refused even with a full pool',()=>{
 const b=armed(0);
 b.modeState='pause';
 assert.equal(b.skillReadiness().ready,false);
 assert.equal(b.useSkill(),false);
 assert.equal(b.skillCasts,0);
 assert.deepEqual(b.skillReceipts,[]);
 b.modeState='battle';
 assert.equal(b.skillReadiness().ready,true);
 assert.equal(b.useSkill(),true);
});

void test('readiness is per starter, so one path never borrows another path skill',()=>{
 for(const s of SKILLS){
  const b=armed(s.path);
  const state=b.skillReadiness();
  assert.equal(state.skill,s);
  assert.equal(state.cost,s.cost);
  assert.equal(state.resource,s.resource);
  assert.equal(state.ready,true);
  assert.equal(state.label,'可以施展');
  b.player.mana=0;b.player.reserve=0;
  assert.equal(b.skillReadiness().ready,false);
  assert.equal(b.useSkill(),false);
 }
});

void test('every release leaves exactly one receipt and the sequence is monotonic',()=>{
 const b=armed(2);
 for(let i=0;i<3;i++){b.player.mana=100;assert.equal(b.useSkill(),true);}
 assert.equal(b.skillCasts,3);
 assert.deepEqual(b.skillReceipts,['2-1','2-2','2-3']);
 assert.equal(new Set(b.skillReceipts).size,3);
 assert.deepEqual(b.summary().skills,{casts:3,receipts:3});
});

void test('the skill snapshot round-trips and every tamper is refused',()=>{
 const b=armed(2);
 assert.equal(b.useSkill(),true);
 const d=b.serialize();
 assert.equal(d.skillCasts,1);
 assert.deepEqual(d.skillReceipts,['2-1']);
 assert.equal(d.options.skillVersion,SKILL_VERSION);
 const restored=Expedition.restore(copy(d));
 assert.equal(restored.skillCasts,1);
 assert.deepEqual(restored.skillReceipts,['2-1']);
 assert.equal(skillDeclared(restored.options),true);
 assert.equal(restored.useSkill(),true,'a restored run can still release');
 assert.deepEqual(restored.skillReceipts,['2-1','2-2']);
 for(const mutate of [
  t=>{t.skillReceipts=['2-1','2-1']},
  t=>{t.skillReceipts=['2-2']},
  t=>{t.skillReceipts=['2-1','2-3']},
  t=>{t.skillReceipts=['3-1']},
  t=>{t.skillReceipts=['2-0']},
  t=>{t.skillReceipts=['2-x']},
  t=>{t.skillReceipts=[1]},
  t=>{t.skillCasts=2},
  t=>{t.skillCasts=-1},
  t=>{t.skillReceipts=[]},
  t=>{delete t.skillCasts},
  t=>{delete t.options.skillVersion},
  t=>{t.options.skillVersion=2},
  t=>{t.options.path=9},
 ]){
  const tampered=copy(d);mutate(tampered);
  assert.throws(()=>Expedition.restore(tampered),/流派技能/);
 }
});

void test('skillVersion 0 is an opt-out, not a version mismatch',()=>{
 const b=controlled(battle({path:0,skillVersion:0}));
 assert.equal(skillDeclared(b.options),false);
 assert.equal(b.useSkill(),false);
 assert.equal(b.skillCasts,undefined);
 const d=copy(b.serialize());
 assert.equal(d.options.skillVersion,0);
 const restored=Expedition.restore(d);
 assert.equal(skillDeclared(restored.options),false);
 assert.equal(restored.skillCasts,undefined);
 assert.throws(()=>Expedition.restore({...d,skillCasts:1}),/流派技能/);
});

void test('流派技能 has its own key slot and the save defaults agree',()=>{
 assert.equal(DEFAULT_KEYS.skill,'KeyG');
 assert.deepEqual(invalidBindings(DEFAULT_KEYS),[]);
 assert.ok(!bindingError('KeyG'),'the new slot is a legal binding');
 assert.equal(initialSave().keymap,undefined,'keymap is optional, filled from DEFAULT_KEYS on load');
 const s=normalizeSave({...initialSave(),keymap:{...DEFAULT_KEYS,skill:'KeyG'}});
 assert.equal(s.keymap.skill,'KeyG');
 // The new slot must not collide with any pre-existing binding.
 const others=Object.entries(DEFAULT_KEYS).filter(([id])=>id!=='skill').map(([,code])=>code);
 assert.equal(others.includes(DEFAULT_KEYS.skill),false);
});
