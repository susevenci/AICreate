---
name: 新建稿件
subtitle: 写入一条稿件到 07-稿件
stage: writing
kind: action
action: draft.create
version: 1.0.0
inputs: [title, audience, topic]
optional: [topic]
outputs: [path, step, warnings]
---

## 适用场景

创作页的「新建稿件」入口。稿件必须经由本 Skill 创建。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 是 | 暂定标题，同时决定文件名 |
| audience | 是 | 这篇解决谁的什么问题 |
| topic | 否 | 来源选题 wikilink |

## 任务指令

在 `07-稿件/` 创建 `稿件-{title}-{YYYY-MM-DD}.md`，同名追加序号。

frontmatter 按 `_schema.md` 4.3：`type: draft`、`status: active`、`step: idea`、`audience`、`topic`、`platforms: []`、`assets: []`、`titles: []`、`cover: ""`、`version: 1`、`createdAt`、`updatedAt`。

正文固定五节：`## 思路`、`## 正文`、`## 标题候选`、`## 封面 brief`、`## 发布检查`。

创建后检查 `topic` 是否指向已存在的笔记；不存在时放行但返回 `warnings`，不阻断创建。

## 输出结构

```json
{ "ok": true, "data": { "path": "07-稿件/xxx.md", "step": "idea", "warnings": [] } }
```

## 边界与注意事项

- `audience` 为空直接拒绝；它是后续步骤的前置条件。
- 不预填正文内容，不调用模型。
