/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Independent from expedition routes, cultivation purchases and save format.
// Missing markers in saved runs always mean the original balance.
// Balance 4 (round-2 batch B) reads every changed number through the functions below; balance 1–3
// keep their original literals in the old branches, so a restored run never changes.
export const BALANCE_VERSION=4;
export const revisedBalance=b=>b.rulesVersion===3&&b.options.balanceVersion>=2;
// Balance 4 inherits every phase-3 mechanic (thunder base 22, fixed sigil fuse, guard window, setup linger, sigil volume intersection).
export const phase3Balance=b=>b.rulesVersion===3&&b.options.balanceVersion>=3;
export const phase4Balance=b=>b.rulesVersion===3&&b.options.balanceVersion===4;
export const phase4Options=(options={})=>(options.rulesVersion??3)===3&&(options.balanceVersion??BALANCE_VERSION)===4;
// Balance-4 table. Only balance-4 runs read it. The isolated experiment simulator overwrites entries in-process
// for candidate matrices (never persisted); the shipped game uses the adopted values below.
export const BALANCE4={
 dashCooldown:{4:2.4},            // path → base dash cooldown; other paths keep 3 (guard keeps 2)
 sigilCooldown:4.5,               // talisman starter sigil independent cooldown (was 6)
 sigilGrowthRate:.07,             // sigilGrowth = 1 + rate × min(72, level); null keeps the phase-3 curve 1 + .08 × max(0, min(72,L) − 12)
 sigilWarn:1.8,                   // starter sigil fuse (was 2.4)
 starterExtras:{1:{reserve:30}},   // path → replacement extras; sword pierce +1 and talisman slow +6% were tested and not adopted
 reserveBonus:{},                 // path → [d0,d1,d2] extra base reserve (none adopted)
 reserveRest:20,                  // thunder rest refill base (was 15)
 traitMods:{'thunder-1':{thunderDamage:.4},'thunder-2':{thunderSave:4},'puppet-9':{puppetSlow:.15,puppetDamage:.05}},
 traitText:{'thunder-1':'神雷伤害 +40%','thunder-2':'神雷每次雷源消耗 −4','thunder-4':'神雷后飞剑强化 7 秒','puppet-9':'弩矢命中减速 15% 且伤害 +5%'},
 afterThunderWindow:7,            // seconds of post-thunder sword bonus for the thunder starter and 余电 (was 5)
 enemyDamagePerChapter:.10,       // e.dmg = base × (1 + chapter × this) × difficulty (was .13)
 hpPerEightLevels:4,              // max HP +4 per 8 levels (L80 → +40), B-5 candidate 2, adopted
 allyBase:{puppet:.9,insect:.85}, // starter ally base scale (was .72 / .68)
 insectLeash:null,                // B-8 leash distance; every tested value (400/550, with or without focus-first) lowered insect clears, so not adopted (null = original 250/350 search)
 insectFocusFirst:false,          // B-8 focus-first search around Han Li while focusing; tested and not adopted
 guardCounter:.8,                 // guard counter damage scale (was .5)
 swordPuppetFloor:.10,            // 百刃齐发 inherits max(stats.damage, floor)
 fireGuardShield:8,               // 镇阵守元: flat max-shield bonus without any prerequisite
};
export const dashCooldown=b=>Math.max(.9,(revisedBalance(b)&&b.path===5?2:phase4Balance(b)&&BALANCE4.dashCooldown[b.path]!==undefined?BALANCE4.dashCooldown[b.path]:3)*(1-Math.min(.65,b.stats.dashHaste||0)));
export const sigilCooldown=b=>(phase4Balance(b)&&b.path===4?BALANCE4.sigilCooldown:6)-(b.stats.metaSigilCooldown||0);
export const thunderBaseCost=b=>phase3Balance(b)&&b.path===1?22:25;
export const thunderCost=b=>Math.max(8,thunderBaseCost(b)-(b.stats.thunderSave||0))+(b.extraThunderCost?.()||0);
export const hasReserveRest=b=>revisedBalance(b)&&b.path===1&&b.chapter<5&&b.wave<b.routes[b.chapter].length-1&&!['treasure','illusion'].includes(b.encounter.kind);
export const reserveRestBase=b=>phase4Balance(b)?BALANCE4.reserveRest:15;
export const reserveRestoration=b=>hasReserveRest(b)?Math.min(reserveRestBase(b)+(b.stats.metaReserveRest||0),b.player.maxReserve-b.player.reserve):0;
export const puppetReady=b=>b.stillTime>=.6||phase3Balance(b)&&b.time<(b.setupUntil??-1);
export const stationaryActive=b=>!b.player.moving||phase3Balance(b)&&!b.hasCore?.('K06')&&b.time<(b.setupUntil??-1);
export const sigilGrowth=b=>phase4Balance(b)&&BALANCE4.sigilGrowthRate!==null?1+BALANCE4.sigilGrowthRate*Math.min(72,b.level):phase3Balance(b)?1+.08*Math.max(0,Math.min(72,b.level)-12):1;
export const sigilWarn=b=>phase4Balance(b)?BALANCE4.sigilWarn:2.4;
export const sigilArming=b=>Math.max(.1,(b.stats.dashFire?.2:.35)-(b.stats.metaSigilArming||0));
export const sigilPairFuse=b=>Math.max(.1,.8-(b.stats.metaSigilArming||0));
// The same circle intersection is used by trigger, damage and blocked-hit feedback.
export const sigilTargets=(b,z)=>b.enemies.filter(e=>e.hp>0&&(e.x-z.x)**2+(e.y-z.y)**2<=(z.r+(phase3Balance(b)?e.r:0))**2);
// Starter extras: rules 2/3 read the shared table; balance 4 replaces a path's entry with its own values.
export const STARTER_EXTRAS=[{},{reserve:20},{puppets:1},{insects:2},{},{shield:10,shieldRegen:2}];
export const starterExtrasFor=(options,path)=>(options.rulesVersion??1)>=2?(phase4Options(options)&&BALANCE4.starterExtras[path])||STARTER_EXTRAS[path]:{};
export const starterExtras=b=>starterExtrasFor({...b.options,rulesVersion:b.rulesVersion},b.path);
export const reserveFor=b=>b.difficulty.reserve+(phase4Balance(b)?(BALANCE4.reserveBonus[b.path]?.[b.options.difficulty||0]||0):0);
export const traitMods=(b,trait)=>phase4Balance(b)&&BALANCE4.traitMods[trait.id]||trait.mods;
export const traitText=(b,trait)=>phase4Balance(b)&&BALANCE4.traitText[trait.id]||trait.desc;
export const afterThunderWindow=b=>phase4Balance(b)?BALANCE4.afterThunderWindow:5;
export const enemyDamageScale=b=>1+b.chapter*(phase4Balance(b)?BALANCE4.enemyDamagePerChapter:.13);
export const levelHpBonus=b=>phase4Balance(b)&&BALANCE4.hpPerEightLevels?Math.floor(b.level/8)*BALANCE4.hpPerEightLevels:0;
// Sword count is configuration driven with a level fallback: a weapon method may declare
// options.swordCount, while a run without that declaration keeps the original min(72, level)
// relation, so restored 1.0 runs are unaffected. Level-derived damage still reads the level.
export const MAX_SWORDS=72;
export const swordCountFor=(level,options)=>Number.isFinite(options?.swordCount)?Math.max(1,Math.min(MAX_SWORDS,Math.round(options.swordCount))):Math.min(MAX_SWORDS,level);
export const allyBaseScale=(b,kind)=>b.rulesVersion>=2&&b.path===(kind==='puppet'?2:3)?(phase4Balance(b)?BALANCE4.allyBase[kind]:kind==='puppet'?.72:.68)*(1+Math.floor(Math.min(72,b.level)/12)*.2):1;
export const insectLeash=b=>phase4Balance(b)&&BALANCE4.insectLeash!==null?BALANCE4.insectLeash:Infinity;
export const insectFocusFirst=b=>phase4Balance(b)&&BALANCE4.insectFocusFirst===true;
export const guardCounterScale=b=>phase4Balance(b)?BALANCE4.guardCounter:phase3Balance(b)?.5:1;
export const swordPuppetInherit=(b,damage)=>phase4Balance(b)?Math.max(damage||0,BALANCE4.swordPuppetFloor):damage||0;
export const fireGuardShield=b=>phase4Balance(b)&&b.comboSet?.has('fireGuard')?BALANCE4.fireGuardShield:0;
