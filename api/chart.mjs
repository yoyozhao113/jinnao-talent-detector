/**
 * POST /api/chart
 * 计算星盘并返回解读报告
 *
 * Body:
 * {
 *   name: string,           // 孩子昵称
 *   birthDate: string,      // 出生日期 YYYY-MM-DD
 *   birthHour: number,      // 出生小时 (0-23) 可选，默认12
 *   birthMinute: number,    // 出生分钟 (0-59) 可选，默认0
 *   latitude: number,       // 纬度 (-90 to 90)
 *   longitude: number,      // 经度 (-180 to 180)
 *   version: 'free'|'standard'|'premium'  // 报告版本
 * }
 */

import { calculateBirthChart } from './utils/astrology.mjs';
import { INTERPRETATIONS as I } from './utils/interpretations.mjs';

// ========== 星座简表（用于宫位个性化描述） ==========
const SIGN_TRAITS = {
  '白羊座': '主动直接、有冲劲',
  '金牛座': '务实稳重、感官型',
  '双子座': '灵活好奇、信息型',
  '巨蟹座': '敏感顾家、情感型',
  '狮子座': '大方自信、表现型',
  '处女座': '细致分析、完美型',
  '天秤座': '和谐社交、审美型',
  '天蝎座': '深刻洞察、掌控型',
  '射手座': '乐观自由、探索型',
  '摩羯座': '严谨负责、目标型',
  '水瓶座': '创新独立、思想型',
  '双鱼座': '梦幻共情、艺术型',
};

const PLANET_CN_NAMES = {
  sun:'太阳', moon:'月亮', mercury:'水星', venus:'金星', mars:'火星',
  jupiter:'木星', saturn:'土星', uranus:'天王星', neptune:'海王星', pluto:'冥王星',
};

// ========== 宫位个性化描述生成 ==========
function buildPersonalizedHouses(chart) {
  const planets = chart.planets || {};
  // 构建 宫号→[行星] 映射
  const housePlanetMap = {};
  Object.entries(planets).forEach(([key, p]) => {
    if (key !== 'rising' && key !== 'mc' && typeof p.house === 'number') {
      if (!housePlanetMap[p.house]) housePlanetMap[p.house] = [];
      housePlanetMap[p.house].push({ key, name: PLANET_CN_NAMES[key] || key, sign: p.sign });
    }
  });

  return (chart.houses || []).map(h => {
    const hi = I.houses[h.house];
    if (!hi) return { house: h.house, sign: h.sign, name: `第${h.house}宫`, keyword: '', desc: '', display: `${h.house}宫：${h.sign}` };

    const sign = h.sign;
    const trait = SIGN_TRAITS[sign] || '';
    const planetsHere = housePlanetMap[h.house] || [];

    // 构建个性化描述
    let parts = [];
    // 1) 星座特质 × 宫位场景
    parts.push(`${hi.name}，宫头${sign}。${sign}的特质是「${trait}」，在${hi.keyword}领域表现为：`);

    // 2) 星座在该宫位的具体表现
    const signHouseDesc = getSignInHouseDesc(sign, h.house);
    parts.push(signHouseDesc);

    // 3) 宫内行星影响
    if (planetsHere.length) {
      const planetLines = planetsHere.map(p => {
        const effect = getPlanetInHouseEffect(p.key, h.house);
        return `${p.name}（${p.sign}）落入此宫，${effect}`;
      });
      parts.push('宫内行星影响：' + planetLines.join('；'));
    }

    // 4) 教育建议
    const eduTip = getHouseEduTip(h.house, sign, planetsHere.length > 0);
    if (eduTip) parts.push(eduTip);

    return {
      house: h.house,
      sign: sign,
      name: hi.name,
      keyword: hi.keyword,
      desc: parts.join(' '),
      display: `${h.house}宫：${sign}（${hi.name}）`,
    };
  });
}

// ========== 星座×宫位 具体描述映射 ==========
const SIGN_HOUSE_DESC = {
  1:  { '狮子座':'孩子天生自信大方，给人留下积极阳光的第一印象，需要通过认可建立自我价值。',
        '白羊座':'行动力强、不拖泥带水，给人风风火火的感觉，需要引导耐心和持续性。',
        'default':'这个位置塑造了孩子的基本性格特质和外在表现方式。' },
  2:  { '金牛座':'孩子对物质和金钱的观念偏向务实保守，喜欢储蓄和积累，需要稳定的物质环境才安心。',
        '狮子座':'对物质的态度大方慷慨，喜欢用物质来表达情感和获得关注，需要引导正确的消费观。',
        '双子座':'对金钱的态度灵活多变，认为知识和信息才是真正的财富，不太在意物质积累。',
        '双鱼座':'财务观念比较模糊，对钱没有太多概念，容易大手大脚，需要从小培养记账习惯。',
        '天蝎座':'对资源和财富有很强的掌控欲，占有欲较强，需要引导健康的价值观念。',
        'default':'这个宫位反映了孩子对物质、价值和自我认同的基本态度。' },
  3:  { '双子座':'天生的沟通者，语言表达能力强，小学初中阶段学习轻松，但容易三分钟热度。',
        '处女座':'学习态度严谨认真，作业工整，但容易因为追求完美而速度慢。',
        'default':'这个宫位揭示孩子早期学习和沟通表达的基本特点。' },
  4:  { '巨蟹座':'极度恋家，家庭氛围对孩子情绪影响巨大，温暖的家庭是最佳成长土壤。',
        '摩羯座':'家庭责任感重，可能早熟，家长需要注意不要给孩子过多精神压力。',
        'default':'这个宫位反映原生家庭的氛围和孩子内心的安全感基础。' },
  5:  { '狮子座':'创造力旺盛，表现欲强，喜欢在众人面前展示才艺，适合艺术类培养。',
        'default':'这个宫位代表孩子的兴趣爱好、创造力和自我表达方式。' },
  6:  { '处女座':'天生有条理，生活习惯规律，注重细节，适合精细化管理的学习方式。',
        'default':'这个宫位与孩子的日常习惯、健康状态和学习纪律有关。' },
  7:  { '天秤座':'善于合作，注重公平公正，在团队中能发挥协调作用，适合小组学习。',
        '白羊座':'在合作中比较直接主动，喜欢带头做事，但需要学会倾听别人的意见。既想主导又不愿被束缚，需要在领导力和合作精神之间找到平衡。',
        '金牛座':'在亲密关系中非常忠诚和稳定，但可能过于固执自己的方式。对熟悉的人依赖性强，建立新关系需要时间。',
        'default':'这个宫位反映孩子未来的合作能力和亲密关系模式。' },
  8:  { '天蝎座':'心理素质强，洞察力深，对事物的本质有本能的感知力，但不轻易信任人。',
        '金牛座':'对物质和深层安全感有强烈需求，不喜欢变动。压力面前表现比实际更稳定，但内心可能积累了很多未表达的情绪。需要定期释放心理压力。',
        'default':'这个宫位与孩子的深层心理、抗压能力和危机处理有关。' },
  9:  { '射手座':'天生向往远方，适合留学和跨文化体验，对哲学和人生意义有兴趣。',
        '双子座':'对高等教育的态度灵活多样，适合跨学科学习和国际化教育路径。',
        '巨蟹座':'高等教育选择受情感因素影响大，可能选离家近的学校或与家庭相关的方向。留学可能伴随思乡情绪。',
        'default':'这个宫位代表高等教育、远行和人生信念的发展方向。' },
  10: { '摩羯座':'事业心强，目标明确，从小就有"我要做大事"的意识，适合目标驱动型教育。',
        '狮子座':'有领导力和公众意识，渴望在社会上获得认可和地位，需要正向引导。',
        '巨蟹座':'母亲形象温柔包容，社会成就动机与家庭安全感紧密相关。事业选择可能偏向能照顾家庭的职业方向。',
        'default':'这个宫位代表未来的社会角色、事业方向和公众形象。' },
  11: { '水瓶座':'社交圈广泛，朋友来自不同领域，适合团体学习和项目合作。',
        '狮子座':'在社交中喜欢成为焦点，朋友圈可能以崇拜者和追随者为主。需要引导建立平等互益的关系而非单向的关注关系。',
        'default':'这个宫位反映社交圈、理想抱负和贵人运。' },
  12: { '双鱼座':'想象力极其丰富，共情能力强，但也容易吸收负面能量，需要保护心理边界。',
        '处女座':'内心有强烈的自我完善驱动力，但容易陷入过度自我批评。表面条理清晰，内心有很多焦虑和担忧。需要学习放松和接纳不完美。',
        'default':'这个宫位代表潜意识、隐藏天赋和灵性层面。' },
};

function getSignInHouseDesc(sign, houseNum) {
  const houseMap = SIGN_HOUSE_DESC[houseNum];
  if (!houseMap) return '这个配置会影响孩子在该领域的表现和发展方向。';
  return houseMap[sign] || houseMap['default'] || '这个配置会影响孩子在该领域的表现和发展方向。';
}

// ========== 行星在宫位的影响 ==========
const PLANET_HOUSE_EFFECT = {
  sun:   { 1:'强化了孩子的自我意识和领导力，自信心强', 2:'孩子对金钱和自我价值有强烈的认知，赚钱动力足', 3:'学习能力强，喜欢表达，在课堂上有表现欲', 4:'家庭是孩子的力量源泉，家庭氛围对其影响深远', 5:'创造力爆棚，喜欢舞台和表演', 7:'重视合作关系，未来在团队中容易成为核心', 8:'对深层事物有强烈的好奇心，适合研究型工作', 9:'热爱学习深造，有留学潜质', 10:'事业心极强，渴望在社会上有所成就', 11:'社交能力强，朋友多，容易通过人脉获得机会', 12:'内心世界丰富，但容易有隐藏的压力，需要关注心理健康' },
  moon:  { 1:'情绪敏感度高，外在表现受情绪影响大', 2:'通过物质获得情绪安全感，消费可能是情绪出口', 3:'情感表达丰富，喜欢通过语言和文字释放情绪', 4:'极度依恋家庭和母亲，家庭情绪氛围直接影响心理状态', 5:'情绪需要被关注和欣赏，适合艺术表达', 7:'对关系的情绪需求强烈，害怕被冷落', 10:'情绪和事业紧密关联，工作中的情绪波动会影响家庭', 12:'情绪敏感，容易吸收周围人的负面能量，需要心理保护' },
  mercury: { 1:'思维敏捷，表达能力出众，喜欢发表意见', 2:'赚钱靠脑子，适合知识型、信息型工作', 3:'学霸配置，学习效率高，语言天赋强', 5:'创意表达能力强，适合写作、演讲、设计领域', 7:'善于沟通协调，适合谈判、咨询类工作', 9:'学术能力强，适合高等教育和研究', 10:'靠口才和沟通能力获得社会地位', 11:'社交型聪明，能通过人际关系获取信息' },
  venus: { 1:'天生有魅力和亲和力，人缘好', 2:'财运好，懂得享受生活，审美品味在线', 3:'语言温和有礼貌，适合文科艺术类', 4:'家庭氛围和谐温馨，父母关系融洽', 5:'艺术天赋突出，创造力强', 7:'婚姻运好，人际关系和谐', 10:'能通过社交获得事业帮助', 12:'有艺术灵性，适合音乐美术等创作类' },
  mars:  { 1:'行动力极强，精力充沛，但容易冲动', 2:'赚钱动力强，敢拼敢干但也容易花钱', 3:'说话直接，学习风格激进', 4:'家庭内部可能有冲突，需要学会处理情绪', 5:'运动天赋强，竞技精神足', 7:'关系中比较主动，但也可能有竞争意识过强的问题', 10:'事业动力充足，有领导野心', 12:'隐藏的愤怒，需要健康释放情绪' },
  jupiter: { 1:'天生乐观，幸运指数高，性格开朗', 2:'财运亨通，有赚钱的运气', 3:'学习运好，考试运气不错', 4:'家庭条件优越或家庭氛围宽容', 5:'创造力被祝福，艺术运好', 9:'高等教育运极强，留学深造的好配置', 10:'事业运好，容易获得贵人帮助', 11:'朋友多贵人旺，社交网络广' },
  saturn: { 1:'少年老成，责任感强，但可能自信不足', 2:'经济压力大，对金钱有焦虑感', 3:'早期学习可能有困难，需要勤能补拙', 4:'家庭责任重或家庭氛围偏严肃', 5:'创造力被压抑，需要被鼓励表达', 7:'人际关系可能有障碍，需要学习信任', 10:'事业需努力拼搏才能成功，没有捷径', 12:'内心有深层的恐惧不安，需要心理疏导' },
  uranus: { 1:'个性独特，不走寻常路，反叛意识强', 2:'财务状况不稳定，收入波动大', 3:'学习方式与众不同，可能偏科严重', 4:'家庭可能有变动或非常规的家庭结构', 7:'关系模式非常规，可能晚婚', 10:'职业道路不走常规路线，适合创业', 11:'朋友来自非同质化圈子' },
  neptune: { 1:'气质梦幻，有艺术气质，但边界感模糊', 2:'财务观念模糊，容易上当或被骗', 3:'想象力丰富但注意力容易分散', 4:'家庭可能有隐藏的问题或秘密', 5:'艺术天赋极高，适合创意类工作', 7:'对关系有浪漫幻想，容易理想化对方', 10:'事业方向模糊，需要清晰的目标引导', 12:'灵性直觉极强，适合冥想艺术等' },
  pluto: { 1:'气场极强，天生有领袖魅力', 2:'对金钱有极强的掌控欲，可能涉及遗产问题', 3:'思维深刻，喜欢探究事物的本质', 4:'家庭可能有重大变故或深刻的家庭议题', 7:'关系中的权力斗争，需要学会平等相处', 8:'深度心理洞察力，适合心理咨询或研究', 10:'事业上有巨大的野心和变革动力', 12:'内心有深层次的转化需求，适合心理成长' },
};

function getPlanetInHouseEffect(planetKey, houseNum) {
  const effects = PLANET_HOUSE_EFFECT[planetKey];
  if (!effects) return '影响该领域的具体表现。';
  return effects[houseNum] || effects['default'] || '影响该领域的具体表现。';
}

// ========== 宫位教育建议 ==========
const HOUSE_EDU_TIPS = {
  1:  { default:'教育上多给予肯定和正向反馈，帮助孩子建立稳固的自我认同。' },
  2:  { default:'培养正确的金钱观和价值观，让孩子参与家庭预算管理。', hasPlanet:'关注宫内行星所代表的领域对价值观的影响。' },
  3:  { default:'重视早期阅读习惯的培养，创造良好的语言环境。' },
  4:  { default:'家庭氛围的稳定比任何早教都重要——先有安全感，后有学习力。' },
  5:  { default:'不要忽视兴趣爱好的培养，创造力是未来竞争力的核心。', hasPlanet:'宫内行星提示了孩子最需要被鼓励的创造领域。' },
  9:  { default:'如果条件允许，长远规划留学或跨文化学习体验。' },
  10: { default:'关注孩子的社会意识发展，帮助他找到内在的事业驱动力。' },
  11: { default:'鼓励健康的社交圈，和朋友一起学习的效果更好。' },
  12: { default:'保护孩子的心理边界，不要过度高压，留出独处和想象的空间。' },
};

function getHouseEduTip(houseNum, sign, hasPlanet) {
  const tips = HOUSE_EDU_TIPS[houseNum];
  if (!tips) return '';
  return hasPlanet ? (tips.hasPlanet || tips.default || '') : (tips.default || '');
}

// ========== 相位个性化解读生成 ==========
function buildPersonalizedAspects(chart) {
  const planets = chart.planets || {};
  const aspects = chart.aspects || [];

  return aspects.map((a, idx) => {
    const p1 = planets[a.planet1En];
    const p2 = planets[a.planet2En];
    const p1Sign = p1?.sign || '';
    const p2Sign = p2?.sign || '';
    const p1House = p1?.house || '?';
    const p2House = p2?.house || '?';
    const p1Name = a.planet1 || PLANET_CN_NAMES[a.planet1En] || a.planet1En;
    const p2Name = a.planet2 || PLANET_CN_NAMES[a.planet2En] || a.planet2En;

    const personalize = getPersonalizedAspectDesc(a.planet1En, a.planet2En, a.type, p1Sign, p2Sign, p1House, p2House, idx);
    const display = `${p1Name}${a.symbol}${p2Name}（${a.type}）`;

    return {
      ...a,
      display,
      interpretation: personalize,
    };
  });
}

// 特定宫位组合的四分相深度解读
const HOUSE_PAIR_SQUARE = {
  '4-10': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（4宫）四分${p2}${p2s}（10宫）：家庭（4宫）和外部成就（10宫）之间存在天然张力。孩子在家需要的安全感和在外部需要的独立自信可能互相冲突。如果4宫过强，孩子可能过于依赖家庭；如果10宫过强则可能过早独立而失去情感根基。需要在「放出去闯」和「收回来抱」之间灵活切换。`,
  '3-9': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（3宫）四分${p2}${p2s}（9宫）：基础教育（3宫）和高等教育（9宫）之间存在节奏冲突。孩子可能在基础学习阶段感到迷茫——觉得眼前学的没意义，内心渴望更高层次的知识。建议用远方的目标来激励眼前的学习。`,
  '2-5': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（2宫）四分${p2}${p2s}（5宫）：物质安全（2宫）和创造性投入（5宫）存在资源分配的矛盾。培养兴趣的费用和储蓄需求可能让家长纠结。需要找到可持续投入的平衡点，而不是二选一。`,
  '1-4': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（1宫）四分${p2}${p2s}（4宫）：自我认同和家庭期待之间存在内在冲突。孩子既想做自己，又想满足家庭的期望——可能在家和在外表现出截然不同的性格。家长应允许孩子拥有独立于家庭期待的自我空间。`,
  '2-8': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（2宫）四分${p2}${p2s}（8宫）：自我价值感和深层资源掌控之间存在紧张。孩子对「我的」和「别人的」有较强边界意识，在分享方面需要时间建立安全感。不要强迫分享，帮他建立「分享是自愿的、不是被剥夺的」认知。`,
  '5-8': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（5宫）四分${p2}${p2s}（8宫）：创造力的自由表达与内在的完美主义/掌控欲之间存在冲突。孩子可能越在意的领域越不敢尝试——因为害怕做不好。需要帮他在热爱和恐惧之间建立对话。`,
  '9-12': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（9宫）四分${p2}${p2s}（12宫）：求知欲和潜意识迷茫之间存在拉扯。孩子可能在某些学科极强但在其他方面逃避拖延。这种偏科的背后可能不是能力问题而是心理卡点。先用长板建立自信，不要在短板上死磕。`,
};

// 特定宫位组合的对分相深度解读
const HOUSE_PAIR_OPPOSITION = {
  '4-10': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（4宫）对分${p2}${p2s}（10宫）：家庭温暖和外部成就之间的天平。孩子一生都需要平衡——既要根基又要认可。偏向4宫则更顾家，偏向10宫则更重事业。没有标准答案，但家长需尊重孩子的价值排序。`,
  '1-7': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（1宫）对分${p2}${p2s}（7宫）：做自己和被人喜欢之间的平衡。1宫太强可能自我中心，7宫太强可能过度讨好。教会孩子：坚持自我不等于不合群，妥协不等于软弱。`,
  '3-9': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（3宫）对分${p2}${p2s}（9宫）：眼前的基础教育和远方的理想教育之间的张力。孩子可能在基础阶段感到「学这些有什么用」的困惑。需要用长远目标来照亮当下的路。`,
  '2-8': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（2宫）对分${p2}${p2s}（8宫）：拥有和放手之间的课题。孩子对物质和情感的所有权会比较敏感。在安全范围内让他体验「给予和接受」的完整循环。`,
  '5-11': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（5宫）对分${p2}${p2s}（11宫）：独处创作和社交融入之间的节奏。孩子有时需要独自做喜欢的事，有时又渴望被群体接纳。尊重他需要独处充电的时刻。`,
  '6-12': (p1, p2, p1s, p2s, p1h, p2h) =>
    `${p1}${p1s}（6宫）对分${p2}${p2s}（12宫）：现实任务和内心世界之间的摆荡。孩子有时过度投入工作学习，有时完全沉溺于想象和独处。帮他建立规律的节奏，而不是在两个极端之间来回。`,
};

const ASPECT_PERSONALIZED = {
  conjunction: (p1, p2, p1s, p2s, p1h, p2h, idx) => {
    const t = [
      `${p1}和${p2}在${p1h}宫${p1s}紧密合相，两个星体的能量在此深度融合、互相放大。孩子在这两个领域会表现出集中的爆发力，但也会因为能量太集中而缺乏灵活性。家长要做的不是压制这股能量，而是提供一个可以专注释放的通道。`,
      `${p1}${p1s}合相${p2}${p2s}（${p1h}宫），${p1}的核心驱动力和${p2}的表达方式融合在一起，形成一股集中的能量流。在${p1h}宫领域，孩子会表现出超过同龄人的专注度和投入感。建议提供纵深发展的资源，避免浅尝辄止。`,
      `${p1}与${p2}在${p1h}宫形成合相，两种能量在此交汇。${p1}的特质和${p2}的特质互相渗透，两个领域的天赋一体两面地呈现。建议把${p1h}宫相关的教育投入作为一个整体来规划。`,
    ];
    return t[idx % t.length];
  },
  trine: (p1, p2, p1s, p2s, p1h, p2h, idx) => {
    const t = [
      `${p1}${p1s}（${p1h}宫）三分相${p2}${p2s}（${p2h}宫），能量流动顺畅无阻。这是孩子的天赋舒适区——${p1h}宫的能力可以自然迁移到${p2h}宫，不需要刻意训练，属于「不费力就比别人强」的领域。`,
      `${p1}在${p1h}宫${p1s}与${p2}在${p2h}宫${p2s}形成拱相，两个宫位的能量形成良性循环。${p1h}宫的能力发展会自然地带动${p2h}宫的提升——做一件事就顺便练了另一件，天生配置。`,
      `${p1}${p1s}（${p1h}宫）与${p2}${p2s}（${p2h}宫）三分相，一种不需要外部激励就自然运转的能量搭配。孩子在这个领域表现出「好像没怎么努力就做得不错」的天赋感。家长要做的就是别用错误的方式破坏这种自然流畅性。`,
    ];
    return t[idx % t.length];
  },
  sextile: (p1, p2, p1s, p2s, p1h, p2h, idx) => {
    const t = [
      `${p1}${p1s}（${p1h}宫）六分相${p2}${p2s}（${p2h}宫），这是一个需要被激活的天赋连接。能量互相欣赏但不自动配合——需要家长有意识搭桥。比如把${p1h}宫的活动和${p2h}宫结合起来，孩子就能打通这两个领域的连接。`,
      `${p1}在${p1h}宫与${p2}在${p2h}宫六分相，潜力股相位。能量友好但还未形成自动化配合。如果在教育中刻意创造交叉场景，这个相位就会从可能变成优势。`,
      `${p1}${p1s}在${p1h}宫六分${p2}${p2s}在${p2h}宫，两个领域之间存在一个发展接口。只要找到正确的连接方式，孩子就能在这两个领域之间建立高效配合。建议多创造跨领域的体验机会。`,
    ];
    return t[idx % t.length];
  },
  square: (p1, p2, p1s, p2s, p1h, p2h, idx) => {
    const hp = [parseInt(p1h), parseInt(p2h)].sort((a,b)=>a-b).join('-');
    const pair = HOUSE_PAIR_SQUARE[hp];
    if (pair) return pair(p1, p2, p1s, p2s, p1h, p2h);
    const t = [
      `${p1}${p1s}（${p1h}宫）四分${p2}${p2s}（${p2h}宫），一个内在张力点。孩子在这两个领域的需求互相拉扯——${p1h}宫要往一个方向走，${p2h}宫却提出相反的要求。教育的智慧在于帮孩子找到一条能同时满足两者的中间路径。`,
      `${p1}在${p1h}宫${p1s}与${p2}在${p2h}宫${p2s}四分相，两个领域之间存在结构性冲突——一个的发展可能以牺牲另一个为代价。家长注意不要在两个领域之间反复切换要求孩子，而是找到整合策略。`,
      `${p1}${p1s}（${p1h}宫）四分${p2}${p2s}（${p2h}宫），一个需要被理解的张力。孩子可能表现出看似矛盾的行为——${p1h}宫驱动的模式和${p2h}宫驱动的需求互相冲突。这种紧张不是缺陷，而是需要在这两个领域之间找到个性化平衡点的信号。`,
    ];
    return t[idx % t.length];
  },
  opposition: (p1, p2, p1s, p2s, p1h, p2h, idx) => {
    const hp = [parseInt(p1h), parseInt(p2h)].sort((a,b)=>a-b).join('-');
    const pair = HOUSE_PAIR_OPPOSITION[hp];
    if (pair) return pair(p1, p2, p1s, p2s, p1h, p2h);
    const t = [
      `${p1}${p1s}（${p1h}宫）对分${p2}${p2s}（${p2h}宫），一组互补的极端。${p1h}宫和${p2h}宫代表两个看上去相反的面向，但正是因为这种对立，孩子有机会发展出比同龄人更全面的视野。教育的核心不是消除对立，而是教会孩子在不同场景下灵活切换。`,
      `${p1}在${p1h}宫${p1s}与${p2}在${p2h}宫${p2s}对分相，两个宫位在星盘上恰好相对。孩子内心两组看似相反的需求：一面是${p1h}宫代表的驱动力，另一面是${p2h}宫代表的需求。这是一个「既要又要」的整合题，不是非黑即白的选择题。`,
      `${p1}${p1s}（${p1h}宫）对分${p2}${p2s}（${p2h}宫），一个天平相位——孩子会在这两个领域之间不断摇摆寻找平衡。有时候${p1h}宫的需求占上风，有时候${p2h}宫占上风，都很正常。家长需要帮孩子认识到两个领域都是他的一部分。`,
    ];
    return t[idx % t.length];
  },
};

function getPersonalizedAspectDesc(p1Key, p2Key, type, p1Sign, p2Sign, p1House, p2House, idx) {
  const p1 = PLANET_CN_NAMES[p1Key] || p1Key;
  const p2 = PLANET_CN_NAMES[p2Key] || p2Key;

  const typeMap = {
    '合相': 'conjunction', '三分相': 'trine', '六分相': 'sextile',
    '四分相': 'square', '对分相': 'opposition',
  };
  const fn = ASPECT_PERSONALIZED[typeMap[type]];
  if (fn) return fn(p1, p2, p1Sign, p2Sign, p1House, p2House, idx || 0);

  // fallback: 调用旧逻辑
  return getAspectInterpretation({ planet1En: p1Key, planet2En: p2Key, type });
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const {
      name = '宝贝',
      birthDate,
      birthHour = 12,
      birthMinute = 0,
      latitude,
      longitude,
      version = 'free',
    } = body;

    // 参数验证
    if (!birthDate) {
      return new Response(JSON.stringify({ error: '请提供出生日期' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return new Response(JSON.stringify({ error: '请提供出生地点（经纬度）' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 计算星盘
    const chart = calculateBirthChart({
      birthDate,
      birthHour,
      birthMinute,
      latitude,
      longitude,
    });

    // 生成解读报告
    const report = generateReport(chart, name, version);

    return new Response(JSON.stringify({
      success: true,
      chart,
      report,
      version,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('Chart calculation error:', err);
    return new Response(JSON.stringify({
      error: '星盘计算异常',
      detail: err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 生成解读报告
 */
/**
 * 生成解读报告
 *
 * 免费版 (free): 日月升解读 + 水星学习模式 + 12宫位教育解读 + 相位解读
 * 深度版 (paid/9.9元): + 五者天赋 + 情绪画像 + 教育路径 + 风险预警
 */
export function generateReport(chartData, name, version = 'free') {
  const chart = chartData.basic || chartData;
  const full = chartData.full || chartData._raw || null;
  const sun = chart.planets.sun;
  const moon = chart.planets.moon;
  const rising = chart.planets.rising;
  const sunSign = sun.sign;
  const moonSign = moon.sign;
  const risingSign = rising.sign;

  const sunI = I.sun[sunSign];
  const moonI = I.moon[moonSign];
  const risingI = I.rising[risingSign];

  // === 基础信息（免费版也完整展示）===
  const report = {
    name,
    sections: [
      // ---- 日月升三件套 ----
      {
        id: 'sun',
        title: `☀️ 太阳${sunSign}`,
        subtitle: sunI?.title || '',
        tags: sunI?.tags || [],
        content: {
          child: sunI?.child || '',
          parent: sunI?.parent || '',
          edu: sunI?.edu || '',
          strength: sunI?.strength || '',
          challenge: sunI?.challenge || '',
        },
      },
      {
        id: 'moon',
        title: `🌙 月亮${moonSign}`,
        subtitle: moonI?.title || '',
        content: {
          child: moonI?.child || '',
          parent: moonI?.parent || '',
          need: moonI?.need || '',
        },
      },
      {
        id: 'rising',
        title: `✨ 上升${risingSign}`,
        subtitle: risingI?.title || '',
        content: {
          desc: risingI?.desc || '',
          appearance: risingI?.appearance || '',
          social: risingI?.social || '',
        },
      },
    ],
    chartSummary: {
      sun: chart.planets.sun.display,
      moon: chart.planets.moon.display,
      rising: chart.planets.rising.display,
    },
  };

  // ---- 水星学习模式（免费） ----
  const mercury = chart.planets.mercury;
  const mk = I.mercuryLearning?.[mercury.sign];
  if (mk) {
    report.sections.push({
      id: 'mercury',
      title: `📚 水星${mercury.sign} — 学习模式`,
      tags: [mk.tier || '', mk.keyword || ''].filter(Boolean),
      content: {
        tier: mk.tier || '',
        style: mk.style || '',
        strategy: mk.strategy || '',
        avoid: mk.avoid || '',
      },
    });
  }

  // ---- 12宫位教育解读（免费） ----
  const houseSections = chart.houses.map(h => {
    const hi = I.houses[h.house];
    return {
      house: h.house,
      name: hi.name,
      keyword: hi.keyword,
      sign: h.sign,
      desc: hi.desc,
      display: `${h.house}宫：${h.sign}（${hi.name}）`,
    };
  });
  report.sections.push({
    id: 'houses',
    title: '🏠 十二宫位与教育方向',
    content: houseSections,
  });

  // ---- 相位解读（免费） ----
  const aspectSections = chart.aspects.map(a => ({
    ...a,
    interpretation: getAspectInterpretation(a),
  }));
  report.sections.push({
    id: 'aspects',
    title: '🔗 行星相位',
    content: aspectSections,
  });

  // === 深度解读（付费 9.9 元）===
  const isPaid = version === 'paid' || version === 'standard' || version === 'premium';
  if (isPaid && full) {
    // 家庭格局
    report.sections.push({
      id: 'quadrant',
      title: '📊 家庭格局分析',
      locked: false,
      content: {
        dominant: full.quadrantPattern?.dominant,
        pattern: full.quadrantPattern?.pattern,
        quadrants: full.quadrantPattern?.quadrants,
        interpretation: I.quadrantPatterns?.[
          (full.quadrantPattern?.pattern || '').replace(/ — .*$/, '')
        ] || '',
      },
    });

    // 资源分析
    report.sections.push({
      id: 'resource',
      title: '💎 天赋资源分析',
      locked: false,
      content: {
        patterns: full.resource?.patterns,
        score: full.resource?.score,
        interpretations: (full.resource?.patterns || []).map(p => {
          const key = Object.keys(I.resource || {}).find(k => p.includes(k));
          return key ? I.resource[key] : p;
        }),
      },
    });

    // 风险预警
    report.sections.push({
      id: 'risk',
      title: '⚠️ 成长风险预警',
      locked: false,
      content: {
        level: full.risk?.level,
        warnings: full.risk?.warnings,
        interpretation: getRiskInterpretation(full.risk?.level),
      },
    });
  } else if (!isPaid) {
    // 免费版：展示锁定占位，引导付费
    report.sections.push({
      id: 'paywall',
      title: '🔓 深度解读',
      locked: true,
      lockedSections: [
        { id: 'quadrant', title: '📊 家庭格局分析', hint: '了解家庭能量分布，找到最适合孩子的成长环境' },
        { id: 'resource', title: '💎 天赋资源分析', hint: '挖掘孩子被忽视的隐藏天赋和优势组合' },
        { id: 'risk', title: '⚠️ 成长风险预警', hint: '提前发现潜在的心理和行为风险，防患于未然' },
      ],
      content: {
        price: '9.9',
        cta: '解锁完整深度报告，全面了解孩子的天赋密码',
      },
    });
  }

  // 报告末尾引导
  report.footer = isPaid ? I.reportFooter.paid : I.reportFooter.free;

  return report;
}

function getAspectInterpretation(aspect) {
  const key = `${aspect.planet1}_${aspect.planet2}`;
  const pair = I.aspects[key];
  if (pair) {
    const aspectKey = getAspectKey(aspect.type);
    if (pair[aspectKey]) return pair[aspectKey].desc;
  }
  // 通用的
  const genericKey = getAspectKey(aspect.type);
  return I.aspects.default[genericKey]?.desc || '';
}

function getAspectKey(type) {
  const map = {
    '合相': 'conjunction',
    '三分相': 'trine',
    '六分相': 'sextile',
    '四分相': 'square',
    '对分相': 'opposition',
  };
  return map[type] || 'trine';
}

function getRiskInterpretation(level) {
  const map = {
    '低': I.risk.mild,
    '中': I.risk.moderate,
    '高': I.risk.severe,
  };
  return map[level] || I.risk.mild;
}

/**
 * 基于知识库的 fallback 报告（DeepSeek 不可用时使用）
 */
export function getFallbackReport(chartData, name = '宝贝', version = 'free', budget = '', grade = '') {
  const chart = chartData.basic || chartData;
  const sun = chart.planets.sun;
  const moon = chart.planets.moon;
  const mercury = chart.planets.mercury;
  const rising = chart.planets.rising;
  const sunSign = sun.sign;
  const moonSign = moon.sign;
  const mercurySign = mercury.sign;
  const risingSign = rising.sign;

  const sunI = I.sun[sunSign];
  const moonI = I.moon[moonSign];
  const mercuryI = I.mercuryLearning?.[mercurySign];
  const risingI = I.rising[risingSign];

  const report = {
    name,
    chartSummary: {
      sun: chart.planets.sun.display,
      moon: chart.planets.moon.display,
      rising: chart.planets.rising.display,
    },
    sections: [
      {
        id: 'sun',
        title: `☀️ 太阳${sunSign} — 核心自我`,
        subtitle: sunI?.title || '',
        tags: sunI?.tags || [],
        content: {
          child: sunI?.child || '',
          parent: sunI?.parent || '',
          edu: sunI?.edu || '',
          strength: sunI?.strength || '',
          challenge: sunI?.challenge || '',
        },
      },
      {
        id: 'moon',
        title: `🌙 月亮${moonSign} — 情绪安全感`,
        subtitle: moonI?.title || '',
        content: {
          child: moonI?.child || '',
          parent: moonI?.parent || '',
          need: moonI?.need || '',
        },
      },
      {
        id: 'rising',
        title: `✨ 上升${risingSign} — 天赋面具`,
        subtitle: risingI?.title || '',
        content: {
          desc: risingI?.desc || '',
          appearance: risingI?.appearance || '',
          social: risingI?.social || '',
        },
      },
    ],
  };

  // 发展方向的星盘数据依据
  const _hpm = {};
  Object.entries(chart.planets).forEach(([key, p]) => {
    if (key !== 'rising' && key !== 'mc' && typeof p.house === 'number') {
      if (!_hpm[p.house]) _hpm[p.house] = { c: 0, ps: [] };
      _hpm[p.house].c++;
      _hpm[p.house].ps.push(PLANET_CN_NAMES[key] || key);
    }
  });
  const _hRank = Object.entries(_hpm).sort((a, b) => b[1].c - a[1].c);
  const _HD = ['自我展现','物质价值观','沟通学习','家庭情感','创造力','健康执行','合作','深度资源','高等教育','事业成就','社交理想','潜意识'];
  const _dirParts = [];
  if (_hRank.length > 0) {
    const [hNum, hData] = _hRank[0];
    if (hData.c >= 2) {
      _dirParts.push(`星盘中${hNum}宫有${hData.c}颗行星（${hData.ps.join('、')}）聚集，${_HD[parseInt(hNum)-1]}是孩子能量最集中、最需要发展的核心领域`);
    } else {
      _dirParts.push(`星盘中${hNum}宫能量相对突出，${_HD[parseInt(hNum)-1]}是值得关注的成长方向`);
    }
  }
  const _vH = chart.planets.venus?.house;
  const _jH = chart.planets.jupiter?.house;
  if (_vH || _jH) {
    const _bf = [];
    if (_vH) _bf.push(`金星${chart.planets.venus.sign}在${_vH}宫利于${_HD[_vH-1]}`);
    if (_jH) _bf.push(`木星${chart.planets.jupiter.sign}在${_jH}宫助推${_HD[_jH-1]}`);
    _dirParts.push(`${_bf.join('，')}，是孩子的天赋优势区`);
  }
  const _harmH = new Set();
  (chart.aspects || []).forEach(a => {
    if (a.type === '三分相' || a.type === '六分相') {
      const h1 = chart.planets[a.planet1En]?.house;
      const h2 = chart.planets[a.planet2En]?.house;
      if (h1 && h2 && h1 !== h2) _harmH.add(`${Math.min(h1, h2)}-${Math.max(h1, h2)}`);
    }
  });
  if (_harmH.size > 0) {
    const _prs = [..._harmH].slice(0, 2).map(p => {
      const [a, b] = p.split('-').map(Number);
      return `${a}宫（${_HD[a-1]}）与${b}宫（${_HD[b-1]}）`;
    });
    _dirParts.push(`和谐相位连接了${_prs.join('、')}，这些领域能量通畅，易形成优势组合`);
  }
  const _devDir = _dirParts.length > 0
    ? _dirParts.join('。') + '。'
    : `综合太阳${sunSign}、水星${mercurySign}和上升${risingSign}的配置，${_HD[0]}和${_HD[2]}是值得关注的方向。`;

  // === 深层星盘分析数据（元素/模式/宫位实质） ===
  const _ELEM = {'白羊座':'火','狮子座':'火','射手座':'火','金牛座':'土','处女座':'土','摩羯座':'土','双子座':'风','天秤座':'风','水瓶座':'风','巨蟹座':'水','天蝎座':'水','双鱼座':'水'};
  const _MOD = {'白羊座':'基本','巨蟹座':'基本','天秤座':'基本','摩羯座':'基本','金牛座':'固定','狮子座':'固定','天蝎座':'固定','水瓶座':'固定','双子座':'变动','处女座':'变动','射手座':'变动','双鱼座':'变动'};
  const _sEl = _ELEM[sunSign]||'', _mEl = _ELEM[moonSign]||'';
  const _elemRel = _sEl===_mEl ? '同象' : ((_sEl==='火'&&_mEl==='风')||(_sEl==='风'&&_mEl==='火')||(_sEl==='土'&&_mEl==='水')||(_sEl==='水'&&_mEl==='土')) ? '相生' : '相克';
  // 宫位行星分布（2宫物质/4宫家庭/10宫母亲）
  const _hPMap = {};
  Object.entries(chart.planets).forEach(([key,p])=>{
    if(key!=='rising'&&key!=='mc'&&typeof p.house==='number'){
      if(!_hPMap[p.house]) _hPMap[p.house]=[];
      _hPMap[p.house].push({key,n:PLANET_CN_NAMES[key]||key,s:p.sign});
    }
  });
  const _h2P=_hPMap[2]||[], _h4P=_hPMap[4]||[], _h10P=_hPMap[10]||[];
  const _h2S=(chart.houses[1]||{}).sign||'', _h4S=(chart.houses[3]||{}).sign||'', _h10S=(chart.houses[9]||{}).sign||'';
  // 元素分布
  const _elemCnt={火:0,土:0,风:0,水:0};
  Object.entries(chart.planets).forEach(([k,p])=>{if(k!=='rising'&&k!=='mc'){const e=_ELEM[p.sign];if(e)_elemCnt[e]++;}});
  const _domEl=Object.entries(_elemCnt).sort((a,b)=>b[1]-a[1])[0];
  // 基础款 familyPattern（保证永远有内容）
  const _genFamilyText = (() => {
    if (_sEl === _mEl) {
      const tips = {火:'但火象过旺容易缺乏耐心和细腻度，孩子可能表现得比实际更"大条"，需要帮他建立"慢下来"的能力',土:'但土象过重可能趋于保守和防御，孩子容易因为害怕犯错而不敢尝试，需要刻意制造"安全失败"的体验',风:'但风象过盛可能在情感层面显得疏离——孩子擅长用"分析"代替"感受"，需要帮他建立情感的连接',水:'但水象过重容易情绪负荷超载，孩子可能吸收周围人的情绪而不自知，需要帮他建立心理边界'};
      return `太阳${sunSign}与月亮${moonSign}同属${_sEl}象，核心自我与情感需求在本质上一致，内在消耗少。${tips[_sEl]||''}`;
    }
    if ((_sEl==='火'&&_mEl==='风')||(_sEl==='风'&&_mEl==='火'))
      return `太阳${sunSign}（${_sEl}象）与月亮${moonSign}（${_mEl}象）形成"火助风势"的相生搭配——一个点火一个扇风，行动力和沟通力互相增强。这种配置很适合需要"边做边学"的教育方式，但需注意信息过载和节奏过快的问题。`;
    if ((_sEl==='土'&&_mEl==='水')||(_sEl==='水'&&_mEl==='土'))
      return `太阳${sunSign}（${_sEl}象）与月亮${moonSign}（${_mEl}象）形成"土载水润"的相生搭配。孩子既有务实落地的能力，又有细腻的情感感知，往往"懂事但不失温度"。注意避免过于早熟而压抑了天真的一面。`;
    if ((_sEl==='火'&&_mEl==='水')||(_sEl==='水'&&_mEl==='火'))
      return `太阳${sunSign}（${_sEl}象）与月亮${moonSign}（${_mEl}象）构成水火相克的内在张力——一个想冲出去，一个想退回来。这是星盘中最需要整合的冲突之一，家长不需要选边站队，而是要帮孩子建立"先感知再行动"或"先行动再反思"的个性化节奏。`;
    if ((_sEl==='风'&&_mEl==='土')||(_sEl==='土'&&_mEl==='风'))
      return `太阳${sunSign}（${_sEl}象）与月亮${moonSign}（${_mEl}象）的元素存在"风土相违"的矛盾——太阳渴望变化和新鲜感，月亮需要稳定和可预测性。孩子可能在"探索新事物"和"守住安全区"之间来回拉扯。教育的智慧在于提供"可控的冒险"——在安全范围内持续提供新体验。`;
    // 风水（风生水）或 火土（火生土）——中性偏兼容
    return `太阳${sunSign}（${_sEl}象）与月亮${moonSign}（${_mEl}象）构成中性偏兼容的组合——${_sEl==='风'?'风动生水波：思维活跃和情感流动互相滋养，孩子既有想法的广度又有感受的深度，但需避免"想太多而内耗"':'火暖土生：热情和务实互相支撑，孩子既有行动的温度又有坚持的厚度，但需避免"太着急而忽略细节"'}`;
  })();
  // 基础款 supportLevel
  const _genSupportText = (() => {
    const h2Strong = _h2P.some(p=>p.key==='venus'||p.key==='jupiter')||['金牛座','狮子座'].includes(_h2S)||_h2P.length>=2;
    const h2Desc = _h2P.length ? `2宫有${_h2P.map(p=>p.n+p.s).join('、')}落入` : `2宫宫头${_h2S}`;
    const h4Desc = _h4P.length ? `4宫有${_h4P.map(p=>p.n+p.s).join('、')}落入` : `4宫宫头${_h4S}`;
    const h10HasSaturn = _h10P.some(p=>p.key==='saturn');
    let t = `${h2Desc}。${h2Strong?'家庭在物质层面具备较好的支持能力，资源状况有利于教育投入':'物质资源方面需要精打细算，但资源限制反而可能激发孩子的创造力和目标感。'}${h4Desc}，家庭氛围${['巨蟹座','金牛座'].includes(_h4S)?'以温暖稳定为主调':'需要家长有意识地营造安全感'}`;
    if (_h10P.length) t += `。10宫有${_h10P.map(p=>p.n+p.s).join('、')}落入，${h10HasSaturn?'母亲可能对孩子期望较高或管教偏严格，需警惕高压教育带来的副作用':'母亲在成长中扮演积极的引导角色，有利于社会化发展'}`;
    else t += `。10宫宫头${_h10S}，${['摩羯座','处女座','天蝎座'].includes(_h10S)?'母亲对孩子的教育有较高期待——适度驱动，过度加压':'母亲倾向于给予孩子自由发展的空间'}`;
    return t;
  })();
  // 基础款 coreIssues
  const _genIssues = (() => {
    const sunMap = {'白羊座':'行动先于思考，容易冲动','金牛座':'固执，适应变化慢','双子座':'好奇心强但专注力分散','巨蟹座':'过度敏感，容易退缩','狮子座':'好面子，输不起','处女座':'完美主义，自我苛责','天秤座':'选择困难，怕冲突','天蝎座':'占有欲强，容易钻牛角尖','射手座':'坐不住，不爱按部就班','摩羯座':'给自己压力太大','水瓶座':'太有主见，不服权威','双鱼座':'边界感弱，容易逃避'};
    const moonMap = {'白羊座':'情绪来得快去得也快，容易被点燃','金牛座':'有情绪但不爱表达，容易冷战','双子座':'情绪变化快，让人捉摸不透','巨蟹座':'过度依赖情感回应，安全感不足','狮子座':'需要被关注，被冷落就闹情绪','处女座':'焦虑型，担心这担心那','天秤座':'表面平静内心纠结','天蝎座':'情绪深刻但表达极端','射手座':'不爱被情绪束缚，用乐观掩饰','摩羯座':'习惯压抑情绪，直到爆发','水瓶座':'情感疏离，看起来不在乎','双鱼座':'情绪泛滥，容易被他人的情绪感染'};
    return [
      `太阳${sunSign}：${sunMap[sunSign]||'需要被正确引导的主动性'}`,
      `月亮${moonSign}：${moonMap[moonSign]||'情绪表达方式需要被理解和接纳'}`,
      `水星${mercurySign}：${mercuryI?.keyword||'独特'}的学习风格如果得不到匹配，容易被误判为"不努力"或"能力不足"`,
    ];
  })();

  // 综合总结与发展建议
  report.sections.push({
    id: 'summary',
    title: '📋 综合总结与发展建议',
    content: {
      familyPattern: _genFamilyText,
      supportLevel: _genSupportText,
      coreIssues: _genIssues,
      devDirection: _devDir,
      keyAdvice: `看见孩子的本来样子，而不是你期待的样子。`,
    },
  });

  // 水星学习模式
  if (mercuryI) {
    report.sections.push({
      id: 'mercury',
      title: `📚 水星${mercurySign} — 学习模式`,
      tags: [mercuryI.tier, mercuryI.keyword].filter(Boolean),
      content: {
        tier: mercuryI.tier || '',
        style: mercuryI.style || '',
        strategy: mercuryI.strategy || '',
        avoid: mercuryI.avoid || '',
      },
    });
  }

  // 宫位解读（个性化）
  const houseSections = buildPersonalizedHouses(chart);
  report.sections.push({
    id: 'houses',
    title: '🏠 十二宫位与教育方向',
    content: houseSections,
  });

  // 相位（个性化）
  const aspectSections = buildPersonalizedAspects(chart);
  report.sections.push({
    id: 'aspects',
    title: '🔗 行星相位',
    content: aspectSections,
  });

  // 深度内容（测试期间全量开放）
  const fullData = chartData.full || null;
  // 天赋画像（基于星盘数据生成）
  const planetsInHouses = [];
  Object.entries(chart.planets || {}).forEach(([key, p]) => {
    if (key !== 'rising' && key !== 'mc' && typeof p.house === 'number') {
      planetsInHouses.push(`${PLANET_CN_NAMES[key] || key}${p.sign}（${p.house}宫）`);
    }
  });
  report.sections.push({
    id: 'talent',
    title: '🧠 天赋画像',
    content: {
      type: '基于星盘综合判断',
      description: (() => {
        const hSort = Object.entries(_hPMap).sort((a,b)=>b[1].length-a[1].length);
        const stel = hSort.length>0 ? hSort[0] : null;
        const _domeDescs = {火:'行动力和热情驱动型——先做再想，在实战中成长最快',土:'务实和耐力型——稳扎稳打，在结构化环境中发挥最佳',风:'思维和社交型——通过交流和信息吸收获得成长',水:'感知和共情型——在情感流动和艺术氛围中绽放'};
        const pts = [];
        if (_domEl && _domEl[1]>=3) pts.push(`星盘${_domEl[0]}象元素占主导（${_domEl[1]}颗行星），属于${_domeDescs[_domEl[0]]||''}`);
        if (stel && stel[1].length>=2) pts.push(`群星汇聚在${stel[0]}宫（${stel[1].map(p=>p.n).join('、')}），${['自我展现','物质价值观','沟通学习','家庭情感','创造力','健康执行','合作','深层资源','高等教育','事业成就','社交理想','潜意识'][parseInt(stel[0])-1]}是天赋最集中的赛道——建议教育投入向此倾斜`);
        const intro = pts.length ? pts.join('。') + '。' : '星盘能量分布均匀，孩子具备多面发展的潜力，关键是在探索中找到最享受的领域。';
        return intro + `行星分布：${planetsInHouses.slice(0, 4).join('、')}。${sunI?.edu||'综合建议：关注孩子的核心优势，在天赋赛道集中投入，比平均用力更有效。'}`;
      })(),
      brainAdvantage: sunI?.tags?.join('、') || '',
      eduStrategy: sunI?.edu || '',
      parentAdvice: sunI?.parent || '',
    },
  });

  // 🌟 天赋资源分析
  const challengeCount = (chart.aspects || []).filter(a => a.type === '四分相' || a.type === '对分相').length;
  const harmonyCount = (chart.aspects || []).filter(a => a.type === '三分相' || a.type === '六分相').length;
  // 格局检测
  const trines = (chart.aspects||[]).filter(a=>a.angle===120);
  const squares = (chart.aspects||[]).filter(a=>a.angle===90);
  const oppositions = (chart.aspects||[]).filter(a=>a.angle===180);
  const hasGrandTrine = trines.length>=3;
  const hasTSquare = squares.length>=2 && oppositions.length>=1;
  // 枢纽行星（参与相位最多的行星）
  const _pAspectCnt = {};
  (chart.aspects||[]).forEach(a=>{[_pAspectCnt[a.planet1En]||(_pAspectCnt[a.planet1En]=0), _pAspectCnt[a.planet1En]++,_pAspectCnt[a.planet2En]||(_pAspectCnt[a.planet2En]=0),_pAspectCnt[a.planet2En]++];});
  const _hubPlanet = Object.entries(_pAspectCnt).sort((a,b)=>b[1]-a[1])[0];
  // 群星宫位（3+行星）
  const _stel3 = Object.entries(_hPMap).find(([h,p])=>p.length>=3);
  const _DOMAIN = ['自我展现','物质价值观','沟通学习','家庭情感','创造力','健康执行','合作','深层资源','高等教育','事业成就','社交理想','潜意识'];
  // 相位比
  const _hRatio = harmonyCount / (challengeCount + harmonyCount || 1);

  report.sections.push({
    id: 'resource',
    title: '🌟 天赋资源分析',
    content: {
      pattern: [hasGrandTrine?'大三角格局（3个三分相形成能量循环）——构成天赋舒适区，某些领域"不费力就比别人强"，但需避免过度依赖天赋而缺乏攻坚能力':'',hasTSquare?'T三角格局（2个四分相+对分相）——存在结构性张力，但这也是巨大潜能的来源。压力最大的地方，恰恰是爆发力最强的突破口':'',_stel3?`群星聚格局——${_stel3[1].length}颗行星密集在${_stel3[0]}宫（${_stel3[1].map(p=>p.n).join('、')}），${_DOMAIN[parseInt(_stel3[0])-1]}能量高度集中，优势突出但需注意避免偏科`:'',_hubPlanet&&_hubPlanet[1]>=4?`枢纽星——${PLANET_CN_NAMES[_hubPlanet[0]]||_hubPlanet[0]}参与${_hubPlanet[1]}个相位，是盘中能量交汇的枢纽节点，该行星所代表的领域是成长的关键支点`:'',_hRatio>0.7?'和谐相位占绝对主导：天赋发挥顺畅，但挑战太少可能导致抗压能力不足，建议适当增加难度刺激成长':_hRatio>0.5?'和谐相位多于挑战相位：总体格局健康，天赋发挥比较顺畅，适度挑战让成长更有方向':_hRatio>0.3?'挑战相位多于和谐相位：孩子需要在克服困难中成长，星盘的张力是潜能的另一面':'挑战相位显著偏多：星盘紧张度较高，孩子内心可能有较多冲突。但这种配置的孩子往往有巨大潜能——最"难搞"的地方恰恰是最需要被理解和引导的关键'].filter(Boolean).join('；') || '格局均衡，无明显极端倾向。',
      strengths: `核心天赋三角：\n• 太阳${sunSign}（核心驱动力）：${sunI?.strength||'独特的个性力量'}\n• 月亮${moonSign}（情感模式）：${moonI?.child?.split('。')[0]||'丰富的情感感知'}\n• 水星${mercurySign}（思维工具）：${mercuryI?.keyword||'特有的思维方式'}\n${_domEl&&_domEl[1]>=2?`• 元素底色：${_domEl[0]}象元素主导（${_domEl[1]}颗行星），${_domEl[0]==='火'?'行动力和热情是最强武器，但需注意耐心和持续性的培养':_domEl[0]==='土'?'务实和耐力是核心优势，但需警惕过于保守和抗拒变化':_domEl[0]==='风'?'思维和社交能力突出，但需注意行动的落地和执行力':_domEl[0]==='水'?'感知力和共情力极强，但需建立心理边界避免情绪超载':''}`:''}`,
      potential: (()=>{
        const hList = [...new Set((chart.aspects||[]).filter(a=>a.type==='三分相'||a.type==='六分相').map(a=>a.planet1+'与'+a.planet2))];
        if (hList.length===0) return '暂无显著的和谐相位格局，潜力需要通过后天培养和刻意练习来开发。';
        return `和谐相位组合：${hList.slice(0,3).join('、')}${hList.length>3?'等':''}。这些行星之间的能量对接是天生的"加速器"——在这些领域投入教育资源的回报率最高，因为孩子本身就具备天然的配合优势。`;
      })(),
      advantage: `相比同龄人，${sunSign}的孩子优势在于${sunI?.strength?.split('、')[0]||'独特的个性力量'}，${_domEl&&_domEl[1]>=2?'加上'+_domEl[0]+'象元素的主导能量，':'同时'}${mercuryI?.tier?'属于「'+mercuryI.tier+'」学习类型，':''}在适合的赛道和方法下能发挥出超常潜力。关键是把资源投入到星盘显示的天赋领域，而非在短板领域平均用力。`,
    },
  });

  // ⚠️ 成长风险预警
  const riskLevel = challengeCount >= 4 ? '高' : challengeCount >= 2 ? '中' : '低';
  const riskWarnings = [];
  const PLANET_RISK_DESC = {
    '太阳-海王星': '太阳与海王星挑战相位：孩子精力容易分散，目标感不够清晰。在自我认同方面易受外界影响，需要家长帮助建立清晰的自我认知和边界感。',
    '月亮-土星': '月亮与土星挑战相位：情绪表达可能受到压抑。孩子可能不敢在家庭中自由表达情感，担心被批评或不被接纳。家长需要营造「说什么都不会被骂」的安全表达环境。',
    '月亮-冥王星': '月亮与冥王星挑战相位：情感体验强烈而深刻，但表达方式可能极端。孩子的情绪容易走极端——要么全有要么全无。需要帮助他学会温和地表达强烈的情感。',
    '水星-土星': '水星与土星挑战相位：思维表达可能受限。孩子在学习上可能「想太多但说不出来」，或表达自己想法时缺乏自信。需要耐心引导，多给正向反馈。',
    '金星-火星': '金星与火星挑战相位：爱与表达爱的方式可能存在矛盾。孩子在人际中可能表现出「想亲近又怕受伤」的矛盾心态。需要帮助建立健康的社交边界。',
    '金星-天王星': '金星与天王星挑战相位：情感需求和独立需求之间存在张力。孩子可能时而依赖时而疏离。需要给予稳定的情感支持但不束缚。',
    '火星-木星': '火星与木星挑战相位：行动力和扩张欲之间存在过度倾向。孩子做事容易过头——玩起来停不下来，激动起来控制不住。需要帮建立「适可而止」的自我调节能力。',
    '火星-天王星': '火星与天王星挑战相位：冲动和叛逆容易被激发。孩子可能突然爆发脾气或做出冒险行为，尤其在被控制时。需要给孩子适度的自主空间，避免硬碰硬。',
    '太阳-天王星': '太阳与天王星挑战相位：自我认同和独立需求之间存在冲突。孩子可能抗拒权威、不喜欢被安排，但又渴望被理解。需要尊重独特性，在规则和自由之间找弹性。',
    '水星-海王星': '水星与海王星挑战相位：思维容易发散模糊。孩子学习和表达时可能天马行空但缺乏逻辑落地。需要帮建立结构化思维，但不是打压想象力。',
    '太阳-冥王星': '太阳与冥王星挑战相位：自我意志和控制欲之间存在深层冲突。孩子可能表现出强烈的「我要做主」态度。需要学会放手和信任。',
    '月亮-天王星': '月亮与天王星挑战相位：情绪需求不稳定且多变。孩子的情绪模式可能让家长觉得捉摸不透。需要接纳这种不稳定性，不要贴标签。',
    '太阳-土星': '太阳与土星挑战相位：自信心建立可能较慢。孩子对自己要求过高，害怕失败和犯错。需要帮建立「犯错不等于失败」的认知，降低自我苛责。',
    '水星-冥王星': '水星与冥王星挑战相位：思维深刻但可能钻牛角尖。孩子对某些问题会刨根问底。需要引导深度思考的方向，避免陷入负面思维循环。',
  };
  (chart.aspects || []).filter(a => a.type === '四分相' || a.type === '对分相').forEach(a => {
    const key = `${a.planet1}-${a.planet2}`;
    const keyRev = `${a.planet2}-${a.planet1}`;
    const specific = PLANET_RISK_DESC[key] || PLANET_RISK_DESC[keyRev];
    if (specific) {
      riskWarnings.push(`【${a.planet1}与${a.planet2} ${a.type}】${specific}`);
    } else {
      riskWarnings.push(`【${a.planet1}在${chart.planets[a.planet1En]?.sign||''}（${chart.planets[a.planet1En]?.house||'?'}宫）${a.type}${a.planet2}在${chart.planets[a.planet2En]?.sign||''}（${chart.planets[a.planet2En]?.house||'?'}宫）】这两个行星之间的紧张关系需要家长关注，建议在两个领域之间寻找平衡策略。`);
    }
  });
  report.sections.push({
    id: 'risk',
    title: '⚠️ 成长风险预警',
    content: {
      level: riskLevel,
      warnings: riskWarnings.length ? riskWarnings : ['目前星盘未发现显著挑战相位，成长环境相对平顺。'],
      mitigation: riskWarnings.length
        ? `家长需要关注这些挑战相位所涉及的领域之间的平衡。${sunSign}的孩子${sunI?.challenge || '需要家长在关键成长阶段给予更多的耐心和引导'}。`
        : '保持目前的良好成长节奏，定期观察孩子的情绪变化和学习状态即可。',
      timelyWarning: riskLevel === '高'
        ? `星盘显示较多挑战相位，孩子内心可能有较多的张力。这些孩子往往有巨大的潜能，但需要家长特别的耐心和正确的引导方式。`
        : riskLevel === '中'
        ? `星盘存在一些需要注意的冲突点。这些「不好」的地方恰恰是最需要被理解和引导的地方——挑战是成长的催化剂。`
        : `孩子的星盘整体格局平稳，成长过程相对平顺。`,
    },
  });

  // 教育路径（基于预算+成绩的 张雪峰式建议）
  const EDU_PATH_MATRIX = {
    capital: { ssr:{path:'全球领袖路-F',target:'冲藤校/牛剑G5',strategy:'背景提升(夏校/竞赛)、顶级升学顾问',major:'计算机+金融双学位、人工智能',slogan:'家里有矿+孩子争气=世界是你的'},
      sr:{path:'精英特长路-A',target:'Top30美本/英本',strategy:'作品集/竞赛辅导、国际课程(IB/AP)',major:'数字媒体、建筑设计、金融管理',slogan:'用资源砸出一条差异化赛道'},
      r:{path:'赋能托举路',target:'预科/国际大一',strategy:'避开学术内卷、走艺术/体育/特长通道',major:'艺术管理、体育管理、酒店管理',slogan:'资源就是最大的杠杆'},
      n:{path:'创业孵化路',target:'技能+人脉双修',strategy:'实战经验优先、找个好师傅',major:'商业实战技能',slogan:'读书不是唯一的出路，但学习是'} },
    middle: { ssr:{path:'强基腾飞路-B',target:'985强基计划+海外硕',strategy:'竞赛保底、雅思/托福早准备、留学基金',major:'计算机、电子信息、临床医学(5+3)',slogan:'成绩好就是最省钱的升学方式'},
      sr:{path:'弯道超车路-E',target:'211热门专业+中外合作(2+2)',strategy:'雅思/托福培训(越早越好)、科研实习',major:'计算机、法学(五院四系)、金融会计',slogan:'国内打基础，国外镀金'},
      r:{path:'中外合作路',target:'中外合作办学(西浦/宁诺4+0)',strategy:'避开高考内卷、英语强化、留学规划',major:'商科、传媒、计算机应用',slogan:'花点钱买条更宽的赛道'},
      n:{path:'技能留学路',target:'大专/预科+海外Top-up',strategy:'先学实用技能、再镀金学历',major:'护理、酒店管理、电竞运营',slogan:'换条赛道试试'} },
    working: { ssr:{path:'体制内快车道-B',target:'公费师范生/军校/警校',strategy:'提前批志愿、体能训练、政治素养',major:'公费师范生、警校提前批、临床医学定向',slogan:'免费读书+稳定工作'},
      sr:{path:'考公稳妥路-D',target:'省属重点本科+考公/考编',strategy:'志愿填报(选考公专业)、大学刷题考公',major:'汉语言文学(师范)、法学、会计学、电气工程',slogan:'稳字当头，选能吃饭的专业'},
      r:{path:'技能铁饭碗-C',target:'普通本科/二本+考编/国企',strategy:'专业>学校、选有壁垒的专业',major:'护理学、会计学(CPA)、轨道交通、水利水电',slogan:'别追梦，选能吃饭的手艺'},
      n:{path:'技能生存路-C',target:'职高/3+2大专+高级技工',strategy:'选风口专业、考职业资格证',major:'新能源技术、宠物医疗、精密加工',slogan:'一技之长比文凭实在'} },
    survival: { ssr:{path:'全免费精英路',target:'公费师范生/定向医学生/全奖',strategy:'全力冲刺免费路径、助学贷款+奖学金',major:'公费师范生、定向医学生、强基计划(全奖)',slogan:'寒门贵子：免费的路已经铺好了'},
      sr:{path:'助学奋斗路',target:'助学贷款+勤工俭学+好专业',strategy:'选有补贴的专业、申请助学贷款',major:'护理学、计算机、会计学(CPA)',slogan:'学硬核技术先吃饱饭'},
      r:{path:'实用技能路-C',target:'职高/技校(免学费)+高级技工',strategy:'选包分配/订单班、考高级技工证',major:'汽修(新能源)、精密加工、护理、烹饪',slogan:'高级技工收入不比白领低'},
      n:{path:'生存底线路',target:'学一门能吃饭的手艺',strategy:'找个好师傅、学实操技术',major:'美容美发、烹饪、电焊、物流',slogan:'先解决生存，再谈发展'} },
  };
  const bLabel = { capital:'资本型(200w+/年)',middle:'中产型(50-100w/年)',working:'工薪型(10-20w/年)',survival:'生存型(5w内/年)' };
  const gLabel = { ssr:'王者SSR(年级Top1%)',sr:'钻石SR(211/一本线)',r:'黄金R(中等水平)',n:'青铜N(不及格/厌学)' };
  const matched = budget && grade ? (EDU_PATH_MATRIX[budget]?.[grade] || null) : null;

  let pathContent;
  if (matched) {
    const p = matched;
    pathContent = {
      pathType: `「${bLabel[budget]}」×「${gLabel[grade]}」→ ${p.path}`,
      pathDescription: `目标定位：${p.target}\n核心策略：${p.strategy}\n推荐专业：${p.major}\n核心原则：${p.slogan}`,
      suitableProfile: `${bLabel[budget]} + ${gLabel[grade]} 的组合最推荐「${p.path}」。这条路径用预算优势补成绩短板，或用成绩优势降预算压力。`,
      strategyAdvice: budget==='capital'?'资源型路线：资金充裕，核心是配置资源的能力。投资信息差和圈层。':budget==='middle'?'杠杆型路线：核心是选性价比最高的路径。投资语言能力和信息差。':budget==='working'?'稳健型路线：核心是选对赛道不犯错。投资有确定性回报的证书。':'生存型路线：核心是活下去且不被淘汰。投资能吃一辈子的手艺。',
      riskWarning: (budget==='survival'||grade==='n')?'最忌讳穷家富养——砸锅卖铁读高价学校不如务实学手艺。':(budget==='capital'&&grade==='n')?'切忌用钱砸出一条光鲜但没能力的路。先有生存能力再谈资源。':'教育路径需要动态调整，定期评估孩子状态。',
    };
  } else {
    pathContent = {
      pathType: '综合推荐路径',
      pathDescription: `基于星盘配置（太阳${sunSign}、月亮${moonSign}、水星${mercurySign}）给出方向性建议。如需精准路径推荐请返回填写「预算」和「成绩」。`,
      suitableProfile: `适合${sunI?.tags?.[0] || '有潜力'}型孩子的方案`,
      strategyAdvice: `①发挥优势：${sunI?.strength||''}\n②关注情绪：${moonI?.child||''}\n③学习策略：${mercuryI?.strategy||''}`,
      riskWarning: `定期评估学习状态，调整教育策略。${riskWarnings.length ? '尤其注意相位中的张力点。' : ''}`,
    };
  }
  report.sections.push({
    id: 'edu_path',
    title: '🎯 教育路径规划建议（张雪峰式升学策略）',
    content: pathContent,
  });

  report.footer = I.reportFooter.free;

  return report;
}
