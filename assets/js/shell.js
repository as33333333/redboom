// ============================================================
// shell.js — 全局外壳：注入侧边导航 + 顶栏，高亮当前模块，对比篮计数
// 每页 <body data-module="breakdown|discover|compare"> + <div id="app"></div>
// ============================================================
import { basket, onStoreChange } from './store.js';

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
            <a class="btn basket" href="compare.html" id="basket-btn">
              🧺 对比篮 <span class="count" id="basket-count">0</span>
            </a>
            <button class="btn ghost" id="saved-btn">⭐ 已保存</button>
          </div>
        </header>
        <div class="content ${document.body.dataset.pad === 'no' ? 'no-pad' : ''}" id="content">
          ${contentHTML || ''}
        </div>
      </div>
    </div>`;

  refreshBasket();
  onStoreChange(refreshBasket);

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
}

function refreshBasket() {
  const el = document.getElementById('basket-count');
  if (el) el.textContent = basket.count();
}
