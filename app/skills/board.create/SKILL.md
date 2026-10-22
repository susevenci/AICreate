---
name: 新建画板
subtitle: 建一个画板索引，绘制回 Obsidian
stage: settings
kind: action
action: board.create
version: 1.0.0
inputs: [title, linkedDraft]
optional: [linkedDraft]
outputs: [path]
---

## 适用场景

画板页「新建画板」。Web 端不内嵌编辑器，只负责建索引。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 是 | 画板名 |
| linkedDraft | 否 | 关联稿件链接 |

## 任务指令

在 `11-画板/` 建 `画板-{title}-{YYYY-MM-DD}.md`，frontmatter 按 `_schema.md` 4.15：`type: board`、`title`、`linkedDraft`、`createdAt`。

正文提示用 Excalidraw 打开本笔记继续绘制。

## 输出结构

```json
{ "ok": true, "data": { "path": "11-画板/画板-xxx-2026-10-22.md" } }
```

## 边界与注意事项

- 不生成 Excalidraw 数据块，避免与插件格式冲突。
- 画板名重复时自动追加序号。
