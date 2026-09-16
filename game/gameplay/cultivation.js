/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {stationaryActive,sigilCooldown,reserveRestBase,afterThunderWindow,BALANCE_VERSION} from './balance.js';
// Gameplay cultivation, not additional canon techniques. These apply only to the chosen starter.
export const CULTIVATION_VERSION=3;
export const CULTIVATION_BRANCHES=[
 {id:'sword',name:'御剑',identity:'聚锋穿阵 · 换式回剑'},
 {id:'thunder',name:'雷法',identity:'蓄雷节源 · 雷后护体'},
 {id:'puppet',name:'傀儡',identity:'布机架弩 · 压制射击'},
 {id:'insect',name:'御虫',identity:'育虫追猎 · 协击回养'},
 {id:'talisman',name:'符阵',identity:'遁步留符 · 延时复燃'},
 {id:'guard',name:'护身',identity:'温盾避招 · 卸势反击'}
];
/** @type {Array<Array<[string,string,Record<string,number>]>>} */
const rows=[
 [
  ['温养剑锋','飞剑基础伤害 +8%。',{damage:.08}],
  ['神识驭剑','飞剑索敌范围 +10%，飞行速度 +10%。',{range:.1,swordSpeed:.1}],
  ['穿隙破阵','每第 3 把飞剑出击时额外穿透 1 个目标；剑数仍上限 72。',{metaSwordPierce:1}],
  ['聚锋凝意','御剑起手的四击聚锋允许间隔延长至 2.6 秒。',{metaFocusWindow:.6}],
  ['剑势衔接','每次触发四击聚锋，飞剑攻速 +12%，剩余持续时间刷新为 3 秒；不叠加到更高攻速。',{metaSwordMomentum:1}],
  ['收放自如','切换剑式时，飞剑剩余出击冷却最多降至 0.25 秒；实际缩短冷却后间隔 8 秒，无剑受益不占用间隔。',{metaSwordRecall:1}]
 ],
 [
  ['引息蓄雷','出发时额外获得 15 灵力；雷法起手从 65 灵力开始。',{metaStartMana:15}],
  ['雷池温养','雷源上限与现有储量 +10，章间准备按新上限补足。',{reserve:10}],
  ['收束雷源','每次神雷消耗的雷源减少 2，仍有最低消耗。',{thunderSave:2}],
  ['循息引流','战斗中的灵力恢复速度 +10%。',{manaRegen:.1}],
  ['雷后余势','神雷后 5 秒内，飞剑再获得 +10% 伤害。',{afterThunder:.1}],
  ['金雷护窍','成功施放神雷后获得 1 秒无敌；不返还灵力或雷源。',{metaThunderVeil:1}]
 ],
 [
  ['校弩定锋','傀儡弩矢伤害 +10%。',{puppetDamage:.1}],
  ['护架策应','距离己方傀儡不足 110 时，额外减少 3% 所受伤害；闪避离队时可能失效。',{puppetGuard:.03}],
  ['展识布机','傀儡索敌范围 +15%。',{puppetRange:.15}],
  ['轻械随行','傀儡跟随韩立调整阵位的速度 +35%；不增加射速。',{metaPuppetFollow:.35}],
  ['稳架齐射','韩立停下移动时，傀儡伤害额外 +12%。',{stationary:.12}],
  ['弩列压制','每具傀儡第 6 次普通射击附带压制：命中非首领时定身 0.5 秒；同一目标 2 秒内不重复定身。',{metaPuppetPin:1}]
 ],
 [
  ['育虫添群','常驻噬金虫增加 1 只；总数仍上限 30。',{insects:1}],
  ['振翅寻踪','噬金虫追击速度 +15%。',{insectSpeed:.15}],
  ['齿甲温养','噬金虫伤害 +8%。',{insectDamage:.08}],
  ['识息追猎','噬金虫索敌范围 +20%，包括核心的分群与集群追猎。',{metaInsectRange:.2}],
  ['啃蚀留痕','御虫起手的啃噬易伤停止攻击后维持 4 秒，仍最高 12%。',{metaGnawDuration:1}],
  ['群息回养','每由噬金虫完成 8 次有效击杀，最多恢复韩立 3 点生命；满血不储存回复，无掉落敌人和阵眼不计数。',{metaInsectRecovery:1}]
 ],
 [
  ['添火描符','持续灼烧与采用符火加成的遁步符伤害 +15%。',{burnDamage:.15}],
  ['展纸留焰','遁步符火覆盖半径 +15%。',{metaSigilRadius:.15}],
  ['延火续势','飞剑附加的灼烧延长 0.5 秒。',{burnTime:.5}],
  ['轻墨遁符','遁步留符的独立冷却从 6 秒缩短至 5.4 秒。',{metaSigilCooldown:.6}],
  ['以焰缚步','飞剑命中附加 4% 减速，可与飞剑缓速强化相加；首领与阵眼免疫，不覆盖其他来源更强的减速。',{slow:.04}],
  ['复燃余符','常规遁步符爆后 0.4 秒，在原处追加本次符爆伤害 25% 的复燃，半径为原符 80%；续焰下为原始符伤 20%，不递归，与合符同燃互斥。',{metaSigilEcho:1}]
 ],
 [
  ['固元培身','生命上限 +8。',{hp:8}],
  ['温盾养息','护盾上限 +8，出发时补满。',{shield:8}],
  ['铁衣护脉','护甲 +2。',{armor:2}],
  ['轻步留隙','闪避的无敌时间延长 0.03 秒。',{iframes:.03}],
  ['静心复盾','脱离受击等待结束后，护盾恢复每秒额外 +1；护身起手规则2／3等待4秒，其余旧规则等待5秒。',{shieldRegen:1}],
  ['卸势反击','成功闪避触发护身起手反击后，移动速度 +12%，持续 1.5 秒。',{metaGuardCounter:1}]
 ]
];
export const META_V2=rows.flatMap((rows,path)=>rows.map(([name,desc,mods],step)=>({id:CULTIVATION_BRANCHES[path].id+'-meta-'+step,path,step,cost:20+step*15,name,desc,mods,capstone:step===5})));
const changes={
 'thunder-meta-3':{desc:'雷法在合格节点休整时，额外恢复雷源，受储量上限限制；宝光、幻境、章末和终章不补，每节点仅一次。',mods:{metaReserveRest:5}},
 'talisman-meta-3':{desc:'成功留符的布符时间减少 0.15 秒，最低 0.1 秒；普通布符 0.35→0.2 秒，遁后留符 0.2→0.1 秒。合符配对预警 0.8→0.65 秒；留符独立冷却仍为 6 秒，不改已放符计时。',mods:{metaSigilArming:.15}},
 'insect-meta-5':{desc:'受到虫群有效伤害后 3 秒内死亡的合格敌人，每 8 只回复最多 3 生命，不要求虫群尾刀。阵眼、无掉落单位、重复死亡不计；满血时遇到合格协击击杀会将当前计数清零，不储存回复。',mods:{metaInsectAssist:1}}
};
export const META=META_V2.map(m=>({...m,...changes[m.id]}));
export function cultivationDescription(m,options={}){
 const b={rulesVersion:options.rulesVersion??3,options:{...options,balanceVersion:options.balanceVersion??BALANCE_VERSION},path:m.path,stats:m.mods};
 if(m.mods.metaReserveRest){const base=reserveRestBase(b),extra=m.mods.metaReserveRest;return `雷法在合格节点休整时，基础最多 ${base} 雷源＋本项 ${extra}，合计最多 ${base+extra}，受储量上限限制；宝光、幻境、章末和终章不补，每节点仅一次。`;}
 if(m.id==='thunder-meta-4')return `神雷后 ${afterThunderWindow(b)} 秒内，飞剑再获得 +${Math.round(m.mods.afterThunder*100)}% 伤害。`;
 if(m.id==='talisman-meta-3'&&options.metaRulesVersion!==2)return m.desc.replace('仍为 6 秒','为 '+sigilCooldown(b)+' 秒');
 return m.desc;
}
export const cultivationCatalog=version=>version===2?META_V2:META;
export function activeCultivation(options={},path=options.path||0){if((options.metaRulesVersion??1)<2)return [];const held=new Set(options.meta||[]);return cultivationCatalog(options.metaRulesVersion).filter(m=>m.path===path&&held.has(m.id));}
export function cultivationMods(options={},path=options.path||0){const result={};for(const m of activeCultivation(options,path))for(const [key,value] of Object.entries(m.mods))result[key]=(result[key]||0)+value;return result;}
export const needsCultivationUpgrade=save=>(save.metaRulesVersion??1)<CULTIVATION_VERSION&&save.meta.length>0;
export function cultivationStatus(b){const s=b.stats,p=b.player;if((b.options.metaRulesVersion??1)<2)return '';
 if(s.metaSwordRecall){const left=Math.max(0,8-(b.time-(p.metaSwitchAt??-100)));return left>0?'换式回锋 · '+left.toFixed(1)+' 秒':'换式回锋已就绪';}
 if(s.metaThunderVeil)return b.time-b.thunderTime<1&&p.invuln>0?'金雷护窍 · '+Math.min(1-(b.time-b.thunderTime),p.invuln).toFixed(1)+' 秒':'金雷护窍 · 随神雷触发';
 if(s.metaPuppetPin&&b.puppets.length>0){const ready=b.puppets.map((a,i)=>({id:i+1,left:6-(a.metaShots||0)%6})).sort((a,z)=>a.left-z.left)[0];return '最近就绪 '+ready.id+'号 · 还差 '+ready.left+' 箭';}
 if(s.metaPuppetPin)return '全队压制 · 入场后架机';
 if(s.metaInsectAssist)return '协击回养 · '+((p.metaInsectKills||0)%8)+' / 8';
 if(s.metaInsectRecovery)return '虫杀回养 · '+((p.metaInsectKills||0)%8)+' / 8';
 if(s.metaSigilEcho)return b.hasCore?.('K10')?'合符同燃优先 · 复燃暂停':'常规符火 · 爆后复燃';
 if(s.metaGuardCounter)return p.buffs.metaGuardSwift>b.time?'卸势反击 · 疾行中':'卸势反击 · 化解后疾行';return '';
}
// Current-configuration comparisons are separate from the permanent node descriptions.
export function cultivationDetail(m,b){
 const s=b.stats,n=v=>Number(v.toFixed(2));
 const key=Object.keys(m.mods).find(k=>['damage','afterThunder','stationary','puppetDamage','insectDamage','burnDamage'].includes(k));
 let detail='';if(key){const value=m.mods[key];let before=1+(s[key]||0)-value,gain=value,context='';
  if(['damage','afterThunder'].includes(key)){const without=Object.create(b);without.stats={...s,[key]:(s[key]||0)-value};before=without.swordDamage(null);gain=b.swordDamage(null)-before;context='以未灼烧目标为例，已计当前剑数、生命、灵力及余雷状态；';}
  if(['puppetDamage','stationary'].includes(key)){const active=stationaryActive(b);gain=key==='stationary'&&!active?0:value;before=1+(s.puppetDamage||0)+(active?s.stationary||0:0)-gain;context='已计当前停驻状态；';}
 
  detail=context+'相对未修持本项，当前对应倍率增加 '+n(gain/Math.max(.01,before)*100)+'%；有效伤害仍受目标防护、暴击等影响。';}
 if(m.id==='puppet-meta-4')return '停下输入时傀儡基础伤害加成 +12%。'+(b.options.balanceVersion>=3?'完成架设后，移开最多保留0.3秒，K06不继承移动衔接。':'移动输入后解除。')+detail;
 if(m.id==='puppet-meta-3')detail='阵位跟随插值率 '+n(3*(1+(s.metaPuppetFollow||0)))+' / 秒，基础 3 / 秒；这里改变跟随速度，不改变射速。';
 if(m.id==='insect-meta-3')detail='当前普通索敌半径：虫旁 '+n(250*(1+(s.metaInsectRange||0)))+'、韩立旁 '+n(350*(1+(s.metaInsectRange||0)))+'；K07／K08选敌 '+n(400*(1+(s.metaInsectRange||0)))+'、续锁 '+n(440*(1+(s.metaInsectRange||0)))+'（战场距离）。';
 if(m.id==='puppet-meta-2')detail='当前傀儡索敌半径 '+n(420*(1+(s.puppetRange||0)))+'（战场距离），基础 420；范围不等于固定增伤。';
 if(m.id==='talisman-meta-1')detail='当前起手符半径 '+n((s.dashFire?100:85)*(1+(s.metaSigilRadius||0)))+'（战场距离）；复燃为该半径的 80%。';
 const wait=b.rulesVersion>=2&&b.path===5?4:5;
 const specifics={
 'sword-meta-1':()=>`当前飞剑基础索敌 ${n(320*(1+(s.range||0)))}，飞行速度倍率 ${n(1+(s.swordSpeed||0))}（出击基础620、回程基础400）；距离和速度分别增加；环绕剑式另取环宽所需的较大索敌范围。`,
 'sword-meta-2':()=>`当前 ${Math.min(72,b.level)} 剑中，第 3、6、9…把共 ${Math.floor(Math.min(72,b.level)/3)} 把获得额外穿透；每次出击独立。`,
 'sword-meta-3':()=>`当前聚锋允许的连续命中间隔 ${n(2+(s.metaFocusWindow||0))} 秒；同一目标累计四次剑击。`,
 'sword-meta-4':()=>`当前剩余 ${n(Math.max(0,(b.player.buffs.metaSwordTempo||0)-b.time))} 秒；每次聚锋刷新为 3 秒。`,
 'sword-meta-5':()=>`距离下次可缩短冷却 ${n(Math.max(0,8-b.time+(b.player.metaSwitchAt??-100)))} 秒；在途飞剑不会重新出击。`,
 'thunder-meta-0':()=>`出发一次加 15 灵力，当前灵力 ${n(b.player.mana)} / 100；不是持续回灵。`,
 'thunder-meta-1':()=>`当前雷源上限 ${n(b.player.maxReserve)}，储量 ${n(b.player.reserve)}；本项上限加 10。`,
 'thunder-meta-2':()=>`当前每次神雷需 ${n(b.thunderReadiness().cost)} 雷源；本项节省 2，仍受本局最低消耗与核心影响。`,
 'thunder-meta-3':()=>m.mods.metaReserveRest?'本项只在合格休整补雷源；不提高每秒灵力恢复。':`当前每秒基础回灵 ${n(100/30*(1+(s.manaRegen||0)))}，超过 6 秒未受击时另计安全回灵。`,
 'thunder-meta-5':()=>`神雷后无敌最多 1 秒，当前剩余 ${n(Math.max(0,Math.min(1-b.time+b.thunderTime,b.player.invuln)))} 秒；不降低神雷消耗。`,
 'puppet-meta-1':()=>`与任一己方傀儡距离不足 110 时才减伤 3%；当前${b.puppets.some(a=>Math.hypot(a.x-b.player.x,a.y-b.player.y)<110)?'满足':'未满足'}。`,
 'puppet-meta-5':()=>`全队当前射击计数：${b.puppets.map((a,i)=>(i+1)+'号还差'+(6-(a.metaShots||0)%6)+'箭').join('、')||'尚未入场'}；定身持续 0.5 秒。`,
 'insect-meta-0':()=>`常驻虫数 ${Math.min(30,s.insects||0)} / 30；孵化与临时诱饵另计。`,
 'insect-meta-1':()=>`追击速度倍率 ${n(1+(s.insectSpeed||0))}；提升移动速度，不提升攻击频率。`,
 'insect-meta-4':()=>`当前啃噬停止攻击后保留 ${n(3+(s.metaGnawDuration||0))} 秒，易伤最高 12%。`,
 'insect-meta-5':()=>`当前计数 ${(b.player.metaInsectKills||0)%8} / 8；${m.mods.metaInsectAssist?'满血遇到合格协击击杀清零。':'满血不会储存超过本轮阈值的回复。'}`,
 'talisman-meta-2':()=>`剑击灼烧存在时持续 ${n(3+(s.burnTime||0))} 秒；当前${s.burn?'已启用剑击灼烧':'尚无剑击灼烧来源'}，不改变起手留符引信。`,
 'talisman-meta-3':()=>m.mods.metaSigilArming?`本局普通布符 ${n(Math.max(.1,.35-(s.metaSigilArming||0)))} 秒、遁后留符 ${n(Math.max(.1,.2-(s.metaSigilArming||0)))} 秒；本局留符独立冷却 ${n(sigilCooldown(b))} 秒；未决符按放置时快照。`:`本局留符独立冷却 ${n(sigilCooldown(b))} 秒。`,
 'talisman-meta-4':()=>`当前剑击减速 ${n((s.slow||0)*100)}%；首领与阵眼不受此项影响。`,
 'talisman-meta-5':()=>`当前${b.hasCore?.('K10')?'合符同燃优先，本项暂停':'普通符爆后延迟 0.4 秒复燃'}；衍生伤害仅从原始快照计算一次。`,
 'guard-meta-0':()=>`当前生命上限 ${n(b.player.maxHp)}；本项可加值 +8。`,
 'guard-meta-1':()=>`本项护盾可加值 +8；当前常规上限 ${n(b.player.maxShield)}，核心倍率在加总后计算。`,
 'guard-meta-2':()=>`本项护甲 +2；当前常规护甲 ${n(s.armor||0)}，减伤按 1−100/(100+护甲×3) 换算。`,
 'guard-meta-3':()=>`本局闪避判定窗口 ${n(.24+(s.iframes||0))} 秒；本项延长 0.03 秒。`,
 'guard-meta-4':()=>`本局需超过 ${wait} 秒未受击；当前还需 ${n(Math.max(0,wait-b.time+b.player.lastHit))} 秒。恢复 ${n(s.shieldRegen||0)} / 秒，仅补至常规上限。`,
 'guard-meta-5':()=>`成功反击后疾行 1.5 秒，移速 +12%；当前剩余 ${n(Math.max(0,(b.player.buffs.metaGuardSwift||0)-b.time))} 秒。`
 };
 if(specifics[m.id])detail=specifics[m.id]();
 return cultivationDescription(m,b.options)+(detail?' '+detail:'');
}

// Explain tactical use without treating reach, control or movement as fixed damage.
export const cultivationUse=m=>({
 'sword-meta-1':'敌人在原索敌范围之外或飞剑追赶时受益；不增加单次剑伤。',
 'puppet-meta-2':'目标超出原索敌范围时更早开火；近处目标不会固定增伤。',
 'puppet-meta-3':'移动转移阵位时更快跟上，频繁远离傀儡才容易体现；不增加射速。',
 'puppet-meta-5':'第6次普通射击命中非首领才定身；同一目标2秒内不重复定身。',
 'insect-meta-1':'追赶或换目标时更快接敌；持续贴身攻击不增加频率。',
 'insect-meta-3':'索敌范围扩大也会改变可选目标与追击路线；明确集火时，可能改追更靠近准心的远敌。需要近处输出时把准心移到近敌；「双群巡猎」仍分群，「凝群穿甲」仍优先精英／首领，准心不覆盖核心规则。范围不提高单次虫伤。',
 'talisman-meta-1':'敌人体积与扩大后的符圈相交才增加覆盖机会；中心命中的单次伤害不变。',
 'talisman-meta-4':'须飞剑命中且目标可减速；首领和阵眼免疫。',
 'guard-meta-3':'多出的0.03秒延长闪避无敌与可化解反击的窗口；仍须挡下来袭，不会自动闪避。',
 'guard-meta-5':'成功触发护身反击后才获得1.5秒疾行；常驻移动速度不变。'
}[m.id]||'');
