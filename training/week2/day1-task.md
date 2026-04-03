# 📋 Week 2 Day 1 — 任务卡片

## 🗓️ 日期：2026-03-30（周一）

## 🎯 主题：事件系统 — EventManager

---

## 📖 知识准备（编码前先了解）

1. **为什么需要 EventManager？**
    - 框架中跨模块通信**必须**走事件系统，禁止模块间直接 import
    - EventManager 是整个框架最基础的模块之一（priority 0-99），FSM、Resource、UI 等都依赖它
    - 它解耦了发送方和接收方，让模块可以独立开发、测试、替换

2. **观察者模式 vs 发布-订阅模式**
    - 观察者模式：Subject 直接持有 Observer 引用，1:N 关系
    - 发布-订阅模式：通过中间人（EventBus/Broker）解耦，发布方不知道谁在监听
    - 我们的 EventManager 属于**发布-订阅模式**

3. **类型安全的事件系统设计要点**
    - 用泛型或事件映射（EventMap）让 `on()` 和 `emit()` 的参数类型联动
    - 避免用 `string` 裸传事件名，考虑用枚举或常量约束
    - 回调函数签名要严格，不能用 `any`

4. **常见的坑**
    - 忘记 `off()` 导致内存泄漏（尤其是匿名函数无法取消监听）
    - `once()` 的实现要确保只触发一次后自动移除
    - 同一个回调重复注册的处理策略

---

## 🔨 编码任务

### 任务 1：定义事件回调类型

**文件路径**：`assets/scripts/framework/event/EventDefs.ts`

**需求**：

- 定义事件回调函数类型 `EventCallback<T>`
    - 参数为事件数据 `T`，无返回值
- 定义内部包装结构 `EventBinding<T>`（用于存储回调 + caller + 是否 once）：
    - `callback: EventCallback<T>`
    - `caller: unknown`（回调的 this 上下文，用于精确取消监听）
    - `once: boolean`

**约束**：

- ⚠️ 不能使用 `any`，用 `unknown` 替代不确定类型
- ⚠️ 不能引入 `cc` 命名空间

### 任务 2：实现 `EventManager` 模块

**文件路径**：`assets/scripts/framework/event/EventManager.ts`

**需求**：

- 继承 `ModuleBase`
- `moduleName`: `"EventManager"`
- `priority`: `10`（基础设施层，数值小优先初始化）
- 核心 API：
    - `on<T>(eventName: string, callback: EventCallback<T>, caller?: unknown): void`
        - 注册事件监听，同一 callback + caller 组合不能重复注册
    - `once<T>(eventName: string, callback: EventCallback<T>, caller?: unknown): void`
        - 注册一次性事件监听，触发后自动移除
    - `off<T>(eventName: string, callback: EventCallback<T>, caller?: unknown): void`
        - 移除指定事件的指定回调（需要 callback + caller 匹配）
    - `offAll(eventName?: string): void`
        - 不传参数：清除所有事件的所有监听
        - 传事件名：清除该事件的所有监听
    - `offByCaller(caller: unknown): void`
        - 移除某个 caller 注册的所有事件监听（用于对象销毁时批量清理）
    - `emit<T>(eventName: string, eventData?: T): void`
        - 触发事件，按注册顺序调用所有监听回调
        - `once` 类型的回调触发后自动移除
- 内部用 `Map<string, EventBinding<unknown>[]>` 存储

**约束**：

- ⚠️ `on()` 中如果同一 callback + caller 已注册，**静默忽略**（不抛错，不重复添加）
- ⚠️ `emit()` 过程中如果有 `once` 回调，必须在本次 emit 结束后才移除（避免遍历中修改数组）
- ⚠️ `offByCaller()` 要遍历所有事件，移除该 caller 的所有绑定
- ⚠️ 不能依赖 `cc` 命名空间
- ✅ 所有 public API 必须有中文 JSDoc 注释

### 任务 3：编写单元测试

**文件路径**：`tests/event/event-manager.test.ts`

**需求**：至少覆盖以下测试用例：

1. `on` + `emit`：注册监听后触发事件，回调被正确调用
2. `on` 带 `caller`：验证回调中 `this` 指向正确
3. `once`：一次性监听只触发一次，之后自动移除
4. `off`：取消监听后不再触发
5. `off` 带 `caller`：精确匹配 callback + caller 才能取消
6. `offAll(eventName)`：清除特定事件的所有监听
7. `offAll()`：清除所有事件的所有监听
8. `offByCaller(caller)`：批量移除某个 caller 的所有监听
9. 重复注册同一 callback + caller：不会触发两次
10. `emit` 过程中 `once` 回调的安全移除（不影响后续回调）
11. 事件数据传递：`emit` 传入的数据能正确传到回调

---

## 🧠 思考题（编码完成后回答）

1. **`offByCaller` 的时间复杂度是多少？如果事件和监听器数量很大，有什么优化方案？（提示：空间换时间）**

2. **在 `emit` 遍历回调数组时，如果某个回调内部调用了 `off` 移除自己或其他回调，会发生什么？你的实现是怎么处理的？是否安全？**

3. **TypeScript 的泛型 `EventCallback<T>` 能否真正在运行时保证类型安全？有什么局限性？如果要实现编译期类型安全的事件系统（比如 `on('playerDied', (data: PlayerDeathInfo) => {})`），你会怎么设计？**

---

## ✅ 验收清单

- [ ] `EventDefs.ts` 类型定义完成
- [ ] `EventManager.ts` 实现完成，继承 `ModuleBase`
- [ ] 所有 6 个核心 API（on/once/off/offAll/offByCaller/emit）功能正确
- [ ] `event-manager.test.ts` 至少 11 个测试用例
- [ ] 所有测试通过（`npm test`）
- [ ] 代码中没有 `any` 类型
- [ ] 代码中没有 `cc` 命名空间引用
- [ ] 所有 public API 有中文 JSDoc 注释
- [ ] `git commit` 使用规范格式（如 `feat(event): 实现 EventManager 事件管理器`）

---

## ⏰ 预计耗时

- 知识准备：20 分钟
- 编码：2-3 小时
- 测试：1 小时
- 思考题：30 分钟

## 📌 完成后

在 Copilot Chat 中说："Day 1 完成，请 Review"
