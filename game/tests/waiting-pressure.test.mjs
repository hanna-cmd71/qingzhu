/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {ENCOUNTER_VERSION,ordinaryCount,mechanismLimit,mechanismDeadline} from '../gameplay/director-rules.js';
import {recordGroup} from '../gameplay/records.js';
import {currentRecordRules} from '../gameplay/record-browser.js';
import {routeTactics} from '../gameplay/player-guidance.js';

const positions={treasure:[3,0],illusion:[3,1],ice:[5,2],swarm:[2,3]};
function arena(kind,options={}){
 const [chapter,wave]=positions[kind];
 const b=new Expedition({seed:'waiting-pressure',runId:'waiting-pressure',chapter,...options});
 b.wave=wave;b.node.selected=0;b.beginNode();return b;
}
function director(b,seconds,remove=false){
 for(let t=0;t<seconds-1e-8;t+=.05){
  b.time+=.05;b.waveTime+=.05;b.updateDirector(.05);
  if(remove)b.enemies=b.enemies.filter(e=>e.mission);
 }
}
function restore(b){const r=Expedition.restore(structuredClone(b.serialize()));r.showScene(null,'battle');return r;}

void test('current encounters inherit route4 and timers, keeps chain RNG, and ranks separately',()=>{
 for(let seed=0;seed<20;seed++){
  const a=new Expedition({seed:String(seed),encounterVersion:4}),b=new Expedition({seed:String(seed)});
  assert.equal(b.options.encounterVersion,ENCOUNTER_VERSION);
  assert.deepEqual(b.serialize().expedition.routePlan,a.serialize().expedition.routePlan);
  assert.deepEqual(b.chains,a.chains);assert.equal(b.contentRng.state(),a.contentRng.state());
  assert.equal(b.routes.flat().reduce((sum,n)=>sum+n.xp,0),11960);
  const ar=a.summary().recordDetails.rules,br=b.summary().recordDetails.rules;
  assert.notEqual(recordGroup({rules:ar}),recordGroup({rules:br}));
  assert.equal(currentRecordRules(ar),false);assert.equal(currentRecordRules(br),true);
  const bad=b.serialize();delete bad.expedition.routePlan;assert.throws(()=>Expedition.restore(bad),/路线/);
 }
 assert.equal(arena('treasure').mechanism.goal,30);assert.equal(arena('illusion').objective.next,7);
});

for(const kind of ['treasure','illusion','ice']){
 void test(kind+' gains early enemies, saves pending budget and resumes the same sequence',()=>{
  const b=arena(kind);b.player.x=80;b.player.y=700;director(b,.5);
  assert.ok(b.enemies.length>0);assert.ok(b.enemies.every(e=>!e.mission&&!e.boss));
  assert.ok(b.enemies.every(e=>Math.hypot(e.x-b.player.x,e.y-b.player.y)>=170));
  assert.match(routeTactics(b.encounter,b),/追兵/);
  const r=restore(b);assert.equal(r.options.encounterVersion,ENCOUNTER_VERSION);
  director(b,5);director(r,5);
  assert.equal(b.rng.state(),r.rng.state());assert.deepEqual(b.enemies,r.enemies);
  assert.deepEqual(b.directorState,r.directorState);assert.equal(b.spawnBudget,r.spawnBudget);
  assert.equal(b.nextElite,r.nextElite);assert.deepEqual(b.objective,r.objective);
  assert.deepEqual(b.mechanism,r.mechanism);
 });

 for(const difficulty of [0,1,2])void test(kind+' caps every ordinary spawn and stops at deadline, difficulty '+difficulty,()=>{
  const b=arena(kind,{difficulty});b.player.x=80;b.player.y=700;
  for(let i=0;i<100;i++)b.spawn(b.enemyPool()[0],{elite:i%3===0,noDrop:true});
  assert.equal(ordinaryCount(b),mechanismLimit(b));
  director(b,2);assert.ok(b.spawnBudget<=5);assert.equal(ordinaryCount(b),mechanismLimit(b));
  b.time+=mechanismDeadline(b)-b.waveTime;b.waveTime=mechanismDeadline(b);b.updateDirector(0);
  assert.equal(b.spawnBudget,0);assert.equal(b.directorState.pendingType,null);
  assert.match(b.objectiveText(),/增援已止/);assert.equal(b.receipts.length,0);
  const r=restore(b),rng=r.rng.state();
  assert.equal(r.spawn(r.enemyPool()[0],{noDrop:true}),null);
  assert.equal(r.spawn(r.enemyPool()[0],{elite:true}),null);
  director(r,2);assert.equal(r.rng.state(),rng);assert.equal(r.receipts.length,0);
 });

 void test(kind+' legacy encounter1–4 keeps its empty waiting stage through restore',()=>{
  for(const encounterVersion of [1,2,3,4]){
   const b=arena(kind,{encounterVersion});b.player.x=80;b.player.y=700;director(b,20);
   assert.equal(b.enemies.length,0);assert.equal(b.spawnBudget,0);
   const r=restore(b);director(r,5);assert.equal(r.enemies.length,0);
   assert.equal(r.options.encounterVersion,encounterVersion);
   if(kind==='treasure')assert.equal(r.mechanism.goal,encounterVersion<3?42:30);
   if(kind==='illusion')assert.equal(r.objective.next,encounterVersion<3?10:7);
  }
 });
}

void test('treasure progress survives leaving, fighting, restoring, and completes once with bounded rewards',()=>{
 let b=arena('treasure');b.player.x=b.mechanism.x;b.player.y=b.mechanism.y;
 director(b,4);const progress=b.mechanism.progress;
 b.player.x=80;b.player.y=700;director(b,2);assert.equal(b.mechanism.progress,progress);
 b=restore(b);assert.equal(b.mechanism.progress,progress);
 for(let i=0;i<20;i++){const e=b.spawn(b.enemyPool()[0]);if(e){b.kill(e);b.enemies=b.enemies.filter(e=>e.hp>0);}}
 b.collectAll();while(b.modeState==='choice')b.chooseTrait(b.choices[0].id);
 for(let guard=0;guard<800&&b.modeState==='battle';guard++){
  b.player.x=b.mechanism.x;b.player.y=b.mechanism.y;director(b,.05);
 }
 assert.ok(b.receipts.includes('3:0'));assert.ok(b.storyInventory.includes('five-rings'));assert.ok(b.storyInventory.includes('cape'));
 assert.equal(b.enemies.length,0);assert.equal(b.shots.length,0);
 assert.ok(b.growth.settlements[0].bonus<=b.node.xp*.25+1e-6);
 const xp=b.totalXP,gold=b.gold;reread();reread();
 function reread(){b=Expedition.restore(b.serialize());b.completeNode();assert.equal(b.totalXP,xp);assert.equal(b.gold,gold);assert.equal(b.growth.settlements.length,1);}
});

void test('illusion and ice finish with living pursuers; kills never replace the objective',()=>{
 const b=arena('illusion');director(b,7);b.waveTime=7;assert.ok(b.enemies.length);
 b.player.x=b.objective.gates[b.objective.trueGate].x;b.player.y=250;b.updateDirector(0);
 assert.equal(b.objective.done,1);assert.equal(b.objective.next,17);
 for(const t of [17,27]){b.time+=t-b.waveTime;b.waveTime=t;b.player.x=b.objective.gates[b.objective.trueGate].x;b.player.y=250;b.updateDirector(0);}
 assert.deepEqual(b.receipts,['3:1']);assert.equal(b.enemies.length,0);Expedition.restore(b.serialize());
 const ice=arena('ice');ice.player.x=ice.objective.exit.x;ice.player.y=ice.objective.exit.y;
 director(ice,39);assert.equal(ice.receipts.length,0);assert.ok(ice.enemies.length);
 ice.time++;ice.waveTime=40;ice.updateDirector(0);
 assert.deepEqual(ice.receipts,['5:2']);assert.equal(ice.enemies.length,0);Expedition.restore(ice.serialize());
});

void test('ice/fire ordinary nodes and ant swarm have higher spawn throughput, early chapters and bosses are unchanged',()=>{
 for(const chapter of [0,1,2,4,5]){
  const counts=[];
  for(const encounterVersion of [4,5]){
   const b=new Expedition({chapter,seed:'pressure-density',encounterVersion});b.node.selected=0;b.beginNode();
   let count=0;const spawn=b.spawn.bind(b);b.spawn=(...args)=>{const e=spawn(...args);if(e&&!e.mission)count++;return e;};
   director(b,30,true);counts.push(count);
  }
  if(chapter<2)assert.equal(counts[1],counts[0]);else assert.ok(counts[1]>counts[0],JSON.stringify({chapter,counts}));
 }
 const a=arena('swarm',{encounterVersion:4}),b=arena('swarm');
 director(a,10);director(b,10);assert.ok(b.enemies.length>a.enemies.length);
 assert.equal(a.boss.timer,b.boss.timer);assert.equal(b.nextElite,22);
 for(const [chapter,wave]of [[0,3],[1,3],[4,3],[5,3]]){
  const a=new Expedition({chapter,encounterVersion:4,seed:'boss-pressure',balanceVersion:3}),b=new Expedition({chapter,seed:'boss-pressure',balanceVersion:3});
  for(const run of [a,b]){run.wave=wave;run.node.selected=0;run.beginNode();director(run,5);}
  assert.deepEqual(b.enemies,a.enemies);assert.equal(b.spawnBudget,a.spawnBudget);
 }
 const training=new Expedition({mode:'training',guidedPractice:true});training.beginNode();
 assert.equal(training.spawnBudget,0);assert.equal(training.receipts.length,0);
});
