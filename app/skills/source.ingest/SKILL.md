---
name: 好内容消化
subtitle: 把一篇素材压成要点与可做选题点
stage: intake
kind: ai
version: 1.0.0
inputs: [material]
optional: []
outputs: [summary, keyPoints, topicHints]
---

## 适用场景

拆解第一步「放入素材」之前：手上有一篇长文、一个链接或一段口播稿，先判断它值不值得拆。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| material | 是 | 正文、链接或文件路径，可多段 |

## 任务指令

阅读素材 {{material}}，输出三部分：

1. 一句话摘要：这篇在讲什么。
2. 3-5 条关键点：每条不超过 30 字，只保留可验证的信息。
3. 可做选题点：2-3 条，每条写出「观众问题 + 我能提供的材料」，材料不足要明说。

禁止改写原文观点、禁止补充素材里没有的数据。

## 输出结构

```yaml
summary: 一句话摘要
keyPoints:
  - 关键点
topicHints:
  - problem: 观众问题
    material: 可用的材料
```

## 边界与注意事项

- 素材为空直接拒绝。
- 只做提炼，不产出正文，不生成标题。
