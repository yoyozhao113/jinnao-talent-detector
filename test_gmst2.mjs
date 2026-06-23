import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');

// 贝贝：2013-07-05 06:13 北京时间 = 2013-07-04 22:13 UTC
const utcDate = new Date(Date.UTC(2013, 6, 4, 22, 13, 0));
const jd = a.julian.DateToJD(utcDate);
console.log('JD:', jd);

// GMST in seconds
const gmstSec = a.sidereal.mean(jd);
console.log('GMST (seconds):', gmstSec);
console.log('GMST (hours):', gmstSec / 3600);
console.log('GMST (deg):', (gmstSec / 3600) * 15);
console.log('GMST (deg) normalized:', ((gmstSec / 3600) * 15) % 360);

// 手动计算验证
// 简化公式：GMST = 280.46061837 + 360.98564736629 * (JD - 2451545.0)
const d = jd - 2451545.0;
const gmstManual = 280.46061837 + 360.98564736629 * d;
console.log('');
console.log('Manual GMST (deg):', gmstManual);
console.log('Manual GMST normalized:', gmstManual % 360);

// 差距
console.log('');
console.log('Difference:', Math.abs(gmstManual - ((gmstSec / 3600) * 15)));
