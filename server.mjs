/**
 * 优势星测 API 服务（端口 3001）
 */
import { createRequire } from 'module';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const http = require('http');

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMENTS_FILE = join(__dirname, 'comments.json');
const TRACKING_FILE = join(__dirname, 'tracking.json');
const ADMIN_KEY = 'momadmin888'; // 管理员密钥，简单够用就行

const { calculateBirthChart } = await import('./api/utils/astrology.mjs');
const chartModule = await import('./api/chart.mjs');
const { generateReport } = chartModule;
const getChartFallback = chartModule.getFallbackReport;
const kbModule = await import('./api/knowledge-base.mjs');
const { buildSystemPrompt, buildChartPrompt, parseReportResponse } = kbModule;
const dist = await import('./api/distribution.mjs');

// DeepSeek 配置
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE || 'https://api.deepseek.com';

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // === 星盘计算（DeepSeek + 知识库）===
  if (req.url === '/api/chart' && req.method === 'POST') {
    console.log('[API] /api/chart 请求开始');
    // 请求超时保护
    const timer = setTimeout(() => {
      console.error('[API] 请求超时，强制关闭');
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'request timeout' }));
    }, 8000);
    req.on('close', () => clearTimeout(timer));
    let body = '';
    req.on('data', c => { body += c; console.log('[API] 收到数据:', c.length, '字节'); });
    req.on('error', e => { console.error('[API] req错误:', e.message); });
    req.on('end', async () => {
      console.log('[API] 请求数据接收完成, body长度:', body.length);
      console.log('[API] req.method:', req.method, 'req.url:', req.url);
      try {
        const d = JSON.parse(body);
        console.log('[API] 解析成功, body:', JSON.stringify(d).substring(0, 200));
        console.log('[API] lat:', d.latitude, 'lng:', d.longitude);
        if (!d.latitude || !d.longitude) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: '请选择出生城市或输入经纬度' }));
          return;
        }
        const chart = calculateBirthChart({
          birthDate: d.birthDate, birthHour: d.birthHour ?? 12,
          birthMinute: d.birthMinute ?? 0, latitude: d.latitude, longitude: d.longitude
        });

        // 如果有关联推广员，记录推广订单
        if (d.distributor) {
          const distributorRef = d.distributor;
          const refDist = dist.getDistributorByCode(distributorRef);
          if (refDist) {
            const orderType = d.version === 'paid' ? 'premium' : 'free';
            const orderAmount = d.version === 'paid' ? 9.9 : 0;
            dist.createReferralOrder({
              refUid: refDist.uid,
              customerUid: '',
              customerName: d.name || '匿名用户',
              orderType,
              amount: orderAmount,
            });
            console.log(`[分销] 推广员 ${refDist.code} 获得新订单: ${orderType}`);
          }
        }

        // 尝试用 DeepSeek + 知识库生成报告
        let report;
        try {
          report = await callDeepSeekChart(chart, d.name || '宝贝', d.version || 'free', d.budget, d.grade);
        } catch (aiErr) {
          console.warn('DeepSeek 报告生成失败，使用本地回退:', aiErr.message);
          report = getChartFallback(chart, d.name || '宝贝', d.version || 'free', d.budget, d.grade);
        }

        console.log('[API] 响应发送成功');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, chart: chart.basic, report, version: d.version }));
      } catch (err) {
        console.error('[API] 错误:', err.message, err.stack);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // === AI 报告生成（性格测试用） ===
  if (req.url === '/api/report' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { answers, name } = JSON.parse(body);
        const result = await callDeepSeek(answers, name);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: result }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: getStrengthFallback() }));
      }
    });
    return;
  }

  // === 评论系统 API ===
  // 提交评论
  if (req.url.startsWith('/api/comments') && req.method === 'POST') {
    const params = getURLParams(req.url);
    const action = params.action || '';
    // 管理员审核
    if (action === 'approve' || action === 'delete') {
      if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
      parseJSONBody(req).then(body => {
        const comments = loadComments();
        const idx = comments.findIndex(c => c.id === body.id);
        if (idx === -1) { sendJSON(res, 404, { success: false, error: '评论不存在' }); return; }
        if (action === 'delete') {
          comments.splice(idx, 1);
        } else {
          comments[idx].approved = true;
          comments[idx].approvedAt = new Date().toISOString();
        }
        saveComments(comments);
        sendJSON(res, 200, { success: true });
      }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
      return;
    }
    // 普通用户提交评论
    parseJSONBody(req).then(body => {
      const { name, content, reportType } = body;
      if (!content || !content.trim()) { sendJSON(res, 400, { success: false, error: '评论内容不能为空' }); return; }
      const comments = loadComments();
      comments.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: (name || '匿名用户').trim().slice(0, 20),
        content: content.trim().slice(0, 500),
        reportType: reportType || 'star',
        createdAt: new Date().toISOString(),
        approved: false
      });
      saveComments(comments);
      console.log('💬 新评论待审核');
      sendJSON(res, 200, { success: true, message: '提交成功，等待管理员审核' });
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 获取评论
  if (req.url.startsWith('/api/comments') && req.method === 'GET') {
    const params = getURLParams(req.url);
    // 管理员查看全部
    if (params.admin === '1') {
      if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
      const all = loadComments();
      const type = params.reportType || '';
      const filtered = type ? all.filter(c => c.reportType === type) : all;
      sendJSON(res, 200, { success: true, data: filtered });
      return;
    }
    // 普通用户只看已审核的
    const comments = loadComments();
    const type = params.reportType || '';
    const approved = comments.filter(c => c.approved && (!type || c.reportType === type));
    sendJSON(res, 200, { success: true, data: approved.slice(-20).reverse() });
    return;
  }

  // ========== 分销系统 API ==========

  // 注册推广员
  if (req.url === '/api/distributor/register' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const { uid, name, wechat, phone, source } = body;
      if (!uid || !name || !wechat) { sendJSON(res, 400, { success: false, error: '缺少必填字段' }); return; }
      const result = dist.registerDistributor({ uid, name, wechat, phone, source });
      sendJSON(res, result.success ? 200 : 400, result);
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 获取推广员信息+统计
  if (req.url.startsWith('/api/distributor/info') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.uid) { sendJSON(res, 400, { success: false, error: '缺少 uid' }); return; }
    const distributor = dist.getDistributorByUid(params.uid);
    if (!distributor) { sendJSON(res, 404, { success: false, error: '未注册' }); return; }
    const stats = dist.getDistributorStats(params.uid);
    sendJSON(res, 200, { success: true, distributor, stats });
    return;
  }

  // 推广员订单列表
  if (req.url.startsWith('/api/distributor/orders') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.uid) { sendJSON(res, 400, { success: false, error: '缺少 uid' }); return; }
    const orders = dist.getDistributorOrders(params.uid);
    sendJSON(res, 200, { success: true, orders });
    return;
  }

  // 提现记录
  if (req.url.startsWith('/api/distributor/withdrawals') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.uid) { sendJSON(res, 400, { success: false, error: '缺少 uid' }); return; }
    const list = dist.getDistributorWithdrawals(params.uid);
    sendJSON(res, 200, { success: true, withdrawals: list });
    return;
  }

  // 申请提现
  if (req.url === '/api/distributor/withdraw' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const { uid, amount, name, wechat } = body;
      if (!uid || !amount) { sendJSON(res, 400, { success: false, error: '缺少必填字段' }); return; }
      const result = dist.createWithdrawal({ distributorUid: uid, amount, name, wechat });
      sendJSON(res, result.success ? 200 : 400, result);
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 检查是否已注册推广员
  if (req.url.startsWith('/api/distributor/check') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.uid) { sendJSON(res, 400, { success: false, error: '缺少 uid' }); return; }
    const d = dist.getDistributorByUid(params.uid);
    sendJSON(res, 200, { success: true, registered: !!d, distributor: d || undefined });
    return;
  }

  // ========== 分销系统 · 管理员API ==========

  // 推广员列表
  if (req.url.startsWith('/api/distributor/admin/list') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    const list = dist.listDistributors();
    sendJSON(res, 200, { success: true, distributors: list });
    return;
  }

  // 全部推广订单
  if (req.url.startsWith('/api/distributor/admin/orders') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    const orders = dist.getAllOrders();
    sendJSON(res, 200, { success: true, orders });
    return;
  }

  // 确认推广订单（发放佣金）
  if (req.url.startsWith('/api/distributor/admin/confirm-order') && req.method === 'POST') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    parseJSONBody(req).then(body => {
      const result = dist.confirmReferralOrder(body.orderId);
      sendJSON(res, result.success ? 200 : 400, result);
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 取消推广订单
  if (req.url.startsWith('/api/distributor/admin/cancel-order') && req.method === 'POST') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    parseJSONBody(req).then(body => {
      const result = dist.cancelReferralOrder(body.orderId);
      sendJSON(res, result.success ? 200 : 400, result);
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 全部提现记录
  if (req.url.startsWith('/api/distributor/admin/withdrawals') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    const status = params.status || '';
    const list = dist.getAllWithdrawals(status);
    sendJSON(res, 200, { success: true, withdrawals: list });
    return;
  }

  // 审核提现
  if (req.url.startsWith('/api/distributor/admin/handle-withdrawal') && req.method === 'POST') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    parseJSONBody(req).then(body => {
      const { withdrawalId, action, note } = body;
      let result;
      if (action === 'approve') result = dist.approveWithdrawal(withdrawalId);
      else if (action === 'reject') result = dist.rejectWithdrawal(withdrawalId, note || '');
      else result = { success: false, error: '无效操作' };
      sendJSON(res, result.success ? 200 : 400, result);
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 获取分销配置（公开）
  if (req.url === '/api/distributor/config' && req.method === 'GET') {
    const config = dist.getConfig();
    sendJSON(res, 200, { success: true, config });
    return;
  }

  // 获取分销配置（管理员）
  if (req.url.startsWith('/api/distributor/admin/config') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    const config = dist.getConfig();
    sendJSON(res, 200, { success: true, config });
    return;
  }

  // 更新分销配置（管理员）
  if (req.url.startsWith('/api/distributor/admin/config') && req.method === 'POST') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    parseJSONBody(req).then(body => {
      const result = dist.updateConfig(body);
      sendJSON(res, result.success ? 200 : 400, result);
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // ========== 用户行为埋点 ==========

  // 上报事件
  if (req.url === '/api/track' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const events = loadTracking();
      events.push({
        event: body.event || 'unknown',
        page: body.page || '',
        section: body.section || '',
        label: body.label || '',
        meta: body.meta || {},
        ts: body.ts || Date.now(),
        uid: body.uid || '',
      });
      // 只保留最近 50000 条
      if (events.length > 50000) events.splice(0, events.length - 50000);
      saveTracking(events);
      sendJSON(res, 200, { success: true });
    }).catch(() => sendJSON(res, 200, { success: true }));
    return;
  }

  // 管理员查看统计
  if (req.url.startsWith('/api/track/stats') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    const events = loadTracking();
    const days = parseInt(params.days || '7');
    const cutoff = Date.now() - days * 86400000;

    const recent = events.filter(e => e.ts > cutoff || (typeof e.ts === 'string' && new Date(e.ts).getTime() > cutoff));

    // 页面浏览量
    const pageViews = {};
    // 板块浏览量
    const sectionViews = {};
    // 事件统计
    const eventCounts = {};
    // 每日活跃
    const dailyActive = {};

    recent.forEach(e => {
      const day = new Date(typeof e.ts === 'string' ? new Date(e.ts) : e.ts).toISOString().slice(0, 10);
      dailyActive[day] = (dailyActive[day] || 0) + 1;

      if (e.page) pageViews[e.page] = (pageViews[e.page] || 0) + 1;
      if (e.section) sectionViews[e.section] = (sectionViews[e.section] || 0) + 1;
      eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
    });

    sendJSON(res, 200, {
      success: true,
      stats: {
        total: events.length,
        recent: recent.length,
        pageViews: sortObj(pageViews),
        sectionViews: sortObj(sectionViews),
        eventCounts: sortObj(eventCounts),
        dailyActive: sortObj(dailyActive),
        days,
      }
    });
    return;
  }

  res.writeHead(404); res.end();
}).listen(3002, () => console.log('✓ 服务: http://localhost:3002'));

// === DeepSeek API ===
async function callDeepSeek(answers, name) {
  if (!DEEPSEEK_KEY) throw new Error('no key');

  const scores = Object.entries(answers).map(([k, v]) => `${k}: ${v}分`).join('\n');
  const prompt = `你是一位积极心理学专家。${name || '用户'}完成了一份性格优势测试，各维度得分如下：
${scores}

请生成一份个人性格优势解读报告，包含以下4部分，用 === 分隔：

第一部分：整体评估（80字内，概括最突出的优势）
第二部分：维度详解（每个维度1-2句，分析得分含义）
第三部分：行动建议（3条具体可行的建议）
第四部分：一句话标签（10字内，给用户的标签）

语言亲切有温度，不要像机器报告。`;

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个温暖有趣的心理学专家。回复亲切有温度。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8, max_tokens: 1500
    })
  });

  const data = await resp.json();
  const text = data.choices[0].message.content;
  const parts = text.split('===').map(s => s.trim()).filter(Boolean);
  return {
    summary: parts[0] || '',
    details: parts[1] || '',
    advice: parts[2] || '',
    tag: parts[3] || ''
  };
}

function getStrengthFallback() {
  return {
    summary: '你是一个内心充满力量的人！具备出色的自我认知和成长潜力。',
    details: '性格优势分布均衡，尤其在人际交往和执行力方面表现突出。',
    advice: '1. 每天记录一件发挥优势的小事\n2. 找伙伴互相鼓励共同成长\n3. 主动寻找能发挥优势的场景',
    tag: '潜力无限的成长者'
  };
}

// === DeepSeek 星盘解读（知识库增强版）===
async function callDeepSeekChart(chart, name, version, budget, grade) {
  if (!DEEPSEEK_KEY) throw new Error('no key');
  const endpoint = `${DEEPSEEK_BASE}/v1/chat/completions`;
  const apiKey = DEEPSEEK_KEY;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildChartPrompt(chart, name, version, budget, grade);

  console.log('正在调用 DeepSeek 星盘解读...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let resp;
  try {
    resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`DeepSeek API 错误 (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  console.log('DeepSeek 返回长度:', text.length, '字符');

  const report = parseReportResponse(text);
  return report;
}

// ========== 评论系统 ==========

function loadComments() {
  try {
    if (!fs.existsSync(COMMENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf-8'));
  } catch { return []; }
}

function saveComments(comments) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), 'utf-8');
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('invalid json')); } });
  });
}

function sendJSON(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ========== 埋点 ==========
function loadTracking() {
  try {
    if (!fs.existsSync(TRACKING_FILE)) return [];
    return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
  } catch { return []; }
}
function saveTracking(events) {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(events), 'utf-8');
}
function sortObj(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).reduce((r, [k, v]) => { r[k] = v; return r; }, {});
}

function getURLParams(url) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const params = {};
  new URLSearchParams(url.substring(idx)).forEach((v, k) => params[k] = v);
  return params;
}
