/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {EXPEDITIONS,ENCOUNTERS,SPECIALS} from './expedition-data.js';
import {seeded,hashSeed} from './data.js';
import {growthNodeXP} from './growth-rules.js';
import {pacedEncounter} from './pacing-rules.js';
// Frozen original generator, including all draws even at non-fork nodes.
export function legacyRoutes(options,contentRng){return EXPEDITIONS.map((ch,c)=>ch.xp.map((xp,n)=>{
 const fork=ch.forks.includes(n);let choices;if(n<ch.ordinary){const a=c===0&&n===0?0:Math.floor(contentRng()*18);let z=(a+3+Math.floor(contentRng()*12))%18;if(Math.floor(z/3)===Math.floor(a/3))z=(z+3)%18;choices=[{...ENCOUNTERS[a],risk:false}];if(fork)choices.push({...ENCOUNTERS[z],risk:true,contract:['hits','thunder','time'][Math.floor(contentRng()*3)]});}else choices=[{...pacedEncounter(SPECIALS[ch.special[n-ch.ordinary]],options),risk:false,special:true}];
 return {id:c+':'+n,xp:growthNodeXP(options,c,n,xp),gold:ch.gold[n],choices,selected:fork?null:0};
}));}
export const plannedRoutes=b=>b.rulesVersion===3&&[4,5,6,7,8].includes(b.options.encounterVersion);
export function createRoutes(options,seed,contentRng){
 const routes=legacyRoutes(options,contentRng);if(![4,5,6,7,8].includes(options.encounterVersion))return routes;
 // Route diversity consumes its own domain; chain/event RNG keeps the frozen draw count.
 const rng=seeded(hashSeed(seed+':route-plan:v4')),used=new Map();let previous=[];
 const pick=pool=>{const min=Math.min(...pool.map(e=>used.get(e.id)||0)),fresh=pool.filter(e=>(used.get(e.id)||0)===min),e=fresh[Math.floor(rng()*fresh.length)];used.set(e.id,(used.get(e.id)||0)+1);return e;};
 for(const [c,ch]of routes.entries())for(const [n,node]of ch.entries()){
  if(n>=EXPEDITIONS[c].ordinary)continue;
  const pool=ENCOUNTERS.filter(e=>!previous.includes(e.id));const a=pick(c===0&&n===0?pool.filter(e=>e.kind==='survival'):pool);
  const choices=[{...a,risk:false}];if(node.choices.length===2){const z=pick(pool.filter(e=>e.family!==a.family));choices.push({...z,risk:true,contract:['hits','thunder','time'][Math.floor(rng()*3)]});}node.choices=choices;previous=choices.map(e=>e.id);
 }
 return routes;
}
export function serializeRoutePlan(b){return {schema:1,chapters:b.routes.map(ch=>ch.map(n=>({id:n.id,selected:n.selected,choices:n.choices.map(e=>({id:e.id||e.kind,risk:e.risk,special:e.special===true,contract:e.contract??null}))}))) };}
export function restoreRoutePlan(b,ex){
 const fail=()=>{throw Error('完整路线计划无效或与选择不一致，原记录未被修改');};
 if(!plannedRoutes(b)){if(ex.routePlan!==undefined)fail();return;}
 const p=ex.routePlan;if(!p||Object.keys(p).sort().join()!=='chapters,schema'||p.schema!==1||!Array.isArray(p.chapters)||p.chapters.length!==6||!Array.isArray(ex.routes)||ex.routes.length!==6)fail();
 let previous=[];
 b.routes=p.chapters.map((ch,c)=>{const spec=EXPEDITIONS[c];if(!Array.isArray(ch)||ch.length!==spec.xp.length||!Array.isArray(ex.routes[c])||ex.routes[c].length!==ch.length)fail();return ch.map((n,i)=>{
  const fork=spec.forks.includes(i),ordinary=i<spec.ordinary;if(!n||Object.keys(n).sort().join()!=='choices,id,selected'||n.id!==c+':'+i||!Array.isArray(n.choices)||n.choices.length!==(fork?2:1)||n.selected!==ex.routes[c][i]||!(n.selected===null&&fork)&&(!Number.isInteger(n.selected)||!n.choices[n.selected]))fail();
  const ids=new Set();const choices=n.choices.map((e,j)=>{if(!e||Object.keys(e).sort().join()!=='contract,id,risk,special'||e.risk!==(j===1)||e.special!==!ordinary||(j===1?!['hits','thunder','time'].includes(e.contract):e.contract!==null)||ids.has(e.id))fail();ids.add(e.id);
   const source=ordinary?ENCOUNTERS.find(v=>v.id===e.id):SPECIALS[spec.special[i-spec.ordinary]];if(!source||(!ordinary&&e.id!==source.kind)||ordinary&&previous.includes(e.id)||c===0&&i===0&&source.kind!=='survival')fail();return {...pacedEncounter(source,b.options),risk:e.risk,...(e.special?{special:true}:{}),...(e.contract?{contract:e.contract}:{})};
  });if(ordinary){if(choices.length===2&&choices[0].family===choices[1].family)fail();previous=choices.map(e=>e.id);}
  return {id:n.id,xp:growthNodeXP(b.options,c,i,spec.xp[i]),gold:spec.gold[i],choices,selected:n.selected};
 });});
}
