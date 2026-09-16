/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
export const PRACTICE_STEPS=[
 {title:'移动避险',text:'用 WASD／方向键或左下摇杆，走入青色圆圈；观察训练敌人的扑击预警。'},
 {title:'闪避脱身',text:'朝空旷方向移动，再按闪避键或点闪避按钮。冷却未结束时会显示原因。'},
 {title:'集中火力',text:'鼠标按住战场，或触屏点按靶子附近，观察新出击飞剑的首目标。'},
 {title:'施放神雷',text:'灵力和雷源都足够时，按神雷键或点辟邪神雷；本步骤已补足训练资源。'},
 {title:'护阵分守',text:'先开启集火，再松开左键；触屏点右上角解除集火。阵盘也需要保护，集中处理威胁后可恢复分守。'},
 {title:'留符引敌',text:'符留在闪避起点。先让追兵接近，再向空处闪避；留在附近引敌进入，观察布好后触发。命中一次主符后完成。'}
];
export function beginPracticeStep(b,step=0){
 if(b.mode!=='training')return;
 b.clearField();b.clearDashInput();b.input.focus=false;b.input.aim=null;b.input.touchAim=false;
 b.player.x=640;b.player.y=520;b.player.dashCD=0;b.player.mana=100;b.player.reserve=b.player.maxReserve;
 b.practice={step,sigilHits:b.sigilStats.sigil.hits,started:b.time,ready:false,sawFocus:false,thunders:b.thunders,dashBefore:b.player.lastDash,nextSpawn:b.time};
 b.objective=step===4?{kind:'defend',x:640,y:410,hp:360,maxHp:360,invuln:0,done:0}:null;
 if(step===0)b.practice.goal={x:530,y:470,r:55};
 if(step===5){b.lastSigil=b.time-6;b.spawn(4,{x:640,y:380,hp:100000,speed:50,practiceTarget:true,noDrop:true,name:'留符追兵练习靶'});}
 if(step===2)b.spawn(4,{x:510,y:470,hp:100000,speed:0,name:'集火练习靶'});
 b.emit({type:'update'});
}
export function updatePractice(b,dt){
 const q=b.practice;if(!q)return;
 if(![2,5].includes(q.step)&&b.time>=q.nextSpawn&&b.enemies.length<5){q.nextSpawn=b.time+3;b.spawn(4,{x:q.step===4?440:1000,y:300,hp:300,speed:80});}
 if(b.objective)b.objective.invuln=Math.max(0,b.objective.invuln-dt);
 q.sawFocus||=!!b.input.focus;
 if(q.step===5){const z=b.zones.find(z=>z.sigil&&!z.metaEcho&&!z.fired);q.sigilHint=z?(z.arming>0?'留符已落下 · 布符中':'符已布好 · 引追兵入圈'):b.player.lastDash!==q.dashBefore?'未命中时，等留符冷却结束再试；别离起点太远':'接近追兵后，朝空处闪避';}
 const complete=q.step===5?b.sigilStats.sigil.hits>q.sigilHits:q.step===0?Math.hypot(b.player.x-q.goal.x,b.player.y-q.goal.y)<q.goal.r:q.step===1?b.player.lastDash!==q.dashBefore:q.step===2?b.input.focus&&b.swords.some(s=>s.target?.name==='集火练习靶'):q.step===3?b.thunders>q.thunders:q.sawFocus&&!b.input.focus;
 if(complete&&!q.ready){q.ready=true;b.feedbackSound('choose');b.emit({type:'update'});}
}
