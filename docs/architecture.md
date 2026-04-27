# 🏗️ Framework Blaze Ignite 架构设计文档

> 本文档随框架开发持续更新

## 设计理念

参照 Unity GameFramework (EllanJiang) 的设计思想，结合 TypeScript 的特性，
构建一套模块化、可测试、引擎无关的游戏框架。

## 架构分层

```
┌──────────────────────────────────────┐
│           Game Layer（业务层）          │
│  各 demo worktree 分支的              │
│  assets/scripts/game/               │
│    具体的游戏逻辑、UI、战斗等           │
├──────────────────────────────────────┤
│         Runtime Layer（适配层）         │
│      assets/scripts/runtime/         │
│    桥接框架层与 CocosCreator 引擎      │
│   ├─ runtime/i18n/   （组件桥接）     │
│   └─ runtime/cc-385/ （CC 3.8.5 三策略） │
├──────────────────────────────────────┤
│        Framework Layer（框架层）        │
│      assets/scripts/framework/       │
│    纯 TypeScript，不依赖任何引擎 API    │
└──────────────────────────────────────┘
```

> **注意**：Game 层已从 main 分支分离到独立的 git worktree 分支中（`.worktrees/demo1`、`.worktrees/demo2`、`.worktrees/demo3`），main 分支为纯框架仓库。
```

## 核心原则

1. **框架层引擎无关**：framework/ 下禁止 import cc 命名空间
2. **模块化注册**：所有模块通过 GameModule 统一注册和管理
3. **事件驱动解耦**：模块间通信通过 EventManager
4. **对象池优先**：频繁创建销毁的对象走 ObjectPool
5. **可测试性**：框架层可独立跑单元测试

## 运行时适配（Runtime Layer）

`assets/scripts/runtime/` 是框架层与具体游戏引擎之间的**唯一桥梁**，也是工程内**唯一允许 `import 'cc'` 的层**。框架层通过策略接口（`IResourceLoader` / `ISceneLoader` / `IUIFormFactory` 等）声明对引擎能力的需求，runtime 层提供具体实现并在启动时注入。

### 当前适配子目录

| 子目录            | 职责                                                       |
| ----------------- | ---------------------------------------------------------- |
| `runtime/i18n/`   | `LocalizedLabel` / `LocalizedSprite` 等 cc 组件桥接        |
| `runtime/cc-385/` | Cocos Creator 3.8.5 的资源 / 场景 / UI 三策略 + 一键装配入口 |

### `runtime/cc-385/` 模块清单

| 文件                       | 角色                | 注入目标                            |
| -------------------------- | ------------------- | ----------------------------------- |
| `CocosResourceLoader.ts`   | `IResourceLoader`   | `ResourceManager.setResourceLoader` |
| `CocosSceneLoader.ts`      | `ISceneLoader`      | `SceneManager.setSceneLoader`       |
| `CocosUIFormFactory.ts`    | `IUIFormFactory`    | `UIManager.setUIFormFactory`        |
| `CocosUIFormBase.ts`       | UI 组件基类（桥接） | 由 Game 层 UIForm 继承              |
| `installCocosRuntime.ts`   | 一键装配入口        | 在三大模块注册完毕后调用一次        |
| `index.ts`                 | 统一导出            | —                                   |

### 装配流程

```
GameEntry.registerModule(ResourceManager / SceneManager / UIManager)
        │
        ▼
GameEntry.init()              ← 框架层走完 onInit
        │
        ▼
installCocosRuntime()         ← runtime/cc-385 注入三策略
        │  ├─ ResourceManager.setResourceLoader(new CocosResourceLoader())
        │  ├─ SceneManager.setSceneLoader(new CocosSceneLoader())
        │  └─ UIManager.setUIFormFactory(new CocosUIFormFactory(resourceManager))
        ▼
GameModule.update(dt)         ← 进入主循环
```

### 策略注入连线

```
┌──────────────────────────┐         ┌─────────────────────────────┐
│  framework/resource      │ ◀─────  │ runtime/cc-385/             │
│   IResourceLoader        │  注入   │  CocosResourceLoader  (cc)  │
├──────────────────────────┤         ├─────────────────────────────┤
│  framework/scene         │ ◀─────  │  CocosSceneLoader     (cc)  │
│   ISceneLoader           │         │                             │
├──────────────────────────┤         ├─────────────────────────────┤
│  framework/ui            │ ◀─────  │  CocosUIFormFactory   (cc)  │
│   IUIFormFactory         │         │                             │
└──────────────────────────┘         └─────────────────────────────┘
        ▲ 纯 TS，禁止 import 'cc'              ▲ 唯一允许 import 'cc'
```

> **设计要点**：所有引擎能力以策略形式注入。Game 层只面向 `framework/*` 接口编程，对 `cc` 模块零感知；将来若适配 CC 3.9 / 其他引擎，只需新增 `runtime/cc-39x/` 等同级目录并提供同名策略即可，框架层与游戏代码无需改动。

## 模块列表

| 模块                                        | 职责                     | 状态      |
| ------------------------------------------- | ------------------------ | --------- |
| Core（GameEntry / ModuleBase / GameModule） | 框架核心入口与模块管理   | 🟡 开发中 |
| Event（事件管理器）                         | 强类型事件系统           | ⬜ 待开发 |
| ObjectPool（对象池）                        | 通用泛型对象池           | ⬜ 待开发 |
| DI/IoC（依赖注入容器）                      | 装饰器依赖注入           | ⬜ 待开发 |
| FSM（有限状态机）                           | 泛型状态机               | ⬜ 待开发 |
| Procedure（流程管理器）                     | 基于FSM的流程驱动        | ⬜ 待开发 |
| Resource（资源管理器）                      | 资源加载/释放/引用计数   | ⬜ 待开发 |
| UI（UI管理器）                              | 页面栈/弹窗队列/分层管理 | ⬜ 待开发 |
| Entity（实体管理器）                        | 游戏实体管理+对象池      | ⬜ 待开发 |
| Network（网络管理器）                       | WebSocket/HTTP通信       | ⬜ 待开发 |
| Audio（音频管理器）                         | 音效音乐管理             | ⬜ 待开发 |
| Scene（场景管理器）                         | 场景切换与缓存           | ⬜ 待开发 |
| Timer（定时器）                             | 定时器管理               | ⬜ 待开发 |
| Data（数据表）                              | 配置数据管理             | ⬜ 待开发 |
| i18n（多语言）                              | 本地化支持               | ✅ 已完成 |
| Debug（调试工具）                           | 日志与调试面板           | ⬜ 待开发 |

## 插件化架构（Plugin Architecture）

框架采用 **核心 + 插件** 的热拔插设计，支持通过 npm 包替换/增强默认模块。

### 设计原则

1. **接口隔离**：每个模块定义接口（`IEventManager`, `IObjectPoolManager` 等），业务层依赖接口而非实现
2. **模块可替换**：`GameModule.register()` 支持 `allowReplace` 模式，插件可替换同名默认模块
3. **插件约定**：所有插件实现 `IPlugin` 接口，通过 `GameEntry.installPlugin()` 安装

### 包结构规划

```
@fbi/core              ← 基础框架（接口层 + 默认实现）
fbi-fast-pool          ← 高级对象池（Int32Array 侵入式空闲链表）
fbi-ecs                ← ECS 实体组件系统
fbi-behavior-tree      ← 行为树
```

### 分层对应

```
framework/
├── interfaces/         ← 纯接口层（模块契约 + IPlugin）
├── core/               ← 核心（ModuleBase, GameModule, GameEntry）
├── objectpool/         ← 默认对象池实现（implements IObjectPoolManager）
└── event/              ← 默认事件实现（implements IEventManager）

npm 插件包：
fbi-fast-pool/
├── src/FastPool.ts     ← implements IObjectPoolManager
└── src/index.ts        ← 导出 IPlugin 实现
```

### 实施路线

| 阶段               | 内容                                               |
| ------------------ | -------------------------------------------------- |
| Phase 1 (Week 2)   | 提取接口层 → DI/IoC 容器 → GameModule 支持 replace |
| Phase 2 (Week 3-4) | 每个新模块先定接口再写实现                         |
| Phase 3 (Week 5-6) | IPlugin 接口 → monorepo 拆包 → npm publish + CI/CD |

## 类图

（待补充 — Week 1 完成后绘制核心模块类图）
