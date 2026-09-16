import {validateSupply} from './late-supply.js';
import {CORES,coreEligible} from './expedition-data.js';
import {thunderBaseCost} from './balance.js';
export const ECONOMY_VERSION=4;
export const revisedEconomy=b=>b.rulesVersion===3&&[2,3,4].includes(b.options.economyVersion);
export const expandedEconomy=b=>b.rulesVersion===3&&b.options.economyVersion>=3;
export const rerollNodesV2=['3:prep','4:1','5:1'];
export const rerollNodesV3=['3:prep','3:0','3:1','4:0','4:1','4:2','4:3','5:0','5:1','5:2'];
export const rerollNodes=b=>expandedEconomy(b)?rerollNodesV3:rerollNodesV2;
export const endingCleanup=(b,chapter=b.chapter,wave=b.wave)=>expandedEconomy(b)&&['story','seed'].includes(b.mode)&&chapter===5&&wave===3;
export const emptyEconomy=b=>({rerollPurchases:[],...(b?.options.economyVersion===4?{supplyPurchases:[]}:{})});
export const usefulCore=(c,b)=>coreEligible(c,b)&&(c.id!=='K03'||b.player.maxReserve>=Math.max(8,thunderBaseCost(b)-(b.stats.thunderSave||0))+3);
export function variedCoreOffers(b){
 const pool=CORES.filter(c=>usefulCore(c,b)&&!b.relics.includes(c.id)),picked=[];
 const heldPaths=new Set(CORES.filter(c=>b.relics.includes(c.id)).map(c=>c.path));
 const take=list=>{if(!list.length)return;const c=list[Math.floor(b.contentRng()*list.length)];picked.push(c);pool.splice(pool.indexOf(c),1);};
 if(b.chapter===0){take(pool.filter(c=>c.path===b.path));take(pool.filter(c=>c.path!==b.path));}
 // At the second milestone, favor adding a usable direction before replacing an equipped one.
 while(picked.length<3&&pool.length){const fresh=pool.filter(c=>!heldPaths.has(c.path));take(fresh.length?fresh:pool);}
 return picked.map(c=>c.id);
}
export function rerollPurchaseReadiness(b){
 const count=b.economy?.rerollPurchases.length||0,price=[80,120][count]??null;
 const visible=revisedEconomy(b)&&!!b.rest&&rerollNodes(b).includes(b.rest.node)&&(expandedEconomy(b)||!!b.rest.shop);
 const reason=!visible?(expandedEconomy(b)?'第四章起、终战前的整备开放':'第四章起的商店开放'):b.scene!=='intermission'?'请返回整备':count>=2?'本局已购买 2 次':b.gold<price?'还缺 '+(price-b.gold)+' 灵石':'';
 return {visible,count,price,ready:!reason,reason};
}
export function buyReroll(b,quotedPrice=rerollPurchaseReadiness(b).price){
 const state=rerollPurchaseReadiness(b);if(!state.ready||quotedPrice!==state.price)return false;
 const receipt={id:b.runId+':'+(b.endlessLoop||0)+':'+b.rest.node+':reroll:'+(state.count+1),loop:b.endlessLoop||0,node:b.rest.node,price:state.price,beforeGold:b.gold,afterGold:b.gold-state.price,beforeRerolls:b.rerolls,afterRerolls:b.rerolls+1};
 b.gold=receipt.afterGold;b.rerolls=receipt.afterRerolls;b.economy.rerollPurchases.push(receipt);b.checkpoint();b.toast('已购悟道重选 +1 · 本局 '+(state.count+1)+' / 2');return true;
}
export function validatePhase3(data,b){
 validateSupply(data,b);const ex=data.expedition,fail=label=>{throw Error(label+'无效，原记录未被修改');};
 if(b.options.balanceVersion===3){if(!Number.isFinite(ex.setupUntil)||ex.setupUntil< -1||ex.setupUntil>data.time+.3+1e-6)fail('驻定衔接计时');}
 else if(ex.setupUntil!==undefined)fail('旧平衡规则含新版衔接');
 for(const e of ex.enemies)if(e.lastInsectHit!==undefined&&(!b.stats.metaInsectAssist||!Number.isFinite(e.lastInsectHit)||e.lastInsectHit<0||e.lastInsectHit>data.time))fail('虫群协击时刻');
 if(!revisedEconomy(b)){if(ex.economy!==undefined)fail('旧经济规则含新版账本');return;}
 const state=ex.economy;if(!state||!Array.isArray(state.rerollPurchases)||state.rerollPurchases.length>2)fail('悟道重选购置账本');
 let previousLoop=0;for(const [i,r] of state.rerollPurchases.entries()){
  if(!r||r.price!==[80,120][i]||!Number.isInteger(r.loop)||r.loop<previousLoop||r.loop>(b.endlessLoop||0)||!rerollNodes(b).includes(r.node)||r.id!==b.runId+':'+r.loop+':'+r.node+':reroll:'+(i+1))fail('悟道重选付款凭据');
  if(!['beforeGold','afterGold','beforeRerolls','afterRerolls'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0&&r[k]<=1e12)||r.beforeGold-r.afterGold!==r.price||r.afterRerolls-r.beforeRerolls!==1)fail('悟道重选付款分项');
  if(r.loop===(b.endlessLoop||0)&&Number(r.node[0])>b.chapter)fail('悟道重选购置章节');if(expandedEconomy(b)&&r.loop===(b.endlessLoop||0)&&r.node!=='3:prep'&&!ex.receipts.includes(r.node))fail('悟道重选尚未到达节点');previousLoop=r.loop;
 }
 if(ex.rest?.coreOffers&&(ex.rest.coreOffers.length>3||new Set(ex.rest.coreOffers).size!==ex.rest.coreOffers.length))fail('核心候选');
}
