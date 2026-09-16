/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {WORLD} from './combat-values.js';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
// HUD and safe-area measurements are CSS pixels. Drawing and input use this view.
export function battleCamera(width,height,player,{top=0,bottom=0,left=0,right=0}={}) {
 const arenaLeft=clamp(left?left+12:8,8,Math.max(8,width-48));
 const arenaRight=Math.max(arenaLeft+32,width-Math.max(8,right));
 const arenaTop=clamp(top+8,8,Math.max(8,height-bottom-48));
 const arenaBottom=Math.max(arenaTop+32,height-bottom-8);
 const aw=arenaRight-arenaLeft,ah=arenaBottom-arenaTop;
 // On a phone, retain roughly 60% world width and a >=24px character where possible.
 const scale=Math.max(.4,Math.min(Math.max(aw/WORLD.w,ah/WORLD.h)*1.04,aw/(WORLD.w*.6),height<=420?ah/(WORLD.h*.45):Infinity));
 const follow=(desired,start,end,world)=>end-start>world*scale?start+(end-start-world*scale)/2:clamp(desired,end-world*scale,start);
 let x=follow(arenaLeft+aw/2-player.x*scale,arenaLeft,arenaRight,WORLD.w);
 let y=follow(arenaTop+ah*.6-player.y*scale,arenaTop,arenaBottom,WORLD.h);
 x=clamp(x,arenaLeft+18*scale-player.x*scale,arenaRight-18*scale-player.x*scale);
 const headRoom=Math.min(72*scale,ah*.7);
 y=clamp(y,arenaTop+headRoom-player.y*scale,arenaBottom-9*scale-player.y*scale);
 return {x,y,scale,top:arenaTop,bottom:arenaBottom,left:arenaLeft,right:arenaRight};
}
export function offscreenDirection(camera,target,occlusions=[]){
 if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))return null;const tx=camera.x+target.x*camera.scale,ty=camera.y+(target.y-35)*camera.scale;
 const margin=24,l=camera.left+margin,r=camera.right-margin,t=camera.top+margin,b=camera.bottom-margin;
 if(r<=l||b<=t||tx>=l&&tx<=r&&ty>=t&&ty<=b)return null;
 const cx=(l+r)/2,cy=(t+b)/2,dx=tx-cx,dy=ty-cy,f=Math.min(dx===0?Infinity:(r-l)/2/Math.abs(dx),dy===0?Infinity:(b-t)/2/Math.abs(dy));
 const marker={x:cx+dx*f,y:cy+dy*f,name:target.name||'首领'};
 for(let pass=0;pass<3;pass++)for(const box of occlusions){if(marker.x+60<box.left||marker.x-60>box.right||marker.y+24<box.top||marker.y-24>box.bottom)continue;const above=box.top-28,below=box.bottom+28;marker.y=above>=t?above:below<=b?below:marker.y;}
 marker.angle=Math.atan2(ty-marker.y,tx-marker.x);return marker;
}
