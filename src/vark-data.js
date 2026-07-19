/**
 * VARK 学习风格测评
 * 4 维度：Visual 视觉 / Aural 听觉 / ReadWrite 读写 / Kinesthetic 动觉
 * 16 题，每题四选一
 */
export const VARK_QUESTIONS = [
  // V = visual, A = aural, R = read/write, K = kinesthetic
  { id: 'v1', v: '看操作演示视频或截图', a: '听别人一步步讲解', r: '阅读软件使用手册', k: '直接上手尝试操作' },
  { id: 'v2', v: '用图表或思维导图来整理信息', a: '和朋友讨论来理清思路', r: '写下要点和笔记', k: '通过实际操作来理解' },
  { id: 'v3', v: '看地图或导航截图来找路', a: '听语音导航指示', r: '看文字版路线说明', k: '走一遍就记住了' },
  { id: 'v4', v: '看菜谱图片或视频教程', a: '听别人口头教你', r: '看文字版菜谱步骤', k: '边做边试' },
  { id: 'v5', v: '用颜色标记重点来帮助记忆', a: '把内容录下来反复听', r: '反复抄写或整理笔记', k: '用身体动作或演出来记忆' },
  { id: 'v6', v: '看幻灯片或图解来理解概念', a: '参加讲座或讨论课', r: '阅读教材或文章', k: '做实验或参与活动' },
  { id: 'v7', v: '用流程图展示事件经过', a: '听别人讲这个故事', r: '读文字版的故事', k: '角色扮演或模拟' },
  { id: 'v8', v: '看别人演示一遍', a: '听操作要点的讲解', r: '看操作步骤清单', k: '自己动手做一遍' },
  { id: 'v9', v: '用图表来比较不同选项的优劣', a: '和别人口头讨论利弊', r: '列出优缺点清单', k: '亲身体验后再决定' },
  { id: 'v10', v: '看教学图片和图示', a: '听课或听音频课程', r: '读书或看讲义', k: '做练习或实践项目' },
  { id: 'v11', v: '用颜色和符号标注重点', a: '把重点编成口诀或歌曲', r: '写摘要或大纲', k: '用实物模型来辅助' },
  { id: 'v12', v: '看示意图理解组装步骤', a: '口头指导或语音助手', r: '阅读说明书', k: '边试边装' },
  { id: 'v13', v: '看数据和图表更容易理解', a: '听数据分析和解读', r: '阅读数据报告原文', k: '亲自操作数据工具' },
  { id: 'v14', v: '喜欢有图示和插图的书籍', a: '喜欢有声书或播客', r: '喜欢纯文字书', k: '喜欢互动式电子书' },
  { id: 'v15', v: '看视频教程学得最快', a: '听老师讲课学得最快', r: '自己看书学得最快', k: '动手实践学得最快' },
  { id: 'v16', v: '用视觉化想象来记忆信息', a: '用对话和讨论来加深理解', r: '用笔记和摘录巩固知识', k: '用身体动作和体验来学习' },
];

const DIM_LABELS = { V: '视觉型', A: '听觉型', R: '读写型', K: '动觉型' };

const DIM_DESCS = {
  V: '你偏好通过视觉方式学习，图表、图像、颜色和空间布局对你帮助很大。你喜欢用思维导图整理思路，用颜色标记重点，看视频比听音频效果更好。',
  A: '你偏好通过听觉方式学习，讲解、讨论和声音信息对你最有效。你喜欢上课听讲、参与小组讨论，把内容录下来反复听，或者把知识点编成口诀。',
  R: '你偏好通过读写方式学习，文字信息是你的强项。你喜欢阅读教材、做笔记、列清单、写总结，通过文字来理解和记忆信息效果最好。',
  K: '你偏好通过动觉方式学习，动手实操和身体参与对你最有效。你喜欢做实验、角色扮演、实地考察，通过亲身经历和练习来掌握知识。',
};

const DIM_CAREERS = {
  V: '设计师、摄影师、建筑师、视频编辑、艺术创作、UI/UX设计、数据可视化',
  A: '教师、播音员、音乐人、心理咨询师、翻译、销售、客服、培训师',
  R: '作家、编辑、研究员、律师、记者、文案策划、图书管理员、学术工作者',
  K: '运动员、外科医生、工程师、手工艺人、厨师、技术人员、实验研究员',
};

const DIM_TIPS = {
  V: '多用思维导图、流程图、颜色标记法；把笔记变成图表；看视频教程；用闪卡配图来记忆。',
  A: '参与讨论小组；把知识点录下来听；用口诀和节奏帮助记忆；找学伴互相讲解。',
  R: '做详细笔记和摘要；把内容整理成清单和大纲；多读相关书籍和文章；写学习日志。',
  K: '多做实验和练习；参与角色扮演和模拟；用实物教具辅助；边走动边记忆。',
};

/**
 * 计算 VARK 学习风格
 * @param {Object} answers - { questionId: 'v'|'a'|'r'|'k' }
 * @returns {Object} { primary, scores, primaryDesc, desc }
 */
export function calculateVARK(answers) {
  const scores = { V: 0, A: 0, R: 0, K: 0 };

  VARK_QUESTIONS.forEach(q => {
    const choice = answers[q.id];
    const key = choice?.toUpperCase();
    if (key && scores[key] !== undefined) scores[key]++;
  });

  // 找出最高分维度
  const maxScore = Math.max(...Object.values(scores));
  const primaryDims = Object.entries(scores)
    .filter(([, v]) => v === maxScore)
    .map(([k]) => k);

  const primary = primaryDims.join(' + '); // 可能有并列

  const isSingle = primaryDims.length === 1;
  const primaryCode = primaryDims[0];

  return {
    primary,
    primaryName: isSingle ? DIM_LABELS[primaryCode] : primaryDims.map(d => DIM_LABELS[d]).join(' + '),
    scores,
    total: VARK_QUESTIONS.length,
    isSingle,
    primaryDesc: isSingle ? DIM_DESCS[primaryCode] : '你属于多重学习风格类型，兼具多种学习偏好。',
    careerSuggestions: isSingle ? DIM_CAREERS[primaryCode] : '你的多元学习风格让你适应性很强，适合需要综合能力的职业。',
    studyTips: isSingle ? DIM_TIPS[primaryCode] : '结合你的多个偏好维度，混合使用不同学习方法效果最好。',
  };
}

export function getVARKSummary(result) {
  const bars = Object.entries(result.scores).map(([dim, score]) => {
    const pct = Math.round(score / result.total * 100);
    return { dim, label: DIM_LABELS[dim], score, pct };
  });
  return { bars, primary: result.primary, primaryName: result.primaryName };
}
