---
type: schema
version: 1.4.0
updatedAt: 2026-10-22
---

# 字段契约（_schema.md）

> 本文件是工作台**唯一字段真相源**。任何笔记的 frontmatter、Web 接口、Dataview 查询、Skill 输出模板都必须与此处一致。
> 修改规则：先改本文件（升 version + 记变更），再改模板 / Web / Skill / 查询。顺序不可颠倒。

---

## 1. 通用规则

| 规则 | 内容 |
|------|------|
| R1 | 键名一律英文小写，多单词用 camelCase；值可用中文 |
| R2 | 所有笔记必须有 `type`，取值见第 3 节枚举 |
| R3 | 时间字段统一 `YYYY-MM-DD`；时间戳统一 `YYYY-MM-DDTHH:mm:ss+08:00` |
| R4 | 关联一律用 wikilink：`"[[文件名词]]"`，禁止自造 ID、禁止纯字符串路径 |
| R5 | 枚举值一律小写英文，不允许中文或同义词并存 |
| R6 | 派生字段（可现算）不落盘，只出现在视图层 |
| R7 | 删除一律移入 `vault/.trash/`，禁止物理删除 |
| R8 | 字段新增必须同步四处：本文件、`12-模板/`、Web `app/lib/vault.mjs`、相关 Skill |
| R9 | 前端只读镜像，写操作一律走 API 回写 Markdown，禁止在前端维护状态副本 |
| R10 | 统计类字段必须可追溯到明细笔记，不允许只存汇总值 |

## 2. 命名规则

| 对象 | 格式 | 示例 |
|------|------|------|
| 选题 | `选题-{标题}-{YYYYMMDD}.md` | `选题-封面没人点怎么办-20261022.md` |
| 稿件 | `稿件-{标题}-{YYYYMMDD}.md` | `稿件-封面点击率的三个误区-20261022.md` |
| 流水 | `流水-{YYYYMMDD}-{序号}.md` | `流水-20261022-01.md` |
| 任务 | `任务-{标题}-{YYYYMMDD}.md` | `任务-拆解三篇封面案例-20261022.md` |
| 收件箱 | `{YYYYMMDD}-{HHmm}-{摘要}.md` | `20261022-1430-地铁上想到的选题.md` |

标题取自内容本身，禁止拼音、禁止纯编号。重名时在末尾追加 `-2`、`-3`。

## 3. 类型枚举

```
config | schema | page | topic | draft | ledger | task | inbox | note | analysis | asset | source | work | metric | blogger | board | skill
```

M0 实现前 9 类；`page` 用于视图层笔记（只放查询），`note` 用于 `02-知识库/` 的长期笔记，`skill` 用于 Skill 元数据索引（主体在 `app/skills/`）。

---

## 4. 实体定义

### 4.1 config（`00-工作台/_配置.md`，全库唯一）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| type | string | 是 | `config` | 固定值 |
| name | string | 是 | `""` | 工作台显示名称。空字符串表示**未初始化**，前端首次访问须跳转配置页 |
| schemaVersion | string | 是 | `1.0.0` | 对应本文件 version |
| vaultVersion | string | 是 | `0.1.0` | 工作台版本 |
| timezone | string | 是 | `Asia/Shanghai` | 统计用 |
| lowFanThreshold | number | 是 | `10000` | 低粉爆款判定：粉丝数上限 |
| engagementThreshold | number | 是 | `0.05` | 低粉爆款判定：互动率下限 |
| outlierMultiplier | number | 是 | `2` | 异常值判定：相对基线倍数 |
| platforms | list | 是 | `[]` | 已启用平台 |
| layout | string | 否 | `default` | 首页布局标识，M0 固定 default |
| theme | string | 否 | `dark` | `dark` / `light` |
| createdAt | date | 是 | — | 创建日期 |
| updatedAt | date | 是 | — | 最后修改日期 |

正文固定包含两节：`## 变更记录`、`## 说明`。**任何字段或结构的改动必须追加一行到 `## 变更记录`**：

```
- 2026-10-22 | schema 1.0.0 | 初始化契约
```

### 4.2 topic（`04-选题/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `topic` |
| status | enum | 是 | `backlog` / `researching` / `selected` / `in-production` / `archived` |
| origin | list | 是 | `course` / `comment` / `published` / `note` / `thought` / `benchmark`（至少一项） |
| problem | string | 是 | 观众遇到什么问题；为空不得置为 `selected` |
| material | string | 是 | 我有什么材料可讲；同上 |
| refs | list | 否 | 来源链接 `[[...]]` |
| angle | string | 否 | 切入角度 |
| fit | number | 否 | 1-5，人工或 Skill 建议 |
| fitReason | string | 否 | `fit` 非空时建议填写 |
| createdAt | date | 是 | — |
| updatedAt | date | 是 | — |
| tags | list | 否 | — |

状态机：`backlog → researching → selected → in-production → archived`，允许跳级，禁止逆向自动流转（人工可改）。

正文固定四节：`## 问题`、`## 材料`、`## 角度`、`## 备注`。

### 4.3 draft（`07-稿件/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `draft` |
| status | enum | 是 | `active` / `done` / `dropped` |
| step | enum | 是 | `idea` / `copy` / `title` / `cover` / `checklist` / `publish` |
| audience | string | 是 | 这篇解决谁的什么问题；为空不得进入 `copy` 之后 |
| topic | link | 否 | `"[[选题-...]]"` |
| platforms | list | 否 | 目标平台 |
| assets | list | 否 | 引用的资产 |
| titles | list | 否 | 候选标题 |
| cover | link | 否 | 封面图或 brief |
| version | number | 是 | 从 1 起，定稿递增 |
| recordCard | link | 否 | 录制卡片 → 画板 |
| createdAt | date | 是 | — |
| updatedAt | date | 是 | — |

正文固定五节：`## 思路`、`## 正文`、`## 标题候选`、`## 封面 brief`、`## 发布检查`。Web 只渲染不增删标题，Skill 按模板填充。

### 4.4 ledger（`10-收支/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `ledger` |
| kind | enum | 是 | `income` / `expense` |
| amount | number | 是 | 正数，两位小数；方向由 kind 决定 |
| date | date | 是 | 发生日期；缺失不允许写入 |
| category | string | 是 | 课程 / 带货 / 投放 / 订阅 / 其他（可扩充，须记入本文件） |
| work | link | 否 | 关联作品 |
| note | string | 否 | 备注 |
| createdAt | date | 是 | — |

**口径铁律**：`amount` 是金额，不是单数；与作品的成交笔数（`deals`）不互相推算。

### 4.5 task（`09-计划/任务/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `task` |
| status | enum | 是 | `todo` / `doing` / `done` / `unscheduled` |
| date | date | 否 | 计划日期；空即"待安排" |
| priority | enum | 是 | `high` / `normal` / `low` |
| estimate | number | 否 | 预估分钟 |
| originDate | date | 否 | 原计划日期，改期时写入 |
| ref | link | 否 | 关联稿件 / 选题 |
| source | enum | 是 | `manual` / `ai`；`ai` 未确认前不得进入今日安排 |
| createdAt | date | 是 | — |

### 4.6 inbox（`01-收件箱/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `inbox` |
| status | enum | 是 | `raw` / `processing` / `done` |
| capturedAt | datetime | 是 | 捕获时间 |
| tags | list | 否 | — |

正文即内容本身，不要求结构。其他字段一律选填——这是收件箱存在的意义。

### 4.7 page（`00-工作台/` 下的视图笔记）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `page` |
| page | enum | 是 | `home` / `topics` / `draft` / `ledger`（M0 四个；后续扩展） |

约束：视图笔记只允许包含 Dataview 查询与说明文字，**不得写入任何业务数据**。Web 层不读取此目录作为业务数据源。

### 4.8 note（`02-知识库/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `note` |
| createdAt | date | 是 | — |
| updatedAt | date | 是 | — |
| tags | list | 否 | — |

文件名直接用标题，不加类型前缀与日期后缀；同名时追加 `-2`。正文不要求固定结构，由收件箱转入时保持原文。

### 4.9 analysis（`05-拆解/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `analysis` |
| stage | enum | 是 | `intake` / `verify` / `result`（对应界面 1-2-3 步） |
| sources | list | 是 | 被拆解作品或素材的 wikilink，至少 1 条 |
| highlights | list | 否 | 亮点 |
| weaknesses | list | 否 | 不足 |
| borrowable | list | 否 | 可借鉴做法 |
| patterns | list | 否 | 横向共同规律 |
| assets | list | 否 | 沉淀出的资产 wikilink |
| createdAt | date | 是 | — |
| updatedAt | date | 是 | — |

正文固定四节：`## 原文`、`## 单篇结论`、`## 横向比较`、`## 可借鉴做法`。状态只允许 `intake → verify → result` 单向推进。

### 4.10 asset（`06-资产/{子目录}/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `asset` |
| assetType | enum | 是 | `angle` / `structure` / `opening` / `title`，决定存放子目录 |
| name | string | 是 | 资产名称 |
| problem | string | 是 | 适合解决什么内容问题 |
| why | string | 是 | 用户为什么会关心 |
| skeleton | string | 否 | 结构或模板正文 |
| example | string | 否 | 原文示例 |
| source | link | 否 | 来源拆解 `[[...]]` |
| createdAt | date | 是 | — |

子目录映射：`angle→06-资产/选题角度`、`structure→06-资产/文案结构`、`opening→06-资产/开场白`、`title→06-资产/标题`。正文固定两节：`## 用法`、`## 示例`。

### 4.11 source（`03-对标/作品/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `source` |
| platform | string | 是 | 平台名 |
| blogger | link | 否 | 所属博主 |
| publishedAt | date | 否 | 发布日期 |
| platformId | string | 否 | 平台内作品标识（bvid / noteId / awemeId），去重键 |
| url | string | 否 | 作品链接 |
| collector | string | 否 | 采集来源：`manual` / `browser-extract` / `youtube-api` / `csv` |
| fetchedAt | date | 否 | 采集时间，用于判断数据新鲜度 |
| followers | number | 否 | 博主粉丝数快照，用于低粉爆款判定 |
| baseline | number | 否 | 该博主互动基线，用于异常值判定 |
| views / likes / comments / shares | number | 否 | 互动数据 |
| rawPath | string | 否 | 正文文件路径或链接 |
| sourceLevel | enum | 是 | `L0`（手动）/ `L1`（后台导出或半自动提取）/ `L2`（官方 API），不允许更高等级 |
| createdAt | date | 是 | — |

`engagement` 为派生字段，不落盘，由查询现算。

### 4.12 work（`08-作品/作品/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `work` |
| draft | link | 是 | 原稿 `[[...]]` |
| publishDate | date | 是 | 发布日期 |
| platforms | list | 是 | 发布平台，同一内容多平台只记一条作品 |
| urls | list | 否 | 各平台链接 |
| topic | link | 否 | 来源选题 |
| createdAt | date | 是 | — |

### 4.13 metric（`08-作品/指标/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `metric` |
| work | link | 是 | 所属作品 |
| date | date | 是 | 数据日期，缺失不允许写入 |
| platform | string | 否 | 分平台记录 |
| views / inquiries / deals | number | 否 | 播放、咨询、成交，三口径互不推算 |
| source | enum | 是 | `manual` / `csv` |
| createdAt | date | 是 | — |

**口径铁律**：`deals` 是记录数，不是金额；月度成交按条数统计，不去重、不推算。

### 4.14 blogger（`03-对标/博主/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `blogger` |
| platform | string | 是 | 平台名 |
| followers | number | 是 | 粉丝数（L0 手工录入） |
| baseline | number | 否 | 互动基线 |
| fit | enum | 否 | `fit` / `unfit` / `watch` |
| fitReason | string | 否 | 判断理由，fit 非空时必填 |
| createdAt | date | 是 | — |

### 4.15 board（`11-画板/`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | `board` |
| title | string | 是 | 画板名 |
| linkedDraft | link | 否 | 关联稿件 |
| createdAt | date | 是 | — |

Web 端只做索引与新建占位，编辑仍在 Obsidian 的 Excalidraw 中完成。

---

## 5. 校验规则（写入前必须通过）

| 编号 | 规则 | 失败处理 |
|------|------|----------|
| V1 | `type` 必须在枚举内 | 拒绝写入，返回 `400 type_invalid` |
| V2 | 必填字段非空（去首尾空格） | 拒绝写入，返回 `400 field_required` 并列出字段名 |
| V3 | 枚举字段值必须在允许集合内 | 拒绝写入，返回 `400 enum_invalid` |
| V4 | `amount` 必须为正数且 ≤ 2 位小数 | 拒绝写入 |
| V5 | `date` 必须匹配 `YYYY-MM-DD` 且为真实日期 | 拒绝写入 |
| V6 | `refs`/`topic`/`ref` 指向的文件必须存在 | 放行但标记 `dangling: true`，视图显示断链提示 |
| V7 | 目标文件已存在（重名） | 拒绝写入，返回 `409 file_exists`，由调用方改名 |
| V8 | 路径必须落在 `vault/` 内且不以 `.` 开头 | 拒绝写入，返回 `400 path_invalid` |

失败模式处置分档：
- **拒绝**：V1-V5、V7、V8（阻断并返回错误码）
- **放行 + 标记**：V6（断链可见，不阻断）
- **汇总上报**：批量导入时汇总缺失与冲突条数，写 `_报告.md`

## 6. 变更流程

1. 在本文件修改字段，`version` 升位（语义化：新增字段 +0.1，破坏性变更 +1.0）。
2. 在 `00-工作台/_配置.md` 的 `## 变更记录` 追加一行：日期 | 版本 | 变更内容。
3. 同步修改：`12-模板/` 对应模板 → `app/lib/vault.mjs` 的字段常量 → 相关 `SKILL.md` 输出模板 → DATAVIEW 查询。
4. 旧数据兼容：新增字段给默认值；删除字段保留一个版本的兼容读取（读时忽略，写时不再产生）。
5. 破坏性变更需在 `## 变更记录` 标注 `BREAKING`，并说明迁移方式。

## 7. 三方一致性清单

| 消费方 | 依赖点 | 同步时机 |
|--------|--------|----------|
| Obsidian / Dataview | frontmatter 键名与枚举 | 改本文件后立即改视图查询 |
| Web 只读镜像 | `app/lib/vault.mjs` 中的 `SCHEMA` 常量 | 改本文件后同步常量 |
| Web 写接口 | 第 5 节校验规则 | 改校验规则后同步 `validate()` |
| Skill | `SKILL.md` 的输出模板字段 | 改字段后同步模板 |
| AGENTS.md | 目录与落盘规则 | 改目录后同步 |
