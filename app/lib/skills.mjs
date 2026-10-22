/**
 * skills.mjs — Skill 注册表与运行参数渲染
 *
 * 两处来源，按 id 合并，用户目录优先：
 *   app/skills/{id}/       内置 Skill，随产品发布，保证空库也能初始化
 *   vault/.codex/skills/   用户自定义或覆盖同名内置 Skill
 *
 * 每个 Skill 一个目录，至少包含 SKILL.md；prompt.md / template.md 可选。
 * 本模块只做解析与渲染，不调用任何模型服务。
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VAULT_ROOT } from './vault.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { extractSection } from './markdown.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BUILTIN_SKILLS_DIR = path.join(HERE, '..', 'skills');
export const USER_SKILLS_DIR = path.join(VAULT_ROOT, '.codex', 'skills');

async function listDir(base) {
  try {
    const entries = await fs.readdir(base, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function readMeta(dir, id) {
  let raw;
  try {
    raw = await fs.readFile(path.join(dir, id, 'SKILL.md'), 'utf8');
  } catch {
    return null;
  }
  const { data, body } = parseFrontmatter(raw);
  return {
    id,
    dir,
    data,
    doc: body.trim(),
  };
}

function toSummary({ id, data, doc }) {
  return {
    id,
    name: data.name || id,
    subtitle: data.subtitle || '',
    stage: data.stage || 'other',
    kind: data.kind === 'action' ? 'action' : 'ai',
    action: data.action || '',
    version: data.version || '0.0.0',
    inputs: Array.isArray(data.inputs) ? data.inputs : [],
    optional: Array.isArray(data.optional) ? data.optional : [],
    outputs: Array.isArray(data.outputs) ? data.outputs : [],
    doc,
  };
}

export async function listSkills() {
  const builtin = await listDir(BUILTIN_SKILLS_DIR);
  const user = await listDir(USER_SKILLS_DIR);
  const ids = [...new Set([...builtin, ...user])];

  const skills = [];
  for (const id of ids) {
    const meta = (await readMeta(USER_SKILLS_DIR, id)) || (await readMeta(BUILTIN_SKILLS_DIR, id));
    if (!meta) continue;
    skills.push(toSummary(meta));
  }
  skills.sort((a, b) => a.stage.localeCompare(b.stage) || a.name.localeCompare(b.name));
  return skills;
}

export async function getSkill(id) {
  if (!/^[a-z0-9._-]+$/i.test(id)) return null;

  const meta = (await readMeta(USER_SKILLS_DIR, id)) || (await readMeta(BUILTIN_SKILLS_DIR, id));
  if (!meta) return null;

  const readSide = async (file) => {
    try {
      return (await fs.readFile(path.join(meta.dir, id, file), 'utf8')).trim();
    } catch {
      return '';
    }
  };

  const promptFile = await readSide('prompt.md');
  const templateFile = await readSide('template.md');
  const summary = toSummary(meta);

  return {
    ...summary,
    source: meta.dir === USER_SKILLS_DIR ? 'vault' : 'builtin',
    // 单文件 Skill 直接写在 SKILL.md 的对应小节里；多文件 Skill 优先取独立文件
    prompt: promptFile || extractSection(meta.doc, '任务指令'),
    template: templateFile || extractSection(meta.doc, '输出结构'),
  };
}

/** 必填参数 = inputs 减去 optional */
export function requiredInputs(skill) {
  return skill.inputs.filter((key) => !skill.optional.includes(key));
}

/** 缺失的必填参数 */
export function missingInputs(skill, params = {}) {
  return requiredInputs(skill).filter((key) => {
    const value = params[key];
    return value === undefined || value === null || String(value).trim() === '';
  });
}

/**
 * 渲染 prompt：替换 {{param}}，并拼上输出骨架与落盘约定。
 * 未提供的占位符保持原样，便于使用者发现漏填。
 */
export function renderPrompt(skill, params = {}) {
  let text = skill.prompt || '';
  for (const [key, value] of Object.entries(params)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    text = text.replace(pattern, String(value ?? '').trim());
  }
  const missing = missingInputs(skill, params);
  const sections = [text];
  if (skill.template) {
    sections.push('---\n\n## 输出骨架（必须保留字段与顺序）\n\n' + skill.template);
  }
  sections.push(
    [
      '---',
      '',
      '## 落盘约定',
      '',
      `1. 结果写入 \`01-收件箱/_ai-output/{YYYYMMDD-HHmm}-${skill.id}.md\`。`,
      '2. frontmatter 必须包含该实体在 `00-工作台/_schema.md` 中定义的字段。',
      '3. 文末追加「## 运行信息」：skill / version / runAt / inputRefs。',
      '4. 不要直接写入正式目录，等待人工确认。',
    ].join('\n')
  );
  return { prompt: sections.join('\n\n'), missing, version: skill.version };
}
