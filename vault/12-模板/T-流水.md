<!-- 依赖 Templater 插件；字段契约见 00-工作台/_schema.md 4.4 -->
---
type: ledger
kind: income
amount: 0
date: <% tp.date.now("YYYY-MM-DD") %>
category: 其他
work: ""
note: ""
createdAt: <% tp.date.now("YYYY-MM-DD") %>
---

# <% tp.file.title %>

## 备注

> amount 为金额，不是笔数；与成交笔数不互相推算。
