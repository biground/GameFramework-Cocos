# Framework Blaze Ignite — Copilot 项目指令

引擎无关的模块化 TypeScript 游戏框架，灵感源自 Unity GameFramework，通过 IoC/DI 实现引擎解耦。
兼作 8 周主程培训项目（详见 `training/progress.md`）。

## 技术栈

| 分类     | 技术                                 | 版本/说明                                      |
| -------- | ------------------------------------ | ---------------------------------------------- |
| 语言     | TypeScript                           | 5.4+，`strict: true`                           |
| 目标     | ES2020                               | `module: ES2020`，`moduleResolution: node`     |
| 测试     | Jest + ts-jest                       | 单元/集成测试                                  |
| E2E      | Playwright                           | 浏览器端 Demo 验收                             |
| 构建     | esbuild                              | Demo 打包（非框架本身）                        |
| Lint     | ESLint + @typescript-eslint          | `no-explicit-any: error`，`no-console: warn`   |
| 格式化   | Prettier                             | 4 空格缩进，单引号，100 字符行宽，尾逗号       |
| Git Hook | husky + lint-staged + commitlint     | Conventional Commits                           |
| DI       | reflect-metadata                     | 装饰器元数据（`experimentalDecorators: true`） |
| CI       | Jenkins + GitHub Actions + GitLab CI | 三平台并行                                     |

## 构建与验证命令

```bash
npm test                # Jest 单元/集成测试
npm run test:coverage   # 覆盖率报告
npm run lint            # ESLint 检查
npm run lint:fix        # ESLint 自动修复
npm run format          # Prettier 格式化
npx tsc --noEmit        # TypeScript 类型检查
npm run test:e2e        # Playwright E2E 测试（需先 npx playwright install chromium）
npm run demo1:serve     # Idle Clicker Demo（端口 3001）
npm run demo2:serve     # Turn-based RPG Demo（端口 3002）
```

路径别名（`tsconfig.json` + `jest.config.js` 同步配置）：

- `@framework/*` → `assets/scripts/framework/*`
- `@runtime/*` → `assets/scripts/runtime/*`
- `@game/*` → `assets/scripts/game/*`
- `@utils/*` → `assets/scripts/utils/*`

## 目录结构与职责

```
assets/scripts/
├── framework/          # 纯 TS 框架层（禁止 import cc）
│   ├── core/           # GameEntry, GameModule, ModuleBase
│   ├── interfaces/     # 模块接口定义（IEventManager, IResourceManager 等）
│   ├── event/          # EventManager — 事件系统
│   ├── objectpool/     # ObjectPool + ReferencePool — 对象池
│   ├── di/             # Container + Decorators — 依赖注入
│   ├── fsm/            # FsmManager + Fsm + FsmState — 有限状态机
│   ├── procedure/      # ProcedureManager — 流程管理
│   ├── resource/       # ResourceManager — 资源管理（策略注入）
│   ├── ui/             # UIManager — 分层栈式 UI 管理
│   ├── network/        # NetworkManager + NetworkChannel — 网络通信
│   ├── audio/          # AudioManager — 音频管理
│   ├── scene/          # SceneManager — 场景管理
│   ├── entity/         # EntityManager + EntityGroup — 实体管理
│   ├── timer/          # TimerManager — 定时器（Array+Map 双索引）
│   ├── datatable/      # DataTableManager — 数据表
│   ├── i18n/           # LocalizationManager — 国际化
│   ├── hotupdate/      # HotUpdateManager — 热更新
│   └── debug/          # Logger + DebugManager — 日志与调试
├── runtime/            # 引擎适配层（唯一允许依赖 cc 的层）
│   └── i18n/           # LocalizedLabel, LocalizedSprite（cc 组件）
├── game/               # Demo 业务层（依赖接口，不依赖实现）
│   ├── shared/         # DemoBase, HtmlRenderer, 全部 Mock 策略实现
│   ├── demo1-idle/     # Idle Clicker Demo
│   └── demo2-rpg/      # Turn-based RPG Demo
└── utils/              # 工具函数（待开发）

packages/               # 独立插件包
├── fbi-ecs/            # ECS 实体组件系统（SparseSet + BitMask）
├── fbi-timer-heap/     # 最小堆定时器（O(log n) 触发）
└── fbi-timer-wheel/    # 时间轮定时器（O(1) 添加/触发）

tests/                  # 测试目录（镜像 framework/ 结构）
├── __mocks__/cc.ts     # Cocos Creator cc 模块全局 Mock
├── {module}/           # 各模块单元测试
├── game/               # Demo 业务测试
├── integration/        # 集成测试
└── e2e/                # Playwright E2E 测试
```

## 三层架构

| 层        | 路径                        | 职责         | 约束                          |
| --------- | --------------------------- | ------------ | ----------------------------- |
| Framework | `assets/scripts/framework/` | 纯 TS 框架层 | **禁止** `import` cc 命名空间 |
| Runtime   | `assets/scripts/runtime/`   | 桥接引擎 API | 唯一允许依赖 cc 的层          |
| Game      | `assets/scripts/game/`      | Demo 业务层  | 依赖接口，不依赖实现          |

### 架构硬性规则

1. 所有模块继承 `ModuleBase`，通过 `GameModule.register()` 注册
2. 跨模块通信 **必须** 走 `EventManager`，禁止直接引用其他模块实现类
3. 频繁创建销毁的对象 **必须** 走 `ObjectPool`
4. 每个模块先在 `framework/interfaces/` 定义接口，业务层依赖接口
5. `GameModule.register()` 支持 `allowReplace`，第三方插件可替换默认实现
6. 插件命名：`fbi-{plugin-name}`，peerDependency 指向 `@fbi/core`
7. Priority 分配：0-99 基础设施 / 100-199 核心服务 / 200-299 业务模块 / 300-399 上层逻辑 / 400+ 调试工具

### 模块生命周期

- init / update → priority **升序** | shutdown → priority **降序**
- 模块签名：`onInit()` → `onUpdate(deltaTime: number)` → `onShutdown()`
- `onUpdate` 有默认空实现，不需帧更新的模块无需 override

### 模块依赖关系

```
GameEntry（框架入口 Facade）
  ├── Logger(0) — 无依赖，最先初始化
  ├── EventManager(10) — 无依赖
  ├── ObjectPool(10) — 无依赖
  ├── TimerManager(10) — 无依赖
  ├── FsmManager(110) → EventManager
  ├── ResourceManager(100) → Event, ObjectPool
  ├── ProcedureManager(300) → FSM
  ├── AudioManager(210) → ResourceManager
  ├── DataTableManager(310) → ResourceManager
  ├── SceneManager(220) → ResourceManager, EventManager
  ├── UIManager(200) → ResourceManager, EventManager, ObjectPool
  ├── EntityManager(180) → ResourceManager, EventManager, ObjectPool
  ├── NetworkManager(130) → EventManager
  ├── HotUpdateManager(140) → EventManager, Logger
  ├── LocalizationManager(350) → ResourceManager, EventManager
  └── DebugManager(400) — 最后初始化
```

## 编码规范

### 命名约定

| 类型               | 规则                                                   | 示例                                                |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------- |
| 类 / 接口 / 枚举   | PascalCase                                             | `EventManager`, `IResourceManager`, `UILayer`       |
| 方法 / 属性 / 变量 | camelCase                                              | `loadAsset()`, `_eventMap`, `deltaTime`             |
| 私有字段           | `_` 前缀 camelCase                                     | `private _loader`, `private _assets`                |
| 静态只读常量       | PascalCase 或 UPPER_SNAKE                              | `private static readonly TAG = 'ModuleName'`        |
| EventKey           | `UPPER_SNAKE_CASE`                                     | `const GOLD_CHANGED = new EventKey<...>(...)`       |
| FSM 状态名         | `as const` 对象                                        | `{ IDLE: 'Idle', PRODUCING: 'Producing' } as const` |
| 文件名（框架层）   | PascalCase.ts                                          | `EventManager.ts`, `ResourceDefs.ts`                |
| 文件名（测试）     | kebab-case.test.ts（框架）/ PascalCase.test.ts（游戏） | `event-manager.test.ts` / `BattleSystem.test.ts`    |

### 文件组织约定

| 文件类型 | 命名规则              | 内容                                        |
| -------- | --------------------- | ------------------------------------------- |
| 实现     | `{模块名}Manager.ts`  | 模块主实现类                                |
| 定义     | `{模块名}Defs.ts`     | 类型、接口、枚举、EventKey                  |
| 接口     | `I{模块名}Manager.ts` | 放在 `framework/interfaces/`                |
| 基类     | `{模块名}Base.ts`     | `ModuleBase`, `UIFormBase`, `ProcedureBase` |

### 类型安全

- **禁止** `any` 类型（ESLint `no-explicit-any: error`）
- 幻影类型（phantom type）用于 `EventKey<T>` 和 `ServiceKey<T>` 的编译期类型安全：
    ```typescript
    export class EventKey<T = void> {
        declare private readonly _phantom: T; // 仅类型层面，不生成运行时代码
        constructor(public readonly description: string) {}
    }
    ```
- `emit` 签名利用条件类型约束参数：`EventKey<void>` 无需传参，`EventKey<number>` 必须传 `number`

### Logger 使用（铁律）

**禁止** 任何模块使用 `console.log/warn/error/info/debug`，必须使用 `Logger`：

```typescript
// 标准模式：静态 TAG 常量 + Logger 静态方法
private static readonly TAG = 'ResourceManager';
Logger.info(ResourceManager.TAG, '资源管理器初始化');
Logger.error(ResourceManager.TAG, '资源路径不能为空');
Logger.debug(ResourceManager.TAG, `缓存命中: ${path}`);
```

Logger API：`Logger.debug/info/warn/error(tag, msg, ...args)` | `Logger.time/timeEnd(label)` | `Logger.addOutput(output)`

### 错误处理

- 错误消息格式：`[模块名] 描述性消息`（中文）
- 关键方法先 `Logger.error` 再 `throw new Error`：
    ```typescript
    Logger.error(ResourceManager.TAG, 'loader 不能为空');
    throw new Error('[ResourceManager] loader 不能为空');
    ```
- 策略注入为 null 时必须抛出异常，不允许静默失败

### 导入规则

- **框架层源码内部**：统一使用**相对路径** `../` 或 `./`
- **测试文件**：统一使用**路径别名** `@framework/*`
- **Game 层**：可使用 `@framework/*` 别名

### Git 约定

- Conventional Commits：`feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert`
- subject ≤ 72 字符
- husky pre-commit 自动执行 `eslint --fix` + `prettier --write`
- 模块开发节奏：`feat(骨架)` → `feat(实现)` → `fix(Review)` → `docs(收尾)`

## 核心设计模式

### 策略注入模式（所有需要引擎桥接的模块）

```typescript
// 框架层定义接口
export interface IResourceLoader {
    loadAsset(path: string, callbacks: LoadAssetCallbacks): void;
    releaseAsset(path: string): void;
}

// 模块通过 setter 注入策略
public setResourceLoader(loader: IResourceLoader): void {
    if (!loader) { Logger.error(TAG, 'loader 不能为空'); throw new Error('[ResourceManager] loader 不能为空'); }
    this._loader = loader;
}
```

### 遍历安全模式（EventManager / TimerManager）

遍历回调列表时防止并发修改：`_emitDepth` / `_updating` 标志 + 标记删除 + 遍历后清理。

### 脏标记优化（GameModule）

`register()` 后标记 `_isDirty = true`，`update()` 前才重新按 priority 排序。

### 引用计数（ResourceManager）

`AssetInfo.refCount` + `owners: Set<string>` 跟踪资源引用，同 owner 多次 load 只计 1 次，refCount 归零才释放。

### UI 分层栈（UIManager）

`UILayer` 枚举（Background=0, Normal=100, Fixed=200, Popup=300, Toast=400），每层维护独立栈，栈顶切换触发 `onCover/onReveal`。

### Demo 架构（DemoBase + HtmlRenderer）

- `DemoBase` 抽象基类：`bootstrap()` 注册 15 个模块 → 子类 `setupProcedures()` + `setupDataTables()`
- `HtmlRenderer`：纯 DOM 渲染，`log()` 追加日志 / `updateLog(key)` 原地更新 / `updateStatus()` 状态面板
- 主循环：`setInterval` 模拟引擎 tick → `GameModule.update(dt)`

## 文档协议

新建模块时**必须同步**：

1. 创建模块目录下的 `README.md`（模板：[docs/module-readme-template.md](docs/module-readme-template.md)）
2. 更新 [docs/module-registry.md](docs/module-registry.md) 的状态和 API
3. 代码必须通过 [docs/consistency-guide.md](docs/consistency-guide.md) 三维度检查

模块 README 标准结构：职责 → 对外 API → 设计决策（表格：决策|选择|原因）→ 依赖 → 被谁依赖 → 已知限制 → 关联测试

## Session 连续性

本项目跨 session 开发。当用户说"继续培训"或开始新任务时，**必须先读取**：

- `training/progress.md` — 当前进度和会话断点
- `docs/module-registry.md` — 模块依赖关系
- 当前模块的 `README.md`（如存在）

设计决策不确定时：先读上述文件 → 遵循已有模块的模式 → 发现不一致则提醒用户

## 模块指令索引

| 指令文件                                             | 覆盖范围                      | 说明                         |
| ---------------------------------------------------- | ----------------------------- | ---------------------------- |
| `instructions/framework-layer.instructions.md`       | `assets/scripts/framework/**` | 框架层编码规范与模块开发约定 |
| `instructions/game-layer.instructions.md`            | `assets/scripts/game/**`      | Game 层 Demo 开发规范        |
| `instructions/demo-driven-development.instructions.md` | `assets/scripts/game/**`      | Demo 驱动开发：架构遵循与框架缺口反馈 |
| `instructions/testing.instructions.md`               | `tests/**`                    | 测试策略与约定               |
| `instructions/plugins.instructions.md`               | `packages/**`                 | 插件包开发规范               |
| `instructions/training.instructions.md`              | `training/**`                 | 培训流程规则                 |
| `instructions/coach-module-teaching.instructions.md` | `training/**`                 | 模块教学流程                 |
| `instructions/obsidian-module-notes.instructions.md` | `training/**`                 | Obsidian 笔记约定            |

## 代码一致性（已统一）

以下项目曾存在不一致，已在 2026-04-23 统一修复：

- 接口文件统一放置在 `framework/interfaces/`
- Logger TAG 统一使用 `private static readonly TAG` 常量
- DI Container 错误消息统一为中文
- 框架层 EventKey 描述统一为 `Module.EventName` PascalCase 点号格式
- Game 层 EventKey 使用 `ns:event_name` 冒号格式（与框架层分开约定）

## 关键文档

| 文档                                                           | 用途                                |
| -------------------------------------------------------------- | ----------------------------------- |
| [docs/architecture.md](docs/architecture.md)                   | 分层架构、模块清单、插件化设计      |
| [docs/module-registry.md](docs/module-registry.md)             | 模块依赖图、priority 分配、API 摘要 |
| [docs/consistency-guide.md](docs/consistency-guide.md)         | 跨 session 一致性三维度检查         |
| [docs/code-review-checklist.md](docs/code-review-checklist.md) | PR 自查清单                         |
| [docs/demo-design.md](docs/demo-design.md)                     | Demo 设计规则与 UI 规范             |
| [docs/i18n-config-guide.md](docs/i18n-config-guide.md)         | i18n 配置表规范                     |
| [training/progress.md](training/progress.md)                   | 培训进度、能力追踪、会话断点        |
