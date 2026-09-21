/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// WP0: the flying sword lives in its own atlas, and sword count is configuration driven with a
// level fallback so runs without a declared count keep the original min(72, level) relation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Expedition} from '../gameplay/expedition.js';
import {swordCountFor,MAX_SWORDS} from '../gameplay/balance.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('public/assets/encoded/manifest.json'));

void test('sword count follows the level curve and is only thinned by a cap',()=>{
 assert.equal(MAX_SWORDS,72);
 for(const level of [1,12,36,71,72,100,160])assert.equal(swordCountFor(level,null),Math.min(MAX_SWORDS,level));
 for(const cap of [undefined,null,NaN,72,999])for(const level of [1,40,72])assert.equal(swordCountFor(level,cap),Math.min(MAX_SWORDS,level));
 // A cap thins the array but can never exceed the level curve or the canonical seventy-two.
 assert.equal(swordCountFor(72,36),36);
 assert.equal(swordCountFor(10,36),10);
 assert.equal(swordCountFor(72,36.4),36);
 assert.equal(swordCountFor(72,0),1);
});

void test('a declared count reaches the live battle and survives a snapshot roundtrip',()=>{
 const b=new Expedition({seed:'wp0-count',path:0,weaponVersion:1,weapon:'heavy'});
 b.level=72;b.syncSwords();
 assert.equal(b.swords.length,36);
 const restored=Expedition.restore(copy(b.serialize()));
 assert.equal(restored.options.weapon,'heavy');
 assert.equal(restored.options.weaponVersion,1);
 assert.equal(restored.swords.length,36);
});

void test('a tampered sword array is still refused under a declared count',()=>{
 for(const count of [0,1,35,37,72]){
  const b=new Expedition({seed:'wp0-tamper',path:0,weaponVersion:1,weapon:'heavy'});
  b.level=72;b.syncSwords();
  const d=copy(b.serialize());
  d.expedition.swords=Array.from({length:count},()=>copy(d.expedition.swords[0]));
  assert.throws(()=>Expedition.restore(d),/飞剑数量与等级/,count+' swords should be refused');
 }
});

void test('the weapon atlas is a separate lossless sheet sized for four methods',()=>{
 const hero=manifest.assets.hero,weapons=manifest.assets.weapons;
 assert.ok(weapons,'the weapon atlas is missing from the encoding manifest');
 assert.notEqual(weapons.source,hero.source,'the weapon atlas must not reuse the hero sheet');
 assert.equal(weapons.file,'encoded/weapon-atlas.webp');
 assert.equal(weapons.encoding,'lossless');
 assert.equal(weapons.rgbaExact,true);
 assert.equal(weapons.alphaExact,true);
 assert.equal(weapons.width,hero.width);
 assert.equal(weapons.height,hero.height/2);
 for(const file of ['public/assets/'+weapons.source,'public/assets/'+weapons.file])fs.accessSync(new URL('../'+file,import.meta.url));
});

void test('rendering reads the weapon sheet instead of a character frame',()=>{
 const art=read('gameplay/art.js');
 assert.doesNotMatch(art,/heroes\[7\]/,'the sword must not come from the character sheet');
 assert.match(art,/const weaponArt=this\.art\.weapons\[0\]/);
});
