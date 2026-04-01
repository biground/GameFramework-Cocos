# 📝 模块 README 模板

> 每个模块目录下必须有一个 README.md，按此模板编写。
> Agent 在修改模块前必须先读取对应模块的 README.md。

---

## 模板

```markdown
# {模块名}（{中文名}）

## 职责
一句话说明这个模块做什么，以及它**不做什么**。

## 对外 API

\`\`\`typescript
// 列出所有 public 方法的签名
\`\`\`

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| xxx | xxx | xxx |

## 依赖
- 列出此模块依赖的其他模块

## 被谁依赖
- 列出依赖此模块的其他模块

## 已知限制
- 当前实现的局限性
- 未来可能的改进方向

## 关联测试
- 测试文件路径：`tests/{module}/{module}.test.ts`
```

---

## 使用说明

1. 每完成一个模块，在模块目录下创建 README.md
2. 同时更新 `docs/module-registry.md` 的模块状态
3. Agent 在新 session 中处理模块时，应先读取：
   - `.github/copilot-instructions.md`（自动加载）
   - `docs/module-registry.md`（全局依赖）
   - 对应模块的 `README.md`（模块上下文）
