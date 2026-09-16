/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {PATHS,TRAITS,RELICS} from './data.js';
import {cultivationMods} from './cultivation.js';
import {starterExtrasFor,swordPuppetInherit,phase4Options,BALANCE4} from './balance.js';
const percent=n=>'+'+Number((n*100).toFixed(3))+'%';
// Live combat uses the exact stat read by updateAllies. Codex reads the saved
// additive sources without restoring an engine or advancing any run state.
export function swordPuppetBonus(b){
 if(b.stats)return swordPuppetInherit(b,b.stats.damage||0);
 const path=b.options.path??0,mods=t=>phase4Options(b.options)&&BALANCE4.traitMods[t.id]||t.mods;
 const additive=(PATHS[path].perk.damage||0)+(starterExtrasFor(b.options,path).damage||0)+(cultivationMods(b.options,path).damage||0)
  +Object.entries(b.traits||{}).reduce((n,[id,count])=>{const t=TRAITS.find(t=>t.id===id);return n+(t?mods(t).damage||0:0)*count;},0)
  +(b.relics||[]).reduce((n,id)=>n+(RELICS.find(r=>r.id===id)?.mods.damage||0),0);
 return phase4Options(b.options)?Math.max(additive,BALANCE4.swordPuppetFloor):additive;
}
const count=(b,path)=>Object.keys(b.traits||{}).filter(id=>id.startsWith(path+'-')).length;
export function comboDescription(combo,b){
 if(!b)return combo.desc;
 if(combo.effect==='fireGuard')return phase4Options(b.options)?combo.desc+'；另固定提高护盾上限 '+BALANCE4.fireGuardShield+'（无需减速阵或生命恢复前提）':combo.desc;
 if(combo.effect!=='swordPuppet')return combo.desc;
 const active=count(b,'sword')>=3&&count(b,'puppet')>=3,floor=phase4Options(b.options)?'，平衡 4 最低按 '+percent(BALANCE4.swordPuppetFloor)+' 计':'';
 return '傀儡额外继承基础飞剑伤害加成（'+(active?'当前 '+percent(swordPuppetBonus(b)):'本局未成型；按当前配置成型后 '+percent(swordPuppetBonus(b)))+floor+'；不含群锋及条件增伤）。';
}
export function traitComboBenefit(trait,b){
 if(!trait||b.traits[trait.id]||![0,2].includes(trait.path))return '';
 const swords=count(b,'sword'),puppets=count(b,'puppet');
 if(swords>=3&&puppets>=3||swords+(trait.path===0?1:0)<3||puppets+(trait.path===2?1:0)<3)return '';
 const after=(b.stats?.damage||0)+(trait.mods.damage||0),inherit=phase4Options(b.options)?Math.max(after,BALANCE4.swordPuppetFloor):after;
 return '本次形成百刃齐发：每箭因本联动额外 '+percent(inherit)+'；仅继承基础飞剑伤害加成，不含群锋及条件增伤'+(phase4Options(b.options)?'，平衡 4 最低按 '+percent(BALANCE4.swordPuppetFloor)+' 计':'')+'。';
}
