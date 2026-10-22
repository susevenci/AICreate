---
name: 记录流水
subtitle: 写入一条收支记录到 10-收支
stage: review
kind: action
action: ledger.create
version: 1.0.0
inputs: [kind, amount, date, category, note]
optional: [note]
outputs: [path, amount]
---

## 适用场景

收支页的「记一笔」入口。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| kind | 是 | `income` 或 `expense` |
| amount | 是 | 金额，正数，最多两位小数 |
| date | 是 | 发生日期 YYYY-MM-DD |
| category | 是 | 课程 / 带货 / 投放 / 订阅 / 其他 |
| note | 否 | 备注 |

## 任务指令

在 `10-收支/` 创建 `流水-{类型}-{分类}-{金额}-{YYYY-MM-DD}.md`。

frontmatter 按 `_schema.md` 4.4：`type: ledger`、`kind`、`amount`（数字）、`date`、`category`、`work: ""`、`note`、`createdAt`。

金额校验：必须为正数、最多两位小数；日期必须是真实日期。任一不满足即拒绝，不做四舍五入兜底。

## 输出结构

```json
{ "ok": true, "data": { "path": "10-收支/流水-收入-课程-399-2026-10-22.md", "amount": 399 } }
```

## 边界与注意事项

- 金额是钱，不是笔数；不得由播放量推算成交，也不得把成交笔数当金额。
- 缺少日期必须拒绝，不允许写入后再补，否则月度统计会静默漏记。
