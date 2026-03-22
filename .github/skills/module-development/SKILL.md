---
name: module-development
description: 标准的框架模块开发流程。当需要创建新的框架模块时使用此 skill。
---

# 框架模块开发标准流程

当大圆要开发一个新的框架模块时，按以下步骤执行：

## 第一步：对齐上下文
1. 读取 `docs/module-registry.md` 确认该模块的依赖关系和 priority 范围
2. 读取 `docs/consistency-guide.md` 了解一致性要求
3. 如果模块有前置依赖（如 FSM 依赖 EventManager），确认依赖模块已完成

## 第二步：设计先行
1. 与大圆讨论模块的职责边界（做什么 & 不做什么）
2. 确定对外 API 签名
3. 确定关键设计决策（用什么数据结构、什么模式）

## 第三步：实现
1. 在 `assets/scripts/framework/{module}/` 创建文件
2. 代码必须遵循：
   - 继承 `ModuleBase`
   - framework/ 层禁止依赖 `cc` 命名空间
   - 所有 public API 有中文 JSDoc
   - 无 `any`，无 `console.log`

## 第四步：测试
1. 在 `tests/{module}/` 编写单元测试
2. 测试覆盖：正常流程 + 边界情况 + 错误处理

## 第五步：文档收尾
1. 在模块目录创建 `README.md`（参考 `docs/module-readme-template.md`）
2. 更新 `docs/module-registry.md` 的模块状态和 API
3. 更新 `training/progress.md`
