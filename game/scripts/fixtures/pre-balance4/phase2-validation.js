import {ENEMIES} from './data.js';
import {nodeGrowth,revisedGrowth,goalGrowth,objectiveBonus,growthPerformance} from './growth-rules.js';
import {finitePursuit,pursuitDeadline} from './director-rules.js';
const EPS=1e-5;
const fail=label=>{throw Error(label+'无效或不一致，原记录未被修改');};
const object=(x,label)=>{if(!x||typeof x!=='object'||Array.isArray(x))fail(label);};
const number=(v,label,max=1e12)=>{if(!Number.isFinite(v)||v<0||v>max+EPS)fail(label);};
const near=(x,y,label)=>{if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x-y)>EPS)fail(label);};
export function validatePhase2(data,b){
 const ex=data.expedition,loop=data.endlessLoop||0,restChoice=ex.choiceReturn==='intermission'&&!!ex.rest;
 const active=state=>['battle','pause'].includes(state)||state==='choice'&&!restChoice;
 const replayChoice=data.scene==='cinematic'&&ex.cinematic?.replay&&ex.cinematic.returnState==='choice';
 const combat=active(data.modeState)||data.scene==='cinematic'&&ex.cinematic?.replay&&active(ex.cinematic.returnState);
 if(revisedGrowth(b)){
  const g=ex.growth;object(g,'成长记录');if(typeof g.firstOfferUsed!=='boolean'||!Array.isArray(g.settlements)||g.settlements.length>22)fail('成长凭据');
  if((data.modeState==='choice'||replayChoice)&&(!g.firstOfferUsed||!ex.choices.length))fail('悟道状态');
  const seen=new Set();for(const r of g.settlements){object(r,'经验凭据');const node=b.routes.flat().find(n=>n.id===r.node);if(!node||r.loop!==loop||r.id!==loop+':'+r.node||seen.has(r.id)||!ex.receipts.includes(r.node))fail('经验凭据');seen.add(r.id);near(r.base,node.xp,'基础经验凭据');number(r.bonus,'表现经验凭据',node.xp*.25);number(r.contract,'条款经验凭据',Math.floor(node.xp*.08));}
  if(nodeGrowth(b)&&g.settlements.length!==ex.receipts.length)fail('节点与经验凭据');
  if(nodeGrowth(b)&&ex.rest&&!ex.rest.preparation){const r=g.settlements.find(r=>r.node===ex.rest.node),v=ex.rest.growthReward;object(v,'整备经验明细');if(!r)fail('整备经验凭据');near(v.base,r.base,'整备基础经验');near(v.performance,r.bonus,'整备表现经验');near(v.contract,r.contract,'整备条款经验');near(v.total,r.base+r.bonus+r.contract,'整备经验合计');}
  const l=g.ledger;if(nodeGrowth(b)&&combat&&!l)fail('节点经验账本');
  if(l){object(l,'节点经验账本');const node=b.routes.flat().find(n=>n.id===l.node);if(!node||l.node!==b.node.id||l.loop!==loop)fail('经验账本所属节点');const X=node.xp;
   for(const k of ['startXP','rawKillXP','baseAllocated','baseCollected','bonusAllocated','bonusCollected','completionXP','contractXP'])number(l[k],'经验账本数值');
   if(typeof l.settled!=='boolean'||typeof l.notified!=='boolean')fail('经验结算标记');
   number(l.baseAllocated,'基础掉落额度',.72*X);number(l.baseCollected,'基础拾取额度',l.baseAllocated);number(l.bonusAllocated,'表现分配额度',.25*X);number(l.bonusCollected,'表现拾取额度',l.bonusAllocated);
   near(l.bonusAllocated,Math.min(.25*X,.2*Math.max(0,l.rawKillXP-.72*X)),'表现奖励计算');near(ex.nodeDropXP,l.baseAllocated,'基础掉落账本');near(ex.nodeStartXP,l.startXP,'节点起点经验');
   let base=0,bonus=0;for(const d of ex.drops){number(d.xpBase,'基础经验珠',.72*X);number(d.xpBonus,'表现经验珠',.25*X);near(d.value,d.xpBase+d.xpBonus,'经验珠分项');if(d.done)fail('重复拾取记录');base+=d.xpBase;bonus+=d.xpBonus;}
   near(l.baseAllocated,l.baseCollected+base,'基础经验待拾取');near(l.bonusAllocated,l.bonusCollected+bonus,'表现经验待拾取');
   if(goalGrowth(b)){number(l.goalXP,'目标表现经验',.25*X);if(l.settled)near(l.goalXP,objectiveBonus(b,l),'目标表现奖励');else if(l.goalXP!==0)fail('未结算目标表现');}else if(l.goalXP!==undefined)fail('旧成长规则含目标奖励');
   if(l.startXP+l.baseCollected+l.bonusCollected+(l.goalXP||0)+l.completionXP+l.contractXP>data.totalXP+EPS)fail('经验入账总量');
   const receipt=g.settlements.find(r=>r.node===l.node);
   if(l.settled){if(!receipt)fail('已结算经验凭据');near(l.completionXP,X-l.baseCollected,'基础经验补足');near(receipt.bonus,growthPerformance(l),'表现结算');near(receipt.contract,l.contractXP,'条款结算');}
   else if(receipt||l.completionXP!==0||l.contractXP!==0)fail('未结算经验状态');
  }
 }else if(ex.growth!==undefined&&ex.growth!==null)fail('旧成长规则与新账本');
 if(b.options.contentVersion===3){
  if(!Object.hasOwn(ex,'directorState'))fail('刷怪等待记录');const s=ex.directorState;
  if(combat&&b.mode!=='training'&&!s)fail('刷怪等待记录');
  if(s){object(s,'刷怪等待记录');if(s.node!==b.node.id||s.loop!==loop)fail('刷怪所属节点');const pool=b.encounter.kind==='swarm'?[6,21]:b.enemyPool();if(s.pendingType!==null&&(!Number.isInteger(s.pendingType)||!pool.includes(s.pendingType)||!ENEMIES[s.pendingType]))fail('待生成兵种');number(ex.spawnBudget,'刷怪积压预算',10);}
 }else if(ex.directorState!==undefined&&ex.directorState!==null)fail('旧内容规则与等待兵种');
 if(b.options.encounterVersion>=2){
  if(!Object.hasOwn(ex,'pursuitState'))fail('追兵阶段记录');const s=ex.pursuitState;
  if(finitePursuit(b)&&combat&&!s)fail('追兵阶段记录');
  if(s){object(s,'追兵阶段记录');if(!finitePursuit(b)||s.node!==b.node.id||s.loop!==loop||!['pursuit','clearing'].includes(s.phase))fail('追兵所属节点');near(s.deadline,pursuitDeadline(b.encounter),'追兵截止时间');if(s.phase==='clearing'&&ex.waveTime<s.deadline-EPS)fail('清场开始时刻');if(s.phase==='clearing'&&(ex.spawnBudget>EPS||ex.directorState?.pendingType!=null))fail('清场刷怪状态');}
 }else if(ex.pursuitState!==undefined&&ex.pursuitState!==null)fail('旧遭遇规则与追兵阶段');
 for(const e of ex.enemies)if(e.introReward!==undefined&&(e.introReward!==true||!nodeGrowth(b)||b.chapter!==0||b.wave!==0||e.index!==4))fail('开场敌人经验权重');
 if(ex.enemies.filter(e=>e.introReward).length>3)fail('开场引导敌人数');
}
