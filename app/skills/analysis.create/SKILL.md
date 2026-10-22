---
name: 发起拆解
subtitle: 把一批素材放进拆解流程的第一步
stage: intake
kind: action
action: analysis.create
version: 1.0.0
inputs: [title, sources]
optional: [title]
outputs: [path, stage]
---

## 适用场景

拆解与沉淀页的「发起拆解」。素材可以是一行一条的链接、文件路径，或直接粘贴的正文。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 否 | 拆解主题，留空则用「未命名拆解」 |
| sources | 是 | 素材，多行或逗号分隔，至少一条 |

## 任务指令

在 `05-拆解/` 创建 `拆解-{title}-{YYYY-MM-DD}.md`。

frontmatter 按 `_schema.md` 4.9：`type: analysis`、`stage: intake`、`sources`（数组）、`highlights: []`、`weaknesses: []`、`borrowable: []`、`patterns: []`、`assets: []`、`createdAt`、`updatedAt`。

正文固定四节：`## 原文`（放入素材原文）、`## 单篇结论`、`## 横向比较`、`## 可借鉴做法`。

拆分规则：按换行与中英文逗号切分，去掉空项。

## 输出结构

```json
{ "ok": true, "data": { "path": "05-拆解/拆解-xxx-2026-10-22.md", "stage": "intake" } }
```

## 边界与注意事项

- 素材为空直接拒绝（`field_required`）。
- 创建时不调用模型，只落盘；分析由 `teardown.analyze` 完成。
