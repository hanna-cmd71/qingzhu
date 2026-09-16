/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import {sigilWait,sigilPairFuse} from './balance.js';
// Pending sigils are immutable cast snapshots. Do not infer a new fuse when a trigger field is missing.
export function validateSigilState(z,b){
 if(!z.sigil)return;const fail=()=>{throw Error('符阵触发与本局平衡规则不一致，原记录未被修改');},near=(a,c)=>Math.abs(a-c)<1e-5;
 if((b.options.balanceVersion??1)<2)return;
 if(z.metaEcho){if(z.twin||z.arming!==undefined||!b.stats.metaSigilEcho||b.hasCore?.('K10')||!near(z.fuseDuration,.4))fail();if(!z.fired&&!near(z.ttl-z.warn,.3))fail();return;}
 if(z.twin){if(!b.hasCore?.('K10')||z.arming!==undefined||!near(z.fuseDuration,z.pair?sigilPairFuse(b):8))fail();if(!z.fired&&!near(z.ttl-z.warn,.3))fail();return;}
 if(!Number.isFinite(z.arming)||!near(z.fuseDuration,sigilWait(b)))fail();
 if(!z.fired&&(!near(z.ttl-z.warn,.35)||z.warn<0||z.arming>z.warn+1e-5))fail();
}
