/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {Expedition} from './expedition.js';
import {CHALLENGES} from './experience-rules.js';
export const STUDY_SEED='active-skills-first-two-chapters-v1';
export const studyRun=b=>b?.options?.studyVersion===1;
export const studyComplete=b=>studyRun(b)&&b.receipts.includes(b.routes[1].at(-1).id);
export function studyOptions(path){if(![1,4].includes(path))throw Error('对照体验仅开放雷法与符阵');return {mode:'seed',path,seed:STUDY_SEED,difficulty:1,chapter:0,meta:[],metaRulesVersion:3,rulesVersion:3,recordVersion:0,segmentVersion:0,challengeVersion:0,studyVersion:1,supply:'steady',skipPractice:true};}
export function observationPacket(b,notes=''){
 const study=studyRun(b),snapshot=study?(b.finished?b.studyCheckpoint:b.serialize()):b.serialize();
 return {kind:study?'qingzhu-active-study':'qingzhu-endless-observation',schema:1,method:'玩家自行填写；自动记录不代表真人观察已经完成',notes:notes.slice(0,4000),questions:study?['是否知道符留在闪避起点？何时停步？','能否区分命中、阻挡和落空？','一次成功主动技能实际造成多少伤害？','更愿意再玩雷法还是符阵，为什么？']:['每圈选择什么，为什么？','完成三圈后还愿意继续吗？','选择挑战前后对下一圈的期待如何？'],snapshot:structuredClone(snapshot),result:structuredClone(b.summary()),completed:study?studyComplete(b):b.recordState?.completedLoops||0,...(!study?{circles:(b.challenges||[]).map(p=>({loop:p.loop+1,choice:p.choice===null?'尚未选择':CHALLENGES[p.choice].name,completed:p.loop<(b.recordState?.completedLoops||0)}))}:{})};
}
export function restoreStudyPacket(raw,emit){const data=typeof raw==='string'?JSON.parse(raw):raw;if(!data||data.kind!=='qingzhu-active-study'||data.schema!==1||typeof data.notes!=='string'||data.notes.length>4000)throw Error('观察包格式无效');const snap=data.snapshot,o=snap?.options;if(o?.studyVersion!==1||o.seed!==STUDY_SEED||snap.seed!==STUDY_SEED||o.mode!=='seed'||![1,4].includes(o.path)||o.difficulty!==1||o.metaRulesVersion!==3||!Array.isArray(o.meta)||o.meta.length||o.recordVersion!==0||o.segmentVersion!==0||o.challengeVersion!==0||snap.chapter>1||snap.endlessLoop)throw Error('观察包配置无效，正式存档未修改');const b=Expedition.restore(snap,emit);b.studyCheckpoint=structuredClone(snap);b.observationNotes=data.notes;return b;}
