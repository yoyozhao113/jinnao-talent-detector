import { calculateBirthChart } from './api/utils/astrology.mjs';

// 测试用例：2016年6月15日 12:00 北京时间（UTC+8），北京
// 太阳应该在双子座（约 84°）
const chart = calculateBirthChart({
  birthDate: '2016-06-15',
  birthHour: 12,
  birthMinute: 0,
  latitude: 39.9042,
  longitude: 116.4074,
});

console.log('===== 星盘计算结果 =====');
console.log('');
console.log('☀️ 太阳：', chart.sun.display, `(${chart.sun.sign})`, '宫位：', chart.sun.house, '宫');
console.log('🌙 月亮：', chart.moon.display, `(${chart.moon.sign})`, '宫位：', chart.moon.house, '宫');
console.log('✨ 上升：', chart.rising.display, `(${chart.rising.sign})`);
console.log('🏠 中天：', chart.mc.display);
console.log('');
console.log('===== 宫位 =====');
chart.houses.forEach(h => {
  console.log(`第${h.house}宫： cusp ${h.display}`);
});
console.log('');
console.log('===== 相位 =====');
if (chart.aspects.length === 0) {
  console.log('（无显著相位）');
} else {
  chart.aspects.forEach(a => console.log(a.display));
}
console.log('');
console.log('===== 格局 =====');
console.log('四宫格局：', chart.quadrantPattern.pattern);
console.log('资源格局：', chart.resource.patterns.join('；') || '无');
console.log('风险等级：', chart.risk.level);
chart.risk.warnings.forEach(w => console.log('  ⚠️', w));
console.log('');
console.log('===== 原始数据 =====');
console.log('JD：', chart._raw.jd);
console.log('LST（度）：', chart._raw.lstDeg.toFixed(2));
console.log('上升黄经（度）：', chart._raw.ascDeg.toFixed(2));
console.log('月亮黄经（度）：', chart._raw.moonLon.toFixed(2));
console.log('月亮黄纬（度）：', chart._raw.moonLat.toFixed(2));
