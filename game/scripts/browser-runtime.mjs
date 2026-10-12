/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
export {chromium};
export const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
// 单一离线成品：只有 WebP 优化版一份。variant 保留固定值，供 QA 产物命名与报告字段使用。
export const variant='webp';
export const htmlPath=path.resolve(process.env.QINGZHU_HTML||path.join(projectRoot,'凡人修仙传_青竹剑阵.html'));
export const offlineURL=()=>pathToFileURL(htmlPath).href+'?test=1';
export function qaOutput(name){const url=pathToFileURL(path.join(projectRoot,'game/qa/release',variant,name)+path.sep);fs.mkdirSync(url,{recursive:true});return url;}
// URL.pathname is not a filesystem path: on Windows it keeps a leading slash before the drive
// ('/E:/...'), which resolves relative to the current drive and breaks screenshot/download targets.
export const qaFile=(out,name)=>fileURLToPath(new URL(name,out));
export const launchBrowser=()=>chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
