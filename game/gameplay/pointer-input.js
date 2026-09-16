/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Capture only a real, still-active pointer. Synthetic or expired IDs are ignored.
export function capturePointer(event){
 if(!event.isTrusted)return false;
 try{event.currentTarget.setPointerCapture(event.pointerId);return true;}catch{return false;}
}
