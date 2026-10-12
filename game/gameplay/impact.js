/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.4 打击反馈层。全部是表现：不消费战斗随机数、不进快照、不改任何规则分支。
// 单一数据源：血条滞后的追赶速度、受击红晕的累积与衰减、低血量脉冲曲线、伤害数字的弹出与上浮曲线
// 都出自这里，渲染循环只按这些曲线画，设置页说明也读同一份数据。
export const IMPACT_VERSION = 1;

const TAU = Math.PI * 2;
const clamp01 = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

// 血条伤害滞后：真实血条先掉到当前值，后面留一条浅色残影慢慢追上来，所以「这一下掉了多少」看得见。
// 只有掉血才滞后；回血直接跟上——否则残影会比真实血量短，反而读成「血更少」。
// 0.55 / 秒 意味着满条约 1.8 秒追平，比血条本身的 0.1 秒过渡慢一个量级，差距才看得清。
export const LAG_RATE = .55;
export function lagStep(current, target, dt, rate = LAG_RATE){
 const t = clamp01(target);
 if(!Number.isFinite(current)) return t;
 const c = clamp01(current);
 if(c <= t) return t;
 return Math.max(t, c - Math.max(0, dt || 0) * rate);
}

// 受击红晕：屏幕四边泛红，强度按「这一下掉了多少血」累积，然后按时间衰减。
// 2.4 的累积系数让一次掉三成血就接近满强度，一次小擦伤只留一点痕迹。
export const HURT_GAIN = 2.4, HURT_DECAY = 1.7, HURT_MAX = 1;
export function hurtGain(damage, maxHp, gain = HURT_GAIN){
 const share = Number.isFinite(maxHp) && maxHp > 0 ? Math.max(0, damage || 0) / maxHp : 0;
 return Math.min(HURT_MAX, share * gain);
}
export function hurtDecay(value, dt, decay = HURT_DECAY){
 return Math.max(0, (Number.isFinite(value) ? value : 0) - Math.max(0, dt || 0) * decay);
}

// 低血量脉冲：低于阈值后屏幕边缘按呼吸节奏一亮一暗，越低越深。
// 用 sin 而不是随机数，所以同一时刻重画得到同一画面，也不会有隐藏状态。
export const LOW_HEALTH = .3, PULSE_HZ = .62;
export function lowHealthPulse(hp, maxHp, seconds, threshold = LOW_HEALTH){
 // 没有有效生命上限就没有「低血量」可言，直接不脉冲，避免 0/0 被读成满强度。
 if(!Number.isFinite(maxHp) || maxHp <= 0) return 0;
 const fraction = clamp01(hp / maxHp);
 if(fraction >= threshold) return 0;
 const depth = 1 - fraction / threshold;
 const beat = (Math.sin((Number.isFinite(seconds) ? seconds : 0) * TAU * PULSE_HZ) + 1) / 2;
 return clamp01(depth * (.5 + .5 * beat));
}

// 红晕与脉冲合成一个边缘强度。开关关闭时整层为 0。
export const VIGNETTE_MAX = .5;
export function vignetteAlpha(hurt, pulse, enabled = true){
 if(!enabled) return 0;
 return clamp01(Math.max(hurt || 0, pulse || 0)) * VIGNETTE_MAX;
}

// 伤害数字：出现瞬间放大回弹，随后上浮先快后慢。
// 原来是一条线性上浮的固定字号，打出去的数字没有「弹」出来的感觉。
export const NUMBER_POP = .5, NUMBER_RISE = 26;
export function numberPop(progress, peak = NUMBER_POP){
 return 1 + peak * Math.pow(1 - clamp01(progress), 2.6);
}
export function numberRise(progress, distance = NUMBER_RISE){
 return distance * (1 - Math.pow(1 - clamp01(progress), 2.2));
}

// 设置页说明由同一份数据生成，避免「印在界面上的话」和实际画的东西脱节。
export function impactSummary(){
 return {lagSeconds:Math.round(10 / LAG_RATE) / 10, lowHealth:Math.round(LOW_HEALTH * 100), hurtDecay:HURT_DECAY};
}
