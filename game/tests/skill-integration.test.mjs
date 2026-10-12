/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// WP6 迭代验收：把技能放进真实链路里跑，而不是只读标志位。
// 覆盖 1) 真实存档链路（SaveVault→normalizeSave→restoreRun）；2) 无尽章回重置后的凭据不变量；
// 3) 六个技能的效果在活战斗里真的落地（伤害、引爆、反击倍率、齐射、啃噬）；
// 4) 与剑阵 2.0 同时开启；5) 试剑台；6) 退化情形（无协战单位）。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {SaveVault,SAVE_KEY} from '../gameplay/save-store.js';
import {settleRunResult} from '../gameplay/records.js';
import {initialSave} from '../gameplay/data.js';
import {ARRAY_VERSION} from '../gameplay/array.js';
import {challengeOffer} from '../gameplay/experience-rules.js';
import {SKILL_VERSION,SKILL_GUARD_BONUS} from '../gameplay/skills.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const step=(b,n)=>{for(let i=0;i<n;i++)b.update(1/60);};
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const battle=(options={})=>{const b=new Expedition({seed:'iterate',path:0,...options});b.start();if(b.cinematic)b.advanceCinematic(true);return b;};
const controlled=b=>{b.updateDirector=null;b.boss=null;b.enemies=[];b.waveTime=0;b.place=b.spawn.bind(b);b.spawn=()=>null;return b;};
const unit=(b,opts={})=>{const e=b.place(0,{hp:1e9,speed:0,...opts});b.rebuildHash();return e;};
const armed=(path,extra={})=>{const b=controlled(battle({path,skillVersion:SKILL_VERSION,...extra}));b.player.mana=100;b.player.reserve=b.player.maxReserve;step(b,1);return b;};

void test('真实存档链路：技能状态经 SaveVault 往返，篡改的凭据在提交时就被拒',()=>{
 const storage=memory(),vault=new SaveVault(storage);vault.load();
 const b=armed(2);b.useSkill();b.useSkill();
 const profile={...initialSave(),checkpoint:b.serialize()};
 vault.commit(profile);
 const raw=storage.getItem(SAVE_KEY);
 assert.ok(raw.includes('"skillCasts":2'),'the checkpoint carries the cast counter');
 const reloaded=vault.load();
 assert.equal(reloaded.checkpoint.skillCasts,2);
 assert.deepEqual(reloaded.checkpoint.skillReceipts,['2-1','2-2']);
 // normalizeSave runs restoreRun, so a tampered receipt must be refused before it reaches disk.
 for(const mutate of [
  d=>{d.checkpoint.skillReceipts=['2-2']},
  d=>{d.checkpoint.skillReceipts=['2-1']},
  d=>{d.checkpoint.skillCasts=5},
  d=>{delete d.checkpoint.options.skillVersion},
 ]){
  const tampered=copy(profile);mutate(tampered);
  assert.throws(()=>vault.commit(tampered),/流派技能/);
 }
 assert.equal(storage.getItem(SAVE_KEY),raw,'a refused commit leaves the disk bytes untouched');
});

void test('无尽章回重置把释放次数与凭据一起清零，序列不会跨圈复用编号',()=>{
 const b=controlled(battle({path:0,mode:'endless',skillVersion:SKILL_VERSION,chapter:5}));
 b.player.mana=100;b.player.reserve=b.player.maxReserve;
 assert.equal(b.useSkill(),true);
 assert.equal(b.useSkill(),true);
 assert.deepEqual(b.skillReceipts,['0-1','0-2']);
 b.chapter=5;b.nextChapter();
 assert.equal(b.endlessLoop,1);
 assert.equal(b.skillCasts,0,'the counter restarts with the loop');
 assert.deepEqual(b.skillReceipts,[],'the receipts restart with the counter');
 // 切章回到入场说明，此时不可释放；开战后编号从 1 重新开始。新一圈会重放开场纪事，
 // 并按无尽既有流程先提交圈前挑战。
 assert.equal(b.useSkill(),false,'the intro scene is not a battle');
 assert.equal(b.skillCasts,0);
 assert.equal(b.chooseChallenge('none'),true,'新一圈要先提交圈前挑战');
 b.start();
 while(b.cinematic)b.advanceCinematic(true);
 assert.equal(b.modeState,'battle');
 b.player.mana=100;
 assert.equal(b.useSkill(),true);
 assert.deepEqual(b.skillReceipts,['0-1']);
 // 快照里必须看到重置后的新序列，而不是上一圈累计的编号。
 const d=b.serialize();
 assert.equal(d.skillCasts,1);
 assert.deepEqual(d.skillReceipts,['0-1']);
 assert.equal(b.skillReceipts.length,b.skillCasts);
});

void test('聚锋引 的强化在真实剑击上兑现为 1.4 倍伤害',()=>{
 const plain=controlled(battle({path:0,skillVersion:SKILL_VERSION}));
 const e0=unit(plain,{x:plain.player.x+60,y:plain.player.y});
 const before0=e0.hp;plain.hit(e0,100,'sword');
 const without=before0-e0.hp;
 const b=armed(0);
 assert.equal(b.useSkill(),true);
 const e=unit(b,{x:b.player.x+60,y:b.player.y});
 const before=e.hp;b.hit(e,100,'sword');
 const with_=before-e.hp;
 assert.equal(without,100,'the control strike is unmodified');
 assert.ok(Math.abs(with_-100*1.4)<1e-6,{with:with_});
});

void test('引雷 在活战斗里放出一发真神雷并刷新余雷窗口',()=>{
 const b=armed(1);
 const e=unit(b,{x:b.player.x+80,y:b.player.y});
 const before=e.hp,thunders=b.thunders;
 assert.equal(b.useSkill(),true);
 assert.equal(b.thunders,thunders+1);
 assert.ok(e.hp<before,'the bolt damages what is on the field');
 assert.equal(b.time-b.thunderTime,0,'the 余雷 window restarts from the cast');
});

void test('引符 布下的符真的会在目标身上引爆',()=>{
 const b=armed(4);
 const e=unit(b,{x:b.player.x,y:b.player.y});
 const before=e.hp;
 assert.equal(b.useSkill(),true);
 assert.equal(b.zones.filter(z=>z.sigil).length,1);
 step(b,240);
 assert.ok(e.hp<before,'the placed sigil detonates on the target standing in it');
 assert.equal(b.zones.filter(z=>z.sigil).length,0,'and it is consumed');
});

void test('守元 让真实化解反击的伤害正好乘上 1.5',()=>{
 const counterDamage=useSkill=>{
  const b=controlled(battle({path:5,skillVersion:SKILL_VERSION}));
  b.player.mana=100;b.player.reserve=b.player.maxReserve;step(b,1);
  if(useSkill)assert.equal(b.useSkill(),true);
  unit(b,{x:b.player.x,y:b.player.y});
  b.dash();b.hitPlayer(25);
  return b.damageSources.guard||0;
 };
 const plain=counterDamage(false),guarded=counterDamage(true);
 assert.ok(plain>0,'the control counter lands');
 assert.ok(Math.abs(guarded-plain*(1+SKILL_GUARD_BONUS))<1e-6,{plain,guarded});
});

void test('弩机齐射 与 虫噬号令 的伤害在活战斗里落在目标身上',()=>{
 const puppet=armed(2);
 const t1=unit(puppet,{x:puppet.player.x+90,y:puppet.player.y});
 assert.equal(puppet.useSkill(),true);
 step(puppet,24);
 assert.ok(t1.hp<1e9,'the volley shot lands');
 const insect=armed(3);
 const t2=unit(insect,{x:insect.player.x+200,y:insect.player.y});
 assert.equal(insect.useSkill(),true);
 step(insect,12);
 assert.ok(t2.hp<1e9,'the ordered swarm bites');
});

void test('技能与剑阵 2.0 同时开启时互不干扰，快照仍可往返',()=>{
 const b=controlled(battle({path:4,skillVersion:SKILL_VERSION,arrayVersion:ARRAY_VERSION}));
 b.player.mana=100;b.player.reserve=b.player.maxReserve;step(b,1);
 assert.equal(b.skillReadiness().ready,true);
 assert.equal(b.useSkill(),true);
 assert.equal(b.beginStroke(),true);
 for(let i=1;i<=20;i++)b.addStrokePoint(100+i*30,100);
 assert.equal(b.endStroke(),true);
 assert.equal(b.fuseSwords(),false,'剑意 is still empty, so the fusion stays refused');
 b.swordIntent=999;b.swordIntent=b.intentReadiness().max;
 assert.equal(b.fuseSwords(),true);
 const d=copy(b.serialize());
 assert.equal(d.skillCasts,1);
 assert.equal(d.options.arrayVersion,ARRAY_VERSION);
 const restored=Expedition.restore(d);
 assert.equal(restored.skillCasts,1);
 assert.deepEqual(restored.skillReceipts,['4-1']);
 assert.ok(restored.arrayPreset);
});

void test('试剑台也能释放技能，训练不写正式结算',()=>{
 const b=controlled(battle({path:0,mode:'training',skillVersion:SKILL_VERSION}));
 b.player.mana=100;
 assert.equal(b.useSkill(),true);
 assert.equal(b.skillCasts,1);
 assert.equal(b.summary().skills.casts,1);
});

void test('带技能的胜局可以正常结算、写入成绩并重载',()=>{
 const storage=memory(),vault=new SaveVault(storage);vault.load();
 // 弩机齐射 要靠场上的傀儡兑现，先走一帧把协战单位列出来，否则会被退化拦截挡下。
 // 分段/挑战是另一条链路的凭据，这里按既有结算测试的做法关掉，专测技能字段能否随成绩落地。
 const b=armed(2,{runId:'skill-settle-1',segmentVersion:0,challengeVersion:0});
 assert.equal(b.useSkill(),true);assert.equal(b.useSkill(),true);
 b.chapter=5;b.wave=3;b.receipts=b.routes.flat().map(n=>n.id);b.time=120;b.won=true;b.finished=true;
 const summary=b.summary();
 assert.deepEqual(summary.skills,{casts:2,receipts:2});
 const next=settleRunResult({...initialSave()},summary);
 assert.equal(next.runs,1);
 vault.commit(next);
 const reloaded=vault.load();
 assert.equal(reloaded.runs,1,'the settlement survives normalizeSave');
 assert.equal(reloaded.history.length,1,'the run stays in the retained history');
 assert.deepEqual(reloaded.history[0].skills,{casts:2,receipts:2});
 // 同一份 summary 不能结算两次，技能凭据也不会让重放绕过凭据判定。
 assert.equal(settleRunResult(reloaded,summary),reloaded);
});

void test('未声明技能的旧局 summary 不含 skills 字段',()=>{
 const b=controlled(battle({path:2}));
 assert.equal('skills' in b.summary(),false);
 assert.equal(JSON.stringify(b.summary()).includes('"skills"'),false);
});

void test('无尽「常规战节雷」挑战同样管住 引雷，首领与三机关仍可放',()=>{
 // 挑战文本说普通节点禁用神雷。引雷 花雷源买的正是同一道神雷，所以不能从技能口子绕过去。
 let seed=null;
 for(let i=0;i<5000&&!seed;i++)if(challengeOffer('ban-'+i,1)==='thunder')seed='ban-'+i;
 assert.ok(seed,'先在确定性哈希里找一个第二圈抽到节雷的种子');
 const b=controlled(battle({path:1,mode:'endless',skillVersion:SKILL_VERSION,chapter:5,seed}));
 b.chapter=5;b.nextChapter();
 assert.equal(b.endlessLoop,1);
 assert.equal(b.chooseChallenge('thunder'),true);
 b.start();while(b.cinematic)b.advanceCinematic(true);
 assert.equal(b.modeState,'battle');
 b.player.reserve=b.player.maxReserve;
 const reserve=b.player.reserve;
 // 普通节点：按钮不能报可以施展，释放也要在扣资源之前被挡下。
 assert.notEqual(b.encounter.kind,'xuangu');
 const state=b.skillReadiness();
 assert.equal(state.ready,false,'a banned thunder must not read as ready');
 assert.equal(state.label,'本圈挑战禁用神雷');
 assert.equal(b.useSkill(),false);
 assert.equal(b.player.reserve,reserve,'a refused release spends no 雷源');
 assert.equal(b.skillCasts,0);
 // 首领与三机关是挑战自己留的例外，同一局里技能必须能正常放出来。
 b.encounter.kind='xuangu';
 b.player.reserve=b.player.maxReserve;
 assert.equal(b.skillReadiness().ready,true);
 assert.equal(b.useSkill(),true);
 assert.equal(b.skillCasts,1);
});

void test('退化情形：没有协战单位时不会白花资源',()=>{
 // 傀儡／御虫的主动技能要靠场上的协战单位兑现，场上没有时不能只扣资源不做事。
 const cases=[
  {path:2,ally:'puppets',label:'尚无傀儡'},
  {path:3,ally:'insects',label:'尚无噬金虫'},
 ];
 for(const c of cases){
  const b=armed(c.path);
  assert.ok(b[c.ally].length>0,'the starter fields its allies before the guard is exercised');
  b[c.ally]=[];
  const mana=b.player.mana;
  const state=b.skillReadiness();
  assert.equal(state.ready,false,c.path+' must not report ready with no allies');
  assert.equal(state.label,c.label);
  assert.equal(b.useSkill(),false);
  assert.equal(b.player.mana,mana,'a refused release spends nothing');
  assert.equal(b.skillCasts,0);
  assert.deepEqual(b.skillReceipts,[]);
 }
});
