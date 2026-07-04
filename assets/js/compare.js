// ============================================================
// compare.js — 对比分析（四步流程 + 示例结论 + 占位徽标）
// 选对象(对比篮/输入) → 多维度差异 → 问题总结 → 建议方案
// ============================================================
import { mountShell } from './shell.js';
import { fmtNum, esc } from './format.js';
import { basket, saved, onStoreChange } from './store.js';

let picked = null;      // 选中的对标博主
const SELF = { name: '我的账号', domain: '家居 / 好物分享', fans: 8600, view: 12000, like: 900, collect: 300 };

const CONTENT = `
<div class="page-head">
  <h1>对比分析</h1>
  <p>对照优秀博主与个人账号，定位差异并输出问题总结与建议方案</p>
</div>
<div class="coming-banner">⚖️ 真实对比计算（个人账号取数 + 三维 diff）为后续版本；下方为<strong>&nbsp;示例结论&nbsp;</strong>，展示完整流程与信息结构</div>

<!-- Step1 选择对象 -->
<div class="card pad mb-4">
  <div class="card-title mb-3">① 选择分析对象</div>
  <div class="grid grid-2">
    <div>
      <div class="muted small mb-2">选择的博主（来自对比篮 / 搜索）</div>
      <div id="blogger-pick"></div>
    </div>
    <div>
      <div class="muted small mb-2">个人账号（搜索 / 录入链接 / 已保存）</div>
      <div class="card pad">
        <div class="row gap"><div class="avatar">我</div>
          <div><b>${SELF.name}</b><div class="muted small">${SELF.domain} · 粉丝 ${fmtNum(SELF.fans)}</div></div>
        </div>
        <input class="input mt-3" style="width:100%" placeholder="或粘贴个人主页链接…（演示）" />
        <div class="coming-banner mt-3" style="margin:0">个人账号数据不完整时将提示补充/授权</div>
      </div>
    </div>
  </div>
</div>

<div id="result"></div>`;

function init() {
  mountShell(CONTENT);
  renderPick();
  onStoreChange(() => { if (!picked) renderPick(); });
}

function renderPick() {
  const wrap = document.getElementById('blogger-pick');
  const items = basket.all().filter(x => x.type === 'blogger');
  if (!items.length) {
    wrap.innerHTML = `<div class="card pad"><div class="state" style="padding:20px"><div class="ico">🧺</div>
      <div class="msg small">对比篮为空。去<a href="index.html" style="color:var(--brand-600)">爆款拆解</a>或<a href="discover.html" style="color:var(--brand-600)">挖掘热点</a>「加入对比」</div></div></div>`;
    document.getElementById('result').innerHTML = '';
    return;
  }
  wrap.innerHTML = `<div class="card">${items.map(b => `
    <div class="blogger-row" data-id="${b.id}">
      <div class="avatar">${esc((b.name||'?')[0])}</div>
      <div class="info"><div class="name">${esc(b.name)}</div><div class="sub">${esc(b.domain||'')} · 粉丝 ${fmtNum(b.fans)}</div></div>
      <button class="btn sm primary" data-act="pick">选它对比</button>
    </div>`).join('')}</div>`;
  wrap.querySelectorAll('[data-act="pick"]').forEach(btn => btn.addEventListener('click', e => {
    picked = items.find(x => x.id === e.target.closest('[data-id]').dataset.id);
    renderResult();
  }));
}

function renderResult() {
  const b = picked;
  const bStat = { fans: b.fans || 486000, view: 338000, like: 38000, collect: 21000 };
  document.getElementById('result').innerHTML = `
  <div class="card pad mb-4">
    <div class="card-title mb-3">② 多维度分析 · 差异高亮 <span class="badge mock">示例</span></div>
    <div class="segment mb-3" id="dim-seg">
      <button data-d="data" class="active">数据分析</button>
      <button data-d="content">内容分析</button>
      <button data-d="money">商业变现</button>
    </div>
    <div id="dim-body"></div>
  </div>

  <div class="card pad mb-4">
    <div class="card-title mb-3">③ 问题总结 <span class="muted small">（按 数据 / 内容 / 商业 归纳，每条附依据）</span></div>
    ${problem('数据弱', '浏览量仅为对标账号的约 3.5%，粉丝规模差 56 倍', '依据：数据差异')}
    ${problem('定位不清', '缺少稳定的「好物分享」标签与一句话锐评，人设模糊', '依据：内容标签差异')}
    ${problem('商业信号缺失', '无橱窗、简介无联系方式，变现路径未铺设', '依据：商业信号缺失')}
  </div>

  <div class="card pad mb-4">
    <div class="row between mb-3"><div class="card-title">④ 建议方案 <span class="muted small">（与问题一一对应）</span></div>
      <button class="btn primary sm" id="save-plan">保存方案</button></div>
    <div class="grid grid-3">
      ${advice('🎯 定位建议', '对应「定位不清」', ['锁定「租房/小户型 · 平价好物」单一标签', '固定开场自我介绍，强化人设记忆点'])}
      ${advice('📝 内容建议', '对应「数据弱」', ['标题套用「数字+痛点+结果」结构', '优先做「成本清单」类高收藏选题', '视频控制在 3 分钟内'])}
      ${advice('💰 商业建议', '对应「商业信号缺失」', ['开通橱窗，上架 3-5 件平价同款', '简介留可信联系方式（合规）', '积累后接家居/家电品牌合作'])}
    </div>
  </div>`;

  const seg = document.getElementById('dim-seg');
  const paintDim = (d) => { document.getElementById('dim-body').innerHTML = dimView(d, b, bStat); };
  seg.addEventListener('click', e => { const btn = e.target.closest('button'); if (!btn) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === btn)); paintDim(btn.dataset.d); });
  paintDim('data');
  document.getElementById('save-plan').addEventListener('click', e => {
    saved.add({ type: 'compare-plan', name: `${b.name} vs ${SELF.name}` });
    e.target.textContent = '✓ 已保存';
  });
}

function dimView(d, b, bStat) {
  if (d === 'data') {
    return [
      diffRow('粉丝数', bStat.fans, SELF.fans),
      diffRow('浏览量/篇', bStat.view, SELF.view),
      diffRow('点赞量/篇', bStat.like, SELF.like),
      diffRow('收藏量/篇', bStat.collect, SELF.collect),
    ].join('');
  }
  if (d === 'content') {
    return `${cmpText('定位', b.name + '：家居带货博主，标签清晰', SELF.name + '：标签模糊，未形成人设')}
      ${cmpText('标题规律', '「数字+痛点+结果」稳定套路', '标题随意，缺乏结构')}
      ${cmpText('内容优势', '成本清单透明、真实可参考', '选题分散，记忆点弱')}
      ${cmpText('内容弱势', '偶有主观测评', '数据样本少，规律未成型')}`;
  }
  return `${cmpText('变现方式', '引流微信 + 橱窗带货 + 商业合作', '暂无明显变现动作')}
    ${cmpText('账号实体', '橱窗 / 认证 / 简介联系方式齐全', '均缺失')}
    ${cmpText('商业合作', '家居 / 家电品牌露出', '无')}`;
}

function diffRow(label, bv, sv) {
  const ratio = sv && bv ? ((sv / bv) * 100).toFixed(1) + '%' : '—';
  return `<div class="diff-row">
    <div class="side"><span class="muted small">${esc(picked.name)}</span><span class="v up">${fmtNum(bv)}</span></div>
    <div class="lbl">${esc(label)}<div class="small">我方为其 ${ratio}</div></div>
    <div class="side b"><span class="muted small">${SELF.name}</span><span class="v down">${fmtNum(sv)}</span></div>
  </div>`;
}
function cmpText(label, btext, stext) {
  return `<div class="diff-row" style="grid-template-columns:1fr 100px 1fr">
    <div class="side"><span class="muted small">${esc(picked.name)}</span><span>${esc(btext)}</span></div>
    <div class="lbl">${esc(label)}</div>
    <div class="side b"><span class="muted small">${SELF.name}</span><span>${esc(stext)}</span></div>
  </div>`;
}
function problem(tag, text, basis) {
  return `<div class="problem-item"><div class="dot"></div><div>
    <b>${esc(tag)}</b> — ${esc(text)}<div class="muted small mt-2">${esc(basis)}</div></div></div>`;
}
function advice(title, rel, items) {
  return `<div class="card pad"><div class="card-title mb-2">${title}</div>
    <div class="badge info mb-3">${esc(rel)}</div>
    <ul style="margin:0;padding-left:18px;color:var(--text-2);font-size:13px;line-height:1.9">
      ${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
}

init();
