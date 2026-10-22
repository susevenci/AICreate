---
name: 刷新对标数据
subtitle: 重算信号并记录更新时间（无抓取）
stage: topic
kind: action
action: benchmark.refresh
version: 1.0.0
inputs: []
optional: []
outputs: [lastRefresh, mode]
---

## 适用场景

对标页的「更新动态」。当前数据全部为 L0 手工录入，刷新只重算派生信号并记录时间，不做任何网络请求。

## 输入

无参数。

## 任务指令

把 `_配置.md` 的 `lastRefresh` 置为当天，并在变更记录追加：`刷新对标数据（L0 手工录入，无抓取）`。

不修改任何 source / blogger 笔记，不发起网络请求。

## 输出结构

```json
{ "ok": true, "data": { "lastRefresh": "2026-10-22", "mode": "manual", "previous": "" } }
```

## 边界与注意事项

- 这是**手动刷新**，不是定时抓取；定时抓取已明确不做。
- 页面必须显示「数据更新于 …」，避免把旧数据当实时数据。
