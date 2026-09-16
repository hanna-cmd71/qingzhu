/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Round-2 batch C-5: read-only presentation of a finished run's net battle time.
// Nothing here mutates the run, the record state or the records book; the grouping key and records schema 1 are untouched
// (seed grouping stays deferred). Every second quoted below is read from the same functions the expedition engine uses.
import {FIXED_NODE_SECONDS,treasureStepSeconds,illusionFirstWait} from './pacing-rules.js';
// Two gates follow the first wait, each at least 10 s later (objective.next = max(next + 10, waveTime + 2)).
export const ILLUSION_EXTRA_GATES=2,ILLUSION_GATE_GAP=10;
// A node whose completion is gated by a timer the player cannot beat: the floor below is the fastest possible clear.
export function fixedNodeSeconds(b,kind){
 switch(kind){
  case 'survival':return FIXED_NODE_SECONDS.survival;
  case 'defend':return FIXED_NODE_SECONDS.defend;
  case 'swarm':return FIXED_NODE_SECONDS.swarm;
  case 'ice':return FIXED_NODE_SECONDS.ice;
  case 'treasure':return treasureStepSeconds(b)*3;
  case 'illusion':return illusionFirstWait(b)+ILLUSION_EXTRA_GATES*ILLUSION_GATE_GAP;
  default:return 0;
 }
}
export const FIXED_KINDS=['survival','defend','swarm','ice','treasure','illusion'];
// Completed nodes of the current loop only: Expedition.nextChapter() clears receipts when an endless loop rolls over.
export function fixedTimeFloor(b){
 if(!b?.isExpedition||!Array.isArray(b.receipts)||!Array.isArray(b.routes))return null;
 const nodes=[];
 for(const chapter of b.routes)for(const node of chapter){
  if(!b.receipts.includes(node.id))continue;
  const encounter=node.choices?.[node.selected??0];const seconds=encounter?fixedNodeSeconds(b,encounter.kind):0;
  if(seconds>0)nodes.push({id:node.id,kind:encounter.kind,name:encounter.name,seconds});
 }
 return {nodes,seconds:nodes.reduce((sum,n)=>sum+n.seconds,0),ms:Math.round(nodes.reduce((sum,n)=>sum+n.seconds,0)*1000)};
}
// Net battle time of one endless loop, summed from the real chapter splits of that loop (the ranked entry keeps using the
// cumulative lastLoopMs, so no records field changes meaning).
export function loopBattleMs(splits,loop){
 if(!Array.isArray(splits))return null;
 const rows=splits.filter(r=>(r.loop||0)===loop);
 return rows.length?rows.reduce((sum,r)=>sum+r.durationMs,0):null;
}
// Display tolerance: two times that render identically at 0.1 s resolution are reported as the same, not as a gap.
export const SAME_TIME_MS=100;
export const sameDisplayedTime=delta=>Number.isFinite(delta)&&Math.abs(delta)<SAME_TIME_MS;
export function netTimeParts(b,battleMs){
 const floor=fixedTimeFloor(b);
 if(floor===null||!Number.isFinite(battleMs))return null;
 return {battleMs,fixedMs:floor.ms,freeMs:Math.max(0,battleMs-floor.ms),nodes:floor.nodes};
}
export function fixedFloorSummary(floor){
 if(!floor?.nodes.length)return '';
 const counts=new Map();
 for(const n of floor.nodes){const key=n.name||n.kind;counts.set(key,(counts.get(key)||0)+1);}
 return [...counts].map(([name,count])=>name+(count>1?' ×'+count:'')).join('、');
}
