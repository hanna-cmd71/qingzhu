/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import assert from 'node:assert/strict';
// Wait for the observable UI state, not for an assumed frame scheduling interval.
export async function waitForText(locator,pattern,{timeout=5000}={}){
 const end=Date.now()+timeout;let actual='';
 while(Date.now()<end){actual=await locator.innerText();if(pattern.test(actual))return actual;await locator.page().waitForTimeout(40);}
 assert.match(actual,pattern,'Expected UI state did not appear within '+timeout+'ms');
}
