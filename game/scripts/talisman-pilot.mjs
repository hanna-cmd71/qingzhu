/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Observable-state guidance for the simulator; never changes game balance.
import {sigilCooldown} from '../gameplay/balance.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function talismanPlan(b){
 if(b.path!==4||b.modeState!=='battle')return null;
 const p=b.player,targets=b.enemies.filter(e=>e.hp>0&&!e.untargetable&&!(e.phaseShield>0));
 const pending=b.zones.find(z=>z.sigil&&!z.metaEcho&&!z.twin&&!z.fired&&z.warn>0);
 if(pending){
  const e=targets.filter(e=>distance(e,pending)<pending.r+Math.min(100,e.speed*pending.warn)).sort((a,c)=>distance(a,pending)-distance(c,pending))[0];
  if(!e)return null;
  const dx=pending.x-e.x,dy=pending.y-e.y,d=Math.hypot(dx,dy)||1;
  return {lure:{x:pending.x+dx/d*pending.r*.55,y:pending.y+dy/d*pending.r*.55}};
 }
 if(p.dashCD>0||b.time-b.lastSigil<sigilCooldown(b))return null;
 const radius=(b.stats.dashFire?100:85)*(1+(b.stats.metaSigilRadius||0));
 const e=targets.filter(e=>distance(e,p)<radius*.8).sort((a,c)=>distance(a,p)-distance(c,p))[0];
 if(!e)return null;
 const away=Math.atan2(p.y-e.y,p.x-e.x),choices=[0,.7,-.7,1.57,-1.57].map(offset=>{
  const a=away+offset,dx=Math.cos(a),dy=Math.sin(a),end={x:p.x+dx*130,y:p.y+dy*130};
  const safe=end.x>45&&end.x<1235&&end.y>55&&end.y<745&&!b.zones.some(z=>!z.friendly&&distance(z,end)<z.r+20);
  return {x:dx,y:dy,safe,score:Math.min(...targets.map(t=>distance(t,end)))};
 }).filter(v=>v.safe).sort((a,c)=>c.score-a.score);
 return choices.length?{dash:choices[0]}:null;
}
