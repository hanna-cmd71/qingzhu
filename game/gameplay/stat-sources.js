/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {PATHS,TRAITS,RELICS} from './data.js';
import {cultivationMods} from './cultivation.js';
import {starterExtras,reserveFor,traitMods,levelHpBonus,fireGuardShield} from './balance.js';
export {STARTER_EXTRAS} from './balance.js';
const sum=(out,mods,factor=1)=>{for(const [k,v] of Object.entries(mods||{}))out[k]=(out[k]||0)+v*factor;return out;};
export function statSources(b){
 const traits={},equipment={};for(const [id,n] of Object.entries(b.traits)){const t=TRAITS.find(t=>t.id===id);sum(traits,t?traitMods(b,t):undefined,n);}for(const id of b.relics)sum(equipment,RELICS.find(r=>r.id===id)?.mods);
 const oldHp=(b.options.metaRulesVersion<2?b.options.meta||[]:[]).filter(id=>id.endsWith('-meta-2')).length*2;
 const rows=[{name:'基础与起手',mods:{hp:100,reserve:reserveFor(b),...PATHS[b.path].perk}},{name:'起手规则额外值',mods:starterExtras(b)},{name:'出发修持',mods:{...cultivationMods(b.options,b.path),...(oldHp?{hp:oldHp}:{})}},{name:'悟道与章节预置',mods:traits},{name:'装备',mods:equipment}];
 // Attribute nonlinear conversions to their actual conditions, separate from source additions.
 const derived={};if(b.comboSet.has('puppetInsect'))sum(derived,{puppets:1,insects:1});if(b.comboSet.has('puppetGuard'))derived.armor=(b.stats.puppets||0)*3;
 derived.armor=(derived.armor||0)+Math.floor((b.stats.insects||0)/4)*(b.stats.insectGuard||0);derived.shield=(b.stats.puppets||0)*(b.stats.puppetShield||0)+fireGuardShield(b);const levelHp=levelHpBonus(b);if(levelHp)derived.hp=levelHp;rows.push({name:'联动与数量换算',mods:derived});
 const keys=['hp','shield','armor','reserve','shieldRegen','puppets','insects'];return {rows,totals:Object.fromEntries(keys.map(k=>[k,rows.reduce((n,r)=>n+(r.mods[k]||0),0)])),keys};
}
