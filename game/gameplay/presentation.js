/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.5 表现总控。2.1–2.4 四条表现线（手感 / 引导 / 特效 / 打击反馈）各自带了一批开关，
// 这一层把它们收在同一个判据下：「减少动效」是压在这些开关之上的一层总闸，
// 只决定「会动或会闪的那一部分」播不播，不改变任何一项开关本身的含义。
// 全部是表现：不消费战斗随机数、不进快照、不改任何规则分支。
import {HITSTOP, hitstopFor} from './feel.js';
import {effectTier, additiveEnabled, effectsSummary} from './effects.js';
import {impactSummary} from './impact.js';
import {tipsEnabled} from './guide.js';

export const PRESENTATION_VERSION = 1;

// 三档：跟随系统（默认）/ 完整 / 减少。只有显式 reduced 才是减少，只有显式 full 才是完整，
// 缺失与坏值一律回落「跟随系统」——与 save-store 的归一化判据一致。
export const FOLLOW = 'follow', MOTION_FULL = 'full', MOTION_REDUCED = 'reduced';
export const MOTION_MODES = [FOLLOW, MOTION_FULL, MOTION_REDUCED];
export const MOTION_LABELS = {[FOLLOW]: '跟随系统', [MOTION_FULL]: '完整', [MOTION_REDUCED]: '减少'};

export function motionMode(settings) {
  const value = settings && settings.motion;
  return MOTION_MODES.includes(value) ? value : FOLLOW;
}

export function motionLabel(mode) {
  return MOTION_LABELS[motionMode({motion: mode})];
}

// 设置页用同一个循环按钮切三档，顺序就是 MOTION_MODES。
export function nextMotionMode(mode) {
  const index = MOTION_MODES.indexOf(motionMode({motion: mode}));
  return MOTION_MODES[(index + 1) % MOTION_MODES.length];
}

// media 是 matchMedia('(prefers-reduced-motion: reduce)') 的结果。
// 拿不到它（老浏览器、Node 测试）就当作系统没有要求减少，绝不把「读不到」当成「要减少」。
export function systemReducedMotion(media) {
  return !!media && media.matches === true;
}

let cachedQuery;
export function motionQuery() {
  if (cachedQuery === undefined) cachedQuery = typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia('(prefers-reduced-motion: reduce)') : null;
  return cachedQuery;
}

// 纯函数：只读 settings 与媒体状态，返回此刻是否要减少动效。
export function reducedMotion(settings, media = motionQuery()) {
  const mode = motionMode(settings);
  if (mode === MOTION_REDUCED) return true;
  if (mode === MOTION_FULL) return false;
  return systemReducedMotion(media);
}

// 「减少动效」下每一项表现的取舍集中在这张表里，设置页说明由它生成，所以文案不会和实现脱节。
// kept:false 表示这一项属于「会动或会闪」，减少动效时整项不播；表里没有的项一律照常。
export const MOTION_POLICY = {
  shake: {kept: false, label: '镜头震动'},
  hitstop: {kept: false, label: '命中顿帧'},
  flash: {kept: false, label: '受击白闪与神雷闪光'},
  pop: {kept: false, label: '伤害数字弹出与上浮'},
  pulse: {kept: false, label: '低血量呼吸脉动'},
  sparks: {kept: false, label: '火花与冲刺残影'},
  lag: {kept: false, label: '血条掉血残影'},
  css: {kept: false, label: '场景与提示淡入'},
};

export function motionKept(kind, settings, media) {
  const spec = MOTION_POLICY[kind];
  if (!spec) return true;
  return spec.kept ? true : !reducedMotion(settings, media);
}

export function droppedByMotion() {
  return Object.keys(MOTION_POLICY).filter(k => MOTION_POLICY[k].kept === false);
}

// 写进 <html data-motion> 的值，让 CSS 与画布用同一个判据，不会一个停一个不停。
export function motionAttribute(settings, media) {
  return reducedMotion(settings, media) ? MOTION_REDUCED : MOTION_FULL;
}

// 总账：把四条表现线的现状汇总成一份只读快照，供设置页「表现总览」与测试使用。
export function presentationLedger(settings, media = motionQuery()) {
  const mode = motionMode(settings), reduced = reducedMotion(settings, media), effects = effectsSummary(), impact = impactSummary();
  return {
    mode,
    label: MOTION_LABELS[mode],
    reduced,
    systemReduced: systemReducedMotion(media),
    tips: tipsEnabled(settings),
    feel: {impacts: Object.keys(HITSTOP).length, killStop: hitstopFor('kill')},
    effects: {tier: effectTier(settings), glow: additiveEnabled(settings), kinds: effects.kinds, sparking: effects.sparking},
    impact,
    dropped: reduced ? droppedByMotion().map(k => MOTION_POLICY[k].label) : [],
  };
}

export function presentationSummary() {
  const dropped = droppedByMotion();
  return {
    modes: MOTION_MODES.length,
    labels: MOTION_MODES.map(m => MOTION_LABELS[m]),
    dropped: dropped.length,
    droppedLabels: dropped.map(k => MOTION_POLICY[k].label),
    kinds: effectsSummary().kinds,
    lowHealth: impactSummary().lowHealth,
  };
}
