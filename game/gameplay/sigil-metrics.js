/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {phase3Balance,sigilTargets} from './balance.js';
const group=()=>({casts:0,hits:0,kills:0,damage:0,blocked:0,empty:0});
export const emptySigilStats=(fromTime=0)=>({fromTime,sigil:group(),echo:group(),recent:[]});
// Four is sufficient to distinguish the teaching threshold from later misses.
// Reuse saved real records; echoes neither advance nor interrupt the streak.
// A burst whose armed targets were killed by swords before arming ended is 'cleared': it neither advances nor interrupts the streak.
export function emptySigilStreak(stats){let count=0;for(let i=stats.recent.length-1;i>=0;i--){const r=stats.recent[i];if(r.kind!=='sigil'||r.cleared&&!r.hits&&!r.blocked)continue;if(r.hits||r.blocked)break;if(++count===4)break;}return count;}
export function beginSigil(b,z){const kind=z.metaEcho?'echo':'sigil',s=b.sigilStats,g=s[kind],record={id:s.sigil.casts+s.echo.casts+1,time:b.time,kind,x:z.x,y:z.y,...(z.cleared&&kind==='sigil'?{cleared:true}:{}),hits:0,kills:0,damage:0,blocked:(phase3Balance(b)?sigilTargets(b,z):b.enemies.filter(e=>e.hp>0&&(e.x-z.x)**2+(e.y-z.y)**2<z.r*z.r)).filter(e=>(e.untargetable||e.phaseShield>0||e.bossType==='xuangu'&&b.bossEnding>0)).length};g.casts++;g.empty++;g.blocked+=record.blocked;s.recent.push(record);if(s.recent.length>40)s.recent.shift();return record;}
// Called inside hit, before kill can change scenes or write the final checkpoint.
export function observeSigil(b,e,source,kind,damage){const n=b.sigilObservation;if(!n||source!=='fire'||kind!==n.kind||damage<=0)return;const g=b.sigilStats[kind];if(n.hits===0)g.empty--;n.hits++;g.hits++;n.damage+=damage;g.damage+=damage;if(e.hp<=0&&e.bossType!=='xuangu'){n.kills++;g.kills++;}}
export function validateSigilStats(s,d){if(s===undefined)return;const fail=()=>{throw Error('符阵战果统计无效');},count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12,power=n=>Number.isFinite(n)&&n>=0&&n<=1e200;if(!s||!Number.isFinite(s.fromTime)||s.fromTime<0||s.fromTime>d.time||!Array.isArray(s.recent)||s.recent.length>40)fail();
 for(const kind of ['sigil','echo']){const g=s[kind];if(!g||!['casts','hits','kills','blocked','empty'].every(k=>count(g[k]))||!power(g.damage)||g.empty>g.casts||g.kills>g.hits||g.casts-g.empty>g.hits||g.casts===0&&(g.hits||g.kills||g.damage||g.blocked)||g.hits===0&&g.damage!==0||g.hits>0&&g.damage<=0||g.damage>(d.fireBreakdown?.[kind]||0)+Math.max(1e-5,(d.fireBreakdown?.[kind]||0)*1e-9))fail();}
 const total=s.sigil.casts+s.echo.casts;if(s.recent.length!==Math.min(40,total))fail();let id=total-s.recent.length,time=s.fromTime;for(const n of s.recent){if(!n||!['sigil','echo'].includes(n.kind)||n.cleared!==undefined&&(n.cleared!==true||n.kind!=='sigil')||!count(n.id)||n.id!==id+1||n.id>s.sigil.casts+s.echo.casts||!Number.isFinite(n.time)||n.time<time||n.time>d.time||!['x','y'].every(k=>Number.isFinite(n[k])&&Math.abs(n[k])<=1e5)||!['hits','kills','blocked'].every(k=>count(n[k]))||!power(n.damage)||n.kills>n.hits)fail();const g=s[n.kind];if(n.damage>g.damage+1e-5||n.hits>g.hits||n.kills>g.kills)fail();id=n.id;time=n.time;}}
// Old pending sigils lack this visual-only field; never alter their remaining warn/ttl.
export function sigilFuse(z,s={}){return z.fuseDuration??Math.max(z.warn||0,z.metaEcho?.4:z.twin?(z.pair?.8:8):s.dashFire?.55:.8);}
