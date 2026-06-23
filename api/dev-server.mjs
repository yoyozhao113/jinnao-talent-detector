/**
 * 本地开发用 API 服务
 * 绕过 Vercel，直接处理 /api/chart 请求
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// 导入计算引擎和解读生成
const { calculateBirthChart } = await import('./utils/astrology.mjs');
const { generateReport } = await import('./chart.mjs');

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/api/chart' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { name, birthDate, birthHour, birthMinute, latitude, longitude, version } = data;

        if (!birthDate || latitude === undefined || longitude === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: '缺少必要参数' }));
          return;
        }

        const chart = calculateBirthChart({ birthDate, birthHour, birthMinute, latitude, longitude });
        const report = generateReport(chart, name || '宝贝', version || 'free');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, chart, report, version }));
      } catch (err) {
        console.error('API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 静态文件服务
  const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const fullPath = path.resolve(import.meta.url.replace('file:///', '').replace('/api/dev-server.mjs', ''), '.' + filePath);
  try {
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ API 本地服务已启动：http://localhost:${PORT}`);
  console.log(`   Proxying /api/chart -> calculateBirthChart`);
});
