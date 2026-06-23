import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');
const rad2deg = r => r * 180 / Math.PI;

// 直接用 T 参数测试 solar.apparentLongitude
// 春分 2024-03-20 00:00 UTC
const jd1 = a.julian.DateToJD(new Date(Date.UTC(2024, 2, 20, 0, 0, 0)));
const T1 = (jd1 - 2451545.0) / 36525.0;
console.log('春分 T:', T1.toFixed(6), 'Sun lon:', rad2deg(a.solar.apparentLongitude(T1)).toFixed(2), 'deg (应为 ~0)');

// 夏至 2024-06-21 00:00 UTC  
const jd2 = a.julian.DateToJD(new Date(Date.UTC(2024, 5, 21, 0, 0, 0)));
const T2 = (jd2 - 2451545.0) / 36525.0;
console.log('夏至 T:', T2.toFixed(6), 'Sun lon:', rad2deg(a.solar.apparentLongitude(T2)).toFixed(2), 'deg (应为 ~90)');

// 冬至 2024-12-21 00:00 UTC
const jd3 = a.julian.DateToJD(new Date(Date.UTC(2024, 11, 21, 0, 0, 0)));
const T3 = (jd3 - 2451545.0) / 36525.0;
console.log('冬至 T:', T3.toFixed(6), 'Sun lon:', rad2deg(a.solar.apparentLongitude(T3)).toFixed(2), 'deg (应为 ~270)');
