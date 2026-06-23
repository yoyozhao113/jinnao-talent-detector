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

console.log('发送数据长度:', Buffer.byteLength(data), '字节');
console.log('发送数据:', data);

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
    console.log('响应体:', body.substring(0, 300));
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e.message);
});

req.write(data);
req.end();

setTimeout(() => {
  console.log('等待中...');
}, 2000);
