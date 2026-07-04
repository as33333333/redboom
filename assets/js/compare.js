// ============================================================
// compare.js — 对比分析（完整交互 · 示例数据）
// 选对标博主(对比篮) + 选个人账号(示例库/粘贴链接/已保存)
//   → 多维度差异(动态) → 问题总结(动态) → 建议方案(问题↔建议联动)
// ============================================================
import { mountShell } from './shell.js';
import { fmtNum, esc } from './format.js';
import { basket, saved, onStoreChange } from './store.js';

let picked = null;    // 对标博主
let mine = null;      // 个人账号

// 示例个人账号库（不同领域/不同水平，用于演示"选择个人账号"）
const SELF_LIB = [
  { id: 'me_home', name: '我的家居小号', domain: '家居家装', fans: 8600, view: 12000, like: 900, collect: 300, complete: true, monetize: [] },
  { id: 'me_food', name: '下厨房的日常', domain: '美食', fans: 45000, view: 82000, like: 6500, collect: 3200, complete: true, monetize: ['橱窗带货'] },
  { id: 'me_new', name: '刚起步的新号', domain: '', fans: 1200, view: 3000, like: 180, collect: 40, complete: false, monetize: [] },
];

// 对标博主的示例画像（按领域给特征，让建议贴合）
const DOMAIN_PROFILE = {
  '家居家装': { critique: '家居带货博主', titleRule: '「数字+痛点+结果」', strength: '成本清单透明、真实可复制', hotTopic: '「成本清单」类高收藏选题', monetize: ['引流微信', '橱窗带货', '商业合作'] },
  '美食':     { critique: '家常菜教程博主', titleRule: '「场景+食材+效果」', strength: '步骤清晰、出镜有食欲', hotTopic: '「3分钟快手菜」类强完播选题', monetize: ['橱窗带货', '商业合作'] },
  '美妆':     { critique: '妆容教程博主',   titleRule: '「场景+痛点+时长」', strength: '前后对比强、干货密度高', hotTopic: '「早八快手妆」类实用选题', monetize: ['橱窗带货', '商业合作', '品牌广告'] },
  '_default': { critique: '垂类内容博主',   titleRule: '「数字+利益点」',   strength: '选题聚焦、人设清晰',   hotTopic: '高收藏工具型选题',       monetize: ['橱窗带货', '商业合作'] },
};
function profileOf(domain) {
  const key = Object.keys(DOMAIN_PROFILE).find(k => k !== '_default' && (domain || '').includes(k));
  return DOMAIN_PROFILE[key] || DOMAIN_PROFILE._default;
}

// 领域归一化 + 稳健的"同领域"判断（容错隐藏字符；"家居家装" 与 "家居 / 好物分享" 视为同领域）
function normDomain(s) { return (s || '').replace(/[\s​-‏﻿]/g, ''); }
function mainDomain(s) { return normDomain(s).split(/[\/·、,，|]/)[0]; }
function sameDomain(a, b) {
  const na = normDomain(a), nb = normDomain(b);
  if (!na || !nb) return false;
  const ma = mainDomain(a), mb = mainDomain(b);
  return ma === mb || na.includes(mb) || nb.includes(ma);
}

const CONTENT = `
<div class="page-head">
  <h1>对比分析</h1>
  <p>对照优秀博主与个人账号，定位差异并输出问题总结与建议方案</p>
</div>
<div class="coming-banner">⚖️ 真实对比计算（个人账号取数 + 三维 diff）为后续版本；下方为<strong>&nbsp;示例结论&nbsp;</strong>，流程与信息结构完整可用</div>

<div class="card pad mb-4">
  <div class="card-title mb-3">① 选择分析对象</div>
  <div class="grid grid-2">
    <div>
      <div class="muted small mb-2">对标博主（来自对比篮）</div>
      <div id="blogger-pick"></div>
    </div>
    <div>
      <div class="muted small mb-2">个人账号（示例库 / 粘贴链接 / 已保存）</div>
      <div id="mine-pick"></div>
    </div>
  </div>
</div>

<div id="result"></div>`;

function init() {
  mountShell(CONTENT);
  renderBloggerPick();
  renderSelfPick();
  onStoreChange(() => renderBloggerPick());
}

// ---- 对标博主选择 ----
function renderBloggerPick() {
  const wrap = document.getElementById('blogger-pick');
  const items = basket.all().filter(x => x.type === 'blogger');
  if (!items.length) {
    wrap.innerHTML = `<div class="card pad"><div class="state" style="padding:20px"><div class="ico">🧺</div>
      <div class="msg small">对比篮为空。去<a href="index.html" style="color:var(--brand-600)">爆款拆解</a>或<a href="discover.html" style="color:var(--brand-600)">挖掘热点</a>「加入对比」</div></div></div>`;
    return;
  }
  wrap.innerHTML = `<div class="card">${items.map(b => `
    <div class="blogger-row ${picked && picked.id === b.id ? 'picked' : ''}" data-id="${b.id}" style="${picked && picked.id === b.id ? 'background:var(--brand-50)' : ''}">
      <div class="avatar">${esc((b.name || '?')[0])}</div>
      <div class="info"><div class="name">${esc(b.name)}</div><div class="sub">${esc(b.domain || '未知领域')}${b.fans ? ' · 粉丝 ' + fmtNum(b.fans) : ''}</div></div>
      <button class="btn sm ${picked && picked.id === b.id ? '' : 'primary'}" data-act="pick">${picked && picked.id === b.id ? '✓ 已选' : '选它对比'}</button>
    </div>`).join('')}</div>`;
  wrap.querySelectorAll('[data-act="pick"]').forEach(btn => btn.addEventListener('click', e => {
    picked = items.find(x => x.id === e.target.closest('[data-id]').dataset.id);
    renderBloggerPick(); tryRender();
  }));
}

// ---- 个人账号选择 ----
function renderSelfPick() {
  const wrap = document.getElementById('mine-pick');
  const savedAccts = saved.all().filter(x => x.type === 'account');
  wrap.innerHTML = `
    <div class="card pad">
      <select class="input mb-3" id="mine-sel" style="width:100%">
        <option value="">选择个人账号…</option>
        <optgroup label="示例账号">
          ${SELF_LIB.map(a => `<option value="${a.id}">${esc(a.name)}（${esc(a.domain || '未定位')} · 粉丝${fmtNum(a.fans)}）</option>`).join('')}
        </optgroup>
        ${savedAccts.length ? `<optgroup label="已保存">${savedAccts.map((a, i) => `<option value="saved:${i}">${esc(a.name)}</option>`).join('')}</optgroup>` : ''}
        <option value="__link">＋ 粘贴主页链接录入…</option>
      </select>
      <div id="link-box" style="display:none">
        <input class="input" id="mine-link" style="width:100%" placeholder="粘贴抖音个人主页链接，回车生成…（演示）" />
      </div>
      <div id="mine-card"></div>
    </div>`;
  const sel = wrap.querySelector('#mine-sel');
  sel.addEventListener('change', e => {
    const v = e.target.value;
    wrap.querySelector('#link-box').style.display = v === '__link' ? '' : 'none';
    if (v === '__link') { mine = null; wrap.querySelector('#mine-card').innerHTML = ''; return; }
    if (v.startsWith('saved:')) mine = { ...savedAccts[+v.split(':')[1]], complete: false };
    else mine = SELF_LIB.find(a => a.id === v) || null;
    paintSelfCard(); tryRender();
  });
  wrap.querySelector('#mine-link').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.value.trim()) return;
    const tail = e.target.value.trim().replace(/\/+$/, '').split('/').pop().slice(0, 12);
    mine = { id: 'link_' + tail, name: '账号@' + tail, domain: '', fans: null, view: null, like: null, collect: null, complete: false, monetize: [] };
    paintSelfCard(); tryRender();
  });
}

function paintSelfCard() {
  const box = document.getElementById('mine-card');
  if (!mine) { box.innerHTML = ''; return; }
  box.innerHTML = `
    <div class="row gap mt-3" style="padding-top:12px;border-top:1px solid var(--border)">
      <div class="avatar">${esc((mine.name || '我')[0])}</div>
      <div style="flex:1"><b>${esc(mine.name)}</b>
        <div class="muted small">${esc(mine.domain || '未定位')}${mine.fans != null ? ' · 粉丝 ' + fmtNum(mine.fans) : ''}</div>
      </div>
    </div>
    ${!mine.complete ? `<div class="coming-banner mt-3" style="margin:0">⚠️ 该账号数据不完整，建议补充/授权后可得到更准确的对比（当前用示例值兜底）</div>` : ''}`;
}

// ---- 触发结果渲染 ----
function tryRender() {
  const result = document.getElementById('result');
  if (!picked || !mine) {
    result.innerHTML = `<div class="card pad"><div class="state" style="padding:28px"><div class="ico">👈</div>
      <div class="msg">请在上方分别选择<b>对标博主</b>与<b>个人账号</b>，即可生成对比</div></div></div>`;
    return;
  }
  renderResult();
}

// 对标博主示例数值（基于粉丝规模，缺失给默认）
function bloggerStat() {
  const fans = picked.fans || 486000;
  return { fans, view: Math.round(fans * 0.7), like: Math.round(fans * 0.08), collect: Math.round(fans * 0.045) };
}
// 个人账号数值（不完整时给兜底示例）
function selfStat() {
  return {
    fans: mine.fans ?? 1500, view: mine.view ?? 3500, like: mine.like ?? 220, collect: mine.collect ?? 60,
  };
}

function renderResult() {
  const b = picked, prof = profileOf(b.domain);
  const bs = bloggerStat(), ss = selfStat();
  const pct = (s, t) => t ? Math.max(0.1, (s / t) * 100) : 0;

  // 动态问题
  const viewPct = pct(ss.view, bs.view).toFixed(1);
  const fansGap = (bs.fans / Math.max(1, ss.fans)).toFixed(0);
  const domMatch = mine.domain && sameDomain(mine.domain, b.domain);
  const problems = [
    { id: 'p-data', tag: '数据弱', text: `浏览量约为对标账号的 ${viewPct}%，粉丝规模差约 ${fansGap} 倍`, basis: '依据：数据差异', adviceId: 'a-content' },
    { id: 'p-pos', tag: domMatch ? '定位需强化' : '定位不清', text: mine.domain ? `你的领域「${esc(mine.domain)}」与对标「${esc(b.domain || '未知')}」${domMatch ? '同赛道，但缺稳定人设标签' : '不一致，需明确主赛道'}` : '账号尚无明确领域标签，人设模糊', basis: '依据：内容标签差异', adviceId: 'a-pos' },
    { id: 'p-money', tag: '商业信号缺失', text: (mine.monetize && mine.monetize.length) ? `已有 ${mine.monetize.join('、')}，但变现方式偏单一` : '无橱窗、无联系方式，变现路径尚未铺设', basis: '依据：商业信号缺失', adviceId: 'a-money' },
  ];

  // 动态建议（与问题一一对应）
  const advices = [
    { id: 'a-pos', icon: '🎯', title: '定位建议', rel: '对应「' + problems[1].tag + '」', items: [`锁定「${b.domain || '目标领域'}」单一主赛道，做成「${prof.critique}」`, '固定开场自我介绍，强化人设记忆点'] },
    { id: 'a-content', icon: '📝', title: '内容建议', rel: '对应「数据弱」', items: [`标题套用${prof.titleRule}结构`, `优先做${prof.hotTopic}`, `突出${prof.strength}`] },
    { id: 'a-money', icon: '💰', title: '商业建议', rel: '对应「商业信号缺失」', items: ['开通橱窗，上架平价同款', '简介留可信联系方式（合规）', `参考对标铺设：${prof.monetize.join(' / ')}`] },
  ];

  document.getElementById('result').innerHTML = `
  <div class="card pad mb-4">
    <div class="card-title mb-3">② 多维度分析 · 差异高亮 <span class="muted small">${esc(b.name)} vs ${esc(mine.name)}</span></div>
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
        <div style="flex:1"><b>${esc(p.tag)}</b> — ${esc(p.text)}<div class="muted small mt-2">${esc(p.basis)} · 👉 点击查看建议</div></div>
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

  // 维度切换
  const seg = document.getElementById('dim-seg');
  const paint = d => document.getElementById('dim-body').innerHTML = dimView(d, b, bs, ss, prof);
  seg.addEventListener('click', e => { const btn = e.target.closest('button'); if (!btn) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === btn)); paint(btn.dataset.d); });
  paint('data');

  // 问题 → 建议 联动高亮
  document.querySelectorAll('.problem-item[data-advice]').forEach(pi => pi.addEventListener('click', () => {
    const card = document.getElementById(pi.dataset.advice);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.boxShadow = '0 0 0 3px var(--brand)'; card.style.borderColor = 'var(--brand)';
    setTimeout(() => { card.style.boxShadow = ''; card.style.borderColor = ''; }, 1400);
  }));

  document.getElementById('save-plan').addEventListener('click', e => {
    saved.add({ type: 'compare-plan', name: `${b.name} vs ${mine.name}` });
    e.target.textContent = '✓ 已保存';
  });
}

function dimView(d, b, bs, ss, prof) {
  if (d === 'data') {
    return [
      diffRow('粉丝数', bs.fans, ss.fans),
      diffRow('浏览量/篇', bs.view, ss.view),
      diffRow('点赞量/篇', bs.like, ss.like),
      diffRow('收藏量/篇', bs.collect, ss.collect),
    ].join('');
  }
  if (d === 'content') {
    return `${cmpText('定位', `${b.name}：${prof.critique}，标签清晰`, mine.domain ? `${mine.name}：${mine.domain}，人设待强化` : `${mine.name}：标签模糊`)}
      ${cmpText('标题规律', `${prof.titleRule} 稳定套路`, '标题随意，缺乏结构')}
      ${cmpText('内容优势', prof.strength, '选题分散，记忆点弱')}
      ${cmpText('内容弱势', '偶有主观测评', '数据样本少，规律未成型')}`;
  }
  return `${cmpText('变现方式', prof.monetize.join(' + '), (mine.monetize && mine.monetize.length) ? mine.monetize.join(' + ') : '暂无明显变现动作')}
    ${cmpText('账号实体', '橱窗 / 认证 / 联系方式齐全', (mine.monetize && mine.monetize.length) ? '部分具备' : '均缺失')}
    ${cmpText('商业合作', `${b.domain || '相关'}品牌露出`, '无')}`;
}

function diffRow(label, bv, sv) {
  const ratio = sv && bv ? ((sv / bv) * 100).toFixed(1) + '%' : '—';
  return `<div class="diff-row">
    <div class="side"><span class="muted small">${esc(picked.name)}</span><span class="v up">${fmtNum(bv)}</span></div>
    <div class="lbl">${esc(label)}<div class="small">我方为其 ${ratio}</div></div>
    <div class="side b"><span class="muted small">${esc(mine.name)}</span><span class="v down">${fmtNum(sv)}</span></div>
  </div>`;
}
function cmpText(label, btext, stext) {
  return `<div class="diff-row" style="grid-template-columns:1fr 100px 1fr">
    <div class="side"><span class="muted small">${esc(picked.name)}</span><span>${esc(btext)}</span></div>
    <div class="lbl">${esc(label)}</div>
    <div class="side b"><span class="muted small">${esc(mine.name)}</span><span>${esc(stext)}</span></div>
  </div>`;
}

init();
