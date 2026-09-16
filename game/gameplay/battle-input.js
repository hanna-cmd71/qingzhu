/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
export const INPUT_VERSION=2;
export const DASH_BUFFER=.12;
export function clearDashInput(b){b.dashIntent=null;b.dashFeedback=null;}
export function requestDash(b){
 if(b.modeState!=='battle'||b.finished)return false;
 if(b.player.dashCD<=0){clearDashInput(b);return b.dash();}
 if(b.options.inputVersion===2&&b.player.dashCD<=DASH_BUFFER+1e-8){if(b.dashIntent)return false;b.dashIntent={until:b.time+DASH_BUFFER,readyAt:b.time+b.player.dashCD};b.dashFeedback={kind:'buffer',until:b.time+.25};return false;}
 b.dashFeedback={kind:'denied',until:b.time+.3};b.feedbackSound('denied',.4);return false;
}
export function tickDashInput(b){
 if(!b.dashIntent)return;
 if(b.modeState!=='battle'||b.finished){clearDashInput(b);return;}
 // A legal intent survives only the frame that crosses its promised ready time.
 // Never shorten cooldown: tick follows the engine's normal cooldown decrement.
 if(b.player.dashCD<=0&&b.dashIntent.readyAt<=b.dashIntent.until+1e-8){clearDashInput(b);if(b.dash())b.dashFeedback={kind:'executed',until:b.time+.25};return;}
 if(b.time>b.dashIntent.until+1e-8)clearDashInput(b);
}
