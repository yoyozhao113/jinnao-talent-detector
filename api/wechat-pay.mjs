/**
 * 微信支付 JSAPI 集成
 *
 * 环境变量：
 *   WECHAT_APPID       - 公众号 AppID
 *   WECHAT_APPSECRET   - 公众号 AppSecret（用于获取 OpenID）
 *   WECHAT_MCHID       - 商户号
 *   WECHAT_API_KEY     - API v2 密钥（商户平台设置）
 *   WECHAT_NOTIFY_URL  - 支付回调地址
 */

import crypto from 'crypto';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const APPID = process.env.WECHAT_APPID || '';
const APPSECRET = process.env.WECHAT_APPSECRET || '';
const MCHID = process.env.WECHAT_MCHID || '';
const API_KEY = process.env.WECHAT_API_KEY || '';
const NOTIFY_URL = process.env.WECHAT_NOTIFY_URL || '';

const UNIFIED_ORDER_URL = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
const OAUTH_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token';

const ORDERS_FILE = join(ROOT, 'payment_orders.json');

// ========== 数据存储 ==========
function loadOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  } catch { return []; }
}
function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

// ========== 工具 ==========
function nonceStr(len = 32) {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < len; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

function outTradeNo() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function signMD5(params) {
  const keys = Object.keys(params).sort();
  const str = keys.filter(k => params[k] !== '' && params[k] != null)
    .map(k => `${k}=${params[k]}`).join('&') + `&key=${API_KEY}`;
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase();
}

function buildXML(obj) {
  let xml = '<xml>';
  for (const [k, v] of Object.entries(obj)) {
    if (v !== '' && v != null) xml += `<${k}><![CDATA[${v}]]></${k}>`;
  }
  xml += '</xml>';
  return xml;
}

function parseXML(xml) {
  const r = {};
  const re = /<(\w+)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/g;
  let m;
  while ((m = re.exec(xml)) !== null) r[m[1]] = m[2];
  return r;
}

// ========== 微信 API ==========

/**
 * 通过 OAuth code 换取 OpenID
 */
export async function getOpenId(code) {
  if (!APPSECRET) throw new Error('WECHAT_APPSECRET 未配置');
  const url = `${OAUTH_TOKEN_URL}?appid=${APPID}&secret=${APPSECRET}&code=${code}&grant_type=authorization_code`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.errcode) throw new Error(`获取 OpenID 失败: ${data.errmsg}`);
  return data.openid;
}

/**
 * 统一下单
 * @returns {{ prepayId, jsapiParams }}
 */
export async function createUnifiedOrder({ openId, amount, description }) {
  const totalFee = Math.round(amount * 100);

  const params = {
    appid: APPID,
    mch_id: MCHID,
    nonce_str: nonceStr(),
    body: description || '劲脑·天赋探测仪 - 深度版报告',
    out_trade_no: outTradeNo(),
    total_fee: totalFee,
    spbill_create_ip: '127.0.0.1',
    notify_url: NOTIFY_URL,
    trade_type: 'JSAPI',
    openid: openId,
  };
  params.sign = signMD5(params);

  const resp = await fetch(UNIFIED_ORDER_URL, {
    method: 'POST',
    body: buildXML(params),
    headers: { 'Content-Type': 'text/xml' },
  });
  const text = await resp.text();
  const result = parseXML(text);

  if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
    throw new Error(`统一下单失败: ${result.err_code_des || result.return_msg}`);
  }

  const jsapi = {
    appId: APPID,
    timeStamp: Math.floor(Date.now() / 1000).toString(),
    nonceStr: nonceStr(),
    package: `prepay_id=${result.prepay_id}`,
    signType: 'MD5',
  };
  jsapi.paySign = signMD5(jsapi);

  return {
    outTradeNo: params.out_trade_no,
    prepayId: result.prepay_id,
    jsapiParams: jsapi,
  };
}

/**
 * 验证支付回调签名
 * @returns {{ valid: boolean, params: object }}
 */
export function verifyNotification(xmlBody) {
  const params = parseXML(xmlBody);
  const sign = params.sign;
  delete params.sign;
  const calc = signMD5(params);
  return { valid: calc === sign, params };
}

// ========== 本地订单管理 ==========

export function savePaymentOrder({ outTradeNo, openId, amount, description }) {
  const orders = loadOrders();
  orders.push({
    outTradeNo,
    openId,
    amount,
    description: description || '劲脑·天赋探测仪 - 深度版报告',
    status: 'pending',
    createdAt: new Date().toISOString(),
    paidAt: null,
    transactionId: '',
  });
  saveOrders(orders);
}

export function markOrderPaid(outTradeNo, transactionId) {
  const orders = loadOrders();
  const idx = orders.findIndex(o => o.outTradeNo === outTradeNo);
  if (idx === -1) return null;
  orders[idx].status = 'paid';
  orders[idx].paidAt = new Date().toISOString();
  orders[idx].transactionId = transactionId || '';
  saveOrders(orders);
  return orders[idx];
}

export function getOrder(outTradeNo) {
  return loadOrders().find(o => o.outTradeNo === outTradeNo) || null;
}

export function getUserOrders(openId) {
  return loadOrders()
    .filter(o => o.openId === openId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
