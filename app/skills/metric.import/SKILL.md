---
name: 导入指标
subtitle: 批量导入 CSV，并给出缺失与跳过报告
stage: review
kind: action
action: metric.import
version: 1.0.0
inputs: [csv]
optional: []
outputs: [created, updated, skipped, errors]
---

## 适用场景

发布与经营页的批量导入。数据来自平台后台导出或手工整理。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| csv | 是 | 每行 `作品,日期,平台,播放,咨询,成交`，首行可为表头 |

## 任务指令

逐行解析并按 `work + date + platform` 去重写入（`source: csv`）。日期缺失或非法的行跳过，计入 `skipped` 并在 `errors` 说明。

完成后重定向到 `/works?imported=1&created=&updated=&skipped=`，页面顶部显示导入报告。

## 输出结构

```json
{ "ok": true, "data": { "created": 2, "updated": 0, "skipped": 1, "errors": ["缺少作品或日期：…"] } }
```

## 边界与注意事项

- 单行失败不影响其余行。
- 不覆盖已有作品与稿件。
- 不做单位换算，数字按列原样记录。
