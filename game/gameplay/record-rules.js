/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {experienceDetails} from './experience-rules.js';
import {GAME_VERSION} from './version.js';
import {activeCultivation} from './cultivation.js';
export const RECORD_VERSION=1;
export const RULE_KEYS=['rulesVersion','balanceVersion','metaRulesVersion','contentVersion','growthVersion','encounterVersion','economyVersion','storyVersion','focusVersion','inputVersion'];
export const rankedRun=b=>b.rulesVersion===3&&b.options.recordVersion===1;
export const initialRecordState=b=>({startedAt:b.time,eligibleStart:b.time===0&&['story','seed','endless'].includes(b.mode),completedLoops:0,lastLoopAt:null,lastLoopLockUsed:false});
export const elapsedBattle=b=>rankedRun(b)&&b.recordState?Math.max(0,b.time-b.recordState.startedAt):null;
export function completeRecordLoop(b){if(!rankedRun(b)||b.mode!=='endless')return;b.recordState.completedLoops=(b.endlessLoop||0)+1;b.recordState.lastLoopAt=b.time;b.recordState.lastLoopLockUsed=!!b.options.touchLockUsed;}
export function recordDetails(b){if(!rankedRun(b)||!b.recordState)return null;const state=b.recordState;return {...experienceDetails(b),version:1,gameVersion:GAME_VERSION,rules:Object.fromEntries(RULE_KEYS.map(k=>[k,b.options[k]??1])),touchLockUsed:!!b.options.touchLockUsed,eligibleStart:state.eligibleStart,battleMs:Math.round(elapsedBattle(b)*1000),completedLoops:state.completedLoops,lastLoopMs:state.lastLoopAt===null?null:Math.round((state.lastLoopAt-state.startedAt)*1000),lastLoopLockUsed:state.lastLoopLockUsed,metaCount:b.options.metaRulesVersion<2?(b.options.meta||[]).length:activeCultivation(b.options,b.path).length,supply:b.selectedSupply||'steady'};}
export function validateRecordSnapshot(data,b){const s=data.expedition.recordState,fail=()=>{throw Error('成绩计时记录无效，原记录未被修改');};
 if(!rankedRun(b)){if(s!==undefined)fail();return;}
 if(!s||!Number.isFinite(s.startedAt)||s.startedAt<0||s.startedAt>data.time||typeof s.eligibleStart!=='boolean'||s.eligibleStart&&s.startedAt!==0||typeof s.lastLoopLockUsed!=='boolean'||!Number.isInteger(s.completedLoops)||s.completedLoops<0||s.completedLoops>1001)fail();
 const completed=b.mode==='endless'?(b.endlessLoop||0)+(data.expedition.receipts.includes('5:3')?1:0):0;if(s.completedLoops!==completed)fail();
 if(completed===0){if(s.lastLoopAt!==null||s.lastLoopLockUsed)fail();}else if(!Number.isFinite(s.lastLoopAt)||s.lastLoopAt<s.startedAt||s.lastLoopAt>data.time)fail();
 if(b.mode==='endless'&&s.eligibleStart&&data.expedition.receipts.includes('5:3')&&data.expedition.receipts.length!==22)fail();
}
