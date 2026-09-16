/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React from 'react';
import {touchSettings} from './touch-controls';
import {Button} from '../components/ui/button';
import {PRACTICE_STEPS,beginPracticeStep} from './practice';
export default function PracticePanel({b,onExit,keyLabel,keymap,device,settings}){
 const total=b.path===4?6:b.path===5?6:5;const q=b.practice;if(!q)return null;const step=PRACTICE_STEPS[q.step],touch=device==='touch',side=touchSettings(settings).joystickSide==='right'?'右':'左';const text=touch?['用'+side+'侧摇杆走入青色圆圈，观察扑击预警。','用摇杆朝空处移动，再点闪避按钮。','点按 B 靶中心；新出击剑选 B 才完成。A 更近；瞄远处空地不算。','点辟邪神雷；本步骤已补足灵力和雷源。','先点战场集火，再点摇杆旁“解除”；右上“解除集火”也可用。恢复分守保护阵盘。',PRACTICE_STEPS[5].text,PRACTICE_STEPS[6].text][q.step]:step.text.replace('或左下摇杆','').replace('触屏点右上角解除集火。','');
 return <section className="practice-panel" aria-label="分步操作练习"><strong>{q.step===6?6:q.step+1} / {total} · {step.title}</strong><p>{text}</p>{q.step===5&&<output>{q.ready?'主符已命中 · 留符练习完成':q.sigilHint}</output>}{q.step===2&&<output>{q.ready?'新出击剑已选中 B；在途剑没有被重置':'A 是近靶，B 是指定靶 · 请明确瞄准 B'}</output>}{q.step===6&&<output>{q.guardResult}</output>}<small>{touch?'触屏按钮操作':'闪避 '+keyLabel(keymap.dash)+' · 神雷 '+keyLabel(keymap.thunder)} · 训练不结算奖励</small><div>{q.step===6&&<Button className="fr-btn" variant="outline" onClick={e=>{beginPracticeStep(b,6);e.currentTarget.closest('main')?.querySelector('canvas')?.focus();}}>重试定时来袭</Button>}{b.path===5&&q.step===4&&q.ready&&<Button className="fr-btn" variant="outline" onClick={onExit}>完成基础练习</Button>}<Button className="fr-btn" variant="outline" onClick={onExit} aria-label="结束练习，返回出发配置">返回出发配置</Button><Button className="fr-btn" disabled={!q.ready} onClick={()=>q.step===6||q.step===total-1?onExit():beginPracticeStep(b,b.path===5&&q.step===4?6:q.step+1)}>{q.ready?q.step===6||q.step===total-1?'练习完成':b.path===5&&q.step===4?'可选：定时挡招':'下一项 →':'完成操作后继续'}</Button></div></section>;
}
