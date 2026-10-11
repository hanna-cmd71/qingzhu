/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Appearance batch: every costume and every flying-sword look must point at a real atlas column,
// and the account-level sword pick must normalize and round-trip without entering a run snapshot.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialSave} from '../gameplay/data.js';
import {normalizeSave} from '../gameplay/save-store.js';
import {SKINS,DEFAULT_SKIN,skinById} from '../gameplay/skins.js';
import {WEAPON_SKINS,WEAPON_CELL,DEFAULT_WEAPON,normalizeWeaponSkin,weaponSkinById,weaponCellFor} from '../gameplay/weapons.js';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('public/assets/encoded/manifest.json'));

void test('every costume points at an atlas key present in the encoding manifest',()=>{
 assert.ok(SKINS.length>=9,'the appearance batch ships at least nine costumes');
 const ids=new Set(SKINS.map(s=>s.id));
 assert.equal(ids.size,SKINS.length,'costume ids are unique');
 for(const skin of SKINS){
  assert.ok(skin.atlas in manifest.assets,skin.id+' atlas '+skin.atlas+' is missing from the manifest');
  const entry=manifest.assets[skin.atlas];
  assert.equal(entry.encoding,'lossless',skin.id+' atlas must be lossless');
  assert.ok(fs.existsSync(new URL('../public/assets/'+entry.source,import.meta.url)),skin.id+' source png missing');
  assert.ok(fs.existsSync(new URL('../public/assets/'+entry.file,import.meta.url)),skin.id+' encoded webp missing');
 }
 assert.ok(skinById('xuanmo')&&skinById('liujin')&&skinById('bixiao')&&skinById('yinshuang'),'the four new costumes are registered');
 assert.equal(skinById('missing').id,DEFAULT_SKIN,'an unknown costume falls back to the default');
});

void test('the weapon atlas holds one column per sword look, and every look stays in range',()=>{
 const weapons=manifest.assets.weapons;
 const columns=4;
 // The atlas is one row of four character-cell-wide columns (hero cell = hero width / 4).
 assert.equal(weapons.width/(manifest.assets.hero.width/4),columns);
 assert.equal(weapons.height,manifest.assets.hero.height/2);
 assert.equal(WEAPON_SKINS.length,columns,'four sword looks fill the four columns');
 for(const w of WEAPON_SKINS)assert.ok(Number.isInteger(w.cell)&&w.cell>=0&&w.cell<columns,w.id+' cell out of range');
 assert.equal(new Set(WEAPON_SKINS.map(w=>w.cell)).size,columns,'each column is used exactly once');
 assert.equal(weaponSkinById('missing'),null,'an unknown sword look resolves to null');
});

void test('the drawn sword follows the method by default and the account pick when chosen',()=>{
 for(const id of Object.keys(WEAPON_CELL))assert.equal(weaponCellFor({weapon:id},null),WEAPON_CELL[id],id+' default column');
 assert.equal(weaponCellFor({weapon:DEFAULT_WEAPON},null),0);
 // A chosen look overrides the method without touching its modifiers.
 assert.equal(weaponCellFor({weapon:'heavy'},'violet'),3);
 assert.equal(weaponCellFor({weapon:'pierce'},'jade'),0);
 // Unknown ids fall back to the method's own column.
 assert.equal(weaponCellFor({weapon:'flow'},'nope'),WEAPON_CELL.flow);
});

void test('the account sword pick normalizes on every save shape',()=>{
 assert.equal(initialSave().weaponSkin,null,'a new profile follows the method');
 assert.equal(normalizeSave(initialSave()).weaponSkin,null);
 const legacy=normalizeSave({version:1,meta:[],history:[]});
 assert.equal(legacy.weaponSkin,null,'an old save without the field follows the method');
 const kept=normalizeSave({version:1,meta:[],history:[],weaponSkin:'azure'});
 assert.equal(kept.weaponSkin,'azure');
 const dropped=normalizeSave({version:1,meta:[],history:[],weaponSkin:'ghost'});
 assert.equal(dropped.weaponSkin,null,'an unknown id cannot block the save');
 for(const bad of [123,{},[],true])assert.equal(normalizeWeaponSkin(bad),null,'non-string ids fall back');
});
