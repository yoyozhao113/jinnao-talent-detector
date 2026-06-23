import { calculateBirthChart } from './api/utils/astrology.mjs';

// 贝贝的出生信息
const chart = calculateBirthChart({
  birthDate: '2013-07-05',
  birthHour: 6,
  birthMinute: 13,
  latitude: 30.27,   // 杭州纬度
  longitude: 120.15, // 杭州经度
});

console.log('===== 贝贝星盘验证 =====');
console.log('出生：2013-07-05 06:13 北京时间');
console.log('地点：杭州 (30.27°N, 120.15°E)');
console.log('');
console.log('☀️ 太阳：', chart.sun.display, `(${chart.sun.sign})`);
console.log('🌙 月亮：', chart.moon.display, `(${chart.moon.sign})`);
console.log('✨ 上升：', chart.rising.display, `(${chart.rising.sign})`);
console.log('🏠 中天：', chart.mc.display);
console.log('');
console.log('===== 原始数据 =====');
console.log('JD：', chart._raw.jd);
console.log('LST（本地恒星时）：', chart._raw.lstDeg.toFixed(4), '度');
console.log('上升黄经（度）：', chart._raw.ascDeg.toFixed(4));
console.log('');
console.log('===== 宫位 =====');
chart.houses.forEach(h => {
  console.log(`第${h.house}宫：${h.display}`);
});
