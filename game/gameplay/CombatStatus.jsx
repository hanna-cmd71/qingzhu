/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {insectOrderHint} from './experience-hints';
import React from 'react';
import {gnawDescription} from './targeting';
import {PATHS} from './data';
import {starterStatus} from './starters';
import {cultivationStatus} from './cultivation';
const BUFFS={puppet:'傀儡支援',insect:'虫群活跃',armor:'铁甲护体',damage:'攻击增益',haste:'攻速增益',speed:'移速 +35%',regen:'养息回复',metaSwordTempo:'飞剑攻速 +12%',metaGuardSwift:'移速 +12%'};
export default function CombatStatus({b}){const buffs=Object.entries(b.player.buffs).filter(([k,t])=>BUFFS[k]&&t>b.time);return <><div className="mobile-status" aria-label="当前流派状态" title={b.path===3?gnawDescription(b):undefined}>{b.objective?.kind==='defend'&&<span className="defend-assignment">{b.input.focus?b.input.touchAim?'集火中 · 点摇杆旁“解除”恢复分守':'集火中 · 松开左键恢复分守':'分守中 · 飞剑分别迎敌'}</span>}<strong style={{color:PATHS[b.path].color}}>{PATHS[b.path].name} · {b.path===2?b.puppets.length+' 具 · ':b.path===3?b.insects.length+' 只 · ':''}{starterStatus(b)}</strong>{cultivationStatus(b)&&<span>{cultivationStatus(b)}</span>}</div><div className="combat-feedback" aria-label="战术触发与增益">{b.objective?.kind==='defend'&&b.objective.hp/b.objective.maxHp<=.35&&<strong className="defend-crisis">阵盘危急 · {Math.ceil(b.objective.hp)} / {b.objective.maxHp} · 护盾只保护韩立；{b.input.focus?'解除集火可分守':'已分守 · 清理多线威胁'}</strong>}{b.insects.length>0&&<span className="insect-order-hint">{insectOrderHint(b)}</span>}{b.touchLockId!=null&&<span className="touch-lock-status">锁定 · {b.enemies.find(e=>e.id===b.touchLockId)?.name}</span>}{b.player.webSlow>0&&<span className="active-buff debuff">蛛网／寒丝 · 移速 −40%（含闪避）</span>}{b.stats.metaThunderVeil&&b.time-b.thunderTime<1&&b.player.invuln>0&&<span className="active-buff">金雷护窍 · 无敌 {Math.min(1-(b.time-b.thunderTime),b.player.invuln).toFixed(1)}s</span>}{buffs.map(([k,t])=><span className="active-buff" key={k}>{BUFFS[k]} {k==='metaSwordTempo'?'· 生效':Math.max(0,t-b.time).toFixed(1)+'s'}</span>)}{b.combatCues.filter(c=>c.until>b.time).map(c=><span key={c.key} style={{color:c.color}}>{c.text}</span>)}</div></>;}
