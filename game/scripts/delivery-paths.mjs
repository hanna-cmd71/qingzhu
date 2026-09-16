/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
import path from 'node:path';
import {root} from './release-files.mjs';
import {GAME_VERSION} from '../gameplay/version.js';
export const releaseDir=path.join(root,'release',GAME_VERSION);
export const videoDir=path.join(root,'release','video');
export const artifactPath=name=>path.join(releaseDir,name);
export const introductionPath=path.join(videoDir,'青竹剑阵_视频介绍.html');
