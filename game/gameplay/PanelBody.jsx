/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React,{useLayoutEffect,useRef,useState} from 'react';
export default function PanelBody({children}){
 const ref=useRef(null),content=useRef(null),[more,setMore]=useState(false);
 useLayoutEffect(()=>{const node=ref.current,update=()=>setMore(node.scrollHeight-node.scrollTop-node.clientHeight>3);update();const observer=new ResizeObserver(update);observer.observe(node);observer.observe(content.current);node.addEventListener('scroll',update,{passive:true});return()=>{observer.disconnect();node.removeEventListener('scroll',update);};},[]);
 return <div className="panel-body-wrap"><div ref={ref} className="panel-body" aria-label="面板正文，可滚动"><div ref={content}>{children}</div></div>{more&&<div className="panel-scroll-hint" aria-hidden="true">向下滚动，查看更多 ↓</div>}</div>;
}
