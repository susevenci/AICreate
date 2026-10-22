---
name: 推进拆解
subtitle: 沿三步流程前进一步
stage: intake
kind: action
action: analysis.advance
version: 1.0.0
inputs: [path]
optional: []
outputs: [path, stage]
---

## 适用场景

拆解页每张卡片上的「推进」按钮。一次只前进一步，不跳级。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| path | 是 | 拆解笔记的相对路径 |

## 任务指令

读取 `path` 指向的拆解笔记，把 `stage` 按 `intake → verify → result` 前移一档，同时更新 `updatedAt`。

到达 `result` 后不再推进，返回当前状态即可。正文与其他字段保持不动。

## 输出结构

```json
{ "ok": true, "data": { "path": "05-拆解/xxx.md", "stage": "verify" } }
```

## 边界与注意事项

- 只接受 `type: analysis` 的笔记，其他类型拒绝。
- 不做逆向流转；回退由人工改文件。
- 推进到 `result` 不代表结论已生成，结论仍由 `teardown.analyze` 产出后人工粘贴。
