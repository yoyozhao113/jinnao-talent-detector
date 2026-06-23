/**
 * 星历计算引擎 v3 - Swiss Ephemeris (swisseph) + Placidus 宫位制
 * 替换 astronomia，精度对齐宫神星网/测测
 * 支持10颗行星、Placidus 宫位制、相位、格局分析
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sw = require('swisseph');

const SIGNS = ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'];
const SIGNS_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const PLANETS_CN = {sun:'太阳',moon:'月亮',mercury:'水星',venus:'金星',mars:'火星',jupiter:'木星',saturn:'土星',uranus:'天王星',neptune:'海王星',pluto:'冥王星'};

// Swiss Ephemeris 行星 ID 映射
const SW_PLANET_IDS = {
  sun: 0, moon: 1, mercury: 2, venus: 3, mars: 4,
  jupiter: 5, saturn: 6, uranus: 7, neptune: 8, pluto: 9,
};

const normalizeAngle = d => ((d % 360) + 360) % 360;
const angleBetween = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

function longitudeToSign(longitudeDeg) {
  const norm = normalizeAngle(longitudeDeg);
  const si = Math.floor(norm / 30);
  const degFloat = norm - si * 30;
  let minute = Math.round((degFloat % 1) * 60);
  let degree = Math.floor(degFloat);
  // 进位：60分 → 1度
  if (minute === 60) { minute = 0; degree += 1; }
  return {
    sign: SIGNS[si], signEn: SIGNS_EN[si], signIndex: si,
    degree, minute,
    display: `${SIGNS[si]}${degree}°${minute}′`,
  };
}

// ========== 主函数 ==========

// 时区偏移量（小时），默认 +8（中国大陆/杭州）
const TZ_OFFSET = 8;

export function calculateBirthChart({ birthDate, birthHour = 12, birthMinute = 0, latitude, longitude, houseSystem = 'P', timezoneOffset = TZ_OFFSET }) {
  const [y, m, day] = birthDate.split('-').map(Number);
  // swe_julday expects UT (GMT). birthHour is local time.
  // Subtract timezoneOffset so swe_julday interprets correctly.
  const utcHour = birthHour + birthMinute / 60 - timezoneOffset;
  const jd = sw.swe_julday(y, m, day, utcHour, 1);

  // 计算所有行星位置
  const allPositions = {};
  const planetNames = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];

  for (const name of planetNames) {
    const res = sw.swe_calc_ut(jd, SW_PLANET_IDS[name], 0);
    allPositions[name] = res.longitude;
  }

  // 宫位 (Placidus)
  const houses = sw.swe_houses(jd, latitude, longitude, houseSystem);
  const ascDeg = houses.ascendant;
  const mcDeg = houses.mc;
  const cusps = houses.house; // 12个宫头, index 0=1宫头

  // 行星宫位
  const planetHouseMap = {};
  for (const [name, lon] of Object.entries(allPositions)) {
    planetHouseMap[name] = findPlanetHouse(lon, cusps);
  }

  const aspects = calcAspects(allPositions);

  // 构建结果
  const housesArr = cusps.map((cusp, i) => ({ house: i + 1, cuspDeg: cusp, ...longitudeToSign(cusp) }));

  const planets = {};
  for (const name of planetNames) {
    planets[name] = { ...longitudeToSign(allPositions[name]), longitude: allPositions[name], house: planetHouseMap[name] };
  }
  planets.rising = { ...longitudeToSign(ascDeg), longitude: ascDeg };
  planets.mc = { ...longitudeToSign(mcDeg), longitude: mcDeg };

  const basicReport = { planets, houses: housesArr, aspects };

  const { quadrantPattern, resource, risk } = calcDeepAnalysis(allPositions, cusps, aspects, planetHouseMap);
  const fullReport = { planets, houses: housesArr, aspects, quadrantPattern, resource, risk };

  sw.swe_close();

  return { basic: basicReport, full: fullReport, _raw: { jd, ascDeg, mcDeg, cusps } };
}

// ========== 行星所在宫位 ==========

function findPlanetHouse(planetLon, cusps) {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i], end = cusps[(i + 1) % 12];
    let lon = planetLon, s = start, e = end;
    if (e < s) { e += 360; if (lon < s) lon += 360; }
    else { if (lon < s) lon += 360; }
    if (lon >= s && lon < e) return i + 1;
  }
  return 1;
}

// ========== 相位 ==========

const ASPECTS = [
  { name: '合相', angle: 0, orb: 8, symbol: '☿' },
  { name: '六分相', angle: 60, orb: 6, symbol: '☆' },
  { name: '四分相', angle: 90, orb: 8, symbol: '□' },
  { name: '三分相', angle: 120, orb: 8, symbol: '△' },
  { name: '对分相', angle: 180, orb: 8, symbol: '☌' },
];

function calcAspects(positions) {
  const aspects = [];
  const names = Object.keys(positions);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const p1 = names[i], p2 = names[j];
      const dist = angleBetween(positions[p1], positions[p2]);
      for (const asp of ASPECTS) {
        const orb = Math.abs(dist - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            planet1: PLANETS_CN[p1] || p1, planet2: PLANETS_CN[p2] || p2,
            planet1En: p1, planet2En: p2,
            type: asp.name, symbol: asp.symbol, angle: asp.angle,
            orb: Math.round(orb * 10) / 10,
            display: `${PLANETS_CN[p1]||p1}${asp.symbol}${PLANETS_CN[p2]||p2}（${asp.name}，容许度${Math.round(orb*10)/10}°）`,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

// ========== 深度分析 ==========

function calcDeepAnalysis(positions, cusps, aspects, planetHouseMap) {
  const quadrants = [
    { name: '第一象限（1-3宫）', houses: [1,2,3], count: 0, planets: [] },
    { name: '第二象限（4-6宫）', houses: [4,5,6], count: 0, planets: [] },
    { name: '第三象限（7-9宫）', houses: [7,8,9], count: 0, planets: [] },
    { name: '第四象限（10-12宫）', houses: [10,11,12], count: 0, planets: [] },
  ];
  for (const [p, h] of Object.entries(planetHouseMap)) {
    for (const q of quadrants) { if (q.houses.includes(h)) { q.count++; q.planets.push(p); break; } }
  }
  const total = Object.keys(planetHouseMap).length;
  const dominant = quadrants.reduce((a, b) => a.count >= b.count ? a : b);
  let patternName = '均衡发展型';
  if (dominant.count / total > 0.5) {
    if (dominant.houses[0]===1) patternName='自我探索型'; else if (dominant.houses[0]===4) patternName='家庭导向型';
    else if (dominant.houses[0]===7) patternName='关系驱动型'; else if (dominant.houses[0]===10) patternName='事业成就型';
  }
  const quadrantPattern = { quadrants: quadrants.map(q=>({name:q.name,count:q.count,planets:q.planets})), dominant:dominant.name, pattern:patternName };

  const patterns = [];
  const trines = aspects.filter(a=>a.angle===120);
  if (trines.length>=3) { const ps=new Set(); trines.forEach(t=>{ps.add(t.planet1En);ps.add(t.planet2En);}); if(ps.size>=3) patterns.push('大三角格局'); }
  const squares = aspects.filter(a=>a.angle===90), oppositions = aspects.filter(a=>a.angle===180);
  if (squares.length>=2&&oppositions.length>=1) patterns.push('T三角格局');
  const planetLons = Object.values(positions);
  let maxCluster=1;
  for(let i=0;i<planetLons.length;i++){let c=1;for(let j=0;j<planetLons.length;j++){if(i!==j&&angleBetween(planetLons[i],planetLons[j])<30)c++;}maxCluster=Math.max(maxCluster,c);}
  if(maxCluster>=3) patterns.push('星体聚集');
  const resource = { patterns, score: patterns.length*2 };

  const warnings = [];
  const harsh = aspects.filter(a=>a.angle===90||a.angle===180);
  if(harsh.length>=3) warnings.push(`多处刑冲（${harsh.length}处），注意情绪管理`);
  for(const p of Object.keys(positions)){
    if(!aspects.some(a=>a.planet1En===p||a.planet2En===p)) warnings.push(`${PLANETS_CN[p]||p}无明显相位`);
  }
  let level='低'; if(warnings.length>2)level='高'; else if(warnings.length>0)level='中';

  return { quadrantPattern, resource, risk:{ warnings, level } };
}

export { longitudeToSign, normalizeAngle, angleBetween };
