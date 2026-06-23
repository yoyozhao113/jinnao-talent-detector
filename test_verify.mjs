import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');

// 验证：2013-07-05 00:00 UTC 的 GMST 应该是多少？
// 根据天文算法，GMST 可以用近似公式：
// GMST = 280.46061837 + 360.98564736629 * (JD - 2451545.0)

const jd = 2456478.425694444; // 贝贝的 JD
const d = jd - 2451545.0;
const gmstApprox = 280.46061837 + 360.98564736629 * d;
console.log('Approximate GMST (deg):', gmstApprox % 360);

// astronomia 的结果
const gmstAstronomia = a.sidereal.mean(jd);
console.log('Astronomia GMST:', gmstAstronomia);
console.log('Astronomia GMST % 360:', gmstAstronomia % 360);

// 检查 astronomia 的文档
console.log('');
console.log('Type of sidereal.mean:', typeof a.sidereal.mean);
console.log('sidereal keys:', Object.keys(a.sidereal));

// 看看 astronomia 包里 sidereal 的源码
// 如果返回的是小时，需要 * 15 转为度
console.log('');
console.log('If GMST is in hours:');
console.log('  GMST (hours):', gmstAstronomia);
console.log('  GMST (deg):', gmstAstronomia * 15);
console.log('  GMST (deg) % 360:', (gmstAstronomia * 15) % 360);
