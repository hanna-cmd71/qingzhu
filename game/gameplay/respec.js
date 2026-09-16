/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {LEGACY_META} from './data.js';
import {cultivationCatalog,CULTIVATION_VERSION} from './cultivation.js';
import {normalizeGarden} from './expedition-data.js';
export function planMetaRefund(save,{path=null,fromStep=0}={}){
 const held=new Set(save.meta),catalog=(save.metaRulesVersion??1)<2?LEGACY_META:cultivationCatalog(save.metaRulesVersion),nodes=catalog.filter(m=>held.has(m.id)&&(path===null||m.path===path)&&m.step>=fromStep),removed=nodes.map(m=>m.id),refund=nodes.reduce((n,m)=>n+m.cost,0);
 return {nodes,refund,save:{...save,meta:save.meta.filter(id=>!removed.includes(id)),insight:save.insight+refund}};
}
export function planGardenRefund(save){const garden=normalizeGarden(save.garden),refund=(garden.unlocked.length-1)*3;return {refund,save:{...save,garden:{...garden,points:garden.points+refund,unlocked:['steady'],selected:'steady',research:'mana'}}};}

export function planCultivationUpgrade(save){const plan=planMetaRefund(save);return {...plan,save:{...plan.save,metaRulesVersion:CULTIVATION_VERSION}};}
