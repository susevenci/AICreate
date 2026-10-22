---
name: 新建选题
subtitle: 写入一条选题笔记到 04-选题
stage: topic
kind: action
action: topic.create
version: 1.0.0
inputs: [title, problem, material, angle, origin]
optional: [angle, origin]
outputs: [path, status]
---

## 适用场景

选题池页的「新建选题」入口。所有选题都必须经由本 Skill 创建，不允许在页面里直接写文件。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 是 | 选题标题，同时决定文件名 |
| problem | 是 | 观众遇到的具体问题 |
| material | 是 | 我有什么材料可讲 |
| angle | 否 | 切入角度 |
| origin | 否 | 来源枚举，默认 thought |

## 任务指令

执行本 Skill 时，在 `04-选题/` 创建一篇笔记，文件名格式 `选题-{title}-{YYYY-MM-DD}.md`，同名时追加 `-2`。

frontmatter 必须且只能包含 `_schema.md` 4.2 定义的字段：`type: topic`、`status: backlog`、`origin: [来源]`、`problem`、`material`、`angle`、`fit: null`、`fitReason: ""`、`refs: []`、`createdAt`、`updatedAt`、`tags: []`。

正文固定四节：`## 问题`、`## 材料`、`## 角度`、`## 备注`。写入前必须通过 `_schema.md` 第 5 节校验；`problem` 或 `material` 为空时拒绝创建。

## 输出结构

```json
{ "ok": true, "data": { "path": "04-选题/选题-xxx-2026-10-22.md", "status": "backlog" } }
```

失败返回 `400`，`error.code` 为 `field_required` 或 `validation_failed`，`error.details` 列出具体字段。

## 边界与注意事项

- 不自动把状态置为 `selected`。
- 不创建空选题占位文件。
- 发布后不可重命名文件，否则会断掉已有 wikilink。
