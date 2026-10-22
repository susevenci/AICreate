/**
 * verify.mjs — 端到端验收脚本（Skill 驱动版）
 *
 * 全部写操作只走 POST /api/skills/:id/run，与浏览器行为一致。
 * 断言覆盖：初始化引导、配置回写、四类对象创建、状态推进、字段校验、
 * 口径正确性、Skill 注册表、AI 指令渲染、旧接口下线、页面无直连入口。
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

let BASE = process.env.BASE || '';
const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let child = null;

/** 未指定 BASE 时自建临时服务，避免端口残留于扰 */
async function startServer() {
  const port = String(4300 + Math.floor(Math.random() * 400));
  const base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: APP_DIR,
    env: { ...process.env, PORT: port },
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return base;
    } catch {
      // 服务还没就绪，继续等
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('临时服务未能启动');
}

function stopServer() {
  if (child) {
    child.kill();
    child = null;
  }
}
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VAULT = path.resolve(HERE, '..', '..', 'vault');

let passed = 0;
let failed = 0;
const lines = [];

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    lines.push(`PASS  ${name}`);
  } else {
    failed += 1;
    lines.push(`FAIL  ${name}${detail ? '  → ' + detail : ''}`);
  }
}

async function get(pathname) {
  const res = await fetch(BASE + pathname, { redirect: 'manual' });
  return { status: res.status, location: res.headers.get('location'), text: await res.text() };
}

async function post(pathname, body) {
  const res = await fetch(BASE + pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function skill(id, params) {
  return post(`/api/skills/${id}/run`, params);
}

async function exists(relPath) {
  try {
    await fs.access(path.join(VAULT, relPath));
    return true;
  } catch {
    return false;
  }
}

/** 在 .trash 下递归查找同名文件 */
async function existsInTrash(fileName) {
  const stack = [path.join(VAULT, '.trash')];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === fileName) return true;
    }
  }
  return false;
}

async function readLedgerSum() {
  const dir = path.join(VAULT, '10-收支');
  const ym = new Date().toISOString().slice(0, 7);
  const files = await fs.readdir(dir).catch(() => []);
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const { data } = parseFrontmatter(await fs.readFile(path.join(dir, file), 'utf8'));
    if (data.type !== 'ledger') continue;
    if (String(data.date || '').slice(0, 7) !== ym) continue;
    count += 1;
    if (data.kind === 'income') income += Number(data.amount) || 0;
    if (data.kind === 'expense') expense += Number(data.amount) || 0;
  }
  return { income, expense, net: income - expense, count };
}

async function main() {
  if (!BASE) BASE = await startServer();
  // 1. 健康检查与初始化引导
  const health = await get('/api/health');
  check('GET /api/health 返回 200', health.status === 200, `status=${health.status}`);
  const h0 = JSON.parse(health.text);
  check('健康检查暴露 vault 路径', typeof h0.vault === 'string' && h0.vault.length > 0);

  if (!h0.initialized) {
    const rootRedirect = await get('/');
    check('未初始化时首页 303 到 /setup', rootRedirect.status === 303, `status=${rootRedirect.status}`);
  }

  // 2. 配置经 config.update Skill 写入
  const cfg = await skill('config.update', { name: '我的AI内容工作台', platforms: '小红书, 公众号' });
  check('config.update 写入名称', cfg.status === 200 && cfg.json?.data?.kind === 'action', `status=${cfg.status}`);

  const configFile = await fs.readFile(path.join(VAULT, '00-工作台/_配置.md'), 'utf8');
  check('名称已回写 _配置.md', configFile.includes('name: 我的AI内容工作台'));
  check('变更记录已追加', configFile.includes('更新配置：name=我的AI内容工作台'));

  // 回归：连续两次写入必须得到两条独立记录，不得粘连
  await skill('config.update', { name: '我的AI内容工作台', platforms: '小红书, 公众号' });
  const cfgText = await fs.readFile(path.join(VAULT, '00-工作台/_配置.md'), 'utf8');
  const changeLines = cfgText.split('\n').filter((l) => l.startsWith('- ') && l.includes('更新配置'));
  check('变更记录独立成行', changeLines.length >= 2, `count=${changeLines.length}`);
  check(
    '无记录粘连',
    changeLines.every((l) => (l.match(/更新配置/g) || []).length === 1),
    changeLines.find((l) => (l.match(/更新配置/g) || []).length > 1) || ''
  );

  const emptyCfg = await skill('config.update', { name: '   ' });
  check('空名称被拒绝', emptyCfg.status === 400 && emptyCfg.json?.error?.code === 'field_required', `status=${emptyCfg.status}`);

  const health2 = await get('/api/health');
  const h2 = JSON.parse(health2.text);
  check('健康检查显示已初始化', h2.initialized === true && h2.name === '我的AI内容工作台');

  // 3. 首页
  const home = await get('/');
  check('首页返回 200', home.status === 200, `status=${home.status}`);
  check('首页渲染工作台名称', home.text.includes('我的AI内容工作台'));

  // 4. 选题：缺参拒绝 → 创建 → 推进
  const badTopic = await skill('topic.create', { title: '缺字段的选题' });
  check('选题缺必填字段被拒绝', badTopic.status === 400 && badTopic.json?.error?.code === 'field_required', `status=${badTopic.status}`);

  const topic = await skill('topic.create', {
    title: '为什么你的封面没人点',
    problem: '封面做了但点击率明显低于同类账号',
    material: '自己 3 个月 40 篇封面的点击率对比表',
    angle: '用对比找到真正差异',
    origin: 'comment',
  });
  check('topic.create 创建成功', topic.status === 200 && topic.json?.data?.kind === 'action', `status=${topic.status}`);
  const topicPath = topic.json?.data?.path;
  check('选题文件已落盘', Boolean(topicPath) && (await exists(topicPath)), `path=${topicPath}`);

  if (topicPath) {
    const raw = await fs.readFile(path.join(VAULT, topicPath), 'utf8');
    check('选题 frontmatter 含 status=backlog', raw.includes('status: backlog'));
    check('选题 frontmatter 含 origin', raw.includes('origin:'));
    check('选题正文含四节', ['## 问题', '## 材料', '## 角度', '## 备注'].every((h) => raw.includes(h)));

    const advance = await skill('topic.advance', { path: topicPath, status: 'researching' });
    check('topic.advance 推进到 researching', advance.status === 200 && advance.json?.data?.status === 'researching');
    const afterAdvance = await fs.readFile(path.join(VAULT, topicPath), 'utf8');
    check('状态已回写文件', afterAdvance.includes('status: researching'));

    const badAdvance = await skill('topic.advance', { path: topicPath, status: 'unknown' });
    check('非法状态被拒绝', badAdvance.status === 400, `status=${badAdvance.status}`);
  }

  const topicsPage = await get('/topics');
  check('选题池页可见新选题', topicsPage.status === 200 && topicsPage.text.includes('为什么你的封面没人点'));

  // 5. 收支：口径以文件合计为准
  const income = await skill('ledger.create', {
    kind: 'income',
    amount: 399,
    date: new Date().toISOString().slice(0, 10),
    category: '课程',
    note: '早鸟体验价',
  });
  check('ledger.create 记录收入', income.status === 200, `status=${income.status}`);

  const expense = await skill('ledger.create', {
    kind: 'expense',
    amount: 99.5,
    date: new Date().toISOString().slice(0, 10),
    category: '投放',
    note: '测试投放',
  });
  check('ledger.create 记录支出', expense.status === 200, `status=${expense.status}`);

  const badAmount = await skill('ledger.create', { kind: 'income', amount: -5, date: '2026-10-22', category: '课程' });
  check('负数金额被拒绝', badAmount.status === 400, `status=${badAmount.status}`);

  const badDate = await skill('ledger.create', { kind: 'income', amount: 10, date: '2026-02-30', category: '课程' });
  check('非法日期被拒绝', badDate.status === 400, `status=${badDate.status}`);

  const ledgerPage = await get('/ledger');
  const expected = await readLedgerSum();
  check('收支页返回 200', ledgerPage.status === 200);
  check(
    '页面净额与文件合计一致',
    ledgerPage.text.includes(`¥${expected.net.toFixed(2)}`),
    `expected=¥${expected.net.toFixed(2)}`
  );
  check('收支页显示口径说明', ledgerPage.text.includes('按流水金额合计，非笔数'));

  // 6. 稿件：断链标记 → 推进 → 缺 audience 拒绝
  const draft = await skill('draft.create', {
    title: '封面点击率的三个误区',
    audience: '做小红书图文但点击率低于 3% 的创作者',
    topic: '[[选题-不存在的笔记-20260101]]',
  });
  check('draft.create 创建成功', draft.status === 200, `status=${draft.status}`);
  check('断链被标记为警告', Array.isArray(draft.json?.data?.warnings) && draft.json.data.warnings.length === 1);
  const draftPath = draft.json?.data?.path;

  if (draftPath) {
    const step1 = await skill('draft.advance', { path: draftPath, step: 'copy' });
    check('draft.advance 推进到 copy', step1.status === 200 && step1.json?.data?.step === 'copy');
    const badStep = await skill('draft.advance', { path: draftPath, step: 'done' });
    check('非法步骤被拒绝', badStep.status === 400, `status=${badStep.status}`);
  }

  const noAudience = await skill('draft.create', { title: '无目标读者的稿子', audience: '' });
  check('缺少 audience 的稿件被拒绝', noAudience.status === 400, `status=${noAudience.status}`);

  const draftsPage = await get('/drafts');
  check('创作页可见稿件', draftsPage.status === 200 && draftsPage.text.includes('封面点击率的三个误区'));

  // 7. 任务与收件箱
  const task = await skill('task.create', { title: '拆解三篇封面案例', date: new Date().toISOString().slice(0, 10) });
  check('task.create 创建今日任务', task.status === 200, `status=${task.status}`);
  const taskPath = task.json?.data?.path;
  if (taskPath) {
    const done = await skill('task.done', { path: taskPath });
    check('task.done 标记完成', done.status === 200 && done.json?.data?.status === 'done');
    const raw = await fs.readFile(path.join(VAULT, taskPath), 'utf8');
    check('任务状态已回写', raw.includes('status: done'));
  }

  const inbox = await skill('inbox.capture', { title: '地铁上想到的选题' });
  check('inbox.capture 捕获成功', inbox.status === 200, `status=${inbox.status}`);
  if (inbox.json?.data?.path) {
    const raw = await fs.readFile(path.join(VAULT, inbox.json.data.path), 'utf8');
    check('收件箱文件带 capturedAt', raw.includes('capturedAt:'));
  }

  // 7.5 收件箱转正（M0.1）
  const inboxTopic = await skill('inbox.capture', { title: '转正测试-选题' });
  const inboxTopicPath = inboxTopic.json?.data?.path;
  const promoteTopic = await skill('inbox.promote', { path: inboxTopicPath, target: 'topic' });
  check(
    'inbox.promote 转选题成功',
    promoteTopic.status === 200 && promoteTopic.json?.data?.target === 'topic',
    `status=${promoteTopic.status}`
  );
  check(
    '收件箱原件已移入 .trash',
    Boolean(inboxTopicPath) && !(await exists(inboxTopicPath)) && (await existsInTrash(path.basename(inboxTopicPath)))
  );

  const inboxNote = await skill('inbox.capture', { title: '转正测试-笔记' });
  const promoteNote = await skill('inbox.promote', { path: inboxNote.json?.data?.path, target: 'note' });
  check(
    'inbox.promote 转笔记成功',
    promoteNote.status === 200 && String(promoteNote.json?.data?.path || '').startsWith('02-知识库/'),
    `path=${promoteNote.json?.data?.path}`
  );

  const homeAfterPromote = await get('/');
  check('首页含常用资料卡', homeAfterPromote.text.includes('常用资料'));
  check('首页显示知识库笔记', homeAfterPromote.text.includes('转正测试-笔记'));

  // 7.6 拆解与资产（M1）
  const badAnalysis = await skill('analysis.create', { title: '空素材' });
  check('拆解缺素材被拒绝', badAnalysis.status === 400, `status=${badAnalysis.status}`);

  const analysis = await skill('analysis.create', {
    title: '封面爆款拆解',
    sources: 'https://example.com/a\nhttps://example.com/b',
  });
  check(
    'analysis.create 创建成功',
    analysis.status === 200 && analysis.json?.data?.stage === 'intake',
    `status=${analysis.status}`
  );
  const analysisPath = analysis.json?.data?.path;
  check(
    '拆解文件落 05-拆解',
    Boolean(analysisPath) && analysisPath.startsWith('05-拆解/'),
    `path=${analysisPath}`
  );

  if (analysisPath) {
    const s1 = await skill('analysis.advance', { path: analysisPath });
    check('拆解推进到 verify', s1.json?.data?.stage === 'verify', `stage=${s1.json?.data?.stage}`);
    const s2 = await skill('analysis.advance', { path: analysisPath });
    check('拆解推进到 result', s2.json?.data?.stage === 'result', `stage=${s2.json?.data?.stage}`);
  }

  const badAsset = await skill('asset.create', { name: '缺字段', assetType: 'angle' });
  check('资产缺 problem/why 被拒绝', badAsset.status === 400, `status=${badAsset.status}`);

  const asset = await skill('asset.create', {
    name: '用对比找到真正差异',
    assetType: 'angle',
    problem: '测评、平台差异、方案选择',
    why: '不知道选哪个，需要明确判断标准',
    skeleton: '先给同一场景两种做法，再给差异与结论',
    source: analysisPath
      ? `[[${analysisPath.replace(/^05-拆解\//, '').replace(/\.md$/, '')}]]`
      : '',
  });
  check(
    'asset.create 成功',
    asset.status === 200 && asset.json?.data?.assetType === 'angle',
    `status=${asset.status}`
  );
  const assetPath = asset.json?.data?.path;
  check(
    '资产落选题角度子目录',
    Boolean(assetPath) && assetPath.startsWith('06-资产/选题角度/'),
    `path=${assetPath}`
  );
  if (assetPath) {
    const raw = await fs.readFile(path.join(VAULT, assetPath), 'utf8');
    check('资产带来源回链', raw.includes('source: "[[拆解-'));
  }

  const analysisPage = await get('/analysis');
  check('拆解页 200 且含标题', analysisPage.status === 200 && analysisPage.text.includes('封面爆款拆解'));
  const assetsPage = await get('/assets');
  check(
    '资产页 200 且含资产名',
    assetsPage.status === 200 && assetsPage.text.includes('用对比找到真正差异')
  );
  check('导航含拆解与沉淀', assetsPage.text.includes('拆解与沉淀'));

  // 7.7 稿件详情、分节写入与快照（M2）
  const draftForDetail = await skill('draft.create', {
    title: '详情页测试稿',
    audience: '想验证详情页的创作者',
  });
  const detailPath = draftForDetail.json?.data?.path;
  const detailName = detailPath ? path.basename(detailPath, '.md') : '';
  const detailPage = await get(`/drafts/${encodeURIComponent(detailName)}`);
  check(
    '稿件详情页 200 且含快照入口',
    detailPage.status === 200 && detailPage.text.includes('保存快照'),
    `status=${detailPage.status}`
  );

  const sec = await skill('draft.updateSection', {
    path: detailPath,
    section: '正文',
    content: '第一版正文内容',
  });
  check('分节写入成功', sec.status === 200 && sec.json?.data?.section === '正文', `status=${sec.status}`);
  const rawAfter = await fs.readFile(path.join(VAULT, detailPath), 'utf8');
  check(
    '写入只改正文小节',
    rawAfter.includes('第一版正文内容') && rawAfter.includes('## 思路') && rawAfter.includes('## 发布检查')
  );

  const badSec = await skill('draft.updateSection', {
    path: detailPath,
    section: '不存在的节',
    content: 'x',
  });
  check('非法小节被拒绝', badSec.status === 400, `status=${badSec.status}`);

  const snap1 = await skill('draft.snapshot', { path: detailPath });
  const snap2 = await skill('draft.snapshot', { path: detailPath });
  check('快照 v1 生成', snap1.json?.data?.version === 1, `v=${snap1.json?.data?.version}`);
  check('快照版本递增', snap2.json?.data?.version === 2, `v=${snap2.json?.data?.version}`);
  check(
    '快照文件落 _versions',
    String(snap2.json?.data?.path || '').includes('07-稿件/_versions/')
  );

  const inboxForNote = await skill('inbox.capture', { title: '笔记转选题测试' });
  const promotedNote = await skill('inbox.promote', {
    path: inboxForNote.json?.data?.path,
    target: 'note',
  });
  const fromNote = await skill('topic.createFromNote', {
    note: promotedNote.json?.data?.path,
    title: '来自笔记的选题',
  });
  check(
    '从笔记生成选题',
    fromNote.status === 200 && String(fromNote.json?.data?.path || '').startsWith('04-选题/'),
    `path=${fromNote.json?.data?.path}`
  );

  // 7.8 作品与指标（M3）
  const day = new Date().toISOString().slice(0, 10);
  const badWork = await skill('work.create', { title: '缺日期作品', draft: '稿件-封面点击率的三个误区-2026-10-22' });
  check('作品缺发布日期被拒绝', badWork.status === 400, `status=${badWork.status}`);

  const work = await skill('work.create', {
    title: '跨平台测试作品',
    draft: '稿件-封面点击率的三个误区-2026-10-22',
    publishDate: day,
    platforms: '小红书, 公众号',
  });
  check('work.create 登记成功', work.status === 200, `status=${work.status}`);
  const workPath = work.json?.data?.path;
  check('作品落 08-作品/作品', Boolean(workPath) && workPath.startsWith('08-作品/作品/'), `path=${workPath}`);
  const workRaw = workPath ? await fs.readFile(path.join(VAULT, workPath), 'utf8') : '';
  check('跨平台只记一条且平台成组', workRaw.includes('platforms:') && workRaw.includes('小红书'));

  const metric1 = await skill('metric.upsert', {
    work: workPath || '作品-跨平台测试作品',
    date: day,
    platform: '小红书',
    views: 3200,
    inquiries: 5,
    deals: 1,
  });
  check('metric.upsert 新建指标', metric1.status === 200 && metric1.json?.data?.updated === false, `status=${metric1.status}`);

  const metric2 = await skill('metric.upsert', {
    work: workPath || '作品-跨平台测试作品',
    date: day,
    platform: '小红书',
    views: 4000,
    inquiries: 6,
    deals: 2,
  });
  check('同键指标走更新不新增', metric2.status === 200 && metric2.json?.data?.updated === true, `updated=${metric2.json?.data?.updated}`);

  const metricPage = await get('/works');
  check('作品页 200', metricPage.status === 200);
  check('作品页显示作品', metricPage.text.includes('跨平台测试作品'));
  check('作品页口径说明', metricPage.text.includes('按记录数，不去重'));
  check('作品页显示本月发布', metricPage.text.includes('本月发布'));

  const imported = await skill('metric.import', {
    csv: `work,date,platform,views,inquiries,deals\n作品-跨平台测试作品,${day},公众号,1200,2,1\n作品-跨平台测试作品,,公众号,100,0,0`,
  });
  check(
    'CSV 导入新建一行、跳过一行',
    imported.status === 200 && imported.json?.data?.created === 1 && imported.json?.data?.skipped === 1,
    `created=${imported.json?.data?.created} skipped=${imported.json?.data?.skipped}`
  );
  const importedPage = await get('/works?imported=1&created=1&updated=0&skipped=1');
  check('导入报告可见', importedPage.status === 200 && importedPage.text.includes('导入完成'));
  check('指标来源标注为 csv', importedPage.text.includes('csv'));

  const review = await skill('review.period', { period: '2026-10', summary: '发布 1 篇，成交 2 笔' });
  check(
    '复盘 Skill 渲染成功',
    review.status === 200 && review.json?.data?.kind === 'ai' && String(review.json?.data?.prompt).includes('成交是记录数'),
    `status=${review.status}`
  );

  // 8. Skill 注册表
  const skillsPage = await get('/skills');
  check('助手页返回 200', skillsPage.status === 200);
  const cards = (skillsPage.text.match(/class="card skill-card"/g) || []).length;
  check('助手页列出 19 个动作型 Skill', cards === 19, `count=${cards}`);
  check('助手页区分 AI 型与动作型', skillsPage.text.includes('AI 指令型') && skillsPage.text.includes('动作型'));

  const missing = await skill('topic.evaluate', { title: '只填了一个' });
  check('AI Skill 缺参被拒绝', missing.status === 400 && missing.json?.error?.code === 'field_required', `status=${missing.status}`);

  const rendered = await skill('topic.evaluate', {
    title: '为什么你的封面没人点',
    problem: '点击率低于同类账号',
    material: '40 篇封面点击率对比表',
  });
  check('AI Skill 渲染成功', rendered.status === 200 && rendered.json?.data?.kind === 'ai', `status=${rendered.status}`);
  const prompt = rendered.json?.data?.prompt || '';
  check('prompt 已替换占位符', prompt.includes('为什么你的封面没人点') && !prompt.includes('{{title}}'));
  check('prompt 带落盘约定', prompt.includes('01-收件箱/_ai-output/'));
  check('prompt 带版本号', rendered.json?.data?.version === '1.0.0');

  const unknownSkill = await skill('not.exists', {});
  check('未知 Skill 返回 404', unknownSkill.status === 404, `status=${unknownSkill.status}`);

  // 9. 旧直连接口已下线，页面无直连入口
  const legacy = await post('/api/topic', { title: 'x' });
  check('旧接口 /api/topic 已下线', legacy.status === 404, `status=${legacy.status}`);
  const legacyConfig = await post('/api/config', { name: 'x' });
  check('旧接口 /api/config 已下线', legacyConfig.status === 404, `status=${legacyConfig.status}`);

  const pages = [home.text, topicsPage.text, draftsPage.text, ledgerPage.text, skillsPage.text];
  check('页面不含 data-api 直连', pages.every((html) => !html.includes('data-api=')));
  check('页面表单均带 data-skill', pages.every((html) => !html.includes('<form') || html.includes('data-skill')));

  // 10. 设置页
  const settings = await get('/settings');
  check('设置页返回 200', settings.status === 200);
  check('设置页显示变更记录', settings.text.includes('初始化契约'));
  check('设置页表单走 Skill', settings.text.includes('data-skill="config.update"'));

  // 11. 汇总
  lines.push('');
  lines.push(`结果：${passed} 通过 / ${failed} 失败 / 共 ${passed + failed} 项`);
  console.log(lines.join('\n'));
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('验收脚本异常：', err);
    process.exitCode = 1;
  })
  .finally(() => stopServer());
