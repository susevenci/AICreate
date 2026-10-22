import {
  NAV,
  STEP_LABELS,
  STATUS_LABELS,
  ORIGIN_LABELS,
  PRIORITY_LABELS,
  ASSET_TYPE_LABELS,
  money,
  paramsAttr,
  displayTitle,
  statCard,
  nextStatus,
  sourceLabel,
  escapeHtml,
} from './shared.mjs';

export function renderHome({ config, tasks, drafts, ledgers, inbox, notes, ym, today, summary }) {
  const layoutOrder =
    Array.isArray(config?.layout) && config.layout.length
      ? config.layout
      : ['todo', 'drafts', 'ledger', 'inbox', 'notes'];
  const orderOf = (key) => {
    const i = layoutOrder.indexOf(key);
    return i === -1 ? 99 : i;
  };
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
    <div class="card" style="order:${orderOf('todo')}">
      <h2>今日待办</h2>
      <ul class="list">${taskRows}</ul>
      <form class="form inline" data-skill="task.create">
        <input name="title" placeholder="添加一件要做的事…" required />
        <input type="hidden" name="date" value="${escapeHtml(today)}" />
        <button class="primary" type="submit">添加</button>
      </form>
    </div>
    <div class="card" style="order:${orderOf('drafts')}">
      <h2>当前稿件</h2>
      <ul class="list">${draftRows}</ul>
    </div>
  </section>

  <section class="grid-2">
    <div class="card" style="order:${orderOf('ledger')}">
      <h2>本月经营</h2>
      <p class="big">${money(summary.net)}</p>
      <p class="muted small">本月净额 = 收入 − 支出。共 ${summary.count} 条流水${
        summary.missingDate > 0 ? `；另有 ${summary.missingDate} 条缺少日期，未计入` : ''
      }。</p>
      <a class="link" href="/ledger">查看明细 →</a>
    </div>
    <div class="card" style="order:${orderOf('inbox')}">
      <h2>收件箱</h2>
      <ul class="list">${inboxRows}</ul>
      <form class="form inline" data-skill="inbox.capture">
        <input name="title" placeholder="想到什么，先原样记下来…" required />
        <button class="primary" type="submit">记下</button>
      </form>
    </div>
    <div class="card" style="order:${orderOf('focus')}">
      <h2>番茄钟</h2>
      <p class="big" id="focus-clock">25:00</p>
      <div class="draft-foot">
        <button class="primary" id="focus-toggle" type="button">开始专注</button>
        <span class="muted small" id="focus-state">25 分钟一段，结束后自动记入专注日志</span>
      </div>
    </div>
    <div class="card" style="order:${orderOf('notes')}">
      <h2>常用资料</h2>
      <ul class="list">${noteRows}</ul>
      <p class="muted small">来自 02-知识库，按最近修改排序，最多 5 条。</p>
    </div>
  </section>`;
}
