/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Unpublished economy-4 candidate; price variants belong to experiments, not player settings.
export const SUPPLY_NODES=['4:0','4:1','4:2','4:3','5:0','5:1'];
export const SUPPLY_SCHEDULES={flat80:[80,80,80],flat120:[120,120,120],flat180:[180,180,180],ladder:[80,120,180]};
export function supplyState(b,type='hp'){
 const records=b.economy?.supplyPurchases||[],count=records.length,schedule=b.options.experimentalSupplySchedule||'ladder',price=SUPPLY_SCHEDULES[schedule]?.[count]??null,p=b.player;
 const gain=type==='hp'?Math.max(0,Math.min(p.maxHp*.25,p.maxHp-p.hp)):type==='shield'?Math.max(0,Math.min(12,p.maxShield+12-p.shield)):0;
 const visible=b.options.economyVersion===4&&!!b.rest&&SUPPLY_NODES.includes(b.rest.node),duplicate=records.some(r=>r.loop===(b.endlessLoop||0)&&r.node===b.rest?.node);
 const reason=!visible?'unavailable':b.scene!=='intermission'?'wrong-scene':duplicate?'node-used':count>=3?'global-limit':!['hp','shield'].includes(type)?'invalid-type':gain<=0?'full':b.gold<price?'unaffordable':'';
 return {visible,ready:!reason,reason,count,type,gain,price,schedule};
}
export function buySupply(b,type,quotedPrice=supplyState(b,type).price){
 const state=supplyState(b,type);if(!state.ready||state.price!==quotedPrice)return false;const p=b.player;
 const r={id:b.runId+':'+(b.endlessLoop||0)+':'+b.rest.node+':supply',loop:b.endlessLoop||0,node:b.rest.node,type,price:state.price,beforeGold:b.gold,afterGold:b.gold-state.price,before:p[type],after:p[type]+state.gain,gain:state.gain,capacity:type==='hp'?p.maxHp:p.maxShield+12,maxHp:p.maxHp};
 b.gold=r.afterGold;p[type]=r.after;b.economy.supplyPurchases.push(r);b.checkpoint();return true;
}
export function validateSupply(data,b){
 if(b.options.economyVersion!==4)return;const fail=()=>{throw Error('补养交易记录无效，原记录未被修改');},records=data.expedition.economy?.supplyPurchases,schedule=SUPPLY_SCHEDULES[b.options.experimentalSupplySchedule||'ladder'];if(!schedule||!Array.isArray(records)||records.length>3)fail();const ids=new Set();let loop=0;
 for(const [i,r]of records.entries()){
  if(!r||!['hp','shield'].includes(r.type)||!SUPPLY_NODES.includes(r.node)||!Number.isSafeInteger(r.loop)||r.loop<loop||r.loop>(b.endlessLoop||0)||r.id!==b.runId+':'+r.loop+':'+r.node+':supply'||ids.has(r.id)||r.price!==schedule[i])fail();
  if(!['beforeGold','afterGold'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)||r.beforeGold-r.afterGold!==r.price)fail();
  if(!['before','after','gain','capacity','maxHp'].every(k=>Number.isFinite(r[k])&&r[k]>=0)||r.gain<=0||r.maxHp<=0||Math.abs(r.after-r.before-r.gain)>1e-5||r.after>r.capacity+1e-5||Math.abs(r.gain-Math.min(r.type==='hp'?r.maxHp*.25:12,r.capacity-r.before))>1e-5)fail();
  if(r.loop===(b.endlessLoop||0)&&!data.expedition.receipts.includes(r.node))fail();ids.add(r.id);loop=r.loop;
 }
}
