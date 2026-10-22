/**
 * vault.mjs — Markdown 真相源访问层
 *
 * 唯一数据入口：所有读写都经过本模块，保证路径安全、字段校验、命名规范一致。
 * 不引入数据库，不做缓存，每次读取即读文件。
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, composeNote } from './frontmatter.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const VAULT_ROOT = path.resolve(
  process.env.WORKBENCH_VAULT || path.join(HERE, '..', '..', 'vault')
);

export const CONFIG_PATH = '00-工作台/_配置.md';

/** type → 目录（相对 vault） */
export const DIRS = {
  topic: '04-选题',
  draft: '07-稿件',
  ledger: '10-收支',
  task: '09-计划/任务',
  inbox: '01-收件箱',
  note: '02-知识库',
  analysis: '05-拆解',
  asset: '06-资产',
  source: '03-对标/作品',
  work: '08-作品/作品',
  metric: '08-作品/指标',
};

/** 资产按 assetType 落子目录 */
export const ASSET_DIRS = {
  angle: '06-资产/选题角度',
  structure: '06-资产/文案结构',
  opening: '06-资产/开场白',
  title: '06-资产/标题',
};

const NAME_PREFIX = {
  topic: '选题',
  draft: '稿件',
  ledger: '流水',
  task: '任务',
  note: '',
  inbox: '',
  analysis: '拆解',
  asset: '资产',
  source: '对标',
};

/** 允许的业务类型（与 _schema.md 第 3 节一致） */
export const TYPES = [
  'config',
  'schema',
  'page',
  'topic',
  'draft',
  'ledger',
  'task',
  'inbox',
  'note',
  'analysis',
  'asset',
  'source',
  'skill',
];

export const ENUMS = {
  'topic.status': ['backlog', 'researching', 'selected', 'in-production', 'archived'],
  'topic.origin': ['course', 'comment', 'published', 'note', 'thought', 'benchmark'],
  'draft.status': ['active', 'done', 'dropped'],
  'draft.step': ['idea', 'copy', 'title', 'cover', 'checklist', 'publish'],
  'ledger.kind': ['income', 'expense'],
  'task.status': ['todo', 'doing', 'done', 'unscheduled'],
  'task.priority': ['high', 'normal', 'low'],
  'task.source': ['manual', 'ai'],
  'inbox.status': ['raw', 'processing', 'done'],
  'analysis.stage': ['intake', 'verify', 'result'],
  'asset.assetType': ['angle', 'structure', 'opening', 'title'],
  'source.sourceLevel': ['L0', 'L1'],
  'metric.source': ['manual', 'csv'],
};

/** 必填字段（_schema.md 第 4 节） */
export const REQUIRED = {
  topic: ['type', 'status', 'origin', 'problem', 'material', 'createdAt', 'updatedAt'],
  draft: ['type', 'status', 'step', 'audience', 'version', 'createdAt', 'updatedAt'],
  ledger: ['type', 'kind', 'amount', 'date', 'category', 'createdAt'],
  task: ['type', 'status', 'priority', 'source', 'createdAt'],
  inbox: ['type', 'status', 'capturedAt'],
  note: ['type', 'createdAt', 'updatedAt'],
  analysis: ['type', 'stage', 'sources', 'createdAt', 'updatedAt'],
  asset: ['type', 'assetType', 'name', 'problem', 'why', 'createdAt'],
  source: ['type', 'platform', 'sourceLevel', 'createdAt'],
  work: ['type', 'draft', 'publishDate', 'platforms', 'createdAt'],
  metric: ['type', 'work', 'date', 'source', 'createdAt'],
};

// ---------------------------------------------------------------- 基础工具

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(
    date.getHours()
  )}:${p(date.getMinutes())}:${p(date.getSeconds())}+08:00`;
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** 路径必须落在 vault 内，且不允许隐藏目录 */
export function safeResolve(relPath) {
  const target = path.resolve(VAULT_ROOT, relPath);
  const rel = path.relative(VAULT_ROOT, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new HttpError(400, 'path_invalid', `路径越界：${relPath}`);
  }
  if (rel.split(/[\\/]/).some((seg) => seg.startsWith('.'))) {
    throw new HttpError(400, 'path_invalid', `不允许访问隐藏路径：${relPath}`);
  }
  return target;
}

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sanitizeName(input) {
  return String(input ?? '')
    .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// ---------------------------------------------------------------- 读

/** 读取单篇笔记 */
export async function readNote(relPath) {
  const abs = safeResolve(relPath);
  let raw;
  try {
    raw = await fs.readFile(abs, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') throw new HttpError(404, 'not_found', `笔记不存在：${relPath}`);
    throw err;
  }
  const { data, body, hasFrontmatter } = parseFrontmatter(raw);
  const stat = await fs.stat(abs);
  return {
    path: relPath.replace(/\\/g, '/'),
    name: path.basename(relPath).replace(/\.md$/, ''),
    data,
    body,
    hasFrontmatter,
    mtime: stat.mtime.toISOString(),
    raw,
  };
}

/** 列出某目录下全部 md（递归），自动跳过隐藏目录与模板 */
export async function listFiles(relDir) {
  const abs = safeResolve(relDir);
  const result = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;
      result.push(path.relative(VAULT_ROOT, full).replace(/\\/g, '/'));
    }
  }
  await walk(abs);
  return result;
}

/** 目录下最近修改的 N 个文件（不解析 frontmatter，用于首页常用资料） */
export async function listRecentFiles(relDir, limit = 5) {
  const files = await listFiles(relDir);
  const rows = [];
  for (const file of files) {
    try {
      const stat = await fs.stat(safeResolve(file));
      rows.push({
        name: path.basename(file).replace(/\.md$/, ''),
        path: file,
        mtime: stat.mtime.toISOString(),
      });
    } catch {
      // 文件在扫描后删除时跳过，不影响其余条目
    }
  }
  rows.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return rows.slice(0, limit);
}

/** 按类型列出笔记，返回解析后的数组（按 mtime 倒序） */
export async function listByType(type) {
  const dir = DIRS[type];
  if (!dir) throw new HttpError(400, 'type_invalid', `未定义目录的类型：${type}`);
  const files = await listFiles(dir);
  const notes = [];
  for (const file of files) {
    const note = await readNote(file);
    if (note.data && note.data.type === type) notes.push(note);
  }
  notes.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return notes;
}

export async function readConfig() {
  const note = await readNote(CONFIG_PATH);
  return { ...note, data: { ...note.data } };
}

// ---------------------------------------------------------------- 校验

/** 按 _schema.md 第 5 节执行校验，返回 { ok, errors, warnings } */
export function validate(type, data) {
  const errors = [];
  const warnings = [];

  if (!TYPES.includes(type)) {
    errors.push({ code: 'type_invalid', field: 'type', message: `未知类型：${type}` });
    return { ok: false, errors, warnings };
  }
  if (data.type !== type) {
    errors.push({ code: 'type_invalid', field: 'type', message: `type 必须为 ${type}` });
  }

  for (const field of REQUIRED[type] || []) {
    const value = data[field];
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);
    if (empty) {
      errors.push({ code: 'field_required', field, message: `必填字段为空：${field}` });
    }
  }

  for (const [key, allowed] of Object.entries(ENUMS)) {
    const [owner, field] = key.split('.');
    if (owner !== type) continue;
    const value = data[field];
    if (value === undefined || value === null || value === '') continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (!allowed.includes(item)) {
        errors.push({
          code: 'enum_invalid',
          field,
          message: `${field} 取值非法：${item}，允许：${allowed.join(' / ')}`,
        });
      }
    }
  }

  if (type === 'ledger') {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ code: 'amount_invalid', field: 'amount', message: 'amount 必须为正数' });
    } else if (Math.round(amount * 100) !== Number((amount * 100).toFixed(0))) {
      errors.push({ code: 'amount_invalid', field: 'amount', message: 'amount 最多两位小数' });
    }
  }

  if (data.date !== undefined && data.date !== null && data.date !== '' && !isValidDate(data.date)) {
    errors.push({ code: 'date_invalid', field: 'date', message: `日期格式非法：${data.date}` });
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** 引用完整性：wikilink 指向的文件是否存在（放行 + 标记） */
export async function checkLinks(data) {
  const links = [];
  const collect = (value) => {
    if (typeof value === 'string') {
      const m = /^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/.exec(value.trim());
      if (m) links.push(m[1].trim());
      return;
    }
    if (Array.isArray(value)) value.forEach(collect);
  };
  for (const key of ['refs', 'topic', 'ref', 'work', 'assets', 'recordCard']) collect(data[key]);

  const dangling = [];
  for (const link of links) {
    const noteName = `${link}.md`;
    const found = await findByName(noteName);
    if (!found) dangling.push(link);
  }
  return dangling;
}

async function findByName(fileName) {
  const candidates = ['04-选题', '05-拆解', '07-稿件', '08-作品/作品', '09-计划/任务', '10-收支', '02-知识库'];
  for (const dir of candidates) {
    const files = await listFiles(dir);
    if (files.some((f) => path.basename(f) === fileName)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- 写

/** 创建笔记：自动编号防重名，落盘后返回最终路径 */
export async function createNote({ type, title, data, body, dateStr, dir: dirOverride }) {
  const dir = dirOverride || DIRS[type];
  if (!dir) throw new HttpError(400, 'type_invalid', `不支持创建的类型：${type}`);

  const cleanTitle = sanitizeName(title);
  if (!cleanTitle) throw new HttpError(400, 'field_required', '标题不能为空');

  const day = dateStr || today();
  const prefix = NAME_PREFIX[type];
  const compactDay = day.replace(/-/g, '');
  const base =
    type === 'inbox'
      ? `${compactDay}-${cleanTitle}`
      : type === 'note'
        ? cleanTitle
        : `${prefix}-${cleanTitle}-${day}`;
  const relPath = await uniquePath(dir, base);

  const payload = { ...data, type };
  const text = composeNote(payload, body);
  const abs = safeResolve(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, text, 'utf8');
  return { path: relPath, note: await readNote(relPath) };
}

async function uniquePath(dir, base) {
  for (let i = 1; i <= 50; i += 1) {
    const name = i === 1 ? `${base}.md` : `${base}-${i}.md`;
    const rel = `${dir}/${name}`;
    try {
      await fs.access(safeResolve(rel));
    } catch {
      return rel;
    }
  }
  throw new HttpError(409, 'file_exists', `同名文件过多：${base}`);
}

/** 局部更新字段：只改 frontmatter，保留正文 */
export async function updateFields(relPath, patch) {
  const note = await readNote(relPath);
  const merged = { ...note.data, ...patch };
  const text = composeNote(merged, note.body);
  await fs.writeFile(safeResolve(relPath), text, 'utf8');
  return readNote(relPath);
}

/** 在「## 变更记录」下插入一行，保证每条记录独立成行 */
export function appendChangeLine(body, changeLine) {
  const heading = '## 变更记录';
  const entry = `- ${String(changeLine).replace(/\s+/g, ' ').trim()}`;
  const idx = body.indexOf(heading);

  if (idx === -1) {
    const head = body.replace(/\s+$/, '');
    return `${head}\n\n${heading}\n\n${entry}\n`;
  }

  const lineEnd = body.indexOf('\n', idx);
  const head = lineEnd === -1 ? `${body}\n` : body.slice(0, lineEnd + 1);
  const rest = lineEnd === -1 ? '' : body.slice(lineEnd + 1).replace(/^\n+/, '');
  const next = `${head}\n${entry}\n${rest ? `\n${rest}` : ''}`;
  return next.replace(/\n{3,}/g, '\n\n');
}

/** 更新配置：追加变更记录 */
export async function updateConfig(patch, changeLine) {
  const note = await readConfig();
  const merged = { ...note.data, ...patch, updatedAt: today() };
  const body = changeLine ? appendChangeLine(note.body, changeLine) : note.body;
  await fs.writeFile(safeResolve(CONFIG_PATH), composeNote(merged, body), 'utf8');
  return readConfig();
}

/** 软删除：移动到 .trash，保留原路径信息 */
export async function trashNote(relPath) {
  const note = await readNote(relPath);
  const day = today();
  const targetDir = `.trash/${day}`;
  await fs.mkdir(safeResolveKeepHidden(targetDir), { recursive: true });
  const target = `${targetDir}/${path.basename(relPath)}`;
  await fs.rename(safeResolve(relPath), safeResolveKeepHidden(target));
  return { movedTo: target, title: note.name };
}

/** .trash 是隐藏目录，需要单独放行 */
function safeResolveKeepHidden(relPath) {
  const target = path.resolve(VAULT_ROOT, relPath);
  const rel = path.relative(VAULT_ROOT, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new HttpError(400, 'path_invalid', `路径越界：${relPath}`);
  }
  return target;
}

/** 只替换某个二级小节的内容，其余小节与字段不动 */
export async function updateSection(relPath, heading, content) {
  const note = await readNote(relPath);
  const lines = note.body.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) throw new HttpError(400, 'section_not_found', `正文缺少小节：${heading}`);

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const next = [
    ...lines.slice(0, start + 1),
    '',
    String(content ?? '').trim(),
    '',
    ...lines.slice(end),
  ];
  await fs.writeFile(safeResolve(relPath), composeNote(note.data, next.join('\n')), 'utf8');
  return readNote(relPath);
}

/** 把稿件当前内容存一份快照，返回版本号 */
export async function snapshotDraft(relPath) {
  const note = await readNote(relPath);
  const dir = '07-稿件/_versions';
  const base = path.basename(relPath).replace(/\.md$/, '');
  const files = await listFiles(dir);
  const count = files.filter((f) => path.basename(f).startsWith(`${base}-v`)).length;
  const target = `${dir}/${base}-v${count + 1}.md`;
  await fs.mkdir(safeResolve(dir), { recursive: true });
  await fs.writeFile(safeResolve(target), note.raw, 'utf8');
  return { path: target, version: count + 1 };
}

/** 列出某稿件的历史快照 */
export async function listSnapshots(relPath) {
  const base = path.basename(relPath).replace(/\.md$/, '');
  const files = await listFiles('07-稿件/_versions');
  return files
    .filter((f) => path.basename(f).startsWith(`${base}-v`))
    .sort()
    .map((f) => ({ path: f, name: path.basename(f).replace(/\.md$/, '') }));
}

// ---------------------------------------------------------------- 派生统计

export function groupTopics(notes) {
  const groups = {
    backlog: [],
    researching: [],
    selected: [],
    'in-production': [],
    archived: [],
  };
  for (const note of notes) {
    const key = note.data.status;
    if (groups[key]) groups[key].push(note);
  }
  return groups;
}

export function monthOf(value) {
  if (!value) return '';
  return String(value).slice(0, 7);
}

/** 作品与指标的口径汇总：成交按条数，播放不推成交 */
export function worksSummary(works, metrics, ym) {
  const published = works.filter((w) => monthOf(w.data.publishDate) === ym);
  const current = metrics.filter((m) => monthOf(m.data.date) === ym);
  const sum = (key) => current.reduce((s, m) => s + (Number(m.data[key]) || 0), 0);
  return {
    published: published.length,
    works: works.length,
    deals: current.reduce((s, m) => s + (Number(m.data.deals) || 0), 0),
    views: sum('views'),
    metrics: current.length,
    missingDate: metrics.filter((m) => !m.data.date).length,
  };
}

export function ledgerSummary(notes, ym) {
  const current = notes.filter((n) => monthOf(n.data.date) === ym);
  const sum = (kind) => current.filter((n) => n.data.kind === kind).reduce((s, n) => s + (Number(n.data.amount) || 0), 0);
  const income = sum('income');
  const expense = sum('expense');
  return {
    income,
    expense,
    net: income - expense,
    count: current.length,
    missingDate: notes.filter((n) => !n.data.date).length,
    total: notes.length,
  };
}
