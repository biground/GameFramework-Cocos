# UIManager（UI 管理器）

## 职责
统一管理 UI 表单的**配置注册、生命周期调度、分层栈管理、覆盖/恢复通知**。

**不做什么**：不负责实际的节点创建/销毁（由 Runtime 层通过 `IUIFormFactory` 注入），不负责资源加载（当前版本同步创建，后续可集成 ResourceManager 异步加载）。

## 对外 API

```typescript
// 配置
setUIFormFactory(factory: IUIFormFactory): void
registerForm(formName: string, config: UIFormConfig): void

// 操作
openForm(formName: string, data?: unknown, callbacks?: OpenFormCallbacks): void
closeForm(formName: string): void
closeAllForms(layer?: UILayer): void

// 查询
getForm(formName: string): UIFormBase | undefined
hasForm(formName: string): boolean
```

## UIFormBase 生命周期

```
onOpen(data?) → [onCover() ↔ onReveal()] → onClose()
             → onUpdate(dt) 每帧
```

- `onOpen`：表单打开时调用，接收业务数据
- `onCover`：同层有新表单入栈，当前表单被覆盖
- `onReveal`：覆盖物移除，当前表单重新可见
- `onClose`：表单关闭时调用
- `onUpdate`：每帧更新（可选）

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 分层方式 | UILayer 枚举 + 每层独立栈 | 不同层级互不影响（Popup 不覆盖 HUD），同层用栈管理互斥关系 |
| 覆盖通知 | pauseCoveredForm 配置项 | 可选开关，HUD 等固定层不需要暂停通知 |
| 表单创建 | IUIFormFactory 策略注入 | Framework 层不依赖引擎 API，与 IResourceLoader 模式一致 |
| 栈管理 | 数组末尾 = 栈顶 | 简单高效，push/pop 操作 O(1)，splice 用于中间移除 |
| 关闭顺序 | closeAllForms 从栈顶到栈底 | 逆序关闭保证 reveal 通知正确传递 |

## 依赖
- 无直接模块依赖（通过 IUIFormFactory 策略注入解耦）
- 后续版本将集成 ResourceManager（异步加载 UI 资源）和 EventManager（广播 UI 事件）

## 被谁依赖
- Game 层的具体 UI 表单（继承 UIFormBase）
- Runtime 层的 CocosUIFormFactory（实现 IUIFormFactory）

## 已知限制
1. **当前为同步创建**：openForm 直接调 factory.createForm，后续需改为异步（集成 ResourceManager.loadAsset）
2. **层级固定枚举**：不支持运行时动态插入新层级
3. **同层互斥模型**：基于栈，平级共存（如同时显示多个 Normal 面板）需要额外处理
4. **无动画过渡**：打开/关闭是瞬间的，后续可加入异步过渡支持

## 关联测试
- 测试文件路径：`tests/ui/ui-manager.test.ts`
- 测试数量：31 个
- 覆盖场景：模块基础、表单注册、打开/关闭、Cover/Reveal、批量关闭、onUpdate、onShutdown、UIFormBase 基础行为
