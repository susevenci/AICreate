---
name: 从笔记找选题
subtitle: 把一篇知识库笔记转成选题卡
stage: topic
kind: action
action: topic.createFromNote
version: 1.0.0
inputs: [note, title, problem]
optional: [title, problem]
outputs: [path, source]
---

## 适用场景

选题页「从知识库导入」。手上已有素材，缺一个明确的选题卡。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| note | 是 | 02-知识库 下笔记的相对路径 |
| title | 否 | 选题标题，留空用笔记名 |
| problem | 否 | 观众问题，留空用标题 |

## 任务指令

读取笔记，在 `04-选题/` 建选题卡：`status: backlog`、`origin: [note]`、`material` 填 `[[笔记名]]`、`refs` 同时记录该链接。

来源不是 `note` 类型时拒绝（`type_invalid`）。

## 输出结构

```json
{ "ok": true, "data": { "path": "04-选题/选题-xxx-2026-10-22.md", "source": "02-知识库/xxx.md" } }
```

## 边界与注意事项

- 只建选题卡，不改动原笔记。
- `material` 用 wikilink，保证能从选题反查原文。
- 标题为空时用笔记名，不做改写。
