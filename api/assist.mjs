/**
 * 邀请助力解锁系统
 * - 用户生成免费报告后，邀请 N 位好友完成测试即可解锁完整版
 * - 门槛（unlockThreshold）可在管理后台配置，不写死
 *
 * 数据文件：
 * - data/assists.json        助力记录（按 hostKey 去重 helperKey）
 * - data/assist_unlocks.json 显式解锁记录（填微信/管理员手动）
 * - assist_config.json       活动配置
 */
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ASSISTS_FILE = join(ROOT, 'data', 'assists.json');
const UNLOCKS_FILE = join(ROOT, 'data', 'assist_unlocks.json');
const CONFIG_FILE = join(ROOT, 'assist_config.json');

const DEFAULT_CONFIG = { unlockThreshold: 3 };

function ensureDataDir() {
  const d = join(ROOT, 'data');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
function load(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch { return []; }
}
function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ========== 配置 ==========
export function getConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function updateConfig(updates) {
  const cfg = getConfig();
  if (updates.unlockThreshold !== undefined) {
    const n = parseInt(updates.unlockThreshold, 10);
    if (isNaN(n) || n < 1 || n > 99) return { success: false, error: '解锁人数需在 1~99 之间' };
    cfg.unlockThreshold = n;
  }
  if (updates.enabled !== undefined) {
    cfg.enabled = updates.enabled ? true : false;
  }
  save(CONFIG_FILE, cfg);
  return { success: true, config: cfg };
}

// ========== 助力状态 ==========
function getAssists(hostKey) {
  const rows = load(ASSISTS_FILE).filter(a => a.hostKey === hostKey);
  const seen = new Set();
  return rows.filter(a => {
    if (!a.helperKey || seen.has(a.helperKey)) return false;
    seen.add(a.helperKey);
    return true;
  });
}

function getExplicitUnlock(hostKey) {
  return load(UNLOCKS_FILE).find(u => u.hostKey === hostKey) || null;
}

/**
 * 获取用户解锁状态
 * @returns { count, threshold, unlocked, needed, unlockedAt }
 */
export function getAssistStatus(hostKey) {
  const cfg = getConfig();
  const assists = getAssists(hostKey);
  const count = assists.length;
  const threshold = cfg.unlockThreshold;
  const explicit = getExplicitUnlock(hostKey);
  const unlocked = (cfg.enabled === false) || count >= threshold || !!explicit;
  return {
    count,
    threshold,
    unlocked,
    needed: Math.max(0, threshold - count),
    unlockedAt: explicit ? explicit.createdAt : (count >= threshold ? assists[count - 1]?.createdAt : null),
    unlockedBy: explicit ? explicit.method : (count >= threshold ? 'assist' : ''),
  };
}

// ========== 助力记录 ==========
/**
 * 好友完成测试后调用
 * @returns { success, justUnlocked, status, deduped }
 */
export function recordAssist({ hostKey, helperKey, helperName }) {
  ensureDataDir();
  if (!hostKey) return { success: false, error: '缺少 hostKey' };
  if (hostKey === helperKey) return { success: true, deduped: true, justUnlocked: false, status: getAssistStatus(hostKey) };

  const rows = load(ASSISTS_FILE);
  const dup = rows.find(a => a.hostKey === hostKey && a.helperKey === helperKey);
  if (dup) {
    return { success: true, deduped: true, justUnlocked: false, status: getAssistStatus(hostKey) };
  }

  const before = getAssistStatus(hostKey);
  rows.push({
    id: genId(),
    hostKey,
    helperKey,
    helperName: helperName || '匿名好友',
    createdAt: new Date().toISOString(),
  });
  save(ASSISTS_FILE, rows);

  const after = getAssistStatus(hostKey);
  return {
    success: true,
    deduped: false,
    justUnlocked: !before.unlocked && after.unlocked,
    status: after,
  };
}

// ========== 显式解锁（填微信 / 管理员） ==========
export function unlockByMethod(hostKey, method) {
  ensureDataDir();
  if (!hostKey) return { success: false, error: '缺少 hostKey' };
  const rows = load(UNLOCKS_FILE);
  if (!rows.find(u => u.hostKey === hostKey)) {
    rows.push({ hostKey, method: method || 'manual', createdAt: new Date().toISOString() });
    save(UNLOCKS_FILE, rows);
  }
  return { success: true, status: getAssistStatus(hostKey) };
}

export function resetAssist(hostKey) {
  const rows = load(ASSISTS_FILE).filter(a => a.hostKey !== hostKey);
  save(ASSISTS_FILE, rows);
  const unlocks = load(UNLOCKS_FILE).filter(u => u.hostKey !== hostKey);
  save(UNLOCKS_FILE, unlocks);
  return { success: true, status: getAssistStatus(hostKey) };
}

// ========== 管理统计 ==========
export function getAssistStats() {
  const rows = load(ASSISTS_FILE);
  const hosts = {};
  rows.forEach(a => {
    if (!hosts[a.hostKey]) hosts[a.hostKey] = new Set();
    hosts[a.hostKey].add(a.helperKey);
  });
  // 显式解锁（填微信/手动）的用户也要计入已解锁统计
  load(UNLOCKS_FILE).forEach(u => {
    if (!hosts[u.hostKey]) hosts[u.hostKey] = new Set();
  });
  return {
    totalAssists: rows.length,
    totalHosts: Object.keys(hosts).length,
    unlockedHosts: Object.keys(hosts).filter(h => getAssistStatus(h).unlocked).length,
    recentAssists: rows.slice(-20).reverse().map(a => ({
      hostKey: a.hostKey, helperName: a.helperName, createdAt: a.createdAt,
    })),
  };
}
