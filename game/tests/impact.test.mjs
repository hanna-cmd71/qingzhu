/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 2.4 打击反馈层回归：血条滞后、受击红晕、低血量脉冲、伤害数字曲线，以及「表现层绝不碰规则」。
// 和 2.1 的 feel.test.mjs 同一套路：既钉住曲线本身，也钉住表现层与战斗的边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {healthFraction,drawHealthBar,LAG_COLOR} from '../gameplay/meters.js';
import {IMPACT_VERSION,LAG_RATE,HURT_GAIN,HURT_DECAY,LOW_HEALTH,PULSE_HZ,VIGNETTE_MAX,lagStep,hurtGain,hurtDecay,lowHealthPulse,vignetteAlpha,numberPop,numberRise,impactSummary} from '../gameplay/impact.js';

const battle=(options={})=>{const b=new Expedition({seed:'impact',path:0,...options});b.start();if(b.cinematic)b.advanceCinematic(true);return b;};
const controlled=b=>{b.updateDirector=null;b.boss=null;b.enemies=[];b.waveTime=0;b.place=b.spawn.bind(b);b.spawn=()=>null;return b;};
const near=(a,b,msg,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,msg??(a+' vs '+b));

void test('血条滞后只追掉血：回血直接跟上，坏值不产生 NaN',()=>{
 assert.equal(IMPACT_VERSION,1);
 assert.ok(LAG_RATE>0&&LAG_RATE<1,'追赶速度必须落在每秒不到满条');
 // 掉血：残影留在原地，按速度慢慢追。
 near(lagStep(1,.5,0),1,'不给时间就不动');
 near(lagStep(1,.5,.1),1-.1*LAG_RATE);
 near(lagStep(1,.5,100),.5,'追到真实值就停，不会穿过');
 // 回血：立刻跟上，否则残影会比真实血量短，读成「血更少」。
 assert.equal(lagStep(.3,.9,.01),.9);
 assert.equal(lagStep(.3,.9,0),.9);
 // 边界与坏值。
 assert.equal(lagStep(null,.4,1),.4);
 assert.equal(lagStep(undefined,.4,1),.4);
 assert.equal(lagStep(NaN,.4,1),.4);
 const badTarget=lagStep(.8,NaN,1);
 assert.ok(Number.isFinite(badTarget)&&badTarget>=0&&badTarget<=1,'坏目标不能把残影变成 NaN');
 assert.ok(badTarget<.8,'坏目标至少往 0 收，不会停在原位');
 near(lagStep(1.4,.5,.1),1-.1*LAG_RATE,'入参先夹到 0..1，再按速度追赶');
 assert.equal(lagStep(1,.5,-3),1,'负时间不推进');
 const step=lagStep(1,.5,1/60);
 assert.ok(step>0&&step<=1);
});

void test('血条滞后比血条本身慢一个量级，所以差距看得清',()=>{
 // 满条掉到零，按 60Hz 逐帧追赶，至少要走 1 秒以上。
 let lag=1;for(let i=0;i<60;i++)lag=lagStep(lag,0,1/60);
 assert.ok(lag>.4,'一秒内残影不应追平，否则读不出「刚掉掉」');
 let full=1,frames=0;while(full>1e-6&&frames<1000){full=lagStep(full,0,1/60);frames++;}
 assert.ok(frames>=90&&frames<=200,'满条追平时间应在 1.5–3.3 秒之间，实测 '+Math.round(frames/60*10)/10+' 秒');
});

void test('受击红晕按掉血比例累积，并按时间衰减且封顶',()=>{
 assert.ok(HURT_GAIN>0&&HURT_DECAY>0);
 assert.equal(hurtGain(0,100),0);
 near(hurtGain(10,100),10/100*HURT_GAIN);
 assert.ok(hurtGain(50,100)>hurtGain(10,100),'掉得多，红晕更重');
 assert.equal(hurtGain(100,100),1,'一次掉满血封顶');
 assert.equal(hurtGain(999,100),1);
 assert.equal(hurtGain(10,0),0,'最大生命为 0 不产生红晕');
 assert.equal(hurtGain(-5,100),0);
 near(hurtDecay(1,0),1,'不给时间就不衰减');
 near(hurtDecay(1,.1),1-.1*HURT_DECAY);
 assert.equal(hurtDecay(.05,1),0,'衰减到 0 就停，不会变负');
 assert.equal(hurtDecay(NaN,1),0);
 assert.equal(hurtDecay(1,-1),1);
});

void test('低血量脉冲只在阈值以下出现，越低越深，且与随机数无关',()=>{
 assert.ok(LOW_HEALTH>0&&LOW_HEALTH<1);
 assert.equal(lowHealthPulse(100,100,0),0);
 assert.equal(lowHealthPulse(50,100,1.7),0,'阈值以上一律不脉冲');
 assert.equal(lowHealthPulse(LOW_HEALTH*100,100,0),0,'刚好等于阈值也不脉冲');
 const shallow=lowHealthPulse(20,100,0),deep=lowHealthPulse(5,100,0);
 assert.ok(deep>shallow,'血越低脉冲越深');
 assert.ok(shallow>0);
 // 同一时刻重画得到同一画面：没有隐藏状态，也不取随机数。
 assert.equal(lowHealthPulse(10,100,3.25),lowHealthPulse(10,100,3.25));
 assert.notEqual(lowHealthPulse(10,100,0),lowHealthPulse(10,100,1/(4*PULSE_HZ)),'呼吸的四分之一周期处应当最亮');
 for(const seconds of [0,.1,.5,1,2.5,10]){const v=lowHealthPulse(7,100,seconds);assert.ok(v>=0&&v<=1,'脉冲必须落在 0..1');}
 assert.equal(lowHealthPulse(0,0,1),0,'最大生命为 0 不脉冲');
});

void test('红晕与脉冲合成一个边缘强度，开关关闭时整层为 0',()=>{
 assert.ok(VIGNETTE_MAX>0&&VIGNETTE_MAX<=.6,'边缘红晕不能盖住战场');
 near(vignetteAlpha(1,0),VIGNETTE_MAX);
 near(vignetteAlpha(0,1),VIGNETTE_MAX);
 near(vignetteAlpha(.5,0),VIGNETTE_MAX*.5);
 near(vignetteAlpha(.2,.8),VIGNETTE_MAX*.8,'取两者较大值');
 assert.equal(vignetteAlpha(1,1,false),0,'关掉受击反馈后一笔都不画');
 assert.equal(vignetteAlpha(0,0),0);
 assert.equal(vignetteAlpha(NaN,NaN),0);
 assert.equal(vignetteAlpha(5,5),VIGNETTE_MAX,'超上限不越界');
});

void test('伤害数字出现时放大回弹、上浮先快后慢，且都有边界',()=>{
 near(numberPop(0),1.5);
 near(numberPop(1),1);
 assert.ok(numberPop(.5)>numberPop(1),'越接近消散越回到原字号');
 assert.ok(numberPop(.1)>numberPop(.5),'出现瞬间最大');
 assert.equal(numberPop(-1),1.5,'进度先夹到 0..1');
 assert.equal(numberPop(5),1);
 near(numberRise(0),0,'刚出现时不位移');
 near(numberRise(1),26);
 assert.ok(numberRise(.5)>13,'上浮先快后慢，中点已经过半');
 assert.ok(numberRise(.9)<26,'接近消散时减速');
 assert.ok(numberRise(1)<=26);
 // 单调不减，数字不会先上后下。
 let last=-1;for(let i=0;i<=10;i++){const v=numberRise(i/10);assert.ok(v>=last);last=v;}
});

void test('设置页说明由同一份数据生成，不写死数字',()=>{
 const summary=impactSummary();
 assert.equal(summary.lowHealth,Math.round(LOW_HEALTH*100));
 assert.equal(summary.hurtDecay,HURT_DECAY);
 near(summary.lagSeconds,1/LAG_RATE,undefined,.05);
 assert.ok(summary.lagSeconds>1&&summary.lagSeconds<3);
});

void test('血条滞后是可选参数：不传时与 2.3 逐像素相同',()=>{
 const rows=[],ctx={lineWidth:8,globalAlpha:.2,fillStyle:'',save(){this.saved={lineWidth:this.lineWidth,globalAlpha:this.globalAlpha,fillStyle:this.fillStyle};},restore(){Object.assign(this,this.saved);},fillRect(x,y,w,h){rows.push({x,y,w,h,color:this.fillStyle});},strokeRect(){assert.fail('health bars must not inherit stroke width');}};
 // 不传 lag：只有描边底、槽底与真实血量三段，没有残影。
 for(const hp of [1000,500,100,0]){rows.length=0;drawHealthBar(ctx,20,30,80,7,hp,1000);
  assert.equal(rows.filter(r=>r.color===LAG_COLOR).length,0,'不传 lag 时不能出现残影');}
 // 传了 lag 且大于真实血量：多出一段残影，盖住「刚掉掉」的那一截。
 rows.length=0;const m=drawHealthBar(ctx,20,30,80,7,500,1000,'#dcaa5a',1);
 const ghost=rows.filter(r=>r.color===LAG_COLOR);
 assert.equal(ghost.length,1);
 assert.equal(ghost[0].w,80);
 assert.equal(ghost[0].x,20);
 assert.equal(m.fill,40,'真实血量仍按真实值画');
 // 残影比真实血量还小（例如回血）：不画，否则会读成「血更少」。
 rows.length=0;drawHealthBar(ctx,20,30,80,7,900,1000,'#dcaa5a',.3);
 assert.equal(rows.filter(r=>r.color===LAG_COLOR).length,0);
 assert.equal(ctx.lineWidth,8);
 assert.equal(ctx.globalAlpha,.2);
 assert.equal(healthFraction(1,0),0);
});

void test('打击反馈不消费随机数、不进快照、不改任何战斗字段',()=>{
 const b=controlled(battle());
 const rng=b.rng.state(),before=JSON.stringify(b.serialize());
 const p=b.player;
 // 走一遍 2.4 会用到的全部曲线。
 lagStep(1,.4,1/60);hurtGain(30,p.maxHp);hurtDecay(1,1/60);
 lowHealthPulse(p.hp,p.maxHp,b.time);vignetteAlpha(1,0,true);numberPop(.3);numberRise(.3);
 assert.equal(b.rng.state(),rng,'打击反馈不能消费随机数');
 assert.equal(JSON.stringify(b.serialize()),before,'打击反馈不能改战斗字段');
 assert.ok(!('fx' in b.serialize()),'特效数组必须留在表现层，不能进快照');
 assert.ok(!('hurt' in b.serialize())&&!('hpLag' in b.serialize()),'红晕与血条残影是渲染器私有状态，不能进快照');
});
