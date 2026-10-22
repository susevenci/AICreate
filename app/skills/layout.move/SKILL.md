---
name: 调整首页布局
subtitle: 上移或下移一张首页卡片
stage: settings
kind: action
action: layout.move
version: 1.0.0
inputs: [key, direction]
optional: []
outputs: [layout]
---

## 适用场景

设置页「首页布局」。卡片：todo / drafts / ledger / inbox / notes。

## 任务指令

读 `_配置.md` 的 `layout` 数组（缺失时用默认顺序），把 `key` 与相邻项交换，写回配置。已在边界时保持原样并返回当前顺序。

## 输出结构

```json
{ "ok": true, "data": { "layout": ["drafts", "todo", "ledger", "inbox", "notes"] } }
```

## 边界与注意事项

- 未知 key 拒绝（`enum_invalid`）。
- 只改顺序，不改卡片内容。
