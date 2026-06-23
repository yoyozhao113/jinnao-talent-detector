import { calculateBirthChart } from './api/utils/astrology.mjs';
import { getFallbackReport } from './api/chart.mjs';

const chart = calculateBirthChart({
  birthDate: '2020-01-01', birthHour: 12, birthMinute: 0,
  latitude: 30.2741, longitude: 120.1551
});

const report = getFallbackReport(chart, '测试', 'free');
console.log('SUCCESS - fallback works');
console.log('Report sun:', report?.chartSummary?.sun);
console.log('Report moon:', report?.chartSummary?.moon);
