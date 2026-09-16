// Independent from expedition routes, cultivation purchases and save format.
// Missing markers in saved runs always mean the original balance.
export const BALANCE_VERSION=3;
export const revisedBalance=b=>b.rulesVersion===3&&b.options.balanceVersion>=2;
export const phase3Balance=b=>b.rulesVersion===3&&b.options.balanceVersion===3;
export const dashCooldown=b=>Math.max(.9,(revisedBalance(b)&&b.path===5?2:3)*(1-Math.min(.65,b.stats.dashHaste||0)));
export const thunderBaseCost=b=>phase3Balance(b)&&b.path===1?22:25;
export const thunderCost=b=>Math.max(8,thunderBaseCost(b)-(b.stats.thunderSave||0))+(b.extraThunderCost?.()||0);
export const hasReserveRest=b=>revisedBalance(b)&&b.path===1&&b.chapter<5&&b.wave<b.routes[b.chapter].length-1&&!['treasure','illusion'].includes(b.encounter.kind);
export const reserveRestoration=b=>hasReserveRest(b)?Math.min(15+(b.stats.metaReserveRest||0),b.player.maxReserve-b.player.reserve):0;
export const puppetReady=b=>b.stillTime>=.6||phase3Balance(b)&&b.time<(b.setupUntil??-1);
export const stationaryActive=b=>!b.player.moving||phase3Balance(b)&&!b.hasCore?.('K06')&&b.time<(b.setupUntil??-1);
export const sigilGrowth=b=>phase3Balance(b)?1+.08*Math.max(0,Math.min(72,b.level)-12):1;
export const sigilArming=b=>Math.max(.1,(b.stats.dashFire?.2:.35)-(b.stats.metaSigilArming||0));
export const sigilPairFuse=b=>Math.max(.1,.8-(b.stats.metaSigilArming||0));
// The same circle intersection is used by trigger, damage and blocked-hit feedback.
export const sigilTargets=(b,z)=>b.enemies.filter(e=>e.hp>0&&(e.x-z.x)**2+(e.y-z.y)**2<=(z.r+(phase3Balance(b)?e.r:0))**2);
