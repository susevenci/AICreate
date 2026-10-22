/**
 * server.mjs — 本地 HTTP 服务（只读镜像 + 写回 API）
 *
 * 设计约束：
 *   - 无数据库、无 ORM、无前端框架；数据全部来自 vault/*.md
 *   - 所有写操作经 API 校验后回写 Markdown
 *   - 静态资源仅三个文件，直接读盘
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  VAULT_ROOT,
  HttpError,
  today,
  stamp,
  listByType,
  listRecentFiles,
  readNote,
  trashNote,
  ASSET_DIRS,
  readConfig,
  createNote,
  updateFields,
  updateSection,
  snapshotDraft,
  listSnapshots,
  updateConfig,
  validate,
  checkLinks,
  groupTopics,
  ledgerSummary,
  worksSummary,
} from './lib/vault.mjs';
import { getSkill, listSkills, renderPrompt, missingInputs } from './lib/skills.mjs';
import {
  layout,
  renderSetup,
  renderHome,
  renderTopics,
  renderDrafts,
  renderDraftDetail,
  renderLedger,
  renderAnalysis,
  renderAssets,
  renderWorks,
  renderSkills,
  renderSettings,
  parseChanges,
} from './lib/views.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.join(HERE, 'web');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';

// ---------------------------------------------------------------- 数据装载

async function loadHome() {
  const [tasks, drafts, ledgers, inbox, notes] = await Promise.all([
    listByType('task'),
    listByType('draft'),
    listByType('ledger'),
    listByType('inbox'),
    listRecentFiles('02-知识库', 5),
  ]);
  const day = today();
  const ym = day.slice(0, 7);
  const todayTasks = tasks.filter((t) => t.data.date === day && t.data.status !== 'done');
  const activeDrafts = drafts.filter((d) => d.data.status === 'active');
  return {
    tasks: todayTasks,
    drafts: activeDrafts,
    ledgers,
    notes,
    inbox: inbox.filter((n) => n.data.status === 'raw').slice(0, 5),
    ym,
    today: day,
    summary: ledgerSummary(ledgers, ym),
  };
}

async function loadTopicsPage(error) {
  const topics = await listByType('topic');
  return { topics, groups: groupTopics(topics), error };
}

async function loadDraftsPage(error) {
  const drafts = await listByType('draft');
  return { drafts, error };
}

async function loadLedgerPage(error) {
  const ledgers = await listByType('ledger');
  const ym = today().slice(0, 7);
  return { ledgers, ym, summary: ledgerSummary(ledgers, ym), error };
}

async function loadAnalysisPage(error) {
  const analyses = await listByType('analysis');
  return { analyses, error };
}

async function loadAssetsPage(error) {
  const assets = await listByType('asset');
  return { assets, error };
}

async function loadDraftDetail(name) {
  const relPath = `07-稿件/${name}.md`;
  const note = await readNote(relPath);
  const versions = await listSnapshots(relPath);
  return { draft: note, versions };
}

async function loadWorksPage(query) {
  const [works, metrics] = await Promise.all([listByType('work'), listByType('metric')]);
  const ym = today().slice(0, 7);
  const report = {
    imported: query.get('imported') === '1',
    created: Number(query.get('created') || 0),
    updated: Number(query.get('updated') || 0),
    skipped: Number(query.get('skipped') || 0),
  };
  return { works, metrics, ym, summary: worksSummary(works, metrics, ym), report };
}

// ---------------------------------------------------------------- HTTP 工具

function sendHtml(res, html, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function redirect(res, location) {
  res.writeHead(303, { Location: location });
  res.end();
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new HttpError(413, 'payload_too_large', '请求体超过 1MB');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  const type = (req.headers['content-type'] || '').toLowerCase();
  if (type.includes('application/json')) {
    if (!raw.trim()) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'body_invalid', '请求体不是合法 JSON');
    }
  }
  const params = new URLSearchParams(raw);
  const out = {};
  for (const [key, value] of params.entries()) out[key] = value;
  return out;
}

function isFormPost(req) {
  return (req.headers['content-type'] || '').includes('application/x-www-form-urlencoded');
}

function fail(req, res, err) {
  const status = err.status || 500;
  const payload = {
    ok: false,
    error: { code: err.code || 'internal_error', message: err.message, details: err.details },
  };
  if (isFormPost(req)) {
    sendHtml(res, `<pre class="error">${escape(payload.error.message)}</pre>`, status);
    return;
  }
  sendJson(res, status, payload);
}

function escape(input) {
  return String(input ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------------------------------------------------------------- 静态资源

const STATIC = {
  '/assets/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  '/assets/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
  '/favicon.ico': null,
};

async function serveStatic(res, pathname) {
  const entry = STATIC[pathname];
  if (entry === null) {
    res.writeHead(204);
    res.end();
    return true;
  }
  if (!entry) return false;
  const abs = path.join(WEB_ROOT, entry.file);
  const content = await fs.readFile(abs);
  res.writeHead(200, { 'Content-Type': entry.type, 'Cache-Control': 'no-store' });
  res.end(content);
  return true;
}

// ---------------------------------------------------------------- 业务动作

function topicBody({ title, problem, material, angle }) {
  return [
    `# ${title}`,
    '',
    '## 问题',
    '',
    problem,
    '',
    '## 材料',
    '',
    material,
    '',
    '## 角度',
    '',
    angle || '待补充',
    '',
    '## 备注',
    '',
  ].join('\n');
}

function draftBody({ title, audience }) {
  return [
    `# ${title}`,
    '',
    '## 思路',
    '',
    `目标读者与问题：${audience}`,
    '',
    '## 正文',
    '',
    '## 标题候选',
    '',
    '## 封面 brief',
    '',
    '## 发布检查',
    '',
    '- [ ] 标题含具体收益或冲突',
    '- [ ] 首段给出结论',
    '- [ ] 引用与数据已核对来源',
    '',
  ].join('\n');
}

function analysisBody(title, sourcesRaw) {
  return [
    `# ${title}`,
    '',
    '## 原文',
    '',
    sourcesRaw,
    '',
    '## 单篇结论',
    '',
    '## 横向比较',
    '',
    '## 可借鉴做法',
    '',
  ].join('\n');
}

function assetBody({ name, problem, why, skeleton }) {
  return [
    `# ${name}`,
    '',
    '## 用法',
    '',
    `- 适合解决：${problem}`,
    `- 用户为什么关心：${why}`,
    '',
    '## 示例',
    '',
    skeleton || '待补充',
    '',
  ].join('\n');
}

async function createTopic(payload) {
  const title = String(payload.title || '').trim();
  const problem = String(payload.problem || '').trim();
  const material = String(payload.material || '').trim();
  const angle = String(payload.angle || '').trim();
  const origin = String(payload.origin || 'thought').trim() || 'thought';

  const data = {
    type: 'topic',
    status: 'backlog',
    origin: [origin],
    problem,
    material,
    angle,
    fit: null,
    fitReason: '',
    refs: [],
    createdAt: today(),
    updatedAt: today(),
    tags: [],
  };

  const { ok: valid, errors } = validate('topic', { ...data, title });
  if (!valid) throw new HttpError(400, 'validation_failed', '字段校验未通过', errors);

  const created = await createNote({ type: 'topic', title, data, body: topicBody({ title, problem, material, angle }) });
  const dangling = await checkLinks(data);
  return {
    ...created,
    warnings: dangling.length
      ? [{ code: 'dangling_link', message: `引用的笔记不存在：${dangling.join('、')}` }]
      : [],
  };
}

async function createDraft(payload) {
  const title = String(payload.title || '').trim();
  const audience = String(payload.audience || '').trim();
  const topic = String(payload.topic || '').trim();

  const data = {
    type: 'draft',
    status: 'active',
    step: 'idea',
    audience,
    topic,
    platforms: [],
    assets: [],
    titles: [],
    cover: '',
    version: 1,
    createdAt: today(),
    updatedAt: today(),
  };

  const { ok: valid, errors } = validate('draft', data);
  if (!valid) throw new HttpError(400, 'validation_failed', '字段校验未通过', errors);
  if (!title) throw new HttpError(400, 'field_required', '标题不能为空');

  const created = await createNote({ type: 'draft', title, data, body: draftBody({ title, audience }) });
  const dangling = await checkLinks(data);
  return {
    ...created,
    warnings: dangling.length
      ? [{ code: 'dangling_link', message: `引用的笔记不存在：${dangling.join('、')}` }]
      : [],
  };
}

async function createLedger(payload) {
  const amount = Number(payload.amount);
  const data = {
    type: 'ledger',
    kind: String(payload.kind || 'income'),
    amount: Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0,
    date: String(payload.date || '').trim(),
    category: String(payload.category || '其他').trim(),
    work: '',
    note: String(payload.note || '').trim(),
    createdAt: today(),
  };

  const { ok: valid, errors } = validate('ledger', data);
  if (!valid) throw new HttpError(400, 'validation_failed', '字段校验未通过', errors);

  const label = data.kind === 'income' ? '收入' : '支出';
  const title = `${label}-${data.category}-${data.amount}`;
  const created = await createNote({ type: 'ledger', title, data, body: `# ${title}\n\n## 备注\n\n${data.note || '—'}\n` });
  const dangling = await checkLinks(data);
  return {
    ...created,
    warnings: dangling.length
      ? [{ code: 'dangling_link', message: `引用的笔记不存在：${dangling.join('、')}` }]
      : [],
  };
}

async function createTask(payload) {
  const title = String(payload.title || '').trim();
  const date = String(payload.date || '').trim();
  const data = {
    type: 'task',
    status: 'todo',
    date,
    priority: String(payload.priority || 'normal'),
    estimate: null,
    originDate: null,
    ref: '',
    source: 'manual',
    createdAt: today(),
  };

  const { ok: valid, errors } = validate('task', data);
  if (!valid) throw new HttpError(400, 'validation_failed', '字段校验未通过', errors);
  if (!title) throw new HttpError(400, 'field_required', '任务标题不能为空');

  return createNote({ type: 'task', title, data, body: `# ${title}\n\n## 说明\n\n` });
}

/** 收件箱文件名 20261022-1530-标题 → 标题 */
function humanizeInboxTitle(fileName) {
  return String(fileName ?? '')
    .replace(/^\d{8}-\d{4}-/, '')
    .trim();
}

async function createInbox(payload) {
  const title = String(payload.title || '').trim();
  if (!title) throw new HttpError(400, 'field_required', '内容不能为空');
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const data = { type: 'inbox', status: 'raw', capturedAt: stamp(now), tags: [] };
  return createNote({
    type: 'inbox',
    title: `${hhmm}-${title}`,
    data,
    body: `# ${title}\n\n${title}\n`,
  });
}

// ---------------------------------------------------------------- 路由

// ---------------------------------------------------------------- 动作型 Skill
// 所有页面入口都经由 Skill 调用；action 型 Skill 在此绑定确定性执行体，ai 型只渲染指令。

const TOPIC_STATUSES = ['backlog', 'researching', 'selected', 'in-production', 'archived'];
const DRAFT_STEPS = ['idea', 'copy', 'title', 'cover', 'checklist', 'publish'];

function metricBody(data) {
  return [
    `# ${data.work} ${data.date}`,
    '',
    '## 数据',
    '',
    `- 播放：${data.views}`,
    `- 咨询：${data.inquiries}`,
    `- 成交：${data.deals} 笔`,
    '',
  ].join('\n');
}

/** CSV 行格式：work,date,platform,views,inquiries,deals；首行可为表头 */
function parseMetricCsv(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim()))
    .filter((cells) => !/^(work|作品)$/i.test(cells[0] || ''));
}

function linkName(value) {
  return String(value || '')
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .replace(/\.md$/, '')
    .split('/')
    .pop();
}

async function upsertMetric({ work, date, platform, views, inquiries, deals, source }) {
  const notes = await listByType('metric');
  const existing = notes.find(
    (n) =>
      n.data.work === work &&
      String(n.data.date) === date &&
      String(n.data.platform || '') === String(platform || '')
  );
  if (existing) {
    const updated = await updateFields(existing.path, {
      views: Number(views) || 0,
      inquiries: Number(inquiries) || 0,
      deals: Number(deals) || 0,
      source,
    });
    return { path: updated.path, updated: true };
  }
  const data = {
    type: 'metric',
    work,
    date,
    platform: platform || '',
    views: Number(views) || 0,
    inquiries: Number(inquiries) || 0,
    deals: Number(deals) || 0,
    source,
    createdAt: today(),
  };
  const created = await createNote({
    type: 'metric',
    title: `${linkName(work)}-${date}${platform ? '-' + platform : ''}`,
    data,
    body: metricBody(data),
  });
  return { path: created.path, updated: false };
}

const ACTIONS = {
  'config.update': async (params, ctx) => {
    const name = String(params.name || '').trim();
    const platforms = String(params.platforms || '')
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const patch = { name };
    if (platforms.length) patch.platforms = platforms;
    if (params.theme === 'dark' || params.theme === 'light') patch.theme = params.theme;
    const line = `${today()} | 人工 | 更新配置：name=${name}${
      platforms.length ? `，platforms=${platforms.join('/')}` : ''
    }`;
    await updateConfig(patch, line);
    return { name, redirect: ctx.initialized ? '/settings?saved=1' : '/' };
  },

  'topic.create': async (params) => {
    const created = await createTopic(params);
    return { path: created.path, status: 'backlog', warnings: created.warnings || [] };
  },

  'topic.advance': async (params) => {
    const target = String(params.path || '');
    const status = String(params.status || '');
    if (!TOPIC_STATUSES.includes(status)) {
      throw new HttpError(400, 'enum_invalid', `非法状态：${status}`);
    }
    const current = (await listByType('topic')).find((n) => n.path === target);
    if (!current) throw new HttpError(404, 'not_found', '选题不存在');
    if (status === 'selected' && (!current.data.problem || !current.data.material)) {
      throw new HttpError(400, 'field_required', '「问题」与「材料」为空，不能置为已选定');
    }
    const note = await updateFields(target, { status, updatedAt: today() });
    return { path: note.path, status };
  },

  'draft.create': async (params) => {
    const created = await createDraft(params);
    return { path: created.path, step: 'idea', warnings: created.warnings || [] };
  },

  'draft.advance': async (params) => {
    const target = String(params.path || '');
    const step = String(params.step || '');
    if (!DRAFT_STEPS.includes(step)) throw new HttpError(400, 'enum_invalid', `非法步骤：${step}`);
    const current = (await listByType('draft')).find((n) => n.path === target);
    if (!current) throw new HttpError(404, 'not_found', '稿件不存在');
    if (!current.data.audience && step !== 'idea') {
      throw new HttpError(400, 'field_required', '缺少「这篇解决谁的什么问题」，不能进入文案之后');
    }
    const note = await updateFields(target, { step, updatedAt: today() });
    return { path: note.path, step };
  },

  'ledger.create': async (params) => {
    const created = await createLedger(params);
    return { path: created.path, amount: created.note.data.amount, warnings: created.warnings || [] };
  },

  'task.create': async (params) => {
    const created = await createTask(params);
    return { path: created.path, date: created.note.data.date || '' };
  },

  'task.done': async (params) => {
    const note = await updateFields(String(params.path || ''), { status: 'done' });
    return { path: note.path, status: 'done' };
  },

  'inbox.capture': async (params) => {
    const created = await createInbox(params);
    return { path: created.path };
  },

  'inbox.promote': async (params) => {
    const source = String(params.path || '');
    const target = String(params.target || 'topic');
    if (!['topic', 'note'].includes(target)) {
      throw new HttpError(400, 'enum_invalid', `不支持的目标类型：${target}`);
    }
    const note = await readNote(source);
    if (note.data.type !== 'inbox') {
      throw new HttpError(400, 'type_invalid', '只有收件箱笔记可以转换');
    }
    const title = humanizeInboxTitle(note.name) || '未命名';
    const content = note.body.replace(/^#\s+.*$/m, '').trim() || title;
    const tags = Array.isArray(note.data.tags) ? note.data.tags : [];

    if (target === 'topic') {
      const material = '待补充（收件箱转入）';
      const data = {
        type: 'topic',
        status: 'backlog',
        origin: ['note'],
        problem: content,
        material,
        angle: '',
        fit: null,
        fitReason: '',
        refs: [],
        createdAt: today(),
        updatedAt: today(),
        tags,
      };
      const created = await createNote({
        type: 'topic',
        title,
        data,
        body: topicBody({ title, problem: content, material, angle: '' }),
      });
      await trashNote(source);
      return { path: created.path, target, movedFrom: source };
    }

    const data = { type: 'note', createdAt: today(), updatedAt: today(), tags };
    const created = await createNote({
      type: 'note',
      title,
      data,
      body: `# ${title}\n\n${content}\n`,
    });
    await trashNote(source);
    return { path: created.path, target, movedFrom: source };
  },

  'analysis.create': async (params) => {
    const title = String(params.title || '').trim() || '未命名拆解';
    const sourcesRaw = String(params.sources || '').trim();
    const sources = sourcesRaw
      .split(/[\n,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sources.length === 0) throw new HttpError(400, 'field_required', '至少填写一条素材');
    const data = {
      type: 'analysis',
      stage: 'intake',
      sources,
      highlights: [],
      weaknesses: [],
      borrowable: [],
      patterns: [],
      assets: [],
      createdAt: today(),
      updatedAt: today(),
    };
    const created = await createNote({ type: 'analysis', title, data, body: analysisBody(title, sourcesRaw) });
    return { path: created.path, stage: 'intake' };
  },

  'analysis.advance': async (params) => {
    const note = await readNote(String(params.path || ''));
    if (note.data.type !== 'analysis') throw new HttpError(400, 'type_invalid', '不是拆解笔记');
    const order = ['intake', 'verify', 'result'];
    const idx = order.indexOf(String(note.data.stage || 'intake'));
    const next = order[Math.min(idx + 1, order.length - 1)];
    const updated = await updateFields(note.path, { stage: next, updatedAt: today() });
    return { path: updated.path, stage: next };
  },

  'asset.create': async (params) => {
    const assetType = String(params.assetType || 'angle');
    const dir = ASSET_DIRS[assetType];
    if (!dir) throw new HttpError(400, 'enum_invalid', `非法资产类型：${assetType}`);
    const name = String(params.name || '').trim();
    const problem = String(params.problem || '').trim();
    const why = String(params.why || '').trim();
    const skeleton = String(params.skeleton || '').trim();
    const source = String(params.source || '').trim();
    const data = {
      type: 'asset',
      assetType,
      name,
      problem,
      why,
      skeleton,
      example: '',
      source,
      createdAt: today(),
    };
    const { ok: valid, errors } = validate('asset', data);
    if (!valid) throw new HttpError(400, 'validation_failed', '字段校验未通过', errors);
    const created = await createNote({
      type: 'asset',
      title: name,
      data,
      dir,
      body: assetBody({ name, problem, why, skeleton }),
    });
    return { path: created.path, assetType };
  },

  'draft.updateSection': async (params) => {
    const sections = ['思路', '正文', '标题候选', '封面 brief', '发布检查'];
    const section = String(params.section || '');
    if (!sections.includes(section)) {
      throw new HttpError(400, 'enum_invalid', `非法小节：${section}`);
    }
    const note = await updateSection(String(params.path || ''), section, params.content);
    return { path: note.path, section };
  },

  'draft.snapshot': async (params) => {
    const result = await snapshotDraft(String(params.path || ''));
    return { path: result.path, version: result.version };
  },

  'topic.createFromNote': async (params) => {
    const note = await readNote(String(params.note || ''));
    if (note.data.type !== 'note') throw new HttpError(400, 'type_invalid', '来源必须是知识库笔记');
    const title = String(params.title || '').trim() || humanizeInboxTitle(note.name);
    const material = `[[${note.name}]]`;
    const data = {
      type: 'topic',
      status: 'backlog',
      origin: ['note'],
      problem: String(params.problem || '').trim() || title,
      material,
      angle: '',
      fit: null,
      fitReason: '',
      refs: [material],
      createdAt: today(),
      updatedAt: today(),
      tags: [],
    };
    const created = await createNote({
      type: 'topic',
      title,
      data,
      body: topicBody({ title, problem: data.problem, material, angle: '' }),
    });
    return { path: created.path, source: note.path };
  },

  'work.create': async (params) => {
    const draft = String(params.draft || '').trim();
    const publishDate = String(params.publishDate || '').trim();
    const platforms = String(params.platforms || '')
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const data = {
      type: 'work',
      draft: draft.startsWith('[[') ? draft : `[[${linkName(draft)}]]`,
      publishDate,
      platforms,
      urls: [],
      topic: '',
      createdAt: today(),
    };
    const { ok: valid, errors } = validate('work', data);
    if (!valid) throw new HttpError(400, 'validation_failed', '字段校验未通过', errors);
    const title = String(params.title || '').trim() || linkName(data.draft);
    const created = await createNote({
      type: 'work',
      title,
      data,
      body: `# ${title}\n\n## 数据\n\n- 发布日期：${publishDate}\n- 平台：${platforms.join('、')}\n`,
    });
    return { path: created.path, platforms };
  },

  'metric.upsert': async (params) => {
    const date = String(params.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(400, 'date_invalid', '日期格式必须为 YYYY-MM-DD');
    }
    const work = String(params.work || '');
    if (!work) throw new HttpError(400, 'field_required', 'work 不能为空');
    const result = await upsertMetric({
      work: work.startsWith('[[') ? work : `[[${linkName(work)}]]`,
      date,
      platform: String(params.platform || ''),
      views: params.views,
      inquiries: params.inquiries,
      deals: params.deals,
      source: 'manual',
    });
    return { path: result.path, updated: result.updated };
  },

  'metric.import': async (params) => {
    const rows = parseMetricCsv(params.csv);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];
    for (const row of rows) {
      const [workRaw, date, platform, views, inquiries, deals] = row;
      if (!workRaw || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
        skipped += 1;
        errors.push(`缺少作品或日期：${row.join(',')}`);
        continue;
      }
      const result = await upsertMetric({
        work: workRaw.startsWith('[[') ? workRaw : `[[${linkName(workRaw)}]]`,
        date,
        platform: platform || '',
        views,
        inquiries,
        deals,
        source: 'csv',
      });
      if (result.updated) updated += 1;
      else created += 1;
    }
    return {
      created,
      updated,
      skipped,
      errors,
      redirect: `/works?imported=1&created=${created}&updated=${updated}&skipped=${skipped}`,
    };
  },
};

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const method = req.method || 'GET';

  if (method === 'GET' && (await serveStatic(res, pathname))) return;

  const configNote = await readConfig();
  const config = configNote.data;
  const initialized = Boolean(config.name && String(config.name).trim());

  // 未初始化：除 /setup、静态资源、API 外一律引导到配置页
  if (!initialized && !pathname.startsWith('/setup') && !pathname.startsWith('/api')) {
    return redirect(res, '/setup');
  }

  if (method === 'GET') {
    if (pathname.startsWith('/drafts/')) {
      const name = decodeURIComponent(pathname.slice('/drafts/'.length));
      try {
        const data = await loadDraftDetail(name);
        return sendHtml(
          res,
          layout({
            config,
            active: 'drafts',
            title: '稿件详情',
            content: renderDraftDetail({ config, ...data }),
          })
        );
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) {
          return sendHtml(
            res,
            layout({ config, active: 'drafts', title: '稿件不存在', content: '<h1>404</h1><p>稿件不存在。</p>' }),
            404
          );
        }
        throw err;
      }
    }

    switch (pathname) {
      case '/':
      case '/index.html': {
        const data = await loadHome();
        return sendHtml(res, layout({ config, active: 'home', title: '首页', content: renderHome({ config, ...data }) }));
      }
      case '/topics': {
        const data = await loadTopicsPage(url.searchParams.get('error'));
        return sendHtml(res, layout({ config, active: 'topics', title: '选题池', content: renderTopics(data) }));
      }
      case '/drafts': {
        const data = await loadDraftsPage(url.searchParams.get('error'));
        return sendHtml(res, layout({ config, active: 'drafts', title: '创作', content: renderDrafts(data) }));
      }
      case '/ledger': {
        const data = await loadLedgerPage(url.searchParams.get('error'));
        return sendHtml(res, layout({ config, active: 'ledger', title: '收支', content: renderLedger(data) }));
      }
      case '/analysis': {
        const data = await loadAnalysisPage(url.searchParams.get('error'));
        return sendHtml(
          res,
          layout({ config, active: 'analysis', title: '拆解与沉淀', content: renderAnalysis(data) })
        );
      }
      case '/assets': {
        const data = await loadAssetsPage(url.searchParams.get('error'));
        return sendHtml(res, layout({ config, active: 'assets', title: '资产库', content: renderAssets(data) }));
      }
      case '/works': {
        const data = await loadWorksPage(url.searchParams);
        return sendHtml(res, layout({ config, active: 'works', title: '发布与经营', content: renderWorks(data) }));
      }
      case '/skills': {
        const skills = await listSkills();
        return sendHtml(res, layout({ config, active: 'skills', title: '常用助手', content: renderSkills({ skills }) }));
      }
      case '/settings': {
        const changes = parseChanges(configNote.body);
        return sendHtml(
          res,
          layout({
            config,
            active: 'settings',
            title: '设置',
            content: renderSettings({ config, changes, saved: url.searchParams.get('saved') === '1' }),
          })
        );
      }
      case '/setup': {
        if (initialized) return redirect(res, '/');
        return sendHtml(res, renderSetup({}));
      }
      case '/api/health': {
        return sendJson(res, 200, {
          ok: true,
          vault: VAULT_ROOT,
          initialized,
          name: config.name || '',
          schemaVersion: config.schemaVersion || '',
        });
      }
      default:
        return sendHtml(res, layout({ config, active: '', title: '未找到', content: '<h1>404</h1><p>页面不存在。</p>' }), 404);
    }
  }

  if (method === 'POST') {
    const payload = await readBody(req);
    const match = /^\/api\/skills\/([^/]+)\/run$/.exec(pathname);
    if (!match) throw new HttpError(404, 'not_found', `接口不存在：${pathname}`);

    const skill = await getSkill(match[1]);
    if (!skill) throw new HttpError(404, 'not_found', `Skill 不存在：${match[1]}`);

    const missing = missingInputs(skill, payload);
    if (missing.length > 0) {
      throw new HttpError(
        400,
        'field_required',
        `缺少必填参数：${missing.join('、')}`,
        missing.map((field) => ({ field, message: `缺少 ${field}` }))
      );
    }

    if (skill.kind === 'ai') {
      const rendered = renderPrompt(skill, payload);
      return sendJson(res, 200, {
        ok: true,
        data: { kind: 'ai', skill: skill.id, ...rendered },
      });
    }

    const handler = ACTIONS[skill.action];
    if (!handler) throw new HttpError(500, 'skill_broken', `Skill 未绑定可执行动作：${skill.action}`);

    const result = await handler(payload, { initialized });
    if (isFormPost(req)) return redirect(res, result.redirect || req.headers.referer || '/');
    return sendJson(res, 200, {
      ok: true,
      data: { kind: 'action', skill: skill.id, version: skill.version, ...result },
    });
  }

  throw new HttpError(405, 'method_not_allowed', `不支持的方法：${method}`);
}

// ---------------------------------------------------------------- 启动

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (err) {
    if (!(err instanceof HttpError)) {
      console.error('[workbench]', err);
    }
    try {
      fail(req, res, err);
    } catch {
      res.writeHead(500);
      res.end('internal error');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AI 内容工作台已启动：http://${HOST}:${PORT}`);
  console.log(`数据目录：${VAULT_ROOT}`);
});
