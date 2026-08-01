/**
 * 劲脑·天赋探测仪 API 服务（端口 3001）
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
const LEADS_FILE = join(__dirname, 'leads.json');
const ADMIN_KEY = 'momadmin888'; // 管理员密钥，简单够用就行
const REPORT_COUNTER_FILE = join(__dirname, 'report_counter.json');
const USER_RECORDS_FILE = join(__dirname, 'user_records.json');

function getReportCount() {
  try { return JSON.parse(fs.readFileSync(REPORT_COUNTER_FILE, 'utf-8')).count || 0; }
  catch { return 0; }
}
function incrementReportCount() {
  const count = getReportCount() + 1;
  fs.writeFileSync(REPORT_COUNTER_FILE, JSON.stringify({ count }), 'utf-8');
  return count;
}

const { calculateBirthChart } = await import('./api/utils/astrology.mjs');
const chartModule = await import('./api/chart.mjs');
const { generateReport } = chartModule;
const getChartFallback = chartModule.getFallbackReport;
const kbModule = await import('./api/knowledge-base.mjs');
const { buildSystemPrompt, buildChartPrompt, parseReportResponse } = kbModule;
const dist = await import('./api/distribution.mjs');
const assist = await import('./api/assist.mjs');
const wechatPay = await import('./api/wechat-pay.mjs');
const userApi = await import('./api/user.mjs');

// DeepSeek 配置
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE || 'https://api.deepseek.com';

http.createServer(async (req, res) => {
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
            dist.createReferralOrder({
              refUid: refDist.uid,
              customerUid: '',
              customerName: d.name || '匿名用户',
              orderType: 'free',
              amount: 0,
            });
            console.log(`[分销] 推广员 ${refDist.code} 获得新订单: free`);
          }
        }

        // 尝试用 DeepSeek + 知识库生成报告
        let report;
        try {
          report = await callDeepSeekChart(chart, d.name || '宝贝', 'free', d.budget, d.grade);
        } catch (aiErr) {
          console.warn('DeepSeek 报告生成失败，使用本地回退:', aiErr.message);
          report = getChartFallback(chart, d.name || '宝贝', 'free', d.budget, d.grade);
        }

        // 保存用户测试记录
        saveUserRecord({
          type: 'star',
          name: d.name || '匿名用户',
          birthDate: d.birthDate,
          city: d.city || '',
          budget: d.budget || '',
          grade: d.grade || '',
          distributor: d.distributor || '',
          createdAt: new Date().toISOString()
        });

        console.log('[API] 响应发送成功');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, chart: chart.basic, report, version: 'free' }));
      } catch (err) {
        console.error('[API] 错误:', err.message, err.stack);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // === 用户记录 API ===
  if (req.url === '/api/user-records' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      saveUserRecord({ ...body, createdAt: new Date().toISOString() });
      sendJSON(res, 200, { success: true });
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // === 留资 API ===
  if (req.url === '/api/lead' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const { wechat, phone, name, type, openId } = body;
      const identifier = wechat || openId;
      if (!identifier) { sendJSON(res, 400, { success: false, error: '缺少联系方式' }); return; }
      saveLeadRecord({
        wechat: wechat || '',
        openId: openId || '',
        phone: phone || '',
        name: name || '',
        type: type || 'star',
        createdAt: new Date().toISOString()
      });
      console.log('[留资] 新线索', wechat ? '微信号:' + wechat : 'OpenID:' + openId, '类型:', type || 'star');
      sendJSON(res, 200, { success: true });
    }).catch(() => sendJSON(res, 200, { success: false }));
    return;
  }

  if (req.url.startsWith('/api/user-records/list') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false }); return; }
    const records = loadUserRecords();
    const type = params.type || '';
    const filtered = type ? records.filter(r => r.type === type) : records;
    sendJSON(res, 200, { success: true, records: filtered.reverse() });
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

  // ========== 邀请助力解锁 API ==========

  // 获取助力配置（公开，前端渲染进度用）
  if (req.url.startsWith('/api/assist/config') && req.method === 'GET') {
    const config = assist.getConfig();
    sendJSON(res, 200, { success: true, config });
    return;
  }

  // 获取用户助力解锁状态
  if (req.url.startsWith('/api/assist/status') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.key) { sendJSON(res, 400, { success: false, error: '缺少 key' }); return; }
    const status = assist.getAssistStatus(params.key);
    sendJSON(res, 200, { success: true, status });
    return;
  }

  // 记录一次助力（好友完成测试后调用）
  if (req.url === '/api/assist/record' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const result = assist.recordAssist({
        hostKey: body.hostKey,
        helperKey: body.helperKey,
        helperName: body.helperName || '匿名好友',
      });
      sendJSON(res, result.success ? 200 : 400, result);
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 显式解锁（填微信解锁 / 管理员手动）
  if (req.url === '/api/assist/unlock' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const result = assist.unlockByMethod(body.hostKey, body.method || 'manual');
      sendJSON(res, result.success ? 200 : 400, result);
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 重置某用户的助力（管理员）
  if (req.url.startsWith('/api/assist/admin/reset') && req.method === 'POST') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    parseJSONBody(req).then(body => {
      const result = assist.resetAssist(body.hostKey);
      sendJSON(res, 200, result);
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 助力活动统计（管理员）
  if (req.url.startsWith('/api/assist/admin/stats') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    sendJSON(res, 200, { success: true, stats: assist.getAssistStats() });
    return;
  }

  // 获取助力配置（管理员）
  if (req.url.startsWith('/api/assist/admin/config') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    sendJSON(res, 200, { success: true, config: assist.getConfig() });
    return;
  }

  // 更新助力配置（管理员）
  if (req.url.startsWith('/api/assist/admin/config') && req.method === 'POST') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    parseJSONBody(req).then(body => {
      const result = assist.updateConfig(body);
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

  // ========== 微信 OAuth ==========

  if (req.url.startsWith('/api/wechat/oauth') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.code) { sendJSON(res, 400, { success: false, error: '缺少 code' }); return; }
    try {
      const openId = await wechatPay.getOpenId(params.code);
      sendJSON(res, 200, { success: true, openId });
    } catch (err) {
      console.error('[OAuth] 错误:', err.message);
      sendJSON(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // ========== 微信支付 ==========

  // 创建支付订单
  if (req.url === '/api/payment/create-order' && req.method === 'POST') {
    parseJSONBody(req).then(async body => {
      const { openId, amount = 9.9 } = body;
      if (!openId) { sendJSON(res, 400, { success: false, error: '缺少 openId' }); return; }
      try {
        const result = await wechatPay.createUnifiedOrder({
          openId,
          amount,
          description: '劲脑·天赋探测仪 - 深度版报告',
        });
        wechatPay.savePaymentOrder({
          outTradeNo: result.outTradeNo,
          openId,
          amount,
          description: '劲脑·天赋探测仪 - 深度版报告',
        });
        sendJSON(res, 200, { success: true, ...result });
      } catch (err) {
        console.error('[支付] 创建订单失败:', err.message);
        sendJSON(res, 500, { success: false, error: err.message });
      }
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 微信支付回调通知
  if (req.url === '/api/payment/notify' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { valid, params } = wechatPay.verifyNotification(body);
      if (!valid) {
        console.error('[支付回调] 签名验证失败');
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(buildXMLReply('FAIL', '签名失败'));
        return;
      }
      if (params.result_code === 'SUCCESS') {
        wechatPay.markOrderPaid(params.out_trade_no, params.transaction_id);
        console.log('[支付回调] 订单已支付:', params.out_trade_no, '金额:', params.total_fee);
      }
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(buildXMLReply('SUCCESS', 'OK'));
    });
    return;
  }

  // 检查支付状态
  if (req.url.startsWith('/api/payment/status') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.outTradeNo) { sendJSON(res, 400, { success: false, error: '缺少 outTradeNo' }); return; }
    const order = wechatPay.getOrder(params.outTradeNo);
    if (!order) { sendJSON(res, 404, { success: false, error: '订单不存在' }); return; }
    sendJSON(res, 200, { success: true, order: { status: order.status, paidAt: order.paidAt } });
    return;
  }

  // 用户订单列表
  if (req.url.startsWith('/api/payment/orders') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.openId) { sendJSON(res, 400, { success: false, error: '缺少 openId' }); return; }
    const orders = wechatPay.getUserOrders(params.openId);
    sendJSON(res, 200, { success: true, orders });
    return;
  }

  // ========== 用户系统 API ==========

  // 微信登录
  if (req.url === '/api/user/wxlogin' && req.method === 'POST') {
    parseJSONBody(req).then(async body => {
      const { code, nickName } = body;
      if (!code) { sendJSON(res, 400, { success: false, error: '缺少 code' }); return; }
      try {
        const openId = await wechatPay.getOpenId(code);
        const user = userApi.findOrCreateUser(openId, nickName);
        userApi.trackUserEvent(openId, 'login', { method: 'wechat' });
        sendJSON(res, 200, { success: true, user });
      } catch (err) {
        sendJSON(res, 500, { success: false, error: err.message });
      }
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 获取用户信息+画像
  if (req.url.startsWith('/api/user/profile') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.openId) { sendJSON(res, 400, { success: false, error: '缺少 openId' }); return; }
    const profile = userApi.getUserProfile(params.openId);
    if (!profile) { sendJSON(res, 404, { success: false, error: '用户不存在' }); return; }
    sendJSON(res, 200, { success: true, profile });
    return;
  }

  // 获取用户报告列表
  if (req.url.startsWith('/api/user/reports') && req.method === 'GET' && !req.url.includes('/report/')) {
    const params = getURLParams(req.url);
    if (!params.openId) { sendJSON(res, 400, { success: false, error: '缺少 openId' }); return; }
    const reports = userApi.getUserReports(params.openId);
    sendJSON(res, 200, { success: true, reports });
    return;
  }

  // 获取单条报告
  if (req.url.match(/^\/api\/user\/report\/(rpt_[a-z0-9]+)/) && req.method === 'GET') {
    const reportId = req.url.match(/^\/api\/user\/report\/(rpt_[a-z0-9]+)/)[1];
    const report = userApi.getReportById(reportId);
    if (!report) { sendJSON(res, 404, { success: false, error: '报告不存在' }); return; }
    sendJSON(res, 200, { success: true, report });
    return;
  }

  // 保存报告
  if (req.url === '/api/user/reports/save' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const { openId, type, name, chartData, reportData, version } = body;
      if (!openId || !type) { sendJSON(res, 400, { success: false, error: '缺少必填字段' }); return; }
      const report = userApi.saveUserReport({ openId, type, name, chartData, reportData, version });
      userApi.trackUserEvent(openId, 'report_saved', { type, name, version });
      userApi.updateUserTraits(openId, { lastTestType: type, lastTestAt: new Date().toISOString() });
      sendJSON(res, 200, { success: true, report });
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 删除报告
  if (req.url.startsWith('/api/user/report/') && req.method === 'DELETE') {
    const match = req.url.match(/^\/api\/user\/report\/(rpt_[a-z0-9]+)/);
    if (!match) { sendJSON(res, 400, { success: false, error: '无效报告ID' }); return; }
    const params = getURLParams(req.url);
    if (!params.openId) { sendJSON(res, 400, { success: false, error: '缺少 openId' }); return; }
    const deleted = userApi.deleteReport(match[1], params.openId);
    sendJSON(res, deleted ? 200 : 404, { success: deleted });
    return;
  }

  // ========== 粉丝分享系统 ==========

  // 获取用户分享信息（含分享码自动生成）
  if (req.url.startsWith('/api/user/share') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.openId) { sendJSON(res, 400, { success: false, error: '缺少 openId' }); return; }
    const info = userApi.generateShareCode(params.openId);
    const stats = userApi.getFanStats(params.openId);
    sendJSON(res, 200, { success: !!info, shareInfo: info, fanStats: stats });
    return;
  }

  // 通过分享码获取分享者信息（访客打开分享链接时调用）
  if (req.url.startsWith('/api/user/share/info') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.code) { sendJSON(res, 400, { success: false, error: '缺少 code' }); return; }
    const user = userApi.getUserByShareCode(params.code);
    sendJSON(res, 200, { success: !!user, sharer: user });
    return;
  }

  // 绑定粉丝
  if (req.url === '/api/user/fan/bind' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const { hostOpenId, fanOpenId, fanName } = body;
      if (!hostOpenId || !fanOpenId) { sendJSON(res, 200, { success: false, error: '缺少参数' }); return; }
      const fan = userApi.bindFan(hostOpenId, fanOpenId, fanName || '匿名');
      sendJSON(res, 200, { success: true, fan });
    }).catch(() => sendJSON(res, 200, { success: false }));
    return;
  }

  // 记录粉丝行为（如生成了报告、付费了）
  if (req.url === '/api/user/fan/action' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const { shareCode, action, meta } = body;
      userApi.recordFanAction(shareCode, action, meta || {});
      sendJSON(res, 200, { success: true });
    }).catch(() => sendJSON(res, 200, { success: true }));
    return;
  }

  // 获取粉丝列表
  if (req.url.startsWith('/api/user/fans') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (!params.openId) { sendJSON(res, 400, { success: false, error: '缺少 openId' }); return; }
    const fans = userApi.getFans(params.openId);
    const stats = userApi.getFanStats(params.openId);
    sendJSON(res, 200, { success: true, fans, stats });
    return;
  }

  // 记录用户事件
  if (req.url === '/api/user/track' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const { openId, event, meta } = body;
      if (!openId || !event) { sendJSON(res, 200, { success: true }); return; }
      userApi.trackUserEvent(openId, event, meta || {});
      sendJSON(res, 200, { success: true });
    }).catch(() => sendJSON(res, 200, { success: true }));
    return;
  }

  // 更新用户画像
  if (req.url === '/api/user/traits' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const { openId, traits } = body;
      if (!openId || !traits) { sendJSON(res, 400, { success: false, error: '缺少参数' }); return; }
      const result = userApi.updateUserTraits(openId, traits);
      sendJSON(res, 200, { success: true, traits: result });
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // ========== 成绩检测 API（获客表单）==========

  // 提交成绩检测
  if (req.url === '/api/grade-assessment' && req.method === 'POST') {
    parseJSONBody(req).then(body => {
      const { wechat, province, grade, subjects, scores, studentName, distributor } = body;
      if (!wechat || !province || !grade || !subjects || !scores) {
        sendJSON(res, 400, { success: false, error: '请填写完整信息' });
        return;
      }
      saveGradeAssessment({ wechat, province, grade, subjects, scores, studentName, distributor: distributor || '', createdAt: new Date().toISOString() });
      saveUserRecord({ type: 'grade', wechat, province, grade, subjects, scores, studentName, distributor: distributor || '', createdAt: new Date().toISOString() });
      console.log('[成绩检测] 新线索 微信号:', wechat, '年级:', grade, '省份:', province, distributor ? '推广码:' + distributor : '');
      sendJSON(res, 200, { success: true, message: '提交成功，我们的教育顾问会尽快联系您' });
    }).catch(() => sendJSON(res, 400, { success: false, error: 'invalid json' }));
    return;
  }

  // 管理后台查看成绩检测记录
  if (req.url.startsWith('/api/grade-assessment/list') && req.method === 'GET') {
    const params = getURLParams(req.url);
    if (params.key !== ADMIN_KEY) { sendJSON(res, 403, { success: false, error: '无权限' }); return; }
    const records = loadGradeAssessments();
    sendJSON(res, 200, { success: true, records: records.reverse() });
    return;
  }

  res.writeHead(404); res.end();
}).listen(3002, () => console.log('✓ 服务: http://localhost:3002'));

// ========== 成绩检测 - 数据存储 ==========
const GRADE_FILE = join(__dirname, 'grade_assessments.json');
function loadGradeAssessments() {
  try {
    if (!fs.existsSync(GRADE_FILE)) return [];
    return JSON.parse(fs.readFileSync(GRADE_FILE, 'utf-8'));
  } catch { return []; }
}
function saveGradeAssessment(record) {
  const records = loadGradeAssessments();
  records.push(record);
  fs.writeFileSync(GRADE_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// ========== 用户测试记录 ==========
function loadUserRecords() {
  try {
    if (!fs.existsSync(USER_RECORDS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USER_RECORDS_FILE, 'utf-8'));
  } catch { return []; }
}
function saveUserRecord(record) {
  const records = loadUserRecords();
  records.push(record);
  fs.writeFileSync(USER_RECORDS_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// ========== 留资记录 ==========
function loadLeadRecords() {
  try {
    if (!fs.existsSync(LEADS_FILE)) return [];
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
  } catch { return []; }
}
function saveLeadRecord(record) {
  const records = loadLeadRecords();
  records.push(record);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// ========== 微信支付回调 XML 回复 ==========
function buildXMLReply(code, msg) {
  return `<xml><return_code><![CDATA[${code}]]></return_code><return_msg><![CDATA[${msg}]]></return_msg></xml>`;
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
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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
