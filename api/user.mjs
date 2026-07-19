/**
 * 用户管理系统
 *
 * 核心设计：
 * - userId: 内部唯一ID（跨系统打通用）
 * - openId: 微信 OpenID（登录凭据）
 * - traits:  用户画像标签（可扩展）
 * - events:  用户行为路径（埋点 + 业务事件）
 * - 报告:    按用户存储的历史报告
 *
 * JSON 文件存储，零依赖。
 */

import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const USERS_FILE = join(ROOT, 'data', 'users.json');
const REPORTS_FILE = join(ROOT, 'data', 'user_reports.json');
const EVENTS_FILE = join(ROOT, 'data', 'user_events.json');
const UID_COUNTER_FILE = join(ROOT, 'data', 'uid_counter.json');

function ensureDataDir() {
  const d = join(ROOT, 'data');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function loadJSON(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf-8')); }
  catch { return []; }
}
function saveJSON(f, d) {
  fs.writeFileSync(f, JSON.stringify(d, null, 2), 'utf-8');
}

function genId() {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function genRptId() {
  return 'rpt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ========== 8位显示ID ==========

const UID_START = 11342801;

function isValidDisplayId(num) {
  return !/0/.test(String(num));
}

function getNextDisplayId() {
  ensureDataDir();
  let counter;
  try {
    counter = JSON.parse(fs.readFileSync(UID_COUNTER_FILE, 'utf-8'));
  } catch {
    counter = { next: UID_START };
  }
  let uid = counter.next;
  // 跳过所有包含数字0的ID，尾号也避免0
  while (!isValidDisplayId(uid)) {
    uid++;
  }
  counter.next = uid + 1;
  fs.writeFileSync(UID_COUNTER_FILE, JSON.stringify(counter), 'utf-8');
  return uid;
}

// ========== 用户管理 ==========

/**
 * 查找或创建用户
 * 返回 { userId, openId, nickName, traits, createdAt }
 */
export function findOrCreateUser(openId, nickName) {
  ensureDataDir();
  const users = loadJSON(USERS_FILE);
  let user = users.find(u => u.openId === openId);
  if (!user) {
    user = {
      userId: genId(),
      displayId: getNextDisplayId(),
      openId,
      nickName: nickName || '微信用户',
      traits: {},      // 用户画像（可扩展）
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    users.push(user);
  } else {
    user.lastLoginAt = new Date().toISOString();
    if (nickName) user.nickName = nickName;
    if (!user.displayId) {
      user.displayId = getNextDisplayId();
    }
  }
  saveJSON(USERS_FILE, users);
  return { userId: user.userId, displayId: user.displayId, openId: user.openId, nickName: user.nickName, traits: user.traits, createdAt: user.createdAt };
}

/**
 * 获取用户信息（含画像）
 */
export function getUserByOpenId(openId) {
  const users = loadJSON(USERS_FILE);
  const u = users.find(u => u.openId === openId);
  if (!u) return null;
  if (!u.displayId) {
    u.displayId = getNextDisplayId();
    saveJSON(USERS_FILE, users);
  }
  return { userId: u.userId, displayId: u.displayId, openId: u.openId, nickName: u.nickName, traits: u.traits, createdAt: u.createdAt };
}

/**
 * 更新用户画像标签
 * traits: { ageGroup?: string, childAge?: string, testCount?: number, ... }
 */
export function updateUserTraits(openId, traits) {
  const users = loadJSON(USERS_FILE);
  const u = users.find(x => x.openId === openId);
  if (!u) return null;
  u.traits = { ...u.traits, ...traits };
  saveJSON(USERS_FILE, users);
  return u.traits;
}

// ========== 行为路径（用户事件） ==========

/**
 * 记录用户事件（行为路径追踪）
 * event: 'page_view' | 'report_generated' | 'report_shared' | 'payment' | 'login' | ...
 */
export function trackUserEvent(openId, event, meta) {
  ensureDataDir();
  const events = loadJSON(EVENTS_FILE);
  events.push({
    id: 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
    openId, event,
    meta: meta || {},
    timestamp: new Date().toISOString(),
  });
  // 只保留最近1000条
  if (events.length > 1000) events.splice(0, events.length - 1000);
  saveJSON(EVENTS_FILE, events);
}

/**
 * 获取用户事件流（行为路径）
 */
export function getUserEvents(openId, limit = 50) {
  return loadJSON(EVENTS_FILE)
    .filter(e => e.openId === openId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

// ========== 报告存储 ==========

/**
 * 保存报告到用户账户
 * 一个月内同类型的同名报告自动去重
 */
export function saveUserReport({ openId, type, name, chartData, reportData, version }) {
  ensureDataDir();
  const reports = loadJSON(REPORTS_FILE);
  const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const dup = reports.find(r =>
    r.openId === openId && r.type === type &&
    r.name === name && new Date(r.createdAt).getTime() > monthAgo
  );
  if (dup) return dup;

  const report = {
    id: genRptId(),
    openId, type, name: name || '',
    chartData: chartData || null,
    reportData: reportData || null,
    version: version || 'free',
    paid: version === 'paid',
    createdAt: new Date().toISOString(),
  };
  reports.push(report);
  saveJSON(REPORTS_FILE, reports);

  // 更新用户画像中的测试次数
  const userReports = reports.filter(r => r.openId === openId);
  const traits = { testCount: userReports.length, lastTestType: type, lastTestAt: new Date().toISOString() };
  updateUserTraits(openId, traits);

  return report;
}

export function getUserReports(openId) {
  return loadJSON(REPORTS_FILE)
    .filter(r => r.openId === openId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getReportById(reportId) {
  return loadJSON(REPORTS_FILE).find(r => r.id === reportId) || null;
}

export function markReportPaid(reportId) {
  const reports = loadJSON(REPORTS_FILE);
  const r = reports.find(x => x.id === reportId);
  if (r) { r.paid = true; r.version = 'paid'; saveJSON(REPORTS_FILE, reports); }
  return r || null;
}

export function deleteReport(reportId, openId) {
  let reports = loadJSON(REPORTS_FILE);
  const before = reports.length;
  reports = reports.filter(r => !(r.id === reportId && r.openId === openId));
  if (reports.length !== before) saveJSON(REPORTS_FILE, reports);
  return reports.length !== before;
}

// ========== 粉丝绑定与分享系统 ==========

const FANS_FILE = join(ROOT, 'data', 'fans.json');

/**
 * 生成/获取用户的分享码
 */
export function generateShareCode(openId) {
  const users = loadJSON(USERS_FILE);
  const u = users.find(x => x.openId === openId);
  if (!u) return null;
  if (!u.shareCode) {
    u.shareCode = 'S' + Math.random().toString(36).slice(2, 7).toUpperCase();
    saveJSON(USERS_FILE, users);
  }
  return { shareCode: u.shareCode, shareLink: `https://xingsujiaclub.cn/?share=${u.shareCode}` };
}

/**
 * 通过分享码查找用户
 */
export function getUserByShareCode(shareCode) {
  const users = loadJSON(USERS_FILE);
  const u = users.find(x => x.shareCode === shareCode);
  if (!u) return null;
  return { userId: u.userId, openId: u.openId, nickName: u.nickName, createdAt: u.createdAt };
}

/**
 * 绑定粉丝
 * hostOpenId: 被绑定（分享者）
 * fanOpenId:  粉丝的 openId（或设备ID）
 * fanName:    粉丝昵称
 */
export function bindFan(hostOpenId, fanOpenId, fanName) {
  ensureDataDir();
  const fans = loadJSON(FANS_FILE);

  // 已经绑定过同一个粉丝 → 更新活跃时间
  const existing = fans.find(f => f.hostOpenId === hostOpenId && f.fanOpenId === fanOpenId);
  if (existing) {
    existing.lastActiveAt = new Date().toISOString();
    existing.actionCount = (existing.actionCount || 0) + 1;
    saveJSON(FANS_FILE, fans);
    return existing;
  }

  const fan = {
    id: 'fan_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    hostOpenId,
    fanOpenId,
    fanName: fanName || '匿名粉丝',
    boundAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    actionCount: 0,
    paid: false,
  };
  fans.push(fan);
  saveJSON(FANS_FILE, fans);

  // 更新分享者的粉丝数画像
  const fanCount = fans.filter(f => f.hostOpenId === hostOpenId).length;
  updateUserTraits(hostOpenId, { fanCount });

  return fan;
}

/**
 * 获取用户粉丝列表
 */
export function getFans(openId) {
  return loadJSON(FANS_FILE)
    .filter(f => f.hostOpenId === openId)
    .sort((a, b) => new Date(b.boundAt) - new Date(a.boundAt));
}

/**
 * 获取粉丝统计
 */
export function getFanStats(openId) {
  const fans = loadJSON(FANS_FILE).filter(f => f.hostOpenId === openId);
  const totalFans = fans.length;
  const paidFans = fans.filter(f => f.paid).length;
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const newThisWeek = fans.filter(f => new Date(f.boundAt).getTime() > weekAgo).length;
  return { totalFans, paidFans, newThisWeek };
}

/**
 * 记录粉丝行为
 */
export function recordFanAction(shareCode, action, meta) {
  const user = getUserByShareCode(shareCode);
  if (!user) return null;
  const fans = loadJSON(FANS_FILE);
  const fanOpenId = meta?.fanOpenId || '';
  if (!fanOpenId) return null;

  const existing = fans.find(f => f.hostOpenId === user.openId && f.fanOpenId === fanOpenId);
  if (existing) {
    existing.actionCount = (existing.actionCount || 0) + 1;
    existing.lastActiveAt = new Date().toISOString();
    if (action === 'payment') existing.paid = true;
    saveJSON(FANS_FILE, fans);
  }

  trackUserEvent(user.openId, 'fan_' + action, { fanOpenId, ...meta });
  return existing;
}

// ========== 用户画像统计分析 ==========

/**
 * 获取用户画像摘要（管理后台用/系统间打通用）
 */
export function getUserProfile(openId) {
  const user = getUserByOpenId(openId);
  if (!user) return null;
  const reports = getUserReports(openId);
  const events = getUserEvents(openId, 200);

  return {
    ...user,
    stats: {
      reportCount: reports.length,
      paidCount: reports.filter(r => r.paid).length,
      testTypes: [...new Set(reports.map(r => r.type))],
      firstVisit: reports.length ? reports[reports.length - 1].createdAt : null,
      lastVisit: user.lastLoginAt,
    },
    recentEvents: events.slice(0, 20),
  };
}
