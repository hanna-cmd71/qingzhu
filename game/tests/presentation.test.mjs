/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.5 表现总控回归：三档动效、统一判据、总账同源，以及「总控只是表现、绝不碰规则」。
// 和 2.1/2.4 同一套路：既钉住判据本身，也钉住它真的被四个表现模块消费，还钉住边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Expedition} from '../gameplay/expedition.js';
import {initialSave} from '../gameplay/data.js';
import {normalizeSave} from '../gameplay/save-store.js';
import {HITSTOP, hitstopFor} from '../gameplay/feel.js';
import {effectTier, effectsSummary, FULL, LITE} from '../gameplay/effects.js';
import {impactSummary} from '../gameplay/impact.js';
import {tipsEnabled} from '../gameplay/guide.js';
import {PRESENTATION_VERSION,FOLLOW,MOTION_FULL,MOTION_REDUCED,MOTION_MODES,MOTION_LABELS,MOTION_POLICY,motionMode,motionLabel,nextMotionMode,systemReducedMotion,motionQuery,reducedMotion,motionKept,droppedByMotion,motionAttribute,presentationLedger,presentationSummary} from '../gameplay/presentation.js';

const here=path.dirname(fileURLToPath(import.meta.url)),src=name=>fs.readFileSync(path.join(here,'..',name),'utf8');
const battle=(options={})=>{const b=new Expedition({seed:'presentation',path:0,...options});b.start();if(b.cinematic)b.advanceCinematic(true);return b;};
const controlled=b=>{b.updateDirector=null;b.boss=null;b.enemies=[];b.waveTime=0;b.place=b.spawn.bind(b);b.spawn=()=>null;return b;};
const media=matches=>({matches});

void test('动效三档：默认跟随系统，坏值一律回落',()=>{
 assert.equal(PRESENTATION_VERSION,1);
 assert.deepEqual(MOTION_MODES,[FOLLOW,MOTION_FULL,MOTION_REDUCED]);
 assert.equal(MOTION_MODES.length,3);
 assert.equal(motionMode({}),FOLLOW,'缺失走跟随系统');
 assert.equal(motionMode({motion:undefined}),FOLLOW);
 assert.equal(motionMode({motion:null}),FOLLOW);
 assert.equal(motionMode({motion:''}),FOLLOW);
 assert.equal(motionMode({motion:'wat'}),FOLLOW,'坏值不能当成减少或完整');
 assert.equal(motionMode({motion:0}),FOLLOW);
 assert.equal(motionMode({motion:'reduce'}),FOLLOW,'不做前缀猜测，只认完整词');
 assert.equal(motionMode({motion:MOTION_REDUCED}),MOTION_REDUCED);
 assert.equal(motionMode({motion:MOTION_FULL}),MOTION_FULL);
 // 循环按钮：三档绕一圈回到原点，且每一档都有中文名。
 assert.equal(nextMotionMode(FOLLOW),MOTION_FULL);
 assert.equal(nextMotionMode(MOTION_FULL),MOTION_REDUCED);
 assert.equal(nextMotionMode(MOTION_REDUCED),FOLLOW);
 assert.equal(nextMotionMode('wat'),MOTION_FULL,'坏值按默认档的下一个走');
 for(const m of MOTION_MODES)assert.ok(MOTION_LABELS[m]&&motionLabel(m)===MOTION_LABELS[m]);
});

void test('系统偏好只在跟随档生效，显式档位一律覆盖它',()=>{
 // 读不到媒体状态时绝不能当成「要减少」。
 assert.equal(systemReducedMotion(null),false);
 assert.equal(systemReducedMotion(undefined),false);
 assert.equal(systemReducedMotion({}),false);
 assert.equal(systemReducedMotion({matches:'yes'}),false,'非布尔值不算命中');
 assert.equal(systemReducedMotion(media(true)),true);
 assert.equal(systemReducedMotion(media(false)),false);
 assert.equal(reducedMotion({motion:FOLLOW},media(true)),true,'跟随系统且系统要求减少');
 assert.equal(reducedMotion({motion:FOLLOW},media(false)),false);
 assert.equal(reducedMotion({motion:MOTION_FULL},media(true)),false,'显式完整穿过系统偏好');
 assert.equal(reducedMotion({motion:MOTION_REDUCED},media(false)),true,'显式减少不依赖系统偏好');
 assert.equal(reducedMotion({},null),false,'Node 里没有 matchMedia，不能因此变成减少');
 assert.equal(motionQuery(),null,'Node 环境没有 matchMedia');
 assert.equal(motionAttribute({motion:MOTION_REDUCED}),MOTION_REDUCED);
 assert.equal(motionAttribute({motion:MOTION_FULL},media(true)),MOTION_FULL);
 assert.equal(motionAttribute({motion:FOLLOW},media(true)),MOTION_REDUCED);
});

void test('取舍表每一项都是「会动或会闪」，减少动效时整项不播',()=>{
 const keys=droppedByMotion();
 assert.ok(keys.length>=6,'总闸至少要管住震动、顿帧、闪光、数字、脉冲、火花这几类');
 assert.deepEqual(keys,Object.keys(MOTION_POLICY),'当前表里每一项都是会动的；若将来加入静态项，这条断言要一起改');
 for(const key of keys){
  const spec=MOTION_POLICY[key];
  assert.equal(spec.kept,false,key+' 属于会动或会闪');
  assert.ok(spec.label&&spec.label.length>=2,key+' 必须有中文名，否则设置页说明会出现空项');
  assert.equal(motionKept(key,{motion:MOTION_REDUCED}),false,key+' 在减少档必须停');
  assert.equal(motionKept(key,{motion:MOTION_FULL}),true,key+' 在完整档必须播');
  assert.equal(motionKept(key,{motion:FOLLOW},media(true)),false);
  assert.equal(motionKept(key,{motion:FOLLOW},media(false)),true);
 }
 // 表外的东西一律照常，总闸不能误伤没登记的项。
 assert.equal(motionKept('unknown',{motion:MOTION_REDUCED}),true);
 assert.equal(motionKept(undefined,{motion:MOTION_REDUCED}),true);
});

void test('总闸真的接在四个表现模块与 CSS 上，不是只写了张表',()=>{
 const art=src('gameplay/art.js'),game=src('gameplay/Game.jsx'),css=src('gameplay/game.css');
 for(const key of droppedByMotion()){
  if(key==='css'){
   assert.ok(/html\[data-motion=reduced\]/.test(css),'CSS 必须读 <html data-motion>，否则会出现画布停了界面还在动');
   assert.ok(/data-motion/.test(game),'Game.jsx 必须把判据写到 <html data-motion>');
   continue;
  }
  const wired=new RegExp('(allow|motionKept)\\([\'"]'+key+'[\'"]').test(art)||new RegExp('motionKept\\([\'"]'+key+'[\'"]').test(game);
  assert.ok(wired,key+' 在取舍表里，但没有任何地方按它判断——表与实现脱节了');
 }
 assert.ok(/motionKept\('hitstop'/.test(game),'顿帧门控在 Game.jsx 的事件处理里');
 assert.ok(/motionKept\('lag',settings\)/.test(art),'目标血条的残影也要过总闸');
});

void test('总账把四条表现线汇总成一份只读快照',()=>{
 const settings={...initialSave().settings,quality:1,tips:true};
 const snapshot=JSON.stringify(settings);
 const ledger=presentationLedger(settings,media(false));
 assert.equal(JSON.stringify(settings),snapshot,'总账只能读，不能改调用方的设置');
 assert.equal(ledger.mode,FOLLOW);
 assert.equal(ledger.label,MOTION_LABELS[FOLLOW]);
 assert.equal(ledger.reduced,false);
 assert.equal(ledger.systemReduced,false);
 assert.deepEqual(ledger.dropped,[],'不减少时没有停掉的表现');
 // 四条线的数字必须与各自模块同源，不能在总控里抄一遍。
 assert.equal(ledger.tips,tipsEnabled(settings));
 assert.equal(ledger.feel.impacts,Object.keys(HITSTOP).length);
 assert.equal(ledger.feel.killStop,hitstopFor('kill'));
 assert.equal(ledger.effects.tier,effectTier(settings));
 assert.equal(ledger.effects.kinds,effectsSummary().kinds);
 assert.equal(ledger.effects.sparking,effectsSummary().sparking);
 assert.equal(ledger.impact.lowHealth,impactSummary().lowHealth);
 // 减少档下，总账列出的正是取舍表里那些项。
 const reduced=presentationLedger({...settings,motion:MOTION_REDUCED},media(false));
 assert.equal(reduced.reduced,true);
 assert.deepEqual(reduced.dropped,droppedByMotion().map(k=>MOTION_POLICY[k].label));
 assert.equal(reduced.dropped.length,droppedByMotion().length);
 // 系统偏好也要如实反映在总账里，设置页才能提示「系统当前要求减少动效」。
 assert.equal(presentationLedger({...settings,motion:FOLLOW},media(true)).systemReduced,true);
 assert.equal(presentationLedger({...settings,motion:MOTION_FULL},media(true)).systemReduced,true,'系统状态照实报，只是被显式档位覆盖');
 assert.equal(presentationLedger({...settings,motion:MOTION_FULL},media(true)).reduced,false);
});

void test('设置页说明由同一份数据生成，不写死数字',()=>{
 const summary=presentationSummary();
 assert.equal(summary.modes,MOTION_MODES.length);
 assert.deepEqual(summary.labels,MOTION_MODES.map(m=>MOTION_LABELS[m]));
 assert.equal(summary.dropped,droppedByMotion().length);
 assert.deepEqual(summary.droppedLabels,droppedByMotion().map(k=>MOTION_POLICY[k].label));
 assert.equal(summary.kinds,effectsSummary().kinds);
 assert.equal(summary.lowHealth,impactSummary().lowHealth);
 assert.ok(summary.droppedLabels.every(l=>l&&l.trim().length>1));
});

void test('动效档在存档里只有三个合法值，判据与总控一致',()=>{
 const base={...initialSave(),meta:[],history:[]};
 assert.equal(initialSave().settings.motion,FOLLOW,'新档默认跟随系统');
 for(const mode of MOTION_MODES){
  const out=normalizeSave({...base,settings:{...base.settings,motion:mode}});
  assert.equal(out.settings.motion,mode,'合法档位必须原样保留：'+mode);
  assert.equal(motionMode(out.settings),mode);
 }
 for(const bad of ['wat','reduce',0,null,true,'FOLLOW',undefined,'']){
  const out=normalizeSave({...base,settings:{...base.settings,motion:bad}});
  assert.equal(out.settings.motion,FOLLOW,'坏值必须回落跟随系统：'+String(bad));
 }
 const missing=normalizeSave({...base,settings:{...base.settings,motion:undefined}});
 assert.equal(missing.settings.motion,FOLLOW);
});

void test('表现总控不消费随机数、不进快照、不改任何战斗字段',()=>{
 const b=controlled(battle());
 const rng=b.rng.state(),before=JSON.stringify(b.serialize());
 // 走一遍总控会用到的全部判据与汇总。
 for(const mode of [...MOTION_MODES,'wat']){motionMode({motion:mode});reducedMotion({motion:mode},media(true));motionAttribute({motion:mode},media(true));nextMotionMode(mode);}
 for(const key of Object.keys(MOTION_POLICY))motionKept(key,{motion:MOTION_REDUCED});
 presentationLedger(b.options.settings||{},media(true));presentationSummary();
 assert.equal(b.rng.state(),rng,'表现总控不能消费随机数');
 assert.equal(JSON.stringify(b.serialize()),before,'表现总控不能改战斗字段');
 assert.ok(!('motion' in b.serialize()),'动效档是账号设置，不是战斗快照字段');
 assert.ok(!('fx' in b.serialize()),'特效数组必须留在表现层');
 // 源码层面也不能偷偷引入随机数：同一帧重画必须得到同一画面。
 assert.ok(!/Math\.random/.test(src('gameplay/presentation.js')),'表现总控不能取随机数');
});

void test('画质档与动效档互相独立：减少动效不改变特效档位',()=>{
 // 「减少动效」管的是会动的部分，加色辉光是静态亮度，不该被它连坐。
 for(const quality of [1,0]){
  const settings={...initialSave().settings,quality,motion:MOTION_REDUCED};
  assert.equal(effectTier(settings),effectTier({...settings,motion:MOTION_FULL}),'动效档不能改变特效档');
  assert.equal(effectTier(settings),quality===0?LITE:FULL);
 }
});
