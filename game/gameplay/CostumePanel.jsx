/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React,{useEffect,useRef,useState} from 'react';
import {SKINS,skinUnlocked} from './skins';
import {skinPose,sprite} from './art';
import {Button} from '../components/ui/button';

const Chip=({children})=><span className="chip">{children}</span>;

// Costumes are account level: the list is readable at any time, and equipping one only swaps the
// pose set the renderer draws. Nothing here touches the running battle or its snapshot.
function PosePreview({image,height=76,locked=false}){
 const ref=useRef(null);
 useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;if(image)sprite(ctx,image,c.width/2,c.height-4,height);},[image,height]);
 return <canvas ref={ref} width={Math.round(height*1.5)} height={height+6} className="sprite-view" aria-hidden="true" style={locked?{opacity:.35,filter:'grayscale(1)'}:undefined}/>;
}

export function unlockText(skin){
 const unlock=skin.unlock;
 if(!unlock)return '默认装束';
 if(Number.isFinite(unlock.wins))return '完成主篇 '+unlock.wins+' 次';
 if(unlock.achievement)return '达成成就「'+unlock.achievement+'」';
 return '条件未标明';
}

export function CostumePanel({save,art,onChange}){
 const [poses,setPoses]=useState({});
 useEffect(()=>{
  if(!art)return;let alive=true;
  (async()=>{const next={};for(const skin of SKINS)next[skin.id]=await skinPose(art,skin.id);if(alive)setPoses(next);})().catch(()=>{});
  return()=>{alive=false;};
 },[art]);
 const equipped=save.skin;
 return <section className="costume-panel" aria-label="时装">
  <p className="muted">时装只改变外观，不影响战斗数值、结算与成绩。解锁后可在洞府随时更换，不进入本局快照。</p>
  <div className="codex-grid">{SKINS.map(skin=>{
   const granted=skinUnlocked(save,skin)||(save.skins||[]).includes(skin.id),current=equipped===skin.id;
   return <article className={'codex-card costume-card'+(current?' selected':'')} key={skin.id}>
    <PosePreview image={poses[skin.id]} locked={!granted}/>
    <Chip>{current?'已装备':granted?'可装备':'未解锁'}</Chip>
    <h3>{skin.name}</h3>
    <p>{skin.desc}</p>
    <p className="muted">{granted?unlockText(skin):'解锁条件：'+unlockText(skin)}</p>
    <Button className="fr-btn" disabled={!granted||current} aria-pressed={current} onClick={()=>{if(granted&&!current)onChange(skin.id);}}>{current?'当前装束':'装备'}</Button>
   </article>;
  })}</div>
 </section>;
}
