---
name: 博主分析
subtitle: 看作品表现，找可复用的内容规律
stage: topic
kind: ai
version: 1.0.0
inputs: [blogger, works]
optional: []
outputs: [patterns, representative, caveat]
---

## 适用场景

选定一个对标博主后，先看整体表现，再决定拆哪一篇。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| blogger | 是 | 博主名与平台 |
| works | 是 | 作品列表，含播放与互动 |

## 任务指令

博主：{{blogger}}
作品表现：
{{works}}

输出三部分：

1. 内容规律 2-4 条，每条引用具体作品与数字。
2. 推荐 1-2 篇代表作，说明为什么值得拆。
3. 一句风险提示：哪些结论样本不足。

## 输出结构

```yaml
patterns:
  - 规律（带数据）
representative:
  - 作品与理由
caveat: 样本与局限
```

## 边界与注意事项

- 互动突出只是线索，不直接等于适合自己。
- 不编造未提供的数据。
