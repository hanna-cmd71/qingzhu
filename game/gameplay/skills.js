/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 流派技能 (starter skills): one active ability per starter, released by the player.
//
// The boundary the requirements draw is that the weapon layer owns passive and sustained form while
// this layer owns active release. Every skill below therefore spends the existing 灵力／雷源 and
// hooks the mechanic its own starter already has (御剑's 聚锋, 傀儡's 弩机, 符阵's 留符, 护身's 反击)
// rather than running a parallel system beside it.
//
// This module is the single data source: the engine reads the same table the departure page and the
// lodge render, so the printed numbers can never drift from the numbers that apply.
export const SKILL_VERSION=1;
export const skillDeclared=(options={})=>(options?.skillVersion??0)>=1;

// Effect windows. Kept here so the engine and the item text cannot disagree.
export const SKILL_EMPOWER_WINDOW=5;   // 聚锋引: seconds the next sword hit stays empowered
export const SKILL_ALLY_HASTE=3;       // 弩机齐射 / 虫噬号令: seconds of doubled ally cadence
export const SKILL_GUARD_WINDOW=.3;    // 守元: extra seconds added to the 化解 window
export const SKILL_GUARD_BONUS=.5;     // 守元: counter damage bonus
export const SKILL_GUARD_SHIELD=25;    // 守元: immediate shield

// resource: 'mana' (灵力 0-100) or 'reserve' (雷源). A skill has one cost, and the cost is what
// gates it, so no skill needs a separate cooldown to stay honest.
export const SKILLS=[
 {path:0,id:'focusLead',name:'聚锋引',resource:'mana',cost:35,desc:'立即引动剑锋：接下来 '+SKILL_EMPOWER_WINDOW+' 秒内的下一次剑击必定触发聚锋强化并追加穿透。'},
 {path:1,id:'callThunder',name:'引雷',resource:'reserve',cost:15,desc:'以雷源引动灵力：立即将灵力充满，并刷新余雷窗口。'},
 {path:2,id:'volley',name:'弩机齐射',resource:'mana',cost:30,desc:'全部傀儡立即齐射一次，并在 '+SKILL_ALLY_HASTE+' 秒内攻速翻倍。'},
 {path:3,id:'swarmOrder',name:'虫噬号令',resource:'mana',cost:30,desc:'虫群立即扑向集火目标（无集火则最近敌人）啃噬一次，并在 '+SKILL_ALLY_HASTE+' 秒内啃噬间隔减半。'},
 {path:4,id:'sigilLead',name:'引符',resource:'mana',cost:35,desc:'立即在身位处布下一枚符，无视独立冷却。'},
 {path:5,id:'wardUp',name:'守元',resource:'mana',cost:40,desc:'立即获得 '+SKILL_GUARD_SHIELD+' 护盾，并在 '+SKILL_ALLY_HASTE+' 秒内扩大化解窗口、反击伤害 +'+Math.round(SKILL_GUARD_BONUS*100)+'%。'},
];
export const skillIds=SKILLS.map(s=>s.id);
export const skillById=id=>SKILLS.find(s=>s.id===id)||null;
// A path without its own entry falls back to nothing: the starter is the identity of the skill, so
// a run whose path is out of range simply has no skill rather than someone else's.
export const skillForPath=path=>SKILLS.find(s=>s.path===path)||null;
export const skillCostOf=skill=>skill?skill.cost:0;
export const skillResourceLabel=skill=>skill?.resource==='reserve'?'雷源':'灵力';
// The resource pool the skill draws on, already clamped for display by the caller.
export function skillPool(b,skill){
 if(!b?.player||!skill)return 0;
 return skill.resource==='reserve'?b.player.reserve:b.player.mana;
}
// A release whose mechanic has nothing to act on would only burn the resource: 弩机齐射 needs a
// puppet to volley and 虫噬号令 needs a bug to send. Both are refused before the cost is taken and
// the reason is reported where the resource shortfall is, so the button never claims 可以施展 for a
// release that cannot do anything.
// The battle may also veto a release for its own reasons through the optional skillGate hook — the
// endless 圈前挑战 bans 神雷 in normal nodes, and 引雷 casts the same 神雷 the thunder button does, so
// the ban has to reach the skill too instead of being routed around.
export function skillBlocked(b,skill){
 if(!skill)return '未启用';
 if(skill.id==='volley'&&!(b?.puppets||[]).length)return '尚无傀儡';
 if(skill.id==='swarmOrder'&&!(b?.insects||[]).length)return '尚无噬金虫';
 return b?.skillGate?.(skill)||'';
}
export function skillReadiness(b){
 const skill=skillForPath(b?.path);
 if(!skillDeclared(b?.options)||!skill)return {skill:null,cost:0,resource:'mana',ready:false,pool:0,blocked:'未启用',label:'未启用'};
 const pool=skillPool(b,skill),cost=skill.cost,enough=pool>=cost-1e-6,blocked=skillBlocked(b,skill);
 return {skill,cost,resource:skill.resource,pool,blocked,ready:!blocked&&enough&&b.modeState==='battle',label:blocked||(enough?'可以施展':skillResourceLabel(skill)+' '+Math.floor(pool)+' / '+cost)};
}
// Item text is generated from the same table the engine reads.
export function skillEffectText(path,options={}){
 const skill=skillForPath(path);
 if(!skill||!skillDeclared(options))return '';
 return skill.name+'（耗'+skillResourceLabel(skill)+' '+skill.cost+'）：'+skill.desc;
}
