/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// WP8 迭代验收：平衡矩阵的输入契约。这些用例全部在进程内跑，不派生子进程，
// 因为沙箱与 CI 之外的宿主都可能拦截 spawn（见 qa-batch1 A0）。
import test from 'node:test';
import assert from 'node:assert/strict';
import {cellEnv,matrixCells,ALL_WEAPONS} from '../scripts/balance-matrix.mjs';
import {simulateRun} from '../scripts/balance-run.mjs';
import {skillIntent} from '../scripts/pilot-strategies.mjs';
import {WEAPONS,WEAPON_VERSION} from '../gameplay/weapons.js';
import {SKILLS,SKILL_VERSION} from '../gameplay/skills.js';

void test('法门与技能的模拟输入都是 opt-in，未声明时与改版前逐字一致',()=>{
 const plain=cellEnv({difficulty:1,weapon:'none',skills:false,paths:[0]});
 assert.equal('BATTLE_WEAPON' in plain,false,'未声明法门时不能带 BATTLE_WEAPON');
 assert.equal('BATTLE_SKILLS' in plain,false,'未声明技能时不能带 BATTLE_SKILLS');
 const declared=cellEnv({difficulty:2,weapon:'heavy',skills:true,paths:[0,3]});
 assert.equal(declared.BATTLE_WEAPON,'heavy');
 assert.equal(declared.BATTLE_SKILLS,'1');
 assert.equal(declared.BATTLE_DIFFICULTY,'2');
 assert.equal(declared.BATTLE_PATHS,'0,3');
 assert.equal(declared.BATTLE_SEED_PREFIX,'wp8-v2');
 // 同难度、同流派、同种子的两格必须只差在法门上，否则差值不能归因。
 assert.equal(declared.BATTLE_SEED_PREFIX,plain.BATTLE_SEED_PREFIX);
});

void test('非法的法门与技能取值在构造对局之前就被拒',()=>{
 assert.throws(()=>simulateRun({BATTLE_WEAPON:'axe'}),/BATTLE_WEAPON must be one of array\|heavy\|flow\|pierce/);
 assert.throws(()=>simulateRun({BATTLE_SKILLS:'2'}),/BATTLE_SKILLS must be one of 0\|1/);
 assert.throws(()=>simulateRun({BATTLE_SKILLS:'yes'}),/BATTLE_SKILLS must be one of 0\|1/);
});

void test('矩阵格覆盖六流派 × 每把法门 × 三档难度 × 技能开关',()=>{
 const cells=matrixCells();
 assert.equal(cells.length,3*ALL_WEAPONS.length*2);
 assert.equal(ALL_WEAPONS.length,WEAPONS.length+1,'未声明法门要作为对照行存在');
 assert.deepEqual([...new Set(cells.map(c=>c.difficulty))].sort(),[0,1,2]);
 assert.deepEqual([...new Set(cells.map(c=>c.weapon))],ALL_WEAPONS);
 assert.deepEqual([...new Set(cells.map(c=>c.skills))],[false,true]);
 for(const c of cells)assert.deepEqual(c.paths,[0,1,2,3,4,5]);
});

void test('固定判据不让技能抢走神雷的灵力或雷源',()=>{
 const battle=({mana=50,reserve=99,cost=22,threat=true,boss=false,hp=1,maxHp=1}={})=>({
  player:{mana,reserve,hp,maxHp},
  enemies:threat?[{hp:10}]:[],
  boss:boss?{id:'b'}:null,
  thunderReadiness:()=>({cost,ready:mana>=99.9&&reserve>=cost}),
 });
 const skill=id=>SKILLS.find(s=>s.id===id);
 // 雷源够放神雷时，灵力要留着：四种灵力技能都不放。
 for(const id of ['focusLead','volley','swarmOrder','sigilLead','wardUp']){
  assert.equal(skillIntent(battle({reserve:99}),skill(id)),false,id+' 不能在雷源充足时抢灵力');
 }
 // 雷源不够放神雷时，灵力本来也用不上，可以放。
 assert.equal(skillIntent(battle({reserve:5}),skill('focusLead')),true);
 assert.equal(skillIntent(battle({reserve:5}),skill('sigilLead')),true);
 // 灵力满了而且当前不需要神雷，也属于「闲着」，可以放。
 assert.equal(skillIntent(battle({mana:100,reserve:99}),skill('focusLead'),{thunderWanted:false}),true);
 assert.equal(skillIntent(battle({mana:100,reserve:99}),skill('focusLead'),{thunderWanted:true}),false);
 // 有目标才有意义的技能不能空放；防御型的按掉血判断。
 assert.equal(skillIntent(battle({reserve:5,threat:false}),skill('focusLead')),false);
 assert.equal(skillIntent(battle({reserve:5,mana:50,hp:1,maxHp:4}),skill('wardUp')),true);
 assert.equal(skillIntent(battle({reserve:5,mana:50,hp:4,maxHp:4}),skill('wardUp')),false);
 // 引雷花的是雷源，付完之后还得够付一次神雷。
 assert.equal(skillIntent(battle({mana:30,reserve:40,cost:22}),skill('callThunder')),true);
 assert.equal(skillIntent(battle({mana:30,reserve:30,cost:22}),skill('callThunder')),false);
 assert.equal(skillIntent(battle({mana:80,reserve:99}),skill('callThunder')),false);
});

void test('同一格内声明默认法门与未声明法门跑出同一结果',()=>{
 // 这是「对照行」成立的前提：array 的 mods 为空，所以两行必须逐字段一致。
 const seedPrefix='wp8-neutrality',pilot='baseline',cell={difficulty:1,paths:[0]};
 const off=simulateRun(cellEnv({...cell,weapon:'none',skills:false},{seedPrefix,pilot}));
 const on=simulateRun(cellEnv({...cell,weapon:'array',skills:false},{seedPrefix,pilot}));
 assert.equal(on.length,1);
 assert.equal(off[0].configurationId===on[0].configurationId,false,'声明法门要体现在配置指纹里');
 for(const key of ['won','time','level','kills','thunders','counterCount','termination','damageSources'])assert.deepEqual(on[0][key],off[0][key],key+' 必须与未声明法门一致');
 assert.equal(on[0].weapon,'array');
 assert.equal(on[0].weaponVersion,WEAPON_VERSION);
 assert.equal('weapon' in off[0],false,'未声明法门不写 weapon 字段');
 assert.equal('weaponVersion' in off[0],false,'未声明法门不写 weaponVersion 字段');
});

void test('开启技能后对局仍能走完，并写入与释放次数一致的凭据',()=>{
 const runs=simulateRun(cellEnv({difficulty:1,paths:[0],weapon:'none',skills:true},{seedPrefix:'wp8-skills'}));
 assert.equal(runs.length,1);
 const r=runs[0];
 assert.equal(r.skillVersion,SKILL_VERSION);
 assert.ok(r.skillCasts>0,'固定判据至少要放出一次技能，否则这一维什么都没量到');
 assert.equal(r.skillReceipts,r.skillCasts,'凭据数必须等于释放次数');
 assert.notEqual(r.termination,'timeout');
});
