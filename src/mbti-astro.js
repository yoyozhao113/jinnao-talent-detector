/**
 * MBTI × 星盘 交叉解读引擎
 * 将人格类型与占星数据进行交叉分析，生成综合解读
 * 预留五者天赋接口，未来可扩展
 */

// 12星座元素映射
const SIGN_ELEMENTS = {
  Aries: '火', Taurus: '土', Gemini: '风', Cancer: '水',
  Leo: '火', Virgo: '土', Libra: '风', Scorpio: '水',
  Sagittarius: '火', Capricorn: '土', Aquarius: '风', Pisces: '水',
};

const ELEMENT_NAMES = { 火: '火象', 土: '土象', 风: '风象', 水: '水象' };

// 元素特质
const ELEMENT_TRAITS = {
  火: { energy: '热情主动、行动力强、有冒险精神', keyword: '行动' },
  土: { energy: '稳重务实、耐心持久、注重实际', keyword: '务实' },
  风: { energy: '善于思考、交流沟通、适应力强', keyword: '思考' },
  水: { energy: '情感丰富、直觉敏锐、共情力强', keyword: '感受' },
};

// 教育学习风格 × MBTI
const LEARNING_STYLES = {
  ESTJ: '结构化学习，喜欢有明确目标和时间表的课程，擅长记忆和复述',
  ISTJ: '系统化学习，重视教材和笔记，喜欢按部就班掌握知识点',
  ENTJ: '目标导向学习，喜欢挑战性课程，擅长用框架理解知识体系',
  INTJ: '概念驱动学习，喜欢钻研深层原理，擅长独立研究',
  ESFJ: '互动式学习，喜欢小组讨论和集体学习，通过实践巩固理解',
  ISFJ: '观察型学习，通过案例和实例理解，注重知识的实际应用',
  ENFJ: '协作式学习，通过教别人来加深理解，需要情感连接驱动',
  INFJ: '意义导向学习，需要知道"为什么学这个"，善于洞察本质',
  ESTP: '体验式学习，"做中学"效果最好，喜欢动手和实操',
  ISTP: '探索式学习，拆解和重组知识结构，擅长技术类学习',
  ENFP: '灵感式学习，兴趣驱动，在跨领域连接中产生洞察',
  INFP: '沉浸式学习，通过故事和情感连接吸收知识',
  ESFP: '感官式学习，需要视觉/听觉/互动刺激，游戏化学习',
  ISFP: '审美式学习，通过艺术和美感体验吸收知识',
  ENTP: '辩论式学习，通过质疑和讨论深化理解，追求知识体系的自洽',
  INTP: '分析式学习，构建逻辑模型，追问到底层原理才满足',
};

// 教育科目建议 × MBTI
const SUBJECT_AFFINITY = {
  ESTJ: '管理学、法学、会计、行政管理、军事',
  ISTJ: '会计、审计、历史学、图书馆学、统计学',
  ENTJ: '工商管理、金融、国际关系、战略管理、法律',
  INTJ: '物理学、数学、计算机科学、哲学、理论研究',
  ESFJ: '教育学、社会工作、护理学、人力资源管理',
  ISFJ: '教育学、护理学、档案学、出版编辑、营养学',
  ENFJ: '心理学、传播学、公共关系、教育领导力',
  INFJ: '心理学、文学、社会学、艺术治疗、咨询',
  ESTP: '市场营销、体育训练、工程、旅游管理、创业',
  ISTP: '机械工程、计算机技术、航空航天、土木工程',
  ENFP: '传媒、广告学、创意写作、戏剧、艺术管理',
  INFP: '文学、心理学、艺术、设计、文化研究',
  ESFP: '表演艺术、传媒、酒店管理、旅游、体育',
  ISFP: '美术、音乐、服装设计、园林艺术、烘焙',
  ENTP: '法学、创业学、科技管理、产品设计、战略咨询',
  INTP: '计算机科学、人工智能、理论物理、数学、哲学',
};

// 认知功能 × 行星映射解读
const FUNCTION_PLANET_MAP = {
  Ni: { planet: '冥王星', desc: '深度洞察和本质透视' },
  Ne: { planet: '天王星', desc: '创新思维和可能性探索' },
  Si: { planet: '土星', desc: '经验沉淀和秩序感' },
  Se: { planet: '火星', desc: '当下行动和感官体验' },
  Ti: { planet: '水星', desc: '逻辑分析和精密思维' },
  Te: { planet: '木星', desc: '效率组织和系统构建' },
  Fi: { planet: '月亮', desc: '内在价值观和情感真实' },
  Fe: { planet: '金星', desc: '社交和谐和情感连接' },
};

/**
 * 获取星座的元素
 */
function getElement(signEn) {
  return SIGN_ELEMENTS[signEn] || '火';
}

/**
 * 交叉分析主函数
 * @param {Object} mbtiResult - calculateMBTI 的返回结果
 * @param {Object} planets - chart.chart.planets (sun, moon, mercury, etc.)
 * @returns {Object} 交叉解读
 */
export function getMbtiAstroCross(mbtiResult, planets) {
  if (!planets) return null;

  const type = mbtiResult.type;
  const dim = mbtiResult.dimensionScores;
  const sunEl = getElement(planets.sun?.signEn);
  const moonEl = getElement(planets.moon?.signEn);
  const mercEl = getElement(planets.mercury?.signEn);
  const marsEl = getElement(planets.mars?.signEn);

  // ===== 1. 社交与能量风格 =====
  const isE = dim.EI.label.startsWith('E');
  const energyStyle = buildEnergyStyle(isE, sunEl, planets);

  // ===== 2. 学习与信息处理 =====
  const isN = dim.SN.label.endsWith('直觉');
  const learningStyle = buildLearningStyle(type, isN, mercEl, planets);

  // ===== 3. 决策与情感模式 =====
  const isF = dim.TF.label.endsWith('情感');
  const decisionStyle = buildDecisionStyle(isF, moonEl, planets);

  // ===== 4. 生活节奏与自律 =====
  const isJ = dim.JP.label.endsWith('判断');
  const lifePattern = buildLifePattern(isJ, planets);

  // ===== 5. 认知功能 × 星盘洞察 =====
  const cognitiveInsight = buildCognitiveInsight(mbtiResult, planets);

  // ===== 6. 教育路径深度建议 =====
  const educationPath = buildEducationPath(type, planets);

  // ===== 7. 综合成长方向 =====
  const growthDirection = buildGrowthDirection(mbtiResult, planets);

  // ===== 8. 五大行星 × MBTI 速览 =====
  const planetQuickView = buildPlanetQuickView(type, planets);

  return {
    energyStyle,
    learningStyle,
    decisionStyle,
    lifePattern,
    cognitiveInsight,
    educationPath,
    growthDirection,
    planetQuickView,
  };
}

function buildEnergyStyle(isE, sunEl, planets) {
  const sun = planets.sun;
  const rising = planets.rising;

  const socialTendency = isE
    ? '你天生从社交中获取能量，与人群互动让你充电'
    : '你通过独处恢复能量，社交对你来说是消耗，但深度关系是你的养分';

  const elDesc = ELEMENT_TRAITS[sunEl];
  const sunLabel = sun?.sign || '未知星座';

  return `${socialTendency}。你的太阳落在${sunLabel}（${ELEMENT_NAMES[sunEl]}），带有${elDesc.energy}的特质，这使得你的${isE ? '外向表达方式' : '内向能量底色'}呈现出${sunLabel}特有的色彩。${rising ? '上升星座' + rising.sign + '是你向世界展示的面具，影响着你的第一印象和社交姿态。' : ''}`;
}

function buildLearningStyle(type, isN, mercEl, planets) {
  const merc = planets.mercury;
  const house3 = planets.house3; // 学习宫位（如果传了）
  const mercSign = merc?.sign || '未知';
  const mercHouse = merc?.house || '';

  const baseStyle = LEARNING_STYLES[type] || '综合型学习风格';
  const subjectAffinity = SUBJECT_AFFINITY[type] || '综合学科';

  const mercDesc = ELEMENT_TRAITS[mercEl]?.keyword || '综合';

  return `你的核心学习风格：${baseStyle}。水星（思维与沟通）落在${mercSign}，呈现出「${mercDesc}」特质，影响你接收和处理信息的方式。${mercHouse ? '落在第' + mercHouse + '宫，' + getMercuryHouseMeaning(mercHouse) : ''}建议学科方向：${subjectAffinity}。${isN ? '你偏好概念化学习，适合先理解框架再填充细节' : '你偏好循序渐进的学习，适合从具体案例中抽象出规律'}。`;
}

function buildDecisionStyle(isF, moonEl, planets) {
  const moon = planets.moon;
  const venus = planets.venus;
  const moonSign = moon?.sign || '未知';
  const venusSign = venus?.sign || '未知';

  const elDesc = ELEMENT_TRAITS[moonEl]?.energy || '';

  return isF
    ? `你做决定时更多听从内心的感受和价值观。月亮落在${moonSign}，你的情绪底色带有${ELEMENT_NAMES[moonEl]}的${elDesc}的特质，这影响着你如何在压力下做选择。金星落在${venusSign}，塑造了你的爱与关系模式。你需要在理性分析和情感认同之间找到平衡，当两者一致时，你会做出最自信的决定。`
    : `你做决定时更多依靠逻辑分析和客观标准。但月亮落在${moonSign}（${ELEMENT_NAMES[moonEl]}），意味着你的内心深处其实也有丰富的情感需求——你只是在做决定时把它们暂时放在了一边。金星落在${venusSign}，塑造了你的亲密关系模式。学会在理性决策中尊重自己的感受，会让你更完整。`;
}

function buildLifePattern(isJ, planets) {
  const saturn = planets.saturn;
  const saturnSign = saturn?.sign || '未知';
  const saturnHouse = saturn?.house || '';

  if (isJ) {
    return `你喜欢有计划、有条理的生活方式，习惯把事情确定下来。土星落在${saturnSign}${saturnHouse ? '，在第' + saturnHouse + '宫' : ''}，反映出你在结构化和责任承担方面的天赋领域。你的自律是你的超能力，但也要注意别让计划变成束缚。适当留白的空间往往会带来意想不到的收获。`;
  }
  return `你喜欢灵活随性的生活方式，保持开放选择让你感到自由。土星落在${saturnSign}${saturnHouse ? '，在第' + saturnHouse + '宫' : ''}，是你需要培养自律和责任感的重要领域。你不需要变成一个严格的计划者，但在关键领域建立基本的秩序感，会给你更多的自由。`;
}

function buildCognitiveInsight(mbtiResult, planets) {
  const type = mbtiResult.type;
  const sun = planets.sun;
  const moon = planets.moon;

  // 从 cognitiveStack 提取主导功能
  const stack = mbtiResult.cognitiveStack || '';
  const domFunc = stack.match(/主导\s*([a-z]+)/i)?.[1] || '';
  const auxFunc = stack.match(/辅助\s*([a-z]+)/i)?.[1] || '';
  const infFunc = stack.match(/劣势\s*([a-z]+)/i)?.[1] || '';

  const domPlanet = FUNCTION_PLANET_MAP[domFunc];
  const auxPlanet = FUNCTION_PLANET_MAP[auxFunc];
  const infPlanet = FUNCTION_PLANET_MAP[infFunc];

  let insight = `【主导功能·${domFunc}】`;
  if (domPlanet) {
    insight += ` 你的主导认知功能是${domFunc}，与${domPlanet.planet}的能量相呼应——${domPlanet.desc}。太阳落在${sun?.sign || '你的星座'}，赋予你的${domFunc}功能以独特的表达色彩。`;
  }

  if (auxPlanet) {
    insight += `\n\n【辅助功能·${auxFunc}】你的辅助功能是${auxFunc}，对应${auxPlanet.planet}——${auxPlanet.desc}。月亮落在${moon?.sign || '月亮星座'}，与你的辅助功能相互作用，塑造了你如何照顾自己和他人。`;
  }

  if (infPlanet) {
    insight += `\n\n【劣势功能·${infFunc}——成长突破方向】你最需要发展的功能是${infFunc}，对应${infPlanet.planet}——${infPlanet.desc}。这不是你的自然优势，但恰恰是你成长空间最大的领域。${getInferiorAdvice(infFunc)} 当你主动练习这个维度时，你会在对应的生活领域看到显著提升。`;
  }

  return insight;
}

function buildEducationPath(type, planets) {
  const merc = planets.mercury;
  const mercSign = merc?.sign || '';
  const mercHouse = merc?.house || '';
  const house3 = planets.house3; // 可能会传递
  const jupiter = planets.jupiter;
  const jupiterSign = jupiter?.sign || '';

  const style = LEARNING_STYLES[type] || '';
  const subjects = SUBJECT_AFFINITY[type] || '';

  // 教育宫位分析
  const thirdHouseMeaning = mercHouse
    ? `你的水星落在第${mercHouse}宫，${getMercuryHouseMeaning(mercHouse)}`
    : '';

  const jupiterPart = jupiter
    ? `木星（教育与成长）落在${jupiterSign}，预示着你在${getJupiterEducation(jupiter)}方面有天然的优势和扩展力。`
    : '';

  return `【学习风格】${style}\n\n【优势学科】${subjects}\n\n【星盘强化】${thirdHouseMeaning}${jupiterPart}\n\n【学习秘诀】根据你的${type}类型，最有效的学习方式是：${getStudyTip(type)}\n\n【发展建议】将你的认知优势（${getTypeStrength(type)}）与星盘能量相结合，选择让你既有优势又有热情的方向深耕。`;
}

function buildGrowthDirection(mbtiResult, planets) {
  const type = mbtiResult.type;
  const saturn = planets.saturn;
  const moon = planets.moon;
  const mars = planets.mars;

  let advice = `对你（${type}）而言，最重要的成长是平衡你的自然优势与你忽略的领域。`;

  // 根据劣势功能
  const stack = mbtiResult.cognitiveStack || '';
  const infFunc = stack.match(/劣势\s*([a-z]+)/i)?.[1] || '';
  if (infFunc) {
    const infPlanet = FUNCTION_PLANET_MAP[infFunc];
    advice += `\n\n【发展劣势功能·${infFunc}】${infPlanet ? '你的' + infFunc + '功能与' + infPlanet.planet + '的能量对应——' + infPlanet.desc : ''}。这不是你的本能反应，所以需要刻意练习。${getInferiorAdvice(infFunc)}`;
  }

  if (saturn) {
    advice += `\n\n【土星功课】土星落在${saturn.sign}（第${saturn.house}宫），这是你今生需要面对的重要课题——${getSaturnLesson(saturn)}`;
  }

  if (mars) {
    advice += `\n\n【行动力建议】火星落在${mars.sign}，你的行动能量呈现出${ELEMENT_TRAITS[getElement(mars.signEn)]?.keyword || '独特'}的特质。学会利用这种能量推动自己的成长。`;
  }

  return advice;
}

function buildPlanetQuickView(type, planets) {
  const views = [];
  if (planets.sun) views.push(`太阳·${planets.sun.sign}：你的核心人格表达方式`);
  if (planets.moon) views.push(`月亮·${planets.moon.sign}：你的情感需求和安全感来源`);
  if (planets.mercury) views.push(`水星·${planets.mercury.sign}：你的思维沟通模式`);
  if (planets.venus) views.push(`金星·${planets.venus.sign}：你的爱与关系态度`);
  if (planets.mars) views.push(`火星·${planets.mars.sign}：你的行动力和欲望表达`);
  return views.join('\n');
}

// ========== 辅助函数 ==========

function getMercuryHouseMeaning(house) {
  const map = {
    1: '自我表达和形象塑造，你的思维方式直接影响你的个人品牌',
    2: '价值观和财务思维，你对金钱和资源有独特的认知方式',
    3: '学习和沟通，你在信息处理和表达方面有天赋',
    4: '家庭和情感根基，你的思维深受家庭背景影响',
    5: '创意和娱乐，你在创造性表达方面有特殊才能',
    6: '工作和健康，你擅长将知识应用于日常实务',
    7: '关系与合作，你在一对一的沟通中有独特优势',
    8: '深度心理学和共享资源，你喜欢探究隐藏的真相',
    9: '高等教育和哲学，你有宏观视野和学术潜力',
    10: '事业和公众形象，你的表达能力助你在职业上成功',
    11: '社交网络和理想，你在群体中善于传播想法',
    12: '潜意识和灵性，你有直觉型的深刻思维',
  };
  return map[house] || '带来独特的学习和沟通方式';
}

function getJupiterEducation(jupiter) {
  return jupiter.sign + '相关的学习领域有天然优势';
}

function getStudyTip(type) {
  const tips = {
    ESTJ: '制定详细学习计划，用时间表督促自己，多做练习题和案例',
    ISTJ: '整理结构化笔记，用思维导图归纳知识点，反复复习巩固',
    ENTJ: '先搭建知识框架，找到学习的目标和意义，在实践中运用',
    INTJ: '深入研究核心原理，构建自己的知识体系，追求深度而非广度',
    ESFJ: '加入学习小组，通过讨论和交流加深理解，用教别人来巩固',
    ISFJ: '结合真实案例学习，将知识与实际应用场景连接',
    ENFJ: '找到学习的意义和使命感，与志同道合的人一起学习',
    INFJ: '在知识中寻找深层规律和意义，用比喻和故事帮助记忆',
    ESTP: '动手实操，在真实项目中学，通过竞争和挑战激发动力',
    ISTP: '拆解和重组知识，亲手实验或操作，在实践中验证理论',
    ENFP: '跨学科连接，用创意项目驱动学习，保持多样化的学习内容',
    INFP: '将学习与个人价值观连接，通过写作和创作深化理解',
    ESFP: '游戏化学习，使用多媒体和互动工具，小组合作学习',
    ISFP: '在美学和艺术中吸收知识，用感官体验加强记忆',
    ENTP: '通过辩论和讨论深化理解，挑战既有观点，设计自己的方案',
    INTP: '追根溯源，理解底层原理，用逻辑模型验证知识体系',
  };
  return tips[type] || '找到适合自己的节奏，善用你的认知优势';
}

function getTypeStrength(type) {
  const strengths = {
    ESTJ: '高效组织和执行力', ISTJ: '系统化和精准记忆',
    ENTJ: '战略思维和领导力', INTJ: '深度分析和长期规划',
    ESFJ: '人际关系和协作能力', ISFJ: '细致观察和耐心',
    ENFJ: '激励他人和感染力', INFJ: '洞察本质和共情力',
    ESTP: '应变能力和实操技巧', ISTP: '技术分析和动手能力',
    ENFP: '创意连接和热情感染力', INFP: '深度共情和创意表达',
    ESFP: '现场感染力和适应力', ISFP: '审美感知和细腻表达',
    ENTP: '创新思维和辩论能力', INTP: '分析逻辑和系统思维',
  };
  return strengths[type] || '独特的认知方式';
}

function getSaturnLesson(saturn) {
  const sign = saturn.sign;
  const house = saturn.house;

  const signLessons = {
    Aries: '学会耐心，不要急于看到结果', Taurus: '放下对安全感的过度执着',
    Gemini: '专注和深度比广泛涉猎更重要', Cancer: '建立情感安全感，学会保护自己的边界',
    Leo: '真正的自信来自内心，不需要外界认可', Virgo: '接受不完美，放过自己和他人',
    Libra: '在关系中找到平衡，不失去自我', Scorpio: '学会信任和放手，控制欲需要转化',
    Sagittarius: '将理想落到实际行动中', Capricorn: '在责任中找到意义，不只是完成任务',
    Aquarius: '在坚持独特性的同时保持情感连接', Pisces: '建立现实边界，避免过度牺牲和逃避',
  };

  return `${signLessons[sign] || '在相关领域培养自律和责任感'}（第${house}宫）`;
}

function getInferiorAdvice(func) {
  const advice = {
    Ni: '主动进行长期规划，每天花5分钟思考"五年后的我"。练习看清趋势和大局，不要只关注眼前。',
    Ne: '尝试头脑风暴，在安全的环境中大胆提出"如果……会怎样"。对新想法保持开放，不要急于否定。',
    Si: '建立简单的日常惯例，记录和回顾经验。学会从过去中提取智慧，而不是每次都从零开始。',
    Se: '有意识地关注当下的身体感受，尝试运动、手工、烹饪等需要感官投入的活动。活在当下。',
    Ti: '练习独立分析问题，在情感上退一步，用逻辑审视。每天找一个话题进行信息交叉验证。',
    Te: '建立简单的计划和清单，培养执行的纪律性。把一个想法落地，获得"完成"的成就感。',
    Fi: '问问自己的真实感受是什么，练习表达"我喜欢/我不喜欢"。了解自己的价值观边界。',
    Fe: '练习换位思考，观察他人的情绪信号。主动表达关心和感谢，培养社交意识。',
  };
  return advice[func] || '练习跳出舒适区，拓展这个功能的使用场景';
}

/**
 * 未来扩展：五者天赋 × MBTI × 星盘
 * - 预留接口，等五者天赋模块上线后对接
 */
export function getTripleCross(mbtiResult, planets, wuzheData) {
  if (!wuzheData) return { mbtiAstro: getMbtiAstroCross(mbtiResult, planets), wuzhe: null };

  // TODO: 五者天赋上线后实现
  return {
    mbtiAstro: getMbtiAstroCross(mbtiResult, planets),
    wuzhe: {
      crossInsight: '五者天赋 × MBTI × 星盘综合解读（待实现）',
      educationSynergy: '三系统教育路径深度分析（待实现）',
    },
  };
}
