// ============================================================
// breakdown.js — 爆款拆解页逻辑（MVP 主线）
// 左：入口分段 + 搜索 + 博主库 + 爆款视频 / 博主主页
// 右：分析器（analyzer.js）
// ============================================================
import { mountShell } from './shell.js';
import { renderAnalyzer, setLoading, setSuccess, promptSwitch, drawTrendIfNeeded } from './analyzer.js';
import { contentCard, bloggerRow, stateBox } from './render.js';
import { getBloggers, getBlogger, analyze, getCategories } from './api.js';
import { fmtNum, esc, getQuery } from './format.js';
import { basket } from './store.js';

let bloggers = [];
let categories = [];   // 抖音官方向内容垂类（领域来源）
let currentBlogger = null;
let az = null;
let videoFilter = { domain: '', metric: 'like' };   // 爆款视频：领域 + 排名维度
let bloggerFilter = { domain: '', metric: 'fans' };  // 顶流博主：领域 + 排名维度

// 领域来源：抖音官方向内容垂类词表（非自造示例）
function allDomains() {
  return categories;
}
// 领域匹配：博主 domain（如「家居 / 好物分享」）与官方垂类（如「家居家装」）双向包含匹配
function inDomain(domainStr, pick) {
  if (!pick) return true;
  const main = (domainStr || '').split(/[\/·、,，]/)[0].trim();
  return domainStr.includes(pick) || pick.includes(main) || main.includes(pick);
}
// 排名维度 → 中文 + 单位
const METRICS = { like: '点赞数', collect: '收藏数', view: '浏览量', fans: '粉丝数' };

const CONTENT = `
<div class="split">
  <div class="left">
    <div class="page-head">
      <h1>爆款拆解</h1>
      <p>拆解爆款视频、顶流博主与单个内容，理解数据 / 内容 / 商业变现表现</p>
    </div>
    <div class="row between mb-4">
      <div class="segment" id="entry-seg">
        <button data-e="video" class="active">爆款视频</button>
        <button data-e="blogger">顶流博主</button>
        <button data-e="single">拆解视频</button>
      </div>
      <div class="search" style="max-width:280px;border:1px solid var(--border)">
        <span>🔍</span><input id="blogger-search" placeholder="搜索博主 / 领域" />
      </div>
    </div>
    <div id="left-panel"></div>
  </div>
  <div class="right" id="analyzer-mount"></div>
</div>`;

async function init() {
  mountShell(CONTENT);
  az = renderAnalyzer(document.getElementById('analyzer-mount'));
  [bloggers, categories] = await Promise.all([
    getBloggers(),
    getCategories().then(c => c.primary || []),
  ]);

  document.getElementById('entry-seg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#entry-seg button').forEach(x => x.classList.toggle('active', x === b));
    renderEntry(b.dataset.e);
  });
  document.getElementById('blogger-search').addEventListener('input', e => {
    if (currentBlogger) return;
    // 搜索博主 → 切到顶流博主 tab
    document.querySelectorAll('#entry-seg button').forEach(x => x.classList.toggle('active', x.dataset.e === 'blogger'));
    renderBloggerLib(e.target.value.trim());
  });

  // 深链：?target=content&id= 或 ?url=
  const q = getQuery();
  if (q.target === 'content' && q.id) { renderEntry('video'); analyzeContent(q.id); }
  else if (q.url || q.id) { await enterBlogger(q.id || q.url); }
  else renderEntry('video');
}

// ---- 左侧入口切换 ----
function renderEntry(kind) {
  currentBlogger = null;
  if (kind === 'video') renderVideoRank();
  else if (kind === 'blogger') renderBloggerLib('');
  else document.getElementById('left-panel').innerHTML =
    stateBox({ ico: '🎬', msg: '从「爆款视频」列表点击某条内容的「拆解」，或粘贴作品链接到顶部搜索框' });
}

// 领域 + 维度 工具条
function rankToolbar({ title, domainId, metricId, filter, metrics }) {
  const domOpts = ['<option value="">总体排名</option>']
    .concat(allDomains().map(d => `<option value="${d}" ${filter.domain === d ? 'selected' : ''}>${d}</option>`)).join('');
  const metOpts = Object.entries(metrics)
    .map(([k, v]) => `<option value="${k}" ${filter.metric === k ? 'selected' : ''}>按${v}</option>`).join('');
  const label = filter.domain ? `${filter.domain}领域` : '总体';
  return `
    <div class="row between" style="padding:14px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px">
      <div class="card-title">${title} · <span class="badge brand">${label} / ${metrics[filter.metric]}</span></div>
      <div class="row gap">
        <select class="input" id="${domainId}">${domOpts}</select>
        <select class="input" id="${metricId}">${metOpts}</select>
      </div>
    </div>`;
}

// ---- 爆款视频（领域 + 维度 排名；不选领域=总排名） ----
function renderVideoRank() {
  const panel = document.getElementById('left-panel');
  let list = bloggers.flatMap(b => b.contents.map(c => ({ ...c, author: b.name, _domain: b.domain, _bid: b.id })))
    .filter(c => inDomain(c._domain, videoFilter.domain))
    .sort((a, b) => (b[videoFilter.metric] || 0) - (a[videoFilter.metric] || 0));
  panel.innerHTML = `
    <div class="card">
      ${rankToolbar({ title: '🔥 爆款视频', domainId: 'v-domain', metricId: 'v-metric', filter: videoFilter, metrics: { like: '点赞数', collect: '收藏数', view: '浏览量' } })}
      <div style="padding:12px" id="video-list">
        ${list.length ? `<div class="grid">${list.map((c, i) => contentCard(c, { rank: i + 1 })).join('')}</div>`
          : stateBox({ msg: '该领域下暂无内容' })}
      </div>
    </div>`;
  panel.querySelector('#v-domain').addEventListener('change', e => { videoFilter.domain = e.target.value; renderVideoRank(); });
  panel.querySelector('#v-metric').addEventListener('change', e => { videoFilter.metric = e.target.value; renderVideoRank(); });
  wireContentActions(panel);
}

// ---- 顶流博主（各领域 TOP + 搜索 + 维度：粉丝/点赞/收藏/浏览；不选领域=总排名） ----
function renderBloggerLib(kw) {
  const panel = document.getElementById('left-panel');
  // 为每个博主聚合内容维度合计，供排序用
  const withAgg = bloggers.map(b => {
    const sum = (k) => b.contents.reduce((s, c) => s + (c[k] || 0), 0);
    return { ...b, _like: sum('like'), _collect: sum('collect'), _view: sum('view') };
  });
  const metricKey = { fans: 'fans', like: '_like', collect: '_collect', view: '_view' }[bloggerFilter.metric];
  let list = withAgg
    .filter(b => inDomain(b.domain, bloggerFilter.domain))
    .filter(b => !kw || b.name.includes(kw) || b.domain.includes(kw))
    .sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0));

  const subOf = (b) => {
    const m = bloggerFilter.metric;
    if (m === 'fans') return `${b.domain} · 粉丝 ${fmtNum(b.fans)}`;
    const val = { like: b._like, collect: b._collect, view: b._view }[m];
    return `${b.domain} · ${METRICS[m]}合计 ${fmtNum(val)} · 粉丝 ${fmtNum(b.fans)}`;
  };

  panel.innerHTML = `
    <div class="card">
      ${rankToolbar({ title: '🏆 顶流博主', domainId: 'b-domain', metricId: 'b-metric', filter: bloggerFilter, metrics: METRICS })}
      <div id="blogger-rows">${list.map((b, i) => bloggerRow(b, i + 1, subOf(b))).join('') || stateBox({ msg: '没有匹配的博主' })}</div>
    </div>`;
  panel.querySelector('#b-domain').addEventListener('change', e => { bloggerFilter.domain = e.target.value; renderBloggerLib(kw); });
  panel.querySelector('#b-metric').addEventListener('change', e => { bloggerFilter.metric = e.target.value; renderBloggerLib(kw); });
  wireBloggerActions(panel);
}

function wireBloggerActions(scope) {
  scope.querySelectorAll('.blogger-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-act="enter"]')?.addEventListener('click', () => enterBlogger(id));
    row.querySelector('[data-act="compare"]')?.addEventListener('click', e => addCompare(id, e.target));
  });
}

// ---- 进入博主主页 ----
async function enterBlogger(id) {
  const b = await getBlogger(id);
  currentBlogger = b;
  const panel = document.getElementById('left-panel');
  panel.innerHTML = `
    <button class="btn ghost sm mb-3" id="back-lib">← 返回博主库</button>
    <div class="card pad mb-4">
      <div class="row gap">
        <div class="avatar" style="width:56px;height:56px;flex:0 0 56px">${esc(b.name[0])}</div>
        <div style="flex:1">
          <div class="row gap"><b style="font-size:18px">${esc(b.name)}</b>${b.verified ? '<span class="badge ok">已认证</span>' : ''}</div>
          <div class="muted small mt-2">${esc(b.domain)} · 粉丝 ${fmtNum(b.fans)}</div>
        </div>
        <button class="btn sm" id="hp-compare">加入对比</button>
      </div>
      <p class="small mt-3" style="color:var(--text-2)">${esc(b.bio || '')}</p>
      <div class="mt-2">${(b.tags || []).map(t => `<span class="tag" style="margin:0 6px 6px 0">${esc(t)}</span>`).join('')}</div>
    </div>
    <div class="row between mb-3">
      <b>全部作品（${b.contents.length}）</b>
      <select class="input" id="sort-content">
        <option value="view">按浏览量</option><option value="like">按点赞量</option><option value="collect">按收藏量</option>
      </select>
    </div>
    <div class="grid" id="hp-contents"></div>`;

  const paint = (sortKey = 'view') => {
    const cs = [...b.contents].sort((x, y) => y[sortKey] - x[sortKey]);
    const wrap = panel.querySelector('#hp-contents');
    wrap.innerHTML = cs.map(c => contentCard({ ...c, author: b.name })).join('');
    wireContentActions(wrap);
  };
  paint();
  panel.querySelector('#sort-content').addEventListener('change', e => paint(e.target.value));
  panel.querySelector('#back-lib').addEventListener('click', () => { currentBlogger = null; renderBloggerLib(''); });
  panel.querySelector('#hp-compare').addEventListener('click', e => addCompare(b.id, e.target));

  // 右侧：博主维度分析
  analyzeBlogger(b);
}

// ---- 触发分析 ----
async function analyzeBlogger(b) {
  setLoading({ id: b.id, type: 'blogger', name: b.name, domain: b.domain, fans: b.fans });
  const data = await analyze('blogger', b.id);
  setSuccess({ id: b.id, type: 'blogger', name: b.name, domain: b.domain, fans: b.fans }, data);
  hookTrend(data);
}

async function analyzeContent(cid) {
  const owner = bloggers.find(b => b.contents.some(c => c.id === cid));
  const c = owner?.contents.find(x => x.id === cid) || { id: cid, title: '单个作品' };
  setLoading({ id: cid, type: 'content', name: c.title, domain: owner?.domain });
  const data = await analyze('content', cid);
  setSuccess({ id: cid, type: 'content', name: c.title, domain: owner?.domain }, data);
  hookTrend(data);
}

// 内容分析 tab 切换后画趋势图（监听 body 变化简单实现：延时探测）
function hookTrend(data) {
  const series = data?.content?.trend?.series;
  const tabs = document.getElementById('az-tabs');
  tabs?.addEventListener('click', e => {
    if (e.target.dataset?.tab === 'content') setTimeout(() => drawTrendIfNeeded(series), 30);
  });
}

// ---- 内容卡操作 ----
function wireContentActions(scope) {
  scope.querySelectorAll('.content-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="view"]')?.addEventListener('click', () => {
      const c = findContent(id); window.open(c?.url || '#', '_blank');
    });
    card.querySelector('[data-act="breakdown"]')?.addEventListener('click', () => {
      // 若在博主主页内点单内容 → 引导；否则直接拆解
      if (currentBlogger) promptSwitch(() => analyzeContent(id));
      else analyzeContent(id);
    });
    card.querySelector('[data-act="compare"]')?.addEventListener('click', e => {
      const c = findContent(id);
      const ok = basket.add({ id, type: 'content', name: c?.title, domain: '' });
      markAdded(e.target, ok);
    });
  });
}

function addCompare(id, btn) {
  const b = bloggers.find(x => x.id === id);
  const ok = basket.add({ id, type: 'blogger', name: b?.name, domain: b?.domain, fans: b?.fans });
  markAdded(btn, ok);
}
function markAdded(btn, ok) { btn.textContent = ok ? '✓ 已加入' : '已在篮中'; btn.disabled = true; }
function findContent(id) {
  for (const b of bloggers) { const c = b.contents.find(x => x.id === id); if (c) return { ...c, author: b.name }; }
  return null;
}

init();
