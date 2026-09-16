/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import ChapterReview from './ChapterReview';
import React from 'react';
import {compareRunRecord,formatRecordTime,resultAlreadyClaimed} from './records';
import {fixedFloorSummary,loopBattleMs,netTimeParts,sameDisplayedTime} from './record-display';
import {chapterName} from './chapter-names';
const labels={first:'首次入榜',loops:'完成圈数新纪录',faster:'新纪录',tied:'与此前最佳并列',slower:'未超过此前最佳',fewer:'未超过此前完成圈数',recorded:'此前已记录'};
export default function ResultRecord({b,save,onOpen,onRetry,onExport}){
 if(b.options.studyVersion===1)return <p>对照体验不写入正式成绩、心得、药园或续玩；导出观察包保存实际记录。</p>;
 const summary=b.summary(),feedback=b.resultFeedback||{...compareRunRecord(save,summary),saved:resultAlreadyClaimed(save,summary),restored:true},d=summary.recordDetails;
 // C-5: the fixed-timer floor and the loop-internal time are derived read-only from the same pacing functions the engine uses.
 const parts=d?.version===1?netTimeParts(b,d.battleMs):null,loopMs=d?.completedLoops>0?loopBattleMs(d.chapterSplits,d.completedLoops-1):null;
 return <section className="result-record"><h3>本次历练成绩</h3><p>净战斗时间 {d?.version===1?formatRecordTime(d.battleMs):'未记录（旧计时）'} · 不含暂停、整备、悟道及过场。</p>{parts&&<p className="record-fixed-floor">{parts.nodes.length?'其中固定计时下限 '+formatRecordTime(parts.fixedMs)+'（'+fixedFloorSummary(parts)+' 合计 '+parts.nodes.reduce((n,x)=>n+x.seconds,0)+' 秒，到时才判定完成，再快也压不掉）· 其余 '+formatRecordTime(parts.freeMs)+' 取决于清场速度与走位。':'本圈已完成的节点没有固定计时节点，全部净时间都取决于清场速度与走位。'}</p>}{summary.mode==='endless'&&<p>已完成 {d?.completedLoops??b.endlessLoop??0} 圈；本次止步第 {(b.endlessLoop||0)+1} 圈{chapterName(b.chapter)}第 {b.wave+1} 节点（本圈完成 {summary.nodes||0} / 22）。{d?.completedLoops>0&&<>最近完成圈的累计净时间 {formatRecordTime(d.lastLoopMs)}{loopMs!==null&&<>（该圈圈内用时 {formatRecordTime(loopMs)}）</>}，未完成部分不替代完成时刻；同圈比较按圈内用时读。</>}</p>}<ChapterReview b={b} save={save} prior={feedback.prior}/><strong>{feedback.eligible?labels[feedback.kind]:feedback.reason}</strong>{feedback.reason&&feedback.eligible&&<p>{feedback.reason}</p>}{feedback.prior&&feedback.kind!=='recorded'&&<p>同组此前最佳：{feedback.prior.mode==='endless'?feedback.prior.loops+' 圈 · ':''}{formatRecordTime(feedback.prior.timeMs)}{feedback.deltaMs!==null&&(sameDisplayedTime(feedback.deltaMs)?<> · 本次相同（差不足 0.1 秒）</>:<> · 本次{feedback.deltaMs<0?'快':'慢'} {formatRecordTime(Math.abs(feedback.deltaMs))}</>)}</p>}{feedback.eligible&&!feedback.prior&&<p>本组此前没有个人最佳。</p>}<p className={feedback.saved?'record-save-ok':'record-save-pending'}>{b.mode==='training'?'试剑台不写入结算记录。':feedback.saved?(feedback.restored?'此局此前已结算，未重复发奖。':'本次结算已保存。'):'本次结算尚未保存成功，请处理保存提示；当前比较仅为预览。'}</p>{b.mode!=='training'&&!feedback.saved&&<output className="pending-result-actions"><strong>本次完整结算仍待保存</strong><button className="fr-btn" onClick={onRetry}>重试保存</button><button className="fr-btn" onClick={onExport}>导出本次待保存记录</button></output>}<button className="fr-btn" onClick={onOpen}>查看个人最佳与最近尝试 →</button></section>;
}
