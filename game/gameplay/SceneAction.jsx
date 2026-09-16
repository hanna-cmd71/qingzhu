/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React,{useRef} from 'react';
// A choice/advance requires a fresh down/up cycle begun on this explicit button.
// Round-2 C-2: the choice card body is made clickable by stretching this button over its card (game.css
// .choice-card .scene-action::after), so the whole card is one pointer target with exactly one keyboard target
// and one accessible name — no second activation path and no extra tab stop.
export default function SceneAction({gate,onAction,buttonRef,className='',children,...props}){
 const arm=useRef(null);
 return <button {...props} ref={buttonRef} className={'fr-btn scene-action '+className}
  onPointerDown={e=>{arm.current=gate.armPointer(e);}}
  onKeyDown={e=>{if(e.repeat){e.preventDefault();return;}arm.current=gate.armKey(e);}}
  onClick={e=>{if(!gate.consume(arm.current,e)){e.preventDefault();return;}gate.invalidate();onAction();}}>{children}</button>;
}
