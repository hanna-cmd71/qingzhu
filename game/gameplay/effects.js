/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.3 表现层。全部是表现：不消费战斗随机数、不进快照、不改任何规则分支。
// 单一数据源：每个特效的辉光层宽度、外发光不透明度与火花数量，以及画质档判据，都出自这里。
// 渲染循环只按这张表画，设置页说明与界面核对脚本读同一份数据，所以文案不会和画面脱节。
export const EFFECTS_VERSION = 1;

// 辉光分层。outer 是加色混合（globalCompositeOperation='lighter'）下的外发光：宽而淡，
// 叠在 2.2 原有的那一笔下面，暗底上才有体积感。原来那一笔（core）的宽度、颜色、几何都不变。
// sparks 是特效存续期间向外飞散的火花数（0 表示不画）。
// 没列在这里的 kind 保持 2.2 原样，等于「没有辉光」——这样新增表现是逐项 opt-in，不会连带改到别的特效。
export const GLOW = {
 ring:        {outer:7,  outerAlpha:.30, sparks:0},
 carveBurst:  {outer:9,  outerAlpha:.26, sparks:6},
 fusionSlash: {outer:16, outerAlpha:.28, sparks:10},
 sigilBurst:  {outer:10, outerAlpha:.26, sparks:8},
 thunder:     {outer:12, outerAlpha:.26, sparks:0},
 bolt:        {outer:9,  outerAlpha:.24, sparks:0},
 line:        {outer:6,  outerAlpha:.22, sparks:0},
};

export const FULL = 'full', LITE = 'lite';

// 画质档：只有显式写 0 才是「精简」，其余（含未设置、坏值）都按「完整」走。
// 这与 save-store 的归一化一致，也和 2.0 起「飞剑尾迹」档位的语义一致。
export function effectTier(settings){ return settings && settings.quality === 0 ? LITE : FULL; }
export function additiveEnabled(settings){ return effectTier(settings) === FULL; }
export function glowFor(kind){ return GLOW[kind] || null; }

// 外发光的不透明度随特效本身的淡出一起衰减；画质档为「精简」时返回 0，等于整层不画。
export function glowAlpha(kind, alpha, settings){
 const spec = GLOW[kind];
 if(!spec || !additiveEnabled(settings)) return 0;
 return Math.max(0, alpha || 0) * spec.outerAlpha;
}

export function sparkCount(kind, settings){
 const spec = GLOW[kind];
 if(!spec || !additiveEnabled(settings)) return 0;
 return spec.sparks;
}

// 火花位置完全由序号与进度决定，不取随机数——表现层既不能碰战斗随机流，也不该有隐藏状态，
// 否则同一帧重画两次就会得到不同画面。黄金角分布保证任意数量下都不扎堆。
const GOLDEN = 2.399963229728653;
export function sparkAt(index, count, progress, radius){
 const step = Math.max(0, Math.min(1, progress || 0)), r = Math.max(0, radius || 0);
 // 序号偏移里带上火花总数，不同数量的特效不会共享同一串落点。
 const angle = index * GOLDEN + (index % 3) * .62 + Math.max(1, count || 1) * .37;
 const spread = .5 + (((index * 2654435761) >>> 8) & 255) / 255 * .85;
 const distance = r * spread * (.55 + step * .8);
 return {x:Math.cos(angle) * distance, y:Math.sin(angle) * distance, size:Math.max(1, 3.4 * (1 - step)), alpha:Math.max(0, 1 - step) * .8};
}

// 设置页说明由同一份数据生成，避免「印在界面上的话」和实际画的东西脱节。
export function effectsSummary(){
 const kinds = Object.keys(GLOW);
 const sparking = kinds.filter(k => GLOW[k].sparks > 0).length;
 return {kinds:kinds.length, sparking, maxGlow:Math.max(...kinds.map(k => GLOW[k].outer))};
}
