import {ENEMIES} from './data.js';
import {RANGED_ENEMIES} from './content-rules.js';
export const ENCOUNTER_VERSION=8;
// Encounter 7 retains encounter 6 pressure; only illusion returns add protection.
// Encounter 8 keeps 7 entirely; it only adds one checkpoint when mechanism reinforcements stop
// and lets a capped elite timer keep advancing. No spawn rate, limit or timer changes.
export const latePressure=b=>b.rulesVersion===3&&[5,6,7,8].includes(b.options.encounterVersion)&&b.mode!=='training'&&b.chapter>=2;
export const clearingCheckpoint=b=>b.rulesVersion===3&&b.options.encounterVersion>=8;
export const mechanismPressure=b=>latePressure(b)&&['treasure','illusion','ice'].includes(b.encounter.kind);
const MECHANISM_PROFILES={
 5:{rates:{treasure:3.4,illusion:3.4,ice:3.2},opening:6,firstElite:18,eliteInterval:35,eliteLimit:1,limits:[12,18,24]},
 6:{rates:{treasure:6.8,illusion:6,ice:5.6},opening:10,firstElite:10,eliteInterval:20,eliteLimit:2,limits:[18,26,34]}
};
export const mechanismProfile=b=>MECHANISM_PROFILES[b.options.encounterVersion>=7?6:b.options.encounterVersion]||MECHANISM_PROFILES[5];
export const mechanismLimit=b=>mechanismProfile(b).limits[b.options.difficulty||0];
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
