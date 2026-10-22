---
name: 推进选题状态
subtitle: 沿状态机前移一条选题
stage: topic
kind: action
action: topic.advance
version: 1.0.0
inputs: [path, status]
optional: []
outputs: [path, status]
---

## 适用场景

选题池看板卡片上的「推进」按钮。每次只前移一档，不做批量流转。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| path | 是 | 选题笔记的相对路径 |
| status | 是 | 目标状态枚举 |

## 任务指令

读取 `path` 指向的笔记，把 frontmatter 的 `status` 改为目标值，`updatedAt` 改为当天，正文保持不动。

合法状态：`backlog` → `researching` → `selected` → `in-production` → `archived`。置为 `selected` 前必须确认 `problem` 与 `material` 均非空，否则拒绝并返回 `field_required`。

## 输出结构

```json
{ "ok": true, "data": { "path": "04-选题/xxx.md", "status": "researching" } }
```

## 边界与注意事项

- 只改字段，不重排正文。
- 不做逆向自动流转；回退需人工改文件。
