import pkg from 'ephemeris';
const { getAllPlanets } = pkg;

// 贝贝出生：2013-07-05 06:13 杭州 (UTC+8) -> UTC = 2013-07-04 22:13
// ephemeris 用 UTC 时间
const date = new Date(Date.UTC(2013, 6, 4, 22, 13, 0)); // month=6=July (0-based)
const lon = 120.17; // 东经
const lat = 30.25;

console.log('=== ephemeris (Moshier) vs 宫神星网 ===\n');

const result = getAllPlanets(date, lon, lat, 0);
const obs = result.observed;

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
  pluto:   { s: '水瓶座', d: 21 }
};

const SIGNS = ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座',
               '天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'];

function toDMS(deg) {
  const d = Math.floor(Math.abs(deg));
  const m = Math.floor((Math.abs(deg) - d) * 60);
  return String(d) + '\u00B0' + String(m).padStart(2,'0') + "'";
}

function lonToSignDeg(lon) {
  let l = ((lon % 360) + 360) % 360;
  const signIdx = Math.floor(l / 30);
  const degInSign = l % 30;
  return { sign: SIGNS[signIdx], degree: Math.round(degInSign * 10) / 10 };
}

function log(name, result, exp) {
  const diff = Math.abs(result.degree - exp.d);
  const ok = diff < 2 ? '\u2705' : diff < 5 ? '\u26A0\uFE0F' : '\u274C';
  console.log(name.padEnd(10) + ' | eph:' + result.sign + toDMS(result.degree) + ' | \u671F\u671B:' + exp.s + exp.d + '\u00B0 | \u5DEE' + diff.toFixed(1) + '\u00B0 | ' + ok);
}

// 映射 ephemeris 的 key 到我们的名字
const map = { sun: 'sun', moon: 'moon', mercury: 'mercury', venus: 'venus',
              mars: 'mars', jupiter: 'jupiter', saturn: 'saturn',
              uranus: 'uranus', neptune: 'neptune', pluto: 'pluto' };

for (const [key, name] of Object.entries(map)) {
  if (obs[key]) {
    const lon = obs[key].apparentLongitudeDd;
    const r = lonToSignDeg(lon);
    log(name, r, expected[name]);
  } else {
    console.log(name.padEnd(10) + ' | NOT FOUND in ephemeris');
  }
}
