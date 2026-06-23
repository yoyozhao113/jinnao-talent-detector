import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');

// 贝贝：2013-07-05 06:13 北京时间，杭州
// 用 astro.com 或其他专业软件验证，上升应该是巨蟹座

// 转换为 UTC
const utcDate = new Date(Date.UTC(2013, 6, 4, 22, 13, 0));
const jd = a.julian.DateToJD(utcDate);
console.log('JD:', jd);

// 太阳位置
const T = (jd - 2451545.0) / 36525.0;
const sunLon = a.solar.apparentLongitude(T);
console.log('太阳黄经（rad）:', sunLon);
console.log('太阳黄经（deg）:', sunLon * 180 / Math.PI);
console.log('太阳星座:', sunLon * 180 / Math.PI < 3.5 ? '双子座/巨蟹座交界' : '巨蟹座');

// 月亮位置
const moonPos = a.moonposition.position(jd);
console.log('');
console.log('月亮赤经（rad）:', moonPos._ra);
console.log('月亮赤纬（rad）:', moonPos._dec);

// 赤道转黄道
const obl = 23.4392911 * Math.PI / 180;
const ra = moonPos._ra;
const dec = moonPos._dec;
const moonLon = Math.atan2(
  Math.sin(ra) * Math.cos(obl) + Math.tan(dec) * Math.sin(obl),
  Math.cos(ra)
);
console.log('月亮黄经（deg）:', moonLon * 180 / Math.PI);

// 上升点 - 使用 astronomia 的 rise 模块（如果有）
console.log('');
console.log('Available modules:', Object.keys(a));

// 手动计算上升点
// LST = GMST + longitude
const gmstSec = a.sidereal.mean(jd);
const gmstDeg = (gmstSec / 3600) * 15;
const longitude = 120.15;
const lstDeg = (gmstDeg + longitude) % 360;
console.log('GMST (deg):', gmstDeg);
console.log('LST (deg):', lstDeg);

// 上升点公式
const lat = 30.27;
const lstRad = lstDeg * Math.PI / 180;
const latRad = lat * Math.PI / 180;
const oblRad = 23.4392911 * Math.PI / 180;

const y = -Math.cos(lstRad);
const x = Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(lstRad);
const ascRad = Math.atan2(y, x);
const ascDeg = (ascRad * 180 / Math.PI + 360) % 360;
console.log('');
console.log('上升点黄经（deg）:', ascDeg);
console.log('上升星座:', ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'][Math.floor(ascDeg/30)]);

// 等等，如果上升应该是巨蟹座（90-120度），那 LST 应该是多少？
// 反推：tan(ASC) = -cos(LST) / (sin(ε)·tan(φ) + cos(ε)·sin(LST))
// 设 ASC = 100度（巨蟹座中间）
const targetAsc = 100 * Math.PI / 180;
// 这是一个复杂的反推，让我用数值方法
console.log('');
console.log('=== 如果上升是巨蟹座（100度），LST应该是多少？===');
for (let testLst = 0; testLst < 360; testLst += 5) {
  const testLstRad = testLst * Math.PI / 180;
  const y2 = -Math.cos(testLstRad);
  const x2 = Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(testLstRad);
  const testAsc = (Math.atan2(y2, x2) * 180 / Math.PI + 360) % 360;
  if (Math.abs(testAsc - 100) < 5) {
    console.log(`LST = ${testLst}° -> 上升 = ${testAsc.toFixed(1)}°`);
  }
}
