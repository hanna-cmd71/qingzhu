/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import React from 'react';
import {storyItemStates} from './player-guidance';
export default function StoryItemSummary({b}){const items=storyItemStates(b);return items.length>0&&<div className="story-item-summary"><strong>剧情行囊与战场配置</strong><p>{items.map(item=>item.name+'：'+item.state).join('；')}。</p></div>;}
