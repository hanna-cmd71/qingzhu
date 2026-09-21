/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {validateFeedback,validateOrigin,FIRE_KINDS} from './combat-feedback.js';
import {ENEMIES,META} from './data.js';
import {SLOW_SOURCES} from './slow.js';
import {weaponIds} from './weapons.js';
import {DAMAGE_SOURCES,PROJECTILE_SOURCES,MAX_PLAYER_RESOURCE,ZONE_KINDS} from './combat-values.js';
import {BALANCE4} from './balance.js';
const TIME=1e8,COUNT=1e12,POWER=1e200;
const fail=label=>{throw Error(label+'无效，原记录未被修改');};
const object=(x,label)=>{if(!x||typeof x!=='object'||Array.isArray(x))fail(label);};
const number=(v,label,min=-TIME,max=TIME,integer=false)=>{if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isSafeInteger(v)))fail(label);};
const list=(v,label,max=1000)=>{if(!Array.isArray(v)||v.length>max)fail(label);};
const ids=(v,label)=>{list(v,label);for(const id of v)number(id,label,1,Number.MAX_SAFE_INTEGER,true);};
const optionalBoolean=(o,key,label)=>{if(o[key]!==undefined&&typeof o[key]!=='boolean')fail(label);};
export function validateCommonSnapshot(d){
 if(d?.options?.segmentVersion!==undefined&&![0,1].includes(d.options.segmentVersion))fail('体验独立版本');if(d?.options?.challengeVersion!==undefined&&![0,1,2].includes(d.options.challengeVersion))fail('体验独立版本');
 if(d?.options?.studyVersion!==undefined&&(d.options.studyVersion!==1||d.options.mode!=='seed'||![1,4].includes(d.options.path)||d.options.recordVersion!==0||d.options.segmentVersion!==0||d.options.challengeVersion!==0))fail('对照体验配置');
 object(d,'战斗记录');object(d.options,'出发配置');object(d.player,'角色记录');object(d.traits,'战术记录');list(d.relics,'携行记录',6);list(d.consumables,'药囊记录',2);
 if(d.options.focusVersion!==undefined&&![1,2,3].includes(d.options.focusVersion))fail('集火规则版本');
 if(d.options.recordVersion!==undefined&&![0,1].includes(d.options.recordVersion))fail('成绩计时版本');
 if(d.options.storyVersion!==undefined&&![1,2,3].includes(d.options.storyVersion))fail('叙事规则版本');
 if(d.options.economyVersion!==undefined&&![1,2,3,4].includes(d.options.economyVersion))fail('经济规则版本');
 if(d.options.growthVersion!==undefined&&![1,2,3,4,5].includes(d.options.growthVersion))fail('成长规则版本');
 if(d.options.encounterVersion!==undefined&&![1,2,3,4,5,6,7,8].includes(d.options.encounterVersion))fail('遭遇规则版本');
 if(d.options.inputVersion!==undefined&&![1,2].includes(d.options.inputVersion))fail('输入规则版本');
 if(d.options.contentVersion!==undefined&&![1,2,3].includes(d.options.contentVersion))fail('敌人与物资内容版本');
 if(d.options.balanceVersion!==undefined&&![1,2,3,4].includes(d.options.balanceVersion))fail('战斗平衡版本');
 if(d.options.weaponVersion!==undefined&&d.options.weaponVersion!==1)fail('御剑法门版本');
 if(d.options.weaponVersion===1&&!weaponIds.includes(d.options.weapon))fail('御剑法门');
 if(d.options.weapon!==undefined&&d.options.weaponVersion!==1)fail('御剑法门版本');
 if(d.options.mode!==undefined&&!['story','seed','replay','endless','training'].includes(d.options.mode))fail('历练模式');if(d.seed!==undefined&&(typeof d.seed!=='string'||d.seed.length>256))fail('历练种子');if(d.formation!==undefined)number(d.formation,'御剑方式',0,2,true);
 number(d.level,'进阶等级',1,160,true);number(d.time,'历练时间',0,TIME);for(const k of ['xp','totalXP','gold','kills','thunders','hitCount','rerolls','queuedChoices'])number(d[k],'历练数值',0,COUNT,k!=='xp'&&k!=='totalXP');
 if(d.endlessLoop!==undefined)number(d.endlessLoop,'无尽轮次',0,1000,true);
 for(const k of ['lastCounter','lastSigil'])if(d[k]!==undefined)number(d[k],k==='lastCounter'?'护身反击计时':'留符计时');
 validateFeedback(d);
 if(d.damageSources!==undefined){object(d.damageSources,'伤害统计');for(const [key,value] of Object.entries(d.damageSources)){if(!DAMAGE_SOURCES.includes(key))fail('伤害统计来源');number(value,'伤害统计',0,POWER);}}
 if(d.options.meta!==undefined){list(d.options.meta,'洞府配置',36);if(d.options.meta.some(id=>typeof id!=='string'||!META.some(m=>m.id===id)))fail('洞府配置');}
 for(const c of d.consumables){object(c,'药囊条目');number(c.count,'药囊数量',0,COUNT,true);}
 const p=d.player;for(const k of ['x','y','dx','dy'])number(p[k],'角色位置与方向');
 for(const k of ['hp','shield','mana','reserve'])number(p[k],'角色资源',0,k==='mana'?100:MAX_PLAYER_RESOURCE);for(const k of ['maxHp','maxShield','maxReserve'])number(p[k],'角色资源上限',k==='maxHp'?1:0,MAX_PLAYER_RESOURCE);
 if(p.reserve>p.maxReserve+1e-6)fail('雷源与上限');
 if(p.hp>p.maxHp+1e-6)fail('生命与上限');
 for(const k of ['invuln','dash','dashCD','lastHit','lastDash','lastKill'])if(p[k]!==undefined)number(p[k],'角色计时');
 if(p.metaInsectKills!==undefined)number(p.metaInsectKills,'虫群回养计数',0,COUNT,true);
 if(p.metaSwitchAt!==undefined)number(p.metaSwitchAt,'切式回锋计时');
 if(p.buffs!==undefined){object(p.buffs,'角色临时效果');if(Object.keys(p.buffs).length>64)fail('角色临时效果');for(const t of Object.values(p.buffs))number(t,'临时效果时间');}
 for(const k of ['moving','revived'])if(p[k]!==undefined&&typeof p[k]!=='boolean')fail('角色状态');
 if(d.notices!==undefined){list(d.notices,'提示记录',128);if(d.notices.some(x=>typeof x!=='string'||x.length>100))fail('提示记录');}
}
export function validateWorldSnapshot(ex,options={}){
 object(ex,'秘境记录');number(ex.waveTime,'节点计时',0,TIME);for(const k of ['enemies','shots','drops','zones','swords','puppets','insects'])list(ex[k],'战场单位');
 if(ex.stillTime!==undefined)number(ex.stillTime,'停驻计时',0,TIME);
 for(const k of ['lastShieldBreak','thunderTime','coreArcUntil','lastChain','lastWard'])if(ex[k]!==undefined)number(ex[k],'战术效果计时');
 if(ex.shieldAbsorbed!==undefined)number(ex.shieldAbsorbed,'盾破吸收累计',0,MAX_PLAYER_RESOURCE);
 if(ex.coreArcs!==undefined)number(ex.coreArcs,'余雷剩余次数',0,10,true);
 if(ex.corePair!==undefined)number(ex.corePair,'合符配对计数',0,COUNT,true);
 const ais=new Set(ENEMIES.map(e=>e.ai));
 for(const e of ex.enemies){object(e,'敌人记录');if(typeof e.name!=='string'||e.name.length>200||typeof e.family!=='string')fail('敌人名称');number(e.index,'敌人类型',0,ENEMIES.length-1,true);if(!ais.has(e.ai))fail('敌人行为');number(e.sprite,'敌人形象',0,15,true);
  for(const k of ['x','y','a'])number(e[k],'敌人位置');for(const k of ['hp','maxHp','dmg'])number(e[k],'敌人资源',0,POWER);number(e.speed,'敌人移速',0,1e6);number(e.r,'敌人碰撞范围',1,5000);number(e.cost,'敌人奖励系数',1,1e6);
  for(const k of ['age','timer','spawn','flash','stun','slow','slowTime','burn','burnTick','break','mark','phase','attacks'])number(e[k],'敌人状态');
  for(const k of ['phaseShield','charge','rush','fuse','gnawUntil','lastInsectHit','metaPinUntil','focusUntil'])if(e[k]!==undefined)number(e[k],'敌人状态时间');
  if(e.burnDamage!==undefined)number(e.burnDamage,'灼烧伤害',0,POWER);
  if(e.focusHits!==undefined)number(e.focusHits,'聚锋命中计数',0,3,true);
  if(e.gnaw!==undefined)number(e.gnaw,'虫群易伤',0,.12);
  for(const k of ['chargeA','shotAngle'])if(e[k]!==undefined)number(e[k],'敌人攻击方向');
  if(e.waypoint!==undefined)number(e.waypoint,'携物目标路径',0,COUNT,true);
  for(const k of ['untargetable','boss','elite','dead','noDrop','defended','missionCounted'])optionalBoolean(e,k,'敌人状态标记');
  if(e.guarded!==undefined)number(e.guarded,'护卫关联目标',1,Number.MAX_SAFE_INTEGER,true);
  if(e.lastDamageSource!==undefined&&!DAMAGE_SOURCES.includes(e.lastDamageSource))fail('敌人伤害来源');
  if(e.slows!==undefined){list(e.slows,'减速来源',SLOW_SOURCES.length);const seen=new Set();for(const v of e.slows){object(v,'减速来源');if(!SLOW_SOURCES.includes(v.source)||seen.has(v.source))fail('减速来源');seen.add(v.source);number(v.strength,'减速强度',0,.65);number(v.left,'减速剩余时间',0,TIME);}}
 }
 if(ex.boss){object(ex.boss,'首领记录');if(ex.boss.id!==undefined)number(ex.boss.id,'首领编号',1,COUNT,true);else{if(!['swarm','seal'].includes(ex.boss.type)||typeof ex.boss.name!=='string')fail('首领类型');number(ex.boss.hp,'首领进度',0,TIME);number(ex.boss.maxHp,'首领总进度',1,TIME);number(ex.boss.timer,'首领计时');}}
 if(ex.mechanism){object(ex.mechanism,'阵位记录');for(const k of ['x','y','r','progress','goal','step'])number(ex.mechanism[k],'阵位状态');}
 for(const s of ex.swords){object(s,'飞剑记录');for(const k of ['x','y','px','py','a','cool','life'])number(s[k],'飞剑状态');ids(s.hits,'飞剑命中记录');if(s.targetId!==null&&s.targetId!==undefined)number(s.targetId,'飞剑目标',1,Number.MAX_SAFE_INTEGER,true);if(s.pierce!==undefined)number(s.pierce,'飞剑穿透',0,1000,true);optionalBoolean(s,'returnReady','回程斩状态');}
 for(const s of ex.shots){object(s,'弹幕记录');for(const k of ['x','y','px','py','vx','vy','ttl'])number(s[k],'弹幕状态');number(s.damage,'弹幕伤害',0,POWER);number(s.r,'弹幕大小',0,5000);number(s.pierce,'弹幕穿透',0,1000,true);ids(s.hits,'弹幕命中记录');
  validateOrigin(s.origin);
  if(typeof s.friendly!=='boolean')fail('弹幕阵营');
  if(s.source!==undefined&&(!PROJECTILE_SOURCES.includes(s.source)||s.source!==(s.friendly?'puppet':'enemy')))fail('弹幕来源');
  optionalBoolean(s,'metaPin','弹幕压制标记');
  if(s.color!==undefined&&(typeof s.color!=='string'||!/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s.color)))fail('弹幕颜色');
 }
 for(const a of [...ex.puppets,...ex.insects]){object(a,'协战记录');for(const k of ['x','y','cool'])number(a[k],'协战状态');}
 for(const a of ex.puppets)for(const k of ['metaShots','coreShots'])if(a[k]!==undefined)number(a[k],k==='metaShots'?'傀儡压制计数':'傀儡追加箭计数',0,COUNT,true);
 for(const d of ex.drops){object(d,'掉落记录');for(const k of ['x','y','life'])number(d[k],'掉落状态');for(const k of ['value','gold'])number(d[k],'掉落数值',0,COUNT);}
 for(const z of ex.zones){object(z,'场地效果');for(const k of ['x','y','ttl','warn'])number(z[k],'场地效果状态');number(z.r,'场地范围',0,5000);number(z.damage,'场地伤害',0,POWER);
  validateOrigin(z.origin);if(z.fireKind!==undefined&&(!FIRE_KINDS.includes(z.fireKind)||z.fireKind==='history'))fail('场地符火来源');
  if(!ZONE_KINDS.includes(z.kind))fail('场地效果类型');
  for(const k of ['friendly','sigil','fired','twin','ember','metaEcho'])optionalBoolean(z,k,'场地效果标记');
  if(z.fuseDuration!==undefined)number(z.fuseDuration,'符阵引信长度',.01,8);
  if(z.arming!==undefined){number(z.arming,'布符剩余时间',0,.35);if(!z.sigil||z.twin||z.metaEcho||!z.friendly||z.fuseDuration!==(options.balanceVersion===4?BALANCE4.sigilWarn:2.4))fail('布符触发规则');}
  if(z.originalDamage!==undefined)number(z.originalDamage,'原始符伤',0,POWER);
  if(z.ember&&z.originalDamage===undefined)fail('续焰原始符伤');
  if(z.slow!==undefined)number(z.slow,'场地减速',0,.65);
  if(z.pair!==undefined)number(z.pair,'合符配对',1,COUNT,true);
  if(z.line){object(z.line,'符火连线');number(z.line.x,'连线位置');number(z.line.y,'连线位置');number(z.line.damage,'连线伤害',0,POWER);}
 }
}
