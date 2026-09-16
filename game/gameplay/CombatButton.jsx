/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React,{useRef} from 'react';
import {capturePointer} from './pointer-input.js';

// Touch acts on contact, including a secondary finger while the joystick is held.
// `as` lets styled buttons (pause, summary) keep their look while sharing the pointer path.
// `trigger="up"` fires after the captured touch's release settles: actions that open a dialog must not
// run inside the same touch sequence, or the dialog's outside-press dismissal reads that touch as a dismissal.
export default function CombatButton({onAction,disabled,as:Tag='button',trigger='down',...props}){
 const pressed=useRef(new Set()),lastTouch=useRef(-Infinity);
 const release=e=>pressed.current.delete(e.pointerId);
 const releaseAndAct=e=>{if(!pressed.current.delete(e.pointerId)||trigger!=='up'||e.pointerType!=='touch'||disabled)return;setTimeout(()=>onAction(),0);};
 return <Tag {...props} disabled={disabled} onPointerDown={e=>{
  if(e.pointerType!=='touch'){lastTouch.current=-Infinity;return;}
  e.preventDefault();if(disabled||pressed.current.has(e.pointerId)||!capturePointer(e))return;
  lastTouch.current=performance.now();pressed.current.add(e.pointerId);if(trigger==='down')onAction();
 }} onPointerUp={releaseAndAct} onPointerCancel={release} onLostPointerCapture={release} onClick={e=>{
  const native=e.nativeEvent;
  if(native.pointerType==='touch'||native.sourceCapabilities?.firesTouchEvents||(e.detail>0&&performance.now()-lastTouch.current<800)){e.preventDefault();return;}
  if(!disabled)onAction();
 }}/>;
}
