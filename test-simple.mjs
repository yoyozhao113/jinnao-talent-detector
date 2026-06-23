import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/comments?reportType=star',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('状态码:', res.statusCode);
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('响应:', body.substring(0, 100));
  });
});

req.on('error', (e) => {
  console.error('错误:', e.message);
});

req.end();
