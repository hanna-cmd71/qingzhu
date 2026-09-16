/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Display only: route IDs, choices, geometry, rewards and chapter causality are unchanged.
const NAMES=[
 ['遗府群潮','洞窟围猎','残阵护持','遗府破禁','石道逐猎','石门突围'],
 ['鬼雾群潮','雾中围猎','雾中护阵','鬼雾破禁','雾中逐猎','雾隙突围'],
 ['黑沙群潮','险道围猎','热砂护阵','冰火破禁','沙径逐猎','险道突围'],
 ['宝阁群潮','宝阁围猎','宝阁护阵','宝阁破禁','宝阁逐猎','宝阁突围'],
 ['内殿群潮','内殿围猎','内殿护阵','内殿破禁','回廊逐猎','殿门突围'],
 ['鼎前群潮','鼎前围猎','鼎前护阵','鼎前破禁','鼎前逐猎','鼎前突围']
];
export function encounterLabel(e,chapter){if(e.special||!Number.isInteger(e.family))return e.name;return (NAMES[chapter]?.[e.family]||e.name.split(' · ')[0])+(e.name.includes(' · ')?' · '+e.name.split(' · ').slice(1).join(' · '):'');}
