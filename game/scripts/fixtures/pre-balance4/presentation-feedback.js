// Presentation state never enters the combat RNG or a saved battle snapshot.
export function feedbackSound(b,name,interval=.18){
 b.soundTimers??={};if(b.time<(b.soundTimers[name]??-1))return;
 b.soundTimers[name]=b.time+interval;b.emit({type:'sound',name});
}
export function defeatAdvice(b){
 if(b.won)return [];const advice=[];
 if(b.failureReason==='阵盘失守')advice.push('阵盘失守也会结束历练。处理重点威胁后，解除集火可让飞剑恢复分守。');
 else {const hits=(b.recentHits||[]).filter(h=>h.target!=='阵盘');if(hits.length&&hits.filter(h=>h.kind==='近身').length>=Math.ceil(hits.length*.6))advice.push('最近受击主要来自近身。沿外围保持移动，遇到扑击预警时横向避开。');}
 const heal=b.consumables?.find(c=>c.id==='heal'&&c.count>0);if(heal)advice.push('本局还留有 '+heal.count+' 个回元药包；生命偏低时可使用物资键或点按药囊。');
 if(!advice.length)advice.push('可在试剑台练习走位、闪避与集火，再根据最近受击记录调整应对。');return advice.slice(0,2);
}
