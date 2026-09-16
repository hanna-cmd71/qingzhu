// Each source owns its duration: weak refreshes cannot prolong stronger effects.
export const SLOW_SOURCES=['legacy','sword','puppet','binding','ward','ember'];
function effects(e){
 if(!e.slows)e.slows=e.slow>0&&e.slowTime>0?[{source:'legacy',strength:Math.min(.65,e.slow),left:e.slowTime}]:[];
 return e.slows;
}
function sync(e){
 e.slow=0;e.slowTime=0;
 for(const effect of e.slows){if(effect.strength>e.slow){e.slow=effect.strength;e.slowTime=effect.left;}else if(effect.strength===e.slow)e.slowTime=Math.max(e.slowTime,effect.left);}
}
export function applySlow(e,source,strength,duration){
 if(e.boss||e.mission==='rune'||strength<=0||duration<=0)return;
 const list=effects(e),effect={source,strength:Math.min(.65,strength),left:duration},index=list.findIndex(v=>v.source===source);
 if(index<0)list.push(effect);else list[index]=effect;sync(e);
}
export function tickSlow(e,dt){
 const list=effects(e);if(e.boss||e.mission==='rune')list.length=0;
 for(let i=list.length-1;i>=0;i--){list[i].left-=dt;if(list[i].left<=0)list.splice(i,1);}sync(e);
}
