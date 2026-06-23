import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sw = require('swisseph');

// 修正后的引擎逻辑（birthHour -8 转为UTC）
const birthDate = '2013-07-05';
const birthHour = 6, birthMinute = 13;
const lat = 30.27, lon = 120.15;
const tzOffset = 8;

const [y, m, d] = birthDate.split('-').map(Number);
const utcHour = birthHour + birthMinute / 60 - tzOffset;
const jd = sw.swe_julday(y, m, d, utcHour, 1);

console.log('JD (UTC):', jd, '= UTC', birthHour - 8, 'h +', birthMinute, 'min on', y, '-', m, '-', d);

const PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const ids = [0,1,2,3,4,5,6,7,8,9];
const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];

function fmt(deg) {
  const sign = Math.floor(deg/30) % 12;
  const d = Math.floor(deg % 30);
  const min = Math.round((deg % 1) * 60);
  return `${SIGNS[sign]}${d}°${min}′`;
}

console.log('\n=== 修正后 vs 目标 ===');
const targets = {
  Sun: '巨蟹13°5′', Moon: '双子6°22′', Mercury: '巨蟹20°39′',
  Venus: '狮子8°45′', Mars: '双子24°7′', Jupiter: '巨蟹2°1′',
  Saturn: '天蝎4°50′', Uranus: '白羊12°27′', Neptune: '双鱼5°10′', Pluto: '摩羯10°13′'
};

for (let i = 0; i < PLANETS.length; i++) {
  const res = sw.swe_calc_ut(jd, ids[i], 0);
  const lon = res.longitude;
  const display = fmt(lon);
  const target = targets[PLANETS[i]];
  console.log(`${PLANETS[i].padEnd(8)} ${display}  (目标: ${target})`);
}

// 宫位
const houses = sw.swe_houses(jd, lat, lon, 'P');
console.log('\n=== 宫位（Placidus，修正后）===');
for (let i = 1; i <= 12; i++) {
  console.log(`${i}宫: ${fmt(houses.house[i-1])}`);
}
console.log(`ASC: ${fmt(houses.ascendant)}`);
console.log(`MC:  ${fmt(houses.mc)}`);

sw.swe_close();
