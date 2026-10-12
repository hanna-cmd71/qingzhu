/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.3 表现与美术品质 界面核对（headless Playwright，离线 HTML）：
// 1. 画质档「完整」时，特效真的走了加色混合（globalCompositeOperation='lighter'）；
// 2. 画质档「精简」时，同一套特效一笔加色描边都不画——证明开关真的在管画面，而不只是画了个按钮；
// 3. 设置页有「画面特效」档位，说明文字与数据同源，切换后写入存档并能在重载后保留；
// 4. 标题与更新日志首行都带当前版本；
// 5. 战斗照常推进，0 页面异常、0 外部请求。
// 用法：PLAYWRIGHT_CHROMIUM_EXECUTABLE=<chrome> QINGZHU_ASSET_PROFILE=<optimized|png> node scripts/effects-browser.mjs
import {launchBrowser,qaOutput,qaFile,htmlPath,variant} from './browser-runtime.mjs';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {GAME_VERSION} from '../gameplay/version.js';
import {GLOW} from '../gameplay/effects.js';
const html=process.argv[2]||htmlPath;
const OUT=qaFile(qaOutput('effects-ui'),'.');fs.mkdirSync(OUT,{recursive:true});
const report={variant,html,version:GAME_VERSION,checks:[],errors:[],external:[],measurements:{}};
const ok=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' · '+JSON.stringify(detail).slice(0,300):''));};
const browser=await launchBrowser();
const url=pathToFileURL(html).href+'?test=1';
// 页面侧探针：统计一次 draw 里有多少笔走了加色混合。计数器在同一个同步调用里清零再重画，
// 所以测到的正好是「这一次 draw」的量，不会被 requestAnimationFrame 的其它帧混进来。
// 同一套特效（清空飞剑／笔画／合体，避免它们的尾迹混进计数）用同一个函数画两遍，两档才可比。
const installProbe=page=>page.addInitScript(()=>{
 const state={lighterStrokes:0,lighterFills:0,strokes:0};
 window.__QZ_BLEND__=state;
 const proto=CanvasRenderingContext2D.prototype,stroke=proto.stroke,fill=proto.fill;
 proto.stroke=function(...a){state.strokes++;if(this.globalCompositeOperation==='lighter')state.lighterStrokes++;return stroke.apply(this,a);};
 proto.fill=function(...a){if(this.globalCompositeOperation==='lighter')state.lighterFills++;return fill.apply(this,a);};
 window.__QZ_PAINT__=()=>{
  const b=window.__FANREN__.battle,p=b.player;
  b.swords=[];b.sweep=null;b.fusion=null;b.fx.length=0;
  b.fx.push({kind:'ring',x:p.x,y:p.y,r:60,color:'#f4daa0',ttl:.4,max:.4});
  b.fx.push({kind:'fusionSlash',x:p.x,y:p.y,r:80,angle:0,color:'#d6ecff',ttl:.3,max:.3});
  b.fx.push({kind:'sigilBurst',x:p.x+60,y:p.y,r:50,color:'#ffbd78',ttl:.6,max:.6});
  b.fx.push({kind:'carveBurst',x:p.x-60,y:p.y,r:55,color:'#d8ecff',ttl:.45,max:.45});
  b.fx.push({kind:'bolt',x:p.x+120,y:p.y,ttl:.4,max:.4,color:'#ffeaae',seed:.42});
  b.fx.push({kind:'thunder',x:p.x,y:p.y,ttl:.8,max:.8});
  b.fx.push({kind:'line',x:p.x,y:p.y,tx:p.x+90,ty:p.y-40,color:'#d8ffe9',ttl:.22,max:.22});
  b.fx.push({kind:'afterimage',x:p.x-30,y:p.y,ttl:.2,max:.2});
  state.lighterStrokes=0;state.lighterFills=0;state.strokes=0;
  window.__FANREN__.render();
  return {lighterStrokes:state.lighterStrokes,lighterFills:state.lighterFills,strokes:state.strokes};
 };
});
const enterBattle=async(page,run={mode:'seed',path:0,seed:'effects-ui',difficulty:1,skipPractice:true})=>{
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
// 只改这一次测量用的档位，持久化另有下面的设置页检查。改完立刻还原。
const paintAt=async(page,quality)=>page.evaluate(q=>{const s=window.__FANREN__.save.settings,was=s.quality;s.quality=q;try{return window.__QZ_PAINT__();}finally{s.quality=was;}},quality);
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
 await installProbe(page);
 page.on('pageerror',e=>report.errors.push('desktop: '+String(e.message)));
 page.on('request',r=>{const u=r.url();if(!/^(file|data|blob):/.test(u))report.external.push(u);});
 await page.goto(url);
 await enterBattle(page);
 // 完整档：同一套特效必须真的出现加色描边。
 const full=await paintAt(page,1);
 report.measurements.full=full;
 ok('完整档下特效真的走了加色混合',full.lighterStrokes>0,full);
 // 精简档：同一套特效一笔加色都不画。
 const lite=await paintAt(page,0);
 report.measurements.lite=lite;
 ok('精简档下同一套特效一笔加色都不画',lite.lighterStrokes===0&&lite.lighterFills===0,lite);
 ok('精简档只是去掉光晕，特效本身照常描边',lite.strokes>0&&full.strokes>lite.strokes,{full:full.strokes,lite:lite.strokes});
 // 设置页档位：存在、与数据同源、切换写入存档、重载后保留。
 await openSettings(page);
 const row=page.locator('.toggle-line').filter({hasText:'画面特效'});
 ok('设置页有「画面特效」档位',await row.count()===1,{rows:await row.count()});
 const labelBefore=(await row.getByRole('button').textContent())?.trim();
 const explanation=await page.locator('.settings-grid').innerText();
 ok('画面特效说明与数据同源',explanation.includes('画面特效')&&explanation.includes(String(Object.keys(GLOW).length)),{kinds:Object.keys(GLOW).length});
 const before=await page.evaluate(()=>window.__FANREN__.save.settings.quality);
 await row.getByRole('button').click();
 await page.waitForTimeout(150);
 const labelAfter=(await row.getByRole('button').textContent())?.trim();
 const after=await page.evaluate(()=>({live:window.__FANREN__.save.settings.quality,stored:JSON.parse(localStorage.getItem('fanren-qingzhu-v1')).settings.quality}));
 ok('切到精简后写入存档',before===1&&after.live===0&&after.stored===0&&labelBefore!==labelAfter,{before,labelBefore,labelAfter,...after});
 await page.screenshot({path:OUT+'effects-settings-'+variant+'.png'});
 await page.reload();
 await page.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 const persisted=await page.evaluate(()=>window.__FANREN__.save.settings.quality);
 ok('重载后仍保持精简',persisted===0,{persisted});
 await enterBattle(page);
 const persistedDraw=await paintAt(page,persisted);
 ok('重载后精简档依然不画加色',persistedDraw.lighterStrokes===0,persistedDraw);
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
fs.writeFileSync(OUT+'effects-ui-report.json',JSON.stringify(report,null,2));
console.log('\n'+(report.checks.length-failed.length)+' / '+report.checks.length+' 通过，页面异常 '+report.errors.length+'，外部请求 '+report.external.length);
if(report.errors.length)console.log(report.errors.join('\n'));
if(report.external.length)console.log(report.external.slice(0,5).join('\n'));
process.exit(failed.length||report.errors.length||report.external.length?1:0);
