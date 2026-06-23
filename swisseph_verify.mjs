import sw from 'swisseph';
import { writeFileSync } from 'fs';

// 贝贝: 2013-07-05 06:13, 杭州 (30.27°N, 120.15°E)
const YEAR = 2013, MONTH = 7, DAY = 5, HOUR = 6, MIN = 13;
const LAT = 30.27, LON = 120.15;
const jd = sw.swe_julday(YEAR, MONTH, DAY, HOUR + MIN / 60, 1);

const PLANETS = [
  { id: 0, name: 'Sun', cn: '太阳' },
  { id: 1, name: 'Moon', cn: '月亮' },
  { id: 2, name: 'Mercury', cn: '水星' },
  { id: 3, name: 'Venus', cn: '金星' },
  { id: 4, name: 'Mars', cn: '火星' },
  { id: 5, name: 'Jupiter', cn: '木星' },
  { id: 6, name: 'Saturn', cn: '土星' },
  { id: 7, name: 'Uranus', cn: '天王星' },
  { id: 8, name: 'Neptune', cn: '海王星' },
  { id: 9, name: 'Pluto', cn: '冥王星' },
];

const SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];

function formatDMS(deg) {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  const s = ((deg - d) * 60 - m) * 60;
  return `${d}°${m.toString().padStart(2,'0')}'`;
}

let output = `🔭 Swiss Ephemeris 精度验证报告\n`;
output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
output += `出生信息: ${YEAR}-${MONTH.toString().padStart(2,'0')}-${DAY.toString().padStart(2,'0')} ${HOUR}:${MIN.toString().padStart(2,'0')}\n`;
output += `地点: 杭州 (${LAT}°N, ${LON}°E)\n`;
output += `儒略日 JD: ${jd}\n`;
output += `引擎: Swiss Ephemeris v${sw.swe_version()}\n`;
output += `宫位制: Placidus\n\n`;

output += `🪐 行星位置 (回归黄道/Tropical)\n`;
output += `${'行星'.padEnd(6)} ${'星座'.padEnd(4)} ${'度数'.padEnd(10)} ${'精确值'.padEnd(16)}\n`;
output += `─`.repeat(42) + '\n';

PLANETS.forEach(p => {
  const res = sw.swe_calc_ut(jd, p.id, 0);
  const lon = res.longitude;
  const signIdx = Math.floor(lon / 30) % 12;
  const degInSign = lon % 30;
  output += `${p.cn.padEnd(6)} ${SIGNS[signIdx].padEnd(4)} ${formatDMS(degInSign).padEnd(10)} ${lon.toFixed(6)}°\n`;
});

output += `\n🏠 宫位 (Placidus)\n`;
const houses = sw.swe_houses(jd, LAT, LON, 'P');
output += `ASC (上升): ${formatDMS(houses.ascendant)}° ${SIGNS[Math.floor(houses.ascendant/30)%12]} (${houses.ascendant.toFixed(4)}°)\n`;
output += `MC (中天):   ${formatDMS(houses.mc)}° ${SIGNS[Math.floor(houses.mc/30)%12]} (${houses.mc.toFixed(4)}°)\n\n`;

output += `宫位列表:\n`;
houses.house.forEach((angle, i) => {
  const signIdx = Math.floor(angle / 30) % 12;
  output += `第${i+1}宫: ${SIGNS[signIdx]} ${formatDMS(angle%30)}° (${angle.toFixed(4)}°)\n`;
});

sw.swe_close();
writeFileSync('swisseph_result.txt', output, 'utf-8');
console.log(output);
