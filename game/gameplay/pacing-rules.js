/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {seeded,hashSeed} from './data.js';
import {extendedEncounter} from './director-rules.js';
// Fixed node timers (seconds). The expedition engine reads these for survival/defend completion, the swarm timer and the ice retreat,
// and the result page reads the same values to show the fixed-timer floor of a run (round-2 C-5). Values unchanged.
export const FIXED_NODE_SECONDS={survival:65,defend:65,swarm:75,ice:40};
export const revisedPacing=b=>b.rulesVersion===3&&[3,4,5,6,7,8].includes(b.options.encounterVersion);
export const treasureStepSeconds=b=>revisedPacing(b)?10:14;
export const illusionFirstWait=b=>revisedPacing(b)?7:10;
// Round-2 C-8: illusion true-gate order. Encounter 8 + balance 4 runs derive a per-node permutation from the route-plan seed domain
// (a sub-domain keyed by node id: no draw is taken from the route generator or the battle RNG). Older runs and every saved objective
// keep the fixed chapter%3 → +1 → +2 order; a saved objective without gateOrder restores unchanged.
export const seededIllusionGates=b=>extendedEncounter(b)&&typeof b.seed==='string';
export function illusionGateOrder(b,node=b.node?.id){const rng=seeded(hashSeed(b.seed+':route-plan:v4:illusion:'+node)),order=[0,1,2];for(let i=2;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}return order;}
export const illusionTrueGate=q=>Array.isArray(q.gateOrder)?q.gateOrder[Math.min(2,q.done)]:(q.trueGate+1)%3;
export function pacedEncounter(e,options){
 if(![3,4,5,6,7,8].includes(options.encounterVersion))return e;
 const pressure=[5,6,7,8].includes(options.encounterVersion);
 if(e.kind==='treasure')return {...e,seconds:30,goal:pressure?'应对追兵，依次在三处阵位各累计敛息10秒；离圈保留进度，65秒后停止增援':'依次进入三处敛息阵位，各累计10秒；阵位完成后沿提示转移'};
 if(e.kind==='illusion')return {...e,seconds:27,goal:pressure?'迎击追兵并辨认「真」字与双环；首次7秒开放，共辨真三次，65秒后停止增援':'辨认「真」字与双环，首次7秒后开放，后续沿原节律推进，共辨真三次'};
 if(pressure&&e.kind==='ice')return {...e,goal:'迎击追兵、避开中央冰焰；40秒后停止增援并抵达右侧退路，雷源不刷新'};
 return e;
}
export function validatePacing(data,b){
 if(!revisedPacing(b))return;const ex=data.expedition,q=ex.objective,m=ex.mechanism,fail=()=>{throw Error('章节节奏记录无效，原记录未被修改');};
 if(['treasure','illusion','ice'].includes(q?.kind)){if(b.options.encounterVersion>=8){if(typeof q.clearingSaved!=='boolean'||q.clearingSaved&&ex.waveTime<(q.kind==='ice'?40:65)-1e-6)fail();}else if(q.clearingSaved!==undefined)fail();}
 if(q?.kind==='treasure'){if(!m||m.goal!==30||!Number.isFinite(m.progress)||m.progress<0||m.progress>30||!Number.isInteger(m.step)||m.step<0||m.step>2||m.step!==Math.min(2,Math.floor(m.progress/10)))fail();}
 if(q?.kind==='illusion'){if(b.options.encounterVersion>=7&&(!Number.isFinite(q.returnProtectedUntil)||q.returnProtectedUntil<0||q.returnProtectedUntil>data.time+.45+1e-6))fail();if(!Number.isFinite(q.next)||q.next<7+q.done*10||q.next>Math.max(7,ex.waveTime+10)+1e-6||q.cool<0||q.cool>2||q.done===0&&q.next!==7)fail();if(q.gateOrder!==undefined&&(!extendedEncounter(b)||!Array.isArray(q.gateOrder)||q.gateOrder.length!==3||[...q.gateOrder].sort((a,z)=>a-z).join()!=='0,1,2'||q.done<3&&q.trueGate!==q.gateOrder[q.done]))fail();}
}
