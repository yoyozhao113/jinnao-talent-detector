// === 星妈天赋测试 ===

const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
const SIGN_ELEMENT = { '白羊':'火','狮子':'火','射手':'火','金牛':'土','处女':'土','摩羯':'土','双子':'风','天秤':'风','水瓶':'风','巨蟹':'水','天蝎':'水','双鱼':'水' };
const ELEM_COLOR = { '火':'#FF6B6B','土':'#51CF66','风':'#FFD43B','水':'#4DABF7' };

let divisions = {};

function renderStarTest() {
  // Fetch province-city data
  if (Object.keys(divisions).length === 0) {
    fetch('/api/divisions').then(r => r.json()).then(data => {
      divisions = data;
      populateProvinces();
    }).catch(() => {});
  }

  document.getElementById('page-star').innerHTML = `
    <button class="back-btn" onclick="goHome()">← 返回首页</button>
    <div class="fade-in">
      <div style="text-align:center;padding:10px 0 20px;">
        <div style="font-size:40px;margin-bottom:6px;">🌟</div>
        <h2 style="font-size:22px;">星妈天赋测试</h2>
        <p style="font-size:13px;color:#888;margin-top:4px;">输入孩子信息，解锁先天天赋密码</p>
      </div>
      <div class="card">
        <div class="star-form">
          <label>👶 孩子昵称</label>
          <input type="text" id="star-name" placeholder="输入孩子昵称" maxlength="10">

          <label>📅 出生日期</label>
          <input type="date" id="star-birth" value="2016-06-15">

          <label>⏰ 出生时间</label>
          <input type="time" id="star-time" value="12:00" style="height:48px;font-size:16px;">
          <div style="font-size:12px;color:#aaa;margin:-12px 0 16px;line-height:1.6;">请尽量精确到分钟，越准确星盘越精确</div>

          <label>📍 出生省份</label>
          <select id="star-province" onchange="onProvinceChange()">
            <option value="">— 请选择省份 —</option>
          </select>

          <label>📍 出生城市</label>
          <select id="star-city" disabled>
            <option value="">— 请先选择省份 —</option>
          </select>
          <div style="font-size:12px;color:#aaa;margin:-8px 0 16px;line-height:1.6;">精确到城市，系统自动匹配经纬度计算星盘</div>

          <button class="btn btn-primary" onclick="submitStarTest()">✨ 生成天赋报告</button>
        </div>
      </div>
    </div>`;

  if (Object.keys(divisions).length > 0) populateProvinces();
}

function populateProvinces() {
  const sel = document.getElementById('star-province');
  if (!sel) return;
  sel.innerHTML = '<option value="">— 请选择省份 —</option>' +
    Object.keys(divisions).sort().map(p => `<option value="${p}">${p}</option>`).join('');
}

function onProvinceChange() {
  const province = document.getElementById('star-province').value;
  const citySel = document.getElementById('star-city');
  citySel.innerHTML = '<option value="">— 请选择城市 —</option>';
  citySel.disabled = !province;

  if (province && divisions[province]) {
    citySel.innerHTML += divisions[province].map(c =>
      `<option value="${c}">${c.replace('市', '').replace('地区', '').replace('自治州', '').replace('土家族苗族自治州', '').replace('苗族侗族自治州', '').replace('布依族苗族自治州', '').replace('傣族自治州', '').replace('藏族羌族自治州', '').replace('藏族自治州', '').replace('彝族苗族自治县', '').replace('蒙古自治州', '')}</option>`
    ).join('');
  }
}

async function submitStarTest() {
  const name = document.getElementById('star-name').value.trim() || '匿名宝宝';
  const birthDate = document.getElementById('star-birth').value;
  const birthTime = document.getElementById('star-time').value;
  const province = document.getElementById('star-province').value;
  const birthCity = document.getElementById('star-city').value;

  if (!birthDate) {
    document.getElementById('star-birth').style.borderColor = '#e53935';
    setTimeout(() => document.getElementById('star-birth').style.borderColor = '', 1500);
    return;
  }

  if (!province || !birthCity) {
    alert('请选择出生省份和城市');
    return;
  }

  showLoading('page-star');
  const result = await getReport('star', null, { name, birthDate, birthTime: birthTime || '12:00', birthCity, birthProvince: province });
  renderResult(result.data);
}

// === Zodiac Chart Canvas ===
function drawZodiacChart(chart) {
  const canvas = document.getElementById('zodiac-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 150, cy = 150, r = 130;

  ctx.clearRect(0, 0, 300, 300);

  for (let i = 0; i < 12; i++) {
    const a1 = (i * 30 - 90) * Math.PI / 180;
    const a2 = ((i + 1) * 30 - 90) * Math.PI / 180;
    const sign = SIGNS[i];
    const color = ELEM_COLOR[SIGN_ELEMENT[sign]] || '#ddd';

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a1, a2);
    ctx.closePath();
    ctx.fillStyle = color + '25';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const mid = (a1 + a2) / 2;
    ctx.fillStyle = '#555';
    ctx.font = '12px PingFang SC, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sign, cx + r * 0.82 * Math.cos(mid), cy + r * 0.82 * Math.sin(mid));
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.48, 0, 2 * Math.PI);
  ctx.fillStyle = '#f8f9fc';
  ctx.fill();
  ctx.strokeStyle = '#e8ecf4';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#667eea';
  ctx.font = 'bold 14px PingFang SC, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('星盘', cx, cy - 8);
  ctx.font = '11px PingFang SC, sans-serif';
  ctx.fillStyle = '#999';
  ctx.fillText('天赋解读', cx, cy + 12);

  const planets = [
    { label: '☀️', key: 'sun', color: '#FF6B6B' },
    { label: '🌙', key: 'moon', color: '#4DABF7' },
    { label: '↑', key: 'rising', color: '#51CF66' },
    { label: '☿', key: 'mercury', color: '#FFD43B' }
  ];

  planets.forEach(p => {
    const pl = chart[p.key];
    if (!pl) return;
    const si = SIGNS.indexOf(pl.sign);
    if (si === -1) return;
    const angle = ((si * 30 + (pl.degree || 0)) - 90) * Math.PI / 180;
    const x = cx + r * 0.66 * Math.cos(angle);
    const y = cy + r * 0.66 * Math.sin(angle);

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = p.color;
    ctx.font = 'bold 11px PingFang SC, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(p.label, x, y - 8);
  });
}
