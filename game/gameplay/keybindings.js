/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
export const DEFAULT_KEYS = Object.freeze({dash:'Space',thunder:'KeyE',formation:'KeyQ',item1:'Digit1',item2:'Digit2'});
const RESERVED = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
const MODIFIERS = new Set(['ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight']);

export function bindingError(code) {
 if (code === 'Escape' || RESERVED.has(code)) return '此键保留用于移动或暂停';
 if (MODIFIERS.has(code)) return 'Ctrl、Alt、Meta 不能单独作为操作键，请选择其他按键';
 if (typeof code !== 'string' || !/^(Key[A-Z]|Digit[0-9]|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|Space|Enter|ShiftLeft|ShiftRight|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash)$/.test(code)) return '此按键不支持，请选择字母、数字、空格、回车、Shift 或常用符号键';
 return '';
}

// Keep old persisted bindings intact until the player explicitly replaces them.
export function invalidBindings(keymap = {}) {
 const keys = {...DEFAULT_KEYS,...keymap};
 return Object.entries(keys).filter(([id,key]) => bindingError(key) || Object.entries(keys).some(([other,value]) => id !== other && key === value)).map(([id]) => id);
}
