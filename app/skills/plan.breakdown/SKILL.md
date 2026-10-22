---
name: 目标拆解
subtitle: 把周月目标按可用时间拆成任务建议
stage: plan
kind: ai
version: 1.0.0
inputs: [goal, hours]
optional: [hours]
outputs: [tasks, checkpoints]
---

## 适用场景

计划页把「这周要完成什么」拆成可执行任务。产出只是建议，需人工确认。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| goal | 是 | 周或月目标 |
| hours | 否 | 本周可用小时数，默认 10 |

## 任务指令

目标：{{goal}}
本周可用时间：{{hours}} 小时

输出 3-6 条任务建议，每条包含：任务名、预估分钟、建议日期、为什么安排在这天。

总量不得超过可用时间；宁可少排，不要排满。若目标本身不可在一周内完成，明确指出并给出最小可交付版本。

## 输出结构

```yaml
tasks:
  - title: 任务名
    estimate: 60
    date: 2026-10-23
    reason: 理由
checkpoints:
  - 中期检查点
```

## 边界与注意事项

- 产出 `source: ai` 的草稿，不直接写入正式待办。
- 不替用户决定优先级。
