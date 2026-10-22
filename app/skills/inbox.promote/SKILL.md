---
name: 收件箱转正
subtitle: 把一条收件箱笔记转成选题或知识库笔记
stage: intake
kind: action
action: inbox.promote
version: 1.0.0
inputs: [path, target]
optional: []
outputs: [path, target, movedFrom]
---

## 适用场景

首页收件箱列表里的「转选题」「转笔记」按钮。收件箱只负责收，不负责分类；转正是它的唯一出口。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| path | 是 | 收件箱笔记的相对路径 |
| target | 是 | `topic` 或 `note` |

## 任务指令

读取收件箱笔记：

1. 标题取文件名去掉 `YYYYMMDD-HHmm-` 前缀。
2. 正文取去掉一级标题后的内容。
3. `target=topic`：在 `04-选题/` 建选题卡，`status: backlog`、`origin: [note]`、`problem` 取正文、`material` 填「待补充（收件箱转入）」。
4. `target=note`：在 `02-知识库/` 建笔记，正文原样保留，不加工。
5. 转换成功后，把原收件箱文件移入 `.trash/{日期}/`。不允许同时保留两份。

## 输出结构

```json
{ "ok": true, "data": { "path": "04-选题/选题-xxx-2026-10-22.md", "target": "topic", "movedFrom": "01-收件箱/20261022-1530-xxx.md" } }
```

## 边界与注意事项

- 只接受 `type: inbox` 的笔记，其他类型拒绝（`type_invalid`）。
- 转换失败时不得移动或删除原文件。
- 不推断标签，不补写正文，不做摘要。
- 转选题时 `material` 是占位值，原文会显示「待补充」，提醒人工补齐后才可置为已选定。
