/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React,{useEffect,useRef,useState} from 'react';
import {Battle} from './engine';
import {Renderer} from './art';
export default function StarterPreview({art,path}){
 const canvas=useRef(null),[phase,setPhase]=useState('');
 useEffect(()=>{
  if(!art||!canvas.current)return;const b=new Battle({path,seed:'preview-'+path,mode:'training',rulesVersion:3,balanceVersion:3});b.level=5;b.swords=[];b.traits={};b.recalc();b.syncSwords();b.modeState='battle';b.spawnBudget=-1e8;b.player.x=640;b.player.y=420;b.player.mana=85;b.queuedChoices=0;b.enemies=[];
  for(let i=0;i<5;i++)b.spawn(i%2?0:4,{x:640+Math.cos(i*1.2)*180,y:420+Math.sin(i*1.2)*120,hp:700,spawn:0,noDrop:true});
  const renderer=new Renderer(canvas.current,art);let handle,last=0,clock=0,next=2,cycle=-1,label='';
  const loop=now=>{const dt=Math.min(last?(now-last)/1000:.016,.035);last=now;clock+=dt;b.input={x:Math.sin(clock*.6)*.45,y:Math.cos(clock*.6)*.2};if(path===2&&clock%5<2.5)b.input={x:0,y:0};if(path===4){const n=Math.floor(clock/8),t=clock%8;if(n!==cycle){cycle=n;b.enemies=[];b.zones=[];b.player.x=640;b.player.y=420;b.player.dash=0;b.player.dashCD=0;b.player.dx=-1;b.player.dy=0;for(let i=0;i<4;i++){const e=b.spawn(4,{x:820+i*18,y:395+i*18,hp:700,noDrop:true,spawn:0});e.speed=55;}}b.input={x:t>=1.5&&t<2.15?-1:0,y:0};if(t>=1.5&&t<1.6&&b.time-b.lastSigil>=6)b.dash();const text=t<1.5?'① 接近敌群，等待敌人靠近':t<2.15?'② 向外闪避 · 起点留下符阵':t<3?'③ 布符后等待追兵 · 踏入即爆':'④ 留符冷却独立 · 等待下次布阵';if(text!==label){label=text;setPhase(text);}}if(path!==4&&clock>next){b.dash();if(path===5){b.hitPlayer(10);}if(path===1){b.player.mana=100;b.thunder();}next+=4;}
   b.update(dt);if(path!==4&&b.enemies.length<4){b.spawn(4,{x:820,y:390,hp:700,noDrop:true});}b.queuedChoices=0;b.modeState='battle';renderer.draw(b,b.time,{preview:true,shake:false,quality:1});handle=requestAnimationFrame(loop);};handle=requestAnimationFrame(loop);const resize=()=>renderer.resize();window.addEventListener('resize',resize);return()=>{cancelAnimationFrame(handle);window.removeEventListener('resize',resize);};
 },[art,path]);
 return <div className="starter-preview"><canvas ref={canvas} aria-label="所选起手的独立演示"/><span>{path===4?phase:'独立演示 · 不写入存档'}</span></div>;
}
