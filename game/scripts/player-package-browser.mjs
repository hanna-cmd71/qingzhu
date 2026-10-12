/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {unzipSync} from 'fflate';
import {root} from './release-files.mjs';
import {launchBrowser} from './browser-runtime.mjs';
import {waitForText} from './browser-assertions.mjs';
import {GAME_VERSION} from '../gameplay/version.js';
import {artifactPath} from './delivery-paths.mjs';
const folder='青竹剑阵_'+GAME_VERSION+'_免安装版',temp=fs.mkdtempSync(path.join(os.tmpdir(),'qingzhu-player-'));
const files=unzipSync(fs.readFileSync(artifactPath(folder+'.zip')));
for(const [name,bytes]of Object.entries(files)){const target=path.resolve(temp,name);assert.ok(target.startsWith(temp+path.sep));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
const out=path.join(root,'game/qa/release/player-package');fs.mkdirSync(out,{recursive:true});
const report={version:GAME_VERSION,archive:folder+'.zip',method:'Extract actual player ZIP; launch file URLs in offline Chromium with fresh browser contexts, normal UI and no debug API.',checks:[],errors:[],externalRequests:[]},browser=await launchBrowser();
try{
 for(const [label,width,height]of [['desktop',1440,900],['phone',390,844]]){
  const context=await browser.newContext({offline:true,viewport:{width,height},hasTouch:true}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))report.externalRequests.push(r.url());});
  await page.goto(pathToFileURL(path.join(temp,folder,'开始游戏.html')).href);
  await page.getByRole('button',{name:/踏入修仙路/}).waitFor();assert.equal(await page.evaluate(()=>typeof window.__FANREN__),'undefined');assert.ok((await page.title()).endsWith(GAME_VERSION));
  await page.getByRole('button',{name:/踏入修仙路/}).click();await page.locator('.journey-launch .primary-start').click();
  // 全新账号点「启程」会直接进入开局教程；这里跳过它，验证跳过之后确实接上正式历练。
  await page.locator('.practice-panel').waitFor();await page.getByRole('button',{name:'跳过教程，直接开始历练'}).click();
  await page.locator('.scene-intro,.scene-cinematic').first().waitFor();
  for(let i=0;i<6;i++){
   if(await page.locator('.scene-intro').isVisible())await page.locator('.scene-intro .primary-start').click();
   else if(await page.locator('.scene-cinematic').isVisible())await page.getByRole('button',{name:'跳过过场',exact:true}).click();else break;
   await page.waitForTimeout(200);
  }
  assert.equal(await page.locator('.scene-intro,.scene-cinematic').count(),0);await page.locator('.dash-button').waitFor();
  await page.keyboard.down('d');await page.waitForTimeout(300);await page.keyboard.press('Space');await page.keyboard.up('d');await waitForText(page.locator('.dash-button'),/s|已闪避|冷却/);
  await page.screenshot({path:path.join(out,label+'-battle.png')});await page.keyboard.press('Escape');await page.locator('.scene-pause').waitFor();
  const raw=await page.evaluate(()=>localStorage.getItem('fanren-qingzhu-v1'));assert.ok(raw&&JSON.parse(raw).checkpoint);
  await page.reload();await page.getByRole('button',{name:/^继续历练/}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('fanren-qingzhu-v1')),raw);
  report.checks.push({entry:'开始游戏.html',viewport:label,width,height,offline:true,normalLaunch:true,movementAndDash:true,pause:true,saveSurvivesReload:true});await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
}catch(error){report.failure=String(error.stack);throw error;}finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
