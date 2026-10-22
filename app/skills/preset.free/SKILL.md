---
name: 版本预设
subtitle: 一键切换免费版与完整版
stage: settings
kind: action
action: preset.free
version: 1.0.0
inputs: [mode]
optional: [mode]
outputs: [disabledModules, mode]
---

## 适用场景

设置页的版本切换。免费版只保留首页、当前稿件、常用资料与一个任务入口。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| mode | 否 | `free`（默认）或 `full` |

## 任务指令

- `free`：`disabledModules` 置为 `benchmark, analysis, assets, works, boards, ledger, plan`
- `full`：清空 `disabledModules`

写回 `_配置.md` 并追加一条变更记录。不删除任何笔记，随时可切回。

## 输出结构

```json
{ "ok": true, "data": { "disabledModules": ["benchmark"], "mode": "free" } }
```

## 边界与注意事项

- 只影响入口与路由。
- 切换是人工动作，Agent 不得代改。
