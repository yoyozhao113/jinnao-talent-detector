import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');
const rad2deg = r => r * 180 / Math.PI;

// 贝贝：2013-07-05 06:13 北京时间 = 2013-07-04 22:13 UTC
const utcDate = new Date(Date.UTC(2013, 6, 4, 22, 13, 0));
const jd = a.julian.DateToJD(utcDate);
console.log('JD:', jd);

// GMST (Greenwich Mean Sidereal Time)
const gmstRad = a.sidereal.mean(jd);
const gmstDeg = rad2deg(gmstRad);
console.log('GMST (deg):', gmstDeg.toFixed(4));

// LST = GMST + 经度
const longitude = 120.15; // 杭州经度
const lstDeg = ((gmstDeg + longitude) % 360 + 360) % 360;
console.log('LST (deg):', lstDeg.toFixed(4));

// 上升点计算
const lat = 30.27;
const latRad = lat * Math.PI / 180;
const lstRad = lstDeg * Math.PI / 180;
const oblRad = 23.4392911 * Math.PI / 180;

// tan(ASC) = -cos(LST) / (sin(ε)·tan(φ) + cos(ε)·sin(LST))
const y = -Math.cos(lstRad);
const x = Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(lstRad);

let ascRad = Math.atan2(y, x);
let ascDeg = ((ascRad * 180 / Math.PI) % 360 + 360) % 360;
console.log('');
console.log('上升点黄经（度）:', ascDeg.toFixed(4));
console.log('上升星座:', ascDeg < 30 ? '白羊座' : ascDeg < 60 ? '金牛座' : ascDeg < 90 ? '双子座' : '其他');

// 验证：如果 LST 是 90 度（6点），上升应该在白羊座/金牛座交界处附近
// 如果 LST 是 120 度（8点），上升应该在金牛座/双子座交界处
// 贝贝 LST = 132 度，上升在金牛座是合理的

// 但用户说应该是巨蟹座，那上升应该在 90-120 度之间
// 这意味着 LST 应该在 150-180 度左右（早上8-10点）

console.log('');
console.log('=== 反推：如果上升是巨蟹座（90-120度），LST应该是多少？===');
// 反推公式比较复杂，简单估算：
// 巨蟹座上升 ≈ LST 在 150-180 度之间（约早上8-10点）
console.log('巨蟹座上升需要 LST ≈ 150-180 度（约北京时间 08:00-10:00）');
console.log('当前 LST =', lstDeg.toFixed(2), '度，对应上升金牛座');
