// ============================================================
// api.js — 后端调用封装，带 mock 回退
// 后端未启动时自动读取 assets/mock/*.json，保证「打开即用」
// ============================================================
export const API_BASE = ''; // 联调时改为后端地址，如 'http://localhost:8000'

async function tryBackend(path) {
  if (!API_BASE) throw new Error('no-backend');
  const r = await fetch(API_BASE + path, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('bad-status');
  return r.json();
}

async function mock(file) {
  const r = await fetch(`assets/mock/${file}`);
  return r.json();
}

// 获取博主（含作品列表）
export async function getBlogger(idOrUrl) {
  try { return await tryBackend(`/api/blogger?url=${encodeURIComponent(idOrUrl)}`); }
  catch {
    const { bloggers } = await mock('bloggers.json');
    return bloggers.find(b => b.id === idOrUrl) || bloggers[0];
  }
}

export async function getBloggers() {
  try { return (await tryBackend('/api/bloggers')).bloggers; }
  catch { return (await mock('bloggers.json')).bloggers; }
}

// 获取分析结果（博主或内容）
export async function analyze(targetType, targetId) {
  try { return await tryBackend(`/api/analyze?type=${targetType}&id=${targetId}`); }
  catch {
    const all = await mock('analysis.json');
    // 演示：内容维度复用博主分析并改写 data 为单值
    const base = all['dy_homelife'];
    if (targetType === 'content') {
      return { ...base, targetType: 'content', data: { fans: base.data.fans, view: { value: 862000 }, like: { value: 98000 }, collect: { value: 45000 } } };
    }
    return all[targetId] || base;
  }
}

export async function getRank(filter) {
  try { return await tryBackend(`/api/discover/rank?${new URLSearchParams(filter)}`); }
  catch { return mock('rank.json'); }
}

// 抖音官方向内容垂类词表（巨量星图 + 主流数据机构口径）
let _catCache = null;
export async function getCategories() {
  if (_catCache) return _catCache;
  try { _catCache = await tryBackend('/api/categories'); }
  catch { _catCache = await mock('categories.json'); }
  return _catCache;
}
