import http from 'http';

const data = JSON.stringify({
  name: '测试',
  birthDate: '2020-01-01',
  birthHour: 12,
  birthMinute: 0,
  latitude: 30.2741,
  longitude: 120.1551,
  version: 'free'
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/chart',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const start = Date.now();
const req = http.request(options, (res) => {
  console.log('响应时间:', Date.now() - start, 'ms');
  console.log('状态码:', res.statusCode);
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('响应体长度:', body.length);
    try {
      const j = JSON.parse(body);
      console.log('success:', j.success);
      console.log('has chart:', !!j.chart);
      console.log('has report:', !!j.report);
      if (j.report) {
        console.log('报告摘要:', j.report.chartSummary);
      }
    } catch(e) {
      console.log('JSON解析错误:', e.message);
      console.log('原始响应:', body.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e.message);
});

req.write(data);
req.end();
