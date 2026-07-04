// ============================================================
// render.js — 可复用模板函数（返回 HTML 字符串）
// ============================================================
import { fmtNum, esc } from './format.js';
import { basket } from './store.js';

// 内容卡（爆款视频 / 作品列表 / 榜单内容）
export function contentCard(c, { showActions = true, rank } = {}) {
  const inBasket = basket.has(c.id);
  return `
  <div class="content-card" data-id="${c.id}">
    ${rank ? `<div class="rank ${rank <= 3 ? 'top' : ''}" style="align-self:center">${rank}</div>` : ''}
    <div class="cover">${c.cover ? `<img src="${esc(c.cover)}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" onerror="this.replaceWith(document.createTextNode('🎬'))">` : '🎬'}</div>
    <div class="body">
      <p class="title">${esc(c.title)}</p>
      <div class="meta">@${esc(c.author)} · ${c.type === 'image' ? '图文' : '视频'} · ${esc(c.publishedAt || '')}</div>
      <div class="stats">
        <span>👁 <b>${fmtNum(c.view)}</b></span>
        <span>❤ <b>${fmtNum(c.like)}</b></span>
        <span>⭐ <b>${fmtNum(c.collect)}</b></span>
      </div>
      ${showActions ? `
      <div class="actions">
        <button class="btn sm" data-act="view">查看内容</button>
        <button class="btn sm primary" data-act="breakdown">拆解</button>
        <button class="btn sm" data-act="compare" ${inBasket ? 'disabled' : ''}>${inBasket ? '已在对比篮' : '加入对比'}</button>
      </div>` : ''}
    </div>
  </div>`;
}

// 博主行（博主库 / 榜单博主）
export function bloggerRow(b, rank, sub) {
  return `
  <div class="blogger-row" data-id="${b.id}">
    ${rank ? `<div class="rank ${rank <= 3 ? 'top' : ''}">${rank}</div>` : ''}
    <div class="avatar">${b.avatar ? `<img src="${esc(b.avatar)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.replaceWith(document.createTextNode('${esc((b.name||'?')[0])}'))">` : esc((b.name || '?')[0])}</div>
    <div class="info">
      <div class="name">${esc(b.name)}</div>
      <div class="sub">${esc(sub || `${b.domain} · 粉丝 ${fmtNum(b.fans)} · 近30天 ${fmtNum(b.recentView)} 浏览`)}</div>
    </div>
    <div class="row gap">
      <button class="btn sm primary" data-act="enter">进入主页</button>
      <button class="btn sm" data-act="compare" ${basket.has(b.id) ? 'disabled' : ''}>${basket.has(b.id) ? '已加入' : '加入对比'}</button>
    </div>
  </div>`;
}

// 指标卡
export function metricCard(label, value) {
  const na = value === null || value === undefined;
  return `<div class="metric"><div class="label">${esc(label)}</div><div class="value ${na ? 'na' : ''}">${na ? '暂无数据' : fmtNum(value)}</div></div>`;
}

// 极值内容小卡（最多/最少：数值 + 标题 + 封面 + 跳转）
export function extremeCard(kind, item) {
  if (!item) return `<div class="extreme"><span class="k ${kind}">${kind === 'max' ? '最多' : '最少'}</span><span class="muted small">暂无数据</span></div>`;
  return `
  <div class="extreme">
    <span class="k ${kind}">${kind === 'max' ? '最多' : '最少'}</span>
    <div class="thumb">${item.cover ? `<img src="${esc(item.cover)}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" onerror="this.replaceWith(document.createTextNode('🎬'))">` : '🎬'}</div>
    <div class="t" title="${esc(item.title)}"><span class="n">${fmtNum(item.value)}</span> · ${esc(item.title)}</div>
    <a class="jump" href="${esc(item.url || '#')}" target="_blank">查看↗</a>
  </div>`;
}

// 依据块
export function evidence(source, quote) {
  if (!quote) return '';
  return `<details class="evidence-toggle mt-2"><summary>查看依据</summary>
    <div class="evidence"><div class="src">依据来源 · ${esc(source)}</div><div class="quote">${esc(quote)}</div></div>
  </details>`;
}

// 变现标签
export function monetizeTag(t) {
  const spec = t.confidence === 'low' ? '<span class="badge speculative">推测</span>' : '';
  return `
  <div class="monetize-tag">
    <div class="ico">${t.icon || '💰'}</div>
    <div style="flex:1">
      <div class="row between"><span class="n">${esc(t.name)}</span>${spec}</div>
      <div class="d">${esc(t.detail || '')}</div>
    </div>
  </div>`;
}

// 空 / 失败 / 加载 状态
export function stateBox({ ico = '📭', msg = '暂无数据', btn } = {}) {
  return `<div class="state"><div class="ico">${ico}</div><div class="msg">${esc(msg)}</div>${btn ? `<button class="btn primary" id="${btn.id}">${esc(btn.label)}</button>` : ''}</div>`;
}

// 骨架屏
export function skeleton(lines = 4) {
  return `<div class="pad">${'<div class="skeleton sk-line"></div>'.repeat(lines)}<div class="skeleton sk-block"></div><div class="skeleton sk-block"></div></div>`;
}
