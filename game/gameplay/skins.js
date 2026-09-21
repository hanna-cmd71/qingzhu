/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Costume registry. Every costume carries its own hero atlas (see loadArt in art.js), so adding one
// is an asset plus an entry here and nothing else. Unlock conditions read this device's own account
// data; a costume is never granted from chapter progress and never revoked once granted.
export const DEFAULT_SKIN='default';
export const SKINS=[
 {id:DEFAULT_SKIN,name:'初始装束',desc:'出发时的常服。',atlas:'hero',unlock:null},
 {id:'frost',name:'霜青',desc:'偏冷的青碧长袍，金饰不改。',atlas:'heroFrost',unlock:{wins:1}},
 {id:'night',name:'夜行',desc:'深紫夜行衣，便于在殿内潜行。',atlas:'heroNight',unlock:{wins:3}},
 {id:'crimson',name:'赤霞',desc:'赤色礼服，取鼎之行的正装。',atlas:'heroCrimson',unlock:{wins:5}},
 {id:'snow',name:'素雪',desc:'素白常服，收敛锋芒。',atlas:'heroSnow',unlock:{wins:10}},
];
export const skinIds=SKINS.map(s=>s.id);
export const skinById=id=>SKINS.find(s=>s.id===id)||SKINS.find(s=>s.id===DEFAULT_SKIN);
// A costume without a condition is granted to every save. Conditions are deliberately limited to
// account facts this device recorded itself, so an imported profile cannot claim a locked costume.
export function skinUnlocked(save,skin){
 const unlock=skin?.unlock;
 if(!unlock)return true;
 if(Number.isFinite(unlock.wins))return (save?.wins||0)>=unlock.wins;
 if(unlock.achievement)return Array.isArray(save?.achievements)&&save.achievements.includes(unlock.achievement);
 return false;
}
// The default costume is always available; stored grants keep a costume unlocked even if a future
// condition changes, matching how the project treats achievements.
export function grantedSkins(save,registry=SKINS){
 const stored=Array.isArray(save?.skins)?save.skins:[];
 return registry.filter(s=>stored.includes(s.id)||skinUnlocked(save,s)).map(s=>s.id);
}
// Account-level costume state. The default is always granted, unknown ids are dropped, and an
// equipped costume that is not granted falls back to the default instead of blocking the save.
// Kept pure and registry-parameterised so the contract stays covered while only one costume ships.
export function normalizeSkinState(input,registry=SKINS){
 const ids=registry.map(s=>s.id),fallback=ids.includes(DEFAULT_SKIN)?DEFAULT_SKIN:ids[0];
 // Stored grants are kept, and a costume whose condition the account already meets is granted on
 // sight, so a fully played profile picks up a new costume without replaying anything.
 const skins=[...new Set([fallback,...(Array.isArray(input?.skins)?input.skins:[]).filter(id=>ids.includes(id)),...grantedSkins(input,registry)])];
 return {skins,skin:skins.includes(input?.skin)?input.skin:fallback};
}
