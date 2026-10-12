/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.1 手感层。全部是表现：不消费战斗随机数、不进快照、不改任何规则分支。
// 单一数据源：引擎按 impact 名称发 hitstop 事件，渲染循环、震动衰减与音频都读这里的同一张表，
// 所以印在设置页上的说明不会和实际数值脱节。
export const FEEL_VERSION = 1;

// 顿帧时长（秒）。重动作长、轻动作短。kill 在一场虫潮里会大量触发，所以给得最短。
export const HITSTOP = {kill:.045,hurt:.05,sigil:.05,thunder:.08,fusion:.1,bossPhase:.14,bossDefeat:.2};

// 顿帧的合流与限流。一次只冻结一次、两次之间留间隔，否则连续击杀会把战斗拖成慢动作。
export const FREEZE_CAP = .3, FREEZE_MIN_GAP = .12, FREEZE_HEAVY = .08;
// 受击白闪的峰值：引擎把 e.flash 设成 0.1 秒，白闪按它线性衰减。
export const IMPACT_FLASH_PEAK = .1;

export function hitstopFor(impact){ return HITSTOP[impact] || 0; }

// 纯函数：给定当前冻结状态与一次请求，返回下一个状态。重动作可以穿过限流间隔，轻动作不能。
export function freezeDecision(state,value,enabled=true){
 const left = state?.left || 0, gap = state?.gap || 0;
 if(!enabled || !(value > 0) || left > 0) return {left,gap,granted:false};
 if(gap > 0 && value < FREEZE_HEAVY) return {left,gap,granted:false};
 return {left:Math.min(FREEZE_CAP,value),gap:Math.max(FREEZE_MIN_GAP,value*2),granted:true};
}

export function tickFreeze(state,dt){
 const step = Math.max(0,dt||0);
 return {left:Math.max(0,(state?.left||0)-step),gap:Math.max(0,(state?.gap||0)-step)};
}

// 震动按时间衰减。原来每帧乘 0.85，在高刷新率屏幕上几帧就归零，等于没有震动。
export function shakeDecay(amplitude,dt){ return (amplitude||0) * Math.pow(.85,Math.max(0,Math.min(.1,dt||0))*60); }

export function impactFlashAlpha(flash,peak=IMPACT_FLASH_PEAK){ return Math.max(0,Math.min(1,(flash||0)/peak)); }

// 伤害数字按量级放大，暴击再高一档；上下限固定，避免后期数字撑破版面。
export function damageNumberEmphasis(total,crit){
 const magnitude = Math.log10(Math.max(1,total||0));
 return crit ? 1+Math.min(.45,magnitude*.18) : 1+Math.min(.3,magnitude*.12);
}
