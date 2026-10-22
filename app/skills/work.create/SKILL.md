---
name: 登记作品
subtitle: 发布后登记一条作品，跨平台只记一条
stage: review
kind: action
action: work.create
version: 1.0.0
inputs: [title, draft, publishDate, platforms]
optional: [title, platforms]
outputs: [path, platforms]
---

## 适用场景

发布与经营页的「登记作品」。同一内容发到多个平台也只登记一条，平台写进数组。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 否 | 作品标题，留空取原稿名 |
| draft | 是 | 原稿 wikilink 或文件名 |
| publishDate | 是 | 发布日期 YYYY-MM-DD |
| platforms | 否 | 平台，逗号分隔 |

## 任务指令

在 `08-作品/作品/` 建 `作品-{title}-{YYYY-MM-DD}.md`，frontmatter 按 `_schema.md` 4.12：`type`、`draft`、`publishDate`、`platforms`、`urls: []`、`topic: ""`、`createdAt`。

正文写 `## 数据` 小节，列出发布日期与平台。

## 输出结构

```json
{ "ok": true, "data": { "path": "08-作品/作品/作品-xxx-2026-10-22.md", "platforms": ["小红书"] } }
```

## 边界与注意事项

- `publishDate` 非法直接拒绝。
- 不自动创建指标记录，数据由 `metric.upsert` / `metric.import` 负责。
