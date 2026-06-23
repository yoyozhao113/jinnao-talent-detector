import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');
const rad2deg = r => r * 180 / Math.PI;

// 测试1：已知日期验证
// 2024年3月20日春分，太阳应该在0°白羊座
const d1 = new Date(Date.UTC(2024, 2, 20, 0, 0, 0));
const jd1 = a.julian.DateToJD(d1);
console.log('春分 JD:', jd1, 'Sun lon:', rad2deg(a.solar.apparentLongitude(jd1)), 'deg');

// 测试2：2024年6月21日夏至，太阳应该在90°巨蟹座
const d2 = new Date(Date.UTC(2024, 5, 21, 0, 0, 0));
const jd2 = a.julian.DateToJD(d2);
console.log('夏至 JD:', jd2, 'Sun lon:', rad2deg(a.solar.apparentLongitude(jd2)), 'deg');

// 测试3：2024年12月21日冬至，太阳应该在270°摩羯座
const d3 = new Date(Date.UTC(2024, 11, 21, 0, 0, 0));
const jd3 = a.julian.DateToJD(d3);
console.log('冬至 JD:', jd3, 'Sun lon:', rad2deg(a.solar.apparentLongitude(jd3)), 'deg');

// 测试4：检查 DateToJD 是否正确
console.log('\nJD 2451545.0 =', a.julian.JDToDate(2451545.0));
console.log('Y2K JD from DateToJD:', a.julian.DateToJD(new Date(Date.UTC(2000, 0, 1, 12, 0, 0))));

// 测试5：直接算2016-06-15 04:00 UTC 的 JD
const dTest = new Date(Date.UTC(2016, 5, 15, 4, 0, 0));
console.log('\n2016-06-15 04:00 UTC JD:', a.julian.DateToJD(dTest));
console.log('Sun lon deg:', rad2deg(a.solar.apparentLongitude(a.julian.DateToJD(dTest))));
