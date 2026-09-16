/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveVault,SAVE_KEY,BACKUP_KEY,JOURNAL_KEY,RAW_BACKUP_KEY,appendRawRecord} from '../gameplay/save-store.js';
import {initialSave} from '../gameplay/data.js';
import {META,META_V2,cultivationDescription} from '../gameplay/cultivation.js';
import {reserveRestBase,sigilCooldown,afterThunderWindow} from '../gameplay/balance.js';
import {coreDescription} from '../gameplay/core-description.js';
import {CORES} from '../gameplay/expedition-data.js';

function fixture(count=12){
 const records=[];for(let i=0;i<count;i++)appendRawRecord(records,'protected-'+i,100+i);
 const map=new Map([[SAVE_KEY,'broken primary'],[BACKUP_KEY,'broken backup'],[JOURNAL_KEY,'broken journal'],[RAW_BACKUP_KEY,JSON.stringify({records})]]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const vault=new SaveVault(storage);assert.throws(()=>vault.load());return {map,vault,storage};
}
void test('release: full recovery preserves all four slots and input, including when only one of two new records would fit',()=>{
 for(const count of [11,12]){
  const {vault}=fixture(count),before=vault.snapshot(),sourceRaw=JSON.stringify({...initialSave(),insight:42});
  for(let i=0;i<2;i++)assert.throws(()=>vault.adoptRecovery(JSON.parse(sourceRaw),{expectedSnapshot:before,sourceRaw}),e=>e.code==='raw-capacity');
  assert.deepEqual(vault.snapshot(),before);assert.equal(vault.recoveryBundle().records.length,count);
  assert.equal(vault.clearRawRecords(before),count);
  const after=vault.snapshot();assert.equal(after.primary,before.primary);assert.equal(after.backup,before.backup);assert.equal(after.journal,before.journal);
  assert.throws(()=>vault.adoptRecovery(JSON.parse(sourceRaw),{expectedSnapshot:before,sourceRaw}),e=>e.code==='conflict');
  const save=vault.adoptRecovery(JSON.parse(sourceRaw),{expectedSnapshot:after,sourceRaw});assert.equal(save.insight,42);
  assert.ok(vault.rawRecords().some(r=>r.raw===sourceRaw));
  assert.ok(vault.rawRecords().some(r=>r.raw.includes('broken primary')&&r.raw.includes('broken backup')&&r.raw.includes('broken journal')));
 }
});
void test('release: cleanup requires a fresh four-slot preview; cancellation is read-only and every external slot blocks deletion',()=>{
 for(const key of [SAVE_KEY,BACKUP_KEY,JOURNAL_KEY,RAW_BACKUP_KEY]){
  const {map,vault}=fixture(),before=vault.snapshot();vault.rawRecords();vault.recoveryBundle();assert.deepEqual(vault.snapshot(),before);
  assert.throws(()=>vault.clearRawRecords(),e=>e.code==='stale-preview');
  map.set(key,'external change');const external=vault.snapshot();assert.throws(()=>vault.clearRawRecords(before),e=>e.code==='stale-preview');assert.deepEqual(vault.snapshot(),external);
 }
});
void test('release: cleanup failure and concurrent changes during removal retain the protected text',()=>{
 const {vault,storage,map}=fixture(),before=vault.snapshot();
 storage.removeItem=()=>{throw new Error('blocked');};assert.throws(()=>vault.clearRawRecords(before),e=>e.code==='storage');assert.deepEqual(vault.snapshot(),before);
 storage.removeItem=k=>{map.delete(k);map.set(BACKUP_KEY,'external backup');};assert.throws(()=>vault.clearRawRecords(before),e=>e.code==='conflict');assert.equal(map.get(RAW_BACKUP_KEY),before.unreadable);assert.equal(map.get(BACKUP_KEY),'external backup');
});
void test('release: cultivation descriptions read current or saved balance without changing effects',()=>{
 const thunder=META.find(m=>m.id==='thunder-meta-3'),sigil=META.find(m=>m.id==='talisman-meta-3');
 for(const balanceVersion of [1,2,3,4]){
  const options={rulesVersion:3,balanceVersion,metaRulesVersion:3},b={rulesVersion:3,options,path:4,stats:{}};
  assert.ok(cultivationDescription(thunder,options).includes('合计最多 '+(reserveRestBase(b)+thunder.mods.metaReserveRest)));
  assert.ok(cultivationDescription(sigil,options).includes('为 '+sigilCooldown(b)+' 秒'));
  const after=META.find(m=>m.id==='thunder-meta-4');assert.ok(cultivationDescription(after,options).includes('神雷后 '+afterThunderWindow(b)+' 秒'));
  assert.ok(coreDescription(CORES.find(c=>c.id==='K10'),b).includes('本局独立间隔 '+sigilCooldown(b)+' 秒'));
 }
 const old=META_V2.find(m=>m.id==='thunder-meta-3');assert.equal(cultivationDescription(old,{metaRulesVersion:2,balanceVersion:2}),old.desc);
 assert.match(coreDescription(CORES.find(c=>c.id==='K10')),/独立间隔 4.5 秒/);
});
