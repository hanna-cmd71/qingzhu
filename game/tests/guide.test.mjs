/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.2 新手引导与可读性回归：目标陈述、推荐配置、上手难度、三步上手，
// 以及「每个节点最多一条」的引擎内一次性机制提示。
// 提示是纯文案，所以这里同时钉住两件事：选取顺序，以及「提示绝不碰规则」。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {normalizeSave} from '../gameplay/save-store.js';
import {initialSave} from '../gameplay/data.js';
import {STARTERS} from '../gameplay/starters.js';
import {DIFFICULTIES} from '../gameplay/data.js';
import {GUIDE_VERSION,GOAL_BRIEF,NEWCOMER_SEEN,NEWCOMER_SETUP,STARTER_LEVELS,MECHANIC_GUIDES,TUTORIAL_SEEN,TUTORIAL_SKIP,TUTORIAL_NOTE,guideKey,starterLevel,isNewcomer,recommendedSetup,firstSteps,mechanicBriefs,nextGuide,tipsEnabled,shouldRunTutorial} from '../gameplay/guide.js';

const battle=(options={})=>{const b=new Expedition({seed:'guide',path:0,guideVersion:GUIDE_VERSION,settings:{tips:true},...options});b.start();if(b.cinematic)b.advanceCinematic(true);return b;};
// Advance one node in place, crossing chapters when a chapter runs out:
// the route table drives `node`, so moving chapter/wave is enough.
const stepNode=b=>{
 let route=b.routes[b.chapter];
 if(b.wave+1>=route.length){if(b.chapter+1>=b.routes.length)return false;b.chapter+=1;b.wave=-1;route=b.routes[b.chapter];}
 b.wave+=1;route[b.wave].selected=0;b.beginNode();return true;
};
const guideIds=b=>[...b.notices].filter(id=>id.startsWith('guide-')).sort();
const cueKeys=b=>b.combatCues.map(c=>c.key);

void test('目标陈述与推荐配置指向真实存在的起手与难度',()=>{
 assert.equal(GUIDE_VERSION,1);
 assert.ok(GOAL_BRIEF.points.length>=3&&GOAL_BRIEF.points.every(text=>typeof text==='string'&&text.length>0));
 const fresh=initialSave(),setup=recommendedSetup(fresh);
 assert.equal(setup.newcomer,true);
 assert.ok(setup.path>=0&&setup.path<STARTERS.length,'推荐起手必须在六起手范围内');
 assert.ok(setup.difficulty>=0&&setup.difficulty<DIFFICULTIES.length,'推荐难度必须存在');
 assert.equal(setup.mode,'story');
 assert.ok(setup.reason.length>0&&setup.label==='新手推荐');
 // 推荐值就是 NEWCOMER_SETUP，避免两处各写一份。
 assert.deepEqual({path:setup.path,difficulty:setup.difficulty,mode:setup.mode},{...NEWCOMER_SETUP});
});

void test('首次游玩只在完全没有正式进度时成立',()=>{
 assert.equal(isNewcomer(initialSave()),true);
 assert.equal(isNewcomer(undefined),false);
 assert.equal(isNewcomer({...initialSave(),wins:1}),false);
 assert.equal(isNewcomer({...initialSave(),runs:1}),false);
 assert.equal(isNewcomer({...initialSave(),kills:1}),false);
 assert.equal(isNewcomer({...initialSave(),checkpoint:{}}),false);
});

void test('六起手都有上手难度评级，越界回落第一条',()=>{
 assert.equal(STARTER_LEVELS.length,STARTERS.length);
 const allowed=new Set(['易上手','需熟悉资源','需练习']);
 for(let i=0;i<STARTERS.length;i++){const level=starterLevel(i);assert.ok(allowed.has(level.level),i+' 的评级必须在允许集合内');assert.ok(level.note.length>0);}
 assert.deepEqual(starterLevel(99),STARTER_LEVELS[0]);
 assert.deepEqual(starterLevel(-1),STARTER_LEVELS[0]);
 assert.deepEqual(starterLevel(undefined),STARTER_LEVELS[0]);
});

void test('三步上手用玩家当前绑定的键位，缺键位时回落到默认',()=>{
 const steps=firstSteps(()=>'空格',{dash:'Space',thunder:'KeyE'});
 assert.equal(steps.length,3);
 assert.ok(steps.every(s=>s.title.length>0&&s.text.length>0));
 assert.ok(/空格/.test(steps[1].text),steps[1].text);
 const fallback=firstSteps(null,null);
 assert.ok(/空格/.test(fallback[1].text)&&/E/.test(fallback[1].text),fallback[1].text);
});

void test('机制提示按声明情况筛选：未声明技能或剑阵就不列那两条',()=>{
 const ids=options=>mechanicBriefs({path:0,options}).map(e=>e.id);
 const plain=ids({});
 assert.ok(plain.includes('formation')&&plain.includes('item')&&plain.includes('focus')&&plain.includes('thunder'));
 assert.equal(plain.includes('skill'),false,'未声明 skillVersion 不应出现流派技能提示');
 assert.equal(plain.includes('array'),false,'未声明 arrayVersion 不应出现剑阵提示');
 const full=ids({skillVersion:1,arrayVersion:1});
 assert.ok(full.includes('skill')&&full.includes('array'));
 assert.equal(full.length,MECHANIC_GUIDES.length);
 // 文案由数据层生成，且都写进了哨兵长度限制内。
 for(const entry of mechanicBriefs({path:4,options:{skillVersion:1,arrayVersion:1}}))assert.ok(entry.text.length>0&&entry.text.length<=100,entry.id);
});

void test('nextGuide 逐条返回、看过就跳过、全部看完返回 null',()=>{
 const seen=new Set();
 for(let i=0;i<MECHANIC_GUIDES.length;i++){
  const guide=nextGuide({path:0,notices:seen,options:{skillVersion:1,arrayVersion:1}});
  assert.ok(guide&&guide.text.length>0,'第 '+i+' 条应该可用');
  assert.equal(seen.has(guide.id),false,'不能重复返回同一条');
  seen.add(guide.id);
 }
 assert.equal(nextGuide({path:0,notices:seen,options:{skillVersion:1,arrayVersion:1}}),null);
 assert.equal(nextGuide({path:0,options:{}}),null,'没有 notices 集合时不发提示');
 assert.equal(nextGuide(null),null);
 // 判定抛错时按「不适用」处理，异常不能带进战斗循环。
 const boom={path:0,notices:new Set(['guide-formation']),get options(){throw Error('boom');}};
 let contained;
 assert.doesNotThrow(()=>{contained=nextGuide(boom);});
 assert.equal(contained?.id,'guide-item','读 options 抛错时应跳过 skill／array，落到下一条适用项');
});

void test('首次机制提示是账号级设置，默认开启且坏值回落',()=>{
 assert.equal(initialSave().settings.tips,true);
 assert.equal(tipsEnabled(undefined),true);
 assert.equal(tipsEnabled({}),true);
 assert.equal(tipsEnabled({tips:false}),false);
 assert.equal(normalizeSave({...initialSave(),settings:{}}).settings.tips,true);
 assert.equal(normalizeSave({...initialSave(),settings:{...initialSave().settings,tips:'yes'}}).settings.tips,true);
 assert.equal(normalizeSave({...initialSave(),settings:{...initialSave().settings,tips:false}}).settings.tips,false);
});

void test('新局每个节点最多发一条机制提示，看过的不再重复',()=>{
 const b=battle();
 const first=guideIds(b);
 assert.equal(first.length,1,'第一个节点只发一条：'+JSON.stringify(first));
 assert.deepEqual(cueKeys(b),[first[0]],'提示要真的落到战场文案上');
 assert.equal(b.combatCues[0].text.length>0,true);
 assert.ok(b.combatCues[0].until>b.time,'提示要有一个存活时间');

 let nodes=1;
 // 本局没有声明 skillVersion／arrayVersion，所以适用项少于整张表。
 const applicable=mechanicBriefs({path:0,options:b.options}).length;
 assert.ok(applicable>0&&applicable<MECHANIC_GUIDES.length,{applicable});
 while(stepNode(b)&&guideIds(b).length<applicable){nodes+=1;assert.ok(nodes<=40,'节点推进不应无限');}
 const all=guideIds(b);
 assert.equal(all.length,applicable,'走满节点后应该把适用提示都发过一遍：'+JSON.stringify(all));
 assert.equal(new Set(all).size,all.length,'同一条提示不能发两次');
 assert.deepEqual(all,[...all].sort());
 // 再看过的节点不再发新提示。
 const before=all.length;
 for(let i=0;i<3&&stepNode(b);i++);
 assert.equal(guideIds(b).length,before,'全部看过之后不再新增提示');
});

void test('试剑台、关闭开关与未声明 guideVersion 的旧局都不发提示',()=>{
 const training=battle({mode:'training',guidedPractice:true});
 assert.deepEqual(guideIds(training),[],'试剑台由分步练习负责');
 const off=battle({settings:{tips:false}});
 assert.deepEqual(guideIds(off),[],'关闭开关后不发');
 const legacy=battle({guideVersion:undefined});
 assert.deepEqual(guideIds(legacy),[],'未声明 guideVersion 的旧局保持原样');
});

void test('机制提示不消费随机数、不改战斗数值，只多出一条 notices',()=>{
 const run=options=>{const b=new Expedition({seed:'guide-parity',path:0,runId:'guide-parity',settings:{tips:true},...options});b.start();if(b.cinematic)b.advanceCinematic(true);b.rebuildHash();return b;};
 const withTips=run({guideVersion:GUIDE_VERSION}),without=run({});
 const a=withTips.rng.state(),c=without.rng.state();
 assert.notDeepEqual(guideIds(withTips),[],'对照组应当真的发了提示');
 assert.deepEqual(guideIds(without),[]);
 assert.equal(a,c,'发提示不能消费随机数');
 assert.equal(withTips.enemies.length,without.enemies.length,'发提示不能改敌人数量');
 assert.deepEqual(withTips.player,without.player,'发提示不能改玩家状态');
 assert.deepEqual(withTips.damageSources,without.damageSources,'发提示不能改伤害统计');
 assert.deepEqual(withTips.enemies.map(e=>[e.id,e.x,e.y]),without.enemies.map(e=>[e.id,e.x,e.y]),'发提示不能改敌人站位');
 // options 本来就按局声明不同，比较快照时要把它排除，剩下的差异只能来自 notices。
 const left=withTips.serialize(),right=without.serialize();
 delete left.options;delete right.options;
 const diff=Object.keys(left).filter(key=>JSON.stringify(left[key])!==JSON.stringify(right[key]));
 assert.deepEqual(diff,['notices'],'快照差异只能是 notices：'+JSON.stringify(diff));
 for(const id of guideIds(withTips))assert.ok(id.length<=100&&id.startsWith(guideKey('')));
});

void test('提示 id 与文案都在哨兵长度限制内，且引导常量保持稳定',()=>{
 assert.equal(NEWCOMER_SEEN,'welcome-v1');
 assert.equal(guideKey('formation'),'guide-formation');
 for(const entry of MECHANIC_GUIDES){assert.ok(entry.id.length>0&&guideKey(entry.id).length<=100);assert.equal(typeof entry.when,'function');assert.equal(typeof entry.text,'function');}
});

// 开局教程：全新账号第一次「启程」直接进教学局。判据必须窄——只有真正一张白纸的账号才拦。
void test('开局教程只拦全新账号，且试剑台与待处理资料都不拦',()=>{
 assert.equal(shouldRunTutorial(initialSave()),true,'全新存档应进入开局教程');
 assert.equal(shouldRunTutorial(null),false);
 // 记的键必须和 start() 写进 guidesSeen 的键一致，否则会反复触发。
 assert.equal(TUTORIAL_SEEN,'practice-v1');
 assert.equal(shouldRunTutorial({...initialSave(),guidesSeen:[TUTORIAL_SEEN]}),false,'看过的账号不再拦');
 assert.equal(shouldRunTutorial({...initialSave(),wins:1}),false,'有胜局的老账号不拦');
 assert.equal(shouldRunTutorial({...initialSave(),runs:1}),false,'开过局的账号不拦');
 assert.equal(shouldRunTutorial({...initialSave(),kills:3}),false,'有击杀的账号不拦');
 assert.equal(shouldRunTutorial({...initialSave(),checkpoint:{}}),false,'有续玩的账号不拦');
 assert.equal(shouldRunTutorial(initialSave(),{skip:true}),false,'试剑台与显式跳过不拦');
 assert.equal(shouldRunTutorial(initialSave(),{blocked:true}),false,'存在待处理恢复资料时不拦');
 assert.equal(shouldRunTutorial({...initialSave(),guidesSeen:['practice-v1',NEWCOMER_SEEN]}),false);
 // 引导常量必须是非空文案，界面直接把它们贴出来。
 assert.ok(TUTORIAL_SKIP.length>0&&TUTORIAL_NOTE.length>0);
 assert.equal(typeof shouldRunTutorial(undefined),'boolean','坏入参不能抛异常进战斗循环');
});
