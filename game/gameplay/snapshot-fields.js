/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Persist only state actually used by each allied unit. Never mutate the input.
export function copyAllies(units,kind){
 const keys=kind==='puppet'?['x','y','cool','metaShots','coreShots']:['x','y','cool'];
 return units.map(unit=>Object.fromEntries(keys.filter(key=>unit[key]!==undefined).map(key=>[key,unit[key]])));
}
