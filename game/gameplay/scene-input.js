/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Transient physical input cycles. Never serialized or used by the combat RNG.
export function createSceneInput(){
 let epoch=0;const pointers=new Map(),keys=new Map();
 return {
  invalidate(){epoch++;},
  reset(){epoch++;pointers.clear();keys.clear();},
  pointerDown(e){pointers.set(e.pointerId,{epoch,x:e.clientX,y:e.clientY,dragged:false,released:false});},
  pointerMove(e){const p=pointers.get(e.pointerId);if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>8)p.dragged=true;},
  pointerUp(e){const p=pointers.get(e.pointerId);if(p)p.released=true;pointers.delete(e.pointerId);},
  pointerCancel(e){pointers.delete(e.pointerId);},
  keyDown(e){if(!keys.has(e.code))keys.set(e.code,{epoch,released:false});},
  keyUp(e){const k=keys.get(e.code);if(k){k.released=true;keys.delete(e.code);}},
  armPointer(e){const p=pointers.get(e.pointerId);return p?.epoch===epoch&&e.button===0?{epoch,pointer:p}:null;},
  armKey(e){const k=keys.get(e.code);return !e.repeat&&['Space','Enter'].includes(e.code)&&k?.epoch===epoch?{epoch,key:k}:null;},
  consume(arm,e){if(!arm||arm.epoch!==epoch||arm.used||e.detail>1)return false;if(arm.pointer&&(!arm.pointer.released||arm.pointer.dragged))return false;arm.used=true;return true;},
 };
}
