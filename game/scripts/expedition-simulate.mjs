/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import fs from 'node:fs';
import nodePath from 'node:path';
import {simulateRun} from './balance-run.mjs';
// CLI entry point. All validation happens inside simulateRun before a run is constructed, so an
// invalid BATTLE_* value still fails with an empty stdout and the message on stderr.
const reports=simulateRun(process.env,{onReport:r=>console.log(JSON.stringify(r))});
const reportPath=nodePath.join('qa',process.env.BATTLE_REPORT||'expedition-balance.json');
fs.mkdirSync(nodePath.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(reports,null,2));
