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
  }
  saveJSON(USERS_FILE, users);
  return { userId: user.userId, openId: user.openId, nickName: user.nickName, traits: user.traits, createdAt: user.createdAt };
}

/**
 * 获取用户信息（含画像）
 */
export function getUserByOpenId(openId) {
  const users = loadJSON(USERS_FILE);
  const u = users.find(u => u.openId === openId);
  return u ? { userId: u.userId, openId: u.openId, nickName: u.nickName, traits: u.traits, createdAt: u.createdAt } : null;
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
