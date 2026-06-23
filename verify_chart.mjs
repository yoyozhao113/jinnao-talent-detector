import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sw = require('swisseph');

const [y, m, d] = [2013, 7, 5];
const h = 6, min = 13;
const jd = sw.swe_julday(y, m, d, h + min/60, 1);
console.log('JD =', jd);

const PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const ids = [0,1,2,3,4,5,6,7,8,9];
const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];

console.log('\n=== 行星位置 ===');
const pos = {};
for (let i = 0; i < PLANETS.length; i++) {
  const res = sw.swe_calc_ut(jd, ids[i], 0);
  const lon = res.longitude;
  pos[PLANETS[i]] = lon;
  const sign = Math.floor(lon/30);
  const deg = Math.floor(lon % 30);
  const minute = Math.round((lon % 1) * 60);
  console.log(`${PLANETS[i].padEnd(8)} ${SIGNS[sign]}${deg}°${minute}′ (${lon.toFixed(4)})`);
}

const lat = 30.27, lon = 120.15;
const houses = sw.swe_houses(jd, lat, lon, 'P');
console.log('\n=== 宫位（Placidus）===');
for (let i = 1; i <= 12; i++) {
  const c = houses.house[i-1];
  const sign = Math.floor(c/30);
  const deg = Math.floor(c % 30);
  const minute = Math.round((c % 1) * 60);
  console.log(`${i}宫宫头: ${SIGNS[sign]}${deg}°${minute}′ (${c.toFixed(4)})`);
}
console.log(`\nASC: ${houses.ascendant.toFixed(4)}`);
console.log(`MC: ${houses.mc.toFixed(4)}`);

// 行星落入宫位
console.log('\n=== 行星宫位 ===');
for (const [name, lon] of Object.entries(pos)) {
  for (let i = 0; i < 12; i++) {
    let start = houses.house[i];
    let end = houses.house[(i+1)%12];
    let plon = lon;
    if (end < start) { end += 360; if (plon < start) plon += 360; }
    else { if (plon < start) plon += 360; }
    if (plon >= start && plon < end) { console.log(`${name.padEnd(8)} ${i+1}宫`); break; }
  }
}

sw.swe_close();
