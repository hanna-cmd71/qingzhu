/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {emptySigilStats,validateSigilStats} from './sigil-metrics.js';
import {CONSUMABLES} from './data.js';
export const FIRE_KINDS=['burn','sigil','echo','ember','line','other','history'];
export const FIRE_LABELS={burn:'附焰灼烧',sigil:'主符爆发',echo:'复燃回响',ember:'续焰地火',line:'合符连线',other:'其他符火',history:'旧记录·未分类符火'};
export const emptyFire=()=>Object.fromEntries(FIRE_KINDS.map(k=>[k,0]));
export const shieldReward=(player,amount,extraCap)=>Math.max(0,Math.min(player.maxShield+extraCap,player.shield+amount)-player.shield);
const shown=n=>Number(n.toFixed(1));
export function summonState(b,item){
 if(!['puppet','insect'].includes(item?.effect))return null;const puppet=item.effect==='puppet',cap=puppet?12:30,bonus=puppet?1:4,unit=puppet?'具':'只',base=puppet?(b.stats.puppets||0):(b.stats.insects||0)+(b.stats.breed?Math.min(6,Math.floor(b.kills/25)):0),active=b.player.buffs[item.effect]>b.time,current=Math.min(cap,base+(active?bonus:0)),total=Math.min(cap,base+bonus),gain=total-current;
 const text=base>=cap?'数量已达 '+cap+' '+unit+'上限；仅刷新 '+item.value+' 秒计时':active?'剩余时间刷新为 '+item.value+' 秒 · 数量不变（'+total+' '+unit+'）':'临时增加 '+gain+' '+unit+' · 持续 '+item.value+' 秒';return {active,cap,total,gain,text,label:base>=cap?'数量上限':active?'仅续时':''};
}
export function consumableState(b,index){
 const slot=b.consumables[index],p=b.player,original=CONSUMABLES.find(c=>c.id===slot?.id);
 const bonus=!!slot?.bonusHeal&&(p.hp<p.maxHp||!slot.count);
 const item=bonus?{id:'bonusHeal',name:'回元药包·加赠',effect:'heal',value:.35,desc:'恢复 35% 最大生命；满血保留加赠药包，可先用原物资。'}:original;
 const count=bonus?slot.bonusHeal:slot?.count||0,summon=summonState(b,item);
 const gain=item?.effect==='heal'?Math.min(p.maxHp-p.hp,p.maxHp*item.value):item?.effect==='mana'?Math.min(100-p.mana,item.value):null;
 const blocked=count>0&&gain===0,reason=blocked?(item.effect==='heal'?'生命已满 · 未消耗':'灵力已满 · 未消耗'):count===0?'物资已用尽':'';
 return {item,count,bonus,blocked,gain,reason,summon,label:reason||summon?.text||(gain!==null?'可恢复 '+shown(gain)+(item.effect==='heal'?' 生命':' 灵力'):'可使用'),pendingBonus:!bonus&&!!slot?.bonusHeal};
}
export function restoreFeedback(b,data){
 b.fireBreakdown=data.fireBreakdown?structuredClone(data.fireBreakdown):{...emptyFire(),history:data.damageSources?.fire||0};
 b.sigilStats=data.sigilStats?structuredClone(data.sigilStats):emptySigilStats(data.time);b.recentHits=structuredClone(data.recentHits||[]);b.combatCues=[];b.cueTimers={};b.numberTimers={};
}
export function recordHit(b,{name='未知来袭',x,y,kind='近身',target='韩立',shield=0,hp=0,remaining=0,outcome='hurt',recovered=0}){
 const p=target==='阵盘'?b.objective:b.player;
 const angle=Number.isFinite(x)&&Number.isFinite(y)?Math.atan2(y-p.y,x-p.x):null;
 const hit={time:b.time,name,kind,target,shield,hp,remaining,angle,outcome,recovered};
 b.recentHits.push(hit);if(b.recentHits.length>5)b.recentHits.shift();
 if(target==='韩立'&&angle!==null)b.fx.push({kind:'incoming',x:p.x,y:p.y,angle,ttl:.75,max:.75,color:'#ffb39c'});
}
export function cue(b,key,text,color='#e5d4a3',duration=2.2){
 if(b.time<(b.cueTimers[key]??-1))return;b.cueTimers[key]=b.time+1.5;
 b.combatCues=b.combatCues.filter(c=>c.until>b.time).slice(-1);b.combatCues.push({key,text,color,until:b.time+duration});
}
export function damageRows(b){return [...Object.entries(b.damageSources).filter(([k])=>k!=='fire').map(([k,value])=>({key:k,label:{sword:'飞剑',thunder:'雷法',puppet:'傀儡',insect:'虫群',guard:'反击',return:'回程斩',arc:'余雷'}[k],value})),...FIRE_KINDS.filter(k=>b.fireBreakdown?.[k]>0||k==='sigil'&&b.path===4).map(k=>({key:'fire-'+k,label:FIRE_LABELS[k],value:b.fireBreakdown?.[k]||0}))];}
export function validateFeedback(d){
 validateSigilStats(d.sigilStats,d);
 const fail=()=>{throw Error('战斗反馈记录无效');},num=(v,max=1e200)=>Number.isFinite(v)&&v>=0&&v<=max;
 if(d.fireBreakdown!==undefined){const f=d.fireBreakdown;if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).length!==FIRE_KINDS.length||!FIRE_KINDS.every(k=>num(f[k])))fail();const total=Object.values(f).reduce((a,b)=>a+b,0),aggregate=d.damageSources?.fire||0;if(Math.abs(total-aggregate)>Math.max(1e-5,aggregate*1e-9))fail();}
 if(d.recentHits!==undefined){if(!Array.isArray(d.recentHits)||d.recentHits.length>5)fail();let last=-1;for(const h of d.recentHits){if(!h||!num(h.time,d.time+1e-6)||h.time<last||!['韩立','阵盘'].includes(h.target)||typeof h.name!=='string'||!h.name.length||h.name.length>200||!['近身','弹幕','险地'].includes(h.kind)||!num(h.shield)||!num(h.hp)||!num(h.remaining)||(h.angle!==null&&(!Number.isFinite(h.angle)||Math.abs(h.angle)>Math.PI)))fail();if(h.outcome!==undefined){if(!['hurt','revived','defeated'].includes(h.outcome)||!num(h.recovered)||h.outcome==='revived'&&(h.target!=='韩立'||h.recovered<=0||h.remaining!==h.recovered)||h.outcome==='defeated'&&h.remaining!==0||h.outcome==='hurt'&&h.remaining<=0||h.outcome!=='revived'&&h.recovered!==0)fail();}last=h.time;}}
}
export function validateOrigin(origin){if(origin===undefined)return;if(!origin||typeof origin.name!=='string'||origin.name.length>200||!origin.name.length||!Number.isFinite(origin.x)||!Number.isFinite(origin.y)||Math.abs(origin.x)>1e5||Math.abs(origin.y)>1e5)throw Error('来袭来源记录无效');}
