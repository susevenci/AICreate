# 更新日志

版本号与里程碑对应：M0 = v0.1.0，M1 = v0.2.0，依次递增，M6 收口为 v0.7.0，M7 完成后为 v1.0.0。
每个版本发布前必须满足：`node app/scripts/verify.mjs` 全绿 + 浏览器验收 + 重启后数据留存。

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
- v0.3.0 M2 选题与创作：稿件详情、六步推进、版本快照、选题三入口
- v0.4.0 M3 发布与经营：作品登记、指标、CSV 导入、复盘
- v0.5.0 M4 计划与助手：计划页、改期、AI 任务确认、Skill 收藏
- v0.6.0 M5 对标与画板：对标四卡、博主与作品、画板索引
- v0.7.0 M6 打磨与交付：布局编辑、番茄钟、功能开关、启动脚本
- v1.0.0 M7 演进：查询缓存、Bases 兼容说明、AI 流式桥接评估
