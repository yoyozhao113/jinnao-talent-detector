import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sw = require('swisseph');

const [y, m, d] = [2013, 7, 5];
const h = 6, min = 13;
const lat = 30.27, lon = 120.15;

// 方法1：当前计算（错误：hour当成GMT）
const jd_wrong = sw.swe_julday(y, m, d, h + min/60, 1);

// 方法2：修正（hour减8，转为GMT）
const jd_correct = sw.swe_julday(y, m, d, (h - 8) + min/60, 1);

// 方法3：日期前一天+16h（GMT 22:13 = 前一天）
const jd_alt = sw.swe_julday(y, m, d - 1, 16 + min/60, 1);

console.log('JD错误（hour=6.217当GMT）:', jd_wrong);
console.log('JD修正（hour-8=GMT 22:13）:', jd_correct);
console.log('JD替代（前日+16h）:', jd_alt);
console.log('JD差异(错误vs修正):', jd_wrong - jd_correct, '天 =', (jd_wrong - jd_correct)*24, '小时');

console.log('\n=== ASC对比 ===');
const houses_wrong = sw.swe_houses(jd_wrong, lat, lon, 'P');
const houses_correct = sw.swe_houses(jd_correct, lat, lon, 'P');
const houses_alt = sw.swe_houses(jd_alt, lat, lon, 'P');

const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
function fmtAsc(deg) {
  const sign = Math.floor(deg/30);
  const d = Math.floor(deg % 30);
  const m = Math.round((deg % 1) * 60);
  return `${SIGNS[sign]}${d}°${m}′ (${deg.toFixed(2)}°)`;
}

console.log('ASC错误:', fmtAsc(houses_wrong.ascendant));
console.log('ASC修正:', fmtAsc(houses_correct.ascendant));
console.log('ASC替代:', fmtAsc(houses_alt.ascendant));
console.log('目标ASC: 巨蟹27°14′ ≈ 87.23°');

console.log('\n=== 月亮对比 ===');
const moon_wrong = sw.swe_calc_ut(jd_wrong, 1, 0);
const moon_correct = sw.swe_calc_ut(jd_correct, 1, 0);
console.log('月亮错误:', moon_wrong.longitude.toFixed(4), '=', fmtAsc(moon_wrong.longitude));
console.log('月亮修正:', moon_correct.longitude.toFixed(4), '=', fmtAsc(moon_correct.longitude));
console.log('目标月亮: 双子6°22′ ≈ 66.37°');

sw.swe_close();
