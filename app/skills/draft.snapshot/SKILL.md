---
name: 保存快照
subtitle: 把稿件当前内容存成一份历史版本
stage: writing
kind: action
action: draft.snapshot
version: 1.0.0
inputs: [path]
optional: []
outputs: [path, version]
---

## 适用场景

稿件详情页的「保存快照」。定稿前、大改前各存一次，便于回看与对比。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| path | 是 | 稿件相对路径 |

## 任务指令

把 `path` 指向稿件的完整原文复制到 `07-稿件/_versions/{稿件名}-v{n}.md`，n 为现有快照数 + 1。

只复制，不修改原稿件，不更新 `version` 字段（该字段由人工定稿时维护）。

## 输出结构

```json
{ "ok": true, "data": { "path": "07-稿件/_versions/xxx-v2.md", "version": 2 } }
```

## 边界与注意事项

- 不自动清理旧快照。
- 快照目录以 `_` 开头，避免被 `safeResolve` 的隐藏路径规则拒绝。
