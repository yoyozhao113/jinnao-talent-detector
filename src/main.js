/**
 * 劲脑·天赋探测仪 - 主入口
 * Step 1: 首页 → Step 2: 填信息/答题 → Step 3: 报告
 */
import { CITIES } from './data/cities.js';
import { drawChartWheel } from './chart-wheel.mjs';
import track from './tracker.mjs';
import { MBTI_QUESTIONS, calculateMBTI } from './mbti-data.js';
import { getMbtiAstroCross } from './mbti-astro.js';
import { MBTI_EDUCATION } from './mbti-edu.js';
import { VARK_QUESTIONS, calculateVARK, getVARKSummary } from './vark-data.js';
import { EFFICACY_QUESTIONS, LIKERT_5, calculateEfficacy } from './efficacy-data.js';

// ========== State ==========
let currentTestType = null;   // 'star' | 'mbti'
let currentReport = null;
let currentVersion = 'free';

// 星盘表单暂存数据（预算页使用）
let starFormData = null;

// MBTI 测试状态
let mbtiState = { current: 0, answers: {} };
// VARK 测试状态
let varkState = { current: 0, answers: {} };
// 学科效能感测试状态
let efficacyState = { current: 0, answers: {} };

// 微信号
const CONTACT_WECHAT = 'yoyozhao1341';

// 微信支付 AppID（公众号 AppID，用于 OAuth 跳转）
const WECHAT_APPID = 'wxcb5d7e842424ad5b';

// 微信支付相关
let wechatOpenId = localStorage.getItem('wechat_openid') || '';

// 用户系统
let currentUser = JSON.parse(localStorage.getItem('user_info') || 'null');

// ========== DOM ==========
const $ = id => document.getElementById(id);
const pages = { home: $('page-home'), form: $('page-form'), budget: $('page-budget'), loading: $('page-loading'), report: $('page-report'), user: $('page-user'), gradeHome: $('page-grade-home'), gradeForm: $('page-grade-form'), gradeDone: $('page-grade-done') };

function showPage(name) {
  Object.values(pages).forEach(p => p?.classList.remove('active'));
  if (pages[name]) pages[name].classList.add('active');
  window.scrollTo(0, 0);
  track('page_view', { page: name, label: currentTestType || '' });
}

// ========== 导航 ==========
window.goHome = () => { showPage('home'); currentReport = null; currentTestType = null; starFormData = null; };

window.goToStep2 = (type) => {
  currentTestType = type;
  renderForm(type);
  showPage('form');
};

function goToStep3() { showPage('report'); }

// ========== 成绩薄弱点检测 ==========
window.goGradeHome = () => { showPage('gradeHome'); };
window.goGradeForm = () => {
  showPage('gradeForm');
  $('grade-error')?.classList.add('hidden');
};

window.addGradeSubject = () => {
  const container = $('grade-subjects-container');
  const row = document.createElement('div');
  row.className = 'grade-subject-row';
  row.innerHTML = `
    <select class="g-subject" style="flex:1;">
      <option value="语文">语文</option>
      <option value="数学">数学</option>
      <option value="英语">英语</option>
      <option value="物理">物理</option>
      <option value="化学">化学</option>
      <option value="生物">生物</option>
      <option value="历史">历史</option>
      <option value="地理">地理</option>
      <option value="政治">政治</option>
    </select>
    <input type="number" class="g-score" placeholder="成绩" min="0" max="100" style="width:80px;" />
    <button type="button" class="grade-remove-subject" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
};

window.submitGradeAssessment = async (e) => {
  e.preventDefault();
  const btn = $('grade-submit-btn');
  const errEl = $('grade-error');

  const wechat = $('g-wechat').value.trim();
  const name = $('g-name').value.trim();
  const province = $('g-province').value.trim();
  const grade = $('g-grade').value;

  if (!wechat || !province || !grade) {
    errEl.textContent = '请填写微信号、省份和年级';
    errEl.classList.remove('hidden');
    return;
  }

  const subjectRows = document.querySelectorAll('#grade-subjects-container .grade-subject-row');
  const subjects = [];
  const scores = {};
  subjectRows.forEach(row => {
    const sub = row.querySelector('.g-subject')?.value;
    const score = row.querySelector('.g-score')?.value;
    if (sub) {
      subjects.push(sub);
      scores[sub] = score || '未提供';
    }
  });

  if (subjects.length === 0) {
    errEl.textContent = '请至少添加一个科目';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = '提交中...';
  errEl.classList.add('hidden');

  const distributorRef = localStorage.getItem('distributor_ref_code') || '';

  try {
    const resp = await fetch('/api/grade-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wechat, province, grade, subjects, scores, studentName: name || '', distributor: distributorRef || undefined }),
    });
    const data = await resp.json();
    if (data.success) {
      showPage('gradeDone');
      track('grade_assessment_submit', { province, grade });
    } else {
      errEl.textContent = data.error || '提交失败，请重试';
      errEl.classList.remove('hidden');
    }
  } catch {
    errEl.textContent = '网络错误，请检查网络后重试';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = '提交分析';
  }
};

// ========== 渲染 Step 2 ==========
function renderForm(type) {
  if (type === 'star') renderStarForm();
  else if (type === 'mbti') renderMbtiQuiz();
  else if (type === 'vark') renderVarkQuiz();
  else if (type === 'efficacy') renderEfficacyQuiz();
}

// ========== 渲染 Step 3 ==========
function renderStep3() {
  ['star-report-area','mbti-report-area','vark-report-area','efficacy-report-area'].forEach(id => {
    const el = $(id);
    if (el) el.classList.add('hidden');
  });
  if (currentTestType === 'star') $('star-report-area')?.classList.remove('hidden');
  else if (currentTestType === 'mbti') $('mbti-report-area')?.classList.remove('hidden');
  else if (currentTestType === 'vark') $('vark-report-area')?.classList.remove('hidden');
  else if (currentTestType === 'efficacy') $('efficacy-report-area')?.classList.remove('hidden');
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
      <button type="submit" class="btn-primary">开始解读</button>
    </form>`;

  // 重新初始化星盘表单逻辑
  initCitySelect();
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

// 暂存报告数据（留资后渲染用）
let _pendingReportData = null;

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
    localStorage.setItem('astro_chart', JSON.stringify(data.chart));

    // 先保存报告数据，弹出留资窗
    _pendingReportData = { report: data.report, chart: data.chart, name: formData.name, version: formData.version };
    showLeadCapture();
  } catch (err) {
    showToast('计算失败：' + err.message);
    showPage('form');
  }
}

// ========== 留资弹窗 ==========

function showLeadCapture() {
  const overlay = document.createElement('div');
  overlay.id = 'lead-overlay';
  overlay.className = 'lead-overlay';
  overlay.innerHTML = `
    <div class="lead-overlay-box">
      <div class="lead-overlay-icon">🌟</div>
      <h3 class="lead-overlay-title">报告已生成</h3>
      <p class="lead-overlay-desc">
        填写微信号，解锁 <strong>${_pendingReportData.name || '宝贝'}</strong> 的<br>完整星盘解读报告
      </p>
      <div class="lead-overlay-form">
        <div class="lead-overlay-field">
          <label>微信号 <span class="lead-required">*</span></label>
          <input type="text" id="lead-wechat" placeholder="你的微信号" maxlength="30" autocomplete="off" />
        </div>
        <div class="lead-overlay-field">
          <label>手机号</label>
          <input type="tel" id="lead-phone" placeholder="选填，方便课程顾问联系你" maxlength="11" />
        </div>
        <div class="lead-overlay-tip">提交后即可查看完整报告，顾问不会频繁打扰</div>
        <button class="btn-primary lead-overlay-btn" onclick="submitLeadCapture()">✓ 领取完整报告</button>
        <button class="lead-overlay-skip" onclick="skipLeadCapture()">跳过，只看免费版</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // 渐入动画
  requestAnimationFrame(() => overlay.classList.add('active'));
  document.getElementById('lead-wechat')?.focus();
}

window.submitLeadCapture = async function() {
  const wechat = document.getElementById('lead-wechat')?.value?.trim();
  const phone = document.getElementById('lead-phone')?.value?.trim();
  if (!wechat) { showToast('请输入微信号'); return; }

  const btn = document.querySelector('.lead-overlay-btn');
  if (btn) { btn.disabled = true; btn.textContent = '提交中...'; }

  try {
    await fetch('/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wechat,
        phone: phone || '',
        name: _pendingReportData?.name || '',
        type: 'star',
      })
    });
  } catch { /* 静默处理，不影响用户体验 */ }

  if (btn) { btn.disabled = false; btn.textContent = '✓ 领取完整报告'; }
  finishStarReport();
};

window.skipLeadCapture = function() {
  finishStarReport();
};

function finishStarReport() {
  // 关闭弹窗
  const overlay = document.getElementById('lead-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  }

  if (!_pendingReportData) return;
  const { report, chart, name, version } = _pendingReportData;

  renderReport(report, version);
  const wheelResult = drawChartWheel('chart-wheel', chart);
  setupAspectBadge(wheelResult);
  renderStep3();
  track('report_generated', { page: 'report', label: version, meta: { type: currentTestType } });
  autoSaveReport('star', name, chart, report, version);
  _pendingReportData = null;
}

// ================================================================
//  MBTI 人格测试
// ================================================================

function renderMbtiQuiz() {
  mbtiState = { current: 0, answers: {} };

  $('form-content').innerHTML = `
    <div class="quiz-container">
      <div class="quiz-header">
        <h2>MBTI 人格类型测试</h2>
        <p>共 ${MBTI_QUESTIONS.length} 题，每题二选一，预计 3 分钟</p>
      </div>
      <div id="mbti-quiz-area">
        <div class="quiz-progress">
          <div class="quiz-bar"><div class="quiz-fill" id="mbti-fill" style="width:0%"></div></div>
          <div class="quiz-count" id="mbti-count">1 / ${MBTI_QUESTIONS.length}</div>
        </div>
        <div class="mbti-question" id="mbti-question"></div>
        <div class="mbti-options" id="mbti-options"></div>
        <div class="quiz-nav">
          <button class="btn btn-prev" id="mbti-prev" onclick="mbtiPrev()" style="display:none;">← 上一题</button>
          <button class="btn btn-next" id="mbti-next" onclick="mbtiNext()">下一题 →</button>
        </div>
      </div>
      <div id="mbti-submit-area" class="hidden" style="text-align:center;padding:30px 0;">
        <p style="font-size:1rem;margin-bottom:6px;color:#e8e6f0;">所有题目已答完！</p>
        <p style="font-size:0.85rem;color:#8888a0;margin-bottom:16px;">正在计算你的人格类型...</p>
        <button class="btn-next" onclick="submitMbti()">查看结果</button>
      </div>
    </div>`;

  showMbtiQuestion(0);
}

function showMbtiQuestion(idx) {
  const q = MBTI_QUESTIONS[idx];
  const total = MBTI_QUESTIONS.length;
  $('mbti-fill').style.width = `${((idx + 1) / total) * 100}%`;
  $('mbti-count').textContent = `${idx + 1} / ${total}`;

  const dimLabels = { EI: '外向 E  vs  I 内向', SN: '感觉 S  vs  N 直觉', TF: '思维 T  vs  F 情感', JP: '判断 J  vs  P 感知' };

  $('mbti-question').innerHTML = `
    <span class="quiz-cat">${dimLabels[q.dim]}</span>
    <p style="font-size:1.1rem;margin-top:8px;">${idx + 1}. 你更偏向？</p>`;

  const selected = mbtiState.answers[q.id];
  $('mbti-options').innerHTML = `
    <div class="mbti-opt ${selected === 'a' ? 'selected' : ''}" onclick="mbtiSelect('a')">
      <span class="mbti-opt-label">A</span>
      <span class="mbti-opt-text">${q.a}</span>
    </div>
    <div class="mbti-opt ${selected === 'b' ? 'selected' : ''}" onclick="mbtiSelect('b')">
      <span class="mbti-opt-label">B</span>
      <span class="mbti-opt-text">${q.b}</span>
    </div>`;

  $('mbti-prev').style.display = idx === 0 ? 'none' : 'block';
  $('mbti-next').textContent = idx === total - 1 ? '完成' : '下一题 →';
}

window.mbtiSelect = (val) => {
  const q = MBTI_QUESTIONS[mbtiState.current];
  mbtiState.answers[q.id] = val;
  document.querySelectorAll('#mbti-options .mbti-opt').forEach(el => {
    el.classList.toggle('selected', el.querySelector('.mbti-opt-label')?.textContent.toLowerCase() === val);
  });
};

window.mbtiNext = () => {
  const q = MBTI_QUESTIONS[mbtiState.current];
  if (!mbtiState.answers[q.id]) { showToast('请选择一个选项'); return; }
  if (mbtiState.current === MBTI_QUESTIONS.length - 1) {
    $('mbti-quiz-area').classList.add('hidden');
    $('mbti-submit-area').classList.remove('hidden');
    return;
  }
  mbtiState.current++;
  showMbtiQuestion(mbtiState.current);
};

window.mbtiPrev = () => {
  if (mbtiState.current > 0) { mbtiState.current--; showMbtiQuestion(mbtiState.current); }
};

window.submitMbti = function() {
  const result = calculateMBTI(mbtiState.answers);

  // 存到全局以便分享等
  currentReport = { type: 'mbti', mbtiResult: result };

  // 保存到 localStorage 历史
  const history = JSON.parse(localStorage.getItem('mbti_history') || '[]');
  history.unshift({ type: result.type, name: result.name, date: new Date().toISOString().slice(0, 10) });
  localStorage.setItem('mbti_history', JSON.stringify(history.slice(0, 10)));

  // 保存 MBTI 结果供星盘页面交叉引用
  localStorage.setItem('mbti_result', JSON.stringify({ type: result.type, name: result.name, title: result.title }));

  // 星盘交叉解读（如果有星盘数据）
  let crossData = null;
  try {
    const astroChart = JSON.parse(localStorage.getItem('astro_chart'));
    if (astroChart?.planets) {
      crossData = getMbtiAstroCross(result, astroChart.planets);
    }
  } catch (e) { /* 无星盘数据 */ }

  // 教育深度解读
  const eduData = MBTI_EDUCATION[result.type];

  renderMbtiResult(result, crossData, eduData);
  renderStep3();
  autoSaveReport('mbti', '', null, result, 'free');

  // 保存 MBTI 记录到后台
  fetch('/api/user-records', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'mbti', mbtiType: result.type, mbtiName: result.name, name: result.name })
  }).catch(() => {});
};

function renderMbtiResult(result, crossData, eduData) {
  const ds = result.dimensionScores;
  $('mbti-result').innerHTML = `
    <div class="mbti-header">
      <div class="mbti-badge-wrap">
        <span class="mbti-emoji">${result.emoji}</span>
        <span class="mbti-type-badge">${result.type}</span>
        <span class="mbti-name-badge">${result.name}</span>
      </div>
      <p class="mbti-title">${result.title}</p>
    </div>

    <div class="sr-card">
      <h4>📊 维度倾向</h4>
      <div class="mbti-dims">
        ${['EI', 'SN', 'TF', 'JP'].map(d => `
          <div class="mbti-dim">
            <div class="mbti-dim-label">${ds[d].label}</div>
            <div class="mbti-dim-bar-wrap">
              <div class="mbti-dim-bar" style="width:${ds[d].percent}%"></div>
            </div>
            <div class="mbti-dim-pct">${ds[d].percent}%</div>
          </div>
        `).join('')}
      </div>
      <p style="font-size:0.78rem;color:#64748B;margin-top:8px;text-align:center;">
        倾向强度：${ds.EI.tendency} · ${ds.SN.tendency} · ${ds.TF.tendency} · ${ds.JP.tendency}
      </p>
    </div>

    <div class="sr-card">
      <h4>🧩 认知功能栈</h4>
      <p style="font-size:0.82rem;color:#38BDF8;margin-bottom:8px;">${result.cognitiveStack}</p>
      <p>${result.cognitiveDesc}</p>
    </div>

    <div class="sr-card">
      <h4>🔍 性格解读</h4>
      <p>${result.summary}</p>
    </div>

    <div class="sr-card">
      <h4>💪 核心优势</h4>
      <p>${result.strength}</p>
    </div>

    <div class="sr-card">
      <h4>⚠️ 需要注意</h4>
      <p>${result.weakness}</p>
    </div>

    <div class="sr-card">
      <h4>🌱 成长建议</h4>
      <p>${result.growth}</p>
    </div>

    <div class="sr-card">
      <h4>💬 沟通风格</h4>
      <p>${result.communication}</p>
    </div>

    <div class="sr-card">
      <h4>💼 适合领域</h4>
      <p>${result.career}</p>
    </div>

    <div class="sr-card">
      <h4>💕 亲密关系</h4>
      <p>${result.relationship}</p>
    </div>

    <div class="sr-card">
      <h4>🔗 适合伴侣</h4>
      <p>${result.compatible}</p>
    </div>

    <div class="sr-card">
      <h4>⭐ 同类型名人</h4>
      <p>${result.famous}</p>
    </div>

    ${eduData ? `
    <div class="mbti-edu-section">
      <h3 style="text-align:center;color:#4ADE80;margin:20px 0 14px;font-size:1rem;">
        🎓 教育深度解读
      </h3>
      <div class="sr-card">
        <h4>📖 学习风格</h4>
        <p>${eduData.style}</p>
      </div>
      <div class="sr-card">
        <h4>🏫 最佳学习环境</h4>
        <p>${eduData.environment}</p>
      </div>
      <div class="sr-card">
        <h4>📝 高效学习方法</h4>
        <p>${eduData.method}</p>
      </div>
      <div class="sr-card">
        <h4>📚 优势学科方向</h4>
        <p>${eduData.subjects}</p>
      </div>
      <div class="sr-card">
        <h4>💡 学习小贴士</h4>
        <p>${eduData.tips}</p>
      </div>
      <div class="sr-card">
        <h4>🌱 学习突破方向</h4>
        <p>${eduData.growth}</p>
      </div>
      <div class="sr-card">
        <h4>👩‍🏫 适合的老师类型</h4>
        <p>${eduData.teacher}</p>
      </div>
    </div>
    ` : ''}

    ${crossData ? `
    <div class="mbti-cross-section">
      <h3 style="text-align:center;color:#38BDF8;margin:20px 0 14px;font-size:1rem;">
        🔗 星盘 × MBTI 交叉解读
      </h3>

      <div class="sr-card">
        <h4>⚡ 社交与能量风格</h4>
        <p>${crossData.energyStyle}</p>
      </div>

      <div class="sr-card">
        <h4>📖 学习与信息处理</h4>
        <p>${crossData.learningStyle}</p>
      </div>

      <div class="sr-card">
        <h4>💖 决策与情感模式</h4>
        <p>${crossData.decisionStyle}</p>
      </div>

      <div class="sr-card">
        <h4>📅 生活节奏与自律</h4>
        <p>${crossData.lifePattern}</p>
      </div>

      <div class="sr-card">
        <h4>🧩 认知功能 × 星盘洞察</h4>
        <p>${crossData.cognitiveInsight.replace(/\n/g, '<br>')}</p>
      </div>

      <div class="sr-card">
        <h4>🎯 教育路径深度建议</h4>
        <p>${crossData.educationPath.replace(/\n/g, '<br>')}</p>
      </div>

      <div class="sr-card">
        <h4>🌱 综合成长方向</h4>
        <p>${crossData.growthDirection.replace(/\n/g, '<br>')}</p>
      </div>

      <div class="sr-card">
        <h4>🪐 五大行星速览</h4>
        <p style="white-space:pre-line">${crossData.planetQuickView}</p>
      </div>
    </div>
    ` : `
    <div class="sr-card" style="text-align:center;border:1px dashed #1A2332;">
      <h4>🔗 星盘交叉解读</h4>
      <p style="color:#64748B;">尚未生成星盘解读。<br><a href="#" onclick="goHome();return false;" style="color:#38BDF8;">先做星盘测试</a>，获得更完整的人格画像。</p>
    </div>
    `}
    `;
}

// ================================================================
//  VARK 学习风格测试
// ================================================================

function renderVarkQuiz() {
  varkState = { current: 0, answers: {} };
  $('form-content').innerHTML = `
    <div class="quiz-container">
      <div class="quiz-header">
        <h2>VARK 学习风格测试</h2>
        <p>共 ${VARK_QUESTIONS.length} 题，每题四选一，预计 3 分钟</p>
        <p style="font-size:0.75rem;color:#64748B;">测出你的学习偏好类型：视觉型 / 听觉型 / 读写型 / 动觉型</p>
      </div>
      <div id="vark-quiz-area">
        <div class="quiz-progress">
          <div class="quiz-bar"><div class="quiz-fill" id="vark-fill" style="width:0%"></div></div>
          <div class="quiz-count" id="vark-count">1 / ${VARK_QUESTIONS.length}</div>
        </div>
        <div class="vark-question" id="vark-question"></div>
        <div class="vark-options" id="vark-options"></div>
        <div class="quiz-nav">
          <button class="btn btn-prev" id="vark-prev" onclick="varkPrev()" style="display:none;">← 上一题</button>
          <button class="btn btn-next" id="vark-next" onclick="varkNext()">下一题 →</button>
        </div>
      </div>
      <div id="vark-submit-area" class="hidden" style="text-align:center;padding:30px 0;">
        <p style="font-size:1rem;margin-bottom:6px;color:#e8e6f0;">所有题目已答完！</p>
        <p style="font-size:0.85rem;color:#8888a0;margin-bottom:16px;">正在分析你的学习风格偏好...</p>
        <button class="btn-next" onclick="submitVark()">查看结果</button>
      </div>
    </div>`;
  showVarkQuestion(0);
}

function showVarkQuestion(idx) {
  const q = VARK_QUESTIONS[idx];
  const total = VARK_QUESTIONS.length;
  const fill = $('vark-fill');
  if (fill) fill.style.width = `${((idx + 1) / total) * 100}%`;
  const count = $('vark-count');
  if (count) count.textContent = `${idx + 1} / ${total}`;

  const dimColors = { v: '#4ADE80', a: '#38BDF8', r: '#FBBF24', k: '#F87171' };
  const dimLabels = { v: '视觉', a: '听觉', r: '读写', k: '动觉' };

  const qEl = $('vark-question');
  if (qEl) qEl.innerHTML = `<p style="font-size:1.05rem;margin:12px 0;">${idx + 1}. 在以下情境中，你更倾向哪种方式？</p>`;

  const selected = varkState.answers[q.id];
  const optEl = $('vark-options');
  if (optEl) {
    optEl.innerHTML = ['v', 'a', 'r', 'k'].map(key => `
      <div class="vark-opt ${selected === key ? 'selected' : ''}" data-vark="${key}" style="border-left:3px solid ${dimColors[key]};">
        <span class="vark-opt-tag" style="background:${dimColors[key]};">${dimLabels[key]}</span>
        <span class="vark-opt-text">${q[key]}</span>
      </div>
    `).join('');
    // 绑定点击事件
    optEl.querySelectorAll('.vark-opt').forEach(el => {
      el.addEventListener('click', () => varkSelect(el.dataset.vark));
    });
  }

  const prev = $('vark-prev');
  if (prev) prev.style.display = idx === 0 ? 'none' : 'block';
  const next = $('vark-next');
  if (next) next.textContent = idx === total - 1 ? '完成' : '下一题 →';
}

window.varkSelect = (val) => {
  const q = VARK_QUESTIONS[varkState.current];
  varkState.answers[q.id] = val;
  document.querySelectorAll('#vark-options .vark-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset?.vark === val);
  });
};

// varkSelect 用 data-vark 属性实现，见 showVarkQuestion

window.varkNext = () => {
  const q = VARK_QUESTIONS[varkState.current];
  if (!varkState.answers[q.id]) { showToast('请选择一个选项'); return; }
  if (varkState.current === VARK_QUESTIONS.length - 1) {
    const area = $('vark-quiz-area');
    if (area) area.classList.add('hidden');
    const submitArea = $('vark-submit-area');
    if (submitArea) submitArea.classList.remove('hidden');
    return;
  }
  varkState.current++;
  showVarkQuestion(varkState.current);
};

window.varkPrev = () => {
  if (varkState.current > 0) { varkState.current--; showVarkQuestion(varkState.current); }
};

window.submitVark = function() {
  const result = calculateVARK(varkState.answers);
  currentReport = { type: 'vark', varkResult: result };

  // 保存历史
  const history = JSON.parse(localStorage.getItem('vark_history') || '[]');
  history.unshift({ primary: result.primary, primaryName: result.primaryName, date: new Date().toISOString().slice(0, 10) });
  localStorage.setItem('vark_history', JSON.stringify(history.slice(0, 10)));

  renderVarkResult(result);
  renderStep3();
  autoSaveReport('vark', '', null, result, 'free');

  fetch('/api/user-records', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'vark', varkPrimary: result.primary, varkName: result.primaryName })
  }).catch(() => {});
};

function renderVarkResult(result) {
  const summary = getVARKSummary(result);
  $('vark-result').innerHTML = `
    <div class="mbti-header">
      <div class="mbti-badge-wrap">
        <span class="mbti-type-badge" style="background:#7C3AED;">VARK</span>
        <span class="mbti-name-badge" style="background:#38BDF8;">${result.primaryName}</span>
      </div>
      <p class="mbti-title" style="font-size:0.95rem;">你的主导学习风格</p>
    </div>

    <div class="sr-card">
      <h4>📊 四维度得分</h4>
      <div class="mbti-dims">
        ${summary.bars.map(b => `
          <div class="mbti-dim">
            <div class="mbti-dim-label">${b.label} (${b.dim})</div>
            <div class="mbti-dim-bar-wrap">
              <div class="mbti-dim-bar" style="width:${b.pct}%;background:${b.dim === 'V' ? '#4ADE80' : b.dim === 'A' ? '#38BDF8' : b.dim === 'R' ? '#FBBF24' : '#F87171'};"></div>
            </div>
            <div class="mbti-dim-pct">${b.score}/${result.total} (${b.pct}%)</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="sr-card">
      <h4>📖 风格解读</h4>
      <p>${result.primaryDesc}</p>
    </div>

    <div class="sr-card">
      <h4>💡 高效学习方法</h4>
      <p>${result.studyTips}</p>
    </div>

    <div class="sr-card">
      <h4>💼 适合方向</h4>
      <p>${result.careerSuggestions}</p>
    </div>
  `;
}

// ================================================================
//  学业自我效能感测试
// ================================================================

function renderEfficacyQuiz() {
  efficacyState = { current: 0, answers: {} };
  $('form-content').innerHTML = `
    <div class="quiz-container">
      <div class="quiz-header">
        <h2>学业自我效能感测评</h2>
        <p>共 ${EFFICACY_QUESTIONS.length} 题，5 级评分，预计 5 分钟</p>
        <p style="font-size:0.75rem;color:#64748B;">了解你的学习能力和学习行为自信心</p>
      </div>
      <div id="efficacy-quiz-area">
        <div class="quiz-progress">
          <div class="quiz-bar"><div class="quiz-fill" id="efficacy-fill" style="width:0%"></div></div>
          <div class="quiz-count" id="efficacy-count">1 / ${EFFICACY_QUESTIONS.length}</div>
        </div>
        <div class="efficacy-question" id="efficacy-question"></div>
        <div class="efficacy-options" id="efficacy-options"></div>
        <div class="quiz-nav">
          <button class="btn btn-prev" id="efficacy-prev" onclick="efficacyPrev()" style="display:none;">← 上一题</button>
          <button class="btn btn-next" id="efficacy-next" onclick="efficacyNext()">下一题 →</button>
        </div>
      </div>
      <div id="efficacy-submit-area" class="hidden" style="text-align:center;padding:30px 0;">
        <p style="font-size:1rem;margin-bottom:6px;color:#e8e6f0;">所有题目已答完！</p>
        <p style="font-size:0.85rem;color:#8888a0;margin-bottom:16px;">正在计算你的学业自我效能感...</p>
        <button class="btn-next" onclick="submitEfficacy()">查看结果</button>
      </div>
    </div>`;
  showEfficacyQuestion(0);
}

function showEfficacyQuestion(idx) {
  const q = EFFICACY_QUESTIONS[idx];
  const total = EFFICACY_QUESTIONS.length;
  const fill = $('efficacy-fill');
  if (fill) fill.style.width = `${((idx + 1) / total) * 100}%`;
  const count = $('efficacy-count');
  if (count) count.textContent = `${idx + 1} / ${total}`;

  const qEl = $('efficacy-question');
  if (qEl) qEl.innerHTML = `<p style="font-size:1.05rem;margin:12px 0;">${idx + 1}. ${q.text}</p>`;

  const selected = efficacyState.answers[q.id];
  const optEl = $('efficacy-options');
  if (optEl) {
    optEl.innerHTML = LIKERT_5.map(opt => `
      <div class="efficacy-opt ${selected === opt.value ? 'selected' : ''}" data-efficacy="${opt.value}">
        <span class="efficacy-opt-num">${opt.value}</span>
        <span class="efficacy-opt-text">${opt.label}</span>
      </div>
    `).join('');
    optEl.querySelectorAll('.efficacy-opt').forEach(el => {
      el.addEventListener('click', () => efficacySelect(parseInt(el.dataset.efficacy)));
    });
  }

  const prev = $('efficacy-prev');
  if (prev) prev.style.display = idx === 0 ? 'none' : 'block';
  const next = $('efficacy-next');
  if (next) next.textContent = idx === total - 1 ? '完成' : '下一题 →';
}

window.efficacySelect = (val) => {
  const q = EFFICACY_QUESTIONS[efficacyState.current];
  efficacyState.answers[q.id] = val;
  document.querySelectorAll('#efficacy-options .efficacy-opt').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.efficacy) === val);
  });
};

window.efficacyNext = () => {
  const q = EFFICACY_QUESTIONS[efficacyState.current];
  if (!efficacyState.answers[q.id]) { showToast('请选择一个选项'); return; }
  if (efficacyState.current === EFFICACY_QUESTIONS.length - 1) {
    const area = $('efficacy-quiz-area');
    if (area) area.classList.add('hidden');
    const submitArea = $('efficacy-submit-area');
    if (submitArea) submitArea.classList.remove('hidden');
    return;
  }
  efficacyState.current++;
  showEfficacyQuestion(efficacyState.current);
};

window.efficacyPrev = () => {
  if (efficacyState.current > 0) { efficacyState.current--; showEfficacyQuestion(efficacyState.current); }
};

window.submitEfficacy = function() {
  const result = calculateEfficacy(efficacyState.answers);
  currentReport = { type: 'efficacy', efficacyResult: result };

  // 保存历史
  const history = JSON.parse(localStorage.getItem('efficacy_history') || '[]');
  history.unshift({
    abilityAvg: result.ability.avg.toFixed(1),
    behaviorAvg: result.behavior.avg.toFixed(1),
    totalAvg: result.total.avg.toFixed(1),
    date: new Date().toISOString().slice(0, 10)
  });
  localStorage.setItem('efficacy_history', JSON.stringify(history.slice(0, 10)));

  renderEfficacyResult(result);
  renderStep3();
  autoSaveReport('efficacy', '', null, result, 'free');

  fetch('/api/user-records', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'efficacy', efficacyTotal: result.total.avg.toFixed(1) })
  }).catch(() => {});
};

function renderEfficacyResult(result) {
  const levelColors = { '高': '#4ADE80', '中等偏高': '#38BDF8', '中等偏低': '#FBBF24', '较低': '#F87171' };
  $('efficacy-result').innerHTML = `
    <div class="mbti-header">
      <div class="mbti-badge-wrap">
        <span class="mbti-type-badge" style="background:#0EA5E9;">效能感</span>
        <span class="mbti-name-badge" style="background:${levelColors[result.total.level.label]};">${result.total.level.label}</span>
      </div>
      <p class="mbti-title" style="font-size:0.95rem;">学业自我效能感综合水平</p>
    </div>

    <div class="sr-card">
      <h4>📊 综合得分</h4>
      <div style="text-align:center;padding:12px 0;">
        <span style="font-size:2.5rem;font-weight:700;color:${levelColors[result.total.level.label]};">${result.total.avg.toFixed(1)}</span>
        <span style="font-size:0.85rem;color:#64748B;"> / 5.0</span>
        <div style="margin-top:4px;">
          <span style="display:inline-block;padding:2px 12px;border-radius:10px;font-size:0.8rem;background:${result.total.level.color}22;color:${result.total.level.color};font-weight:600;">${result.total.level.label}</span>
        </div>
      </div>
    </div>

    <div class="sr-card">
      <h4>📈 各维度得分</h4>
      <div class="mbti-dims">
        ${[
          { key: 'ability', label: result.dimNames.ability, data: result.ability },
          { key: 'behavior', label: result.dimNames.behavior, data: result.behavior },
        ].map(d => {
          const pct = Math.round(d.data.avg / 5 * 100);
          return `
            <div class="mbti-dim">
              <div class="mbti-dim-label">${d.label}</div>
              <div class="mbti-dim-bar-wrap">
                <div class="mbti-dim-bar" style="width:${pct}%;background:${levelColors[d.data.level.label]};"></div>
              </div>
              <div class="mbti-dim-pct">${d.data.avg.toFixed(1)}</div>
            </div>
            <p style="font-size:0.78rem;color:#64748B;margin:-4px 0 10px 0;">${d.data.level.label} · ${d.data.sum}分/满分${d.data.count * 5}分</p>
          `;
        }).join('')}
      </div>
    </div>

    <div class="sr-card">
      <h4>📖 能力维度解读</h4>
      <p>${result.dimDescs.ability}</p>
      ${result.ability.level.label === '较低' || result.ability.level.label === '中等偏低'
        ? '<p style="color:#F87171;margin-top:6px;">💡 建议：多关注自己的进步而非与他人比较，设定小目标逐步积累成功体验。</p>'
        : ''}
    </div>

    <div class="sr-card">
      <h4>📖 行为维度解读</h4>
      <p>${result.dimDescs.behavior}</p>
      ${result.behavior.level.label === '较低' || result.behavior.level.label === '中等偏低'
        ? '<p style="color:#F87171;margin-top:6px;">💡 建议：尝试学习一些学习策略（如思维导图、费曼学习法），有意识地练习自我监控和反思。</p>'
        : ''}
    </div>

    <div class="sr-card">
      <h4>🌱 综合建议</h4>
      <p>${getEfficacyAdvice(result)}</p>
    </div>
  `;
}

function getEfficacyAdvice(result) {
  const a = result.ability.avg;
  const b = result.behavior.avg;
  if (a >= 4 && b >= 4) return '你的学业自我效能感整体较高！你既相信自己的学习能力，也善于运用有效的学习策略。继续保持当前的学习节奏，同时可以尝试挑战更高难度的任务来进一步成长。';
  if (a >= 4 && b < 3) return '你对自己的学习能力很有信心，但在学习方法和策略运用上还有提升空间。建议学习一些高效的学习技巧（如间隔重复、主动回忆），将你的能力信心转化为有效行动。';
  if (a < 3 && b >= 4) return '你善于使用学习策略和方法，但对自己的学习能力信心不足。试着记录自己的每一次小进步，相信"方法对+持续做=好结果"。你已经有了好的学习习惯，能力会随之而来。';
  if (a < 2.5 && b < 2.5) return '你的学业自我效能感目前偏低，但这恰恰意味着巨大的成长空间。建议从最简单的学习任务开始，每次完成后给自己积极的反馈。同时寻求老师或同学的帮助，学习有效的学习方法。记住：效能感是可以培养的。';
  return '你的学业自我效能感处于中等水平，有不错的提升基础。建议在优势维度上继续发挥，同时在薄弱维度上有针对性地练习。设定可实现的小目标，逐步建立信心。';
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
  track('click_wechat', { page: currentTestType === 'star' ? 'report' : 'mbti' });
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
  badge.textContent = '劲脑·天赋探测仪';
  badge.className = `report-badge ${version}`;
  $('report-title').textContent = `${report.name || '宝贝'}的专属星盘解读`;
  const summary = report.chartSummary || {};
  $('report-summary').textContent = `太阳：${summary.sun || '--'} | 月亮：${summary.moon || '--'} | 上升：${summary.rising || '--'}`;

  let html = `<div class="chart-summary">`;
  html += `<div class="chart-pill"><div class="pill-label">太阳</div><div class="pill-value">${summary.sun ? summary.sun.replace(/[°′].*/, '') : '--'}</div></div>`;
  html += `<div class="chart-pill"><div class="pill-label">月亮</div><div class="pill-value">${summary.moon ? summary.moon.replace(/[°′].*/, '') : '--'}</div></div>`;
  html += `<div class="chart-pill"><div class="pill-label">上升</div><div class="pill-value">${summary.rising ? summary.rising.replace(/[°′].*/, '') : '--'}</div></div>`;
  html += `</div>`;

  (report.sections || []).forEach(section => {
    html += renderSection(section);
  });
  $('report-content').innerHTML = html;

  const footer = $('report-footer');
  if (report.footer) {
    footer.innerHTML = `<div class="report-footer-inner">${report.footer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>`;
  } else {
    footer.innerHTML = renderLeadBox();
  }

  renderCommentSection('star');
  trackReportSectionViews();

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

    default: if (typeof c === 'string') html += `<div class="value">${c}</div>`;
  }
  html += `</div>`;
  return html;
}

function renderSun(c) { return `<div class="content-block"><div class="label">孩子的性格</div><div class="value">${c.child||''}</div></div><div class="content-block"><div class="label">给父母的建议</div><div class="value">${c.parent||''}</div></div><div class="content-block"><div class="label">学习建议</div><div class="value">${c.edu||''}</div></div><div class="content-block"><div class="label">天生优势</div><div class="value">${c.strength||''}</div></div><div class="content-block"><div class="label">成长挑战</div><div class="value">${c.challenge||''}</div></div>`; }
function renderMoon(c) { return `<div class="content-block"><div class="label">情绪特点</div><div class="value">${c.child||''}</div></div><div class="content-block"><div class="label">父母的回应方式</div><div class="value">${c.parent||''}</div></div>${c.parenting_style ? '<div class="content-block"><div class="label">养育方式反思</div><div class="value">' + c.parenting_style + '</div></div>' : ''}<div class="content-block"><div class="label">情感需求</div><div class="value">${c.need||''}</div></div>`; }
function renderRising(c) { return `<div class="content-block"><div class="label">给人的印象</div><div class="value">${c.desc||''}</div></div>${c.social_strength ? '<div class="content-block"><div class="label">社交优势</div><div class="value">' + c.social_strength + '</div></div>' : ''}${c.social_weakness ? '<div class="content-block"><div class="label">社交注意事项</div><div class="value">' + c.social_weakness + '</div></div>' : ''}${c.parent_guide ? '<div class="content-block"><div class="label">家长引导建议</div><div class="value">' + c.parent_guide + '</div></div>' : '<div class="content-block"><div class="label">社交风格</div><div class="value">' + (c.social||'') + '</div></div>'}`; }

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
  if (typeof aspects === 'string') {
    return `<div class="value" style="padding:4px 0;line-height:1.8;">${aspects}</div>`;
  }
  if (!aspects || !aspects.length) return '<div style="color:#8888a0;padding:8px;">未发现显著相位</div>';

  const PLANET_NAMES = ['太阳','月亮','水星','金星','火星','木星','土星','天王星','海王星','冥王星'];
  const PLANET_KEYS = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  const SYMBOLS = {sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇'};
  const TYPE_MAP = {'合相':'conjunction','三分相':'trine','六分相':'sextile','四分相':'square','对分相':'opposition'};
  const TYPE_SYMS = {'合相':'☌','三分相':'△','六分相':'✡','四分相':'□','对分相':'☍'};

  // Extract planet names from a display string like "太阳☌水星（合相）"
  function parseDisplay(display) {
    const ps = PLANET_NAMES.filter(n => display.includes(n));
    const tm = display.match(/[（(](.+?)[）)]/);
    return { p1: ps[0]||'', p2: ps[1]||'', type: tm ? tm[1] : '' };
  }

  // Build aspect card HTML for one aspect
  function cardHTML(a) {
    let p1Name, p2Name, type, typeCls;
    if (a.planet1En) {
      p1Name = PLANETS_CN?.[a.planet1En] || a.planet1 || '';
      p2Name = PLANETS_CN?.[a.planet2En] || a.planet2 || '';
      type = a.type || '';
      typeCls = TYPE_MAP[type] || '';
    } else if (a.display) {
      const parsed = parseDisplay(a.display);
      p1Name = parsed.p1;
      p2Name = parsed.p2;
      type = parsed.type;
      typeCls = TYPE_MAP[type] || '';
    } else {
      return '';
    }

    // Find planet key for symbol
    const p1Key = PLANET_NAMES.indexOf(p1Name) >= 0 ? PLANET_KEYS[PLANET_NAMES.indexOf(p1Name)] : '';
    const p2Key = PLANET_NAMES.indexOf(p2Name) >= 0 ? PLANET_KEYS[PLANET_NAMES.indexOf(p2Name)] : '';
    const p1Sym = p1Key ? SYMBOLS[p1Key] : '';
    const p2Sym = p2Key ? SYMBOLS[p2Key] : '';
    const typeSym = TYPE_SYMS[type] || '';

    return `
      <div class="aspect-card">
        <div class="aspect-card-header">
          <div class="aspect-card-planets">
            <span class="aspect-planet-badge"><span class="planet-symbol">${p1Sym}</span><span class="planet-name">${p1Name}</span></span>
            <span style="color:#475569;font-size:0.7rem;">&nbsp;—&nbsp;</span>
            <span class="aspect-planet-badge"><span class="planet-symbol">${p2Sym}</span><span class="planet-name">${p2Name}</span></span>
          </div>
          <span class="aspect-type-pill ${typeCls}">${typeSym} ${type}</span>
        </div>
        ${a.interpretation ? `<div class="aspect-card-body">${a.interpretation}</div>` : ''}
      </div>
    `;
  }

  // Group by harmony vs challenge
  const harmony = aspects.filter(a => {
    const t = a.type || (a.display ? parseDisplay(a.display).type : '');
    return ['三分相','六分相','合相'].includes(t);
  });
  const challenge = aspects.filter(a => {
    const t = a.type || (a.display ? parseDisplay(a.display).type : '');
    return ['四分相','对分相'].includes(t);
  });
  const others = aspects.filter(a => !harmony.includes(a) && !challenge.includes(a));

  let html = `<div class="aspect-cards">`;
  if (harmony.length) {
    html += `<div class="aspect-group"><div class="aspect-group-title" style="color:#4caf50;">✦ 和谐相位</div>`;
    harmony.forEach(a => { html += cardHTML(a); });
    html += `</div>`;
  }
  if (challenge.length) {
    html += `<div class="aspect-group"><div class="aspect-group-title" style="color:#f44336;">⚡ 挑战相位</div>`;
    challenge.forEach(a => { html += cardHTML(a); });
    html += `</div>`;
  }
  if (others.length) {
    others.forEach(a => { html += cardHTML(a); });
  }
  html += `</div>`;
  return html;
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
  // backward compatibility: renderEmotion still renders old format
  return renderPsychology(c);
}
function renderPsychology(c) {
  let html = '';
  if (c.personality_type) html += '<div class="content-block"><div class="label">心理气质类型</div><div class="value">' + c.personality_type + '</div></div>';
  if (c.inner_world) html += '<div class="content-block"><div class="label">内心世界</div><div class="value">' + c.inner_world + '</div></div>';
  if (c.parent_child_dynamics) html += '<div class="content-block"><div class="label">亲子关系诊断</div><div class="value">' + c.parent_child_dynamics + '</div></div>';
  if (c.attachment_style) html += '<div class="content-block"><div class="label">依恋类型分析</div><div class="value">' + c.attachment_style + '</div></div>';
  if (c.emotional_trigger) html += '<div class="content-block"><div class="label">情绪触发点</div><div class="value">' + c.emotional_trigger + '</div></div>';
  if (c.communication_formula) html += '<div class="content-block"><div class="label">沟通黄金法则</div><div class="value">' + c.communication_formula + '</div></div>';
  // Old emotion fields (backward compat)
  if (!c.personality_type && !c.inner_world && c.child) html += '<div class="content-block"><div class="label">情绪特点</div><div class="value">' + c.child + '</div></div>';
  if (!c.parent_child_dynamics && c.parent) html += '<div class="content-block"><div class="label">父母的回应方式</div><div class="value">' + c.parent + '</div></div>';
  if (c.need && !c.inner_world) html += '<div class="content-block"><div class="label">情感需求</div><div class="value">' + c.need + '</div></div>';
  if (c.pattern) html += '<div class="content-block"><div class="label">情绪模式</div><div class="value">' + c.pattern + '</div></div>';
  if (c.security) html += '<div class="content-block"><div class="label">安全感来源</div><div class="value">' + c.security + '</div></div>';
  if (c.soothe) html += '<div class="content-block"><div class="label">安抚方式</div><div class="value">' + c.soothe + '</div></div>';
  if (c.momReflection) html += '<div class="content-block"><div class="label">母亲形象反思</div><div class="value">' + c.momReflection + '</div></div>';
  if (c.communication) html += '<div class="content-block"><div class="label">沟通策略</div><div class="value">' + c.communication + '</div></div>';
  return html;
}function renderParenting(c) {
  let html = '';
  if (c.family_atmosphere) html += '<div class="content-block"><div class="label">家庭氛围诊断</div><div class="value">' + c.family_atmosphere + '</div></div>';
  if (c.father_role) html += '<div class="content-block"><div class="label">父亲角色建议</div><div class="value">' + c.father_role + '</div></div>';
  if (c.mother_role) html += '<div class="content-block"><div class="label">母亲角色建议</div><div class="value">' + c.mother_role + '</div></div>';
  if (c.parenting_strength) html += '<div class="content-block"><div class="label">你们的养育优势</div><div class="value">' + c.parenting_strength + '</div></div>';
  if (c.parenting_risk) html += '<div class="content-block"><div class="label">最容易踩的坑</div><div class="value">' + c.parenting_risk + '</div></div>';
  if (c.action_tips) html += '<div class="content-block"><div class="label">行动建议</div><div class="value">' + c.action_tips + '</div></div>';
  if (c.family_ritual) html += '<div class="content-block"><div class="label">推荐家庭仪式</div><div class="value">' + c.family_ritual + '</div></div>';
  // Old fields from other sections for backward compat
  if (c.atmosphere) html += '<div class="content-block"><div class="label">家庭氛围</div><div class="value">' + c.atmosphere + '</div></div>';
  if (c.father) html += '<div class="content-block"><div class="label">父亲角色</div><div class="value">' + c.father + '</div></div>';
  if (c.mother) html += '<div class="content-block"><div class="label">母亲角色</div><div class="value">' + c.mother + '</div></div>';
  if (c.action_tips && !c.action_tips) html += '<div class="content-block"><div class="label">行动建议</div><div class="value">' + c.action_tips + '</div></div>';
  return html;
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
  track('click_talent', { page: 'report', label: currentTestType || 'star' });
  const dialog = document.getElementById('talent-modal') || createTalentModal();
  dialog.showModal();
};



// ================================================================
//  用户系统（登录 / 历史记录）
// ================================================================

window.showUserPage = function() {
  if (currentUser) {
    renderUserProfile();
  } else {
    renderUserLogin();
  }
  showPage('user');
};

window.closeUserPage = function() {
  if (currentUser) showPage('home');
  else showPage('home');
};

function renderUserLogin() {
  // 检查是否是微信浏览器
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

  $('user-content').innerHTML = `
    <div style="padding:40px 20px;text-align:center;">
      <div style="font-size:3rem;margin-bottom:12px;">👤</div>
      <h2 style="color:#E2E8F0;font-size:1.2rem;margin-bottom:6px;">登录账号</h2>
      <p style="color:#64748B;font-size:0.85rem;margin-bottom:24px;">登录后可同步你的测试记录</p>

      ${isWeChat ? `
        <button class="btn-next" onclick="wechatLogin()" style="width:100%;max-width:280px;padding:14px 0;">
          微信一键登录
        </button>
        <p style="color:#475569;font-size:0.75rem;margin-top:10px;">微信授权仅获取OpenID，不会获取个人信息</p>
      ` : `
        <div style="background:#0F172A;border-radius:12px;padding:20px;max-width:320px;margin:0 auto;">
          <p style="color:#94A3B8;font-size:0.85rem;margin-bottom:12px;">请填写昵称快速体验</p>
          <input class="input-field" id="guest-name" placeholder="你的昵称" maxlength="12"
            style="width:100%;box-sizing:border-box;text-align:center;" />
          <button class="btn-next" onclick="guestLogin()" style="width:100%;margin-top:12px;padding:12px 0;">
            进入
          </button>
        </div>
        <p style="color:#475569;font-size:0.75rem;margin-top:12px;">
          在微信中打开可自动登录，同步多设备记录
        </p>
      `}
    </div>`;
}

// 微信登录
window.wechatLogin = function() {
  const appId = WECHAT_APPID;
  if (!appId) { showToast('微信登录暂未配置'); return; }
  const redirectUri = encodeURIComponent(window.location.href.split('?')[0]);
  const oauthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=login#wechat_redirect`;
  sessionStorage.setItem('oauth_return', 'login');
  window.location.href = oauthUrl;
};

// 访客登录
window.guestLogin = function() {
  const name = ($('guest-name')?.value || '').trim() || '访客';
  const guestId = 'guest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  // 生成8位显示ID（不含数字0，尾号不为0）
  let displayId = parseInt(localStorage.getItem('guest_display_id') || '0');
  if (!displayId) {
    do {
      displayId = 11342801 + Math.floor(Math.random() * 80000);
    } while (/0/.test(String(displayId)));
    localStorage.setItem('guest_display_id', String(displayId));
  }
  currentUser = { userId: guestId, displayId, openId: guestId, nickName: name, traits: {}, createdAt: new Date().toISOString() };
  localStorage.setItem('user_info', JSON.stringify(currentUser));
  showToast('欢迎，' + name);
  renderUserProfile();
};

function renderUserProfile() {
  const user = currentUser;
  if (!user) { renderUserLogin(); return; }

  // 并行加载报告和订单
  Promise.all([
    loadUserReports(user.openId),
    loadUserOrders(user.openId),
  ]).then(([reports, orders]) => {
    const count = reports.length;
    const paidCount = reports.filter(r => r.paid).length;

    // 获取分码信息
    fetch(`/api/user/share?openId=${encodeURIComponent(user.openId)}`).then(r => r.json()).then(data => {
      const shareCode = data.success ? data.shareInfo?.shareCode || '' : '';
      const shareLink = data.success ? data.shareInfo?.shareLink || '' : '';
      const fanStats = data.success ? data.fanStats : null;
      renderProfileHTML(reports, orders, count, paidCount, shareCode, shareLink, fanStats);
    }).catch(() => {
      renderProfileHTML(reports, orders, count, paidCount, '', '', null);
    });
  }).catch(() => {
    $('user-content').innerHTML = `<div style="padding:40px 20px;text-align:center;color:#64748B;">加载失败</div>`;
  });
}

function renderProfileHTML(reports, orders, count, paidCount, shareCode, shareLink, fanStats) {
  const user = currentUser;

  // 报告列表 HTML
  const reportsHTML = count === 0 ? `
    <div class="profile-empty">
      还没有测评记录<br>
      <span style="cursor:pointer;color:#38BDF8;" onclick="goHome();closeUserPage();">去首页开始测试 →</span>
    </div>
  ` : `
    <div class="profile-report-list">
      ${reports.map(r => `
        <div class="profile-report-item" onclick="viewUserReport('${r.id}')">
          <div class="profile-report-icon">${getReportIcon(r.type)}</div>
          <div class="profile-report-info">
            <div class="profile-report-name">${r.name || '未命名'} <span class="profile-report-type">${getReportTypeName(r.type)}</span></div>
            <div class="profile-report-meta">${formatDate(r.createdAt)}</div>
          </div>
          <span class="profile-report-badge ${r.paid ? 'paid' : 'free'}">${r.paid ? '深度' : '免费'}</span>
        </div>
      `).join('')}
    </div>
  `;

  // 订单列表 HTML
  const paidOrders = orders.filter(o => o.status === 'paid');
  const ordersHTML = paidOrders.length === 0 ? `
    <div class="profile-empty">暂无订单记录</div>
  ` : `
    <div class="profile-order-list">
      ${paidOrders.slice(0, 5).map(o => `
        <div class="profile-order-item">
          <div class="profile-order-info">
            <div class="profile-order-name">${o.description || '深度版报告'}</div>
            <div class="profile-order-meta">${formatDate(o.paidAt)}</div>
          </div>

        </div>
      `).join('')}
      ${paidOrders.length > 5 ? `<div class="profile-more">共 ${paidOrders.length} 笔订单</div>` : ''}
    </div>
  `;

  // 分享码区域
  const shareHTML = shareCode ? `
    <div class="profile-share-bar">
      <span class="profile-share-label">🔗 分享码</span>
      <span class="profile-share-code">${shareCode}</span>
      <button class="profile-share-btn" onclick="copyShareLink('${shareLink}')">复制</button>
    </div>
    <div class="profile-share-stats">
      <span>👥 ${fanStats?.totalFans || 0} 粉丝</span>
      <span>📈 ${fanStats?.newThisWeek || 0} 本周新增</span>
    </div>
  ` : '';

  $('user-content').innerHTML = `
    <div class="profile-page">

      <!-- 用户资料头部 -->
      <div class="profile-header">
        <div class="profile-avatar">${user.openId.startsWith('guest_') ? '👤' : '👤'}</div>
        <div class="profile-name">${user.nickName}</div>
        <div class="profile-uid">UID ${user.displayId || '------'}</div>
        <div class="profile-badge">${count} 份测评 · ${paidCount} 次付费</div>
      </div>

      <!-- 分享码 -->
      ${shareHTML}

      <!-- 菜单列表 -->
      <div class="profile-body">

        <!-- 我的测评 -->
        <div class="profile-menu-section">
          <div class="profile-menu-title">
            <span>📋 我的测评</span>
            <span class="profile-menu-count">${count}</span>
          </div>
          ${reportsHTML}
        </div>

        <!-- 订单记录 -->
        <div class="profile-menu-section">
          <div class="profile-menu-title">
            <span>📦 订单记录</span>
            <span class="profile-menu-count">${paidOrders.length}</span>
          </div>
          ${ordersHTML}
        </div>

        <!-- 我的服务 -->
        <div class="profile-menu-section">
          <div class="profile-menu-title"><span>⭐ 我的服务</span></div>
          <div class="profile-service-grid">
            <div class="profile-service-item" onclick="openDistributorCenter()">
              <div class="profile-service-icon dist">💰</div>
              <span>推广赚钱</span>
            </div>
            <div class="profile-service-item" onclick="copyShareLink('${shareLink}')">
              <div class="profile-service-icon share">🔗</div>
              <span>分享好友</span>
            </div>
            <div class="profile-service-item" onclick="window.goHome();closeUserPage();">
              <div class="profile-service-icon test">🧠</div>
              <span>开始测评</span>
            </div>
            <div class="profile-service-item" onclick="showToast('即将上线，敬请期待')">
              <div class="profile-service-icon vip">👑</div>
              <span>会员中心</span>
            </div>
          </div>
        </div>

        <!-- 建议与反馈 / 关于我 -->
        <div class="profile-menu-item" onclick="showFeedbackModal()">
          <span>💬 建议与反馈</span>
          <span class="profile-menu-arrow">›</span>
        </div>
        <div class="profile-menu-item" onclick="showAboutModal()">
          <span>ℹ️ 关于我</span>
          <span class="profile-menu-arrow">›</span>
        </div>

        <!-- 公众号宣传位 -->
        <div class="profile-oa-banner" onclick="copyOaText()">
          <div class="profile-oa-icon">📢</div>
          <div class="profile-oa-content">
            <div class="profile-oa-title">关注公众号 · 获取更多干货</div>
            <div class="profile-oa-desc">星盘知识 · 教育方法 · 天赋培养</div>
          </div>
          <div class="profile-oa-arrow">›</div>
        </div>

        <!-- 退出登录 -->
        <button class="profile-logout" onclick="logoutUser()">退出登录</button>

      </div>
    </div>`;
}
async function loadUserOrders(openId) {
  try {
    const resp = await fetch(`/api/payment/orders?openId=${encodeURIComponent(openId)}`);
    const data = await resp.json();
    return data.orders || [];
  } catch { return []; }
}

// ========== 建议与反馈弹窗 ==========

function showFeedbackModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span>💬 建议与反馈</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <p style="color:#64748B;font-size:0.85rem;margin-bottom:14px;line-height:1.6;">
          你的每一条建议都帮助我们做得更好
        </p>
        <textarea id="feedback-input" class="modal-textarea" placeholder="请描述你的建议或遇到的问题..." rows="4"></textarea>
        <button class="btn-next" onclick="submitFeedback()" style="width:100%;padding:12px 0;font-size:0.9rem;">提交反馈</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

window.submitFeedback = function() {
  const text = document.getElementById('feedback-input')?.value?.trim();
  if (!text) { showToast('请输入反馈内容'); return; }
  // 存到本地或发送到服务器
  const feedbacks = JSON.parse(localStorage.getItem('user_feedbacks') || '[]');
  feedbacks.push({ text, createdAt: new Date().toISOString(), user: currentUser?.nickName || '' });
  localStorage.setItem('user_feedbacks', JSON.stringify(feedbacks));
  showToast('感谢你的反馈！');
  document.querySelector('.modal-overlay')?.remove();
  // 尝试同步到服务器
  if (currentUser?.openId && !currentUser.openId.startsWith('guest_')) {
    fetch('/api/user/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openId: currentUser.openId, event: 'feedback', meta: { content: text } })
    }).catch(() => {});
  }
};

// ========== 关于我弹窗 ==========

function showAboutModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span>ℹ️ 关于我</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="text-align:center;">
        <div style="font-size:3rem;margin-bottom:10px;">✦</div>
        <h3 style="color:#E2E8F0;font-size:1.1rem;margin-bottom:4px;">劲脑·天赋探测仪</h3>
        <p style="color:#64748B;font-size:0.8rem;margin-bottom:16px;">v2.0.0</p>
        <div style="background:#060A1A;border-radius:10px;padding:14px;text-align:left;line-height:1.8;">
          <p style="color:#94A3B8;font-size:0.85rem;">
            劲脑·天赋探测仪是一款基于AI的亲子天赋解读工具，融合星盘学、MBTI人格理论与五者天赋体系，帮助家长发现孩子的天生优势与教育方向。
          </p>
        </div>
        <p style="color:#475569;font-size:0.75rem;margin-top:16px;">
          客服微信：${CONTACT_WECHAT}
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// 复制公众号文案
function copyOaText() {
  const text = '关注「劲脑·天赋探测仪」公众号，获取星盘知识、教育方法、天赋培养等干货内容。';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('公众号信息已复制')).catch(() => {});
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('公众号信息已复制');
  }
}

function getReportIcon(type) {
  return type === 'star' ? '🔯' : '🧠';
}

function getReportTypeName(type) {
  return type === 'star' ? '星盘' : 'MBTI';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toISOString().slice(0, 10).replace(/-/g, '.');
}

async function loadUserReports(openId) {
  try {
    const resp = await fetch(`/api/user/reports?openId=${encodeURIComponent(openId)}`);
    const data = await resp.json();
    return data.reports || [];
  } catch { return []; }
}

window.viewUserReport = async function(reportId) {
  try {
    const resp = await fetch(`/api/user/report/${reportId}`);
    const data = await resp.json();
    if (!data.success || !data.report) { showToast('报告不存在'); return; }
    const r = data.report;

    // 恢复报告
    if (r.type === 'mbti') {
      if (r.reportData) {
        currentReport = { type: 'mbti', mbtiResult: r.reportData };
        currentTestType = 'mbti';
        renderMbtiResult(r.reportData, null);
        renderStep3();
      }
    } else if (r.type === 'star') {
      if (r.chartData && r.reportData) {
        currentReport = { chart: r.chartData, report: r.reportData, version: r.version };
        currentTestType = 'star';
        renderReport(r.reportData, r.version);
        if (r.chartData?.planets) {
          setTimeout(() => drawChartWheel('chart-wheel', r.chartData), 100);
        }
        renderStep3();
      }
    }
  } catch { showToast('加载失败'); }
};

window.logoutUser = function() {
  currentUser = null;
  localStorage.removeItem('user_info');
  showToast('已退出');
  renderUserLogin();
};

// 自动保存报告
async function autoSaveReport(type, name, chartData, reportData, version) {
  if (!currentUser) return;
  // 访客用户不同步到服务器
  if (currentUser.openId && currentUser.openId.startsWith('guest_')) {
    // 存本地
    const local = JSON.parse(localStorage.getItem('local_reports') || '[]');
    local.unshift({ id: Date.now().toString(36), type, name, reportData, version, createdAt: new Date().toISOString() });
    localStorage.setItem('local_reports', JSON.stringify(local.slice(0, 20)));
    return;
  }
  try {
    await fetch('/api/user/reports/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openId: currentUser.openId, type, name,
        chartData: chartData || null,
        reportData: reportData || null,
        version: version || 'free',
      }),
    });
  } catch { /* 静默失败，不影响用户体验 */ }
}

// ========== 分享与粉丝系统 ==========

/**
 * 渲染分享中心（在用户资料页内嵌）
 */
function renderShareCenter() {
  if (!currentUser) return;
  const openId = currentUser.openId;

  fetch(`/api/user/share?openId=${encodeURIComponent(openId)}`).then(r => r.json()).then(data => {
    if (!data.success) return;
    const { shareInfo, fanStats } = data;
    const shareLink = shareInfo?.shareLink || '';
    const shareCode = shareInfo?.shareCode || '';

    // 插入到用户资料页分享区块
    const shareHtml = `
      <div class="share-center">
        <div class="share-header">
          <div class="share-qr-placeholder">🔗</div>
          <h4>我的分享</h4>
          <p>分享链接给好友，他们将成为你的粉丝</p>
        </div>

        <div class="share-code-box">
          <span class="share-code-label">分享码</span>
          <span class="share-code-value">${shareCode}</span>
          <button class="share-copy-btn" onclick="copyShareLink('${shareLink}')">复制链接</button>
        </div>

        <div class="share-stats">
          <div class="share-stat">
            <span class="share-stat-num">${fanStats?.totalFans || 0}</span>
            <span class="share-stat-label">总粉丝</span>
          </div>
          <div class="share-stat">
            <span class="share-stat-num">${fanStats?.newThisWeek || 0}</span>
            <span class="share-stat-label">本周新增</span>
          </div>
          <div class="share-stat">
            <span class="share-stat-num">${fanStats?.paidFans || 0}</span>
            <span class="share-stat-label">付费粉丝</span>
          </div>
        </div>

        <button class="btn-next" onclick="copyShareLink('${shareLink}')" style="width:100%;padding:12px 0;margin-top:12px;">
          分享给好友
        </button>
      </div>`;

    // 在用户资料页的报告列表后面追加共享区域
    const profileContent = $('user-content');
    if (profileContent) {
      const shareDiv = document.createElement('div');
      shareDiv.innerHTML = shareHtml;
      profileContent.querySelector('div[style*="padding:20px"]')?.appendChild(shareDiv.firstElementChild);
    }
  }).catch(() => {});
}

window.copyShareLink = function(link) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => showToast('链接已复制，快去分享吧！')).catch(() => {});
  } else {
    const ta = document.createElement('textarea');
    ta.value = link; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('链接已复制！');
  }
  track('share_link_copy', { label: currentUser?.openId || '' });
};

/**
 * 页面加载时检测分享码
 */
function checkShareCode() {
  const params = new URLSearchParams(window.location.search);
  const shareCode = params.get('share');
  if (!shareCode) return;

  // 存到 localStorage 中（粉丝绑定用）
  localStorage.setItem('share_referrer', shareCode);

  // 如果用户已登录，直接绑定
  if (currentUser && currentUser.openId && !currentUser.openId.startsWith('guest_')) {
    fetch('/api/user/share/info?code=' + encodeURIComponent(shareCode)).then(r => r.json()).then(data => {
      if (data.success && data.sharer) {
        fetch('/api/user/fan/bind', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostOpenId: data.sharer.openId,
            fanOpenId: currentUser.openId,
            fanName: currentUser.nickName,
          }),
        }).catch(() => {});
      }
    }).catch(() => {});
  }

  // 清除 URL 参数
  const url = new URL(window.location);
  url.searchParams.delete('share');
  window.history.replaceState({}, '', url);
}

/**
 * 在报告生成时关联分享码
 */
function bindShareOnReport(openId) {
  const shareCode = localStorage.getItem('share_referrer');
  if (!shareCode) return;
  fetch('/api/user/share/info?code=' + encodeURIComponent(shareCode)).then(r => r.json()).then(data => {
    if (data.success && data.sharer && data.sharer.openId !== openId) {
      fetch('/api/user/fan/bind', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostOpenId: data.sharer.openId, fanOpenId: openId }),
      }).catch(() => {});
      fetch('/api/user/fan/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode, action: 'report', meta: { fanOpenId: openId } }),
      }).catch(() => {});
    }
  }).catch(() => {});
}

// 检查微信 OAuth 回调（登录用）
async function handleLoginOAuth() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnAction = sessionStorage.getItem('oauth_return');

  if (!code || returnAction !== 'login') return;

  try {
    const resp = await fetch('/api/user/wxlogin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await resp.json();
    if (data.success && data.user) {
      currentUser = data.user;
      localStorage.setItem('user_info', JSON.stringify(data.user));
      showToast('微信登录成功');

      // 清除 URL 参数
      const url = new URL(window.location);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url);
      sessionStorage.removeItem('oauth_return');
    }
  } catch (err) {
    console.error('[用户] 登录失败:', err);
  }
}

// ================================================================
//  用户系统 END
// ================================================================

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
  lines.push('', ` 复制链接查看完整报告：${getShareUrl()}`, `💬 加微信 ${CONTACT_WECHAT} 获取深度解读`, '━━━━━━━━━━━━━━━', '来「劲脑·天赋探测仪」，发现孩子的天赋密码！');
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
  ctx.fillText('⭐ 劲脑·天赋探测仪', W/2, 45);
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
  ctx.fillText('劲脑·天赋探测仪 · 发现孩子的天赋密码', W/2, y);
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
  track('click_share', { page: 'report', label: currentTestType || 'star' });
};

window.handleShareImage = () => {
  showToast('生成分享图中…');
  track('share_image', { page: 'report' });
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
  const reportArea = type === 'star' ? $('report-content')?.parentElement : $('mbti-result')?.parentElement;
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
      track('submit_comment', { page: 'report', label: type });
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
    container.innerHTML = `
      <div class="dist-page">
        <div class="dist-header">
          <h2>💰 推广赚钱</h2>
          <p>分享报告给好友，轻松赚佣金</p>
        </div>
        <div class="dist-register-card">
          <h3>成为推广员</h3>
          <p>每推荐一位好友生成报告，你可获得 <strong style="color:#66bb6a;">最高 ¥3 佣金</strong>。<br>
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
      track('distributor_register', { page: 'distributor', label: source });
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
  const text = `🌟 来「劲脑·天赋探测仪」给孩子做一份专业的星盘天赋解读！\nAI 全面分析孩子的性格、天赋、学习模式和教育路径。\n\n 点开看看：${url}\n\n（这是我的推广链接，感谢你的支持！）`;
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

// ========== 报告板块浏览追踪 ==========
function trackReportSectionViews() {
  setTimeout(() => {
    const sections = document.querySelectorAll('.report-section');
    if (!sections.length) return;
    const observed = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const h3 = entry.target.querySelector('h3');
          const title = h3?.textContent?.trim() || 'unknown';
          const id = entry.target.querySelector('.content-block')?.className || 'section';
          if (!observed.has(title)) {
            observed.add(title);
            track('section_view', { section: title, label: 'star' });
          }
        }
      });
    }, { threshold: 0.3 });
    sections.forEach(s => observer.observe(s));
  }, 500);
}

// ========== 初始加载 ==========
document.addEventListener('DOMContentLoaded', () => {
  showPage('home');
  track('app_load', { label: 'v2.0' });

  // 检查微信 OAuth 回调（支付 + 登录）
  handleWeChatOAuth();
  handleLoginOAuth();
});
