/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Player documentation uses the same rules and description functions as the game.
import {PATHS,DIFFICULTIES,COMBOS,CONSUMABLES} from '../gameplay/data.js';
import {starterDetails} from '../gameplay/starters.js';
import {BALANCE_VERSION} from '../gameplay/balance.js';
import {EXPEDITIONS,CORES,SUPPLIES} from '../gameplay/expedition-data.js';
import {GROWTH_VERSION,growthNodeXP} from '../gameplay/growth-rules.js';
import {META,cultivationDescription} from '../gameplay/cultivation.js';
import {coreDescription} from '../gameplay/core-description.js';
import {comboDescription} from '../gameplay/combo-description.js';
const table=(head,rows)=>[head,head.map(()=>'---'),...rows].map(row=>'| '+row.map(v=>String(v).replaceAll('|','／').replaceAll('\n',' ')).join(' | ')+' |').join('\n');
export const currentOptions={rulesVersion:3,balanceVersion:BALANCE_VERSION,metaRulesVersion:3,growthVersion:GROWTH_VERSION,meta:[]};
export function guideTables(){
 return {
  starters:table(['起手','基础配置（未计洞府）','操作特点'],PATHS.map((p,i)=>{const d=starterDetails(i,currentOptions);return [p.name,d.initial,d.action];})),
  difficulty:table(['难度','敌人生命倍率','敌人伤害倍率','基础雷源'],DIFFICULTIES.map(d=>[d.name,d.hp,d.damage,d.reserve])),
  experience:table(['章节','各节点基础经验','本章合计'],EXPEDITIONS.map((ch,i)=>{const xp=ch.xp.map((n,j)=>growthNodeXP(currentOptions,i,j,n));return [ch.name,xp.join('／'),xp.reduce((a,b)=>a+b,0)];})),
  cores:table(['核心','生效条件','效果（按当前新局、未计修持）'],CORES.map(c=>[PATHS[c.path].name+' · '+c.name,c.requirement,coreDescription(c,{rulesVersion:3,options:currentOptions,path:c.path,stats:{}})])),
  cultivation:table(['分支','节点','心得','实际效果（当前新局）'],META.map(m=>[PATHS[m.path].name,m.name,m.cost,cultivationDescription(m,currentOptions)])),
  combos:table(['组合','联动','效果'],COMBOS.map(c=>[[c.a,c.b].map(id=>PATHS.find(p=>p.id===id).name).join('＋'),c.name,comboDescription(c,{rulesVersion:3,options:currentOptions,stats:{}})])),
  supplies:table(['补给方案','出发物资'],SUPPLIES.map(s=>[s.name,s.items.map(([id,count])=>(CONSUMABLES.find(c=>c.id===id)?.name||id)+' ×'+count).join('、')]))
 };
}
export function validateGuide(guide){for(const [key,table]of Object.entries(guideTables())){const block='<!-- table:'+key+':start -->\n'+table+'\n<!-- table:'+key+':end -->';if(!guide.includes(block))throw Error('说明数据表与源码不符：'+key+'；运行 npm run docs:tables 并核对文案后再构建');}}
