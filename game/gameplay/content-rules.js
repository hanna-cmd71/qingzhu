/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Content 3 keeps the 28-enemy roster and supply mapping of 2, with queued budget spawning.
// Existing runs keep their original content when the marker is absent.
export const CONTENT_VERSION=3;
export const expandedContent=b=>b.rulesVersion===3&&(b.options.contentVersion??1)>=2;
export const NEW_ENEMIES_BY_CHAPTER=[[24,25],[27],[25],[],[24,26],[27,26]];
export const ENEMY_ROLES={24:{label:'扇射',color:'#d7a7ef'},25:{label:'寒丝',color:'#85d8ef'},26:{label:'正盾',color:'#b2c9de'},27:{label:'游弋',color:'#9fe0cd'}};
export const RANGED_ENEMIES=['snipe','caster','triple','link','summon','healer','warder','fanbow','frostweb','orbitfire'];
