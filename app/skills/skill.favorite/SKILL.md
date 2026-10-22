---
name: 收藏助手
subtitle: 把常用 Skill 收进我的常用
stage: settings
kind: action
action: skill.favorite
version: 1.0.0
inputs: [id, active]
optional: []
outputs: [favorites, active]
---

## 适用场景

助手页每张卡片右上角的收藏 / 取消收藏。

## 输入

| 参数 | 必填 | 说明 |
|------|------|------|
| id | 是 | Skill 目录名 |
| active | 是 | true 收藏，false 取消 |

## 任务指令

读写 `00-工作台/_配置.md` 的 `favorites` 数组：收藏时去重追加，取消时移除。不新建文件、不写 localStorage。

## 输出结构

```json
{ "ok": true, "data": { "favorites": ["topic.evaluate"], "active": true } }
```

## 边界与注意事项

- 收藏属于偏好，必须落在 `_配置.md`，保证换设备后仍在。
- 不改 Skill 本体。
