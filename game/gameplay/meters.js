/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 bilibili@卡布奇诺ultra
 */
// Keep health fills independent from the caller's outline/marker drawing state.
export function healthFraction(hp,maxHp){return Number.isFinite(hp)&&Number.isFinite(maxHp)&&maxHp>0?Math.max(0,Math.min(1,hp/maxHp)):0;}
// 2.4 伤害滞后残影的颜色：暗底上要浅到一眼能看出「这一段刚掉」。
export const LAG_COLOR='#f2e7c4';
// lag 是可选的滞后比例（0..1）。给了就先把残影铺到那个位置，真实血量再盖在上面；
// 不给（或小于真实比例）就与 2.3 逐像素相同，所以既有调用不需要改。
export function drawHealthBar(ctx,x,y,width,height,hp,maxHp,color='#dcaa5a',lag=null){
 const ratio=healthFraction(hp,maxHp),fill=Math.max(0,Math.min(width,Math.round(width*ratio)));
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#718273';ctx.fillRect(x-1,y-1,width+2,height+2);ctx.fillStyle='#081712';ctx.fillRect(x,y,width,height);
 const ghost=lag===null||!Number.isFinite(lag)?ratio:Math.max(ratio,Math.min(1,lag)),ghostFill=Math.max(0,Math.min(width,Math.round(width*ghost)));
 if(ghostFill>fill){ctx.fillStyle=LAG_COLOR;ctx.fillRect(x,y,ghostFill,height);}
 if(fill>0){ctx.fillStyle=color;ctx.fillRect(x,y,fill,height);}ctx.restore();return {ratio,fill,width,height};
}
