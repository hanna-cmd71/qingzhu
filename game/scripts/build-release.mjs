/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {root,releaseFiles} from './release-files.mjs';
import {GAME_VERSION} from '../gameplay/version.js';
import {releaseDir,artifactPath} from './delivery-paths.mjs';
const game=path.join(root,'game');
function run(script){const r=spawnSync(process.execPath,['scripts/'+script],{cwd:game,stdio:'inherit'});if(r.status!==0)throw Error('Release build failed: '+script);}
// 单一离线成品：只构建一份 WebP 优化版。
run('embed-assets.mjs');run('build-offline.mjs');
fs.mkdirSync(releaseDir,{recursive:true});
fs.copyFileSync(path.join(root,'凡人修仙传_青竹剑阵.html'),artifactPath('凡人修仙传_青竹剑阵.html'));
run('package-source.mjs');
run('package-player.mjs');
const sha=(file,base=root)=>createHash('sha256').update(fs.readFileSync(path.join(base,file))).digest('hex');
const files=['凡人修仙传_青竹剑阵.html','青竹剑阵_源码.zip','青竹剑阵_'+GAME_VERSION+'_免安装版.zip'];
fs.writeFileSync(artifactPath('SHA256SUMS.txt'),files.map(f=>sha(f,releaseDir)+'  '+f).join('\n')+'\n');
fs.writeFileSync(artifactPath('release-manifest.json'),JSON.stringify({version:GAME_VERSION,license:'GPL-3.0-only',files:files.map(file=>({file,bytes:fs.statSync(artifactPath(file)).size,sha256:sha(file,releaseDir)})),source:Object.fromEntries(releaseFiles().map(f=>[f,sha(f)]))},null,2)+'\n');
console.log('Release ready for verification: '+GAME_VERSION);
