/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Target allocation is independently versioned; old saves keep grouped focus.
export const FOCUS_VERSION=3;
export const directFocus=b=>b.rulesVersion===3&&b.options.focusVersion>=2&&!!b.input.focus&&!!b.input.aim;
export function gnawTargets(b){
 const alive=b.enemies.filter(e=>e.hp>0&&!e.untargetable);
 const recent=alive.filter(e=>e.gnaw>0&&e.gnawUntil>b.time).sort((a,z)=>z.gnawUntil-a.gnawUntil||a.id-z.id);
 const grouped=b.hasCore?.('K07')&&(b.stats.insects||0)>=4;
 const keys=grouped?['bug0','bug1']:b.hasCore?.('K08')?['bug0']:[];
 const locked=keys.map(key=>b.targetCache?.[key]).filter(c=>c?.until>b.time).map(c=>alive.find(e=>e.id===c.id)).filter(Boolean);
 const pursuing=(b.insectPursuits||[]).map(id=>alive.find(e=>e.id===id)).filter(Boolean);
 const targets=[...new Map([...locked,...pursuing,...recent].map(e=>[e.id,e])).values()].slice(0,grouped?2:1);
 return targets.map(e=>{const active=e.gnawUntil>b.time,percent=active?Math.round((e.gnaw||0)*100):0;return {id:e.id,name:e.name,pursuing:pursuing.includes(e)||locked.includes(e),layers:Math.round(percent/2),percent,seconds:active?Math.max(.1,Math.ceil((e.gnawUntil-b.time)*10)/10):0};});
}
export function gnawStatus(b){const targets=gnawTargets(b);if(!targets.length)return '啃蚀 0/6（0%）· 等待有效虫击';return targets.map((t,i)=>(targets.length>1?String.fromCharCode(65+i)+' ':'' )+(t.pursuing?'追击 ':'留痕 ')+t.layers+'/6 · '+t.percent+'% · '+t.seconds.toFixed(1)+'s'+(targets.length===1?' · '+t.name:'')).join('；');}

export const gnawDescription=b=>gnawTargets(b).map((t,i)=>String.fromCharCode(65+i)+'：'+t.name+'，'+t.layers+' 层，易伤 '+t.percent+'%，剩余 '+t.seconds.toFixed(1)+' 秒').join('；');
