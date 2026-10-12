/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.1 手感层回归：顿帧、震动衰减、受击白闪与伤害数字放大。
// 全部是表现，所以这里同时钉住两件事：数值表本身，以及「手感事件绝不碰规则」。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {normalizeSave} from '../gameplay/save-store.js';
import {initialSave} from '../gameplay/data.js';
import {HITSTOP,FEEL_VERSION,FREEZE_CAP,FREEZE_MIN_GAP,FREEZE_HEAVY,IMPACT_FLASH_PEAK,hitstopFor,freezeDecision,tickFreeze,shakeDecay,impactFlashAlpha,damageNumberEmphasis} from '../gameplay/feel.js';

const battle=(options={})=>{const b=new Expedition({seed:'feel',path:0,...options});b.start();if(b.cinematic)b.advanceCinematic(true);return b;};
const controlled=b=>{b.updateDirector=null;b.boss=null;b.enemies=[];b.waveTime=0;b.place=b.spawn.bind(b);b.spawn=()=>null;return b;};
const unit=(b,opts={})=>{const e=b.place(0,{hp:1e9,speed:0,...opts});b.rebuildHash();return e;};
const near=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,a+' vs '+b);

void test('顿帧表只含有限的正时长，未知来源返回 0',()=>{
 assert.equal(FEEL_VERSION,1);
 for(const [name,value] of Object.entries(HITSTOP))assert.ok(Number.isFinite(value)&&value>0&&value<=FREEZE_CAP,name+' 必须是有限正时长');
 assert.equal(hitstopFor('kill'),HITSTOP.kill);
 assert.equal(hitstopFor('not-a-source'),0);
 assert.equal(hitstopFor(undefined),0);
});

void test('顿帧合流：一次只冻结一次，轻击被限流间隔挡住，重击可以穿过',()=>{
 const idle={left:0,gap:0};
 const first=freezeDecision(idle,HITSTOP.kill,true);
 assert.equal(first.granted,true);
 near(first.left,HITSTOP.kill);
 assert.ok(first.gap>=FREEZE_MIN_GAP);
 // 冻结还在进行时不再接受任何请求，否则连续击杀会把战斗拖成慢动作。
 assert.equal(freezeDecision({left:.05,gap:0},HITSTOP.kill,true).granted,false);
 // 间隔未过时轻击被拒、重击放行。
 assert.equal(freezeDecision({left:0,gap:.1},HITSTOP.kill,true).granted,false);
 assert.equal(freezeDecision({left:0,gap:.1},HITSTOP.bossPhase,true).granted,true);
 assert.ok(HITSTOP.bossPhase>=FREEZE_HEAVY&&HITSTOP.kill<FREEZE_HEAVY,'重击阈值要把普通击杀挡在外面');
 // 关闭开关后什么都不发生。
 const off=freezeDecision(idle,HITSTOP.bossDefeat,false);
 assert.equal(off.granted,false);assert.equal(off.left,0);
});

void test('顿帧上限与倒计时都不会溢出或变负',()=>{
 assert.equal(freezeDecision({left:0,gap:0},99,true).left,FREEZE_CAP);
 assert.deepEqual(tickFreeze({left:.05,gap:.05},1),{left:0,gap:0});
 assert.deepEqual(tickFreeze({left:0,gap:0},.5),{left:0,gap:0});
 assert.deepEqual(tickFreeze({},.1),{left:0,gap:0});
 assert.deepEqual(tickFreeze({left:.05,gap:.05},-3),{left:.05,gap:.05});
});

void test('震动按时间衰减，与帧率无关',()=>{
 near(shakeDecay(10,0),10);
 near(shakeDecay(10,1/60),10*.85);
 let slow=10,fast=10;
 for(let i=0;i<15;i++)slow=shakeDecay(slow,1/30);
 for(let i=0;i<30;i++)fast=shakeDecay(fast,1/60);
 near(slow,fast,1e-9);
 // 单帧再长也只衰减一次 100ms 的量，不会因为卡顿直接归零。
 assert.ok(shakeDecay(10,5)>0);
});

void test('受击白闪按 0.1 秒线性衰减并封顶',()=>{
 assert.equal(impactFlashAlpha(0),0);
 near(impactFlashAlpha(IMPACT_FLASH_PEAK/2),.5);
 assert.equal(impactFlashAlpha(IMPACT_FLASH_PEAK),1);
 assert.equal(impactFlashAlpha(1),1);
 assert.equal(impactFlashAlpha(-1),0);
});

void test('伤害数字随量级放大、暴击再高一档，且都有上限',()=>{
 assert.equal(damageNumberEmphasis(0,false),1);
 assert.equal(damageNumberEmphasis(1,false),1);
 assert.ok(damageNumberEmphasis(100,false)>damageNumberEmphasis(10,false));
 assert.ok(damageNumberEmphasis(100,true)>damageNumberEmphasis(100,false));
 assert.ok(damageNumberEmphasis(1e9,true)<=1.45+1e-9);
 assert.ok(damageNumberEmphasis(1e9,false)<=1.3+1e-9);
});

void test('手感事件不消费随机数、不进快照、不改任何战斗字段',()=>{
 const b=controlled(battle());
 const events=[];b.emit=e=>events.push(e);
 const rng=b.rng.state(),before=JSON.stringify(b.serialize());
 b.impact('kill');b.impact('thunder');b.impact('bossDefeat');
 assert.equal(b.rng.state(),rng,'顿帧不能消费随机数');
 assert.equal(JSON.stringify(b.serialize()),before,'顿帧不能进快照');
 assert.equal(events.filter(e=>e.type==='hitstop').length,3);
 assert.ok(events.every(e=>e.type==='hitstop'&&e.value>0));
 events.length=0;b.impact('not-a-source');
 assert.equal(events.length,0,'未知来源不发事件');
});

void test('击杀、神雷与首领变招各自发出对应的顿帧',()=>{
 const b=controlled(battle());b.player.mana=100;b.player.reserve=b.player.maxReserve;
 const events=[];b.emit=e=>events.push(e);
 const victim=unit(b,{hp:1});
 b.hit(victim,999,'sword',false);
 const kills=events.filter(e=>e.type==='hitstop'&&e.impact==='kill');
 assert.equal(kills.length,1,'普通击杀发一次顿帧');
 near(kills[0].value,HITSTOP.kill);
 assert.equal(events.filter(e=>e.type==='hitstop'&&e.impact==='bossDefeat').length,0,'普通击杀不走首领那条');
 events.length=0;
 assert.equal(b.thunder(),true);
 assert.equal(events.filter(e=>e.type==='hitstop'&&e.impact==='thunder').length,1);
 events.length=0;
 const boss=unit(b,{hp:250,boss:true});boss.maxHp=300;boss.phase=0;
 b.hit(boss,60,'sword',false);
 assert.equal(boss.phase,1);
 assert.equal(events.filter(e=>e.type==='hitstop'&&e.impact==='bossPhase').length,1);
});

void test('首领阵亡只由 boss-defeat 事件负责顿帧，不同时发 kill',()=>{
 const b=controlled(battle());
 const events=[];b.emit=e=>events.push(e);
 const boss=unit(b,{hp:1,boss:true});boss.maxHp=300;boss.phase=2;
 b.hit(boss,999,'sword',false);
 assert.equal(events.filter(e=>e.type==='boss-defeat').length,1);
 assert.equal(events.filter(e=>e.type==='hitstop'&&e.impact==='kill').length,0);
});

void test('命中顿帧开关是账号级设置，默认开启且坏值回落',()=>{
 assert.equal(initialSave().settings.hitstop,true);
 assert.equal(normalizeSave({...initialSave(),settings:{}}).settings.hitstop,true);
 assert.equal(normalizeSave({...initialSave(),settings:{...initialSave().settings,hitstop:'yes'}}).settings.hitstop,true);
 assert.equal(normalizeSave({...initialSave(),settings:{...initialSave().settings,hitstop:false}}).settings.hitstop,false);
});
