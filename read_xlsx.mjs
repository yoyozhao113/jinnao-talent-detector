import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('C:/Users/sc/Desktop/行星与宫位对照表贝贝星盘矫正.xlsx');
console.log('Sheet names:', wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
data.forEach((row, i) => {
  if (row.some(c => c !== '')) console.log(`${i}: ${JSON.stringify(row)}`);
});
