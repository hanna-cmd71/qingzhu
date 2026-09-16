/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Test-process-only candidates. Never imported by the shipped game.
import {Expedition} from '../gameplay/expedition.js';
import {META} from '../gameplay/data.js';
import {applySlow} from '../gameplay/slow.js';
export function applyBalanceExperiment(b,variant='baseline'){
 const variants={baseline:{},burn2:{burn:2},burn3:{burn:3},sigil90:{sigil:90},sigil300:{sigil:300},slowring:{ring:true}};
 if(!Object.hasOwn(variants,variant))throw Error('Unknown experimental variant: '+variant);
 const options=variants[variant];
 if(options.burn){const hit=b.hit.bind(b);b.hit=(e,damage,source='sword',crit=true)=>{const before=e?.hp,result=hit(e,damage,source,crit);if(source==='sword'&&e?.hp<before&&e.burn>0&&b.stats.burn)e.burnDamage=6*b.stats.burn*(1+(b.stats.burnDamage||0))*options.burn;return result;};}
 if(options.sigil){const dash=b.dash.bind(b);b.dash=()=>{const start=b.zones.length,ok=dash();if(ok){const ratio=(options.sigil+b.level*1.2)/(55+b.level*1.2);for(const z of b.zones.slice(start))if(z.sigil){z.damage*=ratio;if(z.originalDamage!==undefined)z.originalDamage*=ratio;if(z.line)z.line.damage*=ratio;}}return ok;};}
 if(options.ring){const update=b.update.bind(b);b.update=dt=>{if(b.modeState==='battle'&&!b.finished)for(const z of b.zones)if(z.sigil&&!z.metaEcho&&!z.fired&&z.warn>0)for(const e of b.near(z.x,z.y,z.r))applySlow(e,'experimentRing',.3,2);return update(dt);};}
 return {variant,hypothetical:variant!=='baseline',note:options.ring?'Independent experimental slow source; not a production save format.':null};
}
export function prepareSnapshotTrial(snapshot,{meta='keep',level=null,fixedLevel=true}={}){
 const b=Expedition.restore(structuredClone(snapshot));
 if(!['keep','none','all'].includes(meta))throw Error('Unknown cultivation mode');
 if(level!==null&&(!Number.isInteger(level)||level<1||level>160))throw Error('Invalid trial level');
 const hp=b.player.hp,shield=b.player.shield,reserve=b.player.reserve;
 if(meta!=='keep'){b.options.metaRulesVersion=2;b.options.meta=meta==='all'?META.filter(m=>m.path===b.path).map(m=>m.id):[];}
 if(level!==null)b.level=level;
 b.recalc();b.player.hp=Math.min(hp,b.player.maxHp);b.player.shield=shield;b.player.reserve=Math.min(reserve,b.player.maxReserve);
 b.swords=[];b.syncSwords();b.xp=0;b.queuedChoices=0;
 if(fixedLevel)b.addXP=()=>{};
 return b;
}
