---
name: 添加监控博主
subtitle: 录入一个对标博主与它的基线
stage: topic
kind: action
action: blogger.create
version: 1.0.0
inputs: [name, platform, followers, baseline, fit]
optional: [name, baseline, fit]
outputs: [path]
---

## 适用场景

对标页「添加监控博主」。数据只能手工录入（L0）。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| name | 否 | 博主名，留空用「平台-博主」 |
| platform | 是 | 平台 |
| followers | 是 | 粉丝数，必须为数字 |
| baseline | 否 | 互动基线 |
| fit | 否 | `fit` / `unfit` / `watch` |

## 任务指令

在 `03-对标/博主/` 建 `博主-{name}-{YYYY-MM-DD}.md`，frontmatter 按 `_schema.md` 4.14。正文写 `## 判断` 小节。

## 输出结构

```json
{ "ok": true, "data": { "path": "03-对标/博主/博主-xxx-2026-10-22.md" } }
```

## 边界与注意事项

- 粉丝数非数字直接拒绝。
- 不推断平台数据，不写未提供的字段。
