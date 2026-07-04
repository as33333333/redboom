// ============================================================
// compare.js — 对比分析（从对比篮任选 2 个 → 确定 → 对比）
// 选择：对比篮内任意两个（最多 2）；较高粉丝作对标，较低作待优化
// 输出：多维度差异 → 问题总结 → 建议方案（问题↔建议联动）
// ============================================================
import { mountShell } from './shell.js';
import { fmtNum, esc } from './format.js';
import { basket, saved, onStoreChange } from './store.js';

let selected = [];   // 选中的 2 个 id

// 对标画像（按领域给特征，让建议贴合）
const DOMAIN_PROFILE = {
  '家居': { critique: '家居带货博主', titleRule: '「数字+痛点+结果」', strength: '成本清单透明、真实可复制', hotTopic: '「成本清单」类高收藏选题', monetize: ['引流微信', '橱窗带货', '商业合作'] },
  '美食': { critique: '家常菜教程博主', titleRule: '「场景+食材+效果」', strength: '步骤清晰、出镜有食欲', hotTopic: '「3分钟快手菜」类强完播选题', monetize: ['橱窗带货', '商业合作'] },
  '美妆': { critique: '妆容教程博主', titleRule: '「场景+痛点+时长」', strength: '前后对比强、干货密度高', hotTopic: '「早八快手妆」类实用选题', monetize: ['橱窗带货', '商业合作', '品牌广告'] },
  '_default': { critique: '垂类内容博主', titleRule: '「数字+利益点」', strength: '选题聚焦、人设清晰', hotTopic: '高收藏工具型选题', monetize: ['橱窗带货', '商业合作'] },
};
function profileOf(domain) {
  const key = Object.keys(DOMAIN_PROFILE).find(k => k !== '_default' && (domain || '').includes(k));
  return DOMAIN_PROFILE[key] || DOMAIN_PROFILE._default;
}
function normDomain(s) { return (s || '').replace(/[\s​-‏﻿]/g, ''); }
function mainDomain(s) { return normDomain(s).split(/[\/·、,，|]/)[0]; }
function sameDomain(a, b) {
  const na = normDomain(a), nb = normDomain(b);
  if (!na || !nb) return false;
  const ma = mainDomain(a), mb = mainDomain(b);
  return ma === mb || na.includes(mb) || nb.includes(ma);
}
// 由粉丝规模合成示例数值
function statOf(item) {
  const fans = item.fans ?? 5000;
  return { fans, view: Math.round(fans * 0.7), like: Math.round(fans * 0.08), collect: Math.round(fans * 0.045) };
}

const CONTENT = `
<div class="page-head">
  <h1>对比分析</h1>
  <p>从对比篮中任选两个对象，定位差异并输出问题总结与建议方案</p>
</div>
<div class="coming-banner">⚖️ 真实对比计算（取数 + 三维 diff）为后续版本；下方为<strong>&nbsp;示例结论&nbsp;</strong>，流程与信息结构完整可用</div>

<div class="card pad mb-4">
  <div class="row between mb-3">
    <div class="card-title">① 从对比篮选择 2 个对象 <span class="muted small" id="sel-hint"></span></div>
    <button class="btn primary sm" id="go-compare" disabled>确定，开始对比</button>
  </div>
  <div id="pick-list"></div>
</div>

<div id="result"></div>`;

function init() {
  mountShell(CONTENT);
  renderPickList();
  onStoreChange(() => renderPickList());
  document.getElementById('go-compare').addEventListener('click', () => {
    if (selected.length === 2) renderResult();
  });
}

function items() { return basket.all(); }

function renderPickList() {
  const wrap = document.getElementById('pick-list');
  const list = items();
  // 清理已被移除的选中项
  selected = selected.filter(id => list.some(x => x.id === id));
  updateHint();

  if (!list.length) {
    wrap.innerHTML = `<div class="state" style="padding:28px"><div class="ico">🧺</div>
      <div class="msg">对比篮是空的。去<a href="index.html" style="color:var(--brand-600)">爆款拆解</a>或<a href="discover.html" style="color:var(--brand-600)">挖掘热点</a>点「加入对比」，回来这里任选两个对比</div></div>`;
    document.getElementById('result').innerHTML = '';
    return;
  }
  wrap.innerHTML = `<div class="grid grid-2">${list.map(it => {
    const on = selected.includes(it.id);
    const idx = selected.indexOf(it.id);
    return `
    <div class="pick-card ${on ? 'on' : ''}" data-id="${esc(it.id)}">
      ${on ? `<span class="pick-badge">${idx + 1}</span>` : ''}
      <div class="avatar">${esc((it.name || '?')[0])}</div>
      <div style="flex:1;min-width:0">
        <div class="name" style="font-weight:600">${esc(it.name)}</div>
        <div class="muted small">${it.type === 'content' ? '内容' : '博主'}${it.domain ? ' · ' + esc(it.domain) : ''}${it.fans != null ? ' · 粉丝 ' + fmtNum(it.fans) : ''}</div>
      </div>
      <button class="btn ghost sm" data-act="del" title="从对比篮移除">✕</button>
    </div>`;
  }).join('')}</div>`;

  wrap.querySelectorAll('.pick-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-act="del"]')) return;
      toggleSelect(card.dataset.id);
    });
    card.querySelector('[data-act="del"]').addEventListener('click', e => {
      e.stopPropagation();
      basket.remove(card.dataset.id);
      renderPickList();
    });
  });
}

function toggleSelect(id) {
  const i = selected.indexOf(id);
  if (i >= 0) selected.splice(i, 1);
  else {
    if (selected.length >= 2) { flashHint('最多选择 2 个，请先取消一个'); return; }
    selected.push(id);
  }
  renderPickList();
}

function updateHint() {
  const go = document.getElementById('go-compare');
  const hint = document.getElementById('sel-hint');
  if (go) go.disabled = selected.length !== 2;
  if (hint) hint.textContent = `已选 ${selected.length}/2`;
}
function flashHint(msg) {
  const hint = document.getElementById('sel-hint');
  if (!hint) return;
  const old = hint.textContent; hint.textContent = msg; hint.style.color = 'var(--danger)';
  setTimeout(() => { hint.style.color = ''; updateHint(); }, 1400);
}

// ---- 对比结果 ----
function renderResult() {
  const chosen = selected.map(id => items().find(x => x.id === id)).filter(Boolean);
  if (chosen.length !== 2) return;
  // 粉丝高者为对标(标杆)，低者为待优化
  const [bm, weak] = [...chosen].sort((a, b) => (b.fans ?? 0) - (a.fans ?? 0));
  const prof = profileOf(bm.domain);
  const bs = statOf(bm), ws = statOf(weak);
  const pct = (s, t) => t ? Math.max(0.1, (s / t) * 100) : 0;

  const viewPct = pct(ws.view, bs.view).toFixed(1);
  const fansGap = (bs.fans / Math.max(1, ws.fans)).toFixed(0);
  const domMatch = weak.domain && sameDomain(weak.domain, bm.domain);
  const problems = [
    { id: 'p-data', tag: '数据差距', text: `${esc(weak.name)} 浏览量约为 ${esc(bm.name)} 的 ${viewPct}%，粉丝差约 ${fansGap} 倍`, basis: '依据：数据差异', adviceId: 'a-content' },
    { id: 'p-pos', tag: domMatch ? '定位需强化' : '定位不清', text: weak.domain ? `领域「${esc(weak.domain)}」与对标「${esc(bm.domain || '未知')}」${domMatch ? '同赛道，但缺稳定人设标签' : '不一致，需明确主赛道'}` : `${esc(weak.name)} 尚无明确领域标签，人设模糊`, basis: '依据：内容标签差异', adviceId: 'a-pos' },
    { id: 'p-money', tag: '商业信号缺失', text: `相比 ${esc(bm.name)}，${esc(weak.name)} 变现路径尚未铺设（无橱窗/联系方式）`, basis: '依据：商业信号缺失', adviceId: 'a-money' },
  ];
  const advices = [
    { id: 'a-pos', icon: '🎯', title: '定位建议', rel: '对应「' + problems[1].tag + '」', items: [`锁定「${bm.domain || '目标领域'}」单一主赛道，做成「${prof.critique}」`, '固定开场自我介绍，强化人设记忆点'] },
    { id: 'a-content', icon: '📝', title: '内容建议', rel: '对应「数据差距」', items: [`标题套用${prof.titleRule}结构`, `优先做${prof.hotTopic}`, `突出${prof.strength}`] },
    { id: 'a-money', icon: '💰', title: '商业建议', rel: '对应「商业信号缺失」', items: ['开通橱窗，上架平价同款', '简介留可信联系方式（合规）', `参考对标铺设：${prof.monetize.join(' / ')}`] },
  ];

  document.getElementById('result').innerHTML = `
  <div class="card pad mb-4">
    <div class="card-title mb-3">② 多维度分析 · 差异高亮
      <span class="muted small">${esc(bm.name)}（对标）&nbsp;vs&nbsp;${esc(weak.name)}（待优化）</span></div>
    <div class="segment mb-3" id="dim-seg">
      <button data-d="data" class="active">数据分析</button>
      <button data-d="content">内容分析</button>
      <button data-d="money">商业变现</button>
    </div>
    <div id="dim-body"></div>
  </div>

  <div class="card pad mb-4">
    <div class="card-title mb-3">③ 问题总结 <span class="muted small">（点击问题可定位对应建议）</span></div>
    ${problems.map(p => `
      <div class="problem-item" data-advice="${p.adviceId}" style="cursor:pointer">
        <div class="dot"></div>
        <div style="flex:1"><b>${esc(p.tag)}</b> — ${p.text}<div class="muted small mt-2">${esc(p.basis)} · 👉 点击查看建议</div></div>
      </div>`).join('')}
  </div>

  <div class="card pad mb-4">
    <div class="row between mb-3"><div class="card-title">④ 建议方案 <span class="muted small">（与问题一一对应）</span></div>
      <button class="btn primary sm" id="save-plan">保存方案</button></div>
    <div class="grid grid-3">
      ${advices.map(a => `
        <div class="card pad" id="${a.id}" style="transition:box-shadow .3s,border-color .3s">
          <div class="card-title mb-2">${a.icon} ${a.title}</div>
          <div class="badge info mb-3">${esc(a.rel)}</div>
          <ul style="margin:0;padding-left:18px;color:var(--text-2);font-size:13px;line-height:1.9">
            ${a.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        </div>`).join('')}
    </div>
  </div>`;

  const seg = document.getElementById('dim-seg');
  const paint = d => document.getElementById('dim-body').innerHTML = dimView(d, bm, weak, bs, ws, prof);
  seg.addEventListener('click', e => { const btn = e.target.closest('button'); if (!btn) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === btn)); paint(btn.dataset.d); });
  paint('data');

  document.querySelectorAll('.problem-item[data-advice]').forEach(pi => pi.addEventListener('click', () => {
    const card = document.getElementById(pi.dataset.advice); if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.boxShadow = '0 0 0 3px var(--brand)'; card.style.borderColor = 'var(--brand)';
    setTimeout(() => { card.style.boxShadow = ''; card.style.borderColor = ''; }, 1400);
  }));

  document.getElementById('save-plan').addEventListener('click', e => {
    saved.add({ type: 'compare-plan', name: `${bm.name} vs ${weak.name}` });
    e.target.textContent = '✓ 已保存';
  });
  document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function dimView(d, bm, weak, bs, ws, prof) {
  if (d === 'data') {
    return [
      diffRow('粉丝数', bm, weak, bs.fans, ws.fans),
      diffRow('浏览量/篇', bm, weak, bs.view, ws.view),
      diffRow('点赞量/篇', bm, weak, bs.like, ws.like),
      diffRow('收藏量/篇', bm, weak, bs.collect, ws.collect),
    ].join('');
  }
  if (d === 'content') {
    return `${cmpText('定位', bm, weak, `${prof.critique}，标签清晰`, weak.domain ? `${weak.domain}，人设待强化` : '标签模糊')}
      ${cmpText('标题规律', bm, weak, `${prof.titleRule} 稳定套路`, '标题随意，缺乏结构')}
      ${cmpText('内容优势', bm, weak, prof.strength, '选题分散，记忆点弱')}
      ${cmpText('内容弱势', bm, weak, '偶有主观测评', '数据样本少，规律未成型')}`;
  }
  return `${cmpText('变现方式', bm, weak, prof.monetize.join(' + '), '暂无明显变现动作')}
    ${cmpText('账号实体', bm, weak, '橱窗 / 认证 / 联系方式齐全', '均缺失')}
    ${cmpText('商业合作', bm, weak, `${bm.domain || '相关'}品牌露出`, '无')}`;
}

function diffRow(label, bm, weak, bv, sv) {
  const ratio = sv && bv ? ((sv / bv) * 100).toFixed(1) + '%' : '—';
  return `<div class="diff-row">
    <div class="side"><span class="muted small">${esc(bm.name)}</span><span class="v up">${fmtNum(bv)}</span></div>
    <div class="lbl">${esc(label)}<div class="small">待优化为其 ${ratio}</div></div>
    <div class="side b"><span class="muted small">${esc(weak.name)}</span><span class="v down">${fmtNum(sv)}</span></div>
  </div>`;
}
function cmpText(label, bm, weak, btext, stext) {
  return `<div class="diff-row" style="grid-template-columns:1fr 100px 1fr">
    <div class="side"><span class="muted small">${esc(bm.name)}</span><span>${esc(btext)}</span></div>
    <div class="lbl">${esc(label)}</div>
    <div class="side b"><span class="muted small">${esc(weak.name)}</span><span>${esc(stext)}</span></div>
  </div>`;
}

init();
