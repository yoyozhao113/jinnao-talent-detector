/**
 * 裂变分销系统 - 数据层
 * distributors.json / orders.json / withdrawals.json
 */
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DB = {
  distributors: join(ROOT, 'distributors.json'),
  orders: join(ROOT, 'distributor_orders.json'),
  withdrawals: join(ROOT, 'distributor_withdrawals.json'),
  config: join(ROOT, 'distributor_config.json'),
};

// 默认配置
const DEFAULT_CONFIG = {
  commissionRate: 0.3,
  minWithdrawal: 10,
};

// ========== 配置管理 ==========
function loadConfigFile() {
  try {
    if (!fs.existsSync(DB.config)) {
      save(DB.config, DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(DB.config, 'utf-8')) };
  } catch {
    save(DB.config, DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfigFile(config) {
  save(DB.config, { ...DEFAULT_CONFIG, ...config });
}

export function getConfig() {
  return loadConfigFile();
}

export function updateConfig(updates) {
  const config = loadConfigFile();
  if (updates.commissionRate !== undefined) {
    const rate = parseFloat(updates.commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 1) return { success: false, error: '佣金比例需在 0~1 之间' };
    config.commissionRate = rate;
  }
  if (updates.minWithdrawal !== undefined) {
    const min = parseFloat(updates.minWithdrawal);
    if (isNaN(min) || min < 0) return { success: false, error: '最低提现金额无效' };
    config.minWithdrawal = min;
  }
  saveConfigFile(config);
  return { success: true, config };
}

function getCommissionRate() {
  return loadConfigFile().commissionRate;
}

function getMinWithdrawal() {
  return loadConfigFile().minWithdrawal;
}

// ========== 通用读写 ==========
function load(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch { return []; }
}
function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ========== ID生成 ==========
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function genDistributorCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ========== 分销商 ==========
export function registerDistributor({ uid, name, wechat, phone, source }) {
  const list = load(DB.distributors);
  if (list.find(d => d.uid === uid)) return { success: false, error: '该用户已是推广员' };
  if (list.find(d => d.wechat === wechat)) return { success: false, error: '该微信号已注册' };

  let code;
  do { code = genDistributorCode(); } while (list.find(d => d.code === code));

  const distributor = {
    id: genId(),
    uid, code, name, wechat, phone: phone || '',
    source: source || '',
    status: 'active',
    totalReferrals: 0,
    totalCommission: 0,
    withdrawable: 0,
    withdrawn: 0,
    createdAt: new Date().toISOString(),
  };
  list.push(distributor);
  save(DB.distributors, list);
  return { success: true, distributor };
}

export function getDistributorByUid(uid) {
  return load(DB.distributors).find(d => d.uid === uid) || null;
}
export function getDistributorByCode(code) {
  return load(DB.distributors).find(d => d.code === code) || null;
}

export function updateDistributor(uid, updates) {
  const list = load(DB.distributors);
  const idx = list.findIndex(d => d.uid === uid);
  if (idx === -1) return false;
  Object.assign(list[idx], updates);
  save(DB.distributors, list);
  return true;
}

export function listDistributors(filterInactive = false) {
  const list = load(DB.distributors);
  return filterInactive ? list.filter(d => d.status === 'active') : list;
}

// ========== 推广订单 ==========
export function createReferralOrder({ refUid, customerUid, customerName, orderType, amount }) {
  const distributor = getDistributorByUid(refUid);
  if (!distributor) return null;

  const rate = getCommissionRate();
  const commission = Math.round(amount * rate * 100) / 100;
  const order = {
    id: genId(),
    distributorUid: refUid,
    distributorCode: distributor.code,
    customerUid: customerUid || '',
    customerName: customerName || '匿名用户',
    orderType,                  // 'free' | 'premium'
    amount,
    commission,
    commissionRate: rate,
    status: 'pending',          // pending | confirmed | cancelled
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  };

  const list = load(DB.orders);
  list.push(order);
  save(DB.orders, list);

  // 更新分销商统计
  updateDistributor(refUid, { totalReferrals: (distributor.totalReferrals || 0) + 1 });
  return order;
}

export function confirmReferralOrder(orderId) {
  const list = load(DB.orders);
  const idx = list.findIndex(o => o.id === orderId);
  if (idx === -1) return { success: false, error: '订单不存在' };
  if (list[idx].status === 'confirmed') return { success: false, error: '订单已确认' };

  list[idx].status = 'confirmed';
  list[idx].confirmedAt = new Date().toISOString();
  save(DB.orders, list);

  // 更新分销商可提现金额
  const order = list[idx];
  const dist = getDistributorByUid(order.distributorUid);
  if (dist) {
    updateDistributor(order.distributorUid, {
      totalCommission: (dist.totalCommission || 0) + order.commission,
      withdrawable: (dist.withdrawable || 0) + order.commission,
    });
  }
  return { success: true, order: list[idx] };
}

export function cancelReferralOrder(orderId) {
  const list = load(DB.orders);
  const idx = list.findIndex(o => o.id === orderId);
  if (idx === -1) return { success: false, error: '订单不存在' };
  list[idx].status = 'cancelled';
  save(DB.orders, list);
  return { success: true };
}

export function getDistributorOrders(uid, filter = {}) {
  let list = load(DB.orders).filter(o => o.distributorUid === uid);
  if (filter.status) list = list.filter(o => o.status === filter.status);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getAllOrders(filter = {}) {
  let list = load(DB.orders);
  if (filter.status) list = list.filter(o => o.status === filter.status);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ========== 提现 ==========
export function createWithdrawal({ distributorUid, amount, name, wechat }) {
  const dist = getDistributorByUid(distributorUid);
  if (!dist) return { success: false, error: '推广员不存在' };
  if (dist.status !== 'active') return { success: false, error: '账号已停用' };
  const minWd = getMinWithdrawal();
  if (amount < minWd) return { success: false, error: `最低提现金额 ¥${minWd}` };
  if (amount > (dist.withdrawable || 0)) return { success: false, error: `可提现余额不足（可提现 ¥${dist.withdrawable}）` };

  const wd = {
    id: genId(),
    distributorUid,
    amount,
    name: name || dist.name,
    wechat: wechat || dist.wechat,
    status: 'pending',
    createdAt: new Date().toISOString(),
    handledAt: null,
    note: '',
  };

  const list = load(DB.withdrawals);
  list.push(wd);
  save(DB.withdrawals, list);

  // 冻结可提现金额
  updateDistributor(distributorUid, {
    withdrawable: Math.round(((dist.withdrawable || 0) - amount) * 100) / 100,
  });
  return { success: true, withdrawal: wd };
}

export function approveWithdrawal(withdrawalId) {
  const list = load(DB.withdrawals);
  const idx = list.findIndex(w => w.id === withdrawalId);
  if (idx === -1) return { success: false, error: '提现请求不存在' };
  if (list[idx].status !== 'pending') return { success: false, error: '已处理' };

  list[idx].status = 'approved';
  list[idx].handledAt = new Date().toISOString();
  save(DB.withdrawals, list);

  // 更新分销商已提现总额
  const wd = list[idx];
  const dist = getDistributorByUid(wd.distributorUid);
  if (dist) {
    updateDistributor(wd.distributorUid, {
      withdrawn: (dist.withdrawn || 0) + wd.amount,
    });
  }
  return { success: true };
}

export function rejectWithdrawal(withdrawalId, note = '') {
  const list = load(DB.withdrawals);
  const idx = list.findIndex(w => w.id === withdrawalId);
  if (idx === -1) return { success: false, error: '提现请求不存在' };
  if (list[idx].status !== 'pending') return { success: false, error: '已处理' };

  const wd = list[idx];
  list[idx].status = 'rejected';
  list[idx].handledAt = new Date().toISOString();
  list[idx].note = note;
  save(DB.withdrawals, list);

  // 退回可提现金额
  const dist = getDistributorByUid(wd.distributorUid);
  if (dist) {
    updateDistributor(wd.distributorUid, {
      withdrawable: (dist.withdrawable || 0) + wd.amount,
    });
  }
  return { success: true };
}

export function getDistributorWithdrawals(uid) {
  return load(DB.withdrawals)
    .filter(w => w.distributorUid === uid)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getAllWithdrawals(status = '') {
  let list = load(DB.withdrawals);
  if (status) list = list.filter(w => w.status === status);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ========== 分销商统计数据 ==========
export function getDistributorStats(uid) {
  const dist = getDistributorByUid(uid);
  if (!dist) return null;
  const orders = getDistributorOrders(uid);
  return {
    totalReferrals: dist.totalReferrals || 0,
    totalCommission: dist.totalCommission || 0,
    withdrawable: dist.withdrawable || 0,
    withdrawn: dist.withdrawn || 0,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    confirmedOrders: orders.filter(o => o.status === 'confirmed').length,
  };
}

// ========== 计算佣金 ==========
export function calcCommission(amount) {
  return Math.round(amount * getCommissionRate() * 100) / 100;
}
