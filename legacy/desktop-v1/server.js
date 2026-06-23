const express = require('express');
const fs = require('fs');
const path = require('path');
const { julianDay, calculatePosition, calculateHouses, Planet, HouseSystem, CommonCalculationFlags, close: sweClose } = require('@swisseph/node');
const { getCityCoords, getCitiesForFrontend } = require('./cities');
const app = express();
const PORT = process.env.PORT || 3000;

// Read API key from .env
let DEEPSEEK_API_KEY = '';
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const match = envContent.match(/DEEPSEEK_API_KEY=(.+)/);
  if (match) DEEPSEEK_API_KEY = match[1].trim();
} catch (e) {
  console.warn('No .env file found');
}

// Read knowledge base
let KNOWLEDGE_BASE = '';
try {
  KNOWLEDGE_BASE = fs.readFileSync(path.join(__dirname, 'knowledge_base.md'), 'utf8');
} catch (e) {
  console.warn('No knowledge_base.md found');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === 星盘计算（Swiss Ephemeris）===
const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];

function calcChart(birthDate, birthTime, birthCity) {
  const [y, m, d] = birthDate.split('-').map(Number);
  let hour = 12;
  if (birthTime && birthTime !== '未知') {
    const [h, min] = birthTime.split(':').map(Number);
    hour = h + (min || 0) / 60;
  }

  const coords = getCityCoords(birthCity);
  const jd = julianDay(y, m, d, hour);
  const flags = CommonCalculationFlags.DefaultSwissEphemeris;

  // Planetary positions (tropical zodiac)
  const sun = calculatePosition(jd, Planet.Sun, flags);
  const moon = calculatePosition(jd, Planet.Moon, flags);
  const mercury = calculatePosition(jd, Planet.Mercury, flags);

  // House cusps (Placidus system)
  const houses = calculateHouses(jd, coords.lat, coords.lon, HouseSystem.Placidus);

  const signIndex = lon => Math.floor(((lon % 360) + 360) % 360 / 30) % 12;

  return {
    sun: { sign: SIGNS[signIndex(sun.longitude)], degree: Math.floor(((sun.longitude % 30) + 30) % 30) },
    moon: { sign: SIGNS[signIndex(moon.longitude)], degree: Math.floor(((moon.longitude % 30) + 30) % 30) },
    rising: { sign: SIGNS[signIndex(houses.ascendant)], degree: Math.floor(((houses.ascendant % 30) + 30) % 30) },
    mercury: { sign: SIGNS[signIndex(mercury.longitude)], degree: Math.floor(((mercury.longitude % 30) + 30) % 30) },
    fourthHouse: { sign: SIGNS[signIndex(houses.cusps[4])], cusp: Math.floor(((houses.cusps[4] % 30) + 30) % 30) },
    tenthHouse: { sign: SIGNS[signIndex(houses.mc)], cusp: Math.floor(((houses.mc % 30) + 30) % 30) }
  };
}

// === AI Report API ===
app.post('/api/report', async (req, res) => {
  const { userInfo } = req.body;

  try {
    // Calculate chart with Swiss Ephemeris
    const chart = calcChart(userInfo.birthDate, userInfo.birthTime, userInfo.birthCity);

    // Generate report via AI
    const result = await callDeepSeek(chart, userInfo);
    const parsed = parseAIResponse(result);

    res.json({ success: true, data: { ...parsed, chart } });
  } catch (err) {
    console.error('AI API error:', err.message);
    // Fallback
    res.json({ success: true, data: getFallbackReport(userInfo) });
  }
});

// === Save Lead ===
app.post('/api/lead', (req, res) => {
  const { wechat, reportData } = req.body;
  const entry = {
    wechat,
    time: new Date().toISOString(),
    summary: reportData?.talentPotential?.slice(0, 50) || ''
  };
  const logPath = path.join(__dirname, 'data', 'leads.jsonl');
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  res.json({ success: true });
});

// === Build Prompt ===
function buildPrompt(chart, userInfo) {
  const sun = chart.sun.sign;
  const moon = chart.moon.sign;
  const rising = chart.rising.sign;
  const mercury = chart.mercury.sign;
  const fourth = chart.fourthHouse.sign;
  const tenth = chart.tenthHouse.sign;
  const sunDeg = chart.sun.degree;
  const moonDeg = chart.moon.degree;
  const ascDeg = chart.rising.degree;

  // Determine element distribution and cross-reference hints
  const elementOf = { '白羊':'火','狮子':'火','射手':'火','金牛':'土','处女':'土','摩羯':'土','双子':'风','天秤':'风','水瓶':'风','巨蟹':'水','天蝎':'水','双鱼':'水' };
  const elements = [sun, moon, rising, mercury].map(s => elementOf[s] || '');
  const elementCount = {};
  elements.forEach(e => { elementCount[e] = (elementCount[e] || 0) + 1; });
  const dominantElement = Object.entries(elementCount).sort((a,b) => b[1]-a[1])[0]?.[0] || '';

  return `你是一位专业的星盘天赋教育解读师，拥有深厚的占星学和儿童教育背景。你的风格冷静、专业、有洞察力，像一位经验丰富的教育顾问在给家长做一对一咨询。

用户信息：${userInfo.name || '匿名'}，出生日期：${userInfo.birthDate}，${userInfo.birthTime ? '出生时间：' + userInfo.birthTime : '出生时间未知'}${userInfo.birthCity ? '，出生城市：' + userInfo.birthCity : ''}

星盘数据（真实计算，非娱乐）：
- 太阳：${sun} ${sunDeg}°（核心天性、生命力、父亲形象）
- 月亮：${moon} ${moonDeg}°（情绪需求、安全感、母亲形象）
- 上升：${rising} ${ascDeg}°（外在表现、社会面具）
- 水星：${mercury}（思维模式、沟通风格、学习方式）
- 第4宫（原生家庭）：${fourth}
- 第10宫（社会成就）：${tenth}
- 元素分布：${Object.entries(elementCount).filter(e=>e[1]).map(e => e[0]+'×'+e[1]).join('、')}（强势元素：${dominantElement}）

【重要指令】
请严格按照以下要求输出报告，用 === 分隔每个部分。每部分必须包含以下要素：

1. **个性化**：必须基于该孩子实际的星盘配置（星座+位置），不能写通用的星座性格描述。每一句话都要针对这个具体孩子。
2. **交叉参照**：分析中必须参照多个星体之间的关系。例如太阳白羊+水星双鱼，思维模式和学习方式会有特殊表现。
3. **专业浓度**：使用占星学专业框架（四元素、三方模式、四正模式），但用家长能听懂的语言表达。
4. **重点提示**：当多个指标指向同一个结论时，用【家长关注】标记出来，并解释为什么需要关注。
5. **行动导向**：每段结尾必须给一条具体的行动建议，告诉家长具体可以怎么做。
6. **字数**：每部分300-500字，要有实质性内容，不要凑字数。

---

第一部分：性格画像
基于太阳${sun}与上升${rising}的交叉分析：

（1）描述这个孩子最核心的性格驱动力（太阳${sun}）和外在表现（上升${rising}）之间的关系。两者是否有冲突？是否相互强化？具体表现是什么？
（2）在班级中给老师的第一印象是什么？深入相处后会发现什么不一样的特质？
（3）核心天赋优势是什么？结合元素${dominantElement}强势来分析这个优势如何发挥作用。
（4）【交叉参照】分析太阳与上升的匹配度：如果同一元素则强调纯粹性；如果不同元素则分析内在张力。
（5）【家长关注】如果存在需要特别关注的性格倾向，在此标注。
（6）行动建议。

第二部分：学习风格诊断（核心竞争力分析）
基于水星${mercury}与太阳${sun}的关系：

（1）分析思维模式：水星${mercury}如何塑造他的信息处理方式和学习偏好？这是死记硬背型还是理解型？是视觉型还是听觉型？
（2）如果水星与太阳同星座（${mercury === sun ? '☑ 同星座，思维与天性高度统一' : '不同星座，思维与天性有差异'}），说明这个孩子思维模式和核心天性之间的关系。
（3）最有效的学习方式是什么？具体到场景：写作业时应该怎么安排？背单词用什么方法？数学怎么学？
（4）绝对不能踩的雷区是什么？什么方式会直接导致他厌学？
（5）【家长关注】如果存在学习上的显著优势或显著短板，在此重点标注。
（6）行动建议。

第三部分：情绪底座
基于月亮${moon}的深度分析：

（1）这个孩子在什么情绪状态下学习效率最高？什么样的环境让他感到安全？
（2）什么情况下容易情绪崩溃？具体触发因素是什么？
（3）崩溃时的表现是什么？（是哭闹、沉默、还是暴躁？）
（4）家长应该如何处理他的情绪？具体到话术和步骤。
（5）【家长关注】如果月亮与之前分析的太阳/水星存在冲突（例如太阳火象+月亮水象），提示家长注意内外不一的情绪消耗。
（6）行动建议。

第四部分：家庭支持建议
基于第4宫${fourth}（原生家庭）和第10宫${tenth}（社会成就）：

（1）这个家庭的教育氛围是什么样的？孩子的原生家庭环境给他带来什么影响？
（2）父亲角色（4宫${fourth}）和母亲角色（10宫${tenth}）分别应该以什么方式支持孩子？各自应该注意什么？
（3）家庭中最需要调整的是什么？不要做的是什么？
（4）【家长关注】如果4宫和10宫存在特殊相位或冲突，标注需要家长特别注意的地方。
（5）行动建议。

第五部分：综合交叉分析与天赋提示
请综合分析所有配置，输出以下内容：

（1）四元素分布评估（${Object.entries(elementCount).filter(e=>e[1]).map(e => e[0]+'='+e[1]+'个').join('、')}）：缺什么元素？什么元素过重？这对孩子有什么实际影响？
（2）太阳与月亮的关系（${sun}/${moon}）：内在驱动力是否自洽？是否存在"想做好但做不到"的内在冲突？具体表现会是什么？
（3）【家长关注】基于所有配置，列出最需要家长关注的1-3个核心问题，每个问题解释为什么需要关注，以及忽视可能带来的后果。
（4）天赋综合提示：结合所有配置，用一句话概括这个孩子最需要被理解的一点是什么。

注意：严禁使用"��来很配""天生一对""运势"等娱乐占星话术。保持专业教育咨询风格，用"孩子"或"你家孩子"，不用"你家的娃"。每段必须包含行动建议。`;
}

// === Call DeepSeek API ===
async function callDeepSeek(chart, userInfo) {
  const apiKey = process.env.DEEPSEEK_API_KEY || DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'sk-你的key填在这里') {
    throw new Error('No valid API key configured');
  }

  const prompt = buildPrompt(chart, userInfo);

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `家长您好！我是您的星盘天赋教育解读师。我用亲切的口吻帮家长分析孩子的先天特质和学习方向。你说的每句话都要有根据，结合占星学知识和教育实践。你的风格是：亲切但专业，有温度但不玄乎。以下是你的核心知识库，请基于这个体系来解读：\n\n${KNOWLEDGE_BASE.substring(0, 8000)}`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// === Parse AI Response ===
function parseAIResponse(text) {
  const parts = text.split('===').map(s => s.trim()).filter(Boolean);
  return {
    personality: parts[0] || '',
    learningStyle: parts[1] || '',
    emotionBase: parts[2] || '',
    familyAdvice: parts[3] || '',
    deepAnalysis: parts[4] || '',
    raw: text
  };
}

// === Fallback ===
function getFallbackReport(userInfo) {
  return {
    personality: '你家的孩子看起来是个活泼聪明的小家伙。从星盘配置来看，他天生有自己独特的性格特质，在班级里应该是容易被老师记住的那种孩子。建议多观察他在什么情况下最投入、最开心，那就是他的天赋所在。',
    learningStyle: '每个孩子都有自己最有效的学习方式。有的孩子需要安静的环境，有的需要边动边学。建议家长多尝试不同的学习方法，找到最适合孩子的那个节奏。',
    emotionBase: '孩子的情绪状态直接影响学习效率。当他情绪好的时候，学什么都很快；情绪不好的时候，再简单的题也做不进去。所以先处理好情绪，再谈学习。',
    familyAdvice: '家庭氛围对孩子的学习影响很大。建议营造一个稳定、温暖的学习环境，让孩子在家里感到安全和被支持。',
    deepAnalysis: '想知道孩子更深层的天赋方向和最适合他的教育路径？添加微信 yoyozhao1341，付费9.9元获取完整深度诊断报告，包含亲子关系分析、天赋方向、升学建议等。',
    chart: null
  };
}

// === Cities API ===
app.get('/api/cities', (req, res) => {
  res.json(getCitiesForFrontend());
});

app.get('/api/divisions', (req, res) => {
  const provinces = require('china-division/dist/pc.json');
  const { ChinaCitiesCoordinate } = require('better-echarts-maps');
  const result = {};
  for (const [province, cities] of Object.entries(provinces)) {
    let validCities = cities.filter(c => {
      const coords = ChinaCitiesCoordinate[c];
      return coords && coords[0] != null;
    });
    // For municipalities (北京/上海/天津/重庆), add the province name as city
    if (validCities.length === 0 && ChinaCitiesCoordinate[province]) {
      validCities = [province];
    }
    if (validCities.length > 0) result[province] = validCities;
  }
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`✓ 星妈天赋测试已启动: http://localhost:${PORT}`);
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-你的key填在这里') {
    console.warn('⚠ 请先配置 .env 文件中的 DEEPSEEK_API_KEY');
  }
});
