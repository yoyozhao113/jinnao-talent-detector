/**
 * 优势星测 - 主入口
 * Step 1: 首页 → Step 2: 填信息/答题 → Step 3: 报告
 */
import { CITIES } from './data/cities.js';
import { drawChartWheel } from './chart-wheel.mjs';

// ========== State ==========
let currentTestType = null;   // 'strength' | 'star'
let currentReport = null;
let currentVersion = 'free';

// 星盘表单暂存数据（预算页使用）
let starFormData = null;

// 性格测试状态
let strengthState = { current: 0, answers: {} };

// 微信号
const CONTACT_WECHAT = 'yoyozhao1341';

// ========== DOM ==========
const $ = id => document.getElementById(id);
const pages = { home: $('page-home'), form: $('page-form'), budget: $('page-budget'), loading: $('page-loading'), report: $('page-report') };

function showPage(name) {
  Object.values(pages).forEach(p => p?.classList.remove('active'));
  if (pages[name]) pages[name].classList.add('active');
  window.scrollTo(0, 0);
}

// ========== 导航 ==========
window.goHome = () => { showPage('home'); currentReport = null; currentTestType = null; starFormData = null; };

window.goToStep2 = (type) => {
  currentTestType = type;
  renderForm(type);
  showPage('form');
};

function goToStep3() { showPage('report'); }

// ========== 渲染 Step 2 ==========
function renderForm(type) {
  if (type === 'star') renderStarForm();
  else renderStrengthQuiz();
}

// ========== 渲染 Step 3 ==========
function renderStep3() {
  if (currentTestType === 'star') {
    $('star-report-area').classList.remove('hidden');
    $('strength-report-area').classList.add('hidden');
  } else {
    $('star-report-area').classList.add('hidden');
    $('strength-report-area').classList.remove('hidden');
  }
  goToStep3();
}

// ================================================================
//  星盘测试表单（原有逻辑）
// ================================================================

function renderStarForm() {
  $('form-content').innerHTML = `
    <div class="header">
      <h1 class="logo">🌟 星盘天赋解读</h1>
      <p class="subtitle">输入出生信息，生成专属星盘</p>
    </div>
    <form id="birth-form" class="form-card">
      <div class="form-group">
        <label>孩子昵称</label>
        <input type="text" id="child-name" placeholder="如：小宝" maxlength="10" required />
      </div>
      <div class="form-group">
        <label>出生日期</label>
        <input type="date" id="birth-date" required />
      </div>
      <div class="form-row">
        <div class="form-group half">
          <label>时</label>
          <select id="birth-hour"><option value="">未知</option>
            ${Array.from({length:24},(_,i)=>`<option value="${i}">${String(i).padStart(2,'0')} 时</option>`).join('')}
          </select>
        </div>
        <div class="form-group half">
          <label>分</label>
          <select id="birth-minute"><option value="">未知</option>
            ${Array.from({length:60},(_,i)=>`<option value="${i}">${String(i).padStart(2,'0')} 分</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>出生城市</label>
        <select id="city-select"><option value="">请选择城市</option></select>
      </div>
      <div class="form-group compact" id="manual-coords" style="display:none;">
        <p class="hint-text">请手动输入经纬度</p>
        <div class="form-row">
          <div class="form-group half"><label>纬度</label><input type="number" id="latitude" step="0.0001" placeholder="30.2741" /></div>
          <div class="form-group half"><label>经度</label><input type="number" id="longitude" step="0.0001" placeholder="120.1551" /></div>
        </div>
      </div>
      <div class="version-select">
        <p class="version-label">选择报告版本</p>
        <div class="version-cards">
          <label class="version-card active" data-version="free">
            <input type="radio" name="version" value="free" checked hidden />
            <span class="version-badge free">免费</span>
            <span class="version-name">基础版</span>
            <span class="version-features">日月升+宫位+相位</span>
          </label>
          <label class="version-card" data-version="paid">
            <input type="radio" name="version" value="paid" hidden />
            <span class="version-badge premium">¥9.9</span>
            <span class="version-name">深度版</span>
            <span class="version-features">+格局+资源+风险</span>
          </label>
        </div>
      </div>
      <button type="submit" class="btn-primary">开始解读</button>
    </form>`;

  // 重新初始化星盘表单逻辑
  initCitySelect();
  initVersionCards();
  setDefaultDate();

  $('birth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleStarSubmit();
  });
}

function initCitySelect() {
  const select = $('city-select');
  if (!select) return;
  select.innerHTML = '<option value="">请选择城市</option>' +
    Object.keys(CITIES).sort((a,b) => a.localeCompare(b, 'zh-CN')).map(c => `<option value="${c}">${c}</option>`).join('') +
    '<option value="_other_">其他城市（手动输入经纬度）</option>';

  select.addEventListener('change', () => {
    const v = select.value;
    if (v && v !== '_other_') {
      const city = CITIES[v];
      $('latitude').value = city.lat;
      $('longitude').value = city.lng;
      $('manual-coords').style.display = 'none';
    } else if (v === '_other_') {
      $('latitude').value = ''; $('longitude').value = '';
      $('manual-coords').style.display = 'flex';
    } else {
      $('manual-coords').style.display = 'none';
    }
  });
}

function initVersionCards() {
  document.querySelectorAll('.version-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.version-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      card.querySelector('input[type="radio"]').checked = true;
      currentVersion = card.dataset.version;
    });
  });
}

function setDefaultDate() {
  const d = new Date(); d.setFullYear(d.getFullYear() - 10);
  const el = $('birth-date'); if (el) el.value = d.toISOString().split('T')[0];
}

async function handleStarSubmit() {
  const name = ($('child-name')?.value || '宝贝').trim();
  const birthDate = $('birth-date')?.value;
  const birthHour = $('birth-hour')?.value ? parseInt($('birth-hour').value) : 12;
  const birthMinute = $('birth-minute')?.value ? parseInt($('birth-minute').value) : 0;
  const cityVal = $('city-select')?.value;
  if (!birthDate || !cityVal) { showToast('请填写完整信息'); return; }

  let lat, lng;
  if (cityVal !== '_other_') { const c = CITIES[cityVal]; lat = c.lat; lng = c.lng; }
  else { lat = parseFloat($('latitude')?.value); lng = parseFloat($('longitude')?.value); if (isNaN(lat)||isNaN(lng)) { showToast('请输入经纬度'); return; }}

  // 保存表单数据，跳转到预算选填页
  starFormData = { name, birthDate, birthHour, birthMinute, lat, lng, version: currentVersion };
  renderBudgetForm();
  showPage('budget');
}

// ================================================================
//  预算/成绩选填页
// ================================================================

function renderBudgetForm() {
  $('budget-content').innerHTML = `
    <div class="header">
      <h1 class="logo">📊 补充信息（选填）</h1>
      <p class="subtitle">填写后可获得更精确的解读建议</p>
    </div>
    <div class="form-card">
      <div class="budget-notice">
        填写家庭预算和孩子的成绩情况，AI 会结合星盘给出更贴合实际的建议。<br>
        不填也能出报告，但精度会降低。
      </div>
      <div class="form-group">
        <label>家庭年教育预算</label>
        <select id="budget-select">
          <option value="">暂不填写</option>
          <option value="survival">5万以内/年 — 生存型</option>
          <option value="working">10-20万/年 — 工薪务实</option>
          <option value="middle">50-100万/年 — 中产精英</option>
          <option value="capital">200万以上/年 — 资本型</option>
        </select>
      </div>
      <div class="form-group">
        <label>孩子当前成绩段位</label>
        <select id="grade-select">
          <option value="">暂不填写</option>
          <option value="ssr">王者 SSR — 年级 Top 1%</option>
          <option value="sr">钻石 SR — 211/一本线水平</option>
          <option value="r">黄金 R — 中等水平</option>
          <option value="n">青铜 N — 不及格/厌学</option>
        </select>
      </div>
      <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px;">
        <button class="btn-primary" onclick="handleBudgetSubmit()">生成完整解读报告</button>
        <button class="btn-back" onclick="skipBudget()" style="width:100%;">跳过，直接出报告</button>
      </div>
    </div>
  `;
}

window.backFromBudget = () => {
  showPage('form');
};

window.handleBudgetSubmit = async () => {
  const budget = $('budget-select')?.value || '';
  const grade = $('grade-select')?.value || '';
  await doStarReport(starFormData, budget, grade);
};

window.skipBudget = async () => {
  await doStarReport(starFormData, '', '');
};

async function doStarReport(formData, budget, grade) {
  showLoading('AI 星盘计算中...', '正在解读孩子的天生密码');
  try {
    // 读取推广员引用
    const distributorRef = localStorage.getItem('distributor_ref_code') || '';

    const res = await fetch('/api/chart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        birthDate: formData.birthDate,
        birthHour: formData.birthHour,
        birthMinute: formData.birthMinute,
        latitude: formData.lat,
        longitude: formData.lng,
        version: formData.version,
        budget: budget || undefined,
        grade: grade || undefined,
        distributor: distributorRef || undefined
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '计算失败');

    currentReport = data;
    renderReport(data.report, formData.version);
    const wheelResult = drawChartWheel('chart-wheel', data.chart);
    setupAspectBadge(wheelResult);
    renderStep3();
  } catch (err) {
    showToast('计算失败：' + err.message);
    showPage('form');
  }
}

// ================================================================
//  性格优势测试
// ================================================================

const STRENGTH_QUESTIONS = [
  { id: 'wisdom1', text: '面对复杂问题时，我喜欢从多角度思考，不急于下结论。', cat: '智慧' },
  { id: 'wisdom2', text: '我经常能发现别人忽略的细节和联系。', cat: '智慧' },
  { id: 'wisdom3', text: '朋友们遇到难题时，喜欢找我帮忙分析。', cat: '智慧' },
  { id: 'courage1', text: '即使有风险，我也愿意站出来维护自己认为对的事。', cat: '勇气' },
  { id: 'courage2', text: '面对挫折时，我通常能很快调整并继续前进。', cat: '勇气' },
  { id: 'courage3', text: '我敢于表达与他人不同的观点。', cat: '勇气' },
  { id: 'humanity1', text: '我很善于察觉别人的情绪和需求。', cat: '仁爱' },
  { id: 'humanity2', text: '帮助别人取得成就会让我很开心。', cat: '仁爱' },
  { id: 'humanity3', text: '朋友难过时，常是我第一个被倾诉的对象。', cat: '仁爱' },
  { id: 'justice1', text: '在团队中，我很注重公平，不偏袒任何人。', cat: '正义' },
  { id: 'justice2', text: '我擅长组织协调，让大家一起把事做成。', cat: '正义' },
  { id: 'temperance1', text: '即使很生气，我也能控制自己不说过激的话。', cat: '节制' },
  { id: 'temperance2', text: '我做决定前习惯权衡利弊，不冲动行事。', cat: '节制' },
  { id: 'transcendence1', text: '我经常能感受到生活中的美好，并心怀感激。', cat: '超越' },
  { id: 'transcendence2', text: '我相信每件事的发生都有它的意义。', cat: '超越' },
];

const OPTIONS = ['完全不符', '不太符合', '一般', '比较符合', '完全符合'];
const OPT_VALS = [1, 2, 3, 4, 5];

function renderStrengthQuiz() {
  strengthState = { current: 0, answers: {} };

  $('form-content').innerHTML = `
    <div class="quiz-container">
      <div class="quiz-header">
        <h2>性格优势测试</h2>
        <p>共 ${STRENGTH_QUESTIONS.length} 题，预计 3 分钟</p>
      </div>
      <div id="quiz-area">
        <div class="quiz-progress">
          <div class="quiz-bar"><div class="quiz-fill" id="quiz-fill" style="width:0%"></div></div>
          <div class="quiz-count" id="quiz-count">1 / ${STRENGTH_QUESTIONS.length}</div>
        </div>
        <div class="quiz-question" id="quiz-question"></div>
        <div class="quiz-options" id="quiz-options"></div>
        <div class="quiz-nav">
          <button class="btn btn-prev" id="quiz-prev" onclick="strengthPrev()" style="display:none;">← 上一题</button>
          <button class="btn btn-next" id="quiz-next" onclick="strengthNext()">下一题 →</button>
        </div>
      </div>
      <div id="quiz-submit-area" class="hidden" style="text-align:center;padding:30px 0;">
        <p style="font-size:1rem;margin-bottom:6px;color:#e8e6f0;">所有题目已答完！</p>
        <p style="font-size:0.85rem;color:#8888a0;margin-bottom:16px;">请输入昵称，将生成专属报告</p>
        <input class="input-field" id="strength-name" placeholder="你的昵称（选填）" maxlength="10" style="margin-bottom:12px;" />
        <button class="btn-next" onclick="submitStrength()">生成报告</button>
      </div>
    </div>`;

  showQuestion(0);
}

function showQuestion(idx) {
  const q = STRENGTH_QUESTIONS[idx];
  const total = STRENGTH_QUESTIONS.length;
  $('quiz-fill').style.width = `${((idx + 1) / total) * 100}%`;
  $('quiz-count').textContent = `${idx + 1} / ${total}`;
  $('quiz-question').innerHTML = `<span class="quiz-cat">${q.cat}</span>${q.text}`;

  $('quiz-options').innerHTML = OPTIONS.map((label, i) =>
    `<div class="quiz-opt ${strengthState.answers[q.id] === OPT_VALS[i] ? 'selected' : ''}"
         onclick="selectOpt(${i})">${label}</div>`
  ).join('');

  $('quiz-prev').style.display = idx === 0 ? 'none' : 'block';
  $('quiz-next').textContent = idx === total - 1 ? '完成' : '下一题 →';
}

window.selectOpt = (valIdx) => {
  const q = STRENGTH_QUESTIONS[strengthState.current];
  strengthState.answers[q.id] = OPT_VALS[valIdx];
  document.querySelectorAll('#quiz-options .quiz-opt').forEach((el, i) => {
    el.classList.toggle('selected', i === valIdx);
  });
};

window.strengthNext = () => {
  const q = STRENGTH_QUESTIONS[strengthState.current];
  if (!strengthState.answers[q.id]) { showToast('请选择一个选项'); return; }
  if (strengthState.current === STRENGTH_QUESTIONS.length - 1) {
    $('quiz-area').classList.add('hidden');
    $('quiz-submit-area').classList.remove('hidden');
    return;
  }
  strengthState.current++;
  showQuestion(strengthState.current);
};

window.strengthPrev = () => {
  if (strengthState.current > 0) { strengthState.current--; showQuestion(strengthState.current); }
};

window.submitStrength = async function() {
  showLoading('AI 分析中...', '正在生成你的性格优势报告');

  // 计算各维度得分
  const catScores = {};
  STRENGTH_QUESTIONS.forEach(q => {
    const v = strengthState.answers[q.id] || 3;
    catScores[q.cat] = (catScores[q.cat] || 0) + v;
  });

  const normalized = {};
  const catCount = {};
  STRENGTH_QUESTIONS.forEach(q => { catCount[q.cat] = (catCount[q.cat] || 0) + 1; });
  Object.entries(catScores).forEach(([cat, val]) => {
    normalized[cat] = Math.round((val / ((catCount[cat] || 1) * 5)) * 100);
  });

  const name = $('strength-name')?.value?.trim() || '';

  try {
    const res = await fetch('/api/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: normalized, name })
    });
    const data = await res.json();
    currentReport = data.data;
    renderStrengthReport(data.data, name);
    renderStep3();
  } catch (err) {
    showToast('生成失败，请重试');
    showPage('form');
  }
}

function renderStrengthReport(data, name) {
  // 将维度详解按行拆分，每行作为独立条目
  const detailItems = data.details ? data.details.split('\n').filter(Boolean) : [];

  $('strength-result').innerHTML = `
    <div class="sr-header">
      <h2>${name || '你'}的性格优势报告</h2>
      <p>AI 为你生成的个性化解读</p>
    </div>
    ${data.tag ? `<div class="sr-badge-wrap"><span class="sr-badge">${data.tag}</span></div>` : ''}
    ${data.summary ? `<div class="sr-card"><h4>📊 整体评估</h4><p>${data.summary}</p></div>` : ''}
    ${detailItems.length ? `
    <div class="sr-card">
      <h4>🔍 维度详解</h4>
      ${detailItems.map(line => {
        // 尝试提取维度名称（如 "智慧维度（80分）：..."）
        const colonIdx = line.indexOf('：');
        if (colonIdx > 0 && colonIdx < 20) {
          const cat = line.substring(0, colonIdx);
          const desc = line.substring(colonIdx + 1);
          return `<div class="sr-detail-item"><div class="sr-detail-cat">${cat}</div><p style="margin:0;">${desc}</p></div>`;
        }
        // 尝试提取编号项（如 "1. ..." 或 "① ..."）
        const dotIdx = line.indexOf('.');
        if (dotIdx > 0 && dotIdx < 4) {
          const num = line.substring(0, dotIdx + 1);
          const rest = line.substring(dotIdx + 1);
          return `<div class="sr-detail-item"><p style="margin:0;">${line}</p></div>`;
        }
        return `<div class="sr-detail-item"><p style="margin:0;">${line}</p></div>`;
      }).join('')}
    </div>` : (data.details ? `<div class="sr-card"><h4>🔍 维度详解</h4><p>${data.details}</p></div>` : '')}
    ${data.advice ? `<div class="sr-card"><h4>💡 行动建议</h4><p>${renderFormattedAdvice(data.advice)}</p></div>` : ''}
    ${renderLeadBox()}
  `;
  setTimeout(() => renderCommentSection('strength'), 100);
}

function renderFormattedAdvice(text) {
  // 把数字编号的建议加粗显示
  return text.replace(/(\d+[\.\、\s])/g, '<strong style="color:#5b9af5;">$1</strong>');
}

// ================================================================
//  引导加微信
// ================================================================

function renderLeadBox() {
  return `
    <div class="lead-box">
      <p> <strong>加微信获取完整报告</strong></p>
      <p style="font-size:0.8rem;margin-bottom:8px;">复制微信号添加，发送完整深度报告</p>
      <div class="lead-wechat" onclick="copyWechat()">${CONTACT_WECHAT}</div>
      <button class="lead-btn" onclick="copyWechat()"> 复制微信号</button>
    </div>`;
}

window.copyWechat = () => {
  const t = CONTACT_WECHAT;
  if (navigator.clipboard) { navigator.clipboard.writeText(t).then(() => showToast('已复制')).catch(() => {}); }
  else { const ta = document.createElement('textarea'); ta.value = t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('已复制'); }
};

// ================================================================
//  Loading
// ================================================================

function showLoading(text, hint) {
  $('loading-text').textContent = text || 'AI 分析中...';
  $('loading-hint').textContent = hint || '正在生成你的专属报告';
  showPage('loading');
}

// ================================================================
//  星盘报告渲染（原有逻辑）
// ================================================================

function renderReport(report, version) {
  const badge = $('report-badge');
  badge.textContent = version === 'paid' ? '深度版 ¥9.9' : '免费版';
  badge.className = `report-badge ${version}`;
  $('report-title').textContent = `${report.name || '宝贝'}的专属星盘解读`;
  const summary = report.chartSummary || {};
  $('report-summary').textContent = `太阳：${summary.sun || '--'} | 月亮：${summary.moon || '--'} | 上升：${summary.rising || '--'}`;

  let html = `<div class="chart-summary">`;
  html += `<div class="chart-pill"><div class="pill-label">太阳</div><div class="pill-value">${summary.sun ? summary.sun.replace(/[°′].*/, '') : '--'}</div></div>`;
  html += `<div class="chart-pill"><div class="pill-label">月亮</div><div class="pill-value">${summary.moon ? summary.moon.replace(/[°′].*/, '') : '--'}</div></div>`;
  html += `<div class="chart-pill"><div class="pill-label">上升</div><div class="pill-value">${summary.rising ? summary.rising.replace(/[°′].*/, '') : '--'}</div></div>`;
  html += `</div>`;

  (report.sections || []).forEach(section => { html += renderSection(section); });
  $('report-content').innerHTML = html;

  const footer = $('report-footer');
  if (report.footer) {
    footer.innerHTML = `<div class="report-footer-inner">${report.footer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>`;
  } else {
    footer.innerHTML = renderLeadBox();
  }

  renderCommentSection('star');

  // 在报告底部追加五者天赋提示
  const talentPromptEl = renderTalentPrompt();
  const reportContainer = $('report-content').parentElement;
  if (reportContainer && !document.getElementById('talent-prompt')) {
    talentPromptEl.id = 'talent-prompt';
    // 插入到 footer 之后、actions 之前
    const actionsEl = reportContainer.querySelector('.report-actions');
    if (actionsEl) {
      reportContainer.insertBefore(talentPromptEl, actionsEl);
    } else {
      reportContainer.appendChild(talentPromptEl);
    }
  }
}

function renderSection(section) {
  let html = `<div class="report-section">`;
  html += `<h3>${section.title || ''}</h3>`;
  if (section.subtitle) html += `<div class="section-subtitle">${section.subtitle}</div>`;
  if (section.tags && section.tags.length) {
    html += `<div class="section-tags">${section.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`;
  }
  const c = section.content;
  if (!c) { html += `</div>`; return html; }
  switch (section.id) {
    case 'sun': html += renderSun(c); break;
    case 'moon': html += renderMoon(c); break;
    case 'rising': html += renderRising(c); break;
    case 'houses': html += renderHouses(c); break;
    case 'aspects': html += renderAspects(c); break;
    case 'quadrant': html += renderQuadrant(c); break;
    case 'resource': html += renderResource(c); break;
    case 'risk': html += renderRisk(c); break;
    case 'mercury': html += renderMercury(c); break;
    case 'talent': html += renderAstroTalent(c); break;
    case 'emotion': html += renderEmotion(c); break;
    case 'edu_path': html += renderEduPath(c); break;
    case 'edu_plan': html += renderEduPlan(c); break;
    case 'summary': html += renderSummary(c); break;
    case 'major': html += renderMajor(c); break;
    case 'paywall': html += renderPaywall(section); break;
    default: if (typeof c === 'string') html += `<div class="value">${c}</div>`;
  }
  html += `</div>`;
  return html;
}

function renderSun(c) { return `<div class="content-block"><div class="label">孩子的性格</div><div class="value">${c.child||''}</div></div><div class="content-block"><div class="label">给父母的建议</div><div class="value">${c.parent||''}</div></div><div class="content-block"><div class="label">学习建议</div><div class="value">${c.edu||''}</div></div><div class="content-block"><div class="label">天生优势</div><div class="value">${c.strength||''}</div></div><div class="content-block"><div class="label">成长挑战</div><div class="value">${c.challenge||''}</div></div>`; }
function renderMoon(c) { return `<div class="content-block"><div class="label">情绪特点</div><div class="value">${c.child||''}</div></div><div class="content-block"><div class="label">父母的回应方式</div><div class="value">${c.parent||''}</div></div><div class="content-block"><div class="label">情感需求</div><div class="value">${c.need||''}</div></div>`; }
function renderRising(c) { return `<div class="content-block"><div class="label">给人的印象</div><div class="value">${c.desc||''}</div></div><div class="content-block"><div class="label">外在表现</div><div class="value">${c.appearance||''}</div></div><div class="content-block"><div class="label">社交风格</div><div class="value">${c.social||''}</div></div>`; }

function renderHouses(houses) {
  // 兼容字符串和数组两种格式
  if (typeof houses === 'string') {
    return `<div class="value" style="padding:4px 0;line-height:1.8;">${houses}</div>`;
  }
  if (!houses || !houses.length) return '<div style="color:#8888a0;">暂无宫位数据</div>';
  const housePlanets = {};
  try {
    const planetsData = currentReport?.chart?.planets;
    if (planetsData && typeof planetsData === 'object') {
      Object.values(planetsData).forEach(p => {
        if (p && typeof p.house === 'number') {
          if (!housePlanets[p.house]) housePlanets[p.house] = [];
          housePlanets[p.house].push(p.name || '');
        }
      });
    }
  } catch (e) { /* ignore planet mapping errors */ }
  let html = `<div class="house-list">`;
  houses.forEach(h => {
    const ps = housePlanets[h.house] || [];
    const planetStr = ps.length ? ` <span style="color:#5b9af5;font-size:0.8rem;">[${ps.join(', ')}]</span>` : '';
    html += `<div class="house-item"><div class="house-name">第${h.house}宫：${h.sign}${planetStr}</div><div class="house-desc">${h.desc||h.keyword||''}</div></div>`;
  });
  html += `</div>`; return html;
}

function renderAspects(aspects) {
  // 兼容字符串和数组两种格式
  if (typeof aspects === 'string') {
    return `<div class="value" style="padding:4px 0;line-height:1.8;">${aspects}</div>`;
  }
  if (!aspects || !aspects.length) return '<div style="color:#8888a0;padding:8px;">未发现显著相位</div>';
  let html = `<div class="aspect-list">`;
  aspects.forEach(a => { html += `<div class="aspect-item"><div>${a.display||''}</div>${a.interpretation ? `<div style="color:#8888a0;font-size:0.8rem;margin-top:4px;">${a.interpretation}</div>` : ''}</div>`; });
  html += `</div>`; return html;
}

function renderAstroTalent(c) {
  return `
    <div class="content-block"><div class="label">天赋类型</div><div class="value">${c.type||'综合型'}</div></div>
    <div class="content-block"><div class="label">天赋描述</div><div class="value" style="line-height:1.8;">${c.description||''}</div></div>
    ${c.brainAdvantage ? `<div class="content-block"><div class="label">🧬 <strong style="color:#FBBF24;">大脑优势</strong></div><div class="value">${c.brainAdvantage}</div></div>` : ''}
    ${c.eduStrategy ? `<div class="content-block"><div class="label">教育策略</div><div class="value">${c.eduStrategy}</div></div>` : ''}
    ${c.parentAdvice ? `<div class="content-block"><div class="label">家长建议</div><div class="value">${c.parentAdvice}</div></div>` : ''}
  `;
}

function renderQuadrant(c) { return `<div class="content-block"><div class="label">能量格局</div><div class="value">${c.pattern||''}</div></div><div class="content-block"><div class="label">解读</div><div class="value">${c.interpretation||''}</div></div>`; }

function renderResource(c) {
  // 兼容DeepSeek新格式（pattern/strengths/potential/advantage）和旧引擎格式（patterns/score）
  if (c.pattern || c.strengths) {
    return `
      <div class="content-block"><div class="label">能量格局</div><div class="value">${c.pattern||''}</div></div>
      ${c.strengths ? `<div class="content-block"><div class="label">核心天赋资源</div><div class="value" style="white-space:pre-line;">${c.strengths}</div></div>` : ''}
      ${c.potential ? `<div class="content-block"><div class="label">待开发潜力</div><div class="value">${c.potential}</div></div>` : ''}
      ${c.advantage ? `<div class="content-block"><div class="label">竞争优势</div><div class="value">${c.advantage}</div></div>` : ''}
    `;
  }
  // 旧格式回退
  if (!c.patterns || !c.patterns.length) return '<div style="color:#8888a0;padding:8px;">暂未发现显著资源格局</div>';
  let html = `<div style="color:#66bb6a;font-size:0.9rem;margin-bottom:8px;">资源评分：${c.score||0}/10</div>`;
  (c.patterns||[]).forEach((p,i) => { html += `<div class="content-block"><div class="value" style="color:#5b9af5;">🌟 ${p}</div>${c.interpretations&&c.interpretations[i]?`<div style="color:#9898b0;font-size:0.85rem;margin-top:4px;">${c.interpretations[i]}</div>`:''}</div>`; });
  return html;
}

function renderRisk(c) {
  // 兼容DeepSeek新格式（level/warnings/mitigation/timelyWarning）和旧引擎格式
  if (c.warnings || c.mitigation) {
    const cls = c.level==='低'?'risk-low':c.level==='中'?'risk-mid':'risk-high';
    let html = c.level ? `<div style="margin-bottom:12px;"><span>风险等级：</span><span class="risk-level ${cls}">${c.level||'未知'}</span></div>` : '';
    if (c.warnings && Array.isArray(c.warnings)) {
      c.warnings.forEach(w => { html += `<div class="content-block"><div class="value" style="font-size:0.85rem;">⚠ ${w}</div></div>`; });
    } else if (typeof c.warnings === 'string') {
      html += `<div class="content-block"><div class="value" style="font-size:0.85rem;white-space:pre-line;">⚠ ${c.warnings}</div></div>`;
    }
    if (c.mitigation) html += `<div class="content-block"><div class="label">预防与应对</div><div class="value" style="white-space:pre-line;">${c.mitigation}</div></div>`;
    if (c.timelyWarning) html += `<div class="edu-plan-pain" style="margin-top:10px;"><span class="pain-icon">!</span><span>${c.timelyWarning}</span></div>`;
    return html;
  }
  // 旧格式回退
  const cls = c.level==='低'?'risk-low':c.level==='中'?'risk-mid':'risk-high';
  let html = `<div style="margin-bottom:12px;"><span>风险等级：</span><span class="risk-level ${cls}">${c.level||'未知'}</span></div>`;
  (c.warnings||[]).forEach(w => { html += `<div class="content-block"><div class="value" style="font-size:0.85rem;">⚠ ${w}</div></div>`; });
  if (c.interpretation) html += `<div class="content-block"><div class="label">成长建议</div><div class="value">${c.interpretation}</div></div>`;
  return html;
}

function renderMercury(c) {
  return `
    <div class="content-block">
      <div class="label">思维梯队</div>
      <div class="value" style="color:#5b9af5;">${c.tier||''}${c.tier&&c.keyword ? ' · ' : ''}${c.keyword||''}</div>
    </div>
    <div class="content-block">
      <div class="label">最佳学习方式</div>
      <div class="value">${c.style||''}</div>
    </div>
    ${c.strategy ? `
    <div class="content-block">
      <div class="label">提分必杀技</div>
      <div class="value">${c.strategy}</div>
    </div>` : ''}
    ${c.avoid ? `
    <div class="content-block">
      <div class="label">🚫 绝对雷区</div>
      <div class="value" style="color:#ef5350;">${c.avoid}</div>
    </div>` : ''}
  `;
}

function renderTalent(c) {
  return `
    ${c.type ? `<div style="text-align:center;margin-bottom:12px;"><span class="sr-badge">${c.type}</span></div>` : ''}
    <div class="content-block">
      <div class="label">天赋描述</div>
      <div class="value">${c.description||''}</div>
    </div>
    ${c.brainAdvantage ? `<div class="content-block"><div class="label">🧬 <strong style="color:#FBBF24;">大脑优势</strong></div><div class="value">${c.brainAdvantage}</div></div>` : ''}
    ${c.eduStrategy ? `<div class="content-block"><div class="label">🎓 教育策略</div><div class="value">${c.eduStrategy}</div></div>` : ''}
    ${c.parentAdvice ? `<div class="content-block"><div class="label">家长建议</div><div class="value">${c.parentAdvice}</div></div>` : ''}
  `;
}

function renderEmotion(c) {
  return `
    <div class="content-block">
      <div class="label">💭 情绪模式</div>
      <div class="value">${c.pattern||''}</div>
    </div>
    <div class="content-block">
      <div class="label">🔐 安全感来源</div>
      <div class="value" style="color:#66bb6a;">${c.security||''}</div>
    </div>
    <div class="content-block">
      <div class="label">🤗 最佳安抚方式</div>
      <div class="value">${c.soothe||''}</div>
    </div>
    ${c.momReflection ? `<div class="content-block"><div class="label">👩 母亲形象参考</div><div class="value">${c.momReflection}</div></div>` : ''}
    ${c.communication ? `<div class="content-block"><div class="label">💬 家长沟通策略</div><div class="value" style="color:#5b9af5;">${c.communication}</div></div>` : ''}
  `;
}

function renderEduPath(c) {
  return `
    ${c.pathType ? `<div style="text-align:center;margin-bottom:12px;"><span class="sr-badge" style="font-size:0.85rem;">${c.pathType}</span></div>` : ''}
    <div class="content-block">
      <div class="label">🗺️ 路径说明</div>
      <div class="value">${c.pathDescription||''}</div>
    </div>
    ${c.suitableProfile ? `<div class="content-block"><div class="label">👶 适合对象</div><div class="value">${c.suitableProfile}</div></div>` : ''}
    ${c.strategyAdvice ? `
    <div class="content-block">
      <div class="label"> 具体建议</div>
      <div class="value" style="white-space:pre-line;">${c.strategyAdvice}</div>
    </div>` : ''}
    ${c.riskWarning ? `
    <div class="content-block">
      <div class="label" style="color:#ef5350;">⚠ 风险提示</div>
      <div class="value" style="color:#ef5350;">${c.riskWarning}</div>
    </div>` : ''}
  `;
}

function renderEduPlan(c) {
  return `
    <div class="edu-plan-card">
      <div class="edu-plan-section">
        <div class="edu-plan-label">💰 家长视角 · 预算定位</div>
        <div class="edu-plan-text">${c.budgetPerspective || ''}</div>
      </div>
      <div class="edu-plan-section">
        <div class="edu-plan-label">🎮 孩子视角 · 成绩等级</div>
        <div class="edu-plan-text">${c.gradePerspective || ''}</div>
      </div>
      <div class="edu-plan-section">
        <div class="edu-plan-label">🗺️ 推荐路径</div>
        <div class="edu-plan-text">${c.recommendedPath || ''}</div>
      </div>
      ${c.pathDetails ? `
      <div class="edu-plan-section">
        <div class="edu-plan-label"> 路径详解</div>
        <div class="edu-plan-text" style="white-space:pre-line;">${c.pathDetails}</div>
      </div>` : ''}
      ${c.painPoint ? `
      <div class="edu-plan-pain">
        <span class="pain-icon">!</span>
        <span>${c.painPoint}</span>
      </div>` : ''}
    </div>
  `;
}

function renderSummary(c) {
  return `
    <div class="summary-card">
      <div class="summary-section">
        <div class="summary-label">🏠 家庭教育模式</div>
        <div class="summary-text">${c.familyPattern || ''}</div>
      </div>
      <div class="summary-section">
        <div class="summary-label">📊 家庭支持度</div>
        <div class="summary-text">${c.supportLevel || ''}</div>
      </div>
      ${c.coreIssues && c.coreIssues.length ? `
      <div class="summary-section">
        <div class="summary-label">⚠ 核心问题</div>
        <ul class="summary-issues">
          ${c.coreIssues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      </div>` : ''}
      <div class="summary-section">
        <div class="summary-label">🎯 发展方向</div>
        <div class="summary-text">${c.devDirection || ''}</div>
      </div>
      ${c.keyAdvice ? `
      <div class="summary-advice">
        <span class="advice-icon">💡</span>
        <span>${c.keyAdvice}</span>
      </div>` : ''}
    </div>
  `;
}

function renderMajor(c) {
  return `
    <div class="summary-card">
      ${c.analysisLogic ? `
      <div class="summary-section" style="background:rgba(251,191,36,0.04);border-color:rgba(251,191,36,0.12);">
        <div class="summary-label" style="color:#38BDF8;">🔍 分析逻辑</div>
        <div class="summary-text" style="color:#94A3B8;">${c.analysisLogic}</div>
      </div>` : ''}
      <div class="summary-section">
        <div class="summary-label">🎯 推荐方向</div>
        <div class="summary-text">${c.direction || ''}</div>
      </div>
      <div class="summary-section">
        <div class="summary-label"> 推荐专业</div>
        <div class="summary-text">${c.recommended || ''}</div>
      </div>
      ${c.avoid ? `
      <div class="summary-section">
        <div class="summary-label" style="color:#F87171;">🚫 避坑提醒</div>
        <div class="summary-text" style="color:#F87171;">${c.avoid}</div>
      </div>` : ''}
      ${c.principle ? `
      <div class="summary-advice" style="margin-top:12px;">
        <span class="advice-icon">💡</span>
        <span style="font-weight:600;">${c.principle}</span>
      </div>` : ''}
    </div>
  `;
}

function renderPaywall(section) {
  const items = section.lockedSections || [];
  let html = `<div class="paywall-notice">以下深度解读需付费解锁</div><div class="paywall-price">¥${section.content?.price||'9.9'}</div><div class="paywall-cta">${section.content?.cta||'解锁完整深度报告'}</div>`;
  items.forEach(item => { html += `<div class="paywall-item"><div class="paywall-item-title">🔒 ${item.title}</div><div class="paywall-item-hint">${item.hint||''}</div></div>`; });
  html += `<button class="btn-unlock" onclick="window.unlockReport()">🔓 解锁完整报告 ¥${section.content?.price||'9.9'}</button>`;
  return html;
}

window.hideTalentModal = () => { const d = document.getElementById('talent-modal'); if (d) d.close(); };

function renderTalentPrompt() {
  const div = document.createElement('div');
  div.className = 'talent-prompt';
  div.innerHTML = `
    <div class="talent-prompt-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm5 8h-2v-3h2v3zm0-5h-2V7h2v3z"/></svg></div>
    <div class="talent-prompt-content">
      <div class="talent-prompt-title">想更精准了解孩子的大脑优势？</div>
      <div class="talent-prompt-desc">五者天赋测评从五行脑科学角度，分析孩子的 <strong>思（木）· 赢（火）· 德（土）· 行（金）· 学（水）</strong> 五种天赋类型，给予针对性后天大脑培养建议。</div>
      <button class="talent-prompt-btn" onclick="showTalentConsult()">了解五者天赋 →</button>
    </div>
  `;
  return div;
}

window.showTalentConsult = () => {
  const dialog = document.getElementById('talent-modal') || createTalentModal();
  dialog.showModal();
};

function createTalentModal() {
  const dialog = document.createElement('dialog');
  dialog.id = 'talent-modal';
  dialog.className = 'talent-modal';
  dialog.innerHTML = `
    <div class="talent-modal-header">
      <span>✦ 五者天赋测评</span>
      <button class="aspect-modal-close" onclick="hideTalentModal()">✕</button>
    </div>
    <div class="talent-modal-body">
      <p class="talent-modal-desc">五者天赋模型基于五行理论，将孩子分为 <strong>思者（木）、赢者（火）、德者（土）、行者（金）、学者（水）</strong> 五种天赋类型，每种类型对应不同的脑优势和学习模式。</p>
      <div class="talent-types">
        <div class="talent-type-item"><span class="tt-wood">◆ 思者（木）</span> 右脑直觉型 · 巧学代替苦学</div>
        <div class="talent-type-item"><span class="tt-fire">◈ 赢者（火）</span> 右脑感受型 · 荣誉感驱动</div>
        <div class="talent-type-item"><span class="tt-earth">● 德者（土）</span> 左脑秩序型 · 复读机式教育</div>
        <div class="talent-type-item"><span class="tt-metal">◇ 行者（金）</span> 左脑逻辑型 · 兴趣驱动专才</div>
        <div class="talent-type-item"><span class="tt-water">○ 学者（水）</span> 全脑优势型 · 自驱力极强</div>
      </div>
      <p class="talent-modal-cta">想了解孩子的五者天赋类型？<br>加微信 <strong class="talent-wechat" onclick="copyWechat()">yoyozhao1341</strong> 咨询</p>
      <button class="lead-btn" onclick="copyWechat()"> 复制微信号</button>
    </div>`;
  document.body.appendChild(dialog);
  return dialog;
}

// ========== 分享与邀约系统 ==========

// 推荐人追踪
(function() {
  const p = new URLSearchParams(location.search);
  const ref = p.get('ref');
  if (ref) { localStorage.setItem('star_ref', ref); localStorage.setItem('star_ref_time', Date.now()); }
})();

function getRefCode() {
  let uid = localStorage.getItem('star_uid');
  if (!uid) { uid = Date.now().toString(36) + Math.random().toString(36).slice(2,6); localStorage.setItem('star_uid', uid); }
  return uid;
}

function getShareUrl() {
  const base = location.href.split('?')[0].split('#')[0];
  return `${base}?ref=${getRefCode()}`;
}

function getShareText() {
  const r = currentReport?.report;
  if (!r) return '';
  const f = (id) => r.sections?.find(s => s.id === id);
  const s = f('summary'), t = f('talent'), e = f('edu_path'), m = f('mercury'), sk = f('risk');
  const lines = [
    `🌟 ${r.name||'宝贝'}的专属星盘解读`,
    `━━━━━━━━━━━━━━━`,
    `太阳：${r.chartSummary?.sun||''}`,
    `月亮：${r.chartSummary?.moon||''}`,
    `上升：${r.chartSummary?.rising||''}`,
  ];
  if (m?.content?.style) lines.push(`📚 学习模式：${m.content.style}`);
  if (s?.content?.devDirection) lines.push(`🎯 发展方向：${s.content.devDirection.substring(0, 100)}`);
  if (t?.content?.description) lines.push(`🧠 天赋亮点：${t.content.description.replace(/<[^>]*>/g,'').substring(0, 80)}`);
  if (e?.content?.pathType) lines.push(`🎓 教育路径：${e.content.pathType}`);
  if (sk?.content?.level) lines.push(`⚠ 风险等级：${sk.content.level}`);
  lines.push('', ` 复制链接查看完整报告：${getShareUrl()}`, `💬 加微信 ${CONTACT_WECHAT} 获取深度解读`, '━━━━━━━━━━━━━━━', '来「优势星测」，发现孩子的天赋密码！');
  return lines.join('\n');
}

// 生成分享图
function generateShareImage() {
  const r = currentReport?.report;
  if (!r) return null;
  const canvas = document.getElementById('chart-wheel');
  if (!canvas) return null;
  const W = 600, H = 920;
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const ctx = off.getContext('2d');
  // 背景
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0a0e27'); g.addColorStop(0.5,'#111638'); g.addColorStop(1,'#0a0e27');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  // 星点
  ctx.fillStyle='rgba(255,255,255,0.12)';
  for(let i=0;i<30;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*2+1,0,Math.PI*2);ctx.fill();}
  // 品牌
  ctx.fillStyle='#f0c040'; ctx.font='bold 26px sans-serif'; ctx.textAlign='center';
  ctx.fillText('⭐ 优势星测', W/2, 45);
  ctx.fillStyle='#fff'; ctx.font='bold 20px sans-serif';
  ctx.fillText(`${r.name||'宝贝'} 的星盘天赋解读`, W/2, 80);
  // 分隔线
  ctx.strokeStyle='rgba(240,192,64,0.3)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(40,100); ctx.lineTo(W-40,100); ctx.stroke();
  // 星盘图
  try {
    const sz = 220; const cx = (W-sz)/2, cy = 115;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx+sz/2, cy+sz/2, sz/2+6, 0, Math.PI*2);
    ctx.fillStyle='rgba(17,22,56,0.95)'; ctx.fill();
    ctx.strokeStyle='rgba(240,192,64,0.15)'; ctx.lineWidth=1; ctx.stroke();
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, cx, cy, sz, sz);
    ctx.restore();
  } catch(e) {}
  // 日月升
  let y = 360;
  ctx.textAlign='left'; ctx.font='15px sans-serif'; ctx.fillStyle='#8b8fbd';
  if(r.chartSummary){
    ctx.fillText(`太阳：${r.chartSummary.sun||''}`, 30, y); y+=26;
    ctx.fillText(`月亮：${r.chartSummary.moon||''}`, 30, y); y+=26;
    ctx.fillText(`上升：${r.chartSummary.rising||''}`, 30, y); y+=26;
  }
  // 分隔
  y+=8; ctx.strokeStyle='rgba(240,192,64,0.2)'; ctx.beginPath(); ctx.moveTo(30,y); ctx.lineTo(W-30,y); ctx.stroke(); y+=16;
  // 关键发现
  const f = (id) => r.sections?.find(s => s.id === id);
  ctx.font='bold 15px sans-serif'; ctx.fillStyle='#f0c040';
  ctx.fillText(' 关键发现', 30, y); y+=24;
  ctx.font='13px sans-serif'; ctx.fillStyle='#e8eaff';
  const sc = f('summary')?.content;
  if(sc?.devDirection){const t=sc.devDirection;ctx.fillText(`🎯 ${t.length>84?t.substring(0,84)+'…':t}`,30,y);y+=20;}
  const tc = f('talent')?.content?.description?.replace(/<[^>]*>/g,'');
  if(tc){ctx.fillText(`🧠 ${tc.substring(0,84)}`,30,y);y+=20;}
  const ec = f('edu_path')?.content?.pathType;
  if(ec) ctx.fillText(`🎓 ${ec}`,30,y);
  // 底部
  y = H-110;
  ctx.strokeStyle='rgba(240,192,64,0.25)'; ctx.beginPath(); ctx.moveTo(30,y); ctx.lineTo(W-30,y); ctx.stroke(); y+=16;
  ctx.textAlign='center'; ctx.font='14px sans-serif'; ctx.fillStyle='#8b8fbd';
  ctx.fillText(` 加微信 ${CONTACT_WECHAT} 获取完整深度报告`, W/2, y); y+=22;
  if(localStorage.getItem('star_ref')){ctx.fillStyle='#f0c040';ctx.fillText(`💝 好友推荐你来看`,W/2,y);y+=22;}
  ctx.fillStyle='rgba(139,143,189,0.5)'; ctx.font='12px sans-serif';
  ctx.fillText('优势星测 · 发现孩子的天赋密码', W/2, y);
  return off.toDataURL('image/png');
}

// 分享弹窗
function ensureShareModal() {
  let d = document.getElementById('share-modal');
  if(!d){
    d = document.createElement('dialog');
    d.id = 'share-modal'; d.className = 'share-modal';
    d.innerHTML = `
      <div class="share-modal-header"><span>📤 分享报告</span><button class="share-modal-close" onclick="document.getElementById('share-modal')?.close()">✕</button></div>
      <div class="share-modal-body">
        <div class="share-option" onclick="handleShareImage()"><div class="share-icon">📸</div><div class="share-text"><div class="share-title">保存分享图</div><div class="share-desc">生成带星盘的分享卡片，可转发好友或朋友圈</div></div></div>
        <div class="share-option" onclick="handleShareText()"><div class="share-icon">📝</div><div class="share-text"><div class="share-title">复制报告摘要</div><div class="share-desc">包含日月升、发展建议、教育路径等完整内容</div></div></div>
        <div class="share-option" onclick="handleShareLink()"><div class="share-icon">🔗</div><div class="share-text"><div class="share-title">复制分享链接</div><div class="share-desc">含推荐人标识，好友打开自动关联</div></div></div>
      </div>`;
    document.body.appendChild(d);
  }
  return d;
}

window.shareReport = () => {
  if(!currentReport?.report){showToast('请先生成报告');return;}
  ensureShareModal().showModal();
};

window.handleShareImage = () => {
  showToast('生成分享图中…');
  setTimeout(()=>{
    const url = generateShareImage();
    if(!url){showToast('生成失败');return;}
    document.getElementById('share-modal')?.close();
    let d = document.getElementById('share-img-modal');
    if(!d){
      d = document.createElement('dialog'); d.id='share-img-modal'; d.className='share-modal';
      d.innerHTML = `<div class="share-modal-header"><span>📸 长按保存分享</span><button class="share-modal-close" onclick="document.getElementById('share-img-modal')?.close()">✕</button></div><div class="share-modal-body" style="text-align:center;"><img id="share-img-preview" style="width:100%;max-width:400px;border-radius:12px;display:block;margin:0 auto;"><p style="color:#8b8fbd;font-size:13px;margin:12px 0;">👆 长按图片保存，分享给好友或朋友圈</p><button class="btn-primary" onclick="document.getElementById('share-img-modal')?.close()" style="margin-top:4px;">我知道了</button></div>`;
      document.body.appendChild(d);
    }
    document.getElementById('share-img-preview').src = url;
    d.showModal();
  }, 300);
};

window.handleShareText = () => {
  const t = getShareText();
  if(!t){showToast('暂无报告内容');return;}
  const cp = (txt) => {
    if(navigator.clipboard){navigator.clipboard.writeText(txt).then(()=>showToast('✅ 报告摘要已复制')).catch(()=>{});}
    else{const ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;opacity:0;';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToast('✅ 报告摘要已复制');}
  };
  cp(t);
  document.getElementById('share-modal')?.close();
};

window.handleShareLink = () => {
  const url = getShareUrl();
  if(navigator.clipboard){navigator.clipboard.writeText(url).then(()=>showToast('✅ 分享链接已复制')).catch(()=>{});}
  else{const ta=document.createElement('textarea');ta.value=url;ta.style.cssText='position:fixed;opacity:0;';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToast('✅ 分享链接已复制');}
  document.getElementById('share-modal')?.close();
};

// ========== 相位 Badge ==========
function setupAspectBadge(wheelResult) {
  const canvas = document.getElementById('chart-wheel');
  if (!canvas) return;
  canvas.removeEventListener('click', onCanvasBadgeClick);
  canvas._badgeRect = wheelResult?.badgeRect || null;
  canvas.addEventListener('click', onCanvasBadgeClick);
}

function onCanvasBadgeClick(e) {
  const canvas = e.currentTarget;
  const rect = canvas._badgeRect;
  if (!rect || !canvas._aspects || !canvas._aspects.length) return;
  const cr = canvas.getBoundingClientRect();
  const scaleX = canvas.width / cr.width / (window.devicePixelRatio || 1);
  const scaleY = canvas.height / cr.height / (window.devicePixelRatio || 1);
  const mx = (e.clientX - cr.left) * scaleX;
  const my = (e.clientY - cr.top) * scaleY;
  if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
    showAspectModal(canvas._aspects);
  }
}

// ========== 相位弹窗 ==========
const MATRIX_PLANET_ORDER = ['太阳','月亮','水星','金星','火星','木星','土星','天王星','海王星','冥王星'];
const MATRIX_PLANET_KEYS = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const PLANET_SHORT_SYMBOLS = {sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇'};
const PLANETS_CN = {sun:'太阳',moon:'月亮',mercury:'水星',venus:'金星',mars:'火星',jupiter:'木星',saturn:'土星',uranus:'天王星',neptune:'海王星',pluto:'冥王星'};
const MATRIX_ASPECT_SYMBOLS = {'合相':'☌','六分相':'✡','四分相':'□','三分相':'△','对分相':'☍'};
const MATRIX_ASPECT_COLORS = {'合相':'#ff9800','六分相':'#4caf50','四分相':'#f44336','三分相':'#2196f3','对分相':'#e91e63'};

function showAspectModal(aspects) {
  const dialog = document.getElementById('aspect-modal');
  const body = document.getElementById('aspect-modal-body');
  if (!dialog || !body) return;

  const aspectMap = new Map();
  aspects.forEach(a => {
    const k1 = a.planet1En||'', k2 = a.planet2En||'';
    if (!k1||!k2) return;
    aspectMap.set([k1,k2].sort().join('-'), a);
  });

  const n = MATRIX_PLANET_KEYS.length;
  let html = `<table class="aspect-matrix-table">`;
  for (let r = 0; r < n; r++) {
    const rk = MATRIX_PLANET_KEYS[r], rsym = PLANET_SHORT_SYMBOLS[rk]||'?';
    html += `<tr><th title="${PLANETS_CN[rk]||rk}" class="matrix-row-header">${rsym}</th>`;
    for (let c = 0; c < n; c++) {
      const ck = MATRIX_PLANET_KEYS[c];
      if (r===c) { html += `<td class="aspect-matrix-cell-diag"></td>`; continue; }
      if (c>r) { html += `<td class="aspect-matrix-cell-empty"></td>`; continue; }
      const key = [rk,ck].sort().join('-');
      const asp = aspectMap.get(key);
      if (asp) {
        const sym = MATRIX_ASPECT_SYMBOLS[asp.type]||'●', color = MATRIX_ASPECT_COLORS[asp.type]||'#fff';
        const orb = asp.orb!=null ? Math.abs(asp.orb).toFixed(0) : '';
        html += `<td class="aspect-matrix-cell-aspect" style="color:${color};background:${color}15" title="${PLANETS_CN[asp.planet1En]||asp.planet1} — ${PLANETS_CN[asp.planet2En]||asp.planet2}\n${asp.type}"><span class="matrix-aspect-sym">${sym}</span>${orb?`<span class="matrix-aspect-orb">${orb}'</span>`:''}</td>`;
      } else { html += `<td class="aspect-matrix-cell-empty"></td>`; }
    }
    html += `</tr>`;
  }
  html += `<tr class="matrix-bottom-axis"><th></th>${MATRIX_PLANET_KEYS.map(k => `<th title="${PLANETS_CN[k]||k}" class="matrix-col-header">${PLANET_SHORT_SYMBOLS[k]||'?'}</th>`).join('')}</tr></table>`;

  const legendTypes = [...new Set(aspects.map(a=>a.type).filter(t=>MATRIX_ASPECT_SYMBOLS[t]))];
  html += `<div class="matrix-legend">${legendTypes.map(t => `<div class="matrix-legend-item"><span class="matrix-legend-dot" style="background:${MATRIX_ASPECT_COLORS[t]||'#888'}"></span>${MATRIX_ASPECT_SYMBOLS[t]||''} ${t}</div>`).join('')}</div>`;

  body.innerHTML = html || '<div class="aspect-modal-empty">无相位数据</div>';
  dialog.showModal();
}

window.closeAspectModal = () => { const d = document.getElementById('aspect-modal'); if (d) d.close(); };

// ========== Toast ==========
function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ========== 评论系统 ==========

async function renderCommentSection(type) {
  const container = document.createElement('div');
  container.className = 'comment-section';
  container.id = 'comment-section';

  // 插入到 report 区域
  const reportArea = type === 'star' ? $('report-content')?.parentElement : $('strength-result')?.parentElement;
  if (!reportArea) return;
  // 移除旧的评论区域
  const old = document.getElementById('comment-section');
  if (old) old.remove();
  reportArea.appendChild(container);

  // 加载已审核评论
  let approvedComments = [];
  try {
    const res = await fetch(`/api/comments?reportType=${type}`);
    const data = await res.json();
    approvedComments = data.data || [];
  } catch {}

  container.innerHTML = `
    <div class="comment-header">
      <span class="comment-title">💬 ${approvedComments.length} 条评论</span>
    </div>
    ${approvedComments.length ? `<div class="comment-list">${approvedComments.map(c => `
      <div class="comment-item">
        <div class="comment-meta"><span class="comment-author">${escHtml(c.name)}</span><span class="comment-time">${formatTime(c.createdAt)}</span></div>
        <div class="comment-body">${escHtml(c.content)}</div>
      </div>
    `).join('')}</div>` : '<div class="comment-empty">暂无评论，来写第一条吧</div>'}
    <div class="comment-form">
      <input class="comment-input" id="comment-name" placeholder="你的昵称（选填）" maxlength="20" />
      <textarea class="comment-textarea" id="comment-content" placeholder="说说你的感受..." rows="3" maxlength="500"></textarea>
      <button class="comment-btn" onclick="submitComment('${type}')">发表评论</button>
      <div class="comment-tip">评论需管理员审核后显示</div>
    </div>
  `;
}

window.submitComment = async (type) => {
  const name = document.getElementById('comment-name')?.value?.trim() || '';
  const content = document.getElementById('comment-content')?.value?.trim();
  if (!content) { showToast('请输入评论内容'); return; }

  const btn = document.querySelector('.comment-btn');
  if (btn) { btn.disabled = true; btn.textContent = '提交中...'; }

  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, reportType: type })
    });
    const data = await res.json();
    if (data.success) {
      showToast('评论提交成功，等待管理员审核');
      document.getElementById('comment-content').value = '';
    } else {
      showToast(data.error || '提交失败');
    }
  } catch {
    showToast('提交失败，请重试');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '发表评论'; }
  }
};

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getMonth()+1}月${d.getDate()}日`;
}

// ========== 分销中心系统 ==========

// 打开分销中心
window.openDistributorCenter = () => {
  showPage('distributor');
  renderDistributorPage();
};

window.closeDistributorCenter = () => {
  goHome();
};

window.backToForm = () => {
  currentTestType = 'star';
  renderForm('star');
  showPage('form');
};

async function renderDistributorPage() {
  const container = document.getElementById('distributor-content');
  if (!container) return;

  const uid = getRefCode();
  container.innerHTML = '<div class="dist-page"><div class="loading-container"><p class="loading-text">加载中...</p></div></div>';

  // 检查是否已注册
  let registered = false;
  let distData = null;
  let stats = null;
  try {
    const res = await fetch(`/api/distributor/check?uid=${uid}`);
    const data = await res.json();
    if (data.success && data.registered) {
      registered = true;
      distData = data.distributor;
      const statsRes = await fetch(`/api/distributor/info?uid=${uid}`);
      const statsData = await statsRes.json();
      if (statsData.success) stats = statsData.stats;
    }
  } catch {}

  if (registered) {
    renderDistributorDashboard(container, uid, distData, stats);
  } else {
    renderDistributorRegister(container, uid);
  }
}

let _distConfig = null;

async function getDistConfig() {
  if (_distConfig) return _distConfig;
  try {
    const res = await fetch('/api/distributor/config');
    const data = await res.json();
    if (data.success) _distConfig = data.config;
  } catch {}
  return _distConfig || { commissionRate: 0.3, minWithdrawal: 10 };
}

function renderDistributorRegister(container, uid) {
  getDistConfig().then(config => {
    const rate = Math.round((config.commissionRate || 0.3) * 100);
    const premiumPrice = 9.9;
    const commission = (premiumPrice * (config.commissionRate || 0.3)).toFixed(2);
    container.innerHTML = `
      <div class="dist-page">
        <div class="dist-header">
          <h2>💰 推广赚钱</h2>
          <p>分享报告给好友，好友付费你拿佣金</p>
        </div>
        <div class="dist-register-card">
          <h3>成为推广员</h3>
          <p>每推荐一位好友购买深度版报告（¥9.9），你可获得 <strong style="color:#66bb6a;">${rate}% 佣金（¥${commission}）</strong>。<br>
          无需押金，随时提现（<strong style="color:#f59e0b;">最低 ¥${config.minWithdrawal || 10}</strong> 起提）。</p>
          <h3 style="margin-top:16px;">📝 填写信息</h3>
          <input class="dist-field" id="dist-name" placeholder="你的称呼（如：张妈妈）" maxlength="20" />
          <input class="dist-field" id="dist-wechat" placeholder="微信号（用于打款）" maxlength="30" />
          <input class="dist-field" id="dist-phone" placeholder="手机号（选填）" maxlength="11" />
          <div id="dist-register-error" style="color:#ef5350;font-size:0.8rem;margin-bottom:8px;"></div>
          <button class="dist-btn-primary" onclick="submitDistributorRegister()">立即成为推广员</button>
        </div>
        <div style="text-align:center;padding:12px 0;color:#575a85;font-size:0.7rem;">
          推广员无需付费，推荐购买后系统自动记录佣金
        </div>
      </div>
    `;
  });
}

window.submitDistributorRegister = async () => {
  const name = document.getElementById('dist-name')?.value?.trim();
  const wechat = document.getElementById('dist-wechat')?.value?.trim();
  const phone = document.getElementById('dist-phone')?.value?.trim();
  const errEl = document.getElementById('dist-register-error');
  if (!errEl) return;

  if (!name) { errEl.textContent = '请输入称呼'; return; }
  if (!wechat) { errEl.textContent = '请输入微信号'; return; }

  const uid = getRefCode();
  const source = currentTestType || 'star';

  try {
    const res = await fetch('/api/distributor/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, name, wechat, phone, source })
    });
    const data = await res.json();
    if (data.success) {
      showToast('🎉 注册成功！');
      renderDistributorPage();
    } else {
      errEl.textContent = data.error || '注册失败';
    }
  } catch {
    errEl.textContent = '网络错误，请重试';
  }
};

function renderDistributorDashboard(container, uid, distData, stats) {
  const s = stats || { totalReferrals: 0, totalCommission: 0, withdrawable: 0, withdrawn: 0, pendingOrders: 0, confirmedOrders: 0 };
  const baseUrl = location.href.split('?')[0].split('#')[0];
  const shareUrl = `${baseUrl}?distributor=${distData.code}`;

  let html = `
    <div class="dist-page">
      <div class="dist-header">
        <h2>💰 推广中心</h2>
        <p>${distData.name || '推广员'}，欢迎回来</p>
      </div>

      <div class="dist-stats">
        <div class="dist-stat-card">
          <div class="dist-stat-num">${s.totalReferrals}</div>
          <div class="dist-stat-label">推广人数</div>
        </div>
        <div class="dist-stat-card">
          <div class="dist-stat-num">${s.confirmedOrders}</div>
          <div class="dist-stat-label">成交单数</div>
        </div>
        <div class="dist-stat-card">
          <div class="dist-stat-num">¥${(s.totalCommission || 0).toFixed(1)}</div>
          <div class="dist-stat-label">累计佣金</div>
        </div>
        <div class="dist-stat-card">
          <div class="dist-stat-num withdraw">¥${(s.withdrawable || 0).toFixed(1)}</div>
          <div class="dist-stat-label">可提现</div>
        </div>
      </div>

      <div class="dist-info">
        <div class="dist-info-title">你的推广代码</div>
        <div class="dist-info-code">
          <span class="dist-code-value">${distData.code}</span>
          <button class="dist-code-copy" onclick="copyDistributorCode()">复制</button>
        </div>
        <div class="dist-info-title">推广链接</div>
        <div class="dist-share-link">${shareUrl}</div>
        <button class="dist-code-copy" onclick="copyDistributorLink()" style="padding:6px 12px;display:block;width:100%;text-align:center;margin-top:4px;">复制推广链接</button>
      </div>

      <div class="dist-actions">
        <button class="dist-btn-share" onclick="shareDistributorLink()">📤 分享推广链接</button>
        <button class="dist-btn-withdraw" onclick="showDistributorWithdraw()" id="dist-withdraw-btn">💳 提现</button>
      </div>

      <div class="dist-tab-bar">
        <span class="dist-tab active" data-tab="orders" onclick="switchDistributorTab('orders', this)">📋 推广订单</span>
        <span class="dist-tab" data-tab="withdrawals" onclick="switchDistributorTab('withdrawals', this)">💸 提现记录</span>
      </div>
      <div id="dist-tab-content">
        <div class="loading-container"><p class="loading-text">加载中...</p></div>
      </div>
    </div>
  `;
  container.innerHTML = html;

  // 根据配置设置提现按钮透明度
  getDistConfig().then(cfg => {
    const btn = document.getElementById('dist-withdraw-btn');
    if (btn && (s.withdrawable || 0) < (cfg.minWithdrawal || 10)) btn.style.opacity = '0.5';
  });

  // 默认加载订单列表
  loadDistributorOrders(uid);
}

function copyTextToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('✅ 已复制')).catch(() => {});
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅ 已复制');
  }
}

window.copyDistributorCode = () => {
  const el = document.querySelector('.dist-code-value');
  if (el) copyTextToClipboard(el.textContent);
};

window.copyDistributorLink = () => {
  const el = document.querySelector('.dist-share-link');
  if (el) copyTextToClipboard(el.textContent);
};

window.shareDistributorLink = () => {
  const el = document.querySelector('.dist-share-link');
  if (!el) return;
  const url = el.textContent;
  const text = `🌟 来「优势星测」给孩子做一份专业的星盘天赋解读！\nAI 全面分析孩子的性格、天赋、学习模式和教育路径。\n\n 点开看看：${url}\n\n（这是我的推广链接，感谢你的支持！）`;
  copyTextToClipboard(text);
  showToast('✅ 推广文案已复制，快去分享吧！');
};

async function loadDistributorOrders(uid) {
  const tabContent = document.getElementById('dist-tab-content');
  if (!tabContent) return;
  try {
    const res = await fetch(`/api/distributor/orders?uid=${uid}`);
    const data = await res.json();
    if (!data.success || !data.orders) {
      tabContent.innerHTML = '<div class="dist-empty">暂无数据</div>';
      return;
    }
    const orders = data.orders;
    if (!orders.length) {
      tabContent.innerHTML = '<div class="dist-empty">暂无推广订单</div>';
      return;
    }
    let html = '<div class="dist-section-title">推广订单</div>';
    orders.forEach(o => {
      const statusLabel = { pending: '待确认', confirmed: '已结算', cancelled: '已取消' };
      const statusClass = o.status;
      html += `
        <div class="dist-order-item">
          <div class="dist-order-top">
            <span class="dist-order-customer">${o.customerName || '匿名用户'}</span>
            <span class="dist-order-commission">+¥${(o.commission || 0).toFixed(2)}</span>
          </div>
          <div class="dist-order-bottom">
            <span class="dist-order-date">${formatTime(o.createdAt)}</span>
            <span class="dist-order-status ${statusClass}">${statusLabel[o.status] || o.status}</span>
          </div>
        </div>
      `;
    });
    tabContent.innerHTML = html;
  } catch {
    tabContent.innerHTML = '<div class="dist-empty">加载失败</div>';
  }
}

async function loadDistributorWithdrawals(uid) {
  const tabContent = document.getElementById('dist-tab-content');
  if (!tabContent) return;
  try {
    const res = await fetch(`/api/distributor/withdrawals?uid=${uid}`);
    const data = await res.json();
    if (!data.success) {
      tabContent.innerHTML = '<div class="dist-empty">暂无数据</div>';
      return;
    }
    const list = data.withdrawals || [];
    if (!list.length) {
      tabContent.innerHTML = '<div class="dist-empty">暂无提现记录</div>';
      return;
    }
    let html = '<div class="dist-section-title">提现记录</div>';
    list.forEach(w => {
      const statusLabel = { pending: '审核中', approved: '已打款', rejected: '已拒绝' };
      const statusClass = w.status;
      html += `
        <div class="dist-order-item">
          <div class="dist-order-top">
            <span class="dist-order-customer">提现 ¥${(w.amount || 0).toFixed(2)}</span>
            <span class="dist-order-commission" style="color:${w.status === 'approved' ? '#66bb6a' : w.status === 'rejected' ? '#ef5350' : '#f59e0b'}">${statusLabel[w.status] || w.status}</span>
          </div>
          <div class="dist-order-bottom">
            <span class="dist-order-date">${formatTime(w.createdAt)}</span>
            ${w.note ? `<span style="color:#ef5350;font-size:0.65rem;">${w.note}</span>` : ''}
          </div>
        </div>
      `;
    });
    tabContent.innerHTML = html;
  } catch {
    tabContent.innerHTML = '<div class="dist-empty">加载失败</div>';
  }
}

window.switchDistributorTab = (tab, el) => {
  document.querySelectorAll('.dist-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  const uid = getRefCode();
  if (tab === 'orders') loadDistributorOrders(uid);
  else loadDistributorWithdrawals(uid);
};

// 提现弹窗
window.showDistributorWithdraw = () => {
  const uid = getRefCode();
  getDistConfig().then(config => {
    const minWithdraw = config.minWithdrawal || 10;
    return fetch(`/api/distributor/info?uid=${uid}`).then(r => r.json()).then(data => {
      if (!data.success) return;
      const withdrawable = data.stats?.withdrawable || 0;

      let d = document.getElementById('dist-withdraw-dialog');
      if (!d) {
        d = document.createElement('dialog');
        d.id = 'dist-withdraw-dialog';
        d.className = 'dist-withdraw-modal';
        document.body.appendChild(d);
      }

      if (withdrawable < minWithdraw) {
        d.innerHTML = `
          <h3>💳 提现</h3>
          <div class="dist-withdraw-balance">可提现余额：¥${withdrawable.toFixed(2)}</div>
          <div style="text-align:center;color:#ef5350;font-size:0.85rem;margin:16px 0;">
            最低提现金额 ¥${minWithdraw}，继续推广赚佣金吧！
          </div>
          <button class="dist-btn-primary" onclick="document.getElementById('dist-withdraw-dialog')?.close()" style="background:#1e2954;color:#8b8fbd;">知道了</button>
        `;
        d.showModal();
        return;
      }

      d.innerHTML = `
        <h3>💳 申请提现</h3>
        <div class="dist-withdraw-balance">可提现：¥${withdrawable.toFixed(2)}</div>
        <input class="dist-field" id="wd-amount" type="number" placeholder="提现金额（最低 ¥${minWithdraw}）" step="0.01" min="${minWithdraw}" max="${withdrawable}" />
        <input class="dist-field" id="wd-name" placeholder="收款人姓名" value="${data.distributor?.name || ''}" />
        <input class="dist-field" id="wd-wechat" placeholder="收款微信号" value="${data.distributor?.wechat || ''}" />
        <div id="wd-error" style="color:#ef5350;font-size:0.8rem;margin-bottom:8px;"></div>
        <button class="dist-btn-primary" onclick="submitDistributorWithdraw()">提交提现申请</button>
        <button style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid #1e2954;background:transparent;color:#8b8fbd;font-size:0.85rem;cursor:pointer;" onclick="document.getElementById('dist-withdraw-dialog')?.close()">取消</button>
      `;
      d.showModal();
    });
  }).catch(() => showToast('加载失败'));
};

window.submitDistributorWithdraw = async () => {
  const amount = parseFloat(document.getElementById('wd-amount')?.value);
  const name = document.getElementById('wd-name')?.value?.trim();
  const wechat = document.getElementById('wd-wechat')?.value?.trim();
  const errEl = document.getElementById('wd-error');
  if (!errEl) return;

  getDistConfig().then(config => {
    const minWd = config.minWithdrawal || 10;
    if (!amount || amount < minWd) { errEl.textContent = `最低提现金额 ¥${minWd}`; return; }
  });
  if (!name) { errEl.textContent = '请输入收款人姓名'; return; }
  if (!wechat) { errEl.textContent = '请输入收款微信号'; return; }

  try {
    const res = await fetch('/api/distributor/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: getRefCode(), amount, name, wechat })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('dist-withdraw-dialog')?.close();
      showToast('✅ 提现申请已提交');
      renderDistributorPage();
    } else {
      errEl.textContent = data.error || '提交失败';
    }
  } catch {
    errEl.textContent = '网络错误';
  }
};

// ========== 分销链接追踪（集成到报告生成） ==========
(function() {
  // 读取 distributor 参数（优先级高于 ref）
  const p = new URLSearchParams(location.search);
  const distCode = p.get('distributor');
  if (distCode) {
    localStorage.setItem('distributor_ref_code', distCode);
    localStorage.setItem('distributor_ref_time', Date.now());
  }
})();

// ========== 初始加载 ==========
document.addEventListener('DOMContentLoaded', () => {
  showPage('home');
});
