/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.2 新手引导与可读性：文案与判定的唯一数据源。
// 本模块只产出文字，以及「该不该发一条提示」的选取结果：不消费战斗随机数、
// 不写快照字段、不改变任何规则分支。引擎按 id 把提示记进 notices，渲染层只负责显示。
import {skillDeclared,skillForPath} from './skills.js';
import {arrayDeclared} from './array.js';

export const GUIDE_VERSION=1;

// 「此行要做什么」：第一次进入出发配置时先讲清目标，再让玩家做选择。
export const GOAL_BRIEF={
 title:'此行目标',
 points:[
  '六章共 22 个节点，逐个节点推进',
  '护住阵盘：阵盘归零即结束本节点',
  '七十二口飞剑随进阶逐把投入战斗',
  '结算修炼心得，解锁后续章节'
 ]
};

// 六起手的上手难度。2.1 之前这段文字散在界面里，2.2 收拢到这一处作为唯一来源。
export const STARTER_LEVELS=[
 {level:'易上手',note:'飞剑自动出击，只管走位与集火'},
 {level:'需熟悉资源',note:'要安排施雷时机与雷源'},
 {level:'需练习',note:'移动会打断架设，要选安全空隙'},
 {level:'易上手',note:'虫群自动缠敌，你负责收割'},
 {level:'需练习',note:'留符引敌要靠走位配合'},
 {level:'需练习',note:'化解窗口只有零点几秒'}
];

// 新手推荐：第一次玩只给一个明确答案；其余选项保留，不要求先理解。
export const NEWCOMER_SETUP={path:0,difficulty:0,mode:'story'};
export const NEWCOMER_REASON='御剑不需要额外资源管理，飞剑自动出击，最容易先看清走位和目标；难度用「初入仙途」。';
export const NEWCOMER_SEEN='welcome-v1';

export function starterLevel(path){return STARTER_LEVELS[path]||STARTER_LEVELS[0];}

// 首次游玩：完全没有正式进度时才算。一旦有续玩、胜局或击杀，就按普通玩家处理。
export function isNewcomer(save){
 if(!save)return false;
 return !save.checkpoint&&(save.wins||0)===0&&(save.runs||0)===0&&(save.kills||0)===0;
}

export function recommendedSetup(save){
 return {...NEWCOMER_SETUP,label:'新手推荐',reason:NEWCOMER_REASON,newcomer:isNewcomer(save)};
}

// 三步上手：点哪里 → 按什么 → 看什么。只在出发页展示，键位取自玩家当前绑定。
export function firstSteps(keyLabel,keymap){
 const label=id=>(keyLabel?keyLabel(keymap?.[id]):'')||{'dash':'空格','thunder':'E'}[id]||'';
 return [
  {title:'选起手',text:'第一次玩直接用推荐的御剑，点右下「启程」。'},
  {title:'记三个键',text:'移动 WASD／方向键，'+label('dash')+' 闪避，'+label('thunder')+' 辟邪神雷；飞剑自动出击。'},
  {title:'看预警再走位',text:'地面出现预警圈就离开原位；阵盘归零即失败，先清威胁再输出。'}
 ];
}

// 一次性机制提示。分步练习已经教过走位、闪避、集火、神雷、分守与留符；
// 这里补它没有覆盖的系统，每个节点最多发一条，写进 notices 后不再重复。
// 文案不写具体键位：触屏玩家没有键盘，界面上的按钮本身已经带键位标签。
export const MECHANIC_GUIDES=[
 {id:'formation',when:()=>true,text:()=>'可以切换剑式：分组追击／环绕护身／定向穿刺。敌人分散就分组，被贴身就环绕。'},
 {id:'skill',when:b=>skillDeclared(b.options),text:b=>'流派技能「'+(skillForPath(b.path)?.name||'主动技能')+'」已可用：灵力或雷源足够时按钮会亮起。'},
 {id:'item',when:()=>true,text:()=>'物资 1／2 在生命或灵力偏低时使用；满值不会消耗，先留着。'},
 {id:'focus',when:()=>true,text:()=>'按住左键是集火：只有新出击剑改变首目标，松开就恢复分配。'},
 {id:'array',when:b=>arrayDeclared(b.options),text:()=>'剑阵 2.0：拖动战场落笔画横扫，剑意满后合体，剑痕会被后续剑击引爆。'},
 {id:'thunder',when:()=>true,text:()=>'灵力满且雷源够时，辟邪神雷可以施放；雷源有限，先留给成群或弹幕。'}
];

// 开局教程：全新账号第一次点「启程」时直接进入分步练习，练完自动开始正式历练，不再先弹询问框。
// 判据与文案同源；试剑台（skip）与存在待处理恢复资料（blocked）时不拦截。
// 记的仍是既有的 practice-v1 键：老账号与既有验收脚本据此跳过教程。
export const TUTORIAL_SEEN='practice-v1';
export const TUTORIAL_SKIP='跳过教程，直接开始历练';
export const TUTORIAL_NOTE='开局教程 · 使用正式起手数值，不写入正式进度；随时可跳过';
export function shouldRunTutorial(save,{skip=false,blocked=false}={}){
 if(skip||blocked)return false;
 if(!isNewcomer(save))return false;
 return !(save.guidesSeen||[]).includes(TUTORIAL_SEEN);
}

// 山门教程入口（2.5 追加修订）：2.2 的判据是「全新账号」，于是有进度的玩家永远看不到教程，
// 入口又埋在出发页底部——作者验收时反馈「找不到教程」。放宽后山门始终给出入口：
// 没真正走完过的标「推荐先学」，走完的留作可重看的普通入口。
// 为什么另立一个标记而不是复用 practice-v1：practice-v1 在**每次正式启程**时都会被写下
// （Game.jsx 的 launch 里 `guidesSeen:[...,'practice-v1']`），它其实是「别再用开局教程拦我」，
// 不等于「这个人真的练过」。用它当判据，凡开过局的账号都会被误判成已学过。
export const TUTORIAL_DONE='tutorial-v1';
export const TUTORIAL_ENTRY='新手教程 · 七步上手';
export const TUTORIAL_REPLAY='新手教程 · 重看一遍';
export const TUTORIAL_BADGE='推荐先学';
export const TUTORIAL_BRIEF='七步：移动 · 闪避 · 集火 · 神雷 · 分守 · 留符 · 挡招。用正式起手数值，不写正式进度。';
export function tutorialDone(save){return !!save&&(save.guidesSeen||[]).includes(TUTORIAL_DONE);}
// 山门上的入口一直在；只有「从没真正练过」才加推荐标记。
export function tutorialOffer(save){return !tutorialDone(save);}
export function tutorialEntryLabel(save){return tutorialOffer(save)?TUTORIAL_ENTRY:TUTORIAL_REPLAY;}

export const guideKey=id=>'guide-'+id;

// 账号级开关：关闭后不再发一次性提示，也不在出发页显示新手建议。
export function tipsEnabled(settings){return settings?.tips!==false;}

// 选取下一条尚未看过的机制提示；没有适用项时返回 null。
export function nextGuide(b){
 if(!b?.notices?.has)return null;
 for(const entry of MECHANIC_GUIDES){
  const id=guideKey(entry.id);
  if(b.notices.has(id))continue;
  let applies=false;
  try{applies=entry.when(b)!==false;}catch{applies=false;}
  if(applies)return {id,text:entry.text(b)};
 }
 return null;
}

// 入场机制速览：把练习没覆盖的系统一次列全，供出发前阅读。
export function mechanicBriefs(b){
 return MECHANIC_GUIDES.filter(entry=>{
  try{return entry.when(b)!==false;}catch{return false;}
 }).map(entry=>({id:entry.id,text:entry.text(b)}));
}
