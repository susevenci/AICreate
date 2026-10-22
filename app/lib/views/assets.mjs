import {
  ASSET_TYPE_LABELS,
  displayTitle,
  escapeHtml,
  paramsAttr,
  sourceLabel,
  statCard,
} from './shared.mjs';

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
