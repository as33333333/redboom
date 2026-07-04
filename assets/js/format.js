// ============================================================
// format.js — 单位格式化 / 条件序列化 / 小工具
// ============================================================

// 数值格式化：保留原始值，展示为 万/千
export function fmtNum(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '暂无数据';
  const v = Number(n);
  if (v >= 1e8) return (v / 1e8).toFixed(1).replace(/\.0$/, '') + '亿';
  if (v >= 1e4) return (v / 1e4).toFixed(1).replace(/\.0$/, '') + '万';
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + '千';
  return String(v);
}

// 时长 秒 → mm:ss
export function fmtDuration(sec) {
  if (sec == null) return '暂无数据';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// 是否缺失
export function isNA(v) { return v === null || v === undefined || v === '' || Number.isNaN(v); }

// HTML 转义
export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// URL query 读写
export function getQuery() { return Object.fromEntries(new URLSearchParams(location.search)); }
export function setQuery(obj) {
  const q = new URLSearchParams(location.search);
  Object.entries(obj).forEach(([k, v]) => (v == null ? q.delete(k) : q.set(k, v)));
  history.replaceState(null, '', `${location.pathname}?${q.toString()}`);
}

// 条件序列化（挖掘热点条件回显）
export function serializeCondition(f) {
  const scope = f.scope === 'domain' ? (f.domain || '领域') : '总体';
  const type = f.type === 'blogger' ? '博主' : (f.subtype === 'image' ? '图文' : '视频');
  const metric = { like: '点赞量', view: '浏览量', collect: '收藏量', fans: '涨粉量' }[f.metric] || f.metric;
  const range = { '1d': '一天内最多', '3d': '三天内最多', '7d': '一周内最多' }[f.range] || f.range;
  return `${scope} / ${type} / ${metric} / ${range}`;
}
