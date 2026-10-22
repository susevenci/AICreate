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
import { extractSection } from '../markdown.mjs';

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
  </section>

  <section class="card">
    <h2>从知识库导入</h2>
    <p class="muted small">从内部素材找选题：选一篇 02-知识库 的笔记，标题与问题可留空。从对标爆文导入待 M5 上线。</p>
    <form class="form grid-form" data-skill="topic.createFromNote">
      <label>来源笔记 <input name="note" required placeholder="02-知识库/笔记名.md" /></label>
      <label>选题标题 <input name="title" placeholder="留空则用笔记名" /></label>
      <label class="full">观众遇到什么问题 <input name="problem" placeholder="留空则用标题" /></label>
      <div class="form-actions"><button class="primary" type="submit">生成选题</button></div>
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
              <h2><a class="link" href="/drafts/${encodeURIComponent(d.name)}">${escapeHtml(displayTitle(d.name))}</a></h2>
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

export function renderDraftDetail({ draft, versions }) {
  const idx = STEP_LABELS.findIndex((s) => s[0] === draft.data.step);
  const bar = STEP_LABELS.map(
    (s, i) => `<span class="step${i === idx ? ' on' : ''}${i < idx ? ' done' : ''}">${s[1]}</span>`
  ).join('');
  const next = STEP_LABELS[idx + 1];
  const body = extractSection(draft.body, '正文');
  const versionRows = versions.length
    ? versions.map((v) => `<li class="row"><span class="row-main">${escapeHtml(v.name)}</span></li>`).join('')
    : '<li class="empty">还没有快照。定稿前先存一份。</li>';

  return `
  <section class="hero"><div><h1>${escapeHtml(displayTitle(draft.name))}</h1>
    <p class="muted">目标读者：${escapeHtml(draft.data.audience || '未填写')}　｜　来源选题：${escapeHtml(
      String(draft.data.topic || '—')
    )}</p></div>
    <div class="hero-actions"><a class="button" href="/drafts">返回列表</a></div>
  </section>
  <section class="card">
    <div class="steps">${bar}</div>
    <div class="draft-foot">
      ${next ? `<button class="primary" data-skill="draft.advance" ${paramsAttr({ path: draft.path, step: next[0] })}>推进到：${next[1]}</button>` : '<span class="pill ok">已完成</span>'}
      <button class="ghost" data-skill="draft.snapshot" ${paramsAttr({ path: draft.path })}>保存快照</button>
      <span class="muted small">当前 v${escapeHtml(String(draft.data.version ?? 1))}</span>
    </div>
  </section>
  <section class="card">
    <h2>正文</h2>
    <form class="form" data-skill="draft.updateSection">
      <input type="hidden" name="path" value="${escapeHtml(draft.path)}" />
      <input type="hidden" name="section" value="正文" />
      <textarea name="content" rows="14" placeholder="在这里写正文…">${escapeHtml(body)}</textarea>
      <div class="form-actions"><button class="primary" type="submit">保存正文</button></div>
    </form>
    <p class="muted small">只写入「## 正文」这一节，其他小节与 frontmatter 不动。</p>
  </section>
  <section class="grid-2">
    <div class="card"><h2>历史快照</h2><ul class="list">${versionRows}</ul></div>
    <div class="card"><h2>下一步</h2>
      <ul class="plain">
        <li>写文案：生成初稿后回到本页粘贴</li>
        <li>起标题：候选写进「标题候选」小节</li>
        <li>发布检查：勾选后推进到「发布」</li>
      </ul>
      <a class="link" href="/skills">调用 Skill →</a>
    </div>
  </section>`;
}

/* ---------------------------------------------------------------- 拆解与资产（M1） */




export function renderAnalysis({ analyses }) {
  const stages = [
    ['intake', '1 放入素材'],
    ['verify', '2 核对原文'],
    ['result', '3 拆解结果'],
  ];

  const blocks = stages
    .map(([key, label]) => {
      const items = analyses.filter((a) => a.data.stage === key);
      const rows = items.length
        ? items
            .map(
              (a) => `<li class="row row-stack">
                <span class="row-main">${escapeHtml(displayTitle(a.name))}</span>
                <span class="steps">${(a.data.sources || [])
                  .map((s) => `<span class="step">${escapeHtml(sourceLabel(s)).slice(0, 40)}</span>`)
                  .join('')}</span>
                ${key !== 'result' ? `<button class="ghost" data-skill="analysis.advance" ${paramsAttr({ path: a.path })}>推进</button>` : ''}
              </li>`
            )
            .join('')
        : '<li class="empty">—</li>';
      return `<div class="card"><h2>${label} <span class="count">${items.length}</span></h2><ul class="list">${rows}</ul></div>`;
    })
    .join('');

  return `
  <section class="hero"><div><h1>拆解与沉淀</h1><p class="muted">三步：放入素材 → 核对原文 → 拆解结果。结果里的做法再另行沉淀为资产。</p></div></section>
  <section class="stack">${blocks}</section>
  <section class="card" id="new">
    <h2>发起拆解</h2>
    <p class="muted small">素材一行一条：链接、文件路径或直接粘贴正文。至少一条。</p>
    <form class="form grid-form" data-skill="analysis.create">
      <label>标题 <input name="title" placeholder="例如：三篇封面爆款拆解" /></label>
      <label class="full">素材 <textarea name="sources" rows="6" required placeholder="https://...&#10;或粘贴正文"></textarea></label>
      <div class="form-actions"><button class="primary" type="submit">放入素材</button></div>
    </form>
  </section>`;
}

export function renderAssets({ assets }) {
  const counts = { angle: 0, structure: 0, opening: 0, title: 0 };
  for (const a of assets) {
    if (counts[a.data.assetType] !== undefined) counts[a.data.assetType] += 1;
  }

  const rows = assets.length
    ? assets
        .map(
          (a) => `<tr>
            <td>${escapeHtml(a.data.name || displayTitle(a.name))}</td>
            <td><span class="pill">${escapeHtml(ASSET_TYPE_LABELS[a.data.assetType] || a.data.assetType)}</span></td>
            <td>${escapeHtml(a.data.problem || '—')}</td>
            <td>${escapeHtml(a.data.why || '—')}</td>
            <td>${escapeHtml(String(a.data.source || '—')).replace(/^\[\[|\]\]$/g, '')}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="empty">暂无资产。先完成一次拆解，再把做法沉淀进来。</td></tr>';

  return `
  <section class="hero"><div><h1>资产库</h1><p class="muted">四类可复用资产：选题角度 / 文案结构 / 开场白 / 标题。跨选题复用，不随单篇稿件存亡。</p></div></section>
  <section class="stats">
    ${statCard('选题角度', counts.angle + ' 条', 'assetType = angle')}
    ${statCard('文案结构', counts.structure + ' 条', 'assetType = structure')}
    ${statCard('开场白', counts.opening + ' 条', 'assetType = opening')}
    ${statCard('标题', counts.title + ' 条', 'assetType = title')}
  </section>
  <section class="card">
    <h2>全部资产</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>名称</th><th>类型</th><th>适合解决什么问题</th><th>用户为什么关心</th><th>来源</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>
  <section class="card" id="new">
    <h2>沉淀一条资产</h2>
    <p class="muted small">「适合解决」与「用户为什么关心」必填：这两列决定了资产以后能不能被复用。</p>
    <form class="form grid-form" data-skill="asset.create">
      <label>名称 <input name="name" required placeholder="例如：用对比找到真正差异" /></label>
      <label>类型
        <select name="assetType">
          <option value="angle">选题角度</option>
          <option value="structure">文案结构</option>
          <option value="opening">开场白</option>
          <option value="title">标题</option>
        </select>
      </label>
      <label>适合解决什么问题 <input name="problem" required placeholder="展示结果、教方法、判断标准…" /></label>
      <label>用户为什么关心 <input name="why" required placeholder="反复拖延、选不出来、害怕走弯路…" /></label>
      <label class="full">结构或模板 <textarea name="skeleton" rows="4" placeholder="可留空，之后补"></textarea></label>
      <label>来源拆解 <input name="source" placeholder="[[拆解-xxx-2026-10-22]]" /></label>
      <div class="form-actions"><button class="primary" type="submit">入库</button></div>
    </form>
  </section>`;
}
