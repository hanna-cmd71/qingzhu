/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {SEGMENT_VERSION,CHALLENGE_VERSION} from './experience-rules.js';
// Browsing categories only; original ranked groups and stored entries stay intact.
import {RULE_KEYS} from './record-rules.js';
import {EXPEDITION_RULES} from './expedition-data.js';
import {BALANCE_VERSION} from './balance.js';
import {CULTIVATION_VERSION} from './cultivation.js';
import {CONTENT_VERSION} from './content-rules.js';
import {GROWTH_VERSION} from './growth-rules.js';
import {ENCOUNTER_VERSION} from './director-rules.js';
import {ECONOMY_VERSION} from './economy-rules.js';
import {STORY_VERSION} from './story-rules.js';
import {FOCUS_VERSION} from './targeting.js';
import {INPUT_VERSION} from './battle-input.js';
export const CURRENT_RECORD_RULES={rulesVersion:EXPEDITION_RULES,balanceVersion:BALANCE_VERSION,metaRulesVersion:CULTIVATION_VERSION,contentVersion:CONTENT_VERSION,growthVersion:GROWTH_VERSION,encounterVersion:ENCOUNTER_VERSION,economyVersion:ECONOMY_VERSION,storyVersion:STORY_VERSION,focusVersion:FOCUS_VERSION,inputVersion:INPUT_VERSION};
export const currentRecordRules=rules=>RULE_KEYS.every(k=>rules?.[k]===CURRENT_RECORD_RULES[k]);
export const currentRecordEntry=r=>currentRecordRules(r.rules)&&r.segmentVersion===SEGMENT_VERSION&&(r.mode!=='endless'||r.challengeVersion===CHALLENGE_VERSION);
export const entryRuleKey=r=>recordRuleKey(r.rules)+'/'+(r.segmentVersion||0)+'/'+(r.challengeVersion||0);
export const recordRuleKey=rules=>RULE_KEYS.map(k=>rules?.[k]??'?').join('/');
export function browseRecordEntries(entries,filters={}){
 return entries.filter(r=>(!filters.mode||filters.mode==='all'||r.mode===filters.mode)&&(!filters.difficulty||filters.difficulty==='all'||r.difficulty===Number(filters.difficulty))&&(!filters.lock||filters.lock==='all'||r.touchLockUsed===(filters.lock==='used'))&&(!filters.rules||filters.rules==='all'||(filters.rules==='current'?currentRecordEntry(r):filters.rules==='historical'?!currentRecordEntry(r):entryRuleKey(r)===filters.rules||recordRuleKey(r.rules)===filters.rules))).sort((a,b)=>['story','seed','endless'].indexOf(a.mode)-['story','seed','endless'].indexOf(b.mode)||(a.mode==='endless'&&b.mode==='endless'?b.loops-a.loops:0)||a.difficulty-b.difficulty||a.path-b.path||recordRuleKey(a.rules).localeCompare(recordRuleKey(b.rules))||a.timeMs-b.timeMs);
}
