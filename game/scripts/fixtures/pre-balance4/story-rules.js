import {CINEMATICS} from './expedition-data.js';
import {EVENTS} from './data.js';
export const STORY_VERSION=3;
export const revisedStory=b=>b.rulesVersion===3&&[2,3].includes(b.options.storyVersion);
export const persistentStory=b=>b.rulesVersion===3&&b.options.storyVersion===3;
// Indices and reward choices remain those of EVENTS. Only the eligible chapter pool and prose change.
export const EVENT_STORIES=[
 [[0,1,2,4],'残余灵气','逸散的灵气在剑锋旁盘旋，尚可收束，也可借此回想方才御剑的滞涩。'],
 [[0,1,2,3,4,5],'阵纹碎片','一片破损阵盘落在脚边，尚存的灵纹似可护住要害，也能拆出几枚灵石。'],
 [[0,1,2,4,5],'遗落药囊','石屑下露出一只药囊，药味仍在，韩立正权衡可用的部分应如何处置。'],
 [[0,1,4],'古壁铭文','石壁上的字迹只剩半行，与刚才的禁制似有相通之处，是否细辨还需斟酌。'],
 [[0,1,2,4],'岔路阴风','两侧石缝风声不同，来路尚可退，深处的微光是否值得靠近仍待决定。'],
 [[0,4],'破损傀儡','残骸中的弩槽已经断裂，几枚榫件却还完好，或可拆作备用机括。'],
 [[0,2,4],'未熄符火','地上的符灰仍有火星，残留火性尚可收摄，韩立按住符纸，没有贸然伸手。'],
 [[0,1,2,4],'散落灵石','裂缝外缘散着几枚灵石，更深处的微光隔着碎石，未必值得伸手。'],
 [[0,2,3,4],'封存药匣','匣盖的封纹已经松动，药性尚待辨明，韩立正权衡调息与温养药物的得失。'],
 [[0,1,3,4],'石门灵纹','门上灵纹一明一暗，开合之间露出收束法力的余地，也有可供记取的次序。'],
 [[0,1,2],'微弱虫鸣','岩缝间传来细碎虫鸣，带着虫息的矿屑散在一旁，是否配作诱饵还需掂量。'],
 [[0,1,2,4,5],'隐蔽石隙','一处窄隙藏在石壁背后，似能暂避来路的动静，韩立留意着入口，尚未安顿。'],
 [[0,1,4],'旧阵阵眼','废阵中央仍有灵光，缓缓导出尚算稳妥，尽取其力却可能反冲经脉。'],
 [[0,2,3,4],'灰烬余温','一角符纸没有烧尽，余灰下似有还能描画的纸面，值得收取与否尚待决定。'],
 [[0,1,3,4],'灵气回流','余息沿石纹回旋，似可用来收束法力，也能借机回想方才的出剑节拍。'],
 [[0,1,2,4],'狭路相逢','前方斗法声一闪而逝，余波落向何处尚不分明，韩立停步观察，准备取舍。'],
 [[0,3,4],'裂开的玉简','玉简断口留下几笔残字，其中或有能与眼前印证的部分，韩立尚未照做。'],
 [[0,2,4,5],'地底震动','石屑从头顶落下，裂纹向几处方向延伸，韩立正寻找可以落脚的稳固处。'],
 [[0,1,2,3,4,5],'黯淡符纸','符纸只剩最后一点灵光，似能收摄散物，也能补护身上的空隙，仍待选定用途。'],
 [[0,1,2,4],'遗弃储物袋','储物袋口还缠着残禁，里面或有不必强取的东西，韩立以神识留意其变化。'],
 [[0,1,2,3,4,5],'残存护罩','残罩边缘正缓缓散去，余力似可挡住一阵余波，是否借此调息还需决定。'],
 [[0,1,2,3,4],'短暂宁静','四周动静稍歇，尚有片刻可以理顺法力与出剑次序，韩立仍未放松神识。'],
 [[0,1,2,4,5],'退路与机缘','来路尚能退，前方仍有余势可借，韩立按住袖口，衡量自己还剩几分气力。'],
 [[0,1,2,3,4,5],'禁制回响','灵纹在石面上一闪，露出一道似能容身的空隙，韩立正观察余波，准备进退。']
].map(([chapters,name,desc],id)=>({id,chapters,name,desc}));
export const eligibleEvents=b=>EVENT_STORIES.filter(e=>e.chapters.includes(b.chapter));
export function chapterEventText(b,index){const event=EVENT_STORIES[index];const prefixes=['遗府的石门内阴气未散。','鬼雾在脚边翻卷。','冰火道的余热与寒气仍未散尽。',b.wave===0?'古宝已经收妥，前方通向幻境。':'幻象散去，内殿的入口就在前方。','内殿石门的白光映着来路。',b.wave<2?'鼎前石道上，韩立仍留意着各方动静。':b.wave===2?'寒焰留在身后，韩立抓紧片刻整备。':'玄骨已被灰焰吞没，余下寒气仍在逼近。'];return {name:event.name,desc:prefixes[b.chapter]+' '+event.desc};}
export function validateStory(data,b){const history=data.expedition.cinematicHistory;if(persistentStory(b)){if(!Array.isArray(history)||history.length> CINEMATICS.length||new Set(history).size!==history.length||history.some(id=>!CINEMATICS.some(c=>c.id===id))||!Array.isArray(data.expedition.cinematicSeen)||data.expedition.cinematicSeen.some(id=>!history.includes(id)))throw Error('已看纪事记录无效，原记录未被修改');}else if(history!==undefined)throw Error('旧叙事不接受新已看记录');if(!revisedStory(b))return;const e=data.expedition.rest?.event;if(e?.type==='single'&&!eligibleEvents(b).some(x=>x.id===e.index))throw Error('机缘与章节不一致，原记录未被修改');}
export const storyCatalogMatches=()=>EVENT_STORIES.length===EVENTS.length&&EVENT_STORIES.every((e,i)=>e.name===EVENTS[i].name);
