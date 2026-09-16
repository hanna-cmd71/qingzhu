/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {CONSUMABLES} from './data.js';
import {WORLD} from './combat-values.js';
const EPS=1e-6;
const fail=label=>{throw Error(label+'不一致，原记录未被修改');};
const bounds=(value,min,max,label)=>{if(!Number.isFinite(value)||value<min-EPS||value>max+EPS)fail(label);};
const coordinate=(obj,label,keys=['x','y'])=>{for(const key of keys)bounds(obj[key],key.endsWith('x')?-WORLD.w:-WORLD.h,key.endsWith('x')?2*WORLD.w:2*WORLD.h,label);};
const buffDurations={metaSwordTempo:3,metaGuardSwift:1.5};
for(const c of CONSUMABLES)if(['speed','damage','armor','puppet','insect','regen'].includes(c.effect))buffDurations[c.effect]=Math.max(buffDurations[c.effect]||0,c.value);
const maxInvuln=Math.max(3,...CONSUMABLES.filter(c=>c.effect==='invincible').map(c=>c.value));

// This layer is for rule 3 world snapshots; rule 1/2 keep their original restore path.
export function validateSnapshotRelations(data,battle){
 const p=data.player,ex=data.expedition,time=data.time;
 // Structural level relation first: under balance 4 the max HP also derives from the level, so a tampered level is reported as a sword/level mismatch.
 if(ex.swords.length!==Math.min(72,data.level))fail('飞剑数量与等级');
 for(const [key,name] of [['maxHp','生命上限'],['maxShield','常驻护盾上限'],['maxReserve','雷源上限']]){
  if(Math.abs(p[key]-battle.player[key])>EPS)fail(name+'与出发配置');
 }
 bounds(p.hp,0,p.maxHp,'生命与上限');bounds(p.reserve,0,p.maxReserve,'雷源与上限');
 coordinate(p,'角色位置与战场');bounds(p.dx,-1,1,'移动方向');bounds(p.dy,-1,1,'移动方向');
 for(const key of ['lastCounter','lastSigil'])if(data[key]!==undefined)bounds(data[key],-1e8,time,'技能发生时刻');
 for(const key of ['lastHit','lastDash','lastKill','metaSwitchAt'])if(p[key]!==undefined)bounds(p[key],-1e8,time,'角色动作时刻');
 for(const [key,max] of [['invuln',Math.max(maxInvuln,.24+(battle.stats.iframes||0))],['dash',.2],['dashCD',3],['webSlow',.4]])if(p[key]!==undefined)bounds(p[key],key==='dashCD'?0:-1e8,max,'角色剩余计时');
 for(const [key,value] of Object.entries(p.buffs||{}))bounds(value,-1e8,time+(buffDurations[key]??60),'临时效果到期时刻');
 for(const key of ['lastShieldBreak','thunderTime','lastChain','lastWard'])if(ex[key]!==undefined)bounds(ex[key],-1e8,time,'战术发生时刻');
 if(ex.coreArcUntil!==undefined)bounds(ex.coreArcUntil,-1e8,time+8,'余雷到期时刻');
 if(ex.stillTime!==undefined)bounds(ex.stillTime,0,time,'停驻与历练计时');
 if(ex.waveTime>time+EPS)fail('节点与历练计时');
 if(ex.bossEnding!==undefined)bounds(ex.bossEnding,-.051,13,'圣火剩余时间');
 const boss=ex.boss?.id?ex.enemies.find(e=>e.id===ex.boss.id):null;
 if(ex.boss?.id&&!boss)fail('首领关联目标');
 if(ex.bossEnding>0&&boss?.bossType!=='xuangu')fail('圣火计时与首领');
 for(const e of ex.enemies){
  if(e.index>=24&&(battle.options.contentVersion??1)<2)fail('敌人与内容规则');coordinate(e,'敌人位置与战场');
  for(const key of ['stun','spawn','flash','burn','burnTick','phaseShield','charge','rush','fuse','timer'])if(e[key]!==undefined)bounds(e[key],-1e8,60,'敌人剩余计时');
  for(const [key,duration] of [['gnawUntil',3+(battle.stats.metaGnawDuration||0)],['metaPinUntil',2],['focusUntil',2+(battle.stats.metaFocusWindow||0)]])if(e[key]!==undefined)bounds(e[key],-1e8,time+duration,'敌人效果到期时刻');
  if(e.slows)for(const slow of e.slows)bounds(slow.left,0,6,'减速剩余时间');
  if(e.teleport){coordinate(e.teleport,'闪现目标与战场');bounds(e.teleport.t,-.051,1,'闪现剩余时间');}
 }
 for(const s of ex.swords){coordinate(s,'飞剑位置与战场',['x','y','px','py']);bounds(s.cool,-1e8,1.05,'飞剑出击冷却');bounds(s.life,-1e8,1.4,'飞剑追击计时');}
 for(const s of ex.shots)coordinate(s,'弹幕位置与战场',['x','y','px','py']);
 for(const a of [...ex.puppets,...ex.insects]){coordinate(a,'协战位置与战场');bounds(a.cool,-1e8,1,'协战出击冷却');}
 for(const d of ex.drops)coordinate(d,'掉落位置与战场');
 for(const z of ex.zones){if(z.arming!==undefined&&![2,3,4].includes(battle.options.balanceVersion))fail('布符与战斗平衡规则');coordinate(z,'场地位置与战场');bounds(z.ttl,-.051,12,'场地剩余时间');bounds(z.warn,-1e8,8,'场地预警时间');if(z.fuseDuration!==undefined&&z.warn>z.fuseDuration+EPS)fail('符阵剩余引信');if(z.line)coordinate(z.line,'火线位置与战场');}
}
