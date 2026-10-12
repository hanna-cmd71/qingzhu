/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.2 新手引导与可读性 界面核对（headless Playwright，离线 HTML）：
// 1. 全新账号进出发页会出现「新手建议」条，内容与数据层同源（目标／推荐／三步上手／机制速览）；
// 2. 「按推荐配置」真的改掉起手与难度，「不再显示」写进存档并在重载后保持；
// 3. 有正式进度、或关掉「首次机制提示」的账号不再出现建议条；
// 4. 新局在第一个节点真的发出一条机制提示（写进 notices 并落到战场文案），旧局不发；
// 5. 标题与更新日志首行都带当前版本；0 页面异常、0 外部请求。
// 用法：node scripts/guide-browser.mjs [html 路径]
import {launchBrowser,qaOutput,qaFile,htmlPath,variant} from './browser-runtime.mjs';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {GAME_VERSION} from '../gameplay/version.js';
import {GOAL_BRIEF,MECHANIC_GUIDES,STARTER_LEVELS,NEWCOMER_SEEN,TUTORIAL_SEEN,TUTORIAL_SKIP,recommendedSetup} from '../gameplay/guide.js';
import {initialSave} from '../gameplay/data.js';
const html=process.argv[2]||htmlPath;
const OUT=qaFile(qaOutput('guide'),'.');fs.mkdirSync(OUT,{recursive:true});
const report={variant,html,version:GAME_VERSION,checks:[],errors:[],external:[],measurements:{}};
const ok=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log((pass?'PASS ':'FAIL ')+name+(detail?' · '+JSON.stringify(detail).slice(0,320):''));};
const browser=await launchBrowser();
const url=pathToFileURL(html).href+'?test=1';
const setup=recommendedSetup(initialSave());
// Open the app with a prepared save (the same shape the game writes), then wait for art.
// The seed only fills an empty slot: reloads must keep whatever the game itself persisted.
const open=async(save=initialSave())=>{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(String(e.message)));
 page.on('request',r=>{if(/^https?:/.test(r.url()))report.external.push(r.url());});
 await page.addInitScript(s=>{if(!localStorage.getItem('fanren-qingzhu-v1'))localStorage.setItem('fanren-qingzhu-v1',JSON.stringify(s));},save);
 await page.goto(url);
 await page.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 return {page,context};
};
const toJourney=async page=>{
 await page.getByRole('button',{name:/踏入修仙路/}).click();
 await page.waitForSelector('.journey-launch');
};
const toBattle=async(page,run={mode:'seed',path:0,seed:'guide-ui',difficulty:0,skipPractice:true})=>{
 await page.evaluate(r=>window.__FANREN__.start(r),run);
 await page.waitForTimeout(250);
 const risk=await page.evaluate(()=>window.__FANREN__.risk?{confirm:window.__FANREN__.risk.confirm}:null);
 if(risk)await page.locator('.risk-dialog').getByRole('button',{name:risk.confirm}).click();
 await page.waitForFunction(()=>window.__FANREN__.battle,null,{timeout:20000});
 await page.evaluate(()=>{const b=window.__FANREN__.battle;while(b.scene==='cinematic')b.advanceCinematic(true);if(b.modeState==='intro')b.start();while(b.scene==='cinematic')b.advanceCinematic(true);window.__FANREN__.step(1);});
 await page.waitForTimeout(300);
};
try{
 // ---------------- 全新账号：出发页新手建议 ----------------
 const fresh=await open(),page=fresh.page;
 await toJourney(page);
 const brief=await page.locator('.newcomer-brief').first();
 ok('全新账号在出发页看到新手建议条',await brief.count()===1,{count:await brief.count()});
 const goals=await page.locator('.newcomer-brief .brief-goals li').allInnerTexts();
 const steps=await page.locator('.newcomer-brief .brief-steps li').allInnerTexts();
 const recommend=await page.locator('.newcomer-brief .brief-recommend').innerText();
 // The list lives inside a collapsed <details>, so read textContent rather than innerText.
 const mechanics=await page.locator('.newcomer-brief .brief-mechanics li').evaluateAll(els=>els.map(el=>el.textContent.trim()));
 report.measurements.brief={goals,steps,recommend,mechanics};
 ok('目标条目与数据层同源',goals.length===GOAL_BRIEF.points.length&&GOAL_BRIEF.points.every(text=>goals.includes(text)),goals);
 ok('推荐配置写明起手／难度与理由',/御剑/.test(recommend)&&/初入仙途/.test(recommend)&&recommend.includes(setup.reason),recommend);
 ok('三步上手用当前键位（默认空格／E）',steps.length===3&&/空格/.test(steps[1])&&/\bE\b/.test(steps[1]),steps);
 ok('机制速览列出练习没讲到的系统',mechanics.length>0&&mechanics.length<=MECHANIC_GUIDES.length&&mechanics.every(t=>t.length>0),mechanics);
 ok('机制速览默认收起，不挤占正文',await page.locator('.newcomer-brief .brief-mechanics').evaluate(n=>!n.open),null);
 const levels=await page.locator('.path-card .starter-complexity').allInnerTexts();
 report.measurements.levels=levels;
 ok('六起手都显示上手难度评级',levels.length===STARTER_LEVELS.length&&STARTER_LEVELS.every((l,i)=>levels[i].startsWith(l.level)),levels);
 // 先把起手与难度改到非推荐值，再点「按推荐配置」，验证它真的改回来。
 await page.locator('.path-card').nth(5).click();
 await page.locator('select[aria-label="当前难度"]').selectOption('2');
 await page.waitForTimeout(120);
 const beforeApply=await page.evaluate(()=>({starter:document.querySelector('.launch-selection strong')?.innerText,difficulty:document.querySelector('select[aria-label="当前难度"]')?.value}));
 await page.locator('.newcomer-brief').getByRole('button',{name:'按推荐配置'}).click();
 await page.waitForTimeout(200);
 const afterApply=await page.evaluate(()=>({starter:document.querySelector('.launch-selection strong')?.innerText,difficulty:document.querySelector('select[aria-label="当前难度"]')?.value}));
 report.measurements.apply={beforeApply,afterApply};
 ok('「按推荐配置」真的改掉起手与难度',beforeApply.starter!==afterApply.starter&&afterApply.difficulty===String(setup.difficulty)&&afterApply.starter.includes('御剑'),{beforeApply,afterApply});
 await page.screenshot({path:OUT+'newcomer-'+variant+'.png'});
 // 「不再显示」写进存档
 await page.locator('.newcomer-brief').getByRole('button',{name:'不再显示新手建议'}).click();
 await page.waitForTimeout(200);
 const stored=await page.evaluate(()=>({live:window.__FANREN__.save.guidesSeen||[],disk:(JSON.parse(localStorage.getItem('fanren-qingzhu-v1')).guidesSeen||[])}));
 ok('「不再显示」写入存档',stored.live.includes(NEWCOMER_SEEN)&&stored.disk.includes(NEWCOMER_SEEN),stored);
 await page.reload();
 await page.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 await toJourney(page);
 ok('重载后不再出现新手建议条',await page.locator('.newcomer-brief').count()===0,{count:await page.locator('.newcomer-brief').count()});
 // ---------------- 新局：引擎一次性机制提示 ----------------
 await toBattle(page);
 const first=await page.evaluate(()=>({notices:[...window.__FANREN__.battle.notices],cues:window.__FANREN__.battle.combatCues.map(c=>({key:c.key,text:c.text}))}));
 report.measurements.firstNode=first;
 const guideNotices=first.notices.filter(id=>id.startsWith('guide-'));
 ok('新局在第一个节点发出且只发一条机制提示',guideNotices.length===1,guideNotices);
 ok('提示真的落到战场文案上',first.cues.length===1&&first.cues[0].key===guideNotices[0]&&first.cues[0].text.length>0,first.cues);
 await page.screenshot({path:OUT+'battle-tip-'+variant+'.png'});
 await fresh.context.close();
 // ---------------- 有正式进度：不再显示建议条 ----------------
 const veteran=await open({...initialSave(),wins:3});
 await toJourney(veteran.page);
 ok('已有胜局的账号不再看到新手建议条',await veteran.page.locator('.newcomer-brief').count()===0,{count:await veteran.page.locator('.newcomer-brief').count()});
 await veteran.context.close();
 // ---------------- 关闭「首次机制提示」 ----------------
 const off=await open({...initialSave(),settings:{...initialSave().settings,tips:false}});
 await toJourney(off.page);
 ok('关闭「首次机制提示」后出发页不显示建议条',await off.page.locator('.newcomer-brief').count()===0,{count:await off.page.locator('.newcomer-brief').count()});
 await toBattle(off.page);
 const offNotices=await off.page.evaluate(()=>[...window.__FANREN__.battle.notices].filter(id=>id.startsWith('guide-')));
 ok('关闭后引擎不再发机制提示',offNotices.length===0,offNotices);
 await off.context.close();
 // ---------------- 设置页开关存在且默认开启 ----------------
 const settings=await open(),sp=settings.page;
 await sp.getByRole('button',{name:/设置/}).first().click();
 await sp.waitForSelector('.settings-grid');
 const row=sp.locator('.toggle-line').filter({hasText:'首次机制提示'});
 ok('设置页有「首次机制提示」开关且默认开启',await row.count()===1&&(await row.locator('button').innerText())==='开启',{rows:await row.count(),state:await row.locator('button').innerText().catch(()=>null)});
 await row.locator('button').click();
 await sp.waitForTimeout(150);
 const persisted=await sp.evaluate(()=>({live:window.__FANREN__.save.settings.tips,stored:JSON.parse(localStorage.getItem('fanren-qingzhu-v1')).settings.tips}));
 ok('关闭开关后写入存档',persisted.live===false&&persisted.stored===false,persisted);
 await sp.reload();
 await sp.waitForFunction(()=>window.__FANREN__?.art,null,{timeout:60000});
 ok('重载后仍保持关闭',await sp.evaluate(()=>window.__FANREN__.save.settings.tips)===false,null);
 const meta=await sp.evaluate(()=>({title:document.title}));
 ok('标题带当前版本',meta.title.endsWith(GAME_VERSION),meta);
 await settings.context.close();
 // ---------------- 开局教程：全新账号点启程直接进教学局 ----------------
 const tut=await open(),tp=tut.page;
 await toJourney(tp);
 const tutLabel=(await tp.locator('.journey-launch .primary-start').innerText()).trim();
 ok('待触发时出发按钮写明「先学操作」',/先学操作/.test(tutLabel),{tutLabel});
 await tp.locator('.journey-launch .primary-start').click();
 await tp.locator('.practice-panel').waitFor({timeout:20000});
 const entered=await tp.evaluate(()=>{const b=window.__FANREN__.battle,raw=localStorage.getItem('fanren-qingzhu-v1');return {mode:b.mode,guided:!!b.options.guidedPractice,step:b.practice?.step,offerDialogs:document.querySelectorAll('.practice-offer').length,checkpoint:raw?!!JSON.parse(raw).checkpoint:false};});
 report.measurements.tutorialEnter=entered;
 ok('全新账号点启程直接进入开局教程（不再先弹询问框）',entered.mode==='training'&&entered.guided&&entered.step===0&&entered.offerDialogs===0,entered);
 ok('教程局不写正式续玩',entered.checkpoint===false,entered);
 const tutButtons=await tp.locator('.practice-panel button').allInnerTexts();
 ok('教程面板给出跳过入口，且不再出现「返回出发配置」',tutButtons.some(t=>/跳过教程/.test(t))&&!tutButtons.some(t=>/返回出发配置/.test(t)),tutButtons);
 await tp.screenshot({path:OUT+'tutorial-'+variant+'.png'});
 // 跳过：直接开始正式历练，不再回出发页点第二次。
 await tp.getByRole('button',{name:TUTORIAL_SKIP}).click();
 await tp.waitForFunction(()=>{const b=window.__FANREN__.battle;return b&&b.mode!=='training';},null,{timeout:20000});
 await tp.waitForTimeout(300);
 const skipped=await tp.evaluate(()=>{const b=window.__FANREN__.battle,raw=JSON.parse(localStorage.getItem('fanren-qingzhu-v1'));return {mode:b.mode,practice:!!b.practice,checkpoint:!!raw.checkpoint,guides:raw.guidesSeen||[]};});
 report.measurements.tutorialSkip=skipped;
 ok('跳过教程后直接开始正式历练',skipped.mode!=='training'&&skipped.practice===false&&skipped.checkpoint===true,skipped);
 ok('跳过即记下 practice-v1，不会重复触发',skipped.guides.includes(TUTORIAL_SEEN),skipped.guides);
 await tut.context.close();
 // ---------------- 走完教程：自动接上正式历练 ----------------
 const walk=await open(),wp=walk.page;
 await toJourney(wp);
 await wp.locator('.journey-launch .primary-start').click();
 await wp.locator('.practice-panel').waitFor({timeout:20000});
 for(let i=0;i<12;i++){
  const at=await wp.evaluate(()=>{const b=window.__FANREN__.battle;if(!b?.practice)return null;const total=b.path===4||b.path===5?6:5;return {step:b.practice.step,last:b.practice.step>=total-1};});
  if(!at)break;
  await wp.evaluate(()=>{const b=window.__FANREN__.battle;if(b.practice){b.practice.ready=true;b.emit({type:'update'});}});
  await wp.locator('.practice-panel button').last().click();
  await wp.waitForTimeout(200);
  if(at.last)break;
 }
 await wp.waitForFunction(()=>{const b=window.__FANREN__.battle;return b&&b.mode!=='training';},null,{timeout:20000});
 await wp.waitForTimeout(300);
 const walked=await wp.evaluate(()=>{const b=window.__FANREN__.battle,raw=JSON.parse(localStorage.getItem('fanren-qingzhu-v1'));return {mode:b.mode,practice:!!b.practice,checkpoint:!!raw.checkpoint};});
 report.measurements.tutorialWalk=walked;
 ok('走完教程后自动接上正式历练',walked.mode!=='training'&&walked.practice===false&&walked.checkpoint===true,walked);
 await walk.context.close();
 // ---------------- 看过的账号不再被拦 ----------------
 const seen=await open({...initialSave(),guidesSeen:[TUTORIAL_SEEN]}),kp=seen.page;
 await toJourney(kp);
 const seenLabel=(await kp.locator('.journey-launch .primary-start').innerText()).trim();
 ok('看过的账号出发按钮不再写「先学操作」',!/先学操作/.test(seenLabel),{seenLabel});
 await kp.locator('.journey-launch .primary-start').click();
 await kp.waitForFunction(()=>{const b=window.__FANREN__.battle;return b&&b.mode!=='training';},null,{timeout:20000});
 ok('看过的账号点启程直接进正式历练，不被教程拦截',await kp.evaluate(()=>!!window.__FANREN__.battle.practice)===false,null);
 await seen.context.close();
 // ---------------- 更新日志首行 ----------------
 const changes=await open(),cp=changes.page;
 await cp.getByRole('button',{name:/更新日志/}).click();
 const text=(await cp.getByLabel('更新日志正文').innerText()).trim();
 report.measurements.changelog=text.split('\n').slice(0,3);
 ok('更新日志首行是当前版本',text.split('\n')[0].trim().startsWith(GAME_VERSION),{first:text.split('\n')[0]});
 await changes.context.close();
}finally{await browser.close();}
const failed=report.checks.filter(c=>!c.pass);
fs.writeFileSync(OUT+'guide-report.json',JSON.stringify(report,null,2));
console.log('\n'+(report.checks.length-failed.length)+' / '+report.checks.length+' 通过，页面异常 '+report.errors.length+'，外部请求 '+report.external.length);
if(report.errors.length)console.log(report.errors.join('\n'));
process.exit(failed.length||report.errors.length||report.external.length?1:0);
