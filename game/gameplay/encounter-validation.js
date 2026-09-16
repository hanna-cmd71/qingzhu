/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
const fail = label => {throw Error(label+'缺失或与当前节点不一致，原记录未被修改');};

// Called only by the rule 3 restore path, after the saved route has been restored.
export function validateEncounterState(data,battle) {
 const ex=data.expedition;
 const restChoice = ex.choiceReturn==='intermission' && !!ex.rest;
 const active = state => state==='battle' || state==='pause' || state==='choice' && !restChoice;
 const combat = active(data.modeState);
 const replayCombat = data.scene==='cinematic' && ex.cinematic?.replay && active(ex.cinematic.returnState);
 if (!combat && !replayCombat) return;
 const kind=battle.encounter.kind,q=ex.objective;
 if (['hunt','defend','break','pursuit','escape','treasure','illusion','ice'].includes(kind) && (!q || q.kind!==kind)) fail('战斗机关目标');
 if (kind==='treasure' && !ex.mechanism) fail('敛息阵位');
 if (['serpent','ghost','puppet','xuangu'].includes(kind) && (!battle.boss?.boss || battle.boss.bossType!==kind)) fail('战斗首领');
 if (kind==='swarm' && ex.boss?.type!=='swarm') fail('虫潮进度');
 if (!q) return;
 const finite = (object,keys,label) => {if(!object || keys.some(key=>!Number.isFinite(object[key])))fail(label);};
 const count = (key,max) => {if(!Number.isInteger(q[key]) || q[key]<0 || q[key]>max)fail('机关进度');};
 if (['hunt','defend','break','pursuit','escape','treasure','illusion'].includes(kind)) count('done',kind==='hunt'||kind==='illusion'?3:kind==='break'?3:kind==='escape'?2:1);
 if (kind==='hunt') count('spawned',3);
 if (kind==='defend') finite(q,['x','y','hp','maxHp','invuln'],'阵盘状态');
 if (kind==='break'||kind==='escape') {if(q.total!==(kind==='break'?3:2))fail('阵眼总数');finite(q,['unlockAt'],'破禁计时');finite(q.exit,['x','y','r'],'退路');}
 if (kind==='illusion') finite(q,['next','cool'],'幻境计时');
 if (kind==='ice') {finite(q,['x','y','r'],'冰焰状态');finite(q.exit,['x','y','r'],'冰焰退路');}
}
