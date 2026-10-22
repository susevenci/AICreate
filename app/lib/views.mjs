/**
 * views.mjs — 服务端 HTML 渲染（只读镜像）
 *
 * 约束：视图层不持有状态，每次渲染都由 vault 现读数据。
 * 所有用户输入一律经 escapeHtml 转义后再输出。
 */

import { escapeHtml, renderMarkdown, extractSection } from './markdown.mjs';

const NAV = [
  { href: '/', label: '首页', key: 'home' },
  { href: '/topics', label: '选题池', key: 'topics' },
  { href: '/drafts', label: '创作', key: 'drafts' },
  { href: '/ledger', label: '收支', key: 'ledger' },
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
  const nav = NAV.map(
    (item) =>
      `<a class="nav-item${item.key === active ? ' active' : ''}" href="${item.href}">${item.label}</a>`
  ).join('');
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

export function renderHome({ config, tasks, drafts, ledgers, inbox, notes, ym, today, summary }) {
  const taskRows = tasks.length
    ? tasks
        .map(
          (t) => `<li class="row">
            <span class="pill ${escapeHtml(t.data.priority)}">${escapeHtml(
              PRIORITY_LABELS[t.data.priority] || t.data.priority
            )}</span>
            <span class="row-main">${escapeHtml(displayTitle(t.name))}</span>
            <button class="ghost" data-skill="task.done" ${paramsAttr({ path: t.path })}>完成</button>
          </li>`
        )
        .join('')
    : '<li class="empty">今天没有安排。先加一件要做的事。</li>';

  const draftRows = drafts.length
    ? drafts
        .map((d) => {
          const idx = STEP_LABELS.findIndex((s) => s[0] === d.data.step);
          const bar = STEP_LABELS.map((s, i) => `<span class="step${i === idx ? ' on' : ''}${i < idx ? ' done' : ''}">${s[1]}</span>`).join('');
          return `<li class="row row-stack">
            <span class="row-main">${escapeHtml(displayTitle(d.name))}</span>
            <span class="steps">${bar}</span>
          </li>`;
        })
        .join('')
    : '<li class="empty">还没有进行中的稿件。从选题池选定方向后新建。</li>';

  const inboxRows = inbox.length
    ? inbox
        .map(
          (n) => `<li class="row">
            <span class="row-main">${escapeHtml(displayTitle(n.name))}</span>
            <button class="ghost" data-skill="inbox.promote" ${paramsAttr({ path: n.path, target: 'topic' })}>转选题</button>
            <button class="ghost" data-skill="inbox.promote" ${paramsAttr({ path: n.path, target: 'note' })}>转笔记</button>
          </li>`
        )
        .join('')
    : '<li class="empty">收件箱是空的。</li>';

  const noteRows = notes.length
    ? notes
        .map(
          (n) => `<li class="row"><span class="row-main">${escapeHtml(displayTitle(n.name))}</span></li>`
        )
        .join('')
    : '<li class="empty">知识库还是空的。把收件箱里的内容转成笔记试试。</li>';

  return `
  <section class="hero">
    <div>
      <p class="muted">${escapeHtml(ym)}</p>
      <h1>今天先做什么</h1>
    </div>
    <div class="hero-actions">
      <a class="button" href="/topics#new">新建选题</a>
      <a class="button" href="/drafts#new">新建稿件</a>
      <a class="button" href="/ledger#new">记一笔</a>
    </div>
  </section>

  <section class="stats">
    ${statCard('今日待办', tasks.length + ' 项', '按计划日期等于今天筛选')}
    ${statCard('进行中稿件', drafts.length + ' 篇', 'status = active')}
    ${statCard('本月收入', money(summary.income), '按流水金额合计，非笔数')}
    ${statCard('本月支出', money(summary.expense), '按流水金额合计')}
  </section>

  <section class="grid-2">
    <div class="card">
      <h2>今日待办</h2>
      <ul class="list">${taskRows}</ul>
      <form class="form inline" data-skill="task.create">
        <input name="title" placeholder="添加一件要做的事…" required />
        <input type="hidden" name="date" value="${escapeHtml(today)}" />
        <button class="primary" type="submit">添加</button>
      </form>
    </div>
    <div class="card">
      <h2>当前稿件</h2>
      <ul class="list">${draftRows}</ul>
    </div>
  </section>

  <section class="grid-2">
    <div class="card">
      <h2>本月经营</h2>
      <p class="big">${money(summary.net)}</p>
      <p class="muted small">本月净额 = 收入 − 支出。共 ${summary.count} 条流水${
        summary.missingDate > 0 ? `；另有 ${summary.missingDate} 条缺少日期，未计入` : ''
      }。</p>
      <a class="link" href="/ledger">查看明细 →</a>
    </div>
    <div class="card">
      <h2>收件箱</h2>
      <ul class="list">${inboxRows}</ul>
      <form class="form inline" data-skill="inbox.capture">
        <input name="title" placeholder="想到什么，先原样记下来…" required />
        <button class="primary" type="submit">记下</button>
      </form>
    </div>
    <div class="card">
      <h2>常用资料</h2>
      <ul class="list">${noteRows}</ul>
      <p class="muted small">来自 02-知识库，按最近修改排序，最多 5 条。</p>
    </div>
  </section>`;
}

export function renderTopics({ topics, groups, error }) {
  const board = Object.entries(STATUS_LABELS)
    .map(([key, label]) => {
      const items = groups[key] || [];
      const cards = items.length
        ? items
            .map(
              (t) => `<article class="mini">
                <div class="mini-title">${escapeHtml(displayTitle(t.name))}</div>
                <div class="mini-meta">${escapeHtml(t.data.angle || t.data.problem || '—')}</div>
                <div class="mini-foot">
                  <span class="pill">${t.data.fit ? '适配 ' + t.data.fit : '未评分'}</span>
                  ${key !== 'archived' ? `<button class="ghost" data-skill="topic.advance" ${paramsAttr({ path: t.path, status: nextStatus(key) })}>推进</button>` : ''}
                </div>
              </article>`
            )
            .join('')
        : '<p class="empty">—</p>';
      return `<div class="column"><h3>${label} <span class="count">${items.length}</span></h3>${cards}</div>`;
    })
    .join('');

  const rows = topics.length
    ? topics
        .map(
          (t) => `<tr>
            <td>${escapeHtml(displayTitle(t.name))}</td>
            <td><span class="pill">${escapeHtml(STATUS_LABELS[t.data.status] || t.data.status)}</span></td>
            <td>${escapeHtml(t.data.problem || '—')}</td>
            <td>${escapeHtml(t.data.material || '—')}</td>
            <td>${escapeHtml(
              (t.data.origin || []).map((o) => ORIGIN_LABELS[o] || o).join('、') || '—'
            )}</td>
            <td>${t.data.fit ?? '—'}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty">暂无选题</td></tr>';

  return `
  <section class="hero"><div><h1>选题池</h1><p class="muted">一条选题一篇笔记，状态推进见下方看板。</p></div></section>
  ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}

  <section class="board">${board}</section>

  <section class="card">
    <h2>全部选题</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>标题</th><th>状态</th><th>问题</th><th>材料</th><th>来源</th><th>适配</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>

  <section class="card" id="new">
    <h2>新建选题</h2>
    <p class="muted small">「问题」与「材料」为必填：说不清这两项，选题不能进入已选定。</p>
    <form class="form grid-form" data-skill="topic.create">
      <label>标题 <input name="title" required placeholder="读者会点击的一句话" /></label>
      <label>观众遇到什么问题 <input name="problem" required placeholder="具体到场景与后果" /></label>
      <label>我有什么材料可讲 <input name="material" required placeholder="数据 / 案例 / 经历 / 来源" /></label>
      <label>切入角度 <input name="angle" placeholder="可留空，由 Skill 建议" /></label>
      <label>来源
        <select name="origin">
          <option value="thought">个人思考</option>
          <option value="comment">真实评论</option>
          <option value="course">课程</option>
          <option value="note">知识库</option>
          <option value="published">已发布作品</option>
          <option value="benchmark">对标作品</option>
        </select>
      </label>
      <div class="form-actions"><button class="primary" type="submit">创建选题</button></div>
    </form>
  </section>`;
}

export function renderDrafts({ drafts, error }) {
  const cards = drafts.length
    ? drafts
        .map((d) => {
          const idx = STEP_LABELS.findIndex((s) => s[0] === d.data.step);
          const bar = STEP_LABELS.map(
            (s, i) => `<span class="step${i === idx ? ' on' : ''}${i < idx ? ' done' : ''}">${s[1]}</span>`
          ).join('');
          const next = STEP_LABELS[idx + 1];
          const warn = !d.data.audience
            ? '<p class="warn">缺少「这篇解决谁的什么问题」，补齐后才能进入文案阶段。</p>'
            : '';
          return `<article class="card draft">
            <div class="draft-head">
              <h2>${escapeHtml(displayTitle(d.name))}</h2>
              <span class="pill">v${escapeHtml(String(d.data.version ?? 1))}</span>
            </div>
            <div class="steps">${bar}</div>
            ${warn}
            <p class="muted small">目标读者：${escapeHtml(d.data.audience || '未填写')}　｜　来源选题：${escapeHtml(
              String(d.data.topic || '—')
            )}</p>
            <div class="draft-foot">
              ${next ? `<button class="primary" data-skill="draft.advance" ${paramsAttr({ path: d.path, step: next[0] })}>推进到：${next[1]}</button>` : '<span class="pill ok">已完成</span>'}
              <a class="link" href="/skills?draft=${encodeURIComponent(d.path)}">调用 Skill</a>
            </div>
          </article>`;
        })
        .join('')
    : '<p class="empty">还没有稿件。</p>';

  return `
  <section class="hero"><div><h1>创作</h1><p class="muted">六步推进：聊思路 → 写文案 → 起标题 → 做封面 → 发布检查 → 发布。</p></div></section>
  ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
  <section class="stack">${cards}</section>

  <section class="card" id="new">
    <h2>新建稿件</h2>
    <form class="form grid-form" data-skill="draft.create">
      <label>标题 <input name="title" required placeholder="暂定标题，之后可改" /></label>
      <label>这篇解决谁的什么问题 <input name="audience" required placeholder="人群 + 具体问题" /></label>
      <label>来源选题 <input name="topic" placeholder="[[选题-xxx-20261022]]" /></label>
      <div class="form-actions"><button class="primary" type="submit">创建稿件</button></div>
    </form>
  </section>`;
}

export function renderLedger({ ledgers, summary, ym, error }) {
  const rows = ledgers.length
    ? ledgers
        .map(
          (l) => `<tr>
            <td>${escapeHtml(l.data.date || '缺少日期')}</td>
            <td><span class="pill ${escapeHtml(l.data.kind)}">${l.data.kind === 'income' ? '收入' : '支出'}</span></td>
            <td class="num">${money(l.data.amount)}</td>
            <td>${escapeHtml(l.data.category || '未分类')}</td>
            <td>${escapeHtml(l.data.note || '—')}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="empty">暂无流水</td></tr>';

  return `
  <section class="hero"><div><h1>收支</h1><p class="muted">${escapeHtml(ym)}　金额与成交笔数分开记录，互不推算。</p></div></section>
  ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}

  <section class="stats">
    ${statCard('本月收入', money(summary.income), '按流水金额合计，非笔数')}
    ${statCard('本月支出', money(summary.expense), '按流水金额合计')}
    ${statCard('本月净额', money(summary.net), '收入 − 支出')}
    ${statCard('本月记录', summary.count + ' 条', '按笔记条数')}
  </section>
  ${summary.missingDate > 0 ? `<div class="notice warnbox">数据质量：${summary.missingDate} 条流水缺少日期，未计入月度统计。</div>` : ''}

  <section class="card">
    <h2>明细</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>日期</th><th>类型</th><th>金额</th><th>分类</th><th>备注</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>

  <section class="card" id="new">
    <h2>记一笔</h2>
    <form class="form grid-form" data-skill="ledger.create">
      <label>类型
        <select name="kind"><option value="income">收入</option><option value="expense">支出</option></select>
      </label>
      <label>金额 <input name="amount" type="number" step="0.01" min="0.01" required placeholder="399.00" /></label>
      <label>日期 <input name="date" type="date" required value="${escapeHtml(ym)}-01" /></label>
      <label>分类
        <select name="category">
          <option>课程</option><option>带货</option><option>投放</option><option>订阅</option><option>其他</option>
        </select>
      </label>
      <label>备注 <input name="note" placeholder="可留空" /></label>
      <div class="form-actions"><button class="primary" type="submit">记录</button></div>
    </form>
  </section>`;
}

export function renderSkills({ skills, error }) {
  const stageLabels = {
    intake: '整理输入',
    topic: '寻找选题',
    writing: '写作改稿',
    packaging: '包装发布',
    review: '复盘',
    knowledge: '知识库维护',
    plan: '计划',
    settings: '设置',
    other: '其他',
  };

  const aiSkills = skills.filter((s) => s.kind !== 'action');
  const actionSkills = skills.filter((s) => s.kind === 'action');

  const groupByStage = (list) => {
    const groups = new Map();
    for (const skill of list) {
      const key = skill.stage || 'other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(skill);
    }
    return [...groups.entries()]
      .map(
        ([stage, items]) =>
          `<section class="stack"><h2 class="section-title">${stageLabels[stage] || stage}</h2>${items
            .map((s) => `<article class="card skill-card">
              <div class="skill-head">
                <h2>${escapeHtml(s.name)}</h2>
                <span class="pill">v${escapeHtml(s.version)}</span>
              </div>
              <p class="muted">${escapeHtml(s.subtitle)}</p>
              <p class="muted small">参数：${s.inputs.map((i) => escapeHtml(i)).join(' / ') || '无'}</p>
            </article>`)
            .join('')}</section>`
      )
      .join('');
  };

  const aiBlocks = [...new Set(aiSkills.map((s) => s.stage || 'other'))]
    .map((stage) => {
      const items = aiSkills.filter((s) => (s.stage || 'other') === stage);
      const cards = items
        .map(
          (s) => `<article class="card skill" data-skill="${escapeHtml(s.id)}">
            <div class="skill-head">
              <h2>${escapeHtml(s.name)}</h2>
              <span class="pill">v${escapeHtml(s.version)}</span>
            </div>
            <p class="muted">${escapeHtml(s.subtitle)}</p>
            <p class="muted small">参数：${s.inputs
              .map((i) => escapeHtml(i) + (s.optional.includes(i) ? '（选填）' : ''))
              .join(' / ') || '无'}</p>
            <div class="skill-run">
              ${s.inputs
                .map(
                  (input) =>
                    `<label>${escapeHtml(input)}<input data-param="${escapeHtml(input)}" placeholder="${
                      s.optional.includes(input) ? '选填' : '必填'
                    }" /></label>`
                )
                .join('')}
              <button class="primary" data-skill="${escapeHtml(s.id)}" data-run="prompt">生成指令</button>
            </div>
            <pre class="prompt-out" hidden></pre>
          </article>`
        )
        .join('');
      return `<section class="stack"><h2 class="section-title">${stageLabels[stage] || stage}</h2>${cards}</section>`;
    })
    .join('');

  return `
  <section class="hero"><div><h1>常用助手</h1><p class="muted">所有功能入口都通过 Skill 调用：动作型 Skill 直接执行业务动作，AI 型 Skill 生成指令后交给 Codex / Claude Code / Qoder 执行。</p></div></section>
  ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
  ${skills.length === 0 ? '<p class="empty">尚未安装 Skill。把 Skill 目录放进 vault/.codex/skills/ 即可出现在这里。</p>' : ''}
  ${aiSkills.length > 0 ? `<h2 class="section-title">AI 指令型（生成 prompt）</h2>${aiBlocks}` : ''}
  ${actionSkills.length > 0 ? `<h2 class="section-title">动作型（由页面按钮直接调用，共 ${actionSkills.length} 个）</h2>${groupByStage(actionSkills)}` : ''}
  <section class="card">
    <h2>运行约定</h2>
    <ul class="plain">
      <li>所有页面入口都调用 <code>POST /api/skills/:id/run</code>，不再有绕过 Skill 的直连接口。</li>
      <li>必填参数取自 <code>inputs</code> 减去 <code>optional</code>；缺项直接拒绝。</li>
      <li>AI 型产物写入 <code>01-收件箱/_ai-output/</code>，人工确认后才进入正式目录。</li>
      <li>执行者必须先读 <code>.codex/AGENTS.md</code> 与 <code>00-工作台/_schema.md</code>。</li>
    </ul>
  </section>`;
}

export function renderSettings({ config, changes, error, saved }) {
  const changeHtml = changes.length
    ? changes.map((c) => `<li>${escapeHtml(c)}</li>`).join('')
    : '<li class="empty">暂无记录</li>';
  return `
  <section class="hero"><div><h1>设置</h1><p class="muted">修改会写回 <code>vault/00-工作台/_配置.md</code>，并追加一条变更记录。</p></div></section>
  ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
  ${saved ? '<div class="notice okbox">已保存。</div>' : ''}

  <section class="card">
    <h2>基本信息</h2>
    <form class="form grid-form" data-skill="config.update">
      <label>工作台名称 <input name="name" value="${escapeHtml(config.name || '')}" required maxlength="40" /></label>
      <label>常用平台（逗号分隔） <input name="platforms" value="${escapeHtml((config.platforms || []).join(', '))}" /></label>
      <label>主题
        <select name="theme">
          <option value="dark"${config.theme === 'dark' ? ' selected' : ''}>暗色</option>
          <option value="light"${config.theme === 'light' ? ' selected' : ''}>亮色</option>
        </select>
      </label>
      <div class="form-actions"><button class="primary" type="submit">保存</button></div>
    </form>
  </section>

  <section class="card">
    <h2>口径参数（只读）</h2>
    <div class="table-wrap"><table>
      <tbody>
        <tr><td>低粉爆款阈值</td><td>粉丝 &lt; ${escapeHtml(String(config.lowFanThreshold))} 且互动率 &gt; ${escapeHtml(String(config.engagementThreshold))}</td></tr>
        <tr><td>异常值倍数</td><td>播放 &gt; 基线 × ${escapeHtml(String(config.outlierMultiplier))}</td></tr>
        <tr><td>schema 版本</td><td>${escapeHtml(config.schemaVersion || '')}</td></tr>
        <tr><td>时区</td><td>${escapeHtml(config.timezone || '')}</td></tr>
      </tbody>
    </table></div>
    <p class="muted small">阈值修改属于口径变更，请在 <code>_配置.md</code> 的「变更记录」写明理由后再改文件。</p>
  </section>

  <section class="card">
    <h2>变更记录</h2>
    <ul class="plain">${changeHtml}</ul>
  </section>`;
}

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

/** 从 _配置.md 正文提取变更记录列表 */
export function parseChanges(body) {
  const section = extractSection(body, '变更记录');
  return section
    .split('\n')
    .map((l) => l.replace(/^-\s*/, '').trim())
    .filter(Boolean);
}

export { renderMarkdown };
