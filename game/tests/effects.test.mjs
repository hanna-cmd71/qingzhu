/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.3 表现层回归：辉光分层表、画质档回落、火花纯函数，以及「表现层绝不碰规则」。
// 和 2.1 的 feel.test.mjs 同一套路：既钉住数据表本身，也钉住表现层与战斗的边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {seeded} from '../gameplay/data.js';
import {EFFECTS_VERSION,GLOW,FULL,LITE,effectTier,additiveEnabled,glowFor,glowAlpha,sparkCount,sparkAt,effectsSummary} from '../gameplay/effects.js';

const battle=(options={})=>{const b=new Expedition({seed:'effects',path:0,...options});b.start();if(b.cinematic)b.advanceCinematic(true);return b;};
const controlled=b=>{b.updateDirector=null;b.boss=null;b.enemies=[];b.waveTime=0;b.place=b.spawn.bind(b);b.spawn=()=>null;return b;};
// 引擎会发特效的 kind。GLOW 只能是它的子集——多出来的键说明表里有画不出来的死项。
const ENGINE_FX=['ring','incoming','practice-warning','carveBurst','fusionSlash','sigilBurst','number','line','bolt','thunder','afterimage'];

void test('辉光分层表只含可画的数值，且不超出引擎真正会发的特效',()=>{
 assert.equal(EFFECTS_VERSION,1);
 const kinds=Object.keys(GLOW);
 assert.ok(kinds.length>0);
 for(const kind of kinds){
  const spec=GLOW[kind];
  assert.ok(ENGINE_FX.includes(kind),kind+' 不在引擎会发的特效里');
  assert.ok(Number.isFinite(spec.outer)&&spec.outer>0,kind+' 的外发光宽度必须是有限正数');
  assert.ok(Number.isFinite(spec.outerAlpha)&&spec.outerAlpha>0&&spec.outerAlpha<1,kind+' 的外发光不透明度必须落在 (0,1)');
  assert.ok(Number.isInteger(spec.sparks)&&spec.sparks>=0,kind+' 的火花数必须是非负整数');
  assert.ok(spec.sparks<=16,kind+' 的火花数过多，会挤占帧预算');
 }
 assert.equal(glowFor('not-a-kind'),null);
 assert.equal(glowFor(undefined),null);
});

void test('画质档只有显式写 0 才是精简，其余（含缺失与坏值）都按完整走',()=>{
 assert.equal(effectTier({quality:1}),FULL);
 assert.equal(effectTier({quality:0}),LITE);
 assert.equal(effectTier({}),FULL);
 assert.equal(effectTier(undefined),FULL);
 assert.equal(effectTier(null),FULL);
 assert.equal(effectTier({quality:null}),FULL);
 assert.equal(effectTier({quality:'0'}),FULL);
 assert.equal(additiveEnabled({quality:1}),true);
 assert.equal(additiveEnabled({quality:0}),false);
});

void test('精简档下外发光与火花整层归零，特效本身不受影响',()=>{
 const full={quality:1},lite={quality:0};
 for(const kind of Object.keys(GLOW)){
  assert.ok(glowAlpha(kind,.5,full)>0,kind+' 在完整档必须有外发光');
  assert.equal(glowAlpha(kind,.5,lite),0,kind+' 在精简档必须没有外发光');
  assert.equal(sparkCount(kind,full),GLOW[kind].sparks);
  assert.equal(sparkCount(kind,lite),0,kind+' 在精简档必须没有火花');
 }
 // 表里没有的 kind 一律不加光，等于 2.2 原样。
 assert.equal(glowAlpha('number',.5,full),0);
 assert.equal(glowAlpha('practice-warning',.5,full),0);
 assert.equal(glowAlpha('afterimage',.5,full),0);
 assert.equal(sparkCount('number',full),0);
 // 外发光随特效本身一起淡出：没有 ttl 时不亮。
 assert.equal(glowAlpha('ring',0,full),0);
 assert.equal(glowAlpha('ring',-1,full),0);
 assert.ok(glowAlpha('ring',1,full)>glowAlpha('ring',.2,full));
});

void test('火花位置是纯函数：不取随机数、同参同果、随进度收敛',()=>{
 const a=sparkAt(3,10,.4,80),b=sparkAt(3,10,.4,80);
 assert.deepEqual(a,b,'同样的入参必须给出同样的火花');
 const start=sparkAt(0,10,0,80),end=sparkAt(0,10,1,80);
 assert.ok(start.alpha>end.alpha,'火花越接近消散越淡');
 assert.ok(start.size>=end.size,'火花越接近消散越小');
 assert.ok(start.size>=1&&end.size>=1,'火花尺寸有下限，不会画成看不见的 0');
 assert.equal(end.alpha,0);
 // 进度与半径都会被夹住，坏值不产生 NaN。
 const clamped=sparkAt(0,10,5,-80);
 assert.ok(Number.isFinite(clamped.x)&&Number.isFinite(clamped.y)&&Number.isFinite(clamped.size)&&Number.isFinite(clamped.alpha));
 assert.equal(clamped.alpha,0);
 // 同一特效的火花不重叠：相邻序号落点不同。
 assert.notDeepEqual(sparkAt(0,10,.5,80),sparkAt(1,10,.5,80));
});

void test('设置页说明由同一张表生成，不写死数字',()=>{
 const summary=effectsSummary();
 assert.equal(summary.kinds,Object.keys(GLOW).length);
 assert.equal(summary.sparking,Object.keys(GLOW).filter(k=>GLOW[k].sparks>0).length);
 assert.equal(summary.maxGlow,Math.max(...Object.keys(GLOW).map(k=>GLOW[k].outer)));
 assert.ok(summary.sparking>0,'至少要有一类特效带火花，否则说明里的「火花」是空话');
});

void test('表现层不消费随机数、不进快照、不改任何战斗字段',()=>{
 const b=controlled(battle());
 const rng=b.rng.state(),before=JSON.stringify(b.serialize());
 // 真的发几个会画辉光的特效，再走一遍画质档判据与火花计算。
 b.pulse(b.player.x,b.player.y,'#f4daa0',60);
 b.fx.push({kind:'fusionSlash',x:b.player.x,y:b.player.y,r:80,ttl:.3,max:.3,color:'#d6ecff'});
 b.fx.push({kind:'sigilBurst',x:b.player.x+40,y:b.player.y,r:50,ttl:.6,max:.6,color:'#ffbd78'});
 b.fx.push({kind:'bolt',x:b.player.x-30,y:b.player.y,ttl:.4,max:.4,color:'#ffeaae',seed:.42});
 for(const f of b.fx){glowFor(f.kind);glowAlpha(f.kind,Math.max(0,f.ttl/f.max),{quality:1});const n=sparkCount(f.kind,{quality:1});for(let i=0;i<n;i++)sparkAt(i,n,.5,f.r);}
 assert.equal(b.rng.state(),rng,'表现层不能消费随机数');
 assert.equal(JSON.stringify(b.serialize()),before,'表现层不能改战斗字段');
 assert.ok(!('fx' in b.serialize()),'特效数组必须留在表现层，不能进快照');
});

void test('闪电折线用独立同种子的取数器，所以描两层不会改变折线形状',()=>{
 // art.js 把折线先算成点列再描两遍。只要 seeded 是同种子同序列，两遍就落在同一条折线上；
 // 同时它是一次独立的取数器，不碰战斗随机流。
 const seed=Math.floor(.7*999999);
 const draw=()=>{const r=seeded(seed),pts=[[100,200-210]];for(let j=1;j<8;j++)pts.push([100+(r()-.5)*28,200-210+j*30]);return pts;};
 assert.deepEqual(draw(),draw(),'同种子必须给出同一条折线');
 assert.equal(draw().length,8);
 const b=controlled(battle());
 const before=b.rng.state();
 draw();
 assert.equal(b.rng.state(),before,'画特效不能动战斗随机流');
});
