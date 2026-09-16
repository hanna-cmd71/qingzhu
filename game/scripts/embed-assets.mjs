/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import fs from 'node:fs';import {createHash} from 'node:crypto';
const folder=new URL('../public/assets/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('encoded/manifest.json',folder),'utf8'));
if(manifest.schema!==1)throw Error('Asset encoding manifest is unsupported');
const compatibility=process.env.QINGZHU_ASSET_PROFILE==='png';
const result={};for(const [key,asset] of Object.entries(manifest.assets)){const source=fs.readFileSync(new URL(asset.source,folder));if(createHash('sha256').update(source).digest('hex')!==asset.sourceSHA256)throw Error('Source PNG changed; regenerate its encoded copy: '+key);const bytes=fs.readFileSync(new URL(asset.file,folder));if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Encoded asset differs from its manifest: '+key);result[key]='data:'+(compatibility?'image/png':asset.mime)+';base64,'+(compatibility?source:bytes).toString('base64');}
fs.writeFileSync(new URL('../gameplay/assets.generated.js',import.meta.url),'export default '+JSON.stringify(result)+';\n');console.log('Embedded '+Object.keys(result).length+' verified local artwork assets ('+manifest.encodedBytes+' encoded bytes; '+(compatibility?'PNG compatibility':'optimized')+').');
