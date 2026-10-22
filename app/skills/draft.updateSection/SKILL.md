---
name: 保存正文小节
subtitle: 只写入稿件的某一个小节
stage: writing
kind: action
action: draft.updateSection
version: 1.0.0
inputs: [path, section, content]
optional: [content]
outputs: [path, section]
---

## 适用场景

稿件详情页保存「正文」等小节。六步推进时反复保存，不允许重排其他小节。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| path | 是 | 稿件相对路径 |
| section | 是 | 思路 / 正文 / 标题候选 / 封面 brief / 发布检查 |
| content | 否 | 该小节的新内容，可清空 |

## 任务指令

定位 `## {section}` 标题，只替换到下一个 `##` 之前的内容；frontmatter 与其他小节原样保留。

小节不存在时拒绝（`section_not_found`），不自动新建小节。

## 输出结构

```json
{ "ok": true, "data": { "path": "07-稿件/xxx.md", "section": "正文" } }
```

## 边界与注意事项

- 不允许一次改多个小节。
- 内容里的 `##` 会被当作普通文本，不会破坏结构判断。
