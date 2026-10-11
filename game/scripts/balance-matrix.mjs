/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// WP8: the balance matrix. Section 11 of the 2.0 requirements asks for retained fixed-strategy output
// over six starters x every weapon method x three difficulties, and section 12.2 gives this work
// package the same script. The matrix runs in-process through balance-run.mjs, so a cell can never
// drift from what the CLI does, and every cell at the same path shares one seed — otherwise a
// difference between two methods could just be a different draw.
//
// Cells: difficulties x weapon states x skills off/on, six starters each.
// Weapon states include 未声明 (none), which is the pre-WP4 configuration and therefore the reference
// every other row is read against; array is the declared default method with no modifiers, so it also
// proves the marker itself is neutral.
//
// Outputs (defaults):
//   qa-runs/balance-v2/runs.jsonl   every run, full report (working evidence, not shipped)
//   qa-runs/balance-v2/summary.md   the table, for reading
//   docs/qa/balance-v2.json         compact committed summary
import fs from 'node:fs';
import nodePath from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {simulateRun} from './balance-run.mjs';
import {PILOTS} from './pilot-strategies.mjs';
import {WEAPONS} from '../gameplay/weapons.js';
import {SKILLS} from '../gameplay/skills.js';

// Defaults are anchored to this file, not to the working directory, so the summary lands in the
// repository's docs/qa no matter where the script is invoked from. Env overrides stay cwd-relative.
const DEFAULT_OUT_DIR=fileURLToPath(new URL('../qa-runs/balance-v2',import.meta.url));
const DEFAULT_SUMMARY=fileURLToPath(new URL('../../docs/qa/balance-v2.json',import.meta.url));

export const ALL_PATHS=[0,1,2,3,4,5],ALL_DIFFICULTIES=[0,1,2],ALL_WEAPONS=['none',...WEAPONS.map(w=>w.id)],ALL_SKILLS=[false,true];

export function matrixCells({paths=ALL_PATHS,difficulties=ALL_DIFFICULTIES,weapons=ALL_WEAPONS,skills=ALL_SKILLS}={}){
 const cells=[];
 for(const difficulty of difficulties)for(const weapon of weapons)for(const on of skills)cells.push({difficulty,weapon,skills:on,paths});
 return cells;
}
// One env object per cell. Nothing is read from process.env inside simulateRun, so the matrix never
// has to touch global state between cells.
export function cellEnv({difficulty,weapon,skills,paths=ALL_PATHS},{seedPrefix='wp8-v2',pilot='baseline'}={}){
 return {
  BATTLE_PATHS:paths.join(','),BATTLE_DIFFICULTY:String(difficulty),BATTLE_SEED_PREFIX:seedPrefix,BATTLE_PILOT:pilot,
  ...(weapon==='none'?{}:{BATTLE_WEAPON:weapon}),
  ...(skills?{BATTLE_SKILLS:'1'}:{}),
 };
}
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const round=(v,digits=1)=>v===null||v===undefined?null:Number(v.toFixed(digits));

function summariseRun(r){
 return {path:r.path,won:r.won,termination:r.termination,time:r.time,level:r.level,kills:r.kills,thunders:r.thunders,skillCasts:r.skillCasts??0,weapon:r.weapon??null,finalSwords:r.finalSwords??null};
}
function summariseCell(cell,runs){
 const paths=runs.map(summariseRun).sort((a,z)=>a.path-z.path);
 return {
  difficulty:cell.difficulty,weapon:cell.weapon,skills:cell.skills,
  weaponVersion:runs[0]?.weaponVersion??0,skillVersion:runs[0]?.skillVersion??0,
  wins:paths.filter(p=>p.won).length,
  completed:paths.filter(p=>p.termination!=='timeout'&&p.termination!=='pilot-stall').length,
  // meanEndTime averages over all six paths, so two cells stay comparable when their win counts
  // differ; meanWinTime only covers the runs that actually finished and is a secondary read.
  meanEndTime:round(mean(paths.map(p=>p.time))),
  meanWinTime:round(mean(paths.filter(p=>p.won).map(p=>p.time))),
  meanLevel:round(mean(paths.map(p=>p.level))),
  skillCasts:paths.reduce((n,p)=>n+p.skillCasts,0),
  paths,
 };
}

export function runMatrix({paths=ALL_PATHS,difficulties=ALL_DIFFICULTIES,weapons=ALL_WEAPONS,skills=ALL_SKILLS,seedPrefix=process.env.BALANCE_SEED_PREFIX||'wp8-v2',pilot=process.env.BATTLE_PILOT||'baseline',outDir=process.env.BALANCE_OUT_DIR||DEFAULT_OUT_DIR,summaryPath=process.env.BALANCE_SUMMARY||DEFAULT_SUMMARY,log=console.log}={}){
 if(!PILOTS.includes(pilot))throw Error('BALANCE pilot must be one of '+PILOTS.join('|')+'; received '+JSON.stringify(pilot));
 const cells=[],runs=[];
 for(const cell of matrixCells({paths,difficulties,weapons,skills})){
  const report=simulateRun(cellEnv(cell,{seedPrefix,pilot}));
  runs.push(...report);
  const c=summariseCell(cell,report);cells.push(c);
  log(`cell d${cell.difficulty} ${cell.weapon}${cell.skills?'+skills':''}: ${c.wins}/${cell.paths.length} wins, mean end ${c.meanEndTime ?? '-'}s, mean level ${c.meanLevel ?? '-'}, casts ${c.skillCasts}`);
 }
 fs.mkdirSync(outDir,{recursive:true});
 fs.writeFileSync(nodePath.join(outDir,'runs.jsonl'),runs.map(r=>JSON.stringify(r)).join('\n')+'\n');

 const byKey=new Map(cells.map(c=>[`${c.difficulty}|${c.weapon}|${c.skills}`,c]));
 const weaponDeltas=[];
 for(const c of cells){
  if(c.weapon==='none')continue;
  const base=byKey.get(`${c.difficulty}|none|${c.skills}`);
  weaponDeltas.push({
   difficulty:c.difficulty,weapon:c.weapon,skills:c.skills,
   wins:c.wins-base.wins,
   meanEndDelta:c.meanEndTime!==null&&base.meanEndTime!==null?round(c.meanEndTime-base.meanEndTime):null,
   perPath:c.paths.map((p,i)=>({path:p.path,wonDelta:Number(p.won)-Number(base.paths[i].won),timeDelta:round(p.time-base.paths[i].time),levelDelta:p.level-base.paths[i].level})),
  });
 }
 const skillDeltas=[];
 for(const c of cells){
  if(!c.skills)continue;
  const base=byKey.get(`${c.difficulty}|${c.weapon}|false`);
  skillDeltas.push({
   difficulty:c.difficulty,weapon:c.weapon,
   wins:c.wins-base.wins,
   meanEndDelta:c.meanEndTime!==null&&base.meanEndTime!==null?round(c.meanEndTime-base.meanEndTime):null,
   casts:c.skillCasts,
   perPath:c.paths.map((p,i)=>({path:p.path,wonDelta:Number(p.won)-Number(base.paths[i].won),timeDelta:round(p.time-base.paths[i].time),levelDelta:p.level-base.paths[i].level})),
  });
 }

 const summary={
  version:1,
  generatedBy:'game/scripts/balance-matrix.mjs',
  matrix:{paths,difficulties,weapons,skills,cells:cells.length,runs:runs.length},
  seedPrefix,seedMode:'per-path shared across cells',pilot,
  pilotVersion:runs[0]?.pilotVersion??null,
  rules:runs[0]?Object.fromEntries(Object.entries(runs[0]).filter(([k])=>k.endsWith('Version'))):{},
  starters:Object.fromEntries(paths.map(p=>[p,{skill:SKILLS.find(s=>s.path===p)?.id??null}])),
  cells,weaponDeltas,skillDeltas,
  evidence:'Synthetic fixed-strategy simulation. Not a human or on-device result; the numbers are candidates for the author to adopt or reject.',
 };
 fs.mkdirSync(nodePath.dirname(summaryPath),{recursive:true});
 fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n');

 const lines=['# Balance matrix','',`Seed prefix \`${seedPrefix}\` (per-path, shared across cells), pilot \`${pilot}\`.`,'','| 难度 | 法门 | 技能 | 通关 | 平均结束 | 平均等级 | 技能释放 |','|---|---|---|---|---|---|---|'];
 for(const c of cells)lines.push(`| ${c.difficulty} | ${c.weapon} | ${c.skills?'开':'关'} | ${c.wins}/${c.paths.length} | ${c.meanEndTime ?? '-'} | ${c.meanLevel ?? '-'} | ${c.skillCasts} |`);
 lines.push('','## 相对「未声明法门」的差值（同难度、同技能开关、同种子）','','| 难度 | 法门 | 技能 | 通关差 | 平均结束差 | 逐流派结束差 |','|---|---|---|---|---|---|');
 for(const d of weaponDeltas)lines.push(`| ${d.difficulty} | ${d.weapon} | ${d.skills?'开':'关'} | ${d.wins>=0?'+':''}${d.wins} | ${d.meanEndDelta===null?'-':(d.meanEndDelta>=0?'+':'')+d.meanEndDelta} | ${d.perPath.map(p=>p.path+':'+(p.timeDelta>=0?'+':'')+p.timeDelta).join(' ')} |`);
 lines.push('','## 开启流派技能相对同格关闭时的差值','','| 难度 | 法门 | 通关差 | 平均结束差 | 释放次数 | 逐流派结束差 |','|---|---|---|---|---|---|');
 for(const d of skillDeltas)lines.push(`| ${d.difficulty} | ${d.weapon} | ${d.wins>=0?'+':''}${d.wins} | ${d.meanEndDelta===null?'-':(d.meanEndDelta>=0?'+':'')+d.meanEndDelta} | ${d.casts} | ${d.perPath.map(p=>p.path+':'+(p.timeDelta>=0?'+':'')+p.timeDelta).join(' ')} |`);
 lines.push('',`共 ${cells.length} 格 / ${runs.length} 局。合成固定策略输出，非真机与真人结果；数值取舍由作者裁定。`,'');
 fs.writeFileSync(nodePath.join(outDir,'summary.md'),lines.join('\n'));

 const unfinished=runs.filter(r=>r.termination==='timeout'||r.termination==='pilot-stall');
 log(`matrix: ${cells.length} cells, ${runs.length} runs, ${unfinished.length} unfinished`);
 log(`wrote ${outDir}/runs.jsonl, ${outDir}/summary.md, ${summaryPath}`);
 return {summary,runs};
}

// BALANCE_SMOKE keeps a short run from overwriting the committed summary: it narrows the matrix and
// redirects both outputs into a scratch folder.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const smoke=process.env.BALANCE_SMOKE==='1';
 runMatrix(smoke?{paths:[0],difficulties:[1],weapons:['none','array','heavy'],outDir:process.env.BALANCE_OUT_DIR||DEFAULT_OUT_DIR+'-smoke',summaryPath:process.env.BALANCE_SUMMARY||DEFAULT_OUT_DIR+'-smoke/summary.json'}:{});
}
