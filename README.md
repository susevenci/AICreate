# AI 内容工作台（M0）

以 Markdown 为唯一真相源的内容工作台。Web 层只做只读镜像，所有写操作经 API 回写 Markdown，不使用数据库，不使用 JSON 存储。

## 快速开始

```bash
cd app
node server.mjs
```

打开 http://127.0.0.1:4173

首次启动时 `name` 字段为空，会自动进入配置页，要求给工作台起名字（建议格式：`{前缀}AI内容工作台`）。名称写入 `vault/00-工作台/_配置.md`，可在「设置」页随时修改。

环境变量：

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | 4173 | 监听端口 |
| `HOST` | 127.0.0.1 | 监听地址 |
| `WORKBENCH_VAULT` | `../vault` | 数据目录，可指向任意 Obsidian 库 |

## 验收

先启动服务，再执行：

```bash
node app/scripts/verify.mjs
```

脚本用真实 HTTP 驱动全部入口，覆盖 128 项断言。

## 目录

```
app/                     服务端与前端（零依赖）
  server.mjs             HTTP 路由 + Skill 调度（唯一写入口）
  lib/frontmatter.mjs    YAML 子集解析/序列化
  lib/markdown.mjs       Markdown 渲染（只读镜像用）
  lib/vault.mjs          数据访问层：读取、校验、写入、软删除
  lib/skills.mjs         Skill 注册表与 prompt 渲染
  lib/views.mjs          视图入口（barrel），实现在 lib/views/ 下按页面分组
  lib/views/shared.mjs   布局、导航、通用组件与格式化助手
  lib/views/home.mjs     首页
  lib/views/content.mjs  选题 / 稿件 / 拆解 / 资产
  lib/views/review.mjs   收支 / 作品
  lib/views/tools.mjs    助手 / 计划 / 对标 / 画板 / 设置
  web/                   三个静态资源：styles.css / app.js / focus.js
  skills/                42 个内置 Skill（29 动作型 + 13 AI 型，随产品发布）
  scripts/verify.mjs     端到端验收

vault/                   Markdown 真相源，可直接用 Obsidian 打开
  00-工作台/             视图层与契约（_schema.md / _配置.md / 四个 Dataview 页）
  01-收件箱/             AI 产物暂存与随手记录
  04-选题/ 07-稿件/ 09-计划/ 10-收支/   M0 业务数据
  12-模板/               Templater 模板
  .codex/                AGENTS.md 执行契约 + skills/（用户自定义，可覆盖内置）
  _snippets/             自定义样式（Obsidian 端）
```

## 约束（改动前必读）

1. **字段契约**：`vault/00-工作台/_schema.md` 是唯一字段真相源。新增字段必须同步四处：契约、模板、`app/lib/vault.mjs` 的 `REQUIRED`/`ENUMS`、相关 Skill。
2. **变更记录**：任何配置或结构改动追加到 `_配置.md` 的「变更记录」，Web 保存时会自动写一行。
3. **视图不存数据**：`00-工作台/` 下的笔记只放查询；业务数据一律在各自目录。
4. **AI 产物先入暂存区**：写 `01-收件箱/_ai-output/`，人工确认后才移动到正式目录。
5. **删除走软删除**：移入 `vault/.trash/{日期}/`，不物理删除。
6. **唯一写入口**：所有业务写入都经 `POST /api/skills/:id/run`，页面不得直连业务接口。
7. **Skill 两级来源**：`app/skills/` 是内置（只读，随产品发布，保证空库可初始化），`vault/.codex/skills/` 是用户自定义，同 id 覆盖内置。

## Obsidian 端

把 `vault/` 作为库打开，启用 Dataview 插件后，`00-工作台/` 下的四页分别对应：

- `首页.md`：今日待办、当前稿件、本月经营、收件箱
- `选题池.md`：五状态看板 + 明细表
- `创作.md`：六步流水线视图
- `收支.md`：月度汇总 + 分类占比 + 明细

同一份数据，Obsidian 用 Dataview 渲染，浏览器用服务端渲染，两者都只读。

## M0-M7 范围（全部完成）

已实现：首页（布局可调、番茄钟）、对标与热点、选题池、拆解与沉淀、资产库、创作列表与详情、发布与经营、计划、画板、收支，以及全部 Dataview 视图；42 个 Skill（29 动作型 + 13 AI 型）；模块开关、免费版预设与 60 秒查询缓存。

未实现（明确不做）：自动抓取与定时更新。原因：平台反爬与合规不确定，违反「最低可用路径 ≤ L1」，详见 `docs/M7-演进说明.md`。

## 启动与交付

- 双击 `start.cmd`（Windows）或执行 `./start.sh`（macOS/Linux），默认 http://127.0.0.1:4173
- 交付前检查：`node app/scripts/verify.mjs` 全绿；浏览器走一遍首页/计划/对标/画板；重启后数据仍在
- 回滚：修改 `vault/00-工作台/_配置.md`（名称、布局、模块开关）即可恢复到上一形态

## 版本与发布

- 仓库：https://github.com/susevenci/AICreate
- 版本与里程碑对应：v0.1.0 = M0，v0.2.0 = M1，依次递增，v0.7.0 = M6，v1.0.0 = M7
- 每个版本的变更记录见 [CHANGELOG.md](CHANGELOG.md)
- 发布检查：`node app/scripts/verify.mjs` 全绿 → 浏览器验收 → `git tag` → 推送

## 已知限制

- 单用户本地使用，无鉴权；不要暴露到公网。
- frontmatter 解析只支持契约用到的 YAML 子集（标量、行内数组、块数组），不支持嵌套对象与多行字符串。
- Skill 分两类：动作型（`kind: action`）由服务端确定性执行，AI 型（`kind: ai`）只生成 prompt，不直接调用模型；执行依赖外部 Agent（Codex / Claude Code / Qoder）。
- 「编辑布局」「番茄钟」「录制卡片」属于 M6 范围，M0 未包含。
