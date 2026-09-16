/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React,{useState} from 'react';
import {observationPacket,studyRun,studyComplete} from './observation';
export default function ObservationPanel({b,onExport,onNotes}){const [notes,setNotes]=useState(b.observationNotes||'');return <section className="observation-panel"><h3>{studyRun(b)?'前两章主动技能对照观察':'无尽三圈观察记录'}</h3><p>{studyRun(b)?'真实前两章、同种子与空修持；两次起手独立。完成/失败均可导出，正式存档与奖励不变。':'保存实际选择、已完成圈数与章末分段；至少三圈的真人继续意愿需自行记录。'}</p>{studyRun(b)&&<strong>{studyComplete(b)?'两章已完成':'观察进行中'} · {b.path===4?'符阵':'雷法'} · 神雷 {b.thunders} 次 · 主符命中 {b.sigilStats.sigil.hits} · 主符实际伤害 {Math.round(b.sigilStats.sigil.damage||0)}</strong>}<label>观察笔记（导出文件保存）<textarea aria-label="观察笔记" value={notes} maxLength={4000} onChange={e=>{setNotes(e.target.value);onNotes?.(e.target.value);}} placeholder={studyRun(b)?'起点留符、停步时机、命中/阻挡、一击收益；与另一流派比较。':'圈1/2/3选择原因、继续意愿及不愿继续的原因。'}/></label><button className="fr-btn" onClick={()=>onExport(observationPacket(b,notes))}>导出观察包与实际记录</button><small>恢复使用包内最近合法快照（失败结果可能回到更早节点）；文件保存成功后再离开；未填写的理解与意愿不算已验证。</small></section>;}
