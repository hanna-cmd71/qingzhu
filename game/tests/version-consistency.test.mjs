/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.5 收口：版本标记一致性守卫。
// 2.2→2.3 升版时漏改过 `青竹剑阵_游玩说明.md` 四处与 `docs/licensing.md`，2.4→2.5 又漏过 publishing.md 的附件名。
// 这些漏改不会让任何用例变红，只会在发布时被人发现。这里把「当前版本」的每一处标记都钉在 GAME_VERSION 上。
// 只匹配无歧义的标记（`适用版本：**X.Y**`、`显示升级为 X.Y` 等），不去猜正文里的「2.4 秒」这类数字。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAME_VERSION, GAME_ARC} from '../gameplay/version.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const [major,minor]=GAME_VERSION.split('.').map(Number);
const previous=`${major}.${minor-1}`;

void test('版本号格式与上一版推导可用',()=>{
 assert.match(GAME_VERSION,/^\d+\.\d+$/,'显示版本必须是 X.Y');
 assert.ok(minor>0,'本守卫靠 minor-1 推导上一版，minor 为 0 时要先改这里');
 assert.equal(previous,`${major}.${minor-1}`);
});

void test('包版本与显示版本同步，且依赖锁文件只改根包',()=>{
 const pkg=JSON.parse(read('game/package.json'));
 assert.equal(pkg.version,GAME_VERSION+'.0','包版本必须是显示版本加 .0');
 const lock=JSON.parse(read('game/package-lock.json'));
 assert.equal(lock.version,pkg.version,'锁文件根版本要与包版本一致');
 assert.equal(lock.packages[''].version,pkg.version,'锁文件 packages[""] 也要一致');
});

void test('AGENTS.md 与 docs 的当前版本标记都指向 GAME_VERSION',()=>{
 const agents=read('AGENTS.md');
 assert.ok(agents.includes(`当前游戏 **${GAME_VERSION}**`),'AGENTS.md 的当前游戏版本');
 assert.ok(agents.includes(`包版本为 ${GAME_VERSION}.0`),'AGENTS.md 的包版本');
 assert.ok(agents.includes(`发布标签 v${GAME_VERSION}`),'AGENTS.md 的发布标签');

 const compatibility=read('docs/compatibility.md');
 assert.ok(compatibility.includes(`当前游戏显示版本为 **${GAME_VERSION}**`),'docs/compatibility.md 的当前版本');

 const publishing=read('docs/publishing.md');
 assert.ok(publishing.includes(`# GitHub 发布步骤 · ${GAME_VERSION}`),'发布步骤标题');
 assert.ok(publishing.includes(`当前版本 ${GAME_VERSION}`),'发布步骤正文版本');
 assert.ok(publishing.includes(`发布标签 \`v${GAME_VERSION}\``),'发布标签');
 for(const name of [`qingzhu-${GAME_VERSION}.html`,`qingzhu-${GAME_VERSION}-png.html`,`qingzhu-${GAME_VERSION}-source.zip`,`qingzhu-${GAME_VERSION}-player.zip`])assert.ok(publishing.includes(name),'发布附件名 '+name);
 assert.ok(publishing.includes(`release/${GAME_VERSION}/`),'发布目录 release/'+GAME_VERSION+'/');

 const licensing=read('docs/licensing.md');
 assert.ok(licensing.includes(`青竹剑阵 · ${GAME_ARC} ${GAME_VERSION}`),'授权页的篇名与版本');
 assert.ok(licensing.includes(`qingzhu-${GAME_VERSION}-source.zip`),'授权页的源码包名');
 assert.ok(licensing.includes(`releases/tag/v${GAME_VERSION}`),'授权页的发布页链接');
});

void test('README 与玩家可见文档的版本标记都指向 GAME_VERSION',()=>{
 assert.ok(read('README.md').includes(`**${GAME_VERSION}** · 离线像素御剑同人游戏`),'根 README 的版本行');
 assert.ok(read('README.md').includes(`\`release/${GAME_VERSION}/\``),'根 README 的发布目录');
 assert.ok(read('game/README.md').includes(`游戏版本 **${GAME_VERSION}**`),'game/README 的版本行');

 const guide=read('青竹剑阵_游玩说明.md');
 assert.ok(guide.includes(`适用版本：**${GAME_VERSION}**`),'游玩说明的适用版本');
 assert.ok(guide.includes(`青竹剑阵_${GAME_VERSION}_免安装版.zip`),'游玩说明的免安装包名');
 assert.ok(guide.includes(`显示升级为 ${GAME_VERSION} 不清空存档`),'游玩说明的旧局规则行');
 assert.ok(guide.includes(`${GAME_VERSION} 采用自动测试`),'游玩说明的验收行');
});

void test('更新日志首行是当前版本、次行是上一版，逐版倒序',()=>{
 const lines=read('青竹剑阵_更新日志.md').split('\n').map(l=>l.trim()).filter(Boolean);
 assert.ok(lines[0].startsWith(GAME_VERSION+' '),'更新日志首行必须是当前版本，实际是「'+lines[0]+'」');
 assert.ok(lines[1].startsWith(previous+' '),'更新日志次行必须是上一版，实际是「'+lines[1]+'」');
 // 逐版倒序：相邻两行版本号必须正好差 0.1，且不允许出现同一版本两次。
 const seen=new Set();
 for(let i=0;i<lines.length;i++){
  const match=/^(\d+\.\d+)\s/.exec(lines[i]);
  assert.ok(match,'更新日志第 '+(i+1)+' 行必须以「X.Y 标题」开头：「'+lines[i]+'」');
  assert.ok(!seen.has(match[1]),'更新日志里 '+match[1]+' 出现了两次');
  seen.add(match[1]);
  if(i>0){
   const [maj,min]=match[1].split('.').map(Number),expected=`${maj}.${min+1}`;
   assert.equal(lines[i-1].split(' ')[0],expected,'第 '+(i+1)+' 行之后必须是它的上一版 '+expected);
  }
 }
 assert.ok(seen.has(previous),'更新日志必须保留上一版那一行');
});

void test('没有任何一处仍把上一版当作当前版本',()=>{
 // 上一版可以作为历史保留（例如「1.0 的续玩在 2.0 中继续可用」），但不能出现在「当前」语义的标记里。
 const stale=[
  ['AGENTS.md',[`当前游戏 **${previous}**`,`发布标签 v${previous}`]],
  ['docs/compatibility.md',[`当前游戏显示版本为 **${previous}**`]],
  ['docs/publishing.md',[`# GitHub 发布步骤 · ${previous}`,`当前版本 ${previous}`,`发布标签 \`v${previous}\``,`release/${previous}/`,`qingzhu-${previous}-`]],
  ['docs/licensing.md',[`${GAME_ARC} ${previous}`,`qingzhu-${previous}-source.zip`]],
  ['README.md',[`**${previous}** · 离线像素御剑同人游戏`,`\`release/${previous}/\``]],
  ['game/README.md',[`游戏版本 **${previous}**`]],
  ['青竹剑阵_游玩说明.md',[`适用版本：**${previous}**`,`青竹剑阵_${previous}_免安装版.zip`,`显示升级为 ${previous} `,`${previous} 采用自动测试`]],
 ];
 for(const [file,patterns] of stale){
  const text=read(file);
  for(const pattern of patterns)assert.ok(!text.includes(pattern),file+' 里还留着上一版的当前标记：'+pattern);
 }
});
