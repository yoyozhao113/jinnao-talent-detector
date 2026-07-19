/**
 * 学业自我效能感量表 (ASES)
 * 梁宇颂 & 周宗奎 (2000) 修订版
 * 22 题，2 维度：
 *   - 学习能力自我效能感 (11 题)
 *   - 学习行为自我效能感 (11 题)
 * 5 点李克特量表
 */

// 5 点李克特选项 (全局复用)
export const LIKERT_5 = [
  { value: 1, label: '完全不符合' },
  { value: 2, label: '比较不符合' },
  { value: 3, label: '一般' },
  { value: 4, label: '比较符合' },
  { value: 5, label: '完全符合' },
];

export const EFFICACY_QUESTIONS = [
  // === 学习能力自我效能感 (1-11) ===
  { id: 'e1', dim: 'ability', text: '我相信自己有能力在学习上取得好成绩。', reverse: false },
  { id: 'e2', dim: 'ability', text: '我认为自己有能力解决学习中遇到的问题。', reverse: false },
  { id: 'e3', dim: 'ability', text: '和班上其他同学相比，我的学习能力是比较强的。', reverse: false },
  { id: 'e4', dim: 'ability', text: '我认为我能够在课堂上及时掌握老师所讲授的内容。', reverse: false },
  { id: 'e5', dim: 'ability', text: '我认为我能够学以致用。', reverse: false },
  { id: 'e6', dim: 'ability', text: '和班上其他同学相比，我对所学知识的了解更广泛些。', reverse: false },
  { id: 'e7', dim: 'ability', text: '我喜欢选择富有挑战性的学习任务。', reverse: false },
  { id: 'e8', dim: 'ability', text: '我认为自己能够很好地理解书本上的知识及老师所讲授的内容。', reverse: false },
  { id: 'e9', dim: 'ability', text: '我经常选择那些虽然难却能够从中学到东西的任务，即使需要付出更多的努力。', reverse: false },
  { id: 'e10', dim: 'ability', text: '即使我在某次考试中的成绩很不理想，我也能平静地分析自己在考试中所犯的错误。', reverse: false },
  { id: 'e11', dim: 'ability', text: '不管我的学习成绩好与坏，我都从不怀疑自己的学习能力。', reverse: false },

  // === 学习行为自我效能感 (12-22) ===
  { id: 'e12', dim: 'behavior', text: '学习时我总喜欢通过自问自答的方式来检验自己是否已掌握了所学的内容。', reverse: false },
  { id: 'e13', dim: 'behavior', text: '当我思考某一问题时，我能够将前后所学的知识联系起来思考。', reverse: false },
  { id: 'e14', dim: 'behavior', text: '我经常发现自己虽然在阅读书本但并没有真正理解它所讲的内容。', reverse: true },
  { id: 'e15', dim: 'behavior', text: '阅读书本时我能够将所阅读的内容与自己已掌握的知识结合起来思考。', reverse: false },
  { id: 'e16', dim: 'behavior', text: '我发现自己上课时总是开小差以至于不能认真听讲。', reverse: true },
  { id: 'e17', dim: 'behavior', text: '我常常不能准确地归纳出所阅读内容的主要意思。', reverse: true },
  { id: 'e18', dim: 'behavior', text: '我总是在书本或笔记本上划出重点部分以帮助学习。', reverse: false },
  { id: 'e19', dim: 'behavior', text: '当我为考试而复习时，我能够将前后所学的知识融会贯通起来进行复习。', reverse: false },
  { id: 'e20', dim: 'behavior', text: '课堂上作笔记时我总试图记下老师的每一句话，而不管它是否有意义。', reverse: true },
  { id: 'e21', dim: 'behavior', text: '做作业时我总力求回忆起老师在课堂上所讲的内容以便把作业做好。', reverse: false },
  { id: 'e22', dim: 'behavior', text: '即使老师没有要求，我也会自觉地做书本上每一章节后面的练习题来检验自己对知识的掌握情况。', reverse: false },
];

const DIM_NAMES = {
  ability: '学习能力自我效能感',
  behavior: '学习行为自我效能感',
};

const DIM_DESCS = {
  ability: '你对自己学习能力的信念和信心。高分意味着你相信自己的学习能力，面对困难时更有韧性，愿意接受挑战性的学习任务。',
  behavior: '你对自己学习方法和策略运用能力的判断。高分意味着你善于使用有效的学习策略（如总结归纳、自我提问、划重点等），能主动调控自己的学习过程。',
};

/**
 * 计算学业自我效能感
 * @param {Object} answers - { questionId: 1|2|3|4|5 }
 * @returns {Object} 结果
 */
export function calculateEfficacy(answers) {
  let abilitySum = 0, abilityCount = 0;
  let behaviorSum = 0, behaviorCount = 0;

  EFFICACY_QUESTIONS.forEach(q => {
    const raw = answers[q.id];
    if (raw == null) return;
    const score = q.reverse ? (6 - raw) : raw;
    if (q.dim === 'ability') { abilitySum += score; abilityCount++; }
    else { behaviorSum += score; behaviorCount++; }
  });

  const abilityAvg = abilityCount > 0 ? abilitySum / abilityCount : 0;
  const behaviorAvg = behaviorCount > 0 ? behaviorSum / behaviorCount : 0;
  const totalAvg = (abilityAvg + behaviorAvg) / 2;

  // 等级划分
  const getLevel = (avg) => {
    if (avg >= 4.0) return { label: '高', color: '#4ADE80' };
    if (avg >= 3.0) return { label: '中等偏高', color: '#38BDF8' };
    if (avg >= 2.5) return { label: '中等偏低', color: '#FBBF24' };
    return { label: '较低', color: '#F87171' };
  };

  return {
    ability: { sum: abilitySum, avg: abilityAvg, count: abilityCount, level: getLevel(abilityAvg) },
    behavior: { sum: behaviorSum, avg: behaviorAvg, count: behaviorCount, level: getLevel(behaviorAvg) },
    total: { avg: totalAvg, level: getLevel(totalAvg) },
    dimNames: DIM_NAMES,
    dimDescs: DIM_DESCS,
  };
}
