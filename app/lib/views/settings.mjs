import { escapeHtml, paramsAttr } from './shared.mjs';

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
