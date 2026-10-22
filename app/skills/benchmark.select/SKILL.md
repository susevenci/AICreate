---
name: 对标判断
subtitle: 判断这个博主或爆款适不适合自己
stage: topic
kind: ai
version: 1.0.0
inputs: [signal, myPosition]
optional: []
outputs: [verdict, reason, nextStep]
---

## 适用场景

对标页看到互动突出的内容，先判断是否适合自己再投入拆解。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| signal | 是 | 对标对象与数据表现 |
| myPosition | 是 | 我的定位、受众与已有材料 |

## 任务指令

对标信号：{{signal}}
我的情况：{{myPosition}}

输出：

1. 结论：`适合` / `不适合` / `待观察` 三选一。
2. 理由两句话：一句说匹配点，一句说不匹配点。
3. 下一步：给出一个具体动作（例如「先拆这一篇的封面结构」）。

## 输出结构

```yaml
verdict: 适合
reason: 匹配点…；不匹配点…
nextStep: 具体动作
```

## 边界与注意事项

- 理由必须基于输入，不臆测我的资源。
- `待观察` 时必须说明还缺什么信息。
