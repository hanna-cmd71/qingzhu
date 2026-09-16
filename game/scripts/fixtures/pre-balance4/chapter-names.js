// Display chapter names are independent from geographic names in dialogue.
export const CHAPTER_NAMES=['古修遗府','鬼雾迷踪','冰火险道','宝光与幻境','内殿傀儡','虚天夺鼎'];
export const chapterName=index=>CHAPTER_NAMES[index]||'未历之境';
export const legacyChapterAchievement=index=>index===3?'历经·宝光禁制':null;
