/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {ordinaryCount,mechanismLimit} from '../gameplay/director-rules.js';

function arena(kind,encounterVersion,difficulty=1){
 const [chapter,wave]={treasure:[3,0],illusion:[3,1],ice:[5,2]}[kind];
 const b=new Expedition({chapter,encounterVersion,difficulty,seed:'mechanism-density',runId:'mechanism-density'});
 b.wave=wave;b.beginNode();b.player.x=80;b.player.y=700;return b;
}
for(const kind of ['treasure','illusion','ice'])void test(kind+' generates materially more enemies than version5 without extending the objective',()=>{
 const counts=[];
 for(const version of [5,6]){
  const b=arena(kind,version);let count=0;
  const spawn=b.spawn.bind(b);b.spawn=(...args)=>{const e=spawn(...args);if(e)count++;return e;};
  // Continuous clearing measures actual throughput, including enemy costs and ranged quota.
  for(let i=0;i<600;i++){b.time+=.05;b.waveTime+=.05;b.updateDirector(.05);b.enemies=[];}
  counts.push(count);assert.equal(b.receipts.length,0);
  assert.equal(b.mechanism?.goal??b.objective.next??40,kind==='treasure'?30:kind==='illusion'?7:40);
 }
 assert.ok(counts[1]>=counts[0]*1.5,JSON.stringify({kind,counts}));
});

void test('version6 admits two early elites, saves their schedule, and version5 keeps one late elite',()=>{
 for(const version of [5,6])for(const kind of ['treasure','illusion','ice']){
  let b=arena(kind,version);const start=b.time;
  for(const time of [10,18,30]){b.time=start+time;b.waveTime=time;b.updateDirector(0);}
  assert.equal(b.enemies.filter(e=>e.elite).length,version===6?2:1);
  const next=b.nextElite;b=Expedition.restore(b.serialize());b.showScene(null,'battle');
  b.updateDirector(0);assert.equal(b.nextElite,next);assert.equal(b.enemies.filter(e=>e.elite).length,version===6?2:1);
 }
});

void test('version5 caps survive restore while version6 uses the new difficulty caps',()=>{
 for(const version of [5,6])for(const difficulty of [0,1,2]){
  const b=arena('treasure',version,difficulty),limit=(version===5?[12,18,24]:[18,26,34])[difficulty];
  for(let i=0;i<100;i++)b.spawn(b.enemyPool()[0],{elite:i%4===0});
  assert.equal(ordinaryCount(b),limit);assert.equal(mechanismLimit(b),limit);
  const r=Expedition.restore(b.serialize());assert.equal(r.options.encounterVersion,version);assert.equal(ordinaryCount(r),limit);
 }
});

void test('version6 preserves every ordinary node, swarm and boss director from version5',()=>{
 for(let seed=0;seed<4;seed++)for(const chapter of [0,1,2,4,5]){
  for(let wave=0;wave<4;wave++){
   if(chapter===5&&wave===2)continue;
   const runs=[5,6].map(encounterVersion=>{const b=new Expedition({chapter,seed:'same-outside-'+seed,runId:'same-outside',encounterVersion});b.wave=wave;b.node.selected=0;b.beginNode();return b;});
   for(const b of runs)for(let t=0;t<500;t++){b.time+=.05;b.waveTime+=.05;b.updateDirector(.05);}
   const [a,b]=runs;assert.deepEqual(b.enemies,a.enemies);assert.equal(b.rng.state(),a.rng.state());
   assert.equal(b.spawnBudget,a.spawnBudget);assert.equal(b.nextElite,a.nextElite);assert.deepEqual(b.objective,a.objective);
  }
 }
});
