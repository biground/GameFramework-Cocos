# 🏗️ GameFramework-Cocos 架构设计文档

> 本文档随框架开发持续更新

## 设计理念

参照 Unity GameFramework (EllanJiang) 的设计思想，结合 CocosCreator 3.x 和 TypeScript 的特性，
构建一套模块化、可测试、引擎无关的游戏框架。

## 架构分层

```
┌──────────────────────────────────────┐
│           Game Layer（业务层）          │
│      assets/scripts/game/            │
│    具体的游戏逻辑、UI、战斗等           │
├──────────────────────────────────────┤
│         Runtime Layer（适配层）         │
│      assets/scripts/runtime/         │
│    桥接框架层与 CocosCreator 引擎      │
├──────────────────────────────────────┤
│        Framework Layer（框架层）        │
│      assets/scripts/framework/       │
│    纯 TypeScript，不依赖任何引擎 API    │
└──────────────────────────────────────┘
```

## 核心原则

1. **框架层引擎无关**：framework/ 下禁止 import cc 命名空间
2. **模块化注册**：所有模块通过 GameModule 统一注册和管理
3. **事件驱动解耦**：模块间通信通过 EventManager
4. **对象池优先**：频繁创建销毁的对象走 ObjectPool
5. **可测试性**：框架层可独立跑单元测试

## 模块列表

| 模块 | 职责 | 状态 |
|------|------|------|
| Core（GameEntry / ModuleBase / GameModule） | 框架核心入口与模块管理 | 🟡 开发中 |
| Event（事件管理器） | 强类型事件系统 | ⬜ 待开发 |
| ObjectPool（对象池） | 通用泛型对象池 | ⬜ 待开发 |
| DI/IoC（依赖注入容器） | 装饰器依赖注入 | ⬜ 待开发 |
| FSM（有限状态机） | 泛型状态机 | ⬜ 待开发 |
| Procedure（流程管理器） | 基于FSM的流程驱动 | ⬜ 待开发 |
| Resource（资源管理器） | 资源加载/释放/引用计数 | ⬜ 待开发 |
| UI（UI管理器） | 页面栈/弹窗队列/分层管理 | ⬜ 待开发 |
| Entity（实体管理器） | 游戏实体管理+对象池 | ⬜ 待开发 |
| Network（网络管理器） | WebSocket/HTTP通信 | ⬜ 待开发 |
| Audio（音频管理器） | 音效音乐管理 | ⬜ 待开发 |
| Scene（场景管理器） | 场景切换与缓存 | ⬜ 待开发 |
| Timer（定时器） | 定时器管理 | ⬜ 待开发 |
| Data（数据表） | 配置数据管理 | ⬜ 待开发 |
| i18n（多语言） | 本地化支持 | ⬜ 待开发 |
| Debug（调试工具） | 日志与调试面板 | ⬜ 待开发 |

## 插件化架构（Plugin Architecture）

框架采用 **核心 + 插件** 的热拔插设计，支持通过 npm 包替换/增强默认模块。

### 设计原则

1. **接口隔离**：每个模块定义接口（`IEventManager`, `IObjectPoolManager` 等），业务层依赖接口而非实现
2. **模块可替换**：`GameModule.register()` 支持 `allowReplace` 模式，插件可替换同名默认模块
3. **插件约定**：所有插件实现 `IPlugin` 接口，通过 `GameEntry.installPlugin()` 安装

### 包结构规划

```
@gfc/core              ← 基础框架（接口层 + 默认实现）
gfc-fast-pool          ← 高级对象池（Int32Array 侵入式空闲链表）
gfc-ecs                ← ECS 实体组件系统
gfc-behavior-tree      ← 行为树
```

### 分层对应

```
framework/
├── interfaces/         ← 纯接口层（模块契约 + IPlugin）
├── core/               ← 核心（ModuleBase, GameModule, GameEntry）
├── objectpool/         ← 默认对象池实现（implements IObjectPoolManager）
└── event/              ← 默认事件实现（implements IEventManager）

npm 插件包：
gfc-fast-pool/
├── src/FastPool.ts     ← implements IObjectPoolManager
└── src/index.ts        ← 导出 IPlugin 实现
```

### 实施路线

| 阶段 | 内容 |
|------|------|
| Phase 1 (Week 2) | 提取接口层 → DI/IoC 容器 → GameModule 支持 replace |
| Phase 2 (Week 3-4) | 每个新模块先定接口再写实现 |
| Phase 3 (Week 5-6) | IPlugin 接口 → monorepo 拆包 → npm publish + CI/CD |

## 类图

（待补充 — Week 1 完成后绘制核心模块类图）
