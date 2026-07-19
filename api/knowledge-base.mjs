/**
 * 知识库提示词构建器
 * 将 Obsidian 星盘亲子教育知识库内容注入 DeepSeek prompt
 */

// ========== 水星12星座学习模式速查 ==========
const MERCURY_LEARNING = {
  '白羊座': { tier: '稳健基石型', keyword: '极速反应、竞争驱动', style: '抢答竞赛模式，短时高频突击，先给结论后实战', avoid: '拖沓节奏、压制表达' },
  '金牛座': { tier: '稳健基石型', keyword: '感官记忆、慢热深耕', style: '动手实践，感官刺激学习，重复巩固', avoid: '催促、节奏太快' },
  '双子座': { tier: '敏捷天赋型', keyword: '多线程、信息海绵', style: '多源信息输入，互动式学习，阅读演讲', avoid: '单一枯燥、限制探索' },
  '巨蟹座': { tier: '稳健基石型', keyword: '情感记忆、直觉吸纳', style: '情感连接学习，故事化内容，安全环境', avoid: '严厉批评、情感冷漠' },
  '狮子座': { tier: '独创潜能型', keyword: '舞台思维、创造力', style: '表演展示学习，荣誉驱动，给舞台和观众', avoid: '忽视、无人欣赏' },
  '处女座': { tier: '敏捷天赋型', keyword: '逻辑闭环、细节控', style: '错题本战术，精细计划，条理化系统学习', avoid: '杂乱无章、笼统模糊' },
  '天秤座': { tier: '稳健基石型', keyword: '平衡比较、伙伴交流', style: '合作学习，小组讨论，审美融入学习', avoid: '冲突环境、强迫站队' },
  '天蝎座': { tier: '稳健基石型', keyword: '深度挖掘、侦探思维', style: '深度研究型，揭秘式学习，专注单一领域深挖', avoid: '表面化学习、不真诚' },
  '射手座': { tier: '独创潜能型', keyword: '宏观图景、发散', style: '体验式学习，项目制，户外游学，意义驱动', avoid: '死记硬背、限制自由' },
  '摩羯座': { tier: '稳健基石型', keyword: '结构严谨、逻辑严密', style: '目标拆解，结构化学习，阶段性里程碑', avoid: '空泛理想、无计划' },
  '水瓶座': { tier: '敏捷天赋型', keyword: '独创思维、跳跃顿悟', style: '创新项目制，科技编程，反向教学', avoid: '从众要求、思维禁锢' },
  '双鱼座': { tier: '独创潜能型', keyword: '图像思维、直觉', style: '艺术创意学习，音乐绘画，沉浸式体验', avoid: '刻板标准、压抑想象' },
};

// ========== 月亮12星座情绪指南速查 ==========
const MOON_EMOTION = {
  '白羊座': { pattern: '直接、易怒、急躁', security: '快速回应、竞争胜利', soothe: '简短说明、快速解决冲突', mom: '行动力强、直接' },
  '金牛座': { pattern: '稳定、固执、缓慢', security: '物质保障、感官舒适', soothe: '好食物、拥抱、稳定环境', mom: '稳定、享受生活' },
  '双子座': { pattern: '多变、好奇、爱聊', security: '信息流通、新鲜感', soothe: '陪聊天、分享新鲜事', mom: '健谈、好奇心强' },
  '巨蟹座': { pattern: '敏感、怀旧、情绪化', security: '家庭温暖、情感回应', soothe: '温暖怀抱、情感接纳', mom: '情感充沛、恋家' },
  '狮子座': { pattern: '骄傲、戏剧化、热情', security: '被关注、被赞美', soothe: '大方赞美、给予舞台', mom: '光彩照人、有威望' },
  '处女座': { pattern: '焦虑、挑剔、完美', security: '秩序、细节可控', soothe: '实际行动帮助、条理清晰', mom: '严谨认真、服务型' },
  '天秤座': { pattern: '和谐、犹豫、社交', security: '关系和谐、环境优美', soothe: '温和沟通、美的环境', mom: '优雅得体' },
  '天蝎座': { pattern: '深刻、激烈、不轻易信任', security: '深层情感连接', soothe: '真诚、深度信任', mom: '掌控力强、有权谋' },
  '射手座': { pattern: '乐观、自由、粗心', security: '自由、意义感', soothe: '给空间、大方向引导', mom: '开朗有理想' },
  '摩羯座': { pattern: '压抑、负责、严肃', security: '成就、被认可', soothe: '认可努力、减轻压力', mom: '严格自律' },
  '水瓶座': { pattern: '理性、抽离、反叛', security: '独立、朋友', soothe: '尊重独处、理性沟通', mom: '独立有空间' },
  '双鱼座': { pattern: '梦幻、敏感、逃避', security: '温柔的爱、艺术氛围', soothe: '温柔引导、艺术表达', mom: '包容、爱满溢' },
};

// ========== 太阳12星座核心驱动力速查 ==========
const SUN_DRIVE = {
  '白羊座': '我要做第一！竞争型，需要挑战',
  '金牛座': '我要舒适稳定，需要时间适应',
  '双子座': '我要知道一切！好奇心驱动',
  '巨蟹座': '我要安全感，情感联结驱动',
  '狮子座': '我要被看见！荣誉驱动',
  '处女座': '我要完美，细节驱动',
  '天秤座': '我要和谐，社交驱动',
  '天蝎座': '我要真相，深度驱动',
  '射手座': '我要探索！理想驱动',
  '摩羯座': '我要成就，责任驱动',
  '水瓶座': '我要创新，独特驱动',
  '双鱼座': '我要融合，艺术驱动',
};

// ========== 上升12星座天赋面具速查 ==========
const RISING_MASK = {
  '白羊座': { impression: '直接、快速、好动', talent: '勇敢、果断、行动力', advice: '给他独立做事的机会' },
  '金牛座': { impression: '稳重、温和、慢', talent: '耐心、审美、感官力', advice: '不要催促、给他时间' },
  '双子座': { impression: '机灵、话多、好奇', talent: '沟通力、信息处理', advice: '多对话、多提供信息' },
  '巨蟹座': { impression: '害羞、温和、敏感', talent: '共情力、照顾他人', advice: '给足安全感、温暖环境' },
  '狮子座': { impression: '大方、自信、闪耀', talent: '领导力、舞台魅力', advice: '多赞美、给展示机会' },
  '处女座': { impression: '谦虚、细致、整洁', talent: '分析力、服务精神', advice: '给具体任务、少批评' },
  '天秤座': { impression: '优雅、社交、和善', talent: '社交力、审美品味', advice: '营造美的环境、合作学习' },
  '天蝎座': { impression: '冷静、深邃、神秘', talent: '洞察力、专注力', advice: '尊重隐私、真诚相待' },
  '射手座': { impression: '开朗、大方、爱玩', talent: '乐观、哲思、冒险', advice: '给自由、不要束缚' },
  '摩羯座': { impression: '成熟、稳重、谨慎', talent: '管理力、责任心', advice: '给予信任、不要过度施压' },
  '水瓶座': { impression: '独特、理性、抽离', talent: '创新力、客观分析', advice: '尊重独特性、不要强求合群' },
  '双鱼座': { impression: '温柔、梦幻、艺术', talent: '想象力、同理心', advice: '温柔引导、保护创造力' },
};

// ========== 五者天赋模型 ==========
const FIVE_TALENTS = {
  '思者（木）': {品德:'仁',脑优势:'右脑最发达（直觉与反应型）',特征:'脑子转得快但懒，总想找捷径',策略:'给挑战性任务激发兴趣，用巧学代替苦学'},
  '赢者（火）': {品德:'礼',脑优势:'右脑发达（情绪与感受驱动型）',特征:'好面子，为维护形象爆发力极强',策略:'用荣誉感驱动，公开表扬效果极佳'},
  '德者（土）': {品德:'信',脑优势:'左脑最发达（秩序与执行型，节奏慢）',特征:'慢吞吞，反应弧长，需要复读机式教育',策略:'全靠家长管——盯行为，坐住板凳、写完作业'},
  '行者（金）': {品德:'义',脑优势:'左脑发达（逻辑与记忆型）',特征:'记忆力极佳，入脑慢但记得极牢',策略:'找到真正感兴趣的领域，深入钻研'},
  '学者（水）': {品德:'智',脑优势:'左右脑平衡（全脑优势型）',特征:'专注力是核心优势，典型的别人家的孩子',策略:'放养，基本不用管，具备极强自驱力'},
};

// ========== 教育路径6种组合 ==========
const EDU_PATHS = [
  { id: 'A', name: '快乐精英路', budget:'高产富裕', profile:'孩子坐不住/有艺术脑', path:'国际学校(IB/美高)->艺术/传媒/人文留学->继承家业/独立工作室', focus:'顶级作品集辅导、马术/高尔夫/看展（砸审美和圈层）', chartRef:'水星双鱼/狮子/射手活跃，5宫/12宫强' },
  { id: 'B', name: '体制内硬核路', budget:'工薪家庭', profile:'孩子逻辑好/能吃苦', path:'公立重点高中->强基计划(理工科)->985/211->考公/进国企', focus:'弱势学科精准补差、高质量刷题资料、营养保障', chartRef:'水星处女/摩羯，土星强，3宫/9宫有吉星' },
  { id: 'C', name: '技能生存路', budget:'低预算', profile:'孩子厌学/动手能力强', path:'优质职高/中专(选风口：汽修/护理/精密加工)->3+2大专->专升本->高级技工', focus:'考职业资格证、拜师学艺、实操设备', chartRef:'火星/土象强，2宫有务实天赋，厌恶传统教育模式' },
  { id: 'D', name: '稳健保本路', budget:'中产家庭', profile:'孩子资质平平/乖巧', path:'公立高中->省属一本/二本(优选专业>学校)->考研/考公/考编', focus:'志愿填报咨询(选考公专业)、大学期间考公培训费', chartRef:'月亮金牛/天秤，稳定性强，没有强烈冒险倾向' },
  { id: 'E', name: '弯道超车路', budget:'中产/小康', profile:'孩子偏科严重', path:'体制内高中->中外合作办学(西浦/宁诺/2+2)->海外一年制硕士(刷名校)', focus:'雅思/托福培训(越早越好)、硕士留学基金', chartRef:'9宫强（有留学运），水星突出（语言天赋），木星有相位' },
  { id: 'F', name: '全球领袖路', budget:'高产富裕', profile:'孩子全能学霸', path:'顶尖公立国际部/美高->爬藤/牛剑G5->顶级投行/咨询/科研', focus:'背景提升(夏校/竞赛)、顶级升学顾问、全球化社交网络', chartRef:'太阳/水星强，9宫+10宫吉星云集，木星有和谐相位' },
];

// ========== 家庭经济ROI矩阵 ==========
const BUDGET_TIERS = {
  '自由级（200w+）': { strategy: '买上限·资源堆砌', detail: '全地图解锁 — 藤校/牛剑冲刺、纯艺术/体育烧钱路、家族接班/创业', risk: '纨绔风险：容易养出花钱如流水但无生存能力的"巨婴"' },
  '中产级（50w-100w）': { strategy: '买概率·弯道超车', detail: '中外合办(2+2/4+0)、硕士单阶段留学、艺考/小语种捷径', risk: '滑落风险：若规划失误，阶层感会有明显跌落' },
  '工薪级（10w-20w）': { strategy: '买稳健·保本经营', detail: '体制内死磕高考、警校/公费师范生、考公/考编', risk: '沉没风险：一旦选错专业或沉迷游戏，翻身极难' },
  '生存级（5w以内）': { strategy: '买生存·实用主义', detail: '职高/中专(学手艺)、3+2贯通大专、极早期就业', risk: '切忌"穷家富养"死磕高学历，容易致贫且毕业即失业' },
};

// ========== 成绩等级解锁表 ==========
const GRADE_TIERS = {
  '王者（SSR）': { desc: '省市排名Top 1%、极度自律/逻辑强', unlock: '🌍 全球通 — 清北复交、国际藤校/G5、顶尖实验室', career: '制定规则的人 — 科学家、行业领袖' },
  '钻石（SR）': { desc: '单科极强、211/一本线以上、有一技之长', unlock: '🏢 专业区 — 985/211热门专业、港新/澳洲名校', career: '中产精英 — 大厂骨干、医生、律师' },
  '黄金（R）': { desc: '成绩中等、二本/大专徘徊、听话但没天赋', unlock: '🏛️ 维稳区 — 本地公立大学、考公/考编/国企', career: '社会基石 — 公务员、教师、普通职员' },
  '青铜（N）': { desc: '坐不住听不懂、经常不及格、沉迷玩乐', unlock: '🔧 实战区 — 职业技术学院、物流/餐饮/销售、自媒体', career: '蓝领/自由职业 — 高级技工、个体户老板' },
};

// ========== 行星主宰关系（用于互溶接纳分析） ==========
const SIGN_RULERS = {
  '白羊座': ['mars', 'pluto'],
  '金牛座': ['venus'],
  '双子座': ['mercury'],
  '巨蟹座': ['moon'],
  '狮子座': ['sun'],
  '处女座': ['mercury'],
  '天秤座': ['venus'],
  '天蝎座': ['pluto', 'mars'],
  '射手座': ['jupiter'],
  '摩羯座': ['saturn'],
  '水瓶座': ['saturn', 'uranus'],
  '双鱼座': ['jupiter', 'neptune'],
};
const PLANET_SIGN_RULERS = { mars:'白羊座', venus:'金牛座', mercury:'双子座', moon:'巨蟹座', sun:'狮子座', pluto:'天蝎座', jupiter:'射手座', saturn:'摩羯座', uranus:'水瓶座', neptune:'双鱼座' };
const PLANETS_CN = { sun:'太阳', moon:'月亮', mercury:'水星', venus:'金星', mars:'火星', jupiter:'木星', saturn:'土星', uranus:'天王星', neptune:'海王星', pluto:'冥王星' };

function analyzeMutualReception(planets, houses) {
  // 分析1宫和2宫的互溶接纳关系
  const house1Sign = houses.find(h => h.house === 1)?.sign;
  const house2Sign = houses.find(h => h.house === 2)?.sign;
  if (!house1Sign || !house2Sign) return { desc: '宫位数据不足，无法分析互溶接纳' };

  const results = [];
  // 1宫主星
  const ruler1 = SIGN_RULERS[house1Sign] || [];
  // 2宫主星
  const ruler2 = SIGN_RULERS[house2Sign] || [];

  const ruler1Planets = ruler1.filter(k => planets[k]).map(k => ({ key: k, ...planets[k] }));
  const ruler2Planets = ruler2.filter(k => planets[k]).map(k => ({ key: k, ...planets[k] }));

  // 1宫主星落在哪个宫位
  ruler1Planets.forEach(p => {
    results.push(`1宫（${house1Sign}）的先天主星${PLANETS_CN[p.key]||p.key}落在了${p.house}宫${p.sign}，说明${p.house}宫所代表的领域会对孩子的人生产生重要影响`);

    // 互溶检查：1宫主星所在的星座，是否被另一颗落在1宫主星所管辖的星座的行星管辖
    for (const [otherKey, other] of Object.entries(planets)) {
      if (otherKey === p.key) continue;
      const otherRulers = SIGN_RULERS[p.sign] || [];
      if (otherRulers.includes(otherKey)) {
        // otherKey 是 p 所在星座的主星 → otherKey 接纳 p
        const otherRuledSign = PLANET_SIGN_RULERS[otherKey];
        const pRulers = SIGN_RULERS[otherRuledSign] || [];
        if (pRulers.includes(p.key)) {
          // 互溶：p在otherKey管辖的星座，otherKey在p管辖的星座
          results.push(`  → ${PLANETS_CN[p.key]||p.key}与${PLANETS_CN[otherKey]||otherKey}形成互溶关系：${PLANETS_CN[p.key]||p.key}在${otherRuledSign}（${PLANETS_CN[otherKey]||otherKey}管辖），${PLANETS_CN[otherKey]||otherKey}在${PLANET_SIGN_RULERS[p.key]}（${PLANETS_CN[p.key]||p.key}管辖）。这种互溶格局会增强这两个领域的联动，对孩子的天赋发展和教育规划有重要参考价值`);
        } else {
          results.push(`  → ${PLANETS_CN[otherKey]||otherKey}接纳${PLANETS_CN[p.key]||p.key}（${PLANETS_CN[otherKey]||otherKey}是${p.sign}的主星），但没有形成互溶`);
        }
      }
    }
  });

  // 2宫主星分析
  ruler2Planets.forEach(p => {
    results.push(`2宫（${house2Sign}）的先天主星${PLANETS_CN[p.key]||p.key}落在了${p.house}宫${p.sign}，说明家庭经济与${p.house}宫代表的领域密切相关`);

    for (const [otherKey, other] of Object.entries(planets)) {
      if (otherKey === p.key) continue;
      const otherRulers = SIGN_RULERS[p.sign] || [];
      if (otherRulers.includes(otherKey)) {
        const otherRuledSign = PLANET_SIGN_RULERS[otherKey];
        const pRulers = SIGN_RULERS[otherRuledSign] || [];
        if (pRulers.includes(p.key)) {
          results.push(`  → ${PLANETS_CN[p.key]||p.key}与${PLANETS_CN[otherKey]||otherKey}形成互溶关系，进一步强化了${p.house}宫与家庭经济的关联`);
        }
      }
    }
  });

  return { desc: '', details: results };
}

// ========== 张雪峰式选专业建议 ==========
const MAJOR_ADVICE = {
  '体制内铁饭碗': { majors: '临床医学(5+3)、口腔医学、眼视光、法学(五院四系)、汉语言文学(师范)、公费师范生、警校提前批',适合:'家庭工薪/生存级、成绩至少一本线、性格稳重',风险:'分不够高容易调剂到天坑专业，法学考不出A证等于没学'},
  '大厂技术岗': { majors: '计算机科学、软件工程、人工智能、电子信息、通信工程、自动化',适合:'家庭中产以下、成绩985/211水平、逻辑强、能996',风险:'35岁危机、更新迭代快需要终身学习'},
  '铁饭碗技术岗': { majors: '电气工程(国家电网)、能源与动力、轨道交通、水利水电、临床药学',适合:'家庭工薪级、求稳、成绩一本线以上',风险:'行业天花板明显'},
  '文科出路': { majors: '会计学(考CPA)、财务管理、审计学、税收学、法学(考公方向)、汉语言(考公)、护理学',适合:'文科强、家庭预算有限、求稳定',风险:'文科就业整体不如理工科，必须有证书傍身'},
  '艺术传媒': { majors: '数字媒体、视觉传达、播音主持、影视编导、游戏设计',适合:'艺术天赋明显、家庭中产以上能烧钱、5宫/12宫强',风险:'就业面窄，需要家庭资源支撑'},
  '弯道超车': { majors: '中外合作办学(2+2)、小语种(西语/德语/日语)、留学镀金硕士',适合:'偏科严重但家境尚可、9宫强有留学运',风险:'性价比逐年下降，海归光环变淡'},
  '实用技能': { majors: '新能源技术、智能制造、护理学、康复治疗、宠物医疗、无人机应用',适合:'动手能力强、厌学传统模式、火星/土象强',风险:'社会地位不高但收入不错'},
};

const KEY_MAJOR_PRINCIPLES = [
  '家里有钱有资源的：兴趣优先，学什么都能兜底',
  '工薪家庭/普通家庭：实用优先，选能吃饭的手艺',
  '穷人家的孩子：别追梦，学硬核技术，先吃饱饭再说',
  '成绩好的：学校层次 > 专业名气，985的名头能吃一辈子',
  '成绩一般的：专业 > 学校，选一个有壁垒的专业（别人干不了的）',
  '文科生：尽量考公考编，或者学会计/法学有证书护体',
  '理科生：计算机/电气/医学三大护城河',
  '不管选什么，城市很重要——大城市实习机会多一个数量级',
];

// ========== 关键宫位教育含义（详尽版） ==========
const HOUSE_EDU = {
  2: { title: '天赋技能与经济基础', key: '天赋方向与家庭经济支持度', detail: '宫头星座揭示孩子的天赋技能与职业倾向，宫内行星反映家庭经济条件与金钱价值观。吉星（木/金）在2宫 → 家庭经济条件较好；凶星（土/冥）→ 需注意经济压力或过度节俭。互溶接纳代表小康家庭，衣食无忧。' },
  3: { title: '基础教育（小初）', key: '早期学习特点与沟通表达', detail: '代表小学初中阶段的基础教育。状态好（吉星/和谐相位）→ 基础教育顺利；有挑战（土星/冥王/四分对冲）→ 小学初中可能遇到困难，需要额外辅导。3宫互溶接纳好 → 小初高阶段父母重视，学业较顺利。' },
  4: { title: '原生家庭与父亲', key: '家庭氛围与安全感根基', detail: '宫头星座揭示原生家庭氛围，4宫也代表父亲的影响。状态好 → 父亲支持有力、家庭根基稳固。有挑战相位 → 父爱有缺失或父亲关系需调和的议题。宫内行星影响重大：月亮在4宫 → 极度恋家；土星在4宫 → 家庭责任重、可能早熟。' },
  5: { title: '创造力与兴趣', key: '兴趣爱好与创造力表达', detail: '宫头星座决定孩子的创造力表现和兴趣倾向。行星落入5宫 → 该领域会通过创意方式表达。5宫状态也反映孩子未来如何对待自己的孩子。' },
  9: { title: '高等教育与哲学', key: '是否适合深造与留学', detail: '宫头星座揭示高等教育特点。9宫吉星（木/金）→ 高等教育顺利、有留学机会。9宫凶星（土/冥）→ 深造可能遇阻。9宫行星多 → 对知识有强烈渴求，适合学术路线。与3宫对比：3宫是基础教育（小学～高中），9宫是高等教育（大学～终身）。' },
  10: { title: '母亲与社会成就', key: '母亲教育方式与未来职业方向', detail: '10宫是星盘最高点，宫头星座揭示母亲特质和社会成就方向。代表孩子在社会中想成为什么样的人，以及母亲的教育方式对孩子的影响。4宫是父亲（向下扎根），10宫是母亲（向上生长）。' },
  11: { title: '贵人社交与理想', key: '社交能力与贵人运', detail: '宫头星座揭示社交风格和贵人特征。11宫强的孩子（多行星落入）→ 适合团队学习、小组合作。有挑战相位 → 需要引导社交技巧。木星/金星在11宫 → 贵人运极强。' },
};

/**
 * 构建 DeepSeek 调用所需的 system prompt
 */
export function buildSystemPrompt() {
  return `你是一位「教育规划×亲子心理」实战专家。你的风格融合了张雪峰的犀利直白和心理咨询师的细腻洞察。

你的核心任务：**用星盘作为认知框架，帮家长看懂孩子的学习特点和心理需求，给出可落地的教育规划和养育建议。**

【内容优先级（从高到低）】
1. **教育规划（张雪峰风格）** — 学情分析、升学路径、选科建议、专业方向。要具体、要直白、要说人话。不要"培养综合素质"这种空话，要说"这个配置的孩子适合走理工路线，数学是命门，暑假必须把函数部分补上来"
2. **心理画像与亲子关系** — 孩子的情绪模式、安全感来源、心理需求。以及家长应该如何回应、如何沟通、如何建立健康的亲子关系。要有洞察力，让家长觉得"说的就是我孩子"
3. **家庭教育指南** — 基于星盘4宫（原生家庭）和10宫（母亲/成就）的状态，给家长具体的养育建议。父亲角色怎么发挥？母亲怎么调整教育方式？家庭氛围怎么优化？
4. **天赋与学习策略** — 水星学习模式、五者天赋类型、以及对应的提分策略

【分析风格要求】
- 犀利直白不绕弯：直接说问题，不要铺垫
- 张雪峰式金句：该扎心就扎心，一针见血
- 有温度的心理洞察：扎心之后要给理解和解决方案
- 举具体场景的例子：不要说"孩子需要激励"，要说"孩子比赛输了会暴怒摔东西，这时候你说'没关系'没用，你要说'我知道你现在很生气，因为你觉得不公平，来我们一起看看哪里可以做得更好'"
- 落地可执行：每条建议都要是家长明天就能做的事

【注意】
- 少用玄学术语堆砌，把星盘语言"翻译"成日常场景
- 刑冲相位（四分相/对分相）重点解读为家庭关系中的真实冲突
- 宫位解读聚焦教育含义，不要讲命运、财运等无关内容
- 保持概率性表述，星盘提示倾向而非定论

每次回复严格输出 JSON 格式。相同星盘每次输出保持一致。`;
}

/**
 * 构建包含知识库参考的 user prompt
 */
export function buildChartPrompt(chartData, name, version) {
  const chart = chartData.basic || chartData;
  const planets = chart.planets || {};
  const houses = chart.houses || [];
  const aspects = chart.aspects || [];

  const sunSign = planets.sun?.sign || '未知';
  const moonSign = planets.moon?.sign || '未知';
  const mercurySign = planets.mercury?.sign || '未知';
  const risingSign = planets.rising?.sign || '未知';
  const venusSign = planets.venus?.sign || '未知';
  const marsSign = planets.mars?.sign || '未知';

  const house2 = houses.find(h => h.house === 2);
  const house3 = houses.find(h => h.house === 3);
  const house4 = houses.find(h => h.house === 4);
  const house5 = houses.find(h => h.house === 5);
  const house9 = houses.find(h => h.house === 9);
  const house10 = houses.find(h => h.house === 10);

  const mercuryAspects = aspects.filter(a => a.planet1En === 'mercury' || a.planet2En === 'mercury');
  const moonAspects = aspects.filter(a => a.planet1En === 'moon' || a.planet2En === 'moon');

  const mk = MERCURY_LEARNING[mercurySign] || {};
  const me = MOON_EMOTION[moonSign] || {};
  const sd = SUN_DRIVE[sunSign] || '';
  const rm = RISING_MASK[risingSign] || {};

  const occupiedHouses = [];
  Object.entries(planets).forEach(([key, val]) => {
    if (key !== 'rising' && key !== 'mc' && val.house) {
      occupiedHouses.push({ planet: key, house: val.house, sign: val.sign });
    }
  });

  // 测试期间全量使用深度版 prompt
  const isDeep = true;

  // 分析：挑战相位 vs 和谐相位
  const challengeAspects = aspects.filter(a => a.type === '四分相' || a.type === '对分相');
  const harmonyAspects = aspects.filter(a => a.type === '三分相' || a.type === '六分相');

  // 分析：四角宫（1/4/7/10）行星分布
  const angularHouses = [1, 4, 7, 10];
  const angularPlanets = occupiedHouses.filter(p => angularHouses.includes(p.house));

  // 分析：关键宫位是否空宫
  const keyHouses = [2, 3, 4, 5, 9, 10, 11];
  const occupiedHouseNums = new Set(occupiedHouses.map(p => p.house));
  const emptyKeyHouses = keyHouses.filter(h => !occupiedHouseNums.has(h));

  // 分析：水星和月亮的相位类型
  const mercuryChallenge = mercuryAspects.filter(a => a.type === '四分相' || a.type === '对分相');
  const moonChallenge = moonAspects.filter(a => a.type === '四分相' || a.type === '对分相');

  // 分析：金星木星所在宫位（吉星指向天赋和好运领域）
  const venusHouseNum = planets.venus?.house || null;
  const jupiterHouseNum = planets.jupiter?.house || null;
  const beneficHouses = [];
  if (venusHouseNum) beneficHouses.push({ planet: '金星', house: venusHouseNum, sign: planets.venus.sign });
  if (jupiterHouseNum) beneficHouses.push({ planet: '木星', house: jupiterHouseNum, sign: planets.jupiter.sign });

  // 分析：群星聚集宫位（3颗以上行星在同一宫）
  const houseCounts = {};
  occupiedHouses.forEach(p => { houseCounts[p.house] = (houseCounts[p.house] || 0) + 1; });
  const stelliumHouses = Object.entries(houseCounts).filter(([h, c]) => c >= 2).map(([h, c]) => ({ house: parseInt(h), count: c })).sort((a, b) => b.count - a.count);

  // 分析：和谐相位涉及的宫位
  const harmonyHousePairs = [];
  harmonyAspects.forEach(a => {
    const p1 = occupiedHouses.find(p => p.planet === a.planet1En);
    const p2 = occupiedHouses.find(p => p.planet === a.planet2En);
    if (p1 && p2) harmonyHousePairs.push({ planets: a.planet1 + '-' + a.planet2, houses: p1.house + '宫-' + p2.house + '宫', type: a.type });
  });

  const prompt = `请为 ${name || '宝贝'} 生成一份亲子星盘解读报告。

【星盘数据】
- 太阳：${sunSign} | 月亮：${moonSign} | 水星：${mercurySign}
- 上升：${risingSign} | 金星：${venusSign} | 火星：${marsSign}
- 2宫头星座：${house2?.sign || '未知'}
- 3宫头星座：${house3?.sign || '未知'}
- 4宫头星座：${house4?.sign || '未知'}
- 5宫头星座：${house5?.sign || '未知'}
- 9宫头星座：${house9?.sign || '未知'}
- 10宫头星座：${house10?.sign || '未知'}
- 各宫头星座：${houses.map(h => h.house + '宫' + h.sign).join('、')}
- 相位：${aspects.map(a => a.planet1 + a.symbol + a.planet2 + '(' + a.type + ')').join('、') || '无显著相位'}
- 行星分布：${occupiedHouses.map(p => p.planet + '在' + p.house + '宫' + p.sign).join('、')}

【星盘深层分析】
- 挑战相位（刑冲）：${challengeAspects.map(a => a.planet1 + '-' + a.planet2 + '(' + a.type + ')').join('、') || '无'}
- 和谐相位（三合六合）：${harmonyAspects.map(a => a.planet1 + '-' + a.planet2 + '(' + a.type + ')').join('、') || '无'}
- 四角宫（1/4/7/10宫）有行星的：${angularPlanets.map(p => p.planet + '在' + p.house + '宫').join('、') || '无'}
- 空宫的关键领域（2/3/4/5/9/10/11宫）：${emptyKeyHouses.map(h => h + '宫').join('、') || '无'}
- 水星${mercuryChallenge.length ? '有' + mercuryChallenge.length + '个挑战相位' : '无挑战相位'}
- 月亮${moonChallenge.length ? '有' + moonChallenge.length + '个挑战相位' : '无挑战相位'}
- 2宫主星（${house2?.sign ? SIGN_RULERS[house2.sign]?.join('、') || '未知' : '未知'}）的相位情况：${house2?.sign ? (() => { const rulers = SIGN_RULERS[house2.sign] || []; const aspects2 = challengeAspects.filter(a => rulers.includes(a.planet1En) || rulers.includes(a.planet2En)); return aspects2.length ? aspects2.map(a => a.planet1 + '-' + a.planet2 + '(' + a.type + ')').join('、') : '无明显刑冲相位'; })() : '未知'}
- 4宫主星（${house4?.sign ? SIGN_RULERS[house4.sign]?.join('、') || '未知' : '未知'}）的相位情况：${house4?.sign ? (() => { const rulers = SIGN_RULERS[house4.sign] || []; const aspects4 = challengeAspects.filter(a => rulers.includes(a.planet1En) || rulers.includes(a.planet2En)); return aspects4.length ? aspects4.map(a => a.planet1 + '-' + a.planet2 + '(' + a.type + ')').join('、') : '无明显刑冲相位'; })() : '未知'}
- 10宫主星（${house10?.sign ? SIGN_RULERS[house10.sign]?.join('、') || '未知' : '未知'}）的相位情况：${house10?.sign ? (() => { const rulers = SIGN_RULERS[house10.sign] || []; const aspects10 = challengeAspects.filter(a => rulers.includes(a.planet1En) || rulers.includes(a.planet2En)); return aspects10.length ? aspects10.map(a => a.planet1 + '-' + a.planet2 + '(' + a.type + ')').join('、') : '无明显刑冲相位'; })() : '未知'}
- 金星在${venusHouseNum ? venusHouseNum + '宫' + planets.venus.sign : '未知'}，木星在${jupiterHouseNum ? jupiterHouseNum + '宫' + planets.jupiter.sign : '未知'}（吉星所在宫位代表天赋和好运的领域）
- 群星聚集宫位（2颗以上行星）：${stelliumHouses.length ? stelliumHouses.map(s => s.house + '宫(' + s.count + '颗)').join('、') : '无明显聚集'}
- 和谐相位（三合/六合）涉及的宫位配对：${harmonyHousePairs.length ? harmonyHousePairs.map(p => p.planets + '(' + p.houses + ',' + p.type + ')').join('、') : '无'}

【知识库参考 — 水星学习法】
水星${mercurySign}：${mk.tier || ''}，核心词：${mk.keyword || ''}
学习策略：${mk.style || ''}
避雷：${mk.avoid || ''}

【知识库参考 — 月亮情绪指南】
月亮${moonSign}：${me.pattern || ''}
安全感来源：${me.security || ''}
安抚方式：${me.soothe || ''}
母亲形象：${me.mom || ''}

【知识库参考 — 太阳驱动力】
太阳${sunSign}：${sd}

【知识库参考 — 上升天赋面具】
上升${risingSign}：${rm.impression || ''}，天赋：${rm.talent || ''}，建议：${rm.advice || ''}

【知识库参考 — 五者天赋模型】
${Object.entries(FIVE_TALENTS).map(([k, v]) => '- ' + k + '：' + v.特征 + ' -> 策略：' + v.策略).join('\n')}

${isDeep ? '【知识库参考 — 教育路径】\n' + EDU_PATHS.map(p => '- 路径' + p.id + '(' + p.name + ')：预算' + p.budget + '，适合' + p.profile + '，路径：' + p.path + '，重点：' + (p.focus || '') + '，星盘参考：' + (p.chartRef || '')).join('\n') + '\n' : ''}

【知识库参考 — 家庭预算等级（家长视角）】
${Object.entries(BUDGET_TIERS).map(([k, v]) => '- ' + k + '：' + v.strategy + ' — ' + v.detail + '。风险：' + v.risk).join('\n')}

【知识库参考 — 成绩等级解锁表（孩子视角）】
${Object.entries(GRADE_TIERS).map(([k, v]) => '- ' + k + '：' + v.desc + ' | 已解锁：' + v.unlock + ' | 未来职业：' + v.career).join('\n')}

【关键宫位解读参考】
${Object.entries(HOUSE_EDU).map(([k, v]) => '- ' + k + '宫(' + v.title + ')：' + v.key).join('\n')}

【知识库参考 — 张雪峰式选专业建议】
${Object.entries(MAJOR_ADVICE).map(([k, v]) => '- ' + k + '：推荐专业' + v.majors + '｜适合' + v.适合 + '｜风险' + v.风险).join('\n')}

选专业核心原则：
${KEY_MAJOR_PRINCIPLES.map(p => '- ' + p).join('\n')}

【互溶接纳分析 — 1宫与2宫】
${(() => {
  const mr = analyzeMutualReception(planets, houses);
  return mr.details.length ? mr.details.join('\n') : '暂无明显的互溶接纳关系，说明1宫和2宫的能量比较独立，没有与其他宫位形成特别强的联动';
})()}

【水星相位参考】
${mercuryAspects.length ? mercuryAspects.map(a => a.planet1 + '与' + a.planet2 + a.type + '（容许度' + a.orb + '°）').join('、') : '水星无明显相位'}

【月亮相位参考】
${moonAspects.length ? moonAspects.map(a => a.planet1 + '与' + a.planet2 + a.type + '（容许度' + a.orb + '°）').join('、') : '月亮无明显相位'}

【专业选择建议的分析逻辑（重要）】
在生成 "major"（专业选择建议）section 时，请遵循以下分析逻辑：
第一步：优先使用【互溶接纳分析 — 1宫与2宫】的数据——互溶接纳能量最高的宫位对应的领域，就是对孩子最有前途的赛道和行业方向。
第二步：如果1宫2宫没有互溶也没有接纳关系，则参考以下数据：
  - 金星和木星所在的宫位（吉星指向天赋和好运的领域）
  - 和谐相位（三合/六合）涉及的宫位配对
  - 群星聚集最多的宫位（能量最集中的领域）
第三步：结合以上星盘分析结果，再匹配【知识库参考 — 张雪峰式选专业建议】中的数据，给出具体专业名称和方向。

请生成以下 JSON 格式的报告（严格按照此结构，不要添加 JSON 之外的文字，字段名用英文）。
注意：houses 数组必须包含全部12个宫位，每个宫位给出对应星座和教育解读；aspects 数组列出所有显著相位。

${isDeep ? getDeepPrompt(sunSign, moonSign, risingSign, mercurySign) : getFreePrompt(sunSign, moonSign, risingSign, mercurySign)}`;

  return prompt;
}

function getFreePrompt(sunSign, moonSign, risingSign, mercurySign) {
  return `{
  "chartSummary": { "sun": "太阳${sunSign}", "moon": "月亮${moonSign}", "rising": "上升${risingSign}" },
  "sections": [
    {
      "id": "sun", "title": "☀️ 太阳${sunSign} — 核心自我",
      "content": { "child": "孩子的性格底色（60字内，说人话）", "parent": "给家长的教育建议（40字内）", "edu": "学习引导策略（40字内）", "strength": "天生优势", "challenge": "成长挑战" }
    },
    {
      "id": "moon", "title": "🌙 月亮${moonSign} — 情绪安全感",
      "content": { "child": "情绪特征描述（60字内）", "parent": "家长回应方式（50字内）", "need": "情感需求" }
    },
    {
      "id": "rising", "title": "✨ 上升${risingSign} — 社交气质",
      "content": { "desc": "给人的印象", "appearance": "社交优势", "social": "需要注意的社交点" }
    },
    {
      "id": "mercury", "title": "📚 水星${mercurySign} — 学习模式",
      "content": { "tier": "思维类型", "style": "最佳学习方式（60字内，举具体场景）", "strategy": "提分方法（40字内）", "avoid": "雷区（20字内）" }
    },
    {
      "id": "psychology", "title": "💖 心理画像与亲子关系",
      "content": {
        "inner_world": "孩子的内心世界解读（60字内）",
        "parent_child_dynamics": "亲子关系建议（60字内）",
        "communication_formula": "沟通黄金法则（40字内）"
      }
    },
    {
      "id": "edu_plan", "title": "🎯 教育规划建议",
      "content": {
        "family_economics": "教育预算视角分析（60字内）",
        "study_path_recommendation": "推荐的升学路径方向（60字内）",
        "major_direction": "未来适合的专业方向（40字内）"
      }
    },
    {
      "id": "parenting", "title": "👨‍👩‍👧 家庭教育小贴士",
      "content": { "atmosphere": "家庭氛围建议（40字内）", "father": "父亲角色", "mother": "母亲角色", "action_tips": "一个明天就能做的行动" }
    },
    {
      "id": "talent", "title": "🧠 天赋画像",
      "content": { "type": "天赋类型（概率性表述）", "description": "核心特征", "parenting_strategy": "教育策略一句话" }
    },
    {
      "id": "summary", "title": "📋 总结",
      "content": { "core_issues": "最值得关注的点（60字内）", "key_advice": "一句核心建议" }
    }
  ],
  "footer": "引导加微信的文案"
}`;
}function getDeepPrompt(sunSign, moonSign, risingSign, mercurySign) {
  return `{
  "chartSummary": { "sun": "太阳${sunSign}", "moon": "月亮${moonSign}", "rising": "上升${risingSign}" },
  "sections": [
    {
      "id": "sun", "title": "☀️ 太阳${sunSign} — 核心自我",
      "content": {
        "child": "孩子的性格底色：结合太阳星座描述核心性格，不要罗列星座特征，要写这个孩子在实际生活中的样子（如：太阳狮子座的孩子在班里会不自觉地成为焦点，不是因为他想当领导，而是他本能地需要被看见）。80字内",
        "parent": "给家长的教育定位建议：基于太阳星座，指出家长应该扮演什么角色——教练？观众？后盾？60字内",
        "edu": "学习特点与引导策略：太阳星座在学习上的具体表现，以及家长该如何因势利导。60字内",
        "strength": "一个最突出的天生优势（20字）",
        "challenge": "一个最需要关注的成长挑战（20字）"
      }
    },
    {
      "id": "moon", "title": "🌙 月亮${moonSign} — 情绪安全感",
      "content": {
        "child": "孩子的情绪特征与内心需求：他真正需要什么才能感到安全？不要只说'需要安全感'，要说具体场景。80字内",
        "parent": "家长的回应策略：当孩子情绪波动时，你具体应该怎么做。不要抽象的'多关心他'，要说'他生气的时候你先闭嘴等5分钟，然后问他要不要聊聊'。80字内",
        "parenting_style": "月亮星座揭示的'理想母亲形象'：你目前的养育方式跟他的需求匹配吗？如果不匹配，最大的差距在哪里？60字内",
        "need": "一句话总结他内心最核心的情感需求（20字内）"
      }
    },
    {
      "id": "rising", "title": "✨ 上升${risingSign} — 社交气质",
      "content": {
        "desc": "给人的第一印象和社交风格。50字内",
        "social_strength": "社交中的优势是什么？30字内",
        "social_weakness": "社交中可能遇到的困难。30字内",
        "parent_guide": "家长如何帮助他发展社交能力。40字内"
      }
    },
    {
      "id": "mercury", "title": "📚 水星${mercurySign} — 学习模式与提分策略",
      "content": {
        "tier": "思维类型标签（如：敏捷天赋型/稳健基石型等）",
        "learning_style": "最佳学习方式：用具体场景描述孩子怎么学最有效。比如'他需要先看整体框架再学细节，你直接让他背公式他会崩溃，但你先画一张知识树他就通了'。80字内",
        "boost_strategy": "提分必杀技：具体的学习方法建议，明天就能用。60字内",
        "subject_advice": "根据水星星座特点，给出优势科目方向和弱势科目突破建议。60字内",
        "avoid": "家长最容易踩的雷区：什么做法会适得其反。40字内"
      }
    },
    {
      "id": "psychology",
      "title": "💖 心理画像与亲子关系",
      "content": {
        "personality_type": "综合太阳+月亮+上升的心理气质类型概括。30字内",
        "inner_world": "孩子的内心世界深度解读：他最在意什么、最怕什么、什么情况下会封闭自己。结合月亮和4宫状态分析。100字内",
        "parent_child_dynamics": "亲子关系诊断：基于4宫（原生家庭/父亲）和10宫（母亲/成就）的星象，指出家庭互动中最核心的动态。比如'妈妈要求高（10宫摩羯），爸爸不管事（4宫空宫），孩子夹在中间用叛逆来抗议'。要犀利，直击要害。100字内",
        "attachment_style": "依恋类型分析：安全感型/焦虑型/回避型/混乱型。基于月亮星座、月亮相位和4宫状态判断。给出具体表现和形成原因。60字内",
        "emotional_trigger": "什么情况下孩子最容易情绪崩溃？家长如何识别这些信号？60字内",
        "communication_formula": "【关键】跟这个孩子沟通的"黄金公式"：具体的话术和沟通方式。比如'对月亮双子的孩子：不要讲大道理，用提问代替说教。不要说"你应该好好学习"，要说"你觉得数学最难的是哪个部分？"'.80字内"
      }
    },
    {
      "id": "edu_plan",
      "title": "🎯 升学规划与专业方向（张雪峰风格）",
      "content": {
        "family_economics": "家庭教育预算分析（扎心版）：基于2宫星象分析家庭经济容错率。不要写'关注资源配置'这种空话，要直说：'你们家的情况是XX预算等级，在这个等级里，性价比最高的教育投资是什么，千万别砸钱在什么地方'。100字内",
        "grade_potential": "学业潜力评估：基于3宫（基础教育）和9宫（高等教育）的星象，评估孩子当前的学业段位以及解锁/锁死的升学路径。家长最该抓的关键期是什么时候。80字内",
        "study_path_recommendation": "【核心】推荐的升学路径：结合家庭预算和孩子学业潜力，给出1-2条最匹配的路径。每条路径写明'适合谁、怎么走、花多少钱、有什么坑'。参考6条标准路径（A快乐精英路/B体制内硬核路/C技能生存路/D稳健保本路/E弯道超车路/F全球领袖路），要有具体的操作建议。120字内",
        "major_direction": "【张雪峰风格】大学专业方向建议：结合1宫2宫互溶接纳/金星木星宫位/群星聚集宫位分析，给出最匹配的专业大类。要具体到专业名，不要只说'理工类'，要说'计算机、电气工程、或者临床药学——哪个更适合你家的情况和分数段'。100字内",
        "city_school_advice": "城市与学校选择建议：结合星盘9宫和10宫，给出读大学的城市和学校层次建议。比如'你的配置适合去一线城市读强专业弱学校，不要为了学校名气去偏远地区的985'。60字内",
        "pain_point": "一句让家长清醒的话：如果不改变现状，最可能的结果是什么。扎心，但有用。40字内"
      }
    },
    {
      "id": "parenting",
      "title": "👨‍👩‍👧 家庭教育指南",
      "content": {
        "family_atmosphere": "家庭氛围诊断：基于4宫（原生家庭根基）的星象，分析当前家庭氛围的核心特征。是温馨安全型？还是紧张压力型？还是冷漠疏离型？直说。60字内",
        "father_role": "父亲角色建议（基于4宫）：父亲在孩子教育中应该扮演什么角色？目前最大的问题是什么？怎么做能改善？60字内",
        "mother_role": "母亲角色建议（基于10宫）：母亲的教育方式对孩子有什么影响？需要注意什么？60字内",
        "parenting_strength": "你们的家庭在养育上的核心优势是什么？30字内",
        "parenting_risk": "你们家最容易踩的养育坑是什么？基于4宫和10宫的挑战相位，指出最可能出现的教育失误。50字内",
        "action_tips": "3条明天就能用的家庭教育行动建议：非常具体、可操作。70字内",
        "family_ritual": "一个适合你们家的'家庭仪式'建议：每周一次的小仪式，能显著改善亲子关系。40字内"
      }
    },
    {
      "id": "talent",
      "title": "🧠 五者天赋画像",
      "content": {
        "type": "思者/赢者/德者/行者/学者——注意用概率性表述（'有很高概率属于'/'核心特质偏向'）",
        "description": "这个天赋类型的核心特征——在这个孩子身上具体怎么体现。不可使用绝对肯定语气。50字内",
        "brain_advantage": "脑优势类型和学习策略。40字内",
        "parenting_strategy": "家长最有效的教育策略：一句话说清楚核心方法。40字内",
        "talent_development": "如何把这个天赋转化为实际的学习优势？给出具体场景建议。50字内"
      }
    },
    {
      "id": "summary",
      "title": "📋 综合总结与行动建议",
      "content": {
        "core_insight": "一句话洞察：对这个孩子和这个家庭最核心的判断。30字内",
        "family_pattern": "家庭教育模式诊断：基于全盘刑冲相位（四分相/对分相）和4宫/10宫数据，一针见血地指出家庭互动中可能存在的核心问题。犀利、直接、扎心——让家长看完心里一紧。100字内",
        "support_level": "家庭综合支持度评估：物质（2宫）和情感（4宫/10宫）两个维度。直接说哪个方面需要加强。50字内",
        "core_issues": [
          "最急需解决的教育问题（15字内）",
          "最需要关注的亲子关系问题（15字内）",
          "最值得培养的天赋方向（15字内）"
        ],
        "dev_direction": "能力发展方向：综合分析金星木星宫位+和谐相位+群星聚集，指出孩子最应该发展的能力方向。要具体。80字内",
        "action_plan": "给家长的3步行动路线：第一步做什么、第二步做什么、第三步做什么。非常具体、下周就能开始。100字内",
        "key_advice": "一句最核心的建议（20字内）"
      }
    },
    {
      "id": "houses", "title": "🏠 十二宫位与教育方向",
      "content": [
        {"house":1, "sign":"星座名", "name":"命宫", "keyword":"自我形象", "desc":"个性化解读：结合星座和宫内行星（如有），写具体教育影响，每宫40-60字。聚焦教育含义，不讲命运财运。"},
        {"house":2, "sign":"星座名", "name":"财帛宫", "keyword":"价值感", "desc":"同上"}
      ]
    },
    {
      "id": "aspects", "title": "🔗 行星相位",
      "content": [
        {"display":"太阳合水星（合相）", "interpretation":"个性化相位解读：60-80字。重点解读对学习和亲子关系的影响，而非命运预测。引用具体行星、星座、宫位数据。"}
      ]
    }
  ],
  "footer": "引导加微信的文案，自然不硬推（含微信号 yoyozhao1341）"
}`;
}export function parseReportResponse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch (e2) {}
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { return JSON.parse(text.substring(start, end + 1)); } catch (e3) {}
    }
    throw new Error('无法解析 AI 响应为 JSON');
  }
}

export const KB = {
  MERCURY_LEARNING,
  MOON_EMOTION,
  SUN_DRIVE,
  RISING_MASK,
  FIVE_TALENTS,
  EDU_PATHS,
  BUDGET_TIERS,
  HOUSE_EDU,
};
