/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// WP1: costumes are account-level state. They are never carried by a run snapshot, conditions read
// only this device's own account data, and a locked or unknown entry can never block a save.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition} from '../gameplay/expedition.js';
import {initialSave} from '../gameplay/data.js';
import {normalizeSave} from '../gameplay/save-store.js';
import {DEFAULT_SKIN,SKINS,skinById,skinUnlocked,grantedSkins,normalizeSkinState} from '../gameplay/skins.js';

void test('a new profile starts on the default costume and old profiles fall back to it',()=>{
 const fresh=normalizeSave(initialSave());
 assert.deepEqual(fresh.skins,[DEFAULT_SKIN]);
 assert.equal(fresh.skin,DEFAULT_SKIN);
 const legacy=normalizeSave({version:1,meta:[],history:[]});
 assert.deepEqual(legacy.skins,[DEFAULT_SKIN]);
 assert.equal(legacy.skin,DEFAULT_SKIN);
});

void test('unknown costume ids are dropped and a locked equipped costume falls back',()=>{
 const out=normalizeSave({version:1,meta:[],history:[],skins:['ghost',DEFAULT_SKIN],skin:'ghost'});
 assert.deepEqual(out.skins,[DEFAULT_SKIN]);
 assert.equal(out.skin,DEFAULT_SKIN);
 const dupes=normalizeSave({version:1,meta:[],history:[],skins:[DEFAULT_SKIN,DEFAULT_SKIN],skin:DEFAULT_SKIN});
 assert.deepEqual(dupes.skins,[DEFAULT_SKIN]);
});

void test('a granted costume stays equipped while a locked one falls back',()=>{
 const registry=[{id:DEFAULT_SKIN,name:'默认'},{id:'ink',name:'墨色',unlock:{wins:1}}];
 const granted=normalizeSkinState({skins:[DEFAULT_SKIN,'ink','ghost'],skin:'ink'},registry);
 assert.deepEqual(granted.skins,[DEFAULT_SKIN,'ink']);
 assert.equal(granted.skin,'ink');
 const locked=normalizeSkinState({skins:[DEFAULT_SKIN],skin:'ink'},registry);
 assert.deepEqual(locked.skins,[DEFAULT_SKIN]);
 assert.equal(locked.skin,DEFAULT_SKIN);
});

void test('costume conditions read this device account data only',()=>{
 const byWins={id:'ink',unlock:{wins:3}};
 assert.equal(skinUnlocked({wins:2},byWins),false);
 assert.equal(skinUnlocked({wins:3},byWins),true);
 assert.equal(skinUnlocked({},byWins),false);
 const byAchievement={id:'title',unlock:{achievement:'问道 5'}};
 assert.equal(skinUnlocked({achievements:['问道 5']},byAchievement),true);
 assert.equal(skinUnlocked({achievements:[]},byAchievement),false);
 assert.equal(skinUnlocked({},{id:'plain'}),true);
 assert.equal(skinUnlocked({},{id:'plain',unlock:null}),true);
 assert.equal(skinUnlocked({},{id:'unreadable',unlock:{chapter:5}}),false);
});

void test('a stored grant survives even if a future condition stops matching',()=>{
 const registry=[{id:DEFAULT_SKIN,name:'默认'},{id:'ink',name:'墨色',unlock:{wins:3}}];
 assert.ok(grantedSkins({skins:[DEFAULT_SKIN,'ink'],wins:0},registry).includes('ink'));
 assert.deepEqual(grantedSkins({skins:[],wins:3},registry),[DEFAULT_SKIN,'ink']);
 assert.deepEqual(grantedSkins({skins:[],wins:1},registry),[DEFAULT_SKIN]);
 assert.equal(skinById('does-not-exist').id,DEFAULT_SKIN);
 assert.ok(SKINS.every(s=>typeof s.id==='string'&&typeof s.name==='string'&&typeof s.atlas==='string'));
});

void test('a run snapshot carries no costume state',()=>{
 const b=new Expedition({seed:'costume-snapshot',path:0});
 const snapshot=b.serialize();
 assert.equal('skin' in snapshot,false);
 assert.equal('skins' in snapshot,false);
 assert.equal(snapshot.options.skin,undefined);
 assert.equal(snapshot.options.skins,undefined);
});
