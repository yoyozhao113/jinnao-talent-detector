// === SPA Router ===
const pages = ['loading', 'landing', 'star', 'result'];
let currentPage = 'loading';

function showPage(id) {
  pages.forEach(p => document.getElementById('page-' + p).classList.add('hidden'));
  const el = document.getElementById('page-' + id);
  if (el) el.classList.remove('hidden');
  currentPage = id;
  window.scrollTo(0, 0);
}

function navigateTo() {
  renderStarTest();
  showPage('star');
}

function goHome() {
  showPage('landing');
}

// === API ===
async function getReport(testType, answers, userInfo) {
  const res = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testType, answers, userInfo })
  });
  return res.json();
}

async function saveLead(wechat, testType, reportData) {
  await fetch('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wechat, testType, reportData })
  });
}

// === Loading Helper ===
function showLoading(containerId) {
  document.getElementById(containerId).innerHTML = `
    <div class="loading fade-in">
      <div class="spinner"></div>
      <p>🔮 AI 正在解读星盘...</p>
      <p style="font-size:12px;color:#bbb;margin-top:8px;">根据孩子的先天配置生成专属报告</p>
    </div>`;
}

// === Render Result Page ===
function renderResult(data) {
  const container = document.getElementById('page-result');
  const chart = data.chart;

  let html = `<button class="back-btn" onclick="goHome()">← 返回首页</button>`;
  html += `<div class="result-header fade-in">
    <h2>🌟 天赋解读报告</h2>
    <p>基于星盘+脑科学的先天特质分析</p>
  </div>`;

  // Star chart visualization
  if (chart) {
    html += `<div class="chart-container fade-in">
      <canvas id="zodiac-chart" width="300" height="300"></canvas>
      <div class="planet-summary">
        ${planetBadge('☀️ 太阳', chart.sun)}
        ${planetBadge('🌙 月亮', chart.moon)}
        ${planetBadge('⬆ 上升', chart.rising)}
        ${planetBadge('☿ 水星', chart.mercury)}
        ${planetBadge('🏠 4宫', chart.fourthHouse)}
        ${planetBadge('🏛 10宫', chart.tenthHouse)}
      </div>
    </div>`;
  }

  // Report sections (4 free sections)
  html += sectionBlock('🎭', '性格画像', data.personality, 0);
  html += sectionBlock('📚', '学习风格诊断', data.learningStyle, 1);
  html += sectionBlock('💗', '情绪底座', data.emotionBase, 2);
  html += sectionBlock('🏠', '家庭支持建议', data.familyAdvice, 3);

  // Locked section (pay to unlock)
  if (data.deepAnalysis) {
    html += lockedSection('🔮', '深层动力分析', data.deepAnalysis);
  }

  // Lead capture form
  html += renderLeadForm();
  html += '<div style="height:40px;"></div>';

  container.innerHTML = html;
  showPage('result');

  // Draw zodiac chart after DOM renders
  if (chart) setTimeout(() => drawZodiacChart(chart), 100);
}

function planetBadge(label, p) {
  if (!p) return '';
  return `<div class="planet-badge">
    <span class="planet-label">${label}</span>
    <span class="planet-sign">${p.sign}</span>
    <span class="planet-degree">${p.degree}°</span>
  </div>`;
}

function sectionBlock(icon, title, content, delay) {
  if (!content) return '';
  return `<div class="report-section fade-in" style="animation-delay:${delay * 0.12}s">
    <div class="section-header">
      <span class="section-icon">${icon}</span>
      <h3>${title}</h3>
    </div>
    <div class="section-body">
      <p>${content.replace(/\n/g, '<br>')}</p>
    </div>
  </div>`;
}

function lockedSection(icon, title, content) {
  return `<div class="report-section fade-in" style="animation-delay:0.48s;position:relative;">
    <div class="section-header">
      <span class="section-icon">${icon}</span>
      <h3>${title}</h3>
      <span class="paid-badge">💰 9.9元</span>
    </div>
    <div class="locked-overlay">
      <div class="locked-content">${content.replace(/\n/g, '<br>')}</div>
      <div class="locked-mask"></div>
    </div>
    <div class="locked-prompt">
      <div class="lock-icon">🔒</div>
      <p style="font-weight:600;font-size:15px;color:#333;">完整深度报告已生成</p>
      <p style="font-size:13px;color:#888;margin-bottom:14px;">添加微信支付9.9元，解锁全部内容</p>
    </div>
  </div>`;
}

// === Lead Form ===
const CONTACT_WECHAT = 'yoyozhao1341';

function renderLeadForm() {
  return `<div class="lead-form fade-in" id="lead-form">
    <div style="font-size:24px;margin-bottom:8px;">📱</div>
    <p style="font-size:16px;font-weight:600;margin-bottom:4px;">加微信领完整报告</p>
    <p style="font-size:13px;color:#888;margin-bottom:16px;">添加微信号，9.9元获取完整深度诊断报告</p>
    <p style="font-size:12px;color:#999;margin-bottom:6px;">👇 复制微信号添加</p>
    <div style="background:#fff;border-radius:10px;padding:14px;margin-bottom:12px;border:1.5px dashed #667eea40;">
      <p style="font-size:22px;font-weight:700;color:#667eea;letter-spacing:1px;user-select:all;" onclick="copyWechat()">${CONTACT_WECHAT}</p>
      <button class="btn btn-primary" style="margin-top:10px;padding:12px 0;font-size:15px;" onclick="copyWechat()">📋 复制微信号</button>
    </div>
    <div style="font-size:12px;color:#bbb;line-height:1.6;">
      添加时备注「天赋报告」优先通过<br>
      含：深度天赋分析 + 亲子沟通建议 + 教育路径规划
    </div>
  </div>`;
}

function copyWechat() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(CONTACT_WECHAT).then(showCopySuccess).catch(() => fallbackCopy(CONTACT_WECHAT));
  } else {
    fallbackCopy(CONTACT_WECHAT);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showCopySuccess();
}

function showCopySuccess() {
  const btn = document.querySelector('#lead-form .btn-primary');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = '✓ 已复制';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => showPage('landing'));
