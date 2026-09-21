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

void test('sword count keeps the level relation unless a weapon method declares one',()=>{
 for(const level of [1,12,36,71,72,100,160])assert.equal(swordCountFor(level,{}),Math.min(MAX_SWORDS,level));
 assert.equal(swordCountFor(72,undefined),72);
 for(const options of [{},{swordCount:undefined},{swordCount:null},{swordCount:NaN},{swordCount:'72'}])assert.equal(swordCountFor(72,options),72);
});

void test('a declared sword count wins and is clamped to the legal range',()=>{
 assert.equal(MAX_SWORDS,72);
 for(const [declared,expected] of [[50,50],[1,1],[0,1],[-5,1],[72,72],[999,72],[36.4,36]])assert.equal(swordCountFor(1,{swordCount:declared}),expected);
 assert.equal(swordCountFor(100,{swordCount:12}),12);
});

void test('a declared count reaches the live battle and survives a snapshot roundtrip',()=>{
 const b=new Expedition({seed:'wp0-count',path:0,swordCount:50});
 assert.equal(b.swords.length,50);
 const restored=Expedition.restore(copy(b.serialize()));
 assert.equal(restored.options.swordCount,50);
 assert.equal(restored.swords.length,50);
});

void test('a tampered sword array is still refused under a declared count',()=>{
 for(const count of [0,49,51,72]){
  const d=copy(new Expedition({seed:'wp0-tamper',path:0,swordCount:50}).serialize());
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
