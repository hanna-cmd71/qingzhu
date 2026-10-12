/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.4 打击反馈与界面动效 界面核对（headless Playwright，离线 HTML）：
// 1. 玩家血条有一条滞后残影层，且它的过渡明显比真实血条慢（所以会自动落在后面）；
// 2. 画布血条掉血后真的画出滞后残影，追平之后残影消失；
// 3. 掉血真的会让屏幕多画一层边缘红晕，关掉「受击反馈」后这一层不再出现；
// 4. 设置页有「受击反馈」开关，切换后写入存档并在重载后保留；
// 5. 标题与更新日志首行都带当前版本，0 页面异常、0 外部请求。
// 用法：PLAYWRIGHT_CHROMIUM_EXECUTABLE=<chrome> QINGZHU_ASSET_PROFILE=<optimized|png> node scripts/impact-browser.mjs
import {launchBrowser,qaOutput,qaFile,htmlPath,variant} from './browser-runtime.mjs';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {GAME_VERSION} from '../gameplay/version.js';
import {LAG_COLOR} from '../gameplay/meters.js';
import {LOW_HEALTH,VIGNETTE_MAX} from '../gameplay/impact.js';
const html=process.argv[2]||htmlPath;
const OUT=qaFile(qaOutput('impact-ui'),'.');fs.mkdirSync(OUT,{recursive:true});
const report={variant,html,version:GAME_VERSION,checks:[],errors:[],external:[],measurements:{}};
const ok=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' · '+JSON.stringify(detail).slice(0,300):''));};
const browser=await launchBrowser();
const url=pathToFileURL(html).href+'?test=1';
// 页面侧探针：计数清零与重画放在同一个同步调用里，所以测到的正好是「这一次 draw」，
// 不会被 requestAnimationFrame 的其它帧混进来。
const installProbe=page=>page.addInitScript(lagColor=>{
 const state={lagFills:0,gradients:0};
 window.__QZ_IMPACT__=state;
 const proto=CanvasRenderingContext2D.prototype,fillRect=proto.fillRect,grad=proto.createRadialGradient;
 proto.fillRect=function(...a){if(String(this.fillStyle).toLowerCase()===lagColor)state.lagFills++;return fillRect.apply(this,a);};
 proto.createRadialGradient=function(...a){state.gradients++;return grad.apply(this,a);};
 // 画一帧血条并回报残影段数；同时回报这一帧新建了几层径向渐变（基础暗角 + 受击红晕）。
 window.__QZ_FRAME__=()=>{state.lagFills=0;state.gradients=0;window.__FANREN__.render();return {lagFills:state.lagFills,gradients:state.gradients};};
},LAG_COLOR.toLowerCase());
const enterBattle=async(page,run={mode:'training',skipPractice:true})=>{
 await page.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 await page.evaluate(r=>window.__FANREN__.start(r),run);
 await page.waitForTimeout(200);
 const risk=await page.evaluate(()=>window.__FANREN__.risk?{confirm:window.__FANREN__.risk.confirm}:null);
 if(risk)await page.locator('.risk-dialog').getByRole('button',{name:risk.confirm}).click();
 await page.waitForFunction(()=>window.__FANREN__.battle,null,{timeout:20000});
 await page.evaluate(()=>{const b=window.__FANREN__.battle;while(b.scene==='cinematic')b.advanceCinematic(true);if(b.modeState==='intro')b.start();while(b.scene==='cinematic')b.advanceCinematic(true);window.__FANREN__.step(1);});
 // 布阵演出 2.4 秒内会额外建一层径向渐变，等它走完基线才是干净的一层。
 await page.waitForTimeout(3200);
};
const openSettings=async page=>{
 await page.evaluate(()=>{const b=window.__FANREN__.battle;if(b&&b.modeState==='battle')b.pause();});
 await page.getByRole('button',{name:'音画与操控设置'}).click();
 await page.waitForSelector('.settings-grid');
};
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
 await installProbe(page);
 page.on('pageerror',e=>report.errors.push('desktop: '+String(e.message)));
 page.on('request',r=>{const u=r.url();if(!/^(file|data|blob):/.test(u))report.external.push(u);});
 await page.goto(url);
 await enterBattle(page);
 // 血条滞后层：存在、与真实血条同宽、过渡明显更慢。
 const bar=await page.evaluate(()=>{const track=document.querySelector('.hp-track');if(!track)return null;const lag=track.querySelector('i'),fill=track.querySelector('span');const cs=e=>{const s=getComputedStyle(e);return {duration:parseFloat(s.transitionDuration)||0,delay:parseFloat(s.transitionDelay)||0,width:e.style.width};};return {lag:lag?cs(lag):null,fill:cs(fill),total:cs(track).width};});
 report.measurements.bar=bar;
 ok('玩家血条有滞后残影层',!!bar&&!!bar.lag,{hasLag:!!bar?.lag});
 ok('残影与真实血条同宽，所以只靠过渡速度拉开差距',!!bar&&bar.lag.width===bar.fill.width,{lag:bar?.lag.width,fill:bar?.fill.width});
 ok('残影过渡明显慢于真实血条',!!bar&&bar.lag.duration+bar.lag.delay>bar.fill.duration*2,{lag:bar?.lag.duration+bar?.lag.delay,fill:bar?.fill.duration});
 // 画布血条：掉血后出现残影，追平后消失。
 const lag=await page.evaluate(()=>{
  const b=window.__FANREN__.battle,p=b.player,t0=b.time;
  const before=window.__QZ_FRAME__();
  p.hp=p.maxHp*.45;
  const dropped=window.__QZ_FRAME__();
  b.time=t0+3;const caught=window.__QZ_FRAME__();b.time=t0;
  return {before,dropped,caught,hp:p.hp,maxHp:p.maxHp};
 });
 report.measurements.canvasLag=lag;
 ok('掉血后画布血条画出滞后残影',lag.before.lagFills===0&&lag.dropped.lagFills>0,lag);
 ok('追平后残影消失',lag.caught.lagFills===0,{caught:lag.caught});
 // 受击红晕：掉血多一层径向渐变，低血量呼吸也能单独撑起这一层。
 const hurt=await page.evaluate(threshold=>{
  const b=window.__FANREN__.battle,p=b.player,t0=b.time;
  p.hp=p.maxHp;b.time=t0+5;const calm=window.__QZ_FRAME__();
  p.hp=p.maxHp*.6;const hurt=window.__QZ_FRAME__();
  p.hp=p.maxHp*(threshold/200);b.time=t0+5.2;const low=window.__QZ_FRAME__();
  b.time=t0;
  return {calm,hurt,low};
 },LOW_HEALTH*100);
 report.measurements.hurt=hurt;
 ok('掉血真的多画一层受击红晕',hurt.hurt.gradients===hurt.calm.gradients+1,hurt);
 ok('低血量呼吸也能单独撑起红晕层',hurt.low.gradients===hurt.calm.gradients+1,hurt);
 // 设置页开关：存在、说明同源、切换写入存档、重载后保留、关掉后不再画红晕。
 await openSettings(page);
 const row=page.locator('.toggle-line').filter({hasText:'受击反馈'});
 ok('设置页有「受击反馈」开关',await row.count()===1,{rows:await row.count()});
 const explanation=await page.locator('.settings-grid').innerText();
 ok('受击反馈说明与数据同源',explanation.includes('受击反馈')&&explanation.includes(String(Math.round(LOW_HEALTH*100))),{lowHealth:Math.round(LOW_HEALTH*100)});
 const labelBefore=(await row.getByRole('button').textContent())?.trim();
 await row.getByRole('button').click();
 await page.waitForTimeout(150);
 const labelAfter=(await row.getByRole('button').textContent())?.trim();
 const stored=await page.evaluate(()=>({live:window.__FANREN__.save.settings.shake,stored:JSON.parse(localStorage.getItem('fanren-qingzhu-v1')).settings.shake}));
 ok('关掉受击反馈后写入存档',stored.live===false&&stored.stored===false&&labelBefore!==labelAfter,{labelBefore,labelAfter,...stored});
 await page.screenshot({path:OUT+'impact-settings-'+variant+'.png'});
 const off=await page.evaluate(()=>{const b=window.__FANREN__.battle,p=b.player;const t0=b.time;p.hp=p.maxHp*.5;b.time=t0+5;const f=window.__QZ_FRAME__();b.time=t0;return f;});
 ok('关掉后掉血不再画红晕',off.gradients===1,off);
 await page.reload();
 await page.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 const persisted=await page.evaluate(()=>window.__FANREN__.save.settings.shake);
 ok('重载后仍保持关闭',persisted===false,{persisted});
 // 标题与更新日志首行
 const meta=await page.evaluate(()=>({title:document.title}));
 ok('标题带当前版本',meta.title.endsWith(GAME_VERSION),meta);
 ok('红晕上限不会盖住战场',VIGNETTE_MAX<=.6,{VIGNETTE_MAX});
 await context.close();
 const c2=await browser.newContext({viewport:{width:1280,height:800}}),p2=await c2.newPage();
 p2.on('pageerror',e=>report.errors.push('changes: '+String(e.message)));
 await p2.goto(url);
 await p2.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 await p2.getByRole('button',{name:/更新日志/}).click();
 const changes=(await p2.getByLabel('更新日志正文').innerText()).trim();
 report.measurements.changelog=changes.split('\n').slice(0,3);
 ok('更新日志首行是当前版本',changes.split('\n')[0].trim().startsWith(GAME_VERSION),{first:changes.split('\n')[0]});
 await c2.close();
}finally{await browser.close();}
const failed=report.checks.filter(c=>!c.pass);
fs.writeFileSync(OUT+'impact-ui-report.json',JSON.stringify(report,null,2));
console.log('\n'+(report.checks.length-failed.length)+' / '+report.checks.length+' 通过，页面异常 '+report.errors.length+'，外部请求 '+report.external.length);
if(report.errors.length)console.log(report.errors.join('\n'));
if(report.external.length)console.log(report.external.slice(0,5).join('\n'));
process.exit(failed.length||report.errors.length||report.external.length?1:0);
