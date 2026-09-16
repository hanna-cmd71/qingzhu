/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Simulator-only inputs. No production module imports this file or changes stats.
import {talismanPlan} from './talisman-pilot.mjs';
import {sigilCooldown} from '../gameplay/balance.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const PILOTS=['baseline','puppet-mobile','puppet-stationary','thunder-active','sigil-intercept'];
export function corePreference(core,b,pilot){
 let score=Number(core.path===b.path);
 if(pilot==='puppet-mobile'&&core.id==='K06')score+=10;
 if(pilot==='puppet-stationary'&&core.id==='K05')score+=10;
 if(pilot==='sigil-intercept'&&core.id==='K09')score+=10;
 return score;
}
export function pilotTarget(b,pilot,target){
 if(pilot!=='puppet-stationary'||b.path!==2)return target;
 const p=b.player,q=b.objective;
 if(b.mechanism||['illusion','ice'].includes(q?.kind)||q?.kind==='escape'&&q.done>=q.total)return target;
 const enemies=b.enemies.filter(e=>e.hp>0&&!e.untargetable);
 const safe=!enemies.some(e=>e.mission!=='rune'&&(distance(e,p)<120||(e.charge>0||e.rush>0)&&distance(e,p)<500))&&!b.shots.some(s=>!s.friendly&&distance(s,p)<180)&&!b.zones.some(z=>!z.friendly&&distance(z,p)<z.r+45);
 const inRange=enemies.some(e=>distance(e,p)<340*(1+(b.stats.puppetRange||0)));
 return safe&&inRange?{x:p.x,y:p.y}:target;
}
export function sigilPlan(b,pilot){
 const baseline=talismanPlan(b);if(pilot!=='sigil-intercept'||b.path!==4)return baseline;
 if(b.mechanism||['illusion','ice'].includes(b.objective?.kind))return baseline;
 const p=b.player,targets=b.enemies.filter(e=>e.hp>0&&!e.untargetable&&!(e.phaseShield>0));
 const pending=b.zones.find(z=>z.sigil&&!z.metaEcho&&!z.fired&&z.warn>0);
 if(pending){
  const enemy=targets.filter(e=>distance(e,pending)<pending.r+e.speed*Math.min(2,pending.warn)).sort((a,z)=>distance(a,pending)-distance(z,pending))[0];
  if(!enemy)return baseline;
  const dx=pending.x-enemy.x,dy=pending.y-enemy.y,d=Math.hypot(dx,dy)||1;
  return {lure:{x:pending.x+dx/d*pending.r*.6,y:pending.y+dy/d*pending.r*.6}};
 }
 if(p.dashCD>0||b.time-b.lastSigil<sigilCooldown(b))return baseline;
 const radius=(b.stats.dashFire?100:85)*(1+(b.stats.metaSigilRadius||0));
 const enemy=targets.sort((a,z)=>distance(a,p)-distance(z,p))[0];if(!enemy)return baseline;
 const dx=p.x-enemy.x,dy=p.y-enemy.y,d=Math.hypot(dx,dy)||1;
 if(d>radius*.95)return {lure:{x:enemy.x+dx/d*radius*.7,y:enemy.y+dy/d*radius*.7}};
 const angle=Math.atan2(dy,dx),escape=[0,.7,-.7,1.57,-1.57].map(offset=>{
  const x=Math.cos(angle+offset),y=Math.sin(angle+offset),end={x:p.x+x*130,y:p.y+y*130};
  return {x,y,end,score:Math.min(...targets.map(e=>distance(e,end)))};
 }).filter(v=>v.end.x>45&&v.end.x<1235&&v.end.y>55&&v.end.y<745&&!b.zones.some(z=>!z.friendly&&distance(z,v.end)<z.r+20)).sort((a,z)=>z.score-a.score);
 return escape.length?{dash:escape[0]}:baseline;
}
export function activeThunder(b,pilot,priority,baseline){
 if(pilot!=='thunder-active'||b.path!==1)return baseline;
 const hostile=b.shots.filter(s=>!s.friendly&&distance(s,b.player)<360).length;
 const threats=b.enemies.filter(e=>e.hp>0&&!e.untargetable&&distance(e,b.player)<350).length;
 return baseline||hostile>=5||threats>=10||priority&&!priority.phaseShield&&priority.hp>600;
}
