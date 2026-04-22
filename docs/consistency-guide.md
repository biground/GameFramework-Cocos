# 🛡️ 一致性守卫指南

> 本文档定义了确保跨 session 开发一致性的规则和流程。
> 所有参与开发的人（包括 AI Agent）都必须遵守。

## 问题背景

本项目为期 8 周，每天的开发任务可能在不同的 Copilot Chat session 中进行。
由于 AI Agent 无法跨 session 保持记忆，需要通过文档和流程来保证一致性。

## 一致性的三个维度

### 1. 架构一致性 — "做的东西对不对"

确保每个模块都遵循相同的架构模式。

**检查点**：

- [ ] 模块是否继承了 `ModuleBase`？
- [ ] 模块是否通过 `GameModule` 注册？
- [ ] framework/ 层是否引用了 `cc` 命名空间？（必须为否）
- [ ] 是否通过 `EventManager` 进行跨模块通信？
- [ ] `priority` 是否遵循 `docs/module-registry.md` 的分配规范？

### 2. 风格一致性 — "代码长什么样"

确保所有代码遵循统一的编码规范。

**检查点**：

- [ ] 命名规范：PascalCase(类) / camelCase(方法)
- [ ] 所有 public API 有中文 JSDoc 注释
- [ ] 无 `any` 类型
- [ ] 无 `console.log`（使用 Logger）
- [ ] 错误处理方式一致（throw Error with 描述性消息）

### 3. 设计一致性 — "模块的 API 风格统一"

确保各模块的 API 设计遵循统一的范式。

**统一的模块生命周期**：

```typescript
onInit() → onUpdate(dt) → onShutdown()
```

**统一的资源获取模式**：

```typescript
// ✅ 正确：通过 GameEntry 获取模块
const uiMgr = GameEntry.getModule<UIManager>('UIManager');

// ❌ 错误：直接 import 使用
import { UIManager } from '../ui/UIManager';
UIManager.getInstance().openUI(...);
```

**统一的错误处理模式**：

```typescript
// ✅ 正确：描述性错误消息
throw new Error(`[UIManager] 找不到 UI 面板：${formName}，请检查是否已注册`);

// ❌ 错误：模糊的错误
throw new Error('not found');
```

## 每个 Session 的启动流程

当在新的 Copilot Chat session 中开始工作时，按以下流程对齐上下文：

### 第一步：告知 Agent 读取上下文

```
我是用户，继续 Framework Blaze Ignite 的开发。
请先读取以下文件：
1. .github/copilot-instructions.md
2. docs/module-registry.md
3. training/progress.md
然后告诉我当前进度和今天应该做什么。
```

### 第二步：开发过程中的一致性检查

每完成一个功能点，自查：

- 是否符合 `docs/consistency-guide.md` 的三个检查维度？
- 是否需要更新 `docs/module-registry.md`？
- 是否需要更新模块的 `README.md`？

### 第三步：Session 结束时的收尾

```
今天的开发结束了，请帮我：
1. 更新 training/progress.md 的"上次会话断点"
2. 检查今天的代码是否通过一致性检查
3. 列出明天需要继续的事项
```

## Agent 一致性自查 Prompt

如果你怀疑 Agent 可能偏离了设计，可以用这个 Prompt 让它自查：

```
请对照以下文件进行一致性自查：
1. 读取 docs/module-registry.md — 检查我刚才写的代码是否符合模块依赖关系
2. 读取 docs/consistency-guide.md — 逐项检查架构/风格/设计一致性
3. 读取对应模块的 README.md — 检查实现是否符合设计文档

如果发现偏离，请指出并给出修正建议。
```

## 一致性违规清单（持续更新）

记录发现的一致性违规问题和修复方案：

| 日期       | 违规描述 | 所在文件 | 修复状态 |
| ---------- | -------- | -------- | -------- |
| （待记录） |          |          |          |
