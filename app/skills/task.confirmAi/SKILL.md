---
name: 确认 AI 建议
subtitle: 把 AI 建议的任务转为自己的计划
stage: plan
kind: action
action: task.confirmAi
version: 1.0.0
inputs: [path]
optional: []
outputs: [path, source]
---

## 适用场景

计划页里标着「AI 建议」的任务。未确认前不进入正式计划。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| path | 是 | 任务相对路径 |

## 任务指令

把 `source` 从 `ai` 改为 `manual`。其他字段与正文不变。

不是 `ai` 来源的任务直接拒绝（`state_invalid`），避免误改人工任务。

## 输出结构

```json
{ "ok": true, "data": { "path": "09-计划/任务/xxx.md", "source": "manual" } }
```

## 边界与注意事项

- 只改来源标记，不改日期与优先级。
- 确认是人工动作，Agent 不得代确认。
