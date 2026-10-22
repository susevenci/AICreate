---
name: 同步 YouTube 频道
subtitle: 用官方 API 拉取频道作品与统计
stage: topic
kind: action
action: source.sync
version: 1.0.0
inputs: [channelId, max]
optional: [max]
outputs: [created, updated, skipped, errors]
---

## 适用场景

对标页「YouTube 官方同步」。唯一允许联网的采集路径，仅覆盖 YouTube。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| channelId | 是 | 频道 ID（UC 开头） |
| max | 否 | 拉取条数，1-50，默认 10 |

## 任务指令

调用 `channels` → `playlistItems` → `videos` 三个官方接口，取标题、发布时间、播放、点赞、评论，按 `platform + platformId` 去重 upsert。

写入 `collector: youtube-api`、`sourceLevel: L2`、`fetchedAt`。

未配置 `YOUTUBE_API_KEY` 时直接返回 `missing_key`，页面按钮禁用，降级为手工录入或浏览器提取。

## 输出结构

```json
{ "ok": true, "data": { "created": 10, "updated": 0, "skipped": 0, "errors": [] } }
```

## 边界与注意事项

- 只读公开数据，不读取私密或会员内容。
- 单次最多 50 条，避免配额浪费；配额耗尽时降级为手工。
- 密钥只存 `.env.local`，不得写入 vault 或前端。
