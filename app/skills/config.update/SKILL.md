---
name: 更新工作台配置
subtitle: 修改名称、平台与主题，并写变更记录
stage: settings
kind: action
action: config.update
version: 1.0.0
inputs: [name, platforms, theme]
optional: [platforms, theme]
outputs: [name, redirect]
---

## 适用场景

首次打开工作台时的初始化页，以及设置页的「保存」按钮。名称是唯一必填项。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| name | 是 | 工作台显示名称，建议格式「{前缀}AI内容工作台」 |
| platforms | 否 | 常用平台，逗号分隔 |
| theme | 否 | `dark` 或 `light` |

## 任务指令

改写 `00-工作台/_配置.md` 的 frontmatter：`name`、`platforms`（数组）、`theme`、`updatedAt`。

同时在正文 `## 变更记录` 下追加一行：`{YYYY-MM-DD} | 人工 | 更新配置：name={name}`。

`name` 为空时拒绝，返回 `field_required`。本 Skill 是唯一允许修改 `name` 的写入口；Agent 与脚本一律不得改动该字段。

## 输出结构

```json
{ "ok": true, "data": { "name": "我的AI内容工作台", "redirect": "/settings?saved=1" } }
```

首次初始化（此前 `name` 为空）返回 `redirect: "/"`，已初始化则返回 `"/settings?saved=1"`。

## 边界与注意事项

- 不改 `schemaVersion`、阈值类字段；阈值变更需人工改文件并写明理由。
- 变更记录只追加，不覆盖历史行。
