import { calculateBirthChart } from './api/utils/astrology.mjs';

const chart = calculateBirthChart({
  birthDate: '2013-07-05', birthHour: 6, birthMinute: 13,
  latitude: 30.25, longitude: 120.17
});

const p = chart.full.planets;
console.log('=== 我们的 vs 宫神星网 ===\n');

const expected = {
  sun:     { s: '巨蟹座', d: 13 },
  moon:    { s: '双子座', d: 6 },
  mercury: { s: '处女座', d: 24 },
  venus:   { s: '巨蟹座', d: 8 },
  mars:    { s: '狮子座', d: 20 },
  jupiter: { s: '巨蟹座', d: 22 },
  saturn:  { s: '狮子座', d: 28 },
  uranus:  { s: '白羊座', d: 18 },
  neptune: { s: '双子座', d: 13 },
  pluto:   { s: '水瓶座', d: 21 },
  rising:  { s: '巨蟹座', d: 28 }
};

for (const [name, exp] of Object.entries(expected)) {
  const got = p[name] || chart.basic.planets[name];
  const diff = Math.abs((got.degree || 0) - exp.d);
  const signMatch = (got.sign || '').includes(exp.s.slice(0, 2));
  console.log(
    `${name.padEnd(10)} | 我们:${got.sign}${got.degree}°${String(got.minute).padStart(2, "0")}' | ` +
    `期望:${exp.s}${exp.d}° | 差${diff}° | 符号:${signMatch ? '✅' : '❌'}`
  );
}

// 也打印原始经度用于诊断
console.log('\n=== 原始经度（黄道度数）===');
for (const [name, exp] of Object.entries(expected)) {
  const got = p[name] || chart.basic.planets[name];
  console.log(`${name.padEnd(10)} raw=${Number(got.longitude).toFixed(2)}°`);
}
