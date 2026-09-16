/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Round-2 batch C-9: fixed-step sub-stepping for slow frames.
// A frame longer than MAX_STEP is split into equal sub-steps (each ≤ MAX_STEP, at most MAX_SUBSTEPS, total ≤ MAX_FRAME)
// so game time keeps pace with wall-clock time below 20 fps instead of slowing down (which also slowed net battle timing).
// Frames ≤ MAX_STEP call update once with the same dt as before, so the battle RNG consumption order is unchanged for them;
// nothing here is serialized.
export const MAX_STEP=.05,MAX_SUBSTEPS=4,MAX_FRAME=MAX_STEP*MAX_SUBSTEPS;
export function frameSteps(dt){if(!(dt>0))return [];const total=Math.min(dt,MAX_FRAME),count=Math.min(MAX_SUBSTEPS,Math.max(1,Math.ceil(total/MAX_STEP-1e-9)));return Array.from({length:count},()=>total/count);}
export function stepBattle(b,dt){const steps=frameSteps(dt);for(const step of steps){if(b.modeState!=='battle'||b.finished)break;b.update(step);}return steps;}
