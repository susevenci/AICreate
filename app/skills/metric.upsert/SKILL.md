---
name: 补一条指标
subtitle: 按作品+日期+平台去重写入指标
stage: review
kind: action
action: metric.upsert
version: 1.0.0
inputs: [work, date, platform, views, inquiries, deals]
optional: [platform, views, inquiries, deals]
outputs: [path, updated]
---

## 适用场景

发布与经营页补录单条数据。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| work | 是 | 作品链接或文件名 |
| date | 是 | YYYY-MM-DD，必须真实日期 |
| platform / views / inquiries / deals | 否 | 平台与三口径数字 |

## 任务指令

按 `work + date + platform` 去重：已存在则更新 views/inquiries/deals，不存在则新建 metric 笔记，`source: manual`。

## 输出结构

```json
{ "ok": true, "data": { "path": "08-作品/指标/xxx.md", "updated": false } }
```

## 边界与注意事项

- 日期非法直接拒绝。
- 播放、咨询、成交互不推算。
