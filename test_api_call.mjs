import http from 'http';

const postData = JSON.stringify({
  name: '贝贝',
  birthDate: '2013-07-05',
  birthHour: 6,
  birthMinute: 13,
  latitude: 30.27,
  longitude: 120.15,
  version: 'free'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/chart',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      const planets = j.chart.basic.planets;
      const SIGNS_CN = {sun:'太阳',moon:'月亮',mercury:'水星',venus:'金星',mars:'火星',jupiter:'木星',saturn:'土星',uranus:'天王星',neptune:'海王星',pluto:'冥王星'};
      const names = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
      console.log('=== 行星 ===');
      for (const n of names) {
        console.log(`${SIGNS_CN[n]}: ${planets[n].display}  (落在${planets[n].house}宫)`);
      }
      console.log(`\n上升 ASC: ${planets.rising.display}`);
      console.log(`中天 MC: ${planets.mc.display}`);
      console.log('\n=== 宫位 ===');
      for (const h of j.chart.basic.houses) {
        console.log(`${h.house}宫: ${h.display}`);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.error('Raw data:', data.substring(0, 500));
    }
  });
});

req.on('error', e => console.error('Request error:', e.message));
req.write(postData);
req.end();
