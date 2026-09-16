/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {Battle} from './engine.js';
import {Expedition} from './expedition.js';
export const createRun=(options={},emit)=>options.rulesVersion!==undefined&&options.rulesVersion<=2?new Battle(options,emit):new Expedition(options,emit);
export const restoreRun=(data,emit)=>data?.options?.rulesVersion===3?Expedition.restore(data,emit):Battle.restore(data,emit);
