// ============================================================
// analyzer.js — 右侧分析器：三 Tab（数据/内容/商业）+ 状态机
// state: idle | loading | success | failed
// ============================================================
import { metricCard, extremeCard, evidence, stateBox, skeleton } from './render.js';
import { fmtNum, esc } from './format.js';
import { saved, basket } from './store.js';

let current = { target: null, data: null, tab: 'data' };

export function renderAnalyzer(mountEl) {
  mountEl.innerHTML = `
    <div class="card analyzer" style="height:100%">
      <div class="analyzer-head" id="az-head">
        <div class="avatar">🎯</div>
        <div style="flex:1">
          <div class="obj-type">当前分析对象</div>
          <div class="obj-name">未选择</div>
        </div>
      </div>
      <div class="tabs" id="az-tabs">
        <button data-tab="data" class="active">数据分析</button>
        <button data-tab="content">内容分析</button>
        <button data-tab="money">商业变现</button>
      </div>
      <div class="analyzer-body" id="az-body">
        ${stateBox({ ico: '🎯', msg: '从左侧选择一个博主或作品开始拆解' })}
      </div>
      <div class="analyzer-foot" id="az-foot" style="display:none">
        <button class="btn block" id="az-save">保存分析结果</button>
        <button class="btn block primary" id="az-compare">加入对比</button>
      </div>
    </div>`;

  mountEl.querySelector('#az-tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    current.tab = b.dataset.tab;
    mountEl.querySelectorAll('#az-tabs button').forEach(x => x.classList.toggle('active', x === b));
    paintBody();
  });
  mountEl.querySelector('#az-save').addEventListener('click', () => {
    if (!current.data) return;
    saved.add({ type: 'analysis', targetType: current.target.type, name: current.target.name });
    const btn = mountEl.querySelector('#az-save'); btn.textContent = '✓ 已保存'; setTimeout(() => btn.textContent = '保存分析结果', 1500);
  });
  mountEl.querySelector('#az-compare').addEventListener('click', () => {
    if (!current.target) return;
    const ok = basket.add({ ...current.target });
    const btn = mountEl.querySelector('#az-compare'); btn.textContent = ok ? '✓ 已加入对比篮' : '已在对比篮中';
    setTimeout(() => btn.textContent = '加入对比', 1500);
  });

  return { setLoading, setSuccess, setFailed, promptSwitch };
}

function head() { return document.getElementById('az-head'); }
function body() { return document.getElementById('az-body'); }

// 顶部对象信息
function paintHead() {
  const t = current.target;
  head().innerHTML = `
    <div class="avatar">${t.type === 'content' ? '🎬' : (t.name || '?')[0]}</div>
    <div style="flex:1">
      <div class="obj-type">当前分析对象 · ${t.type === 'content' ? '单个内容' : '博主'}</div>
      <div class="obj-name">${esc(t.name)}</div>
    </div>
    <span class="badge brand">${esc(t.domain || '抖音')}</span>`;
}

export function setLoading(target) {
  current.target = target; current.data = null;
  paintHead();
  document.getElementById('az-foot').style.display = 'none';
  body().innerHTML = `<div class="mb-3 muted small">正在拉取数据并生成分析…</div>${skeleton(3)}`;
}

export function setSuccess(target, data) {
  current.target = target; current.data = data;
  paintHead();
  document.getElementById('az-foot').style.display = 'flex';
  paintBody();
}

export function setFailed(target, msg) {
  current.target = target; current.data = null;
  paintHead();
  document.getElementById('az-foot').style.display = 'none';
  body().innerHTML = stateBox({ ico: '⚠️', msg: msg || '分析失败，请重试', btn: { id: 'az-retry', label: '重试' } });
}

// 单内容拆解引导
export function promptSwitch(onConfirm) {
  const bar = document.createElement('div');
  bar.className = 'coming-banner';
  bar.style.cssText = 'background:#eef6ff;border-color:#bcdcff;color:#1a56a8';
  bar.innerHTML = `<span>🎬 检测到你点开了单个内容，是否拆解当前内容？</span>
    <span style="flex:1"></span>
    <button class="btn sm primary" id="sw-yes">拆解该内容</button>
    <button class="btn sm" id="sw-no">保持博主维度</button>`;
  body().prepend(bar);
  bar.querySelector('#sw-yes').addEventListener('click', () => { bar.remove(); onConfirm(); });
  bar.querySelector('#sw-no').addEventListener('click', () => bar.remove());
}

// 根据当前 tab 渲染主体
function paintBody() {
  if (!current.data) return;
  const d = current.data;
  if (current.tab === 'data') body().innerHTML = viewData(d);
  else if (current.tab === 'content') body().innerHTML = viewContent(d);
  else body().innerHTML = viewMoney(d);
}

// ---- 数据分析 ----
function viewData(d) {
  const isBlogger = d.targetType === 'blogger';
  const m = d.data;
  if (!isBlogger) {
    // 视频维度：两列并排展示数据块
    return `
      <div class="grid grid-2 mb-4">
        ${metricCard('粉丝数', m.fans)}
        ${metricCard('浏览量', m.view?.value ?? m.view?.avg)}
        ${metricCard('点赞量', m.like?.value ?? m.like?.avg)}
        ${metricCard('收藏量', m.collect?.value ?? m.collect?.avg)}
      </div>
      <p class="small muted">数值已按 万/千 格式化，原始值保留用于排序计算；缺失项显示「暂无数据」。</p>`;
  }
  // 博主维度：每个指标一块，平均/最高 两列并排，最多/最少极值卡
  const metricBlock = (label, obj) => `
    <div class="block">
      <h4>${label}/篇</h4>
      <div class="grid grid-2 mb-3">
        ${metricCard('平均', obj.avg)}
        ${metricCard('最高', obj.max?.value)}
      </div>
      ${extremeCard('max', obj.max)}
      <div class="mt-2">${extremeCard('min', obj.min)}</div>
    </div>`;
  return `
    <div class="grid grid-2 mb-4">
      ${metricCard('粉丝数', m.fans)}
      ${metricCard('作品数', d.object?.contentCount ?? (m.view?.count))}
    </div>
    ${metricBlock('内容浏览量', m.view)}
    ${metricBlock('点赞量', m.like)}
    ${metricBlock('收藏量', m.collect)}
    <p class="small muted">「平均 / 最高」并排概览，下方「最多 / 最少」附标题·封面·跳转，便于对照具体内容。缺失项显示「暂无数据」。</p>`;
}

// ---- 内容分析 ----
function viewContent(d) {
  const c = d.content;
  return `
    <div class="block">
      <h4>🎯 定位分析</h4>
      <div>${(c.positioning.tags || []).map(t => `<span class="tag" style="margin:0 6px 6px 0">${esc(t)}</span>`).join('')}</div>
      <p class="critique mt-2">「${esc(c.positioning.critiqueBlogger)}」· 内容：${esc(c.positioning.critiqueContent)}</p>
    </div>
    <div class="block"><h4>📤 发布类型</h4><p>${esc(c.publishType)}</p></div>
    <div class="block">
      <h4>✍️ 标题规律</h4>
      <p>${esc(c.titlePattern.summary)}</p>
      <p class="muted small mt-2">满足心理：${esc(c.titlePattern.psychology)}</p>
      ${evidence('标题原文', c.titlePattern.sample)}
    </div>
    <div class="block">
      <h4>🧭 内容规律</h4>
      <p><b>主题：</b>${esc(c.contentRule.theme)}</p>
      <p class="mt-2"><b>关键词：</b>${(c.contentRule.keywords || []).map(k => `<span class="tag plain" style="margin:0 4px 4px 0">${esc(k)}</span>`).join('')}</p>
      <p class="mt-2"><b>目标用户：</b>${esc(c.contentRule.targetUser)}</p>
      <p class="mt-2"><b>核心需求：</b>${esc(c.contentRule.coreNeed)}</p>
      <p class="muted small mt-2">${esc(c.contentRule.extra || '')}</p>
    </div>
    <div class="block"><h4>💪 内容优势</h4><p>${esc(c.advantage.text)}</p>${evidence('引用原文', c.advantage.quote)}</div>
    ${attractionBlock(c.attraction)}
    <div class="block"><h4>⚠️ 内容弱势</h4><p>${esc(c.weakness.text)}</p><p class="muted small mt-2">${esc(c.weakness.commentHint)}</p>
      <div class="coming-banner mt-2">💬 高频评论建议将在评论采集（MediaCrawler）接入后生效</div>
    </div>
    <div class="block">
      <h4>📈 赛道趋势 ${c.trend.placeholder ? '<span class="badge mock">示例</span>' : ''}</h4>
      <p>${esc(c.trend.note)}</p>
      <div id="trend-chart" style="height:140px;margin-top:8px"></div>
    </div>`;
}

// 吸引力剖析（为什么吸引 / 吸引点 / 为什么高赞高收藏高浏览 / 好在哪）
function attractionBlock(a) {
  if (!a) return '';
  const chip = (label, val) => val ? `<div class="metric" style="padding:12px"><div class="label">${label}</div><div style="font-weight:600;font-size:14px;margin-top:4px">${esc(val)}</div></div>` : '';
  const reasons = (a.metricReasons || []).map(r => `
    <div class="evidence mt-2"><div class="src">${esc(r.metric)} 为什么高</div><div class="quote">${esc(r.why)}</div></div>`).join('');
  return `
    <div class="block" style="background:var(--brand-50);border:1px solid var(--brand-100);border-radius:var(--r-md);padding:14px">
      <h4>✨ 吸引力剖析</h4>
      <p><b>为什么吸引：</b>${esc(a.whyAttract)}</p>
      <div class="grid grid-2 mt-3 mb-2">
        ${chip('核心吸引点', a.hook)}
        ${chip('好在哪（载体）', a.strengthCarrier)}
      </div>
      <p class="mt-2"><b>亮点拆解：</b>${esc(a.strengthDetail)}</p>
      ${a.strengthQuote ? evidence('亮点引用', a.strengthQuote) : ''}
      ${reasons ? `<div class="mt-3"><b class="small">高赞 / 高收藏 / 高浏览 归因</b>${reasons}</div>` : ''}
    </div>`;
}

// ---- 商业变现（结论优先：先给变现方式标签，依据作为引用证据附在结论最后） ----
function viewMoney(d) {
  const mo = d.monetize;
  // 依据按信号归组，供每个结论标签引用
  const evByTag = {};
  (mo.evidence || []).forEach(e => { (evByTag[e.signal] ||= []).push(e); });
  const tagCard = (t) => {
    const spec = t.confidence === 'low' ? '<span class="badge speculative">推测</span>' : '<span class="badge ok">依据充分</span>';
    const evs = (evByTag[t.name] || []).map(e =>
      `<div class="evidence mt-2"><div class="src">引用证据 · ${esc(e.source)}</div><div class="quote">${esc(e.quote)}</div></div>`).join('');
    return `
      <div class="card pad mb-3">
        <div class="row between mb-2">
          <div class="row gap"><span style="font-size:20px">${t.icon || '💰'}</span><b style="font-size:16px">${esc(t.name)}</b></div>
          ${spec}
        </div>
        <p class="muted small">${esc(t.detail || '')}</p>
        ${evs ? `<details class="evidence-toggle mt-2"><summary>查看推测依据（${(evByTag[t.name] || []).length}）</summary>${evs}</details>` : '<p class="small muted mt-2">依据不足，结论为推测</p>'}
      </div>`;
  };
  return `
    <div class="block">
      <h4>🏷️ 变现方式推测结论</h4>
      <p class="muted small mb-3">直接给出变现方式标签；点击每个结论可展开其推测依据（引用证据）。</p>
      ${mo.tags.map(tagCard).join('')}
      <div class="coming-banner mt-2">⚠️ 部分为推测；橱窗销量/均价、品牌合作明细将在专项取数接入后确认</div>
    </div>`;
}

// 供外部在 content tab 渲染后画趋势图
export function drawTrendIfNeeded(series) {
  const el = document.getElementById('trend-chart');
  if (!el || !window.echarts || !series) return;
  const chart = window.echarts.init(el);
  chart.setOption({
    grid: { left: 30, right: 10, top: 10, bottom: 20 },
    xAxis: { type: 'category', data: series.map((_, i) => `T${i + 1}`), axisLine: { lineStyle: { color: '#e8eaef' } }, axisLabel: { color: '#8a8f9c', fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f1f4' } }, axisLabel: { color: '#8a8f9c', fontSize: 10 } },
    series: [{ type: 'line', smooth: true, data: series, areaStyle: { color: 'rgba(255,45,85,.12)' }, lineStyle: { color: '#ff2d55', width: 2 }, itemStyle: { color: '#ff2d55' } }]
  });
}
