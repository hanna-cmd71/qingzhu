import {thunderBaseCost} from './balance.js';
import {TRAITS} from './data.js';
export const GROWTH_VERSION=4;
export const revisedGrowth=b=>b.rulesVersion===3&&b.options.growthVersion>=2;
// Reallocate 900 base XP to late chapter 5; total base XP remains 11960.
const XP_V3={4:[680,760,1160,1500],5:[1200,700,1000,300]};
// v4 moves 2200 from chapter 6 into chapter 5; total remains 11960.
const XP_V4={4:[1950,2050,1900,400],5:[400,200,250,150]};
export const goalGrowth=b=>b.rulesVersion===3&&b.options.growthVersion===4;
export const goalTimeLimits={survival:66,defend:66,hunt:90,break:70,pursuit:60,escape:75,serpent:150,ghost:150,swarm:76,treasure:45,illusion:45,puppet:180,ice:55,xuangu:180};
export const objectiveBonus=(b,l)=>goalGrowth(b)&&b.waveTime<=goalTimeLimits[b.encounter.kind]?Math.max(0,.25*b.node.xp-l.bonusCollected):0;
export const growthPerformance=l=>(l?.bonusCollected||0)+(l?.goalXP||0);
export const growthNodeXP=(options,chapter,node,original)=>options.growthVersion===4?(XP_V4[chapter]?.[node]??original):options.growthVersion===3?(XP_V3[chapter]?.[node]??original):original;
export const nodeGrowth=b=>revisedGrowth(b)&&b.mode!=='training';
export const emptyGrowth=()=>({firstOfferUsed:false,ledger:null,settlements:[]});
const EPS=1e-7;
const puppetKeys=new Set(['puppetDamage','puppetHaste','puppetPierce','puppetRange','stationary','puppetGuard','puppetSlow','puppetKnock','puppetShield','puppetMark']);
const insectKeys=new Set(['insectDamage','insectSpeed','insectBreak','insectBoss','insectHaste','insectMana']);
const caps={crit:.8,armorBreak:.24,slow:.65,puppetSlow:.65,puppetGuard:.3,dashGuard:.65,dashHaste:.65,thunderSave:17,killMana:.5,insectMana:1};
export function traitReadiness(t,b){
 const s=b.stats,pups=s.puppets||0,bugs=s.insects||0,activeBugs=Math.min(30,bugs+(s.breed?Math.min(6,Math.floor(b.kills/25)):0));
 const burning=(s.burn||0)>0,hasSigil=b.path===4&&b.rulesVersion>=2||s.dashFire>0;
 const reasonFor=key=>{
  if(['ward','deathFire','dashFire','thorns','breed','revive'].includes(key)&&(s[key]||0)>0)return '已经具备该独立效果';
  if(key==='mark'&&(s.mark||s.insectMark))return '剑击暴击已能产生印记';
  if(key==='thunderShield'&&(s.thunderShield||0)>=b.player.maxShield+25-EPS)return '单次神雷回盾已覆盖其可补充上限';
  if(key==='puppets'&&pups>=12&&!s.puppetShield&&!b.comboSet.has('puppetGuard'))return '常驻傀儡已达12具';
  if(key==='insects'&&activeBugs>=30&&(!s.insectGuard||Math.floor((bugs+(t.mods.insects||0))/4)===Math.floor(bugs/4)))return '协战虫数已达30只';
  if(key==='swordScale'&&b.level<12)return '需至少12把飞剑';
  if(key==='breed'&&activeBugs>=30)return '协战虫数已达30只';
  if(puppetKeys.has(key)&&pups<=0)return '需先取得常驻傀儡，临时备用傀儡不作为抽池前提';
  if(insectKeys.has(key)&&activeBugs<=0)return '需先有常驻或已孵化灵虫，临时诱饵不作为抽池前提';
  if(key==='insectGuard'&&bugs<4)return '需至少4只常驻灵虫，孵化与临时虫不计此护甲';
  if(key==='puppetMark'&&!s.mark&&!s.insectMark)return '需雷印或标猎产生印记';
  if(key==='insectMark'&&activeBugs<=0&&(s.mark||s.insectMark))return '当前没有虫群，且已能产生印记';
  if(key==='burnDamage'&&!burning&&!hasSigil)return '需先取得持续灼烧或采用符火加成的遁步符';
  if(['burnTime','deathFire','burnBonus','burnThunder'].includes(key)&&!burning)return '需先取得持续灼烧';
  if(key==='wardShield'&&(!s.ward||b.player.maxShield<=0))return '需减速阵与常驻护盾上限';
  if(key==='shieldRegen'&&b.player.maxShield<=0)return '需先取得常驻护盾上限';
  if(caps[key]!==undefined&&(s[key]||0)>=(key==='thunderSave'?thunderBaseCost(b)-8:caps[key])-EPS)return '该效果已达上限';
  return '';
 };
 if((b.traits[t.id]||0)>=t.max)return {eligible:false,reason:'已修持至上限'};
 const reasons=Object.keys(t.mods).map(reasonFor),eligible=reasons.some(r=>!r);
 return {eligible,reason:eligible?reasons.filter(Boolean).length?'部分效果需条件：'+[...new Set(reasons.filter(Boolean))].join('；'):t.id==='insect-9'&&activeBugs<=0?'本次先启用剑击暴击印记；虫群增伤需有灵虫':'' :[...new Set(reasons)].join('；')};
}
export function growthChoices(b){
 const pool=TRAITS.filter(t=>traitReadiness(t,b).eligible),picked=[];
 const pick=list=>{let value=b.rng()*list.reduce((n,t)=>n+(t.path===b.path?3:1),0);let i=0;for(;i<list.length-1;i++){value-=list[i].path===b.path?3:1;if(value<=0)break;}const t=list[i];pool.splice(pool.indexOf(t),1);picked.push(t);};
 if(!b.growth.firstOfferUsed){const own=pool.filter(t=>t.path===b.path);if(own.length)pick(own);}
 while(picked.length<3&&pool.length)pick(pool);
 return picked;
}
export function beginGrowthNode(b){
 if(!nodeGrowth(b))return;
 b.growth.ledger={node:b.node.id,loop:b.endlessLoop||0,startXP:b.totalXP,rawKillXP:0,baseAllocated:0,baseCollected:0,bonusAllocated:0,bonusCollected:0,completionXP:0,contractXP:0,...(goalGrowth(b)?{goalXP:0}:{}),settled:false,notified:false};
}
export function allocateKillXP(b,e,drop){
 const l=b.growth.ledger,X=b.node.xp;
 if(!l||l.settled||e.noDrop||e.mission==='rune'){drop.value=0;drop.xpBase=0;drop.xpBonus=0;return;}
 // Fixed at the death event, with a fixed extra weight for the three opening guide enemies.
 const unit=X/100*Math.max(1,e.cost)*(e.elite?3:1)*(e.introReward?3:1);
 l.rawKillXP+=unit;
 const base=Math.min(unit,Math.max(0,.72*X-l.baseAllocated));
 const budget=Math.min(.25*X,.2*Math.max(0,l.rawKillXP-.72*X)),bonus=Math.max(0,budget-l.bonusAllocated);
 l.baseAllocated+=base;l.bonusAllocated+=bonus;b.nodeDropXP=l.baseAllocated;
 drop.xpBase=base;drop.xpBonus=bonus;drop.value=base+bonus;
 if(!l.notified&&l.baseAllocated>=.72*X-EPS&&l.bonusAllocated>=.25*X-EPS){l.notified=true;b.toast('本节点经验奖励已全部取得 · 完成目标后继续前行');}
}
export function creditGrowthDrop(b,d){
 if(d.done)return;d.done=true;const l=b.growth.ledger;
 if(l&&!l.settled){l.baseCollected+=d.xpBase||0;l.bonusCollected+=d.xpBonus||0;}
 b.addXP(d.value);b.gold+=d.gold;if(d.heal)b.player.hp=Math.min(b.player.maxHp,b.player.hp+d.heal);
}
export function creditRuneXP(b,value){const l=b.growth.ledger;l.baseAllocated+=value;l.baseCollected+=value;b.nodeDropXP=l.baseAllocated;b.addXP(value);}
export function settleGrowthNode(b,contract){
 const l=b.growth.ledger;if(!l||l.settled)return;
 const id=(b.endlessLoop||0)+':'+b.node.id;if(b.growth.settlements.some(r=>r.id===id))return;
 if(goalGrowth(b))l.goalXP=objectiveBonus(b,l);
 l.completionXP=Math.max(0,b.node.xp-l.baseCollected);l.contractXP=contract;l.settled=true;
 b.growth.settlements.push({id,node:b.node.id,loop:b.endlessLoop||0,base:b.node.xp,bonus:growthPerformance(l),contract});
 b.addXP(l.completionXP+contract+(l.goalXP||0));
}
