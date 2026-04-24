# 🔥 Framework Blaze Ignite

引擎无关的模块化 TypeScript 游戏框架，灵感源自 Unity [GameFramework](https://github.com/EllanJiang/GameFramework)，通过 IoC/DI 实现引擎解耦。

> ⚠️ **FBI WARNING**
>
> **F**ramework **B**laze **I**gnite — _Framework Being Installed_
>
> 本框架已成功渗透你的项目。抵抗是徒劳的。💀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/biground/GameFramework-Cocos/actions/workflows/ci.yml/badge.svg)](https://github.com/biground/GameFramework-Cocos/actions/workflows/ci.yml)

## 简介

Framework Blaze Ignite（FBI）是一套模块化、类型安全、可测试的游戏开发框架。纯 TypeScript 编写，框架层零引擎依赖——通过 Runtime 适配层桥接任意游戏引擎。

核心理念：**引擎无关** · **模块化** · **类型安全** · **可测试**

## 架构特点

- **三层分离** — Framework（纯 TS 框架层）→ Runtime（引擎适配层）→ Game（业务层），框架层禁止导入引擎 API
- **IoC/DI 解耦** — 装饰器驱动的依赖注入容器，模块间通过接口契约交互
- **事件驱动** — 强类型事件系统，模块间零耦合通信
- **对象池** — 内置通用泛型对象池，降低 GC 压力
- **可测试** — 框架层可独立跑 Jest 单元测试，无需启动引擎

## 模块一览

### 基础设施

- **[Core](assets/scripts/framework/core/README.md)** — 框架核心入口（GameEntry）与模块生命周期管理，负责模块注册、优先级排序和统一驱动
- **[Event](assets/scripts/framework/event/README.md)** — 强类型事件系统，支持 once、快照遍历、幻影类型安全的 EventKey
- **[ObjectPool](assets/scripts/framework/objectpool/README.md)** — 通用泛型对象池，自动管理对象的获取与回收，防重复入池
- **[DI/IoC](assets/scripts/framework/di/README.md)** — 装饰器驱动的依赖注入容器，支持 ServiceKey 类型安全绑定与自动解析
- **[Interfaces](assets/scripts/framework/interfaces/README.md)** — 框架模块公共接口定义，业务层依赖接口实现依赖倒置

### 核心服务

- **[FSM](assets/scripts/framework/fsm/README.md)** — 有限状态机，支持多实例管理、状态数据传递和自动销毁
- **[Procedure](assets/scripts/framework/procedure/README.md)** — 流程管理器，基于 FSM 实现游戏全局流程切换（如启动→加载→主菜单→游戏）
- **[Resource](assets/scripts/framework/resource/README.md)** — 资源加载与释放，引用计数管理、异步加载队列、资源组批量操作
- **[UI](assets/scripts/framework/ui/README.md)** — UI 管理器，支持栈式管理、分组分层、打开/关闭动画和生命周期回调
- **[Scene](assets/scripts/framework/scene/README.md)** — 场景管理，异步加载/卸载、场景切换事件通知
- **[Network](assets/scripts/framework/network/README.md)** — 网络通信管理，支持 WebSocket/HTTP 多通道、消息编解码和心跳机制
- **[Audio](assets/scripts/framework/audio/README.md)** — 音频管理，支持分组控制、音量分层、淡入淡出和实例池
- **[Timer](assets/scripts/framework/timer/README.md)** — 高精度定时器，支持延迟、重复、暂停/恢复，O(log n) 调度
- **[DataTable](assets/scripts/framework/datatable/README.md)** — 数据表管理，支持自定义解析器、类型安全行访问和多表生命周期管理
- **[Entity](assets/scripts/framework/entity/README.md)** — 实体管理，支持分组注册、对象池复用、工厂策略注入和生命周期驱动
- **[Data](assets/scripts/framework/data/README.md)** — 数据管理（规划中），负责游戏运行时数据存取与持久化

### 工具与调试

- **[i18n](assets/scripts/framework/i18n/README.md)** — 多语言本地化，支持 YAML 翻译源、运行时语言切换和带参数格式化
- **[Logger](assets/scripts/framework/debug/README.md)** — 分级日志系统（Debug/Info/Warn/Error），支持 Tag 过滤、可插拔输出策略、环形历史缓冲和性能计时
- **[Debug](assets/scripts/framework/debug/README.md)** — 运行时调试面板，可注册自定义数据源实时查看模块状态
- **[HotUpdate](assets/scripts/framework/hotupdate/README.md)** — 热更新管理，支持版本检查、增量下载和更新流程状态机

### 扩展插件

- **[fbi-ecs](packages/fbi-ecs/README.md)** — 高性能 ECS 插件，基于 SparseSet 架构，支持 Generational ID、查询缓存和响应式分组
- **[fbi-timer-heap](packages/fbi-timer-heap/README.md)** — 最小堆定时器实现，适用于定时任务数量中等的场景
- **[fbi-timer-wheel](packages/fbi-timer-wheel/README.md)** — 时间轮定时器实现，适用于海量定时任务的高吞吐场景

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/biground/GameFramework-Cocos.git
cd GameFramework-Cocos

# 安装依赖
npm install

# 运行测试
npm test

# 覆盖率报告
npm run test:coverage

# 代码检查
npm run lint

# 格式化代码
npm run format
```

## 目录结构

```
assets/scripts/
├── framework/        # 框架层（纯 TS，禁止依赖引擎 API）
│   ├── core/         # 核心入口与模块管理
│   ├── event/        # 事件系统
│   ├── objectpool/   # 对象池
│   ├── di/           # 依赖注入容器
│   ├── fsm/          # 有限状态机
│   ├── procedure/    # 流程管理
│   ├── resource/     # 资源管理
│   ├── ui/           # UI 管理
│   ├── scene/        # 场景管理
│   ├── network/      # 网络通信
│   ├── audio/        # 音频管理
│   ├── timer/        # 定时器
│   ├── datatable/    # 数据表
│   ├── entity/       # 实体管理
│   ├── data/         # 数据管理
│   ├── i18n/         # 多语言
│   ├── debug/        # 日志与调试
│   ├── hotupdate/    # 热更新
│   └── interfaces/   # 模块接口定义
├── runtime/          # 适配层（桥接引擎 API）
└── utils/            # 工具函数
packages/
├── fbi-ecs/          # ECS 插件
├── fbi-timer-heap/   # 最小堆定时器
└── fbi-timer-wheel/  # 时间轮定时器
tests/                # 测试目录（镜像 framework/ 结构）
├── __mocks__/        # Cocos Creator cc 模块全局 Mock
└── {module}/         # 各模块单元测试
```

> **注意**：Demo 业务代码（Game 层）已分离到独立的 git worktree 分支中，详见 [Demo 项目](#demo-项目)。

## Demo 项目

Demo 业务代码（Game 层）已从 main 分支分离到独立的 git worktree 分支中，main 分支保持纯框架仓库。

| Demo | 分支 | Worktree 路径 | 说明 |
| --- | --- | --- | --- |
| Demo 1 — Idle Clicker | `feature/demo1-idle` | `.worktrees/demo1` | 放置类挂机游戏 |
| Demo 2 — Turn-based RPG | `feature/demo2-rpg` | `.worktrees/demo2` | 回合制 RPG |
| Demo 3 — Auto Chess | `feature/demo3-autochess` | `.worktrees/demo3` | 自走棋 |

### 切换到 Demo Worktree

```bash
# 查看所有 worktree
git worktree list

# 进入某个 demo worktree
cd .worktrees/demo1

# 在 worktree 中运行 demo
npm run demo1:serve     # Idle Clicker Demo（端口 3001）
npm run demo2:serve     # Turn-based RPG Demo（端口 3002）
npm run demo3:serve     # Auto Chess Demo（端口 3003）

# 运行 E2E 测试（在 demo2 worktree 中）
cd .worktrees/demo2
npm run test:e2e
```

每个 worktree 分支包含 `assets/scripts/game/`（shared + demo 代码）和对应的测试文件。

## 文档

- [架构设计](docs/architecture.md)
- [模块注册表](docs/module-registry.md)
- [一致性检查指南](docs/consistency-guide.md)
- [Code Review 检查清单](docs/code-review-checklist.md)

## License

MIT
