/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {TRAITS,COMBOS,initialSave} from '../gameplay/data.js';
import {STORY_ITEMS} from '../gameplay/journal.js';
import {catalogItemState} from '../gameplay/catalog-state.js';
import {comboDescription,swordPuppetBonus,traitComboBenefit} from '../gameplay/combo-description.js';
import {emptySigilStreak} from '../gameplay/sigil-metrics.js';
const make=(path=2)=>new Expedition({path,seed:'step2-display',runId:'step2-display',difficulty:1,meta:[],balanceVersion:3});
const puppet={'puppet-0':1,'puppet-1':1,'puppet-2':1};
const combo=COMBOS.find(c=>c.effect==='swordPuppet');
function shot(b){b.level=72;b.recalc();b.modeState='battle';b.time=5;b.stillTime=1;b.player.moving=false;b.player.x=640;b.player.y=420;b.enemies=[];b.spawn(0,{x:800,y:420,hp:1e6,noDrop:true});b.puppets=Array.from({length:b.stats.puppets},()=>({x:640,y:420,cool:0}));const shots=[];b.shoot=(x,y,a,d)=>shots.push(d);b.rebuildHash();b.updateAllies(1/60);return shots[0];}
await test('D1 treasure completion immediately supplies catalog inventory, with no chapter inference or writes',()=>{
 const b=new Expedition({chapter:3,seed:'step2-treasure',runId:'step2-treasure'});b.beginNode();
 const items=STORY_ITEMS.filter(r=>['five-rings','cape'].includes(r.id));
 for(const r of items)assert.match(catalogItemState(r,{...initialSave(),checkpoint:b.serialize()}).inventory,/尚未取得/);
 for(let i=0;i<1820&&b.modeState==='battle';i++){b.player.x=b.mechanism.x;b.player.y=b.mechanism.y;b.time+=1/60;b.waveTime+=1/60;b.updateDirector(1/60);}
 assert.equal(b.chapter,3);assert.equal(b.wave,0);assert.ok(b.receipts.includes('3:0'));
 const save={...initialSave(),unlocked:3,completed:[0,1,2],checkpoint:b.serialize()},before=JSON.stringify(save);
 for(const current of [save,JSON.parse(before),{...save,checkpoint:Expedition.restore(save.checkpoint).serialize()}])for(const r of items){const s=catalogItemState(r,current);assert.match(s.history,/已历经/,'round-2 C-6: the 3:0 treasure receipt now counts as having lived through the event');assert.match(s.inventory,/已持有/);assert.match(s.configuration,/未配置/);}
 assert.equal(JSON.stringify(save),before);
 const newer={...initialSave(),wins:1,unlocked:5,checkpoint:make().serialize()};
 for(const r of items){const s=catalogItemState(r,newer);assert.match(s.history,/已历经/);assert.match(s.inventory,/尚未取得/);}
 save.checkpoint.relics.push('five-rings');assert.match(catalogItemState(items[0],save).configuration,/携行效果生效/);
 assert.match(catalogItemState(items[0],initialSave()).inventory,/暂无续玩/);
 const legacy=structuredClone(save);delete legacy.checkpoint.storyInventory;const legacyBefore=JSON.stringify(legacy);assert.match(catalogItemState(items[0],legacy).inventory,/旧局未记录/);assert.match(catalogItemState(items[0],legacy).configuration,/携行效果生效/);assert.equal(JSON.stringify(legacy),legacyBefore);
 for(const id of ['crystal','cauldron','iceflame'])assert.match(catalogItemState(STORY_ITEMS.find(r=>r.id===id),newer).inventory,/无独立持有记录/);
});
for(const [third,bonus,damage] of [['sword-11',0,96.624],['sword-0',.15,111.1176]])await test('D2 '+third+' actual combo preview, formation and unchanged projectile damage',()=>{
 const b=make();b.traits={...puppet,'sword-1':1,'sword-2':1};b.recalc();const candidate=TRAITS.find(t=>t.id===third),before=JSON.stringify(b.serialize()),rng=b.rng.state();
 assert.match(traitComboBenefit(candidate,b),new RegExp('额外 \\+'+(bonus*100)+'%'));
 assert.equal(JSON.stringify(b.serialize()),before);assert.equal(b.rng.state(),rng);
 b.traits[third]=1;b.recalc();assert.ok(b.comboSet.has('swordPuppet'));assert.equal(swordPuppetBonus(b),bonus);
 assert.match(comboDescription(combo,b),new RegExp('当前 \\+'+(bonus*100)+'%'));assert.match(comboDescription(combo,b),/不含群锋及条件增伤/);
 assert.equal(swordPuppetBonus(b.serialize()),bonus);assert.ok(Math.abs(shot(b)-damage)<1e-8);
 assert.equal(traitComboBenefit(candidate,b),'');
});
await test('D2 saved-source sum matches live stats; other combos and nonforming choices remain unchanged',()=>{
 for(let path=0;path<6;path++){const b=make(path);b.traits={'sword-0':3,'sword-11':3,'guard-9':1};b.relics=['refinement','kit-0-0','kit-0-4'];b.recalc();assert.ok(Math.abs(swordPuppetBonus(b)-swordPuppetBonus(b.serialize()))<1e-12);}
 const b=make();assert.equal(traitComboBenefit(TRAITS[0],b),'');assert.equal(comboDescription(COMBOS[0],b),COMBOS[0].desc);
});
function sigilFixture(){const b=make(4);b.beginNode();b.clearField();b.updateDirector=()=>{};b.updateEnemy=()=>{};b.updateSwords=()=>{};b.updateAllies=()=>{};b.updateEnvironment=()=>{};b.input={x:1,y:0};return b;}
function detonate(b,{hit=false,blocked=false,echo=false}={}){b.time+=7;b.waveTime+=7;b.combatCues=[];b.enemies=[];const z={x:640,y:400,r:85,ttl:2.75,warn:0,kind:'sigil',friendly:true,sigil:true,damage:50,...(echo?{metaEcho:true}:{})};b.zones=[z];if(hit||blocked){const e=b.spawn(0,{x:640,y:400,hp:1e6,speed:0});if(blocked)e.phaseShield=1;}b.rebuildHash();b.updateDirector=()=>{};b.updateEnemy=()=>{};b.updateSwords=()=>{};b.updateAllies=()=>{};b.updateEnvironment=()=>{};b.update(1/60);return b.combatCues.map(c=>c.text);}
await test('D3 only third empty main sigil teaches; persisted history survives restore; hits/blocks reset, echoes do not',()=>{
 let b=sigilFixture();
 for(let i=1;i<=4;i++){
  const cues=detonate(b);assert.equal(cues.some(t=>t.includes('把追兵引入')),i===3);assert.equal(cues.some(t=>t.includes('主符未命中')),false);assert.equal(b.sigilStats.sigil.empty,i);
  if(i===2){const snap=b.serialize();b=Expedition.restore(snap);b.modeState='battle';b.scene=null;assert.equal(emptySigilStreak(b.sigilStats),2);}
 }
 assert.match(detonate(b,{hit:true})[0],/命中 1/);assert.equal(emptySigilStreak(b.sigilStats),0);
 detonate(b);detonate(b,{echo:true});assert.equal(emptySigilStreak(b.sigilStats),1);assert.equal(b.sigilStats.echo.casts,1);
 assert.match(detonate(b,{blocked:true})[0],/护势／不可伤阻挡 1/);assert.equal(emptySigilStreak(b.sigilStats),0);
 detonate(b);detonate(b);assert.match(detonate(b)[0],/把追兵引入/);
 const snapshot=b.serialize(),again=Expedition.restore(snapshot);again.modeState='battle';again.scene=null;assert.equal(detonate(again).some(t=>t.includes('把追兵引入')),false);
 assert.equal(again.sigilStats.sigil.casts,b.sigilStats.sigil.casts+1);
});
await test('D3 recent record rollover cannot repeat third-miss teaching; absent legacy feedback starts from new observations',()=>{
 const b=sigilFixture();let tips=0;for(let i=0;i<50;i++){tips+=detonate(b).filter(t=>t.includes('把追兵引入')).length;detonate(b,{echo:true});}assert.equal(tips,1);assert.equal(b.sigilStats.recent.length,40);assert.equal(emptySigilStreak(b.sigilStats),4);
 const data=make(4).serialize();delete data.sigilStats;const old=Expedition.restore(data);assert.equal(emptySigilStreak(old.sigilStats),0);
});
