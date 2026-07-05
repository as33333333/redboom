// ============================================================
// shell.js — 全局外壳：注入侧边导航 + 顶栏，高亮当前模块，对比篮计数
// 每页 <body data-module="breakdown|discover|compare"> + <div id="app"></div>
// ============================================================
import { basket, onStoreChange } from './store.js';
import { fmtNum, esc } from './format.js';

const NAV = [
  { key: 'breakdown', label: '爆款拆解', ic: '🔥', href: 'index.html' },
  { key: 'discover',  label: '挖掘热点', ic: '📈', href: 'discover.html' },
  { key: 'compare',   label: '对比分析', ic: '⚖️', href: 'compare.html' },
];

export function mountShell(contentHTML) {
  const active = document.body.dataset.module || 'breakdown';
  const app = document.getElementById('app');

  const navItems = NAV.map(n => `
    <a class="nav-item ${n.key === active ? 'active' : ''}" href="${n.href}">
      <span class="ic">${n.ic}</span><span>${n.label}</span>
    </a>`).join('');

  app.innerHTML = `
    <div class="app">
      <nav class="sidenav">
        <div class="logo">RB</div>
        ${navItems}
      </nav>
      <div class="main">
        <header class="topbar">
          <span class="brand-name">自媒体工作台Agent</span>
          <div class="search">
            <span>🔍</span>
            <input id="global-search" placeholder="搜索博主 / 粘贴抖音链接…" />
          </div>
          <div class="spacer"></div>
          <div class="top-actions">
            <span class="badge gray">抖音</span>
            <div class="basket-wrap">
              <button class="btn basket" id="basket-btn">
                🧺 对比篮 <span class="count" id="basket-count">0</span>
              </button>
              <div class="basket-pop" id="basket-pop" style="display:none"></div>
            </div>
            <button class="btn ghost" id="saved-btn">⭐ 已保存</button>
          </div>
        </header>
        <div class="content ${document.body.dataset.pad === 'no' ? 'no-pad' : ''}" id="content">
          ${contentHTML || ''}
        </div>
      </div>
    </div>`;

  refreshBasket();
  onStoreChange(() => { refreshBasket(); if (isPopOpen()) renderPop(); });

  // 顶栏搜索：回车跳爆款拆解
  const s = document.getElementById('global-search');
  s.addEventListener('keydown', e => {
    if (e.key === 'Enter' && s.value.trim()) {
      location.href = `index.html?url=${encodeURIComponent(s.value.trim())}`;
    }
  });
  document.getElementById('saved-btn').addEventListener('click', () => {
    import('./store.js').then(({ saved }) => {
      const n = saved.all().length;
      alert(n ? `已保存 ${n} 条分析/建议（演示：列表待接入）` : '还没有保存任何结果');
    });
  });

  // 对比篮弹窗
  const btn = document.getElementById('basket-btn');
  btn.addEventListener('click', e => { e.stopPropagation(); togglePop(); });
  document.addEventListener('click', e => {
    if (isPopOpen() && !e.target.closest('.basket-wrap')) closePop();
  });
}

function isPopOpen() { const p = document.getElementById('basket-pop'); return p && p.style.display !== 'none'; }
function closePop() { const p = document.getElementById('basket-pop'); if (p) p.style.display = 'none'; }
function togglePop() {
  const p = document.getElementById('basket-pop');
  if (!p) return;
  if (p.style.display === 'none') { renderPop(); p.style.display = 'block'; } else { closePop(); }
}

let popDim = 'content';   // 弹窗当前维度：content(视频) | blogger(博主)

function renderPop() {
  const p = document.getElementById('basket-pop');
  const all = basket.all();
  if (!all.length) {
    p.innerHTML = `
      <div class="basket-pop-head">对比篮</div>
      <div class="state" style="padding:24px 16px"><div class="ico">🧺</div>
        <div class="msg small">还没有加入任何对比对象<br>去「爆款拆解」或「挖掘热点」点「加入对比」</div></div>`;
    return;
  }
  const videos = basket.ofType('content');
  const bloggers = basket.ofType('blogger');
  // 默认维度选有内容的那一类
  if (popDim === 'content' && !videos.length && bloggers.length) popDim = 'blogger';
  if (popDim === 'blogger' && !bloggers.length && videos.length) popDim = 'content';
  const list = popDim === 'content' ? videos : bloggers;

  p.innerHTML = `
    <div class="basket-pop-head">对比篮（${all.length}）<span class="muted small" style="font-weight:400">同类型任选 2 个对比</span></div>
    <div class="segment" style="margin:8px 10px 4px">
      <button data-dim="content" class="${popDim === 'content' ? 'active' : ''}">🎬 视频 ${videos.length}</button>
      <button data-dim="blogger" class="${popDim === 'blogger' ? 'active' : ''}">👤 博主 ${bloggers.length}</button>
    </div>
    <div class="basket-pop-list">
      ${list.length ? list.map(it => it.type === 'content' ? videoItem(it) : bloggerItem(it)).join('')
        : `<div class="muted small" style="padding:16px;text-align:center">该类型暂无对象</div>`}
    </div>
    <div class="basket-pop-foot">
      <button class="btn ghost sm" data-act="clear">清空</button>
      <a class="btn primary sm" href="compare.html?dim=${popDim}" data-act="quick">⚡ 快速对比</a>
    </div>`;

  p.querySelectorAll('[data-dim]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); popDim = b.dataset.dim; renderPop();
  }));
  p.querySelectorAll('[data-act="del"]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    basket.remove(e.target.closest('[data-id]').dataset.id);
    renderPop();
  }));
  p.querySelector('[data-act="clear"]')?.addEventListener('click', e => {
    e.stopPropagation(); basket.clear(); renderPop();
  });
}

function videoItem(it) {
  return `
    <div class="basket-pop-item" data-id="${esc(it.id)}">
      <div class="pop-thumb">${it.cover ? `<img src="${esc(it.cover)}" onerror="this.replaceWith(document.createTextNode('🎬'))">` : '🎬'}</div>
      <div style="flex:1;min-width:0">
        <div class="name" style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.title || it.name)}</div>
        <div class="muted small">视频${it.author ? ' · @' + esc(it.author) : ''}${it.view != null ? ' · ' + fmtNum(it.view) + '播放' : ''}</div>
      </div>
      <button class="btn ghost sm" data-act="del" title="移除">✕</button>
    </div>`;
}
function bloggerItem(it) {
  return `
    <div class="basket-pop-item" data-id="${esc(it.id)}">
      <div class="avatar" style="width:34px;height:34px;flex:0 0 34px;font-size:13px">${esc((it.name || '?')[0])}</div>
      <div style="flex:1;min-width:0">
        <div class="name" style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.name)}</div>
        <div class="muted small">博主${it.domain ? ' · ' + esc(it.domain) : ''}${it.fans != null ? ' · ' + fmtNum(it.fans) + '粉' : ''}</div>
      </div>
      <button class="btn ghost sm" data-act="del" title="移除">✕</button>
    </div>`;
}

function refreshBasket() {
  const el = document.getElementById('basket-count');
  if (el) el.textContent = basket.count();
}
