/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React from 'react';
import {CHALLENGES,currentChallenge} from './experience-rules';
export default function ChallengePanel({b}){const plan=currentChallenge(b);if(!plan)return null;return <section className="challenge-panel"><h3>第 {plan.loop+1} 圈 · 圈前战术选择</h3>{plan.loop===0?<p>首圈保持原玩法；后续每圈提供一项可选挑战，也可以不加挑战。</p>:<><p>预告：{CHALLENGES[plan.offer].text}不会改变路线、关键剧情或目标；按实际选择序列独立记榜。</p>{['none',plan.offer].map(id=><button className={'fr-btn '+(plan.choice===id?'selected':'')} key={id} disabled={plan.started} onClick={()=>b.chooseChallenge(id)} aria-pressed={plan.choice===id}>{CHALLENGES[id].name}{plan.choice===id?' · 已选':''}</button>)}<p>{plan.started?'已提交：'+CHALLENGES[plan.choice].name:'出发前可改选，进入战斗后本圈固定。'}</p></>}</section>;}
