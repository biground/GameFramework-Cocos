# Framework Blaze Ignite — Agent Rules

> 本文件是 OpenCode AI agent 的仓库级规则。所有 AI 会话自动加载此文件。
> 优先级：用户指令 > 本文件 > 默认系统提示。

---

## 项目概述

引擎无关的模块化 TypeScript 游戏框架，灵感源自 Unity GameFramework，通过 IoC/DI 实现引擎解耦。
兼作 8 周主程培训项目。

### Build & Test

```bash
npm test              # Jest 单元测试（框架层）
npm run test:coverage # 覆盖率报告
npm run lint          # ESLint 检查
npm run format        # Prettier 格式化
```

Demo 相关命令（在对应 worktree 分支中执行）：

```bash
```


---

## 架构

三层分离，详见 [docs/architecture.md](docs/architecture.md)：

| 层        | 路径                        | 职责         | 约束                          |
| --------- | --------------------------- | ------------ | ----------------------------- |
| Framework | `assets/scripts/framework/` | 纯 TS 框架层 | **禁止** `import` cc 命名空间 |
| Game      | 各 demo worktree 分支          | Demo 业务层  | 依赖接口，不依赖实现          |

### 硬性规则

1. 所有模块继承 `ModuleBase`，通过 `GameModule.register()` 注册
2. 跨模块通信 **必须** 走 `EventManager`，禁止直接引用其他模块实现类
3. 频繁创建销毁的对象 **必须** 走 `ObjectPool`
4. 每个模块先在 `framework/interfaces/` 定义接口，业务层依赖接口
5. `GameModule.register()` 支持 `allowReplace`，第三方插件可替换默认实现
6. 插件命名：`fbi-{plugin-name}`，peerDependency 指向 `@fbi/core`
7. Priority 分配：0-99 基础设施 / 100-199 核心服务 / 200-299 业务模块（详见 [docs/module-registry.md](docs/module-registry.md)）

### 生命周期

- init: priority 升序 | update: priority 升序 | shutdown: priority **降序**
- 模块签名：`onInit()` → `onUpdate(deltaTime: number)` → `onShutdown()`

---

## Demo Worktree 分离

main 分支为纯框架仓库，Demo 业务代码已分离到独立的 git worktree 分支：

| Demo | 分支 | Worktree 路径 |
| --- | --- | --- |


---

## 代码规范（铁律）

### 必须遵守

- TypeScript strict mode（tsconfig `strict: true`）
- PascalCase: 类/接口/枚举 | camelCase: 方法/属性/变量
- 所有 public API 必须有 **中文 JSDoc**
- **禁止** `any` 类型
- **必须** 用 `Logger` 代替 `console.log` / `console.warn` / `console.error` / `console.info` / `console.debug`
    - Logger 已实现，位于 `assets/scripts/framework/debug/Logger.ts`
    - 用法：`Logger.debug('Tag', '消息', ...args)` / `Logger.info('Tag', ...)` / `Logger.warn('Tag', ...)` / `Logger.error('Tag', ...)`
    - Tag 使用模块名，如 `'ResourceManager'`、`'UIManager'`
    - 框架层已有 Logger，**任何模块代码中不得出现 console 调用**
- 优先组合而非继承
- 泛型用于类型安全收益明确的场景
- Commit 遵循 Conventional Commits（commitlint 已配置）

### 约定

- 幻影类型（phantom type）用于 `EventKey<T>` 和 `ServiceKey<T>` 的类型安全
- `GameModule` 使用脏标记优化：register 后标记 dirty，update 前才排序
- emit 采用快照遍历，once 回调在遍历完成后才移除
- ObjectPool.release 防重复入池（includes 检查）
- 错误消息格式：`[模块名] 描述性消息`

---

## 已有模块速查

> 编写代码前必须先读 [docs/module-registry.md](docs/module-registry.md) 了解全局依赖关系。

| 模块       | 状态 | 关键文件                                                                                                               |
| ---------- | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| Core       | ✅   | `framework/core/GameEntry.ts`, `GameModule.ts`, `ModuleBase.ts`                                                        |
| Event      | ✅   | `framework/event/EventManager.ts`, `EventDefs.ts`                                                                      |
| ObjectPool | ✅   | `framework/objectpool/ObjectPool.ts`                                                                                   |
| DI/IoC     | ✅   | `framework/di/Container.ts`, 装饰器                                                                                    |
| FSM        | ✅   | `framework/fsm/FsmManager.ts`, `Fsm.ts`, `FsmState.ts`                                                                 |
| Procedure  | ✅   | `framework/procedure/ProcedureManager.ts`, `ProcedureBase.ts`                                                          |
| Resource   | ✅   | `framework/resource/ResourceManager.ts`                                                                                |
| UI         | ✅   | `framework/ui/UIManager.ts`, `UIFormBase.ts`                                                                           |
| Network    | ✅   | `framework/network/NetworkManager.ts`, `NetworkChannel.ts`                                                             |
| Audio      | ✅   | `framework/audio/AudioManager.ts`                                                                                      |
| Scene      | ✅   | `framework/scene/SceneManager.ts`                                                                                      |
| Timer      | ✅   | `framework/timer/TimerManager.ts`                                                                                      |
| DataTable  | ✅   | `framework/datatable/DataTableManager.ts`                                                                              |
| i18n       | ✅   | `framework/i18n/LocalizationManager.ts`, `LocalizationDefs.ts`                                                         |
| Logger     | ✅   | `framework/debug/Logger.ts`, `LoggerDefs.ts`                                                                           |
| Entity     | ⬜   | 待开发                                                                                                                 |
| Data       | ⬜   | 待开发                                                                                                                 |
| HotUpdate  | ✅   | `framework/hotupdate/HotUpdateManager.ts`, `HotUpdateDefs.ts`, `interfaces/IHotUpdateManager.ts`                       |
| DebugPanel | ✅   | `framework/debug/DebugManager.ts`, `DebugDefs.ts`, `datasources/ModuleDataSource.ts`, `datasources/EventDataSource.ts` |

---

## 开发流程

### 创建新模块时

1. 先读 `docs/module-registry.md` 确认依赖关系和 priority 范围
2. 在 `framework/interfaces/` 定义接口
3. 在 `framework/{module}/` 创建实现文件
4. 在 `tests/{module}/` 编写单元测试（TDD）
5. 创建模块 `README.md`（模板：`docs/module-readme-template.md`）
6. 更新 `docs/module-registry.md` 的状态和 API
7. 更新 `training/progress.md`

### 代码审查标准（满分 100）

| 维度     | 权重 |
| -------- | ---- |
| 正确性   | 30%  |
| 架构     | 25%  |
| 类型安全 | 20%  |
| 性能     | 15%  |
| 代码风格 | 10%  |

---

## 培训规则

本项目是 8 周主程培训（2026-03-23 ~ 2026-05-17）。实时进度见 `training/progress.md`。

### 培训铁律

1. **实战为主**：每次对话必须包含可执行的 code 任务或 demo
2. **主动补短板**：发现薄弱环节必须主动加强训练
3. **动态调整**：某项完成得很好，立即提升难度或切换方向
4. **面试导向**：总结环节必须以面试官身份考核
5. **严格但鼓励**：直接指出问题，也要认可进步
6. **Code Review**：每次代码提交都按主程标准 Review
7. **自动建文件**：源文件不存在时自动创建骨架（imports、类声明、方法签名、JSDoc 占位），不需询问用户
8. **当日收尾（自动触发）**：判断当日任务全部完成时：
    - ① 更新 `training/progress.md`
    - ② 生成明日任务卡 `training/weekN/dayN-task.md`
    - ③ 给用户热情洋溢的夸赞

### 对话恢复

用户说"继续培训"或"今天的任务是什么"时：

1. 读 `training/progress.md` — 进度 + 会话断点
2. 读最近的 `training/weekN/dayN-task.md` — 上次任务
3. 根据完成情况决定今天任务

### 模块路线图

- Phase 1 (Week 1-2): Core, Event, ObjectPool, DI/IoC, FSM, Procedure
- Phase 2 (Week 3-4): Resource, UI, Entity, Network, Audio, Scene
- Phase 3 (Week 5-6): 性能优化, CI/CD, 热更新, DataTable, Timer, i18n, Logger/Debug
- Phase 4 (Week 7-8): 综合 Demo, 面试冲刺

### 面试模式

用户说"面试模拟"时 → 切换为严格面试官。
评分：深度 40% + 广度 30% + 表达 30%。

---

## Session 连续性

本项目跨 session 开发。当用户说"继续培训"或开始新任务时，**必须先读**：

- `training/progress.md` — 当前进度和会话断点
- `docs/module-registry.md` — 模块依赖关系
- 当前模块的 `README.md`（如存在）

设计决策不确定时：先读上述文件 → 遵循已有模块的模式 → 发现不一致则提醒用户

---

## Demo 设计规则

- **日志输出不能爆炸式增长**：周期性产出（如建筑每秒产金）不应逐条追加日志。应使用「状态面板原地更新」展示当前值，仅在关键事件（购买、升级、成就）时追加日志行。
- 文字版游戏 UI 要区分「当前状态」（StatusPanel，实时覆写）和「事件历史」（日志区，仅关键事件追加）。
- HtmlRenderer 应提供「原地更新」能力：对同一 key 的内容做 DOM 替换而非追加。
