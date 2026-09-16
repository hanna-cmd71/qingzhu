/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {EXPEDITIONS} from './expedition-data.js';
import {hashSeed} from './data.js';
export const SEGMENT_VERSION=1,CHALLENGE_VERSION=2;
// Challenge 2 (round-2 batch B-10, new endless runs only): a gentler per-loop curve and seen cinematics auto-skipped from loop 2.
// Challenge 1 keeps 1.4/1.12 with no auto-skip; a missing marker is 0 (no loop challenge, original curve). The isolated experiment
// simulator may overwrite CHALLENGE2 in-process; the shipped game uses these values.
export const CHALLENGE2={hp:1.25,dmg:1.18,skipSeen:true};
export const loopScale=b=>b.mode==='endless'&&b.options.challengeVersion===2?{hp:CHALLENGE2.hp,dmg:CHALLENGE2.dmg}:{hp:1.4,dmg:1.12};
export const endlessAutoSkip=b=>b.mode==='endless'&&b.options.challengeVersion===2&&CHALLENGE2.skipSeen&&(b.endlessLoop||0)>=1&&b.options.settings?.endlessSkipSeen!==false;
export const CHALLENGES={none:{name:'不加挑战',text:'保留本圈原玩法。'},thunder:{name:'常规战节雷',text:'本圈普通节点禁用神雷；实体首领及取宝、幻境、冰焰仍可施放。没有额外奖励。'},items:{name:'常规战惜物',text:'本圈普通节点禁用药囊；实体首领及取宝、幻境、冰焰仍可使用。没有额外奖励。'}};
export const segmented=b=>b.options.segmentVersion===1&&b.recordState?.eligibleStart===true;
export const challenged=b=>b.mode==='endless'&&[1,2].includes(b.options.challengeVersion);
export function appendChapterSplit(b){if(!segmented(b))return;const rows=b.chapterSplits,key=(b.endlessLoop||0)*6+b.chapter;if(rows.some(r=>r.index===key))return;const endMs=Math.round((b.time-b.recordState.startedAt)*1000),start=rows.at(-1)?.endMs||0;rows.push({index:key,chapter:b.chapter,loop:b.endlessLoop||0,endMs,durationMs:endMs-start});}
export const challengeOffer=(seed,loop)=>['thunder','items'][hashSeed(seed+':endless-choice-v1:'+loop)%2];
export function prepareChallenge(b){if(!challenged(b))return;const loop=b.endlessLoop||0;if(!b.challenges.some(p=>p.loop===loop))b.challenges.push({loop,offer:challengeOffer(b.seed,loop),choice:loop===0?'none':null,started:loop===0});}
export const currentChallenge=b=>challenged(b)?b.challenges.find(p=>p.loop===(b.endlessLoop||0)):null;
export function chooseChallenge(b,choice){const p=currentChallenge(b);if(!p||p.started||b.scene!=='intro'||!['none',p.offer].includes(choice))return false;p.choice=choice;b.checkpoint();return true;}
export function commitChallenge(b){const p=currentChallenge(b);if(!p||p.started)return true;if(p.choice===null){b.toast('先选择本圈挑战，或选择不加挑战');return false;}p.started=true;b.checkpoint();return true;}
export function challengeBlocks(b,action){const p=currentChallenge(b);return !!p?.started&&p.choice===action&&!['serpent','ghost','puppet','xuangu','treasure','illusion','ice'].includes(b.encounter.kind);}
export function experienceDetails(b){return {...(segmented(b)?{segmentVersion:1,chapterSplits:structuredClone(b.chapterSplits)}:{}),...(challenged(b)?{challengeVersion:b.options.challengeVersion,challengeChoices:b.challenges.slice(0,b.recordState?.completedLoops||0).map(p=>p.choice)}:{})};}
export function validateSplits(rows,count,total){if(!Array.isArray(rows)||rows.length!==count||count>6006)throw Error('章末分段记录无效');let previous=0;for(let i=0;i<rows.length;i++){const r=rows[i];if(!r||r.index!==i||r.chapter!==i%6||r.loop!==Math.floor(i/6)||!Number.isSafeInteger(r.endMs)||r.endMs<previous||r.endMs>total||r.durationMs!==r.endMs-previous)throw Error('章末分段计时无效');previous=r.endMs;}}
export function validateExperienceSnapshot(data,b){
 const ex=data.expedition;if(segmented(b)){const count=(b.mode==='endless'?(b.endlessLoop||0)*6:0)+b.routes.filter(ch=>ex.receipts.includes(ch.at(-1).id)).length;validateSplits(ex.chapterSplits,count,Math.round((data.time-b.recordState.startedAt)*1000));}else if(ex.chapterSplits!==undefined)throw Error('旧局不能补造章末分段');
 if(!challenged(b)){if(ex.challenges!==undefined)throw Error('旧局不能加入圈前挑战');return;}
 const plans=ex.challenges,loop=b.endlessLoop||0;if(!Array.isArray(plans)||plans.length!==loop+1||plans.length>1001)throw Error('圈前挑战记录无效');
 for(let i=0;i<plans.length;i++){const p=plans[i];if(!p||p.loop!==i||p.offer!==challengeOffer(b.seed,i)||typeof p.started!=='boolean'||![null,'none',p.offer].includes(p.choice)||i===0&&(p.choice!=='none'||!p.started)||i<loop&&!p.started||p.started&&p.choice===null)throw Error('圈前挑战选择无效');}
 const p=plans.at(-1);if(!p.started&&(b.chapter!==0||b.wave!==0||ex.receipts.length!==0||data.scene!=='intro'||data.modeState!=='intro'))throw Error('圈前挑战提交状态无效');
}
export function experienceRecordFields(d,loops=0){return {...(d.segmentVersion===1?{segmentVersion:1,chapterSplits:structuredClone(d.chapterSplits.filter(r=>loops===0||r.loop<loops))}:{}),...([1,2].includes(d.challengeVersion)?{challengeVersion:d.challengeVersion,challengeChoices:[...d.challengeChoices]}:{})};}
export function validateExperienceEntry(r){
 if(r.segmentVersion!==undefined&&r.segmentVersion!==1)throw Error('成绩分段版本无效');if(r.segmentVersion===1){validateSplits(r.chapterSplits,r.mode==='endless'?r.loops*6:6,r.timeMs);if(r.chapterSplits.at(-1)?.endMs!==r.timeMs)throw Error('成绩末段与总计时不符');}else if(r.chapterSplits!==undefined)throw Error('旧成绩无分段凭据');
 if(r.challengeVersion!==undefined&&![1,2].includes(r.challengeVersion))throw Error('成绩挑战版本无效');if([1,2].includes(r.challengeVersion)){if(r.mode!=='endless'||!Array.isArray(r.challengeChoices)||r.challengeChoices.length!==r.loops||r.challengeChoices[0]!=='none'||r.challengeChoices.some((v,i)=>v!=='none'&&v!==challengeOffer(r.seed,i)))throw Error('成绩挑战序列无效');}else if(r.challengeChoices!==undefined)throw Error('旧成绩无挑战凭据');
}

export function validateHistoryExperience(h){const d=h.recordDetails;if(!d)return;if(d.segmentVersion!==undefined&&d.segmentVersion!==1||d.challengeVersion!==undefined&&![1,2].includes(d.challengeVersion))throw Error('历史成绩体验版本无效');if(d.segmentVersion===1){if(!Number.isSafeInteger(h.nodes)||h.nodes<0||h.nodes>22||!Number.isSafeInteger(d.battleMs)||d.battleMs<0)throw Error('历史成绩分段信息无效');let nodes=0;const ended=EXPEDITIONS.filter(ch=>{nodes+=ch.xp.length;return nodes<=h.nodes;}).length;const count=h.mode==='endless'?(d.completedLoops-(h.nodes===22?1:0))*6+ended:ended;validateSplits(d.chapterSplits,count,d.battleMs);}else if(d.chapterSplits!==undefined)throw Error('旧历史不能补造分段');if([1,2].includes(d.challengeVersion)){if(h.mode!=='endless'||!Number.isInteger(d.completedLoops)||d.completedLoops<0||d.completedLoops>1001||!Array.isArray(d.challengeChoices)||d.challengeChoices.length!==d.completedLoops||d.challengeChoices.length>0&&d.challengeChoices[0]!=='none'||d.challengeChoices.some((v,i)=>v!=='none'&&v!==challengeOffer(h.seed,i)))throw Error('历史成绩挑战序列无效');}else if(d.challengeChoices!==undefined)throw Error('旧历史不能补造挑战');}
