---
name: 文案写作
subtitle: 按思路与资产写出正文初稿
stage: writing
kind: ai
version: 1.0.0
inputs: [title, audience, outline, assets]
optional: [assets]
outputs: [body, notes]
---

## 适用场景

创作第二步「写文案」。思路已定，需要一版可改的初稿。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| title | 是 | 标题或暂定标题 |
| audience | 是 | 目标读者与问题 |
| outline | 是 | 思路与结构选择 |
| assets | 否 | 可引用的角度/结构/开场白/标题资产 |

## 任务指令

按以下信息写一版正文初稿：

- 标题：{{title}}
- 读者与问题：{{audience}}
- 结构：{{outline}}
- 可复用资产：{{assets}}

要求：开头三句内进入具体场景；每段只讲一件事；结尾给出一个可执行动作。全文控制在 800-1200 字。

禁止编造数据与案例，材料不足处写「待补充」，不要用模糊描述糊过去。

## 输出结构

```yaml
body: 正文 Markdown
notes:
  - 需要人工补充材料的位置
```

## 边界与注意事项

- 只出初稿，不定稿；定稿由人工保存小节完成。
- 不使用「大家都知道」「众所周知」这类填充句。
