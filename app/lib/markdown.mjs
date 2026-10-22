/**
 * markdown.mjs — Markdown 子集渲染
 *
 * 只服务只读镜像场景：不追求完整 CommonMark，只保证工作台笔记里实际出现的语法能正确渲染。
 * 安全：先整体转义 HTML，再做标记替换，杜绝注入。
 */

export function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 行内标记：代码 → 粗体 → 斜体 → 链接 → wikilink */
export function renderInline(input) {
  let s = escapeHtml(input);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000C${codes.length - 1}\u0000`;
  });
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const text = (label || target).trim();
    return `<span class="wikilink" title="${target.trim()}">${text}</span>`;
  });
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/\u0000C(\d+)\u0000/g, (_, idx) => `<code>${codes[Number(idx)]}</code>`);
  return s;
}

/** 块级渲染 */
export function renderMarkdown(input) {
  const text = String(input ?? '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  let list = null;

  const flushList = () => {
    if (!list) return;
    out.push(`<${list.type} class="md-list">${list.items.join('')}</${list.type}>`);
    list = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      flushList();
      const lang = fence[1] || '';
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(
        `<pre class="md-code"${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}><code>${escapeHtml(
          buf.join('\n')
        )}</code></pre>`
      );
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushList();
      i += 1;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushList();
      out.push('<hr />');
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      out.push(`<h${level} class="md-h">${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*\|/.test(line)) {
      flushList();
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(lines[i].trim());
        i += 1;
      }
      out.push(renderTable(rows));
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushList();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote class="md-quote">${renderMarkdown(buf.join('\n'))}</blockquote>`);
      continue;
    }

    const task = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line);
    if (task) {
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      const checked = task[1].toLowerCase() === 'x';
      list.items.push(
        `<li class="md-task"><span class="box${checked ? ' checked' : ''}">${checked ? '✓' : ''}</span>${renderInline(
          task[2]
        )}</li>`
      );
      i += 1;
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(`<li>${renderInline(bullet[1])}</li>`);
      i += 1;
      continue;
    }

    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ordered) {
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(`<li>${renderInline(ordered[1])}</li>`);
      i += 1;
      continue;
    }

    flushList();
    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6}\s|```|\s*>|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(`<p class="md-p">${renderInline(para.join(' '))}</p>`);
  }

  flushList();
  return out.join('\n');
}

function renderTable(rows) {
  if (rows.length === 0) return '';
  const cells = (row) =>
    row
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((c) => c.trim());
  const head = cells(rows[0]);
  const isDivider = (row) => /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(row) || /^\s*\|?\s*:?-{2,}/.test(row);
  const bodyRows = rows.slice(1).filter((r) => !isDivider(r));
  const thead = `<thead><tr>${head.map((h) => `<th>${renderInline(h)}</th>`).join('')}</tr></thead>`;
  const tbody = bodyRows.length
    ? `<tbody>${bodyRows
        .map((r) => `<tr>${cells(r).map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>`
    : '';
  return `<div class="md-table-wrap"><table class="md-table">${thead}${tbody}</table></div>`;
}

/** 从正文中取出某个二级标题下的内容 */
export function extractSection(body, heading) {
  const text = String(body ?? '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`).test(l));
  if (startIdx === -1) return '';
  const buf = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    buf.push(lines[i]);
  }
  return buf.join('\n').trim();
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
