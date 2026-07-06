// ============================================================
// store.js — localStorage 封装：对比篮 / 已保存 / 筛选条件
// 跨页保留状态，storage 事件跨标签同步
// ============================================================

const K = {
  basket: 'rb.compareBasket',
  saved:  'rb.savedItems',
  filter: 'rb.discoverFilter',
  domain: 'rb.globalDomain',
};

function read(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
  // 同标签内也触发监听
  window.dispatchEvent(new CustomEvent('rb:store', { detail: { key } }));
}

// ---- 对比篮 ----
// 两类对象：博主 type:'blogger'（name/domain/fans/avatar）；视频 type:'content'（title/cover/view/like/collect/vtype/duration/images/author）
export const basket = {
  all: () => read(K.basket, []),
  ofType: (t) => read(K.basket, []).filter(x => (x.type === 'content' ? 'content' : 'blogger') === t),
  count: () => read(K.basket, []).length,
  has: (id) => read(K.basket, []).some(x => x.id === id),
  add(item) {
    const list = read(K.basket, []);
    if (list.some(x => x.id === item.id)) return false;
    const f = ['id', 'type', 'name', 'title', 'cover', 'avatar', 'domain', 'fans',
      'author', 'view', 'like', 'collect', 'vtype', 'duration', 'images'];
    const rec = {};
    f.forEach(k => { if (item[k] !== undefined) rec[k] = item[k]; });
    list.push(rec);
    write(K.basket, list);
    return true;
  },
  remove(id) { write(K.basket, read(K.basket, []).filter(x => x.id !== id)); },
  clear() { write(K.basket, []); },
};

// ---- 已保存结果 ----
export const saved = {
  all: () => read(K.saved, []),
  add(item) {
    const list = read(K.saved, []);
    list.unshift({ ...item, savedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    write(K.saved, list);
  },
};

// ---- 挖掘热点筛选条件 ----
export const filter = {
  get: () => read(K.filter, { scope: 'overall', domain: '', type: 'content', subtype: 'video', metric: 'like', range: '1d' }),
  set: (f) => write(K.filter, f),
};

// ---- 全局领域 ----
export const domain = {
  get: () => read(K.domain, ''),
  set: (d) => write(K.domain, d),
};

// 监听 store 变化（跨标签 storage + 同标签 rb:store）
export function onStoreChange(cb) {
  window.addEventListener('storage', cb);
  window.addEventListener('rb:store', cb);
}
