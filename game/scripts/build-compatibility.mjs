/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Same game and save format; original PNG resources offer an offline decoder fallback.
import {spawnSync} from 'node:child_process';
const env={...process.env,QINGZHU_ASSET_PROFILE:'png'};let failed=false;
try{for(const file of ['scripts/embed-assets.mjs','scripts/build-offline.mjs']){const r=spawnSync(process.execPath,[file],{env,stdio:'inherit'});if(r.status!==0){failed=true;break;}}}finally{const r=spawnSync(process.execPath,['scripts/embed-assets.mjs'],{env:{...process.env,QINGZHU_ASSET_PROFILE:'optimized'},stdio:'inherit'});if(r.status!==0)failed=true;}
if(failed)process.exitCode=1;
