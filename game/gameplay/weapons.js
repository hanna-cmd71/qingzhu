/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Weapon methods (御剑法门): the same seventy-two swords dispatched differently. This layer is
// independent from expedition routes, cultivation, economy and save format. A run without the
// marker keeps the original sword and the original level relation.
export const WEAPON_VERSION=1;
export const DEFAULT_WEAPON='array';
export const WEAPONS=[
 {id:DEFAULT_WEAPON,name:'剑阵调度',desc:'七十二剑分组追击；现有调度方式。',mods:{},swordCap:null,source:'剑阵调度 · 非新增器物'},
 // The three methods below are candidates awaiting the author's adoption; none is obtainable until
 // WP5 wires an acquisition path. All of them tune parameters only: none takes over the attack form.
 {id:'heavy',name:'重锋',desc:'剑阵减半，单剑更重、出击更慢。',mods:{damage:.35,haste:-.1},swordCap:36,source:'御剑法门 · 数值为游戏化设定'},
 {id:'flow',name:'流刃',desc:'单剑较轻，但出击与往复更快。',mods:{damage:-.18,haste:.25,swordSpeed:.2},swordCap:null,source:'御剑法门 · 数值为游戏化设定'},
 {id:'pierce',name:'贯脉',desc:'额外穿透一名敌人，索敌更远，单剑略轻。',mods:{pierce:1,damage:-.12,range:.15},swordCap:null,source:'御剑法门 · 数值为游戏化设定'},
];
export const weaponIds=WEAPONS.map(w=>w.id);
export const weaponById=id=>WEAPONS.find(w=>w.id===id)||WEAPONS[0];
export const weaponDeclared=(options={})=>(options.weaponVersion??0)>=1;
// The sword total is canonical: a method may thin the array but never exceed seventy-two, and it
// never grants more swords than the level curve has already earned.
export const weaponSwordCap=options=>weaponDeclared(options)?weaponById(options.weapon).swordCap:null;
export const weaponMods=options=>weaponDeclared(options)?weaponById(options.weapon).mods:{};
// Item text is derived from the same modifiers the engine reads, so the panel can never drift from
// the numbers that actually apply.
export function weaponEffectText(weapon=weaponById(DEFAULT_WEAPON)){
 const parts=[];
 if(weapon.swordCap)parts.push('剑数上限 '+weapon.swordCap);
 for(const [key,label] of [['damage','剑伤'],['haste','攻速'],['swordSpeed','剑速'],['range','索敌']])if(weapon.mods[key])parts.push(label+' '+(weapon.mods[key]>0?'+':'')+Math.round(weapon.mods[key]*100)+'%');
 if(weapon.mods.pierce)parts.push('穿透 +'+weapon.mods.pierce);
 return parts.join(' · ')||'维持现有调度';
}

// --- Flying-sword appearances -------------------------------------------------------------
// The weapon atlas holds four columns, one sword look each. Every method points at its own column,
// so switching methods changes the sword by default; an account-level pick can override that look
// without entering the run snapshot, exactly like a costume.
export const WEAPON_CELL={[DEFAULT_WEAPON]:0,heavy:1,flow:2,pierce:3};
export const WEAPON_SKINS=[
 {id:'jade',name:'青竹',desc:'青碧细直双刃剑，剑阵原色。',cell:0},
 {id:'crimson',name:'赤锋',desc:'赤红阔刃重剑，锋锐沉重。',cell:1},
 {id:'azure',name:'霜刃',desc:'霜蓝曲刃软剑，轻灵迅捷。',cell:2},
 {id:'violet',name:'紫电',desc:'紫电细长刺剑，贯脉远击。',cell:3},
];
export const weaponSkinIds=WEAPON_SKINS.map(s=>s.id);
export const weaponSkinById=id=>WEAPON_SKINS.find(s=>s.id===id)||null;
// null means "follow the equipped method"; an unknown id falls back to the method too.
export const normalizeWeaponSkin=id=>weaponSkinIds.includes(id)?id:null;
// Column the renderer should read: a chosen skin wins, otherwise the method's own look.
export function weaponCellFor(options={},skinId=null){
 const skin=weaponSkinById(skinId);
 if(skin)return skin.cell;
 return WEAPON_CELL[weaponById(options.weapon).id]??0;
}

