---
name: 记下灵感
subtitle: 把一句话写入收件箱，不做分类
stage: intake
kind: action
action: inbox.capture
version: 1.0.0
inputs: [title]
optional: []
outputs: [path]
---

## 适用场景

首页「想到什么，先原样记下来」入口。捕获时不分类型、不要求结构，整理留到之后再决定。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 是 | 原文内容，同时作为摘要与文件名 |

## 任务指令

在 `01-收件箱/` 创建 `{YYYYMMDD}-{HHmm}-{摘要}.md`，摘要取内容前 30 字，去掉文件名非法字符。

frontmatter 按 `_schema.md` 4.6：`type: inbox`、`status: raw`、`capturedAt`（ISO 时间戳）、`tags: []`。

正文即内容本身，不加结构、不做润色、不自动归类。

## 输出结构

```json
{ "ok": true, "data": { "path": "01-收件箱/20261022-1530-地铁上想到的选题.md" } }
```

## 边界与注意事项

- 不写入任何推断出的类型或标签。
- 不覆盖同名文件，按序号追加。
