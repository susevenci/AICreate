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

export function renderWorks({ works, metrics, ym, summary, report }) {
  const workRows = works.length
    ? works
        .map(
          (w) => `<li class="row"><span class="row-main">${escapeHtml(displayTitle(w.name))}</span>
            <span class="pill">${escapeHtml(String(w.data.publishDate || '—'))}</span>
            <span class="muted small">${escapeHtml((w.data.platforms || []).join('、') || '—')}</span></li>`
        )
        .join('')
    : '<li class="empty">还没有作品。发布后在上方登记一条。</li>';

  const metricRows = metrics.length
    ? metrics
        .map(
          (m) => `<tr><td>${escapeHtml(String(m.data.work || '—')).replace(/^\[\[|\]\]$/g, '')}</td>
            <td>${escapeHtml(String(m.data.date || '缺失'))}</td>
            <td>${escapeHtml(m.data.platform || '—')}</td>
            <td class="num">${m.data.views ?? 0}</td>
            <td class="num">${m.data.inquiries ?? 0}</td>
            <td class="num">${m.data.deals ?? 0}</td>
            <td>${escapeHtml(m.data.source || '—')}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="7" class="empty">暂无指标</td></tr>';

  return `
  <section class="hero"><div><h1>发布与经营</h1><p class="muted">${escapeHtml(ym)}　同一内容多平台只记一条作品；播放、咨询、成交三口径互不推算。</p></div></section>
  ${report.imported ? `<div class="notice okbox">导入完成：新建 ${report.created} 条，更新 ${report.updated} 条，跳过 ${report.skipped} 条。</div>` : ''}
  ${summary.missingDate > 0 ? `<div class="notice warnbox">数据质量：${summary.missingDate} 条指标缺少日期，未计入月度统计。</div>` : ''}
  <section class="stats">
    ${statCard('本月发布', summary.published + ' 篇', 'publishDate 落在本月')}
    ${statCard('本月成交', summary.deals + ' 笔', '按记录数，不去重')}
    ${statCard('作品总数', summary.works + ' 条', '跨平台只记一条')}
    ${statCard('本月播放', String(summary.views), 'playback 与成交不互相推算')}
  </section>
  <section class="grid-2">
    <div class="card"><h2>作品画册</h2><ul class="list">${workRows}</ul></div>
    <div class="card"><h2>登记作品</h2>
      <form class="form grid-form" data-skill="work.create">
        <label>作品标题 <input name="title" required placeholder="发布后的标题" /></label>
        <label>原稿 <input name="draft" required placeholder="稿件-xxx-2026-10-22" /></label>
        <label>发布日期 <input name="publishDate" type="date" required value="${escapeHtml(ym)}-01" /></label>
        <label>平台 <input name="platforms" placeholder="小红书, 公众号" /></label>
        <div class="form-actions"><button class="primary" type="submit">登记</button></div>
      </form>
    </div>
  </section>
  <section class="card">
    <h2>指标明细</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>作品</th><th>日期</th><th>平台</th><th>播放</th><th>咨询</th><th>成交</th><th>来源</th></tr></thead>
      <tbody>${metricRows}</tbody>
    </table></div>
  </section>
  <section class="card">
    <h2>导入数据</h2>
    <p class="muted small">每行：作品,日期,平台,播放,咨询,成交。首行可为表头；日期缺失的行会被跳过并计入报告。当前为手工录入 / 后台导出，未接入抓取。</p>
    <form class="form" data-skill="metric.import">
      <textarea name="csv" rows="6" required placeholder="作品-xxx,2026-10-01,小红书,3200,5,1"></textarea>
      <div class="form-actions"><button class="primary" type="submit">导入</button></div>
    </form>
  </section>`;
}

/* ---------------------------------------------------------------- 稿件详情（M2） */
