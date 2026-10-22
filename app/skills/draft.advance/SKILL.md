---
name: 推进稿件步骤
subtitle: 在六步流水线上前进一步
stage: writing
kind: action
action: draft.advance
version: 1.0.0
inputs: [path, step]
optional: []
outputs: [path, step]
---

## 适用场景

创作页稿件卡片上的「推进到：下一步」按钮。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| path | 是 | 稿件笔记的相对路径 |
| step | 是 | 目标步骤枚举 |

## 任务指令

修改 `path` 指向笔记的 `step` 与 `updatedAt`，正文与其余字段不动。

合法步骤：`idea` → `copy` → `title` → `cover` → `checklist` → `publish`。

进入 `copy` 及之后任一阶段前，必须确认 `audience` 非空；为空时拒绝并返回 `field_required`，提示「缺少这篇解决谁的什么问题」。

## 输出结构

```json
{ "ok": true, "data": { "path": "07-稿件/xxx.md", "step": "copy" } }
```

## 边界与注意事项

- 不允许跳步到 `publish` 而不经过 `checklist`；如需回退由人工改文件。
- 只改 frontmatter，不碰正文任一节。
