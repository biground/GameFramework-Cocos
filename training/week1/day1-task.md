# 📋 Week 1 Day 1 — 任务卡片

## 🗓️ 日期：2026-03-23（周一）
## 🎯 主题：框架核心 — GameEntry + ModuleBase + GameModule

---

## 📖 知识准备（开始编码前先了解）

1. **Unity GameFramework 的 GameEntry 是什么？**
   - 它是所有 GF 模块的统一入口，负责注册、获取、驱动所有模块的生命周期
   - 类似于一个"模块注册表 + 生命周期调度器"

2. **为什么不用全局单例？**
   - 单例模式让模块之间产生隐式依赖，难以测试和替换
   - 模块注册表模式可以控制初始化顺序、支持模块替换、便于单元测试

3. **框架层 vs 引擎层 的分离原则**
   - `framework/` 下的所有代码不能 import 任何 `cc` 命名空间的东西
   - 这样框架逻辑可以独立测试、甚至移植到其他引擎

---

## 🔨 编码任务

### Task 1: 实现 `ModuleBase` 抽象类

**文件**：`assets/scripts/framework/core/ModuleBase.ts`

**要求**：
- 这是所有框架模块的基类
- 包含以下生命周期方法（抽象或可覆盖）：
  - `onInit(): void` — 模块初始化时调用
  - `onUpdate(deltaTime: number): void` — 每帧更新（默认空实现）
  - `onShutdown(): void` — 模块销毁时调用
- 包含一个只读属性 `priority: number`（用于控制 update 执行顺序，数字越小越先执行）
- 包含一个只读属性 `moduleName: string`（模块名称，用于注册表查找）

**约束**：
- ⚠️ 不能使用 `any` 类型
- ⚠️ 不能引入 `cc` 命名空间
- ✅ 必须有 JSDoc 注释

### Task 2: 实现 `GameModule` 模块管理器

**文件**：`assets/scripts/framework/core/GameModule.ts`

**要求**：
- 这是框架的核心注册表，管理所有 ModuleBase 实例
- 提供以下静态方法：
  - `register(module: ModuleBase): void` — 注册模块（不能重复注册同名模块）
  - `getModule<T extends ModuleBase>(name: string): T` — 获取模块（找不到时抛出错误）
  - `hasModule(name: string): boolean` — 检查模块是否已注册
  - `update(deltaTime: number): void` — 按 priority 顺序调用所有模块的 onUpdate
  - `shutdownAll(): void` — 按 priority **逆序** 调用所有模块的 onShutdown，然后清空注册表
- 内部用 `Map<string, ModuleBase>` 存储
- 需要维护一个按 priority 排序的数组用于 update 调用

**约束**：
- ⚠️ register 时如果已存在同名模块，抛出 Error
- ⚠️ getModule 找不到时，抛出 Error（不要返回 undefined）
- ⚠️ update 必须按 priority 从小到大的顺序调用
- ⚠️ shutdownAll 必须按 priority 从大到小的逆序调用

### Task 3: 实现 `GameEntry` 门面类

**文件**：`assets/scripts/framework/core/GameEntry.ts`

**要求**：
- 这是框架的对外门面（Facade），提供简洁的 API
- 内部委托给 `GameModule`
- 提供以下方法：
  - `static registerModule(module: ModuleBase): void`
  - `static getModule<T extends ModuleBase>(name: string): T`
  - `static update(deltaTime: number): void`
  - `static shutdown(): void`
- 这个类本身很薄，主要是为了提供统一的入口点

**约束**：
- 仅做委托，不要在这里加额外逻辑

### Task 4: 编写单元测试

**文件**：`tests/core/game-module.test.ts`

**要求**：
至少覆盖以下测试用例：
1. 注册模块后能通过 getModule 获取
2. 重复注册同名模块抛出错误
3. 获取不存在的模块抛出错误
4. update 按 priority 从小到大顺序调用
5. shutdownAll 按 priority 从大到小逆序调用
6. shutdownAll 后注册表被清空

---

## 🧠 思考题（编码完成后回答）

完成编码后，请思考并回答以下问题（可以直接在 Copilot Chat 中回答，我会评价）：

1. **为什么 `GameModule` 用静态方法而不是实例方法？这有什么优缺点？如果要支持多个 GameModule 实例（比如主框架 + 子框架），你会怎么改？**

2. **`priority` 排序目前是什么时候做的？每次 register 都排序还是 update 时排序？哪种更好？为什么？**

3. **如果 `onUpdate` 中某个模块抛出了异常，会影响其他模块的 update 吗？你是怎么处理的？应该怎么处理？**

---

## ✅ 验收清单

- [ ] `ModuleBase.ts` 实现完成，有 JSDoc 注释
- [ ] `GameModule.ts` 实现完成，注册/获取/更新/销毁功能正确
- [ ] `GameEntry.ts` 门面类实现完成
- [ ] `game-module.test.ts` 至少 6 个测试用例
- [ ] 所有测试通过
- [ ] 代码中没有 `any` 类型
- [ ] 代码中没有 `cc` 命名空间引用
- [ ] `git commit` 使用规范格式（如 `feat(core): implement GameEntry and ModuleBase`）

---

## ⏰ 预计耗时
- 知识准备：30 分钟
- 编码：2-3 小时
- 测试：30 分钟
- 思考题：30 分钟

## 📌 完成后
将代码 push 到仓库，然后在 Copilot Chat 中说："Day 1 完成，请 Review"
