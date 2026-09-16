/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Tactical encounter patterns. Geometry and timing are game rules, not novel geography.
export const LAYOUTS=Array.from({length:6},(_,map)=>['四隅留路','错列阵位','回环行阵','斜向穿行'].map((name,variant)=>({id:map*4+variant,map,variant,name}))).flat();
export function layoutFor(b){const map=b.mode==='training'?0:[1,2,3,4,4,5][b.chapter];return LAYOUTS[map*4+((b.layoutOffset+b.wave)%4)];}
export function hazardPoints(variant,tick){
 switch(variant){
  case 0:return [[280,230],[1000,230],[280,610],[1000,610]].filter((_,i)=>i%2===tick%2);
  case 1:return Array.from({length:3},(_,i)=>[310+i*330,260+(tick%2)*310]);
  case 2:{const a=tick*1.6;return [[640+Math.cos(a)*280,420+Math.sin(a)*190],[640-Math.cos(a)*280,420-Math.sin(a)*190]];}
  default:return [[250+(tick%4)*240,250], [1030-(tick%4)*240,580]];
 }
}
export const MID_ENCOUNTERS={1:{name:'鬼雾寻路',desc:'前往青色阵位，收敛气息，辨明退路',reward:'成功：获得 60 灵石与一次修持'},4:{name:'内殿错阵',desc:'穿过交替禁制，稳住青色阵位',reward:'成功：获得 80 灵石与一次修持'}};
