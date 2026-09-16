/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {RELICS} from './data.js';
// Historical chapter access is not a receipt for the current run's inventory.
// Round-2 C-6: the treasure-hall items (five-rings/cape) are handed out at node 3:0, so a run that holds that receipt
// counts as having lived through the event even before chapter 4 unlocks.
const TREASURE_ITEMS=new Set(['five-rings','cape']);
export const treasureReceipt=run=>Array.isArray(run?.expedition?.receipts)&&run.expedition.receipts.includes('3:0');
export function catalogItemState(item,save){
 const run=save.checkpoint,configurable=RELICS.some(r=>r.id===item.id&&r.story);
 const history=save.wins>0||save.unlocked>=item.chapter||TREASURE_ITEMS.has(item.id)&&treasureReceipt(run);
 const held=!!run?.storyInventory?.includes(item.id),equipped=!!run?.relics?.includes(item.id);
 return {history:'账号历史：'+(history?'已历经相关纪事':'尚未历经相关纪事'),
  inventory:!run?'本局行囊：暂无续玩记录':item.id==='swords'?'本局御剑：已炼成 · 随等级上场':configurable?'本局行囊：'+(!Array.isArray(run.storyInventory)?'旧局未记录，无法据此判断':held?'已持有':'尚未取得'):'本局行囊：无独立持有记录',
  configuration:!configurable?'本篇配置：'+(item.id==='swords'?'基础御剑':'不开放装备或协战'):!run?'本局配置：暂无续玩记录':'本局配置：'+(equipped?item.id==='weeping'?'协战配置生效':'携行效果生效':item.id==='weeping'?'未启用协战':'未配置')};
}
