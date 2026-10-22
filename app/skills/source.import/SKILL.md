---
name: 导入对标作品
subtitle: 把浏览器提取的 CSV 写进对标库
stage: topic
kind: action
action: source.import
version: 1.0.0
inputs: [csv]
optional: []
outputs: [created, updated, skipped, errors]
---

## 适用场景

对标页「导入提取结果」。CSV 来自书签提取器（B站/小红书/抖音/快手），也可来自平台后台导出。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| csv | 是 | 表头：platform,platformId,title,url,author,views,likes,comments,shares,publishedAt |

## 任务指令

逐行解析并按 `platform + platformId`（缺 platformId 时用 url）去重：已存在则更新互动数与 `fetchedAt`，不存在则新建 `source` 笔记。

写入字段：`platform`、`platformId`、`url`、`views/likes/comments/shares`、`collector: browser-extract`、`sourceLevel: L1`、`fetchedAt`。

完成后重定向到 `/benchmark?imported=1&created=&updated=&skipped=` 并显示报告。

## 输出结构

```json
{ "ok": true, "data": { "created": 2, "updated": 0, "skipped": 1, "errors": ["缺少 platformId 与链接"] } }
```

## 边界与注意事项

- 缺平台或缺 id/链接的行跳过，计入报告，不整批失败。
- 只接受公开可见字段，不补造播放与互动。
- 同一作品重复提取只更新，不新增。
