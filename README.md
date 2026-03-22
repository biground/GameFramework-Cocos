# 🎮 GameFramework-Cocos

基于 Unity [GameFramework](https://github.com/EllanJiang/GameFramework) 设计思想的 CocosCreator 3.x 游戏框架

[![CI](https://github.com/biground/GameFramework-Cocos/actions/workflows/ci.yml/badge.svg)](https://github.com/biground/GameFramework-Cocos/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 简介

GameFramework-Cocos 是一套模块化、可测试、引擎无关的 CocosCreator 3.x 游戏开发框架。

### 架构特点
- **三层分离**：Framework（纯TS框架层）→ Runtime（引擎适配层）→ Game（业务层）
- **模块化管理**：所有模块通过 GameEntry 统一注册和驱动
- **事件驱动**：模块间零耦合，通过 EventManager 通信
- **对象池**：内置通用对象池，降低 GC 压力
- **可测试**：框架层不依赖引擎 API，可独立跑 Jest 单元测试

### 模块清单
| 模块 | 说明 | 状态 |
|------|------|------|
| Core | 框架核心入口与模块管理 | 🟡 |
| Event | 强类型事件系统 | ⬜ |
| ObjectPool | 通用泛型对象池 | ⬜ |
| DI/IoC | 装饰器依赖注入容器 | ⬜ |
| FSM | 有限状态机 | ⬜ |
| Procedure | 流程管理（基于FSM） | ⬜ |
| Resource | 资源加载/释放/引用计数 | ⬜ |
| UI | UI管理器（栈/队列/分层） | ⬜ |
| Entity | 实体管理（对象池集成） | ⬜ |
| Network | 网络通信（WebSocket/HTTP） | ⬜ |
| Audio | 音频管理 | ⬜ |
| Scene | 场景管理 | ⬜ |
| Timer | 定时器 | ⬜ |
| Data | 数据表管理 | ⬜ |
| i18n | 多语言本地化 | ⬜ |
| Debug | 日志与调试面板 | ⬜ |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 代码检查
npm run lint

# 格式化代码
npm run format
```

## 🏗️ 目录结构

```
assets/scripts/
├── framework/     # 框架层（纯 TS，不依赖 cc）
│   ├── core/      # 核心模块管理
│   ├── event/     # 事件系统
│   ├── fsm/       # 有限状态机
│   ├── procedure/ # 流程管理
│   ├── resource/  # 资源管理
│   ├── ui/        # UI管理
│   ├── entity/    # 实体管理
│   ├── network/   # 网络通信
│   └── ...
├── runtime/       # 适配层（桥接 framework 和 CocosCreator）
└── game/          # 业务层（Demo）
```

## 📚 文档
- [架构设计](docs/architecture.md)
- [Code Review 检查清单](docs/code-review-checklist.md)
- [培训进度](training/progress.md)

## 📄 License
MIT

