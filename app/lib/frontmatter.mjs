/**
 * frontmatter.mjs — YAML 子集解析与序列化
 *
 * 只支持工作台契约实际用到的语法，避免引入第三方 YAML 库：
 *   - 标量：字符串 / 数字 / 布尔 / null
 *   - 行内数组：[a, b, c]
 *   - 块数组：
 *       key:
 *         - a
 *         - b
 *   - 引号字符串："..." 或 '...'
 *
 * 不支持：嵌套对象、多行字符串、锚点、注释（行内 # 视为字符串内容）。
 */

const FM_DELIMITER = '---';

/** 解析 "---\n...\n---\n正文" 结构 */
export function parseFrontmatter(raw) {
  const text = String(raw ?? '').replace(/\r\n/g, '\n');
  if (!text.startsWith(FM_DELIMITER + '\n')) {
    return { data: {}, body: text, hasFrontmatter: false };
  }
  const endIdx = text.indexOf('\n' + FM_DELIMITER, FM_DELIMITER.length);
  if (endIdx === -1) {
    return { data: {}, body: text, hasFrontmatter: false };
  }
  const head = text.slice(FM_DELIMITER.length + 1, endIdx);
  const body = text.slice(endIdx + FM_DELIMITER.length + 1).replace(/^\n/, '');
  return { data: parseBlock(head), body, hasFrontmatter: true };
}

function parseBlock(block) {
  const out = {};
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    const rest = match[2];
    if (rest.trim() !== '') {
      out[key] = parseScalar(rest);
      continue;
    }
    const items = [];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      if (/^\s+-\s+/.test(next)) {
        items.push(parseScalar(next.replace(/^\s+-\s+/, '')));
        j += 1;
        continue;
      }
      if (next.trim() === '') {
        j += 1;
        continue;
      }
      break;
    }
    out[key] = items;
    i = j - 1;
  }
  return out;
}

function parseScalar(input) {
  const s = String(input).trim();
  if (s === '') return '';
  if (s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (inner === '') return [];
    return splitInline(inner).map((part) => parseScalar(part));
  }
  return s;
}

/** 行内数组按逗号切分，但尊重引号内的逗号 */
function splitInline(input) {
  const parts = [];
  let buf = '';
  let quote = '';
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = '';
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === ',') {
      parts.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim() !== '') parts.push(buf);
  return parts.map((p) => p.trim()).filter((p) => p !== '');
}

/** 序列化 frontmatter 数据为 YAML 文本 */
export function serializeFrontmatter(data) {
  const lines = [FM_DELIMITER];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (value.length <= 3 && value.every((v) => isSimple(v))) {
        lines.push(`${key}: [${value.map(serializeScalar).join(', ')}]`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - ${serializeScalar(item)}`);
      }
      continue;
    }
    lines.push(`${key}: ${serializeScalar(value)}`);
  }
  lines.push(FM_DELIMITER);
  return lines.join('\n');
}

function isSimple(value) {
  const s = String(value ?? '');
  return s.length <= 24 && !/[:#\[\]{}",\n]/.test(s);
}

function serializeScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = String(value);
  if (s === '') return '""';
  // YYYY-MM-DD 保持裸值，让 Obsidian / Dataview 识别为日期
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) return s;
  if (/^-?\d+(\.\d+)?$/.test(s) || s === 'true' || s === 'false' || s === 'null') {
    return `"${s}"`;
  }
  if (/[:#\[\]{}",\n]|^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

/** 组装完整笔记文本 */
export function composeNote(data, body) {
  const normalizedBody = String(body ?? '').replace(/\r\n/g, '\n');
  return `${serializeFrontmatter(data)}\n\n${normalizedBody.replace(/^\n+/, '')}\n`;
}
