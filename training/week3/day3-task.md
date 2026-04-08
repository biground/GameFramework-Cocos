# Week 3 Day 3 — UIManager（UI 管理器）

## 日期：2026-04-08

## 学习目标

- 理解 UI 分层管理（UILayer + UIGroup 分组）
- 掌握 UI 表单生命周期（open → cover → reveal → close）
- 学会跨模块协作（ResourceManager + EventManager + ObjectPool）
- 掌握策略注入模式（IUIFormFactory）

## 任务清单

### 1. UIDefs.ts — 类型定义
- [ ] `UILayer` 枚举（Background/Normal/Fixed/Popup/Toast）
- [ ] `UIFormConfig` 接口（path, layer, pauseCoveredForm, allowMultiple）
- [ ] `IUIFormFactory` 接口（createForm, destroyForm）
- [ ] `UIEvents` 事件常量

### 2. UIFormBase.ts — 表单抽象基类
- [ ] `formName` / `layer` / `isOpen` 属性
- [ ] 生命周期钩子：`onOpen` / `onClose` / `onCover` / `onReveal` / `onUpdate`

### 3. IUIManager.ts — 接口定义
- [ ] `setUIFormFactory()` — 注入表单工厂
- [ ] `registerForm()` — 注册表单配置
- [ ] `openForm()` — 打开表单
- [ ] `closeForm()` — 关闭表单
- [ ] `closeAllForms()` — 关闭所有（可按层级）
- [ ] `getForm()` / `hasForm()` — 查询

### 4. UIManager.ts — 实现
- [ ] UIGroup 内部类/Map 管理
- [ ] openForm 流程（缓存/加载/入栈/cover通知）
- [ ] closeForm 流程（出栈/reveal通知/释放资源）
- [ ] 与 ResourceManager 集成
- [ ] 与 EventManager 集成

### 5. 单元测试
- [ ] 模块基础（名称、priority）
- [ ] 表单注册/查询
- [ ] 打开/关闭生命周期
- [ ] Cover/Reveal 通知
- [ ] 同层栈管理
- [ ] 重复打开防御
- [ ] closeAllForms
- [ ] 资源释放验证

## 依赖模块
- ResourceManager（加载 UI 资源）
- EventManager（广播 UI 事件）
- ObjectPool（可选：复用已关闭表单）

## 验收标准
- 所有测试通过
- Code Review ≥ 90/100
- README.md + module-registry.md 更新
