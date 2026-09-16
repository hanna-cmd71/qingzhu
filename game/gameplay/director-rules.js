/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {ENEMIES} from './data.js';
import {RANGED_ENEMIES} from './content-rules.js';
export const ENCOUNTER_VERSION=8;
// Encounter 7 retains encounter 6 pressure; only illusion returns add protection.
// Encounter 8 keeps 7 entirely; batch A added one checkpoint when mechanism reinforcements stop
// and let a capped elite timer keep advancing. Batch B extends encounter 8 with numbers (defend plate HP,
// serpent HP, mechanism difficulty tiers) that only balance-4 runs read: an encounter-8 run started on the
// batch-A build (balance 3) keeps the batch-A numbers exactly, and encounter 1–7 keep their own literals.
export const latePressure=b=>b.rulesVersion===3&&[5,6,7,8].includes(b.options.encounterVersion)&&b.mode!=='training'&&b.chapter>=2;
export const clearingCheckpoint=b=>b.rulesVersion===3&&b.options.encounterVersion>=8;
export const extendedEncounter=b=>b.rulesVersion===3&&b.options.encounterVersion>=8&&b.options.balanceVersion>=4;
export const mechanismPressure=b=>latePressure(b)&&['treasure','illusion','ice'].includes(b.encounter.kind);
// Encounter-8 (batch B) table. The isolated experiment simulator may overwrite entries in-process; the shipped game uses these values.
export const ENCOUNTER8={
 defend:{base:450,perChapter:60,difficultyScale:false,lockHalf:false}, // plate HP 450+60c (was 360+35c), adopted; ×difficulty.damage and the 1/2 lock ratio were tested and not adopted
 bossHP:{serpent:9000,ghost:19000,puppet:80000,xuangu:100000},          // serpent 9000→8000 was tested and not adopted
 serpentHardScale:1.05,                                                 // adopted: on 险境 the chapter-1 serpent uses ×1.05 instead of the difficulty's ×1.2
 mechanism:{rates:{treasure:6.8,illusion:6,ice:5.6},rateScale:[.5,1,1],opening:[4,10,10],firstElite:[15,10,10],eliteInterval:20,eliteLimit:2,limits:[18,26,34],flatPressure:false} // adopted: only 初入仙途 is eased (rate ×0.5, opening 4, first elite 15s); 标准/险境 keep profile 6 including the 20/40-second rate pressure
};
const MECHANISM_PROFILES={
 5:{rates:{treasure:3.4,illusion:3.4,ice:3.2},opening:6,firstElite:18,eliteInterval:35,eliteLimit:1,limits:[12,18,24]},
 6:{rates:{treasure:6.8,illusion:6,ice:5.6},opening:10,firstElite:10,eliteInterval:20,eliteLimit:2,limits:[18,26,34]},
 // 8 (balance-4 runs only): difficulty-tiered rate/opening/first elite, no 20/40-second rate pressure; limits and stop times unchanged.
 8:b=>{const m=ENCOUNTER8.mechanism,d=b.options.difficulty||0,scale=m.rateScale?.[d]??1;return {rates:Object.fromEntries(Object.entries(m.rates).map(([k,v])=>[k,v*scale])),opening:Array.isArray(m.opening)?m.opening[d]:m.opening,firstElite:Array.isArray(m.firstElite)?m.firstElite[d]:m.firstElite,eliteInterval:m.eliteInterval,eliteLimit:m.eliteLimit,limits:m.limits,flatPressure:!!m.flatPressure};}
};
export const mechanismProfile=b=>extendedEncounter(b)?MECHANISM_PROFILES[8](b):MECHANISM_PROFILES[b.options.encounterVersion>=7?6:b.options.encounterVersion]||MECHANISM_PROFILES[5];
export const mechanismLimit=b=>mechanismProfile(b).limits[b.options.difficulty||0];
export const defendHP=b=>extendedEncounter(b)?(ENCOUNTER8.defend.base+b.chapter*ENCOUNTER8.defend.perChapter)*(ENCOUNTER8.defend.difficultyScale?b.difficulty.damage:1):360+b.chapter*35;
export const defendLocked=(b,e)=>extendedEncounter(b)&&ENCOUNTER8.defend.lockHalf?e.id%2===1:e.id%3!==0;
export const bossHP=(b,kind)=>{if(!extendedEncounter(b))return {serpent:9000,ghost:19000,puppet:80000,xuangu:100000}[kind]*b.difficulty.hp;const hard=kind==='serpent'&&(b.options.difficulty||0)===2&&ENCOUNTER8.serpentHardScale;return ENCOUNTER8.bossHP[kind]*b.difficulty.hp*(hard?ENCOUNTER8.serpentHardScale/1.2:1);};
export const mechanismDeadline=b=>b.encounter.kind==='ice'?40:65;
export const mechanismClearing=b=>mechanismPressure(b)&&b.waveTime>=mechanismDeadline(b);
export const WAITING_KINDS=['escape','break','hunt','pursuit'];
export const revisedDirector=b=>b.rulesVersion===3&&b.options.contentVersion===3&&b.mode!=='training';
export const finitePursuit=b=>b.rulesVersion===3&&b.options.encounterVersion>=2&&b.mode!=='training'&&WAITING_KINDS.includes(b.encounter.kind);
export const pursuitDeadline=e=>Number.isFinite(e.seconds)&&e.seconds>0?Math.max(120,2*e.seconds):120;
export const ordinaryCount=b=>b.enemies.filter(e=>e.hp>0&&!e.mission&&!e.boss).length;
export const ordinaryLimit=b=>[35,50,65][b.options.difficulty||0];
export const clearing=b=>finitePursuit(b)&&!!b.pursuitState&&b.waveTime>=b.pursuitState.deadline;
export function beginDirectorNode(b){
 b.directorState=revisedDirector(b)?{node:b.node.id,loop:b.endlessLoop||0,pendingType:null}:null;
 b.pursuitState=finitePursuit(b)?{node:b.node.id,loop:b.endlessLoop||0,deadline:pursuitDeadline(b.encounter),phase:'pursuit'}:null;
}
export function updatePursuit(b){
 if(!finitePursuit(b)||!b.pursuitState)return;
 if(clearing(b)){if(b.pursuitState.phase!=='clearing'){b.pursuitState.phase='clearing';b.phaseCheckpointPending=true;b.toast('追兵已尽 · 完成当前目标后离开');}b.spawnBudget=0;if(b.directorState)b.directorState.pendingType=null;}
}
export function budgetSpawns(b,rate,dt,limit,options){
 const full=()=>finitePursuit(b)?ordinaryCount(b)>=ordinaryLimit(b):b.enemies.filter(e=>e.hp>0).length>=limit;
 const maxBudget=10;
 if(full()){b.spawnBudget=Math.min(b.spawnBudget,5);return;}
 b.spawnBudget=Math.min(maxBudget,b.spawnBudget+rate*dt);
 const ranged=()=>b.enemies.filter(e=>e.hp>0&&RANGED_ENEMIES.includes(e.ai)).length>=Math.min(10,Math.max(3,b.enemies.filter(e=>e.hp>0).length*.25));
 const state=b.directorState;
 for(let count=0;count<4&&!full();count++){
  const pool=(b.encounter.kind==='swarm'?[6,21]:b.enemyPool()).filter(i=>!ranged()||!RANGED_ENEMIES.includes(ENEMIES[i].ai));if(!pool.length)return;
  if(state.pendingType===null||!pool.includes(state.pendingType))state.pendingType=b.encounter.kind==='swarm'?(b.rng()<.7?6:21):pool[Math.floor(b.rng()*pool.length)];
  const cost=Math.max(1,ENEMIES[state.pendingType].cost);if(b.spawnBudget+1e-8<cost)return;
  const e=b.spawn(state.pendingType,options());if(!e)return;b.spawnBudget=Math.max(0,b.spawnBudget-cost);state.pendingType=null;
 }
}
