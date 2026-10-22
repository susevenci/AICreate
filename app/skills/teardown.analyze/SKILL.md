---
name: 爆文拆解
subtitle: 逐篇分析亮点、不足与可借鉴做法
stage: intake
kind: ai
version: 1.0.0
inputs: [title, sources]
optional: []
outputs: [highlights, weaknesses, borrowable]
---

## 适用场景

拆解第二步到第三步：原文已核对，需要产出结论。一次可以拆多篇，但结论必须逐篇写。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 是 | 本次拆解的主题 |
| sources | 是 | 原文，多篇用分隔线隔开 |

## 任务指令

拆解主题：{{title}}
原文：
{{sources}}

逐篇输出三部分，每部分 2-4 条：

1. 亮点：这篇哪里有效，为什么有效。
2. 不足：哪里没做到，导致什么后果。
3. 可借鉴做法：能迁移到其他内容的具体动作，动词开头。

每条结论必须带原文引用（不超过 40 字的摘录），没有原文支撑的判断不要写。

## 输出结构

```yaml
highlights:
  - text: 亮点结论
    quote: 原文摘录
weaknesses:
  - text: 不足结论
    quote: 原文摘录
borrowable:
  - 可迁移动作
```

## 边界与注意事项

- 只基于给出的原文，不补充外部案例。
- 不足必须写具体后果，禁止「不够吸引人」这类空话。
- 不直接生成资产；资产由人确认后用 `asset.create` 落盘。
