/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.1 手感层 界面核对（headless Playwright，离线 HTML）：
// 1. 设置页有「命中顿帧」开关，说明文案由规则生成，切换后写入存档并能在重载后保留；
// 2. 击杀真的会请求一次冻结，关闭开关后不再请求（证明开关是有效的，不只是画了个按钮）；
// 3. 标题与更新日志首行都带当前版本；
// 4. 战斗照常推进，0 页面异常。
// 用法：node qa/feel-ui-browser.mjs [html 路径]
import {launchBrowser,qaOutput,qaFile,htmlPath,variant} from './browser-runtime.mjs';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {GAME_VERSION} from '../gameplay/version.js';
import {HITSTOP} from '../gameplay/feel.js';
const html=process.argv[2]||htmlPath;
const OUT=qaFile(qaOutput('feel-ui'),'.');fs.mkdirSync(OUT,{recursive:true});
const report={variant,html,version:GAME_VERSION,checks:[],errors:[],measurements:{}};
const ok=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' · '+JSON.stringify(detail).slice(0,300):''));};
const browser=await launchBrowser();
const url=pathToFileURL(html).href+'?test=1';
const enterBattle=async(page,run={mode:'seed',path:0,seed:'feel-ui',difficulty:1,skipPractice:true})=>{
 await page.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 await page.evaluate(r=>window.__FANREN__.start(r),run);
 await page.waitForTimeout(200);
 const risk=await page.evaluate(()=>window.__FANREN__.risk?{confirm:window.__FANREN__.risk.confirm}:null);
 if(risk)await page.locator('.risk-dialog').getByRole('button',{name:risk.confirm}).click();
 await page.waitForFunction(()=>window.__FANREN__.battle,null,{timeout:20000});
 await page.evaluate(()=>{const b=window.__FANREN__.battle;while(b.scene==='cinematic')b.advanceCinematic(true);if(b.modeState==='intro')b.start();while(b.scene==='cinematic')b.advanceCinematic(true);window.__FANREN__.step(1);});
 await page.waitForTimeout(400);
};
const openSettings=async page=>{
 await page.evaluate(()=>{const b=window.__FANREN__.battle;if(b&&b.modeState==='battle')b.pause();});
 await page.getByRole('button',{name:'音画与操控设置'}).click();
 await page.waitForSelector('.settings-grid');
};
const killOne=page=>page.evaluate(()=>{
 const b=window.__FANREN__.battle;
 const e=b.spawn(0,{hp:1,x:b.player.x+40,y:b.player.y,speed:0});
 b.rebuildHash();
 b.hit(e,999,'sword',false);
 return {freeze:window.__FANREN__.freeze.left,dead:e.hp<=0};
});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push('desktop: '+String(e.message)));
 await page.goto(url);
 await enterBattle(page);
 // 击杀请求一次冻结
 const first=await killOne(page);
 report.measurements.killFreeze=first;
 ok('击杀真的请求了一次顿帧',first.dead&&first.freeze>0&&first.freeze<=HITSTOP.kill+1e-9,first);
 // 开关默认开启，且能在设置页关闭并持久化
 await openSettings(page);
 const row=page.locator('.toggle-line').filter({hasText:'命中顿帧'});
 ok('设置页有「命中顿帧」开关',await row.count()===1,{rows:await row.count()});
 ok('顿帧说明来自同一张表',/命中顿帧/.test(await page.locator('.settings-grid').innerText()),{});
 const before=await page.evaluate(()=>window.__FANREN__.save.settings.hitstop);
 await row.getByRole('button').click();
 await page.waitForTimeout(150);
 const after=await page.evaluate(()=>({live:window.__FANREN__.save.settings.hitstop,stored:JSON.parse(localStorage.getItem('fanren-qingzhu-v1')).settings.hitstop}));
 ok('关闭开关后写入存档',before===true&&after.live===false&&after.stored===false,{before,...after});
 await page.screenshot({path:OUT+'feel-settings-'+variant+'.png'});
 // 重载后保留
 await page.reload();
 await page.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 const persisted=await page.evaluate(()=>window.__FANREN__.save.settings.hitstop);
 ok('重载后仍保持关闭',persisted===false,{persisted});
 await enterBattle(page);
 const off=await killOne(page);
 ok('关闭后击杀不再请求顿帧',off.dead&&off.freeze===0,off);
 // 标题与更新日志首行
 const meta=await page.evaluate(()=>({title:document.title}));
 ok('标题带当前版本',meta.title.endsWith(GAME_VERSION),meta);
 await context.close();
 // 更新日志首行
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
fs.writeFileSync(OUT+'feel-ui-report.json',JSON.stringify(report,null,2));
console.log('\n'+(report.checks.length-failed.length)+' / '+report.checks.length+' 通过，页面异常 '+report.errors.length);
if(report.errors.length)console.log(report.errors.join('\n'));
process.exit(failed.length||report.errors.length?1:0);
