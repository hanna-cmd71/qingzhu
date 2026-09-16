/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Keep health fills independent from the caller's outline/marker drawing state.
export function healthFraction(hp,maxHp){return Number.isFinite(hp)&&Number.isFinite(maxHp)&&maxHp>0?Math.max(0,Math.min(1,hp/maxHp)):0;}
export function drawHealthBar(ctx,x,y,width,height,hp,maxHp,color='#dcaa5a'){
 const ratio=healthFraction(hp,maxHp),fill=Math.max(0,Math.min(width,Math.round(width*ratio)));
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#718273';ctx.fillRect(x-1,y-1,width+2,height+2);ctx.fillStyle='#081712';ctx.fillRect(x,y,width,height);if(fill>0){ctx.fillStyle=color;ctx.fillRect(x,y,fill,height);}ctx.restore();return {ratio,fill,width,height};
}
