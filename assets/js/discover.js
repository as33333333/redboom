// ============================================================
// discover.js — 挖掘热点（筛选器真实联动 + 示例榜单 + 占位徽标）
// ============================================================
import { mountShell } from './shell.js';
import { getRank, getCategories } from './api.js';
import { fmtNum, esc, serializeCondition } from './format.js';
import { filter as filterStore } from './store.js';
import { basket } from './store.js';

let f = filterStore.get();
let rankData = null;

const CONTENT = `
<div class="page-head">
  <h1>挖掘热点</h1>
  <p>通过数据排名发现热门博主与内容，快速判断「现在什么值得看、值得拆」</p>
</div>

<div class="coming-banner">📊 抖音排行榜采集（热榜 / 聚合）为后续版本，当前为<strong>&nbsp;示例数据&nbsp;</strong>用于演示交互；筛选联动已真实生效</div>

<div class="card pad mb-4">
  <div class="filterbar">
    <div class="filter-group"><span class="lbl">数据排名</span>
      <div class="segment" data-f="scope">
        <button data-v="overall">总体</button><button data-v="domain">按方向/领域</button>
      </div>
      <select class="input" id="domain-sel" style="display:none">
        <option value="">选择领域…</option>
      </select>
    </div>
    <div class="filter-group"><span class="lbl">数据类型</span>
      <div class="segment" data-f="type">
        <button data-v="blogger">博主</button><button data-v="content">内容</button>
      </div>
      <div class="segment" id="subtype" data-f="subtype" style="display:none">
        <button data-v="video">视频</button><button data-v="image">图文</button>
      </div>
    </div>
  </div>
  <div class="divider"></div>
  <div class="filterbar">
    <div class="filter-group"><span class="lbl">排名维度</span>
      <div class="segment" data-f="metric">
        <button data-v="like">点赞量</button><button data-v="view">浏览量</button>
        <button data-v="collect">收藏量</button><button data-v="fans">涨粉量</button>
      </div>
    </div>
    <div class="filter-group"><span class="lbl">时间范围</span>
      <div class="segment" data-f="range">
        <button data-v="1d">一天内</button><button data-v="3d">三天内</button><button data-v="7d">一周内</button>
      </div>
    </div>
  </div>
</div>

<div class="row between mb-3">
  <div class="condition-echo">当前条件：<b id="cond">—</b></div>
  <span class="muted small" id="count-hint"></span>
</div>

<div class="card" id="rank-wrap"></div>`;

async function init() {
  mountShell(CONTENT);
  // 领域下拉：抖音官方向内容垂类词表
  const cats = (await getCategories()).primary || [];
  const sel = document.getElementById('domain-sel');
  sel.innerHTML = '<option value="">选择领域…</option>' +
    cats.map(d => `<option value="${d}" ${f.domain === d ? 'selected' : ''}>${d}</option>`).join('');
  syncSegments();
  document.querySelectorAll('.segment[data-f]').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const key = seg.dataset.f;
      f[key] = b.dataset.v;
      applyLinkage(key);
      syncSegments();
      refresh();
    });
  });
  document.getElementById('domain-sel').addEventListener('change', e => { f.domain = e.target.value; refresh(); });
  rankData = await getRank(f);
  refresh();
}

// 联动规则
function applyLinkage(changedKey) {
  if (changedKey === 'type') {
    if (f.type === 'blogger') f.metric = 'fans';
    else if (f.metric === 'fans') f.metric = 'like';
  }
  if (changedKey === 'metric' && f.metric === 'fans') f.type = 'blogger';
  filterStore.set(f);
}

function syncSegments() {
  document.querySelectorAll('.segment[data-f]').forEach(seg => {
    const key = seg.dataset.f;
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === f[key]));
  });
  document.getElementById('domain-sel').style.display = f.scope === 'domain' ? '' : 'none';
  document.getElementById('subtype').style.display = f.type === 'content' ? '' : 'none';
  document.getElementById('cond').textContent = serializeCondition(f);
}

function refresh() {
  const wrap = document.getElementById('rank-wrap');
  const rows = f.type === 'blogger' ? rankData.blogger : rankData.content;
  document.getElementById('count-hint').textContent = `共 ${rows.length} 条 · 示例`;
  if (!rows.length) {
    wrap.innerHTML = `<div class="state"><div class="ico">📭</div><div class="msg">该条件下暂无排名，试试更换时间范围或方向/领域</div></div>`;
    return;
  }
  wrap.innerHTML = f.type === 'blogger' ? bloggerTable(rows) : contentTable(rows);
  wireJump(wrap, rows);
}

function contentTable(rows) {
  return `<table class="rank-table">
    <thead><tr><th>#</th><th>内容</th><th>博主</th><th>类型</th><th>数据</th><th>发布</th><th></th></tr></thead>
    <tbody>${rows.map(r => `
      <tr data-id="${r.id}">
        <td class="rank-num top${r.rank}">${r.rank}</td>
        <td><div style="max-width:280px;font-weight:600">${esc(r.title)} <span class="badge mock">示例</span></div></td>
        <td>@${esc(r.author)}</td>
        <td>${r.type === 'image' ? `图文·${r.images}图` : '视频·' + Math.floor((r.duration||0)/60) + '分'}</td>
        <td><b>${fmtNum(r.value)}</b></td>
        <td class="small muted">${esc(r.publishedAt)}</td>
        <td><button class="btn sm primary" data-act="breakdown">拆解</button></td>
      </tr>`).join('')}</tbody></table>`;
}

function bloggerTable(rows) {
  return `<table class="rank-table">
    <thead><tr><th>#</th><th>博主</th><th>领域</th><th>粉丝</th><th>涨粉</th><th></th></tr></thead>
    <tbody>${rows.map(r => `
      <tr data-id="${r.id}">
        <td class="rank-num top${r.rank}">${r.rank}</td>
        <td><b>${esc(r.name)}</b> <span class="badge mock">示例</span></td>
        <td>${esc(r.domain)}</td>
        <td>${fmtNum(r.fans)}</td>
        <td><b class="up" style="color:var(--up)">+${fmtNum(r.value)}</b></td>
        <td class="row gap">
          <button class="btn sm primary" data-act="breakdown">拆解</button>
          <button class="btn sm" data-act="compare">加入对比</button>
        </td>
      </tr>`).join('')}</tbody></table>`;
}

function wireJump(scope, rows) {
  scope.querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    const r = rows.find(x => String(x.id) === id);
    tr.querySelector('[data-act="breakdown"]')?.addEventListener('click', () => {
      location.href = f.type === 'blogger' ? `index.html?id=${id}` : `index.html?target=content&id=${id}`;
    });
    tr.querySelector('[data-act="compare"]')?.addEventListener('click', e => {
      const ok = basket.add({ id, type: 'blogger', name: r.name, domain: r.domain, fans: r.fans });
      e.target.textContent = ok ? '✓ 已加入' : '已在篮中'; e.target.disabled = true;
    });
  });
}

init();
