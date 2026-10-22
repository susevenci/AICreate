# 更新日志

版本号与里程碑对应：M0 = v0.1.0，M1 = v0.2.0，依次递增，M6 收口为 v0.7.0，M7 完成后为 v1.0.0。
每个版本发布前必须满足：`node app/scripts/verify.mjs` 全绿 + 浏览器验收 + 重启后数据留存。

## [v0.4.1] - 2026-10-22

### 修复

- 作品与指标文件名以 `undefined-` 开头：`NAME_PREFIX` 缺少 `work` / `metric`
- 指标标题带入整段路径：`linkName` 改为取路径最后一段

### 验收

- 端到端断言 94 项仍全通过

## [v0.4.0] - 2026-10-22

### 里程碑

M3 发布与经营。

### 新增

- 契约：`work` / `metric` 两类实体，schema 1.2.0
- 页面 `/works`：本月发布、本月成交（按记录数）、作品画册、指标明细、CSV 导入
- Skill：`work.create`、`metric.upsert`、`metric.import`、`review.period`
- CSV 导入报告：新建 / 更新 / 跳过三档计数，缺日期行显式计入 skipped

### 修复

- `TYPES` 未包含 `work` / `metric` ，导致登记返回 validation_failed
- CSV 表头过滤误伤以「作品-」开头的数据行

### 验收

- 端到端断言 94 项全通过

## [v0.3.0] - 2026-10-22

### 里程碑

M2 选题与创作。

### 新增

- 稿件详情页 `/drafts/:name`：六步进度、推进、分节正文编辑、快照列表
- `vault.updateSection` / `snapshotDraft` / `listSnapshots`：只改单节、快照落 `07-稿件/_versions/`
- 选题页「从知识库导入」（`topic.createFromNote`），第三个入口待 M5 对标上线
- 6 个新 Skill：`draft.updateSection`、`draft.snapshot`、`topic.createFromNote`、`draft.write`、`title.generate`、`cover.brief`

### 验收

- 端到端断言 80 项全通过
- 分节写入不破坏其他小节、快照版本递增、非法小节拒绝、从笔记生成选题均有覆盖

## [v0.2.0] - 2026-10-22

### 里程碑

M1 输入与拆解。

### 新增

- 契约：`analysis` / `asset` / `source` 三类实体，schema 1.1.0
- 页面：`/analysis` 拆解三步（放入素材 → 核对原文 → 拆解结果）、`/assets` 资产库（四库统计 + 明细 + 入库表单）
- Skill：`analysis.create`、`analysis.advance`、`asset.create`、`source.ingest`、`teardown.analyze`、`teardown.compare`
- Dataview：`vault/00-工作台/拆解与沉淀.md`（三步进度 + 四库统计 + 资产明细）
- 模板：`T-拆解.md`、`T-资产.md`
- 资产按 `assetType` 落四个子目录，支持来源回链

### 验收

- 端到端断言 72 项全通过
- 拆解三步状态流转、资产子目录落盘、缺字段拒绝、来源回链均有用例覆盖

## [v0.1.0] - 2026-10-22

### 里程碑

M0 骨架 + M0.1 收口。

### 新增

- Markdown 真相源的数据层：`app/lib/frontmatter.mjs`、`app/lib/markdown.mjs`、`app/lib/vault.mjs`
- 只读 Web 镜像四页：首页 / 选题池 / 创作 / 收支，配 `vault/00-工作台/` 四个 Dataview 页
- Skill 驱动交互：12 个 Skill（9 动作型 + 3 AI 型），页面统一调用 `POST /api/skills/:id/run`
- 工作台名称自定义：首次打开引导配置，设置页可改，写入 `_配置.md`
- 契约体系：`_schema.md`（9 类实体、8 条校验规则）、`AGENTS.md` 执行契约
- `inbox.promote`：收件箱一键转选题 / 转笔记（M0.1）
- 首页「常用资料」卡（M0.1）

### 修复

- 空库初始化死锁：Skill 改为内置 `app/skills/` + `vault/.codex/skills/` 覆盖两级
- 变更记录粘连：改为按行插入的 `appendChangeLine()`

### 验收

- 端到端断言 60 项全通过（`app/scripts/verify.mjs`）
- 浏览器验收 17 张截图，含空库首次配置

## 后续版本

- v0.2.0 M1 输入与拆解：analysis / asset / source 契约，拆解三步，资产四库
- v0.5.0 M4 计划与助手：计划页、改期、AI 任务确认、Skill 收藏
- v0.6.0 M5 对标与画板：对标四卡、博主与作品、画板索引
- v0.7.0 M6 打磨与交付：布局编辑、番茄钟、功能开关、启动脚本
- v1.0.0 M7 演进：查询缓存、Bases 兼容说明、AI 流式桥接评估
