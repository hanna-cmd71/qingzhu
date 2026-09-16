/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import fs from 'node:fs';
import {validateGuide} from './guide-tables.mjs';
export function embedDocs(){
 const read=name=>fs.readFileSync(new URL('../../'+name,import.meta.url),'utf8'),guide=read('青竹剑阵_游玩说明.md');
 validateGuide(guide);
 const docs={guide,changes:read('青竹剑阵_更新日志.md'),license:read('docs/licensing.md')+'\n'+read('LICENSE')};
 fs.writeFileSync(new URL('../gameplay/docs.generated.js',import.meta.url),'export default '+JSON.stringify(docs)+';\n');
}
embedDocs();
