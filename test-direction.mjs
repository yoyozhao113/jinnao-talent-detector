// 验证修复后的 eclipticToCanvas 方向是否正确
function eclipticToCanvas(lon, ascLon) {
  const delta = (lon - ascLon + 360) % 360;
  const canvasDeg = (180 - delta + 360) % 360;
  return canvasDeg * Math.PI / 180;
}

const toDeg = rad => ((rad * 180 / Math.PI) % 360 + 360) % 360;

const ascLon = 117.19;
const cusps = [117.19,140,166.45,197.88,232.63,266.55,297.19,320,346.45,17.88,52.63,86.55];

console.log('=== 关键方向验证（贝贝数据） ===');
console.log(`ASC  (117.19°) → ${toDeg(eclipticToCanvas(117.19, ascLon)).toFixed(1)}° （期望：180°=左边）`);
console.log(`MC   (17.88°)  → ${toDeg(eclipticToCanvas(17.88, ascLon)).toFixed(1)}° （期望：~270°=顶部）`);
console.log(`IC   (197.88°) → ${toDeg(eclipticToCanvas(197.88, ascLon)).toFixed(1)}° （期望：~90°=底部）`);
console.log(`DSC  (297.19°) → ${toDeg(eclipticToCanvas(297.19, ascLon)).toFixed(1)}° （期望：0°=右边）`);
console.log('');

console.log('=== 宫位中心方向（应逆时针递增） ===');
for (let i = 0; i < 12; i++) {
  const c1 = cusps[i], c2 = cusps[(i+1)%12];
  let mid = c1 + ((c2 - c1 + 360) % 360) / 2;
  if (mid >= 360) mid -= 360;
  const deg = toDeg(eclipticToCanvas(mid, ascLon));
  const direction = deg < 180 ? '左' : '右';
  console.log(`H${i+1} 中心 ${mid.toFixed(1)}° → ${deg.toFixed(1)}° （${deg<90?'顶部偏右':deg<180?'左':deg<270?'右':'底'}）`);
}
console.log('');
console.log('=== 判断：宫位是否逆时针排列 ===');
// 从 H1 到 H12，Canvas 角度应该递减（因为逆时针方向 = Canvas 角度减小）
let isCCW = true;
let prevDeg = null;
for (let i = 0; i < 12; i++) {
  const c1 = cusps[i], c2 = cusps[(i+1)%12];
  let mid = c1 + ((c2 - c1 + 360) % 360) / 2;
  if (mid >= 360) mid -= 360;
  const deg = toDeg(eclipticToCanvas(mid, ascLon));
  if (prevDeg !== null) {
    // 逆时针：Canvas 角度应该减小（因为从左到上到下到右）
    // 但实际上，H1 在左下方，H2 在下方，H3 在右下方... 角度递增 = 顺时针
    // 所以如果角度递增，就是顺时针（错误）；角度递减，就是逆时针（正确）
  }
  prevDeg = deg;
}
console.log('（需要人工判断截图）');
