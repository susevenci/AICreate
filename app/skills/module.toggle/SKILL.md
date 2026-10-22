---
name: 开关模块
subtitle: 关闭或开启一个功能模块
stage: settings
kind: action
action: module.toggle
version: 1.0.0
inputs: [module, enabled]
optional: []
outputs: [disabledModules, enabled]
---

## 适用场景

设置页「模块开关」。关闭后导航隐藏、路由返回 404。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| module | 是 | benchmark / topics / analysis / assets / drafts / works / plan / boards / ledger |
| enabled | 是 | true 开启，false 关闭 |

## 任务指令

维护 `_配置.md` 的 `disabledModules` 数组：`enabled=false` 时加入并去重，`true` 时移除。不删除任何笔记。

## 输出结构

```json
{ "ok": true, "data": { "disabledModules": ["boards"], "enabled": false } }
```

## 边界与注意事项

- 只影响入口与路由，不迁移数据。
- 重新开启即可恢复，无需重装。
