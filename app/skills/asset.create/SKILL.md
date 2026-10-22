---
name: 沉淀资产
subtitle: 把一个可复用的做法写进四类资产库
stage: topic
kind: action
action: asset.create
version: 1.0.0
inputs: [name, assetType, problem, why, skeleton, source]
optional: [skeleton, source]
outputs: [path, assetType]
---

## 适用场景

拆解出结论后，人工勾选值得保留的做法，落到资产库。资产是跨选题复用的长期材料。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| name | 是 | 资产名称，动词或名词短语 |
| assetType | 是 | `angle` / `structure` / `opening` / `title` |
| problem | 是 | 适合解决什么内容问题 |
| why | 是 | 用户为什么会关心 |
| skeleton | 否 | 结构或模板正文 |
| source | 否 | 来源拆解 wikilink |

## 任务指令

按 `assetType` 决定落盘子目录：`angle→06-资产/选题角度`、`structure→06-资产/文案结构`、`opening→06-资产/开场白`、`title→06-资产/标题`。

文件名 `资产-{name}-{YYYY-MM-DD}.md`，同名追加序号。frontmatter 按 `_schema.md` 4.10 写全：`type`、`assetType`、`name`、`problem`、`why`、`skeleton`、`example`、`source`、`createdAt`。

正文固定两节：`## 用法`、`## 示例`。`problem` 或 `why` 为空时拒绝创建。

## 输出结构

```json
{ "ok": true, "data": { "path": "06-资产/选题角度/资产-用对比找差异-2026-10-22.md", "assetType": "angle" } }
```

## 边界与注意事项

- 不自动从拆解结论生成资产，必须人工确认后调用。
- 一条资产只描述一个做法，不合并多个。
- 来源链接尽量填，便于以后回查原始语境。
