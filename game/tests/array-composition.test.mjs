/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// 剑阵 2.0: 阵图编成 (A), 御剑笔画 (B), 剑意·合体 (C) and 剑气刻痕 (D).
// The layer is opt-in per run, so half of these tests are about the untouched path: a run without the
// marker must keep the original three formations, the original cool bound and an unchanged snapshot.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {ARRAY_VERSION,ARRAY_PRESETS,DEFAULT_PRESET,SWORD_ROLES,ROLE_PARAMS,arrayPresetIds,arrayPresetById,nextArrayPreset,roleFor,roleCounts,arrayMaxRange,arrayDeclared,arrayMaxSwordCool,STROKE,strokeLength,strokeValid,strokePointAt,INTENT,intentReady,intentLabel,CARVE,carveDamage} from '../gameplay/array.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const step=(b,n)=>{for(let i=0;i<n;i++)b.update(1/60);};
const battle=(options={})=>{const b=new Expedition({seed:'array-2',path:0,...options});b.start();if(b.cinematic)b.advanceCinematic(true);return b;};
// Test battles must not receive director reinforcements, so `controlled` shadows the spawner. Every
// unit below is placed by the test itself with a very large HP pool so a single assertion cannot be
// masked by a kill.
const controlled=b=>{b.updateDirector=null;b.boss=null;b.enemies=[];b.waveTime=0;b.place=b.spawn.bind(b);b.spawn=()=>null;return b;};
const unit=(b,opts={})=>b.place(0,{hp:1e9,speed:0,...opts});
const withArray=()=>controlled(battle({arrayVersion:ARRAY_VERSION}));
const plain=()=>controlled(battle({}));
const huge=b=>unit(b,{x:b.player.x+60,y:b.player.y});

void test('the array tables are complete, unique and total',()=>{
 assert.equal(ARRAY_VERSION,1);
 assert.ok(arrayPresetIds.includes(DEFAULT_PRESET));
 assert.equal(new Set(arrayPresetIds).size,arrayPresetIds.length);
 assert.equal(new Set(SWORD_ROLES.map(r=>r.id)).size,SWORD_ROLES.length);
 assert.equal(ARRAY_PRESETS.length,4);
 for(const p of ARRAY_PRESETS){
  assert.equal(typeof p.name,'string');assert.equal(typeof p.desc,'string');
  assert.ok(Object.keys(p.weights).length>0,p.id+' has no wings');
  for(const role of Object.keys(p.weights)){
   assert.ok(SWORD_ROLES.some(r=>r.id===role),p.id+' names an unknown role');
   assert.ok(p.weights[role]>0);
  }
 }
 for(const [id,params] of Object.entries(ROLE_PARAMS)){
  assert.ok(SWORD_ROLES.some(r=>r.id===id));
  for(const [key,value] of Object.entries(params))if(key!=='pick')assert.ok(Number.isFinite(value),id+' has a non-numeric '+key);
  assert.ok(['near','far','spread'].includes(params.pick));
 }
 assert.equal(arrayPresetById('does-not-exist').id,DEFAULT_PRESET);
 assert.equal(nextArrayPreset('does-not-exist'),nextArrayPreset(DEFAULT_PRESET));
});

void test('a preset hands every sword exactly one role and the counts agree with the table',()=>{
 for(const p of ARRAY_PRESETS){
  const counts=roleCounts(p.id,72);
  assert.equal(Object.values(counts).reduce((a,c)=>a+c,0),72);
  for(const r of SWORD_ROLES)if(!(r.id in p.weights))assert.equal(counts[r.id],0,p.id+' fields a wing it does not name');
  for(let i=0;i<72;i++)assert.ok(SWORD_ROLES.some(r=>r.id===roleFor(p.id,i,72)));
  // Deterministic and total for odd totals too.
  for(const total of [1,5,7,36,73])for(let i=0;i<total;i++)assert.ok(SWORD_ROLES.some(r=>r.id===roleFor(p.id,i,total)));
 }
 assert.deepEqual(roleCounts('blade',72),{chase:72,orbit:0,anchor:0,roam:0});
 assert.equal(roleCounts('ward',72).chase,0);
 assert.ok(roleCounts('ward',72).orbit>0&&roleCounts('ward',72).anchor>0);
 assert.ok(roleCounts('hunt',72).roam>0&&roleCounts('hunt',72).chase>0);
 assert.ok(arrayMaxRange('hunt',{},72)>=ROLE_PARAMS.roam.range);
 assert.ok(arrayMaxRange('ward',{range:.2},72)>=ROLE_PARAMS.anchor.range*1.2);
});

void test('a run without the marker keeps the original three formations and an unchanged snapshot',()=>{
 const b=plain();
 assert.equal(b.arrayPreset,undefined);
 assert.equal(b.swordIntent,undefined);
 assert.equal(arrayDeclared(b.options),false);
 assert.equal(b.fuseSwords(),false);
 assert.equal(b.beginStroke(),false);
 assert.equal(b.intentReadiness().ready,false);
 const names=[];for(let i=0;i<4;i++){names.push(b.formation||0);b.changeFormation();}
 assert.deepEqual(names,[0,1,2,0],'the original three formations still cycle');
 const d=b.serialize();
 assert.equal('arrayPreset' in d,false);
 assert.equal('swordIntent' in d,false);
 assert.equal(Object.keys(d.options).some(k=>k.startsWith('array')),false);
});

void test('without the marker no sword can exceed the original cool bound and nothing carves',()=>{
 const b=plain();b.level=72;b.syncSwords();
 huge(b);
 step(b,180);
 assert.ok(b.swords.every(s=>s.cool<=1.05+1e-9),'the frozen cool bound still holds');
 assert.equal(b.zones.some(z=>z.carve),false);
 assert.equal(b.carveQueue,undefined);
 assert.equal(b.sweep,undefined);
 assert.equal(b.fusion,undefined);
});

void test('阵图编成 cycles the four presets',()=>{
 const b=withArray();
 const seen=[];for(let i=0;i<5;i++){seen.push(b.arrayPreset);b.changeFormation();}
 assert.deepEqual(seen,['balanced','ward','hunt','blade','balanced']);
 assert.equal(b.arrayPresetName(),arrayPresetById(b.arrayPreset).name);
});

void test('阵位角色 reaches the array: 定锋 carries extra pierce and 环锋 holds the inner ring',()=>{
 // Read the pierce a wing launches with, before any 聚锋 bonus can raise it afterwards.
 const launchPierce=(preset,index)=>{const b=withArray();b.arrayPreset=preset;b.level=72;b.syncSwords();
  unit(b,{x:b.player.x+300,y:b.player.y});
  for(let i=0;i<120;i++){b.update(1/60);if(b.swords[index].target)return b.swords[index].pierce;}
  return null;};
 const probe=preset=>{const b=withArray();b.arrayPreset=preset;b.level=72;b.syncSwords();unit(b,{x:b.player.x+300,y:b.player.y});step(b,36);return b;};
 const ward=probe('ward');
 const anchorIndex=ward.swords.map((_,i)=>i).find(i=>roleFor('ward',i,72)==='anchor');
 assert.ok(anchorIndex!==undefined);
 assert.equal(launchPierce('ward',anchorIndex),1,'定锋 launches with its extra pierce');
 assert.equal(launchPierce('blade',0),0,'追锋 carries no extra pierce');
 const orbit=ward.swords.map((_,i)=>i).filter(i=>roleFor('ward',i,72)==='orbit');
 assert.ok(orbit.length>0);
 assert.ok(orbit.every(i=>ward.swords[i].target===null),'环锋 never reaches a target 300 away');
 assert.ok(probe('blade').swords.some(s=>s.target),'追锋 reaches the same target');
 assert.ok(ward.swords.every(s=>s.cool<=arrayMaxSwordCool()+1e-9));
});

void test('游锋 hunts the far edge while 追锋 takes the nearest',()=>{
 const targetOf=(preset,index)=>{const b=withArray();b.arrayPreset=preset;b.level=72;b.syncSwords();
  unit(b,{x:b.player.x+200,y:b.player.y});
  const far=unit(b,{x:b.player.x+480,y:b.player.y});
  for(let i=0;i<90;i++){b.update(1/60);const t=b.swords[index].target;if(t)return {target:t,far};}
  return {target:null,far};};
 const roam=targetOf('hunt',0);
 assert.ok(roam.target,'游锋 launches');
 assert.equal(roam.target,roam.far,'游锋 prefers the farthest candidate');
 const chase=targetOf('blade',0);
 assert.ok(chase.target,'追锋 launches');
 assert.notEqual(chase.target,chase.far,'追锋 stays with the nearest candidate');
});

void test('剑意 fills from sword hits and the fusion spends it without refilling',()=>{
 const b=withArray();b.level=20;b.syncSwords();
 const e=huge(b);
 step(b,60);
 assert.ok(b.swordIntent>0,'sword hits build 剑意');
 assert.ok(b.swordIntent<=INTENT.max);
 assert.equal(intentReady(b.swordIntent),b.swordIntent>=INTENT.max);
 assert.equal(intentLabel(b.swordIntent).startsWith('剑意 '),true);
 b.swordIntent=INTENT.max-1;
 assert.equal(b.intentReadiness().ready,false);
 b.swordIntent=INTENT.max;
 assert.equal(b.intentReadiness().ready,true);
 assert.equal(intentLabel(b.swordIntent),'剑意圆满 · 可合体');
 assert.equal(b.fuseSwords(),true);
 assert.equal(b.swordIntent,0,'the fusion spends the meter');
 assert.ok(b.fusion);
 assert.equal(b.fuseSwords(),false,'a second fusion cannot start mid-sweep');
 const hp=e.hp;
 step(b,60);
 assert.equal(b.swordIntent,0,'the fusion must not refill its own meter');
 assert.ok(e.hp<hp,'the fused blade damages what it sweeps');
 step(b,360);
 assert.equal(b.fusion,null,'the fusion ends on its own');
 assert.ok(b.swordIntent>0,'the array builds 剑意 again afterwards');
});

void test('a fusion is refused while 剑意 is short or outside battle',()=>{
 const b=withArray();
 b.swordIntent=INTENT.max-1;
 assert.equal(b.intentReadiness().ready,false);
 assert.equal(b.fuseSwords(),false);
 assert.equal(b.swordIntent,INTENT.max-1);
 b.swordIntent=INTENT.max;
 b.modeState='pause';
 assert.equal(b.fuseSwords(),false);
 assert.equal(b.swordIntent,INTENT.max,'a refused fusion does not spend the meter');
});

void test('御剑笔画 records a path, drops stray points and refuses a too-short stroke',()=>{
 const b=withArray();
 assert.equal(b.endStroke(),false,'nothing was begun');
 assert.equal(b.beginStroke(),true);
 assert.equal(b.addStrokePoint(100,100),true);
 assert.equal(b.addStrokePoint(102,101),false,'points closer than the sample spacing are dropped');
 for(let i=1;i<=20;i++)b.addStrokePoint(100+i*30,100);
 assert.equal(b.stroke.points.length,21);
 assert.equal(b.endStroke(),true);
 assert.ok(b.sweep);
 assert.equal(b.sweep.len,strokeLength(b.sweep.points));
 assert.ok(b.sweep.len>=STROKE.minLength);
 // A stray drag is refused and must not replace the sweep already in flight.
 const flying=b.sweep;
 b.beginStroke();b.addStrokePoint(400,400);b.addStrokePoint(410,404);
 assert.equal(b.endStroke(),false);
 assert.equal(b.sweep,flying,'the refused stroke does not replace a sweep');
});

void test('the sweep cuts what the line crosses once and leaves everything else alone',()=>{
 const b=withArray();b.arrayPreset='blade';b.level=10;b.syncSwords();
 b.beginStroke();
 for(let i=1;i<=20;i++)b.addStrokePoint(100+i*30,100);
 assert.equal(b.endStroke(),true);
 // Both units sit outside every wing's reach (追锋 320), so only the line can touch them.
 const along=unit(b,{x:400,y:100});
 const off=unit(b,{x:1200,y:760});
 const offHp=off.hp;
 step(b,90);
 assert.ok(along.hp<1e9,'the sweep cuts the line it flies');
 assert.equal(off.hp,offHp,'nothing off the line is touched');
 assert.equal(b.sweep,null,'the sweep ends when the path is consumed');
 assert.ok(strokeValid([{x:0,y:0},{x:200,y:0}]));
 assert.equal(strokeValid([{x:0,y:0}]),false);
 assert.deepEqual(strokePointAt([{x:0,y:0},{x:200,y:0}],100),{x:100,y:0});
 assert.deepEqual(strokePointAt([{x:0,y:0},{x:200,y:0}],999),{x:200,y:0});
});

void test('剑气刻痕 is armed, inert, and consumed by the next sword hit near it',()=>{
 const b=withArray();b.level=10;b.syncSwords();
 const e=huge(b);
 const mark={x:e.x,y:e.y,r:CARVE.radius,ttl:CARVE.ttl,warn:0,kind:'carve',friendly:true,carve:true,damage:carveDamage(10)};
 b.zones.push(mark);
 // An armed mark is inert: it queues nothing and damages nothing on its own.
 b.resolveCarves();
 assert.equal(b.carveQueue,undefined);
 assert.ok(b.zones.includes(mark));
 // A sword hit inside the trigger distance queues it, and resolveCarves detonates it exactly once.
 b.hit(e,1,'sword');
 assert.equal(b.carveQueue.length,1);
 assert.equal(b.carveQueue[0],mark);
 b.resolveCarves();
 assert.equal(b.zones.includes(mark),false);
 assert.equal(mark.fired,true);
 assert.equal(b.carveQueue.length,0);
 assert.equal(b.zones.some(z=>z.carve),false,'the detonation itself does not carve again');
});

void test('the 刻痕 count is capped so a dense fight cannot carpet the field',()=>{
 const b=withArray();
 const original=b.rng;b.rng=()=>0; // always below CARVE.chance
 const e={x:300,y:300,hp:1e9,r:14};
 try{
  for(let i=0;i<CARVE.max+5;i++){b.carving=false;b.carveQueue=[];e.x=300+i*400;e.y=300+i*400;b.onSwordHit(e);}
 }finally{b.rng=original;}
 assert.equal(b.zones.filter(z=>z.carve).length,CARVE.max);
});

void test('the array snapshot round-trips and a preset without its marker is refused',()=>{
 const b=withArray();
 b.arrayPreset='hunt';b.swordIntent=42.5;
 const d=b.serialize();
 assert.equal(d.arrayPreset,'hunt');
 assert.equal(d.swordIntent,42.5);
 assert.equal(d.options.arrayVersion,ARRAY_VERSION);
 const restored=Expedition.restore(copy(d));
 assert.equal(restored.arrayPreset,'hunt');
 assert.equal(restored.swordIntent,42.5);
 assert.equal(restored.arrayPresetName(),'游猎');
 assert.equal(arrayDeclared(restored.options),true);
 for(const mutate of [
  d=>{d.arrayPreset='ghost'},
  d=>{d.swordIntent=1e6},
  d=>{d.swordIntent=-1},
  d=>{delete d.options.arrayVersion},
  d=>{d.options.arrayVersion=2},
 ]){
  const tampered=copy(d);mutate(tampered);
  assert.throws(()=>Expedition.restore(tampered),/剑阵|剑意/);
 }
 // A marker without a preset is legal: the default preset fills in.
 const bare=copy(d);delete bare.arrayPreset;
 const filled=Expedition.restore(bare);
 assert.equal(filled.arrayPresetName(),arrayPresetById(DEFAULT_PRESET).name);
});

void test('the fusion and the stroke never write array state into a run that lacks the marker',()=>{
 const b=plain();b.level=30;b.syncSwords();
 const d=copy(b.serialize());
 for(const key of ['arrayPreset','swordIntent'])delete d[key];
 assert.throws(()=>Expedition.restore({...d,arrayPreset:'ward'}),/剑阵阵图/);
 const restored=Expedition.restore(d);
 assert.equal(restored.arrayPreset,undefined);
 assert.equal(intentReady(undefined),false);
 assert.equal(b.intentReadiness().ready,false);
});

// The engine encodes "not declared" as anything below 1 (see arrayDeclared), so a snapshot carrying
// arrayVersion 0 is a legal opt-out and must not be reported as a version mismatch.
void test('arrayVersion 0 is an opt-out, not a version mismatch',()=>{
 const b=controlled(battle({arrayVersion:0}));
 assert.equal(arrayDeclared(b.options),false);
 assert.equal(b.arrayPreset,undefined);
 assert.equal(b.intentReadiness().ready,false);
 assert.equal(b.fuseSwords(),false);
 assert.equal(b.beginStroke(),false);
 b.changeFormation();b.changeFormation();
 assert.equal(b.formation,2);
 const d=copy(b.serialize());
 delete d.arrayPreset;delete d.swordIntent;
 assert.equal(d.options.arrayVersion,0);
 const restored=Expedition.restore(d);
 assert.equal(restored.arrayPreset,undefined);
 assert.equal(arrayDeclared(restored.options),false);
 // 剑意 without the marker is refused even though the version itself is legal.
 assert.throws(()=>Expedition.restore({...d,swordIntent:10}),/剑意/);
});
