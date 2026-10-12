/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.2 山门重制：核对标题装饰、章节进度、署名与氛围层。只读 DOM，不改存档。
import {launchBrowser,offlineURL,qaOutput,qaFile} from './browser-runtime.mjs';
import {initialSave} from '../gameplay/data.js';
import {TUTORIAL_BADGE,TUTORIAL_DONE} from '../gameplay/guide.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const out=qaOutput('home'),report={method:'isolated Chrome, DOM reads only',checks:[],errors:[],external:[]};
const browser=await launchBrowser();
const CREDIT='制作人：hanner-cmd71';

async function open(w,h,save){
  const context=await browser.newContext({viewport:{width:w,height:h}});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))report.external.push(r.url());});
  await page.addInitScript(v=>localStorage.setItem('fanren-qingzhu-v1',JSON.stringify(v)),{...save,guidesSeen:['practice-v1','welcome-v1']});
  await page.goto(offlineURL());
  await page.waitForFunction(()=>window.__FANREN__?.art);
  await page.waitForTimeout(900);
  return {page,context};
}
const check=(name,value,detail)=>{report.checks.push({name,pass:!!value,detail});assert.ok(value,name+(detail?' · '+detail:''));};

try{
 // ---------------- 宽屏：装饰与进度 ----------------
 {
  const save={...initialSave(),unlocked:3,completed:[0,1,2]};
  const {page,context}=await open(1280,800,save);
  const panel=await page.locator('.title-panel').count();
  check('标题块存在',panel===1,String(panel));

  const rule=await page.locator('.title-rule i').boundingBox();
  check('分隔线带菱形节点',rule&&rule.width>=6&&rule.height>=6,JSON.stringify(rule));

  const mark=await page.locator('.title-mark').evaluate(e=>({display:getComputedStyle(e).display,h:Math.round(e.getBoundingClientRect().height)}));
  check('宽屏显示卷轴竖线',mark.display==='block'&&mark.h>80,JSON.stringify(mark));

  const glow=await page.locator('.home-glow').evaluate(e=>getComputedStyle(e).display);
  check('首页显示氛围层',glow==='block',glow);

  const head=(await page.locator('.chapter-deck .deck-head span').last().innerText()).trim();
  check('章节进度文案跟随存档',head==='已解锁 4 / 6',head);

  const progress=await page.locator('.chapter-deck').evaluate(e=>e.style.getPropertyValue('--deck-progress'));
  const expected=Math.round((save.unlocked+1)/6*100)+'%';
  check('进度条长度按解锁数计算',progress===expected,progress+' vs '+expected);

  const credit=(await page.locator('.creator-credit').innerText()).trim();
  check('页脚署名正确',credit===CREDIT,credit);

  const bar=await page.locator('.chapter-deck .chapter-rail').evaluate(e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)};});
  report.progressBar=bar;
  await context.close();
 }

 // ---------------- 全通：进度满格 ----------------
 {
  const save={...initialSave(),unlocked:5,completed:[0,1,2,3,4,5]};
  const {page,context}=await open(1280,800,save);
  const head=(await page.locator('.chapter-deck .deck-head span').last().innerText()).trim();
  check('全通文案',head==='全境已通',head);
  const progress=await page.locator('.chapter-deck').evaluate(e=>e.style.getPropertyValue('--deck-progress'));
  check('全通进度满格',progress==='100%',progress);
  await context.close();
 }

 // ---------------- 窄屏：装饰收敛、主按钮仍完全可见 ----------------
 for(const [w,h] of [[390,844],[320,280]]){
  const {page,context}=await open(w,h,initialSave());
  const mark=await page.locator('.title-mark').evaluate(e=>getComputedStyle(e).display);
  check(w+'x'+h+' 隐藏卷轴竖线',mark==='none',mark);
  const box=await page.locator('.start-actions .primary-start').boundingBox();
  if(h<300)await page.mouse.wheel(0,240);
  await page.waitForTimeout(150);
  const after=await page.locator('.start-actions .primary-start').boundingBox();
  check(w+'x'+h+' 主按钮存在且可点',after&&after.width>60&&after.height>=40,JSON.stringify(after||box));
  await context.close();
 }

 // ---------------- 氛围层不进入其它菜单页 ----------------
 {
  const {page,context}=await open(1280,800,initialSave());
  await page.locator('.start-actions .primary-start').click();
  await page.waitForSelector('.journey-launch');
  const glow=await page.locator('.home-glow').evaluate(e=>getComputedStyle(e).display);
  check('离开首页后氛围层隐藏',glow==='none',glow);
  await context.close();
 }

 // ---------------- 山门重制：秘境图前置 + 新手教程大入口 ----------------
 {
  const {page,context}=await open(1280,800,{...initialSave(),unlocked:3,completed:[0,1,2]});
  const nodes=await page.locator('.chapter-deck .chapter-tile .chapter-node').count();
  check('秘境图有六个章节节点',nodes===6,String(nodes));
  const states=await page.locator('.chapter-deck .chapter-tile').evaluateAll(es=>es.map(e=>e.className.replace('chapter-tile','').trim()));
  check('节点状态跟随存档（4 可进 · 2 未解锁）',states.filter(s=>!s.includes('locked')).length===4&&states.filter(s=>s.includes('locked')).length===2,JSON.stringify(states));
  const rail=await page.locator('.chapter-deck .chapter-rail').evaluate(e=>getComputedStyle(e).flexDirection);
  check('秘境图竖排成一张地图',rail==='column',rail);
  const title=(await page.locator('.title-panel h1').innerText()).trim();
  check('大标题收成一行，让位给地图',!title.includes('\n')&&title.length>0,JSON.stringify(title));

  // 点已解锁的一章直接进出发页并预选该章；未解锁的只提示。
  await page.locator('.chapter-deck .chapter-tile').nth(2).click();
  await page.waitForSelector('.journey-launch');
  const picked=await page.locator('.mode-row button.selected').allInnerTexts();
  check('点章节直达出发页并预选该章',picked.some(t=>/冰火险道/.test(t)),JSON.stringify(picked));
  await page.getByRole('button',{name:/返回山门/}).first().click();
  await page.waitForSelector('.home-column');
  await page.locator('.chapter-deck .chapter-tile.locked').first().click();
  await page.waitForTimeout(200);
  const toast=await page.locator('.game-toast').count();
  check('未解锁的秘境点了只提示，不跳转',toast===1&&await page.locator('.home-column').count()===1,String(toast));

  // 教程入口：没真正练过就带「推荐先学」，点进去直接是分步练习。
  const entry=(await page.locator('.tutorial-entry').innerText()).trim();
  check('山门有新手教程入口',/新手教程/.test(entry),entry);
  check('没练过时带「推荐先学」',entry.includes(TUTORIAL_BADGE),entry);
  await page.locator('.tutorial-entry').click();
  await page.waitForSelector('.practice-panel',{timeout:20000});
  const panel=(await page.locator('.practice-panel').innerText()).trim();
  check('点教程直接进分步练习（不经出发简介）',/1 \/ 5 · 移动避险/.test(panel),panel.slice(0,30));
  const label=await page.locator('.practice-panel').getAttribute('aria-label');
  check('教程态标为开局教程',label==='开局教程',String(label));

  // 跳过 -> 回山门，推荐标记消失，并记下 tutorial-v1。
  await page.getByRole('button',{name:/跳过教程/}).first().click();
  await page.waitForSelector('.home-column',{timeout:20000});
  await page.waitForTimeout(400);
  const after=(await page.locator('.tutorial-entry').innerText()).trim();
  check('跳过教程后回到山门',await page.locator('.home-column').count()===1,after);
  check('练过之后不再显示「推荐先学」',!after.includes(TUTORIAL_BADGE),after);
  const seen=await page.evaluate(()=>JSON.parse(localStorage.getItem('fanren-qingzhu-v1')).guidesSeen);
  check('练过之后写下 tutorial-v1',seen.includes(TUTORIAL_DONE),JSON.stringify(seen));
  await context.close();
 }

 check('无页面异常',report.errors.length===0,report.errors.join('|'));
 check('无外部请求',report.external.length===0,report.external.join('|'));
}finally{
 await browser.close();
}

report.passed=report.checks.filter(c=>c.pass).length;
report.total=report.checks.length;
fs.writeFileSync(qaFile(out,'home-report.json'),JSON.stringify(report,null,2)+'\n');
for(const c of report.checks)console.log((c.pass?'  PASS  ':'  FAIL  ')+c.name+(c.detail?'  ['+c.detail+']':''));
console.log('\n'+report.total+' 项 · 通过 '+report.passed+' · 失败 '+(report.total-report.passed));
process.exit(report.passed===report.total?0:1);
