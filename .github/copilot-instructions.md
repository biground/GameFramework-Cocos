# Forge Blaze Ignite

引擎无关的模块化 TypeScript 游戏框架，灵感源自 Unity GameFramework，通过 IoC/DI 实现引擎解耦。
兼作 8 周主程培训项目（详见 `training/progress.md`）。

## Build & Test

```bash
npm test              # Jest 单元测试
npm run test:coverage # 覆盖率报告
npm run lint          # ESLint 检查
npm run format        # Prettier 格式化
```

路径别名：`@framework/*`、`@runtime/*`、`@game/*`、`@utils/*`（见 jest.config.js / tsconfig.json）

## Architecture

三层分离，详见 [docs/architecture.md](docs/architecture.md)：

| 层        | 路径                        | 职责         | 约束                          |
| --------- | --------------------------- | ------------ | ----------------------------- |
| Framework | `assets/scripts/framework/` | 纯 TS 框架层 | **禁止** `import` cc 命名空间 |
| Runtime   | `assets/scripts/runtime/`   | 桥接引擎 API | 唯一允许依赖 cc 的层          |
| Game      | `assets/scripts/game/`      | Demo 业务层  | 依赖接口，不依赖实现          |

### 硬性规则

- 所有模块继承 `ModuleBase`，通过 `GameModule.register()` 注册
- 跨模块通信 **必须** 走 `EventManager`，禁止直接引用
- 频繁创建销毁的对象 **必须** 走 `ObjectPool`
- 每个模块先在 `framework/interfaces/` 定义接口，业务层依赖接口
- `GameModule.register()` 支持 `allowReplace`，第三方插件可替换默认实现
- 插件命名：`fbi-{plugin-name}`，peerDependency 指向 `@fbi/core`
- Priority 分配：0-99 基础设施 / 100-199 核心服务 / 200-299 业务模块（详见 [docs/module-registry.md](docs/module-registry.md)）

### 生命周期

- init: priority 升序 | update: priority 升序 | shutdown: priority **降序**
- 模块签名：`onInit()` → `onUpdate(deltaTime: number)` → `onShutdown()`

## Code Style

- TypeScript strict mode（tsconfig `strict: true`）
- PascalCase: 类/接口/枚举 | camelCase: 方法/属性/变量
- 所有 public API 必须有 **中文 JSDoc**
- **禁止** `any` 类型 | 用 `Logger` 代替 `console.log`
- 优先组合而非继承 | 泛型用于类型安全收益明确的场景
- Commit 遵循 Conventional Commits（commitlint 已配置）

## Conventions

- 幻影类型（phantom type）用于 `EventKey<T>` 和 `ServiceKey<T>` 的类型安全
- `GameModule` 使用脏标记优化：register 后标记 dirty，update 前才排序
- emit 采用快照遍历，once 回调在遍历完成后才移除
- ObjectPool.release 防重复入池（includes 检查）
- 错误消息格式：`[模块名] 描述性消息`

## Documentation Protocol

新建模块时**必须同步**：

1. 创建模块目录下的 `README.md`（模板：[docs/module-readme-template.md](docs/module-readme-template.md)）
2. 更新 [docs/module-registry.md](docs/module-registry.md) 的状态和 API
3. 代码必须通过 [docs/consistency-guide.md](docs/consistency-guide.md) 三维度检查

## Session Continuity

本项目跨 session 开发。当用户说"继续培训"或开始新任务时，**必须先读取**：

- `training/progress.md` — 当前进度和会话断点
- `docs/module-registry.md` — 模块依赖关系
- 当前模块的 `README.md`（如存在）

设计决策不确定时：先读上述文件 → 遵循已有模块的模式 → 发现不一致则提醒用户

## Key Docs

| 文档                                                           | 用途                                |
| -------------------------------------------------------------- | ----------------------------------- |
| [docs/architecture.md](docs/architecture.md)                   | 分层架构、模块清单、插件化设计      |
| [docs/module-registry.md](docs/module-registry.md)             | 模块依赖图、priority 分配、API 摘要 |
| [docs/consistency-guide.md](docs/consistency-guide.md)         | 跨 session 一致性三维度检查         |
| [docs/code-review-checklist.md](docs/code-review-checklist.md) | PR 自查清单                         |
| [training/progress.md](training/progress.md)                   | 培训进度、能力追踪、会话断点        |
