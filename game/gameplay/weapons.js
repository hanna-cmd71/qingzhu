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
