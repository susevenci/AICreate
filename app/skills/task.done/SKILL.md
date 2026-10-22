---
name: 完成待办
subtitle: 把一条任务标记为已完成
stage: plan
kind: action
action: task.done
version: 1.0.0
inputs: [path]
optional: []
outputs: [path, status]
---

## 适用场景

首页待办列表右侧的「完成」按钮。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| path | 是 | 任务笔记的相对路径 |

## 任务指令

把 `path` 指向笔记的 `status` 改为 `done`，其余字段与正文不变。

不写入完成时间等派生字段；完成统计一律由视图按 `status` 现算。

## 输出结构

```json
{ "ok": true, "data": { "path": "09-计划/任务/xxx.md", "status": "done" } }
```

## 边界与注意事项

- 只改状态，不移动文件，不归档。
- 已完成的任务不会出现在首页今日待办。
