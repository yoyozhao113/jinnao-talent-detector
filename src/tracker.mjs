/**
 * 轻量用户行为埋点
 * 使用: track('page_view', { page: 'home' })
 */
const TRACK_URL = '/api/track';

function getUid() {
  let uid = localStorage.getItem('star_uid');
  if (!uid) {
    uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    localStorage.setItem('star_uid', uid);
  }
  return uid;
}

// 节流：同类型事件 2s 内不重复上报
const _throttle = {};
function shouldThrottle(key) {
  const now = Date.now();
  if (_throttle[key] && now - _throttle[key] < 2000) return true;
  _throttle[key] = now;
  return false;
}

export default function track(event, data = {}) {
  const key = `${event}:${data.section || data.page || 'all'}`;
  if (shouldThrottle(key)) return;

  const payload = {
    event,
    page: data.page || '',
    section: data.section || '',
    label: data.label || '',
    meta: data.meta || {},
    ts: Date.now(),
    uid: getUid(),
  };

  // 用 sendBeacon 确保页面关闭时也能上报
  if (navigator.sendBeacon) {
    navigator.sendBeacon(TRACK_URL, JSON.stringify(payload));
  } else {
    fetch(TRACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }
}
