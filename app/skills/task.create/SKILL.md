---
name: 添加任务
subtitle: 写入一条待办到 09-计划/任务
stage: plan
kind: action
action: task.create
version: 1.0.0
inputs: [title, date, priority]
optional: [date, priority]
outputs: [path, date]
---

## 适用场景

首页「添加一件要做的事」入口。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 是 | 任务标题 |
| date | 否 | 计划日期，留空即进入「待安排」 |
| priority | 否 | `high` / `normal` / `low`，默认 normal |

## 任务指令

在 `09-计划/任务/` 创建 `任务-{title}-{YYYY-MM-DD}.md`。

frontmatter 按 `_schema.md` 4.5：`type: task`、`status: todo`、`date`、`priority`、`estimate: null`、`originDate: null`、`ref: ""`、`source: manual`、`createdAt`。

`source` 必须是 `manual`：AI 建议的任务只能由计划页确认后生成，不允许本 Skill 代填。

## 输出结构

```json
{ "ok": true, "data": { "path": "09-计划/任务/xxx.md", "date": "2026-10-22" } }
```

## 边界与注意事项

- `date` 留空时首页不显示该任务，只在「待安排」出现。
- 不支持一次创建多条；批量请逐条调用。
