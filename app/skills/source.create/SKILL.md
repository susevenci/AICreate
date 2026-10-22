---
name: 录入对标作品
subtitle: 记录一条对标作品与互动数据
stage: topic
kind: action
action: source.create
version: 1.0.0
inputs: [title, platform, followers, baseline, views, likes, comments, shares]
optional: [followers, baseline, views, likes, comments, shares]
outputs: [path]
---

## 适用场景

对标页「录入对标作品」。批量数据先用 `metric.import` 的思路手工整理，再逐条录入。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 是 | 作品标题 |
| platform | 是 | 平台 |
| followers | 否 | 博主粉丝快照，用于低粉爆款判定 |
| baseline | 否 | 博主互动基线，用于异常值判定 |
| views / likes / comments / shares | 否 | 互动数据 |

## 任务指令

在 `03-对标/作品/` 建 `对标-{title}-{YYYY-MM-DD}.md`，frontmatter 按 `_schema.md` 4.11，`sourceLevel: L0`。正文写 `## 摘录`。

## 输出结构

```json
{ "ok": true, "data": { "path": "03-对标/作品/对标-xxx-2026-10-22.md" } }
```

## 边界与注意事项

- `sourceLevel` 固定 L0，M1-M5 不允许更高等级。
- 互动率由查询现算，不落盘。
