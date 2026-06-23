import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');
const rad2deg = r => r * 180 / Math.PI;

// 测试 GMST
const jd = 2456478.425694444;
const gmstResult = a.sidereal.mean(jd);
console.log('GMST raw:', gmstResult);
console.log('GMST as deg (no conversion):', gmstResult.toFixed(4));
console.log('GMST as rad->deg:', rad2deg(gmstResult).toFixed(4));

// 检查数值范围
console.log('');
console.log('3524772 / 360 =', 3524772 / 360, '圈');
console.log('3524772 % 360 =', 3524772 % 360);

// 看来 astronomia 的 sidereal.mean 返回的是度，不是弧度！
// 让我验证一下文档或源码

// 测试 Y2K
const y2k = a.julian.DateToJD(new Date(Date.UTC(2000, 0, 1, 12, 0, 0)));
console.log('');
console.log('Y2K JD:', y2k);
console.log('Y2K GMST:', a.sidereal.mean(y2k));
// Y2K 的 GMST 应该接近 280.46 度（18h 37m）
