/**
 * views.mjs — 服务端 HTML 渲染（只读镜像）
 *
 * 约束：视图层不持有状态，每次渲染都由 vault 现读数据。
 * 所有用户输入一律经 escapeHtml 转义后再输出。
 */

import { escapeHtml, renderMarkdown, extractSection } from '../markdown.mjs';

const NAV = [
  { href: '/', label: '首页', key: 'home' },
  { href: '/benchmark', label: '对标与热点', key: 'benchmark' },
  { href: '/topics', label: '选题池', key: 'topics' },
  { href: '/analysis', label: '拆解与沉淀', key: 'analysis' },
  { href: '/assets', label: '资产库', key: 'assets' },
  { href: '/drafts', label: '创作', key: 'drafts' },
  { href: '/ledger', label: '收支', key: 'ledger' },
  { href: '/works', label: '发布与经营', key: 'works' },
  { href: '/plan', label: '计划', key: 'plan' },
  { href: '/boards', label: '画板', key: 'boards' },
  { href: '/skills', label: '常用助手', key: 'skills' },
  { href: '/settings', label: '设置', key: 'settings' },
];

const STEP_LABELS = [
  ['idea', '聊思路'],
  ['copy', '写文案'],
  ['title', '起标题'],
  ['cover', '做封面'],
  ['checklist', '发布检查'],
  ['publish', '发布'],
];

const STATUS_LABELS = {
  backlog: '候补',
  researching: '研究中',
  selected: '已选定',
  'in-production': '创作中',
  archived: '已归档',
};

const ORIGIN_LABELS = {
  course: '课程',
  comment: '真实评论',
  published: '已发布作品',
  note: '知识库',
  thought: '个人思考',
  benchmark: '对标作品',
};

/** 把对象序列化成安全的 data-params 属性，浏览器读取时会自动还原引号 */
function paramsAttr(obj) {
  const json = JSON.stringify(obj)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
  return `data-params="${json}"`;
}

const money = (n) => `¥${(Number(n) || 0).toFixed(2)}`;

const PRIORITY_LABELS = { high: '高', normal: '普通', low: '低' };

/** 把文件名还原成可读标题：去类型前缀、去日期后缀、去时间戳前缀 */
function displayTitle(noteName) {
  return String(noteName ?? '')
    .replace(/^(选题|稿件|任务|流水|作品)-/, '')
    .replace(/-\d{4}-\d{2}-\d{2}(-\d+)?$/, '')
    .replace(/^\d{8}-\d{4}-/, '');
}

export function layout({ config, active, title, content, notice }) {
  const name = config?.name || '未命名工作台';
  const disabled = Array.isArray(config?.disabledModules) ? config.disabledModules : [];
  const nav = NAV.filter((item) => !disabled.includes(item.key))
    .map(
      (item) =>
        `<a class="nav-item${item.key === active ? ' active' : ''}" href="${item.href}">${item.label}</a>`
    )
    .join('');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · ${escapeHtml(name)}</title>
  <link rel="stylesheet" href="/assets/styles.css" />
</head>
<body data-theme="${escapeHtml(config?.theme || 'dark')}">
  <header class="topbar">
    <a class="brand" href="/">${escapeHtml(name)}</a>
    <nav class="nav">${nav}</nav>
  </header>
  ${notice ? `<div class="notice">${notice}</div>` : ''}
  <main class="page">${content}</main>
  <footer class="foot">
    <span>Markdown 为唯一真相源 · Web 只读镜像 · 写操作经 API 回写</span>
    <span>v${escapeHtml(config?.vaultVersion || '0.1.0')} · schema ${escapeHtml(config?.schemaVersion || '1.0.1')}</span>
  </footer>
  <script type="module" src="/assets/app.js"></script>
  <script type="module" src="/assets/focus.js"></script>
</body>
</html>`;
}

export function renderSetup({ error } = {}) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>初始化 · AI内容工作台</title>
  <link rel="stylesheet" href="/assets/styles.css" />
</head>
<body data-theme="dark" class="setup-body">
  <main class="setup">
    <h1>给你的工作台起个名字</h1>
    <p class="muted">名称会显示在顶部与浏览器标题。建议格式为「{前缀}AI内容工作台」，前缀可以是你的昵称、团队名或任意字符。</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <form class="form" method="post" action="/api/skills/config.update/run" data-skill="config.update">
      <label>工作台名称
        <input name="name" placeholder="AI内容工作台" maxlength="40" required autofocus />
      </label>
      <label>常用平台（逗号分隔，可留空）
        <input name="platforms" placeholder="小红书, 公众号, B站" />
      </label>
      <button class="primary" type="submit">保存并进入</button>
    </form>
    <p class="muted small">名称保存在 <code>vault/00-工作台/_配置.md</code> 的 <code>name</code> 字段，随时可在设置页修改。</p>
  </main>
  <script type="module" src="/assets/app.js"></script>
</body>
</html>`;
}

export function parseChanges(body) {
  const section = extractSection(body, '变更记录');
  return section
    .split('\n')
    .map((l) => l.replace(/^-\s*/, '').trim())
    .filter(Boolean);
}



/* ---------------------------------------------------------------- 对标与画板（M5） */

function sourceLabel(value) {
  return String(value ?? '')
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '');
}

const ASSET_TYPE_LABELS = {
  angle: '选题角度',
  structure: '文案结构',
  opening: '开场白',
  title: '标题',
};
function statCard(label, value, caveat) {
  return `<div class="stat"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(
    value
  )}</div><div class="stat-caveat">${escapeHtml(caveat || '')}</div></div>`;
}
function nextStatus(current) {
  const order = ['backlog', 'researching', 'selected', 'in-production', 'archived'];
  const idx = order.indexOf(current);
  return order[Math.min(idx + 1, order.length - 1)];
}
export { NAV, STEP_LABELS, STATUS_LABELS, ORIGIN_LABELS, PRIORITY_LABELS, ASSET_TYPE_LABELS, money, paramsAttr, displayTitle, statCard, nextStatus, sourceLabel };
export { escapeHtml };
export { renderMarkdown };
