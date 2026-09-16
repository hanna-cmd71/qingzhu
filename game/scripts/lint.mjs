/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

if(process.argv.length>2)throw Error('Use npm run lint:raw for custom oxlint arguments.');
const root=fileURLToPath(new URL('..',import.meta.url));
const baseline=JSON.parse(fs.readFileSync(path.join(root,'lint-baseline.json'),'utf8'));
const result=spawnSync(process.execPath,[path.join(root,'node_modules/oxlint/bin/oxlint'),'--format','json'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024});
if(result.error)throw result.error;
let output;try{output=JSON.parse(result.stdout);}catch{throw Error('oxlint did not return diagnostics: '+(result.stderr||result.stdout));}
const signature=d=>JSON.stringify([d.filename,d.code,d.message]);
const allowances=new Map(baseline.diagnostics.map(d=>[signature(d),d.count]));
const invalidFiles=[];
for(const [filename,sha256] of Object.entries(baseline.files)){
 const actual=createHash('sha256').update(fs.readFileSync(path.join(root,filename))).digest('hex');
 if(actual!==sha256)invalidFiles.push(filename);
}
const fresh=[];let accepted=0;
for(const diagnostic of output.diagnostics){
 const key=signature(diagnostic),left=allowances.get(key)||0;
 if(left>0&&!invalidFiles.includes(diagnostic.filename)){allowances.set(key,left-1);accepted++;}
 else fresh.push(diagnostic);
}
for(const filename of invalidFiles)console.error('Baseline source changed; review its inherited diagnostics: '+filename);
for(const d of fresh){const at=d.labels?.[0]?.span;console.error(`${d.filename}:${at?.line||1}:${at?.column||1} ${d.code}: ${d.message}`);}
if(fresh.length||invalidFiles.length||result.status&&!output.diagnostics.length)process.exitCode=1;
console.log(`Lint ${process.exitCode?'failed':'passed'}: ${fresh.length} new diagnostics; ${accepted} documented inherited component diagnostics, with unchanged source hashes.`);
