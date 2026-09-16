/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React,{useState} from 'react';
import {Button} from '../components/ui/button';
import {PATHS} from './data';
import {META,CULTIVATION_BRANCHES,activeCultivation,needsCultivationUpgrade,cultivationUse,cultivationDescription} from './cultivation';
import {planCultivationUpgrade} from './respec';
const Btn=({className='',...props})=><Button className={'fr-btn '+className} {...props}/>;
export function CultivationSummary({options,path,legacy=false}){
 if(legacy||(options.metaRulesVersion??1)<2)return <p className="cultivation-old-run">本局沿用出发时的旧洞府配置，更新或洗点不会中途改动。</p>;
 const nodes=activeCultivation(options,path);
 return <div className="cultivation-summary"><span>本局启用 · {PATHS[path].name}修持 {nodes.length}/6</span>{nodes.length?<ul>{nodes.map(m=><li key={m.id}><b>{m.name}</b><small>{cultivationDescription(m,options)}</small></li>)}</ul>:<p>尚未修持此分支。其他起手的洞府节点不会叠加到本局。</p>}</div>;
}
export default function CultivationPanel({save,onUnlock,onRefund,onUpgrade,path=0}){
 const [branch,setBranch]=useState(path);
 const legacy=needsCultivationUpgrade(save),held=legacy?[]:save.meta,refund=legacy?planCultivationUpgrade(save).refund:0;
 return <section className="cultivation-panel"><div className="cultivation-title"><div><span className="eyebrow">六路专修 · 战术培养</span><h3>洞府修持</h3><p>每局只启用起手对应的分支。点击已修持节点可撤回该项及后续节点，心得全额返还。</p></div><div className="respec-actions"><span className="chip">修炼心得 {save.insight}</span><Btn variant="outline" disabled={!held.length} onClick={()=>onRefund()}>全部洗点</Btn></div></div>
 {legacy&&<div className="cultivation-migration"><div><strong>旧修持可全额返还 {refund} 点心得</strong><p>下方预览的是新版专属节点。确认转换后清除旧树、返还投入，再自由分配；当前续玩、药园与其他长期进度保留。</p></div><Btn variant="outline" onClick={onUpgrade}>返还旧修持并启用新版</Btn></div>}
 <nav className="cultivation-anchors" aria-label="定位起手修持分支">{CULTIVATION_BRANCHES.map((item,i)=><button key={item.id} aria-pressed={branch===i} onClick={()=>{setBranch(i);requestAnimationFrame(()=>document.getElementById('cultivation-'+item.id)?.scrollIntoView({block:'start'}));}}>{item.name}{i===path?' · 当前起手':''} {held.filter(id=>id.startsWith(item.id+'-meta-')).length}/6</button>)}</nav><div className="meta-grid cultivation-grid">{[branch,...CULTIVATION_BRANCHES.map((_,i)=>i).filter(i=>i!==branch)].map(i=>{const branch=CULTIVATION_BRANCHES[i];return <section id={'cultivation-'+branch.id} key={branch.id} style={{'--path-color':PATHS[i].color}}><div className="cultivation-branch-head"><h3><span>{PATHS[i].icon}</span>{branch.name}</h3><p>{branch.identity}</p><small>{held.filter(id=>id.startsWith(branch.id+'-meta-')).length} / 6 已修持</small></div><Btn className="branch-reset" variant="ghost" disabled={!held.some(id=>id.startsWith(branch.id+'-meta-'))} onClick={()=>onRefund(i)}>重置此分支</Btn>
 {META.filter(m=>m.path===i).map(m=>{const learned=held.includes(m.id),previous=m.step===0||held.includes(branch.id+'-meta-'+(m.step-1));return <button className={'meta-node cultivation-node '+(learned?'learned ':'')+(m.capstone?'capstone':'')} key={m.id} onClick={()=>learned?onRefund(m.path,m.step):onUnlock(m)} disabled={legacy||!learned&&(save.insight<m.cost||!previous)} title={learned?'撤回本项及后续修持，全额返还心得':!previous?'先修持上一节点':cultivationDescription(m)}><div><span className="cultivation-step">{m.capstone?'战术成型':'修持 '+(m.step+1)}</span><strong>{m.name}</strong><small>{cultivationDescription(m)}</small>{cultivationUse(m)&&<small className="cultivation-use">适用：{cultivationUse(m)}</small>}</div><span>{learned?'撤回 ↶':m.cost}</span></button>;})}</section>;})}</div></section>;
}
