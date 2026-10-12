/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 单一离线成品：只跑一份 WebP 优化版，不再按资源档跑两遍。
import {spawnSync} from 'node:child_process';
for(const script of ['qa-batch1-browser.mjs','qa-batch2-browser.mjs','qa-batch3-browser.mjs','release-experience-browser.mjs','release-browser.mjs']){
 console.log('Browser suite: '+script);
 const r=spawnSync(process.execPath,['scripts/'+script],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
