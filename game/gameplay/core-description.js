/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {phase3Balance,sigilPairFuse,sigilCooldown,BALANCE_VERSION} from './balance.js';
export function coreDescription(c,b={rulesVersion:3,path:c?.path,options:{balanceVersion:BALANCE_VERSION},stats:{}}){
 if(!c)return '';
 if(c.id==='K10')return '首符不因敌人踏入引爆，最长保留 8 秒；在到期前再次闪避留符（本局独立间隔 '+Number(sigilCooldown(b).toFixed(2))+' 秒）。配对后预警 '+Number(sigilPairFuse(b).toFixed(2))+' 秒同燃，各为该符原始伤害 70%；火线最长 360，造成第二符原始伤害 100%。与复燃互斥，成长已计入原始符伤，不再重复相乘。';
 if(c.id==='K05'&&phase3Balance(b))return c.desc+' 驻定须连续停稳 0.6 秒，离开后最多保留 0.3 秒。';
 return c.desc;
}
