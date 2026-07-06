// ============================================================
// compare.js — 对比分析（分维度：博主 / 内容；同类任选 2 个 → 对比）
// 维度不可混评：博主只和博主比，内容只和内容比
// ============================================================
import { mountShell } from './shell.js';
import { fmtNum, fmtDuration, esc, getQuery } from './format.js';
import { basket, saved, onStoreChange } from './store.js';

let dim = 'content';   // 当前维度：content(内容) | blogger(博主)
let selected = [];     // 选中的 id（同维度，最多 2）

// ---- 博主画像（按领域给特征，让建议贴合） ----
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
function bloggerStat(item) {
  const fans = item.fans ?? 5000;
  return { fans, view: Math.round(fans * 0.7), like: Math.round(fans * 0.08), collect: Math.round(fans * 0.045) };
}
function videoStat(v) {
  return { view: v.view ?? 5000, like: v.like ?? 400, collect: v.collect ?? 150 };
}
function nameOf(it) { return it.type === 'content' ? (it.title || it.name) : it.name; }

const CONTENT = `
<div class="page-head">
  <h1>对比分析</h1>
  <p>从对比篮中选择同类型的两个对象，定位差异并输出问题总结与建议方案</p>
</div>
<div class="coming-banner">⚖️ 真实对比计算（取数 + 三维 diff）为后续版本；下方为<strong>&nbsp;示例结论&nbsp;</strong>，流程与信息结构完整可用</div>

<div class="card pad mb-4">
  <div class="row between mb-3" style="flex-wrap:wrap;gap:10px">
    <div class="card-title">① 选择分类 & 2 个同类对象 <span class="muted small" id="sel-hint"></span></div>
    <button class="btn primary sm" id="go-compare" disabled>确定，开始对比</button>
  </div>
  <div class="segment mb-3" id="dim-tabs">
    <button data-dim="content">🎬 内容对比</button>
    <button data-dim="blogger">👤 博主对比</button>
  </div>
  <div id="pick-list"></div>
</div>

<div id="result"></div>`;

function init() {
  mountShell(CONTENT);
  const q = getQuery();
  if (q.dim === 'blogger' || q.dim === 'content') dim = q.dim;
  syncDimTabs();
  document.getElementById('dim-tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (dim === b.dataset.dim) return;
    dim = b.dataset.dim; selected = [];
    syncDimTabs(); renderPickList();
    document.getElementById('result').innerHTML = '';
  });
  document.getElementById('go-compare').addEventListener('click', () => {
    if (selected.length === 2) renderResult();
  });
  renderPickList();
  onStoreChange(() => renderPickList());
}

function syncDimTabs() {
  document.querySelectorAll('#dim-tabs button').forEach(b => b.classList.toggle('active', b.dataset.dim === dim));
}

function listOfDim() { return basket.ofType(dim); }

function renderPickList() {
  const wrap = document.getElementById('pick-list');
  const list = listOfDim();
  selected = selected.filter(id => list.some(x => x.id === id));
  updateHint();

  if (!list.length) {
    const other = dim === 'content' ? '博主' : '内容';
    wrap.innerHTML = `<div class="state" style="padding:26px"><div class="ico">${dim === 'content' ? '🎬' : '👤'}</div>
      <div class="msg">对比篮里还没有${dim === 'content' ? '内容' : '博主'}。<br>
      去<a href="index.html" style="color:var(--brand-600)">爆款拆解</a>或<a href="discover.html" style="color:var(--brand-600)">挖掘热点</a>，在${dim === 'content' ? '内容' : '博主'}处点「加入对比」<br>
      <span class="small muted">（也可切到上方「${other}对比」）</span></div></div>`;
    document.getElementById('result').innerHTML = '';
    return;
  }
  wrap.innerHTML = `<div class="grid grid-2">${list.map(it => pickCard(it)).join('')}</div>`;
  wrap.querySelectorAll('.pick-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      toggleSelect(card.dataset.id);
    });
    card.querySelector('[data-act="select"]').addEventListener('click', e => {
      e.stopPropagation();
      toggleSelect(card.dataset.id);
    });
    card.querySelector('[data-act="del"]').addEventListener('click', e => {
      e.stopPropagation(); basket.remove(card.dataset.id); renderPickList();
    });
  });
}

function pickCard(it) {
  const on = selected.includes(it.id);
  const idx = selected.indexOf(it.id);
  const badge = on ? `<span class="pick-badge">${idx + 1}</span>` : '';
  const thumb = it.type === 'content'
    ? `<div class="pop-thumb" style="width:52px;height:40px;flex:0 0 52px">${it.cover ? `<img src="${esc(it.cover)}" onerror="this.replaceWith(document.createTextNode('🎬'))">` : '🎬'}</div>`
    : `<div class="avatar">${esc((it.name || '?')[0])}</div>`;
  const sub = it.type === 'content'
    ? `${it.author ? '@' + esc(it.author) + ' · ' : ''}${it.view != null ? fmtNum(it.view) + '播放' : '内容样本'}`
    : `${it.domain ? esc(it.domain) : '账号样本'}${it.fans != null ? ' · 粉丝 ' + fmtNum(it.fans) : ''}`;
  const typeLabel = it.type === 'content' ? '内容' : '博主';
  const selectText = on ? '已选中' : (selected.length >= 2 ? '最多 2 个' : '选择');
  return `
    <div class="pick-card ${on ? 'on' : ''}" data-id="${esc(it.id)}">
      ${badge}${thumb}
      <div style="flex:1;min-width:0">
        <div class="name" style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nameOf(it))}</div>
        <div class="type-line"><span class="type-chip">${typeLabel}</span><span class="muted small">${sub}</span></div>
      </div>
      <div class="pick-actions">
        <button class="btn sm ${on ? 'primary' : ''}" data-act="select">${selectText}</button>
        <button class="btn ghost sm" data-act="del" title="从对比篮移除">✕</button>
      </div>
    </div>`;
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
  if (hint) hint.textContent = `已选 ${selected.length}/2 · 只能选择当前分类`;
}
function flashHint(msg) {
  const hint = document.getElementById('sel-hint'); if (!hint) return;
  hint.textContent = msg; hint.style.color = 'var(--danger)';
  setTimeout(() => { hint.style.color = ''; updateHint(); }, 1400);
}

// ---- 结果分发 ----
function renderResult() {
  const chosen = selected.map(id => listOfDim().find(x => x.id === id)).filter(Boolean);
  if (chosen.length !== 2) return;
  if (dim === 'content') renderVideoResult(chosen);
  else renderBloggerResult(chosen);
  document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============ 博主对比 ============
function renderBloggerResult(chosen) {
  const [bm, weak] = [...chosen].sort((a, b) => (b.fans ?? 0) - (a.fans ?? 0));
  const prof = profileOf(bm.domain);
  const bs = bloggerStat(bm), ws = bloggerStat(weak);
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
  const dims = d => {
    if (d === 'data') return [
      diffRow('粉丝数', bm.name, weak.name, bs.fans, ws.fans),
      diffRow('浏览量/篇', bm.name, weak.name, bs.view, ws.view),
      diffRow('点赞量/篇', bm.name, weak.name, bs.like, ws.like),
      diffRow('收藏量/篇', bm.name, weak.name, bs.collect, ws.collect)].join('');
    if (d === 'content') return `${cmpText('定位', bm.name, weak.name, `${prof.critique}，标签清晰`, weak.domain ? `${weak.domain}，人设待强化` : '标签模糊')}
      ${cmpText('标题规律', bm.name, weak.name, `${prof.titleRule} 稳定套路`, '标题随意，缺乏结构')}
      ${cmpText('内容优势', bm.name, weak.name, prof.strength, '选题分散，记忆点弱')}`;
    return `${cmpText('变现方式', bm.name, weak.name, prof.monetize.join(' + '), '暂无明显变现动作')}
      ${cmpText('账号实体', bm.name, weak.name, '橱窗 / 认证 / 联系方式齐全', '均缺失')}`;
  };
  paintResult({ bmName: bm.name, weakName: weak.name, bmTag: '对标', weakTag: '待优化', problems, advices, dims, planName: `${bm.name} vs ${weak.name}` });
}

// ============ 内容对比 ============
function renderVideoResult(chosen) {
  const [bm, weak] = [...chosen].sort((a, b) => (b.view ?? 0) - (a.view ?? 0));
  const bs = videoStat(bm), ws = videoStat(weak);
  const pct = (s, t) => t ? (s / t * 100).toFixed(1) + '%' : '—';
  const rate = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';   // 互动率
  const durOf = v => v.vtype === 'image' ? `图文 · ${v.images ?? '?'}图` : `视频 · ${fmtDuration(v.duration)}`;

  const problems = [
    { id: 'p-view', tag: '播放差距', text: `${esc(nameOf(weak))} 播放量约为爆款样本的 ${pct(ws.view, bs.view)}，选题/封面吸引力偏弱`, basis: '依据：浏览量差异', adviceId: 'a-topic' },
    { id: 'p-like', tag: '互动偏低', text: `点赞率 ${rate(ws.like, ws.view)} vs 爆款 ${rate(bs.like, bs.view)}，内容共鸣或情绪钩子不足`, basis: '依据：点赞率差异', adviceId: 'a-title' },
    { id: 'p-collect', tag: '收藏偏低', text: `收藏率 ${rate(ws.collect, ws.view)} vs 爆款 ${rate(bs.collect, bs.view)}，实用价值/信息密度偏低`, basis: '依据：收藏率差异', adviceId: 'a-value' },
  ];
  const advices = [
    { id: 'a-title', icon: '✍️', title: '标题/封面建议', rel: '对应「互动偏低」', items: ['封面做前后对比或结果前置，前3秒留人', '标题套用「数字+痛点+结果」，制造确定性预期'] },
    { id: 'a-topic', icon: '🎯', title: '选题建议', rel: '对应「播放差距」', items: [`向爆款样本《${esc(truncate(nameOf(bm), 14))}》的选题方向靠拢`, '选大众化、高共鸣场景，扩大初始推荐转化'] },
    { id: 'a-value', icon: '📦', title: '内容价值建议', rel: '对应「收藏偏低」', items: ['补充清单/步骤/参数等"以后要用"的信息', '结尾引导收藏（"先码后用"）'] },
  ];
  const dims = d => {
    if (d === 'data') return [
      diffRow('浏览量', bm.name, weak.name, bs.view, ws.view),
      diffRow('点赞量', bm.name, weak.name, bs.like, ws.like),
      diffRow('收藏量', bm.name, weak.name, bs.collect, ws.collect)].join('');
    if (d === 'content') return `${cmpText('标题', bm.name, weak.name, truncate(nameOf(bm), 18), truncate(nameOf(weak), 18))}
      ${cmpText('形式/时长', bm.name, weak.name, durOf(bm), durOf(weak))}
      ${cmpText('点赞率', bm.name, weak.name, rate(bs.like, bs.view), rate(ws.like, ws.view))}
      ${cmpText('收藏率', bm.name, weak.name, rate(bs.collect, bs.view), rate(ws.collect, ws.view))}`;
    return `${cmpText('变现线索', bm.name, weak.name, '（内容维度暂不评估账号变现）', '—')}
      <div class="muted small mt-2">商业变现更适合在「博主对比」维度分析。</div>`;
  };
  paintResult({ bmName: nameOf(bm), weakName: nameOf(weak), bmTag: '爆款样本', weakTag: '待优化', problems, advices, dims, planName: `${nameOf(bm)} vs ${nameOf(weak)}` });
}

function truncate(s, n) { s = s || ''; return s.length > n ? s.slice(0, n) + '…' : s; }

// ---- 通用结果骨架（②③④ + 交互） ----
function paintResult({ bmName, weakName, bmTag, weakTag, problems, advices, dims, planName }) {
  document.getElementById('result').innerHTML = `
  <div class="card pad mb-4">
    <div class="card-title mb-3">② 多维度分析 · 差异高亮
      <span class="muted small">${esc(bmName)}（${bmTag}）&nbsp;vs&nbsp;${esc(weakName)}（${weakTag}）</span></div>
    <div class="segment mb-3" id="rdim-seg">
      <button data-d="data" class="active">数据分析</button>
      <button data-d="content">内容分析</button>
      <button data-d="money">商业变现</button>
    </div>
    <div id="rdim-body"></div>
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

  const seg = document.getElementById('rdim-seg');
  const paint = d => document.getElementById('rdim-body').innerHTML = dims(d);
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); paint(b.dataset.d); });
  paint('data');

  document.querySelectorAll('.problem-item[data-advice]').forEach(pi => pi.addEventListener('click', () => {
    const card = document.getElementById(pi.dataset.advice); if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.boxShadow = '0 0 0 3px var(--brand)'; card.style.borderColor = 'var(--brand)';
    setTimeout(() => { card.style.boxShadow = ''; card.style.borderColor = ''; }, 1400);
  }));
  document.getElementById('save-plan').addEventListener('click', e => {
    saved.add({ type: 'compare-plan', name: planName });
    e.target.textContent = '✓ 已保存';
  });
}

function diffRow(label, bmName, weakName, bv, sv) {
  const ratio = sv && bv ? ((sv / bv) * 100).toFixed(1) + '%' : '—';
  return `<div class="diff-row">
    <div class="side"><span class="muted small">${esc(bmName)}</span><span class="v up">${fmtNum(bv)}</span></div>
    <div class="lbl">${esc(label)}<div class="small">待优化为其 ${ratio}</div></div>
    <div class="side b"><span class="muted small">${esc(weakName)}</span><span class="v down">${fmtNum(sv)}</span></div>
  </div>`;
}
function cmpText(label, bmName, weakName, btext, stext) {
  return `<div class="diff-row" style="grid-template-columns:1fr 100px 1fr">
    <div class="side"><span class="muted small">${esc(bmName)}</span><span>${esc(btext)}</span></div>
    <div class="lbl">${esc(label)}</div>
    <div class="side b"><span class="muted small">${esc(weakName)}</span><span>${esc(stext)}</span></div>
  </div>`;
}

init();
