/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 剑阵 2.0 · 阵图编成 / 御剑笔画 / 剑意·合体 / 剑气刻痕
//
// The original engine drove every sword from one integer (`formation`): all swords chased, or all
// swords orbited, or all swords struck one point. This layer keeps the same seventy-two swords and
// the same damage curve but lets the player *compose* the array instead of switching one global
// mode, then adds three things to spend that composition on.
//
//   A 阵图编成 — a preset hands each sword one of four 阵位角色 (追锋/环锋/定锋/游锋). The roles fly
//              differently: a chase wing converges, a guard wing holds the inner ring, an anchor
//              wing reaches far with extra pierce, a roam wing hunts at the edge of the field.
//   B 御剑笔画 — the player draws a stroke; the array flies the stroke as a single sweep and
//              everything the line crosses is cut once.
//   C 剑意·合体 — sword hits build 剑意. At full 剑意 the array fuses into one blade that whirls
//              around Han Li for a few seconds.
//   D 剑气刻痕 — sword hits leave 刻痕 on the ground. The next sword hit near a 刻痕 detonates it
//              for area damage, so a dense fight chains.
//
// Everything here is pure and version gated: a run without `options.arrayVersion===1` reads none of
// it and behaves exactly as the frozen engine does. Nothing in this module touches the save format,
// the level curve, the weapon methods or the cultivation tree.

export const ARRAY_VERSION = 1;
export const arrayDeclared = options => (options?.arrayVersion ?? 0) >= 1;

// --- A. 阵图编成 ---------------------------------------------------------------------------
// A role is a flight order, not a damage type: it decides where the sword waits, how far it looks
// and how it picks among candidates. `pick` mirrors the original three-way heuristic so a preset
// can reproduce the old feel (追锋 ≈ 分组追击, 环锋 ≈ 环绕护身, 定锋 ≈ 定向穿刺) while 游锋 is new.
export const SWORD_ROLES = [
  {id: 'chase', name: '追锋', desc: '锁定最近的敌人，出击最勤。', color: '#f0d79e'},
  {id: 'orbit', name: '环锋', desc: '守在近身环上，来敌即斩。', color: '#a6dfd1'},
  {id: 'anchor', name: '定锋', desc: '驻位远击，多穿一名敌人。', color: '#bccff4'},
  {id: 'roam', name: '游锋', desc: '远出游猎，专挑外围敌人。', color: '#e5b6de'},
];
export const swordRoleIds = SWORD_ROLES.map(r => r.id);
export const roleById = id => SWORD_ROLES.find(r => r.id === id) || SWORD_ROLES[0];

// Flight parameters per role. `ring`/`ringStep`/`ringEvery` place the sword in the standing ring,
// `range` is its own search radius, `cool` scales the re-launch interval and `damage` scales the
// sword's hit. All four are read only when the array layer is declared.
export const ROLE_PARAMS = {
  chase: {ring: 48, ringStep: 15, ringEvery: 16, range: 320, orbit: .5, pierce: 0, cool: 1, damage: 1, pick: 'spread'},
  orbit: {ring: 96, ringStep: 24, ringEvery: 18, range: 150, orbit: 1.5, pierce: 0, cool: .85, damage: .9, pick: 'near'},
  anchor: {ring: 62, ringStep: 12, ringEvery: 16, range: 430, orbit: .35, pierce: 1, cool: 1.3, damage: 1.15, pick: 'near'},
  roam: {ring: 150, ringStep: 18, ringEvery: 16, range: 520, orbit: .8, pierce: 0, cool: .85, damage: .88, pick: 'far'},
};

// A preset is a set of role weights. Swords are handed out in contiguous wings in the listed order,
// so a preset reads on screen as "this arc of the ring is the guard wing, that arc is the hunt".
export const ARRAY_PRESETS = [
  {id: 'blade', name: '全攻', desc: '七十二剑尽为追锋，出击最凶，护身最薄。', weights: {chase: 1}},
  {id: 'balanced', name: '均衡', desc: '追锋为主，环锋守内圈，攻守各半。', weights: {chase: .62, orbit: .38}},
  {id: 'ward', name: '守御', desc: '环锋守身，定锋远镇，贴身防线最厚。', weights: {orbit: .55, anchor: .45}},
  {id: 'hunt', name: '游猎', desc: '游锋远出索敌，追锋收束残敌。', weights: {roam: .5, chase: .5}},
];
export const DEFAULT_PRESET = 'balanced';
export const arrayPresetIds = ARRAY_PRESETS.map(p => p.id);
export const arrayPresetById = id => ARRAY_PRESETS.find(p => p.id === id) || ARRAY_PRESETS.find(p => p.id === DEFAULT_PRESET);
export const normalizeArrayPreset = id => arrayPresetIds.includes(id) ? id : DEFAULT_PRESET;
export const nextArrayPreset = id => ARRAY_PRESETS[(ARRAY_PRESETS.findIndex(p => p.id === normalizeArrayPreset(id)) + 1) % ARRAY_PRESETS.length].id;

// Which role the index-th sword takes. Pure and total: any index, any total, always a real role.
export function roleFor(presetId, index, total) {
  const weights = arrayPresetById(presetId).weights, entries = Object.entries(weights);
  if (entries.length === 1) return entries[0][0];
  const sum = entries.reduce((a, [, w]) => a + w, 0);
  const slot = (((index % total) + total) % total) + .5;
  let acc = 0;
  for (const [role, w] of entries) {
    acc += w / sum * total;
    if (slot <= acc) return role;
  }
  return entries[entries.length - 1][0];
}

// How many swords of each role a preset fields — the panel and the tests both read this, so the
// display can never disagree with what the engine actually flies.
export function roleCounts(presetId, total = 72) {
  const counts = Object.fromEntries(swordRoleIds.map(id => [id, 0]));
  for (let i = 0; i < total; i++) counts[roleFor(presetId, i, total)]++;
  return counts;
}

// Widest reach any wing of this preset can acquire at, used by the touch lock so a locked target is
// never outside every sword's own search radius.
export function arrayMaxRange(presetId, stats = {}, total = 72) {
  const mul = 1 + (stats.range || 0);
  let best = 0;
  for (let i = 0; i < total; i++) {
    const role = roleFor(presetId, i, total), p = ROLE_PARAMS[role];
    const ring = p.ring + Math.floor(i / p.ringEvery) * p.ringStep;
    best = Math.max(best, role === 'orbit' ? ring + 90 : p.range * mul);
  }
  return best;
}

// The slowest re-launch any wing can reach, so the snapshot relation check can still bound `cool`.
export const arrayMaxSwordCool = () => Math.max(...Object.values(ROLE_PARAMS).map(p => p.cool)) * 1.05;

// --- B. 御剑笔画 ---------------------------------------------------------------------------
// The stroke is recorded as a polyline in world space, then flown at a fixed arc-length speed so the
// sweep always takes the same time per unit of length regardless of how fast the pointer moved.
export const STROKE = {
  minLength: 120,      // shorter than this is treated as a stray drag, not a stroke
  maxPoints: 64,
  radius: 34,          // enemies within this distance of the sweep head are cut
  speed: 1600,         // arc-length units per second
  sample: 11,          // minimum spacing between recorded points
  damageScale: 2.4,    // multiples of the plain sword hit
  intent: 4,           // 剑意 granted per enemy cut by a stroke
};
export function strokeLength(points = []) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return total;
}
export function strokeValid(points = []) {
  return points.length >= 2 && strokeLength(points) >= STROKE.minLength;
}
// Point at a given arc length along the polyline; clamped at both ends.
export function strokePointAt(points, distance) {
  if (!points.length) return null;
  if (points.length === 1 || distance <= 0) return points[0];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + seg >= distance) {
      const t = seg ? (distance - walked) / seg : 0;
      return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
    }
    walked += seg;
  }
  return points[points.length - 1];
}
export function strokeDamage(level) {
  return (12 + level * .06) * STROKE.damageScale * (1 + Math.min(72, level) / 12 * .03);
}

// --- C. 剑意·合体 --------------------------------------------------------------------------
// 剑意 is a second meter beside 灵力: it fills from sword work, not from time, and it is spent all at
// once on the fusion. The fusion is a sustained whirlwind rather than a single burst, so it reads as
// the array gathering into one blade instead of a bigger number.
export const INTENT = {
  max: 100,
  perHit: .9,
  perCarve: 9,
  perStroke: 4,
};
export const FUSION = {
  duration: 4.5,
  radius: 190,
  tick: .26,
  spin: 5.4,
  damageScale: 3.2,
};
export function fusionDamage(level) {
  return (12 + level * .06) * FUSION.damageScale * (1 + Math.min(72, level) / 12 * .03);
}
export const intentReady = value => (value || 0) >= INTENT.max - 1e-9;
export function intentLabel(value) {
  const v = Math.max(0, Math.min(INTENT.max, value || 0));
  return intentReady(v) ? '剑意圆满 · 可合体' : '剑意 ' + Math.floor(v) + ' / ' + INTENT.max;
}

// --- D. 剑气刻痕 ---------------------------------------------------------------------------
// A 刻痕 is a friendly ground mark, not a damage-over-time zone: it does nothing until the next sword
// hit lands near it, then it bursts. Density is capped so a big fight cannot carpet the field.
export const CARVE = {
  chance: .14,
  max: 6,
  ttl: 6,
  radius: 30,
  trigger: 34,      // a sword hit this close to an existing 刻痕 detonates it
  blast: 2.4,       // blast radius, multiples of CARVE.radius
  damageScale: 1.6,
};
export function carveDamage(level) {
  return (12 + level * .06) * CARVE.damageScale * (1 + Math.min(72, level) / 12 * .03);
}
export const carveBlastRadius = () => CARVE.radius * CARVE.blast;
