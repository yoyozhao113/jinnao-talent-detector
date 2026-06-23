import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');

// 贝贝：2013-07-05 06:13 北京时间，杭州
const utcDate = new Date(Date.UTC(2013, 6, 4, 22, 13, 0));
const jd = a.julian.DateToJD(utcDate);

const gmstDeg = (a.sidereal.mean(jd) / 3600) * 15;
const longitude = 120.15; // 东经

console.log('JD:', jd);
console.log('GMST:', gmstDeg.toFixed(2), '°');
console.log('Longitude:', longitude, '°E');
console.log('');

// 方法1: LST = GMST + longitude (东经)
const lst1 = (gmstDeg + longitude) % 360;
console.log('方法1 (GMST + longitude):', lst1.toFixed(2), '°');

// 方法2: LST = GMST - longitude (东经)
const lst2 = (gmstDeg - longitude + 360) % 360;
console.log('方法2 (GMST - longitude):', lst2.toFixed(2), '°');

// 方法3: 考虑反方向
const lst3 = (gmstDeg + 180 + longitude) % 360;
console.log('方法3 (GMST + 180 + longitude):', lst3.toFixed(2), '°');

// 计算各方法对应的上升点
const lat = 30.27;
const oblRad = 23.4392911 * Math.PI / 180;
const latRad = lat * Math.PI / 180;

function calcAsc(lstDeg) {
  const lstRad = lstDeg * Math.PI / 180;
  const y = -Math.cos(lstRad);
  const x = Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(lstRad);
  const ascRad = Math.atan2(y, x);
  return (ascRad * 180 / Math.PI + 360) % 360;
}

console.log('');
console.log('=== 各方法的上升点 ===');
console.log('方法1 LST:', lst1.toFixed(2), '° -> 上升:', calcAsc(lst1).toFixed(2), '°', `(星座: ${['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'][Math.floor(calcAsc(lst1)/30)]})`);
console.log('方法2 LST:', lst2.toFixed(2), '° -> 上升:', calcAsc(lst2).toFixed(2), '°', `(星座: ${['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'][Math.floor(calcAsc(lst2)/30)]})`);
console.log('方法3 LST:', lst3.toFixed(2), '° -> 上升:', calcAsc(lst3).toFixed(2), '°', `(星座: ${['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'][Math.floor(calcAsc(lst3)/30)]})`);

// 目标：上升在巨蟹座（90-120度）
console.log('');
console.log('目标：上升在巨蟹座（90-120度）');
console.log('根据反推，LST 应该在 200-215 度左右');

// 让我想想... 也许我对 LST 的理解有误
// LST 是 Local Sidereal Time，本地恒星时
// 它表示的是春分点相对于本地子午圈的时角
// 对于东经，LST = GMST + longitude 是对的

// 但也许上升点公式本身有问题？
// 让我用另一种方法计算上升点

console.log('');
console.log('=== 用另一种上升点公式验证 ===');
// 另一种公式：cos(θ) = cos(φ) · cos(δ) · cos(H) + sin(φ) · sin(δ)
// 其中 θ = 90° - 上升点黄纬（近似为0）
// φ = 纬度
// δ = 太阳赤纬
// H = 时角 = LST - 太阳赤经

// 简化：上升点 = atan2(-cos(LST), sin(ε)*tan(φ) + cos(ε)*sin(LST))
// 这个公式应该是对的，但也许我符号搞错了？

// 让我试试把 LST 加上 180 度
const lstPlus180 = (lst1 + 180) % 360;
console.log('LST + 180:', lstPlus180.toFixed(2), '° -> 上升:', calcAsc(lstPlus180).toFixed(2), '°');
