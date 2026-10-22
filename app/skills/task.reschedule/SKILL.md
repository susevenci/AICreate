---
name: 安排或改期
subtitle: 给任务写入日期，改期时保留原计划日
stage: plan
kind: action
action: task.reschedule
version: 1.0.0
inputs: [path, date]
optional: []
outputs: [path, date, originDate]
---

## 适用场景

计划页的「排到今天」。也用于把待安排任务正式排期。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| path | 是 | 任务相对路径 |
| date | 是 | 目标日期 YYYY-MM-DD |

## 任务指令

写入 `date`，`status` 置为 `todo`。若原 `date` 存在且与新日期不同，把原日期写入 `originDate` 以便追溯。不覆盖已有 `originDate` 以外的字段。

## 输出结构

```json
{ "ok": true, "data": { "path": "09-计划/任务/xxx.md", "date": "2026-10-22", "originDate": "2026-10-20" } }
```

## 边界与注意事项

- 日期格式非法直接拒绝。
- 只接受 `type: task`。
