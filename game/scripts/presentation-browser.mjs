/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.5 表现总控 界面核对（headless Playwright，离线 HTML）：
// 1. 设置页有「动效」三档，默认跟随系统，切换后 <html data-motion> 与存档一起变；
// 2. 选「减少」后，画布上会动的那些真的停下（击杀不再请求顿帧、血条不再留残影），
//    但静态提示保留（掉血红晕照画、伤害数字照显示）；
// 3. CSS 与画布用同一个判据：减少档下 CSS 过渡也被同一条规则停掉；
// 4. 切回「完整」后全部恢复，重载后仍保持；
// 5. 表现总览与四个模块的数据同源；标题与更新日志首行都带当前版本；0 页面异常、0 外部请求。
// 用法：PLAYWRIGHT_CHROMIUM_EXECUTABLE=<chrome> QINGZHU_ASSET_PROFILE=<optimized|png> node scripts/presentation-browser.mjs
import {launchBrowser,qaOutput,qaFile,htmlPath,variant} from './browser-runtime.mjs';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {GAME_VERSION} from '../gameplay/version.js';
import {LAG_COLOR} from '../gameplay/meters.js';
import {LOW_HEALTH} from '../gameplay/impact.js';
import {HITSTOP} from '../gameplay/feel.js';
import {FOLLOW,MOTION_FULL,MOTION_REDUCED,MOTION_LABELS,MOTION_POLICY} from '../gameplay/presentation.js';
import {effectsSummary} from '../gameplay/effects.js';
const html=process.argv[2]||htmlPath;
const OUT=qaFile(qaOutput('presentation-ui'),'.');fs.mkdirSync(OUT,{recursive:true});
const report={variant,html,version:GAME_VERSION,checks:[],errors:[],external:[],measurements:{}};
const ok=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' · '+JSON.stringify(detail).slice(0,300):''));};
const browser=await launchBrowser();
const url=pathToFileURL(html).href+'?test=1';
// 页面侧探针：计数清零与重画放在同一个同步调用里，所以测到的正好是「这一次 draw」。
const installProbe=page=>page.addInitScript(lagColor=>{
 const state={lagFills:0,gradients:0};
 window.__QZ_IMPACT__=state;
 const proto=CanvasRenderingContext2D.prototype,fillRect=proto.fillRect,grad=proto.createRadialGradient;
 proto.fillRect=function(...a){if(String(this.fillStyle).toLowerCase()===lagColor)state.lagFills++;return fillRect.apply(this,a);};
 proto.createRadialGradient=function(...a){state.gradients++;return grad.apply(this,a);};
 window.__QZ_FRAME__=()=>{state.lagFills=0;state.gradients=0;window.__FANREN__.render();return {lagFills:state.lagFills,gradients:state.gradients};};
},LAG_COLOR.toLowerCase());
// CSS 总闸探针：临时插一个带过渡的元素，看 !important 规则有没有把它停掉。
const cssGate=page=>page.evaluate(()=>{const el=document.createElement('div');el.style.transition='width 5s linear';document.body.appendChild(el);const d=getComputedStyle(el).transitionDuration;el.remove();return d;});
const enterBattle=async(page,run={mode:'training',skipPractice:true})=>{
 await page.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 await page.evaluate(r=>window.__FANREN__.start(r),run);
 await page.waitForTimeout(200);
 const risk=await page.evaluate(()=>window.__FANREN__.risk?{confirm:window.__FANREN__.risk.confirm}:null);
 if(risk)await page.locator('.risk-dialog').getByRole('button',{name:risk.confirm}).click();
 await page.waitForFunction(()=>window.__FANREN__.battle,null,{timeout:20000});
 await page.evaluate(()=>{const b=window.__FANREN__.battle;while(b.scene==='cinematic')b.advanceCinematic(true);if(b.modeState==='intro')b.start();while(b.scene==='cinematic')b.advanceCinematic(true);window.__FANREN__.step(1);});
 await page.waitForTimeout(3200);
};
const openSettings=async page=>{
 await page.evaluate(()=>{const b=window.__FANREN__.battle;if(b&&b.modeState==='battle')b.pause();});
 await page.getByRole('button',{name:'音画与操控设置'}).click();
 await page.waitForSelector('.settings-grid');
};
// 击杀探针：先清掉顿帧限流，只量「一次击杀」本身（限流逻辑由 feel.test.mjs 的纯函数用例覆盖）。
const killOne=page=>page.evaluate(()=>{
 const b=window.__FANREN__.battle,f=window.__FANREN__.freeze;f.left=0;f.gap=0;
 const e=b.spawn(0,{hp:1,x:b.player.x+40,y:b.player.y,speed:0});
 b.rebuildHash();b.hit(e,999,'sword',false);
 return {freeze:window.__FANREN__.freeze.left,dead:e.hp<=0};
});
// 掉血探针：先回到满血建基线，再掉到六成，看这一帧多画了什么。
const hurtFrame=page=>page.evaluate(()=>{
 const b=window.__FANREN__.battle,p=b.player,t0=b.time;
 p.hp=p.maxHp;b.time=t0+5;const calm=window.__QZ_FRAME__();
 p.hp=p.maxHp*.6;const hurt=window.__QZ_FRAME__();
 b.time=t0;return {calm,hurt,hp:p.hp,maxHp:p.maxHp};
});
const dropFrame=page=>page.evaluate(()=>{
 const b=window.__FANREN__.battle,p=b.player,t0=b.time;
 p.hp=p.maxHp;const before=window.__QZ_FRAME__();
 p.hp=p.maxHp*.45;const dropped=window.__QZ_FRAME__();
 b.time=t0+3;const caught=window.__QZ_FRAME__();b.time=t0;
 return {before,dropped,caught};
});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
 await installProbe(page);
 page.on('pageerror',e=>report.errors.push('desktop: '+String(e.message)));
 page.on('request',r=>{const u=r.url();if(!/^(file|data|blob):/.test(u))report.external.push(u);});
 await page.goto(url);
 await enterBattle(page);
 // 基线：完整档下，会动的那些都在。
 const baseKill=await killOne(page);
 const baseDrop=await dropFrame(page);
 const baseCss=await cssGate(page);
 const baseAttr=await page.evaluate(()=>document.documentElement.dataset.motion);
 report.measurements.full={kill:baseKill,drop:baseDrop,css:baseCss,attr:baseAttr};
 ok('完整档下击杀请求顿帧',baseKill.dead&&baseKill.freeze>0&&baseKill.freeze<=HITSTOP.kill+1e-9,baseKill);
 ok('完整档下掉血画出残影',baseDrop.before.lagFills===0&&baseDrop.dropped.lagFills>0,baseDrop);
 ok('完整档下 <html data-motion> 是 full',baseAttr==='full',{attr:baseAttr});
 ok('完整档下 CSS 过渡照常',baseCss!=='0s',{duration:baseCss});
 // 设置页：动效控件三档循环。
 await openSettings(page);
 const row=page.locator('.toggle-line').filter({hasText:'动效'}).first();
 const label=async()=>(await row.getByRole('button').textContent())?.trim();
 ok('设置页有「动效」控件',await page.locator('.toggle-line').filter({hasText:'动效'}).count()>=1,{rows:await page.locator('.toggle-line').filter({hasText:'动效'}).count()});
 const first=await label();
 ok('动效默认跟随系统',first===MOTION_LABELS[FOLLOW],{first});
 const explanation=await page.locator('.settings-grid').innerText();
 const groups=await page.locator('.settings-group').allInnerTexts();
 const headings=await page.locator('.settings-grid section>h3').allInnerTexts();
 report.measurements.groups={groups,headings};
 ok('设置页把开关分成「画面表现」与「辅助与提示」两组',groups.map(t=>t.trim()).includes('画面表现')&&groups.map(t=>t.trim()).includes('辅助与提示'),{groups});
 ok('设置页有独立的「动效与表现总览」分区',headings.some(t=>/动效与表现总览/.test(t)),{headings});
 ok('表现总览与四个模块同源',explanation.includes(String(Math.round(LOW_HEALTH*100))+'%')&&explanation.includes(String(effectsSummary().kinds)+' 类特效')&&explanation.includes(String(Object.keys(MOTION_POLICY).length)+' 项'),{lowHealth:Math.round(LOW_HEALTH*100),kinds:effectsSummary().kinds,dropped:Object.keys(MOTION_POLICY).length});
 // 跟随系统 → 完整
 await row.getByRole('button').click();await page.waitForTimeout(200);
 const second=await label();
 const attrFull=await page.evaluate(()=>document.documentElement.dataset.motion);
 ok('切到「完整」后 <html data-motion> 是 full',second===MOTION_LABELS[MOTION_FULL]&&attrFull==='full',{second,attrFull});
 // 完整 → 减少
 await row.getByRole('button').click();await page.waitForTimeout(200);
 const third=await label();
 const reduced=await page.evaluate(()=>({attr:document.documentElement.dataset.motion,live:window.__FANREN__.save.settings.motion,stored:JSON.parse(localStorage.getItem('fanren-qingzhu-v1')).settings.motion}));
 report.measurements.reduced=reduced;
 ok('切到「减少」后写进存档与 <html data-motion>',third===MOTION_LABELS[MOTION_REDUCED]&&reduced.attr==='reduced'&&reduced.live===MOTION_REDUCED&&reduced.stored===MOTION_REDUCED,{third,...reduced});
 await page.screenshot({path:OUT+'presentation-settings-'+variant+'.png'});
 const reducedCss=await cssGate(page);
 ok('减少档下 CSS 过渡也被同一条规则停掉',reducedCss==='0s',{duration:reducedCss});
 // 减少档下：会动的停下，静态的保留。
 const reducedKill=await killOne(page);
 report.measurements.reducedKill=reducedKill;
 ok('减少档下击杀不再请求顿帧',reducedKill.dead&&reducedKill.freeze===0,reducedKill);
 const reducedDrop=await dropFrame(page);
 report.measurements.reducedDrop=reducedDrop;
 ok('减少档下血条不再留残影',reducedDrop.dropped.lagFills===0,reducedDrop);
 const reducedHurt=await hurtFrame(page);
 report.measurements.reducedHurt=reducedHurt;
 ok('减少档下掉血仍画红晕（静态提示保留）',reducedHurt.hurt.gradients===reducedHurt.calm.gradients+1,reducedHurt);
 // 减少 → 跟随系统（绕回起点）
 await row.getByRole('button').click();await page.waitForTimeout(200);
 const back=await label();
 const backAttr=await page.evaluate(()=>document.documentElement.dataset.motion);
 ok('三档循环回到跟随系统',back===MOTION_LABELS[FOLLOW],{back,backAttr});
 // 重载后仍保持「减少」：从跟随系统再绕两档回到减少（follow → 完整 → 减少）。
 await row.getByRole('button').click();await page.waitForTimeout(200);
 await row.getByRole('button').click();await page.waitForTimeout(200);
 const beforeReload=await label();
 const beforeReloadAttr=await page.evaluate(()=>document.documentElement.dataset.motion);
 ok('绕一圈后重新停在「减少」',beforeReload===MOTION_LABELS[MOTION_REDUCED]&&beforeReloadAttr==='reduced',{beforeReload,beforeReloadAttr});
 await page.reload();
 await page.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 const persisted=await page.evaluate(()=>({live:window.__FANREN__.save.settings.motion,attr:document.documentElement.dataset.motion}));
 ok('重载后仍保持「减少」且判据已重算',persisted.live===MOTION_REDUCED&&persisted.attr==='reduced',persisted);
 await enterBattle(page);
 const afterReloadKill=await killOne(page);
 ok('重载后减少档仍然不请求顿帧',afterReloadKill.dead&&afterReloadKill.freeze===0,afterReloadKill);
 const afterReloadDrop=await dropFrame(page);
 ok('重载后减少档仍然不留残影',afterReloadDrop.dropped.lagFills===0,afterReloadDrop);
 // 标题与更新日志首行
 const meta=await page.evaluate(()=>({title:document.title}));
 ok('标题带当前版本',meta.title.endsWith(GAME_VERSION),meta);
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
fs.writeFileSync(OUT+'presentation-ui-report.json',JSON.stringify(report,null,2));
console.log('\n'+(report.checks.length-failed.length)+' / '+report.checks.length+' 通过，页面异常 '+report.errors.length+'，外部请求 '+report.external.length);
if(report.errors.length)console.log(report.errors.join('\n'));
if(report.external.length)console.log(report.external.slice(0,5).join('\n'));
process.exit(failed.length||report.errors.length||report.external.length?1:0);
