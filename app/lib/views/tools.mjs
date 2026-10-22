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

export function renderSkills({ skills, favorites = [], error }) {
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
              <button class="ghost" data-skill="skill.favorite" ${paramsAttr({ id: s.id, active: !favorites.includes(s.id) })}>${favorites.includes(s.id) ? '取消收藏' : '收藏'}</button>
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

export function renderPlan({ todayTasks, unscheduled, overdue, today }) {
  const taskRow = (t, withDate) => `<li class="row">
    <span class="pill ${escapeHtml(t.data.priority || 'normal')}">${escapeHtml(
      PRIORITY_LABELS[t.data.priority] || t.data.priority || '普通'
    )}</span>
    <span class="row-main">${escapeHtml(displayTitle(t.name))}${withDate && t.data.date ? `　<span class="muted small">${escapeHtml(t.data.date)}</span>` : ''}${t.data.originDate ? `　<span class="muted small">原计划 ${escapeHtml(t.data.originDate)}</span>` : ''}${t.data.source === 'ai' ? '　<span class="pill">AI 建议</span>' : ''}</span>
    ${t.data.source === 'ai' ? `<button class="ghost" data-skill="task.confirmAi" ${paramsAttr({ path: t.path })}>确认</button>` : ''}
    <button class="ghost" data-skill="task.done" ${paramsAttr({ path: t.path })}>完成</button>
    <button class="ghost" data-skill="task.reschedule" ${paramsAttr({ path: t.path, date: today })}>排到今天</button>
  </li>`;

  const list = (items, withDate, empty) =>
    items.length ? items.map((t) => taskRow(t, withDate)).join('') : `<li class="empty">${empty}</li>`;

  return `
  <section class="hero"><div><h1>计划</h1><p class="muted">${escapeHtml(today)}　目标拆成任务，AI 建议需确认后才算你的计划。</p></div></section>
  <section class="card">
    <h2>加一件事</h2>
    <form class="form inline" data-skill="task.create">
      <input name="title" placeholder="要做什么…" required />
      <input name="date" type="date" value="${escapeHtml(today)}" />
      <button class="primary" type="submit">添加</button>
    </form>
  </section>
  <section class="grid-2">
    <div class="card"><h2>今日安排 <span class="count">${todayTasks.length}</span></h2><ul class="list">${list(todayTasks, false, '今天没有安排。')}</ul></div>
    <div class="card"><h2>待安排 <span class="count">${unscheduled.length}</span></h2><ul class="list">${list(unscheduled, false, '没有待安排的任务。')}</ul></div>
  </section>
  <section class="card">
    <h2>已逾期 <span class="count">${overdue.length}</span></h2>
    <ul class="list">${list(overdue, true, '没有逾期任务。')}</ul>
    <p class="muted small">「排到今天」会写入日期；若原有日期不同，会自动记下 originDate 便于追溯。</p>
  </section>`;
}

/* ---------------------------------------------------------------- 发布与经营（M3） */

export function renderBenchmark({ bloggers, sources, counts, thresholds }) {
  const sourceRows = sources.length
    ? sources
        .map(
          (s) => `<tr><td>${escapeHtml(displayTitle(s.name))}</td>
            <td>${escapeHtml(s.data.platform || '—')}</td>
            <td class="num">${s.data.followers ?? 0}</td>
            <td class="num">${s.data.views ?? 0}</td>
            <td class="num">${s.data.baseline ?? 0}</td>
            <td>${escapeHtml(String(s.data.publishedAt || '—'))}</td>
            <td>${escapeHtml(s.data.sourceLevel || 'L0')}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="7" class="empty">暂无对标作品。下方录入第一条。</td></tr>';

  return `
  <section class="hero"><div><h1>对标与热点</h1><p class="muted">当前为手工录入（L0），未接入抓取。互动突出只是研究线索，还要判断是否适合自己。</p></div></section>
  <section class="stats">
    ${statCard('监控博主', counts.bloggers + ' 位', 'blogger 笔记数')}
    ${statCard('低粉爆款', counts.lowFan + ' 条', `粉丝 < ${thresholds.lowFan} 且互动率 > ${thresholds.engagement}`)}
    ${statCard('爆款内容异常值', counts.outlier + ' 条', `播放 > 基线 × ${thresholds.outlier}`)}
    ${statCard('近 3 天更新', counts.recent + ' 条', '按 publishedAt 筛选')}
  </section>
  <section class="grid-2">
    <div class="card"><h2>添加监控博主</h2>
      <form class="form grid-form" data-skill="blogger.create">
        <label>博主名 <input name="name" required placeholder="例如：某封面博主" /></label>
        <label>平台 <input name="platform" required placeholder="小红书" /></label>
        <label>粉丝数 <input name="followers" type="number" required min="0" /></label>
        <label>互动基线 <input name="baseline" type="number" min="0" placeholder="可留空" /></label>
        <label>判断 <select name="fit"><option value="">待观察</option><option value="fit">适合我</option><option value="unfit">不适合</option></select></label>
        <div class="form-actions"><button class="primary" type="submit">添加</button></div>
      </form>
    </div>
    <div class="card"><h2>录入对标作品</h2>
      <form class="form grid-form" data-skill="source.create">
        <label>标题 <input name="title" required placeholder="作品标题" /></label>
        <label>平台 <input name="platform" required placeholder="小红书" /></label>
        <label>粉丝快照 <input name="followers" type="number" min="0" /></label>
        <label>基线 <input name="baseline" type="number" min="0" /></label>
        <label>播放 <input name="views" type="number" min="0" /></label>
        <label>点赞 <input name="likes" type="number" min="0" /></label>
        <label>评论 <input name="comments" type="number" min="0" /></label>
        <label>分享 <input name="shares" type="number" min="0" /></label>
        <div class="form-actions"><button class="primary" type="submit">录入</button></div>
      </form>
    </div>
  </section>
  <section class="card">
    <h2>对标作品</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>作品</th><th>平台</th><th>粉丝</th><th>播放</th><th>基线</th><th>发布</th><th>等级</th></tr></thead>
      <tbody>${sourceRows}</tbody>
    </table></div>
  </section>`;
}

export function renderBoards({ boards }) {
  const rows = boards.length
    ? boards
        .map(
          (b) => `<li class="row"><span class="row-main">${escapeHtml(b.name)}</span>
            <span class="muted small">${escapeHtml(b.path)}</span></li>`
        )
        .join('')
    : '<li class="empty">还没有画板。新建一个后到 Obsidian 里绘制。</li>';

  return `
  <section class="hero"><div><h1>画板</h1><p class="muted">Web 端只做索引与新建；绘制在 Obsidian 的 Excalidraw 中完成。</p></div></section>
  <section class="card">
    <h2>新建画板</h2>
    <form class="form inline" data-skill="board.create">
      <input name="title" placeholder="画板名，例如：封面结构拆解" required />
      <button class="primary" type="submit">新建</button>
    </form>
  </section>
  <section class="card"><h2>历史画板 <span class="count">${boards.length}</span></h2><ul class="list">${rows}</ul></section>`;
}

/* ---------------------------------------------------------------- 计划（M4） */

export function renderSettings({ config, changes, modules = [], error, saved }) {
  const CARD_LABELS = {
    todo: '今日待办',
    drafts: '当前稿件',
    ledger: '本月经营',
    inbox: '收件箱',
    notes: '常用资料',
  };
  const layoutOrder =
    Array.isArray(config.layout) && config.layout.length ? config.layout : Object.keys(CARD_LABELS);
  const layoutRows = layoutOrder
    .map(
      (key, i) => `<li class="row"><span class="row-main">${escapeHtml(CARD_LABELS[key] || key)}</span>
        <button class="ghost" data-skill="layout.move" ${paramsAttr({ key, direction: 'up' })} ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="ghost" data-skill="layout.move" ${paramsAttr({ key, direction: 'down' })} ${i === layoutOrder.length - 1 ? 'disabled' : ''}>↓</button></li>`
    )
    .join('');
  const MODULE_LABELS = {
    benchmark: '对标与热点',
    topics: '选题池',
    analysis: '拆解与沉淀',
    assets: '资产库',
    drafts: '创作',
    works: '发布与经营',
    plan: '计划',
    boards: '画板',
    ledger: '收支',
  };
  const disabledModules = Array.isArray(config.disabledModules) ? config.disabledModules : [];
  const moduleRows = modules
    .map(
      (m) => `<li class="row"><span class="row-main">${escapeHtml(MODULE_LABELS[m.key] || m.key)}</span>
        <button class="ghost" data-skill="module.toggle" ${paramsAttr({ module: m.key, enabled: disabledModules.includes(m.key) })}>${disabledModules.includes(m.key) ? '开启' : '关闭'}</button></li>`
    )
    .join('');
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
    <h2>首页布局</h2>
    <ul class="list">${layoutRows}</ul>
    <h2 style="margin-top:18px">模块开关</h2>
    <p class="muted small">关闭后导航隐藏、路由返回 404，随时可重新开启。</p>
    <div class="draft-foot">
      <button class="ghost" data-skill="preset.free" ${paramsAttr({ mode: 'free' })}>切换免费版</button>
      <button class="ghost" data-skill="preset.free" ${paramsAttr({ mode: 'full' })}>恢复完整版</button>
    </div>
    <ul class="list">${moduleRows}</ul>
  </section>

  <section class="card">
    <h2>变更记录</h2>
    <ul class="plain">${changeHtml}</ul>
  </section>`;
}





/** 从 _配置.md 正文提取变更记录列表 */
