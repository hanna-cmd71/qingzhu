/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// WP4: weapon methods are parameter-only and version gated. A run without the marker keeps the
// original sword, and a declared method can only thin the array, never exceed the level curve.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {MAX_SWORDS} from '../gameplay/balance.js';
import {WEAPON_VERSION,DEFAULT_WEAPON,WEAPONS,weaponById,weaponIds,weaponMods,weaponSwordCap} from '../gameplay/weapons.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const close=(a,b)=>Math.abs(a-b)<1e-9;

void test('the weapon table only holds parameter-only methods with legal caps',()=>{
 assert.equal(WEAPON_VERSION,1);
 assert.ok(weaponIds.includes(DEFAULT_WEAPON));
 assert.equal(new Set(weaponIds).size,weaponIds.length);
 assert.ok(WEAPONS.length>=3&&WEAPONS.length<=4,'agreed scale is three to four methods');
 for(const w of WEAPONS){
  assert.equal(typeof w.name,'string');assert.equal(typeof w.desc,'string');
  for(const v of Object.values(w.mods))assert.ok(Number.isFinite(v),w.id+' has a non-numeric modifier');
  if(w.swordCap!==null){assert.ok(w.swordCap>=1&&w.swordCap<=MAX_SWORDS,w.id+' cap out of range');assert.ok(w.swordCap<MAX_SWORDS,'a cap above the canonical total is not a method');}
  assert.ok(!('onHit' in w)&&!('attack' in w)&&!('form' in w),'methods must not take over the attack form');
 }
 assert.equal(weaponById('does-not-exist').id,DEFAULT_WEAPON);
});

void test('runs without the marker keep the original sword',()=>{
 for(const options of [{},{weaponVersion:0},{weaponVersion:0,weapon:'heavy'}]){
  assert.deepEqual(weaponMods(options),{});
  assert.equal(weaponSwordCap(options),null);
 }
 assert.deepEqual(weaponMods({weaponVersion:1,weapon:DEFAULT_WEAPON}),{});
 assert.equal(weaponSwordCap({weaponVersion:1,weapon:DEFAULT_WEAPON}),null);
});

void test('a declared method reaches the live stats and the sword array',()=>{
 const base=new Expedition({seed:'weapon-method',path:0});
 const heavy=new Expedition({seed:'weapon-method',path:0,weaponVersion:1,weapon:'heavy'});
 assert.ok(close(heavy.stats.damage-base.stats.damage,.35));
 assert.ok(close((heavy.stats.haste||0)-(base.stats.haste||0),-.1));
 heavy.level=50;heavy.syncSwords();
 assert.equal(heavy.swords.length,36,'a cap thins the array');
 const flow=new Expedition({seed:'weapon-method',path:0,weaponVersion:1,weapon:'flow'});
 flow.level=50;flow.syncSwords();
 assert.equal(flow.swords.length,50,'a method without a cap keeps the level curve');
 const pierce=new Expedition({seed:'weapon-method',path:0,weaponVersion:1,weapon:'pierce'});
 assert.ok(close(pierce.stats.pierce-(base.stats.pierce||0),1));
});

void test('a run without the marker behaves exactly like the default method',()=>{
 // Weapon fields are opt-in: defaulting them would rewrite every snapshot and break the frozen
 // engine comparison, so an untouched run must serialise without them.
 const run=new Expedition({seed:'weapon-default',path:0});
 assert.equal(run.options.weaponVersion,undefined);
 assert.equal(run.options.weapon,undefined);
 assert.equal('weaponVersion' in run.serialize().options,false);
 run.level=72;run.syncSwords();
 assert.equal(run.swords.length,MAX_SWORDS);
 const explicit=new Expedition({seed:'weapon-default',path:0,weaponVersion:1,weapon:DEFAULT_WEAPON});
 explicit.level=72;explicit.syncSwords();
 assert.equal(explicit.swords.length,MAX_SWORDS);
 assert.equal(explicit.stats.damage,run.stats.damage);
});

void test('a legacy snapshot without the marker still restores',()=>{
 const b=new Expedition({seed:'weapon-legacy',path:0});
 b.level=40;b.syncSwords();
 const d=copy(b.serialize());
 delete d.options.weaponVersion;delete d.options.weapon;
 const restored=Expedition.restore(d);
 assert.equal(restored.swords.length,40);
 assert.equal(restored.options.weapon,undefined);
});

void test('an unknown method or an illegal version is refused before it can replace a save',()=>{
 const declare=()=>new Expedition({seed:'weapon-tamper',path:0,weaponVersion:1,weapon:DEFAULT_WEAPON});
 for(const mutate of [d=>d.options.weapon='ghost',d=>d.options.weapon=undefined,d=>d.options.weaponVersion=2]){
  const d=copy(declare().serialize());
  mutate(d);
  assert.throws(()=>Expedition.restore(d),/御剑法门/);
 }
 // A method id without its version marker is a mistake, not a silent fallback.
 const orphan=copy(declare().serialize());
 delete orphan.options.weaponVersion;
 assert.throws(()=>Expedition.restore(orphan),/御剑法门版本/);
});
