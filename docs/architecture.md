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

## 类图

（待补充 — Week 1 完成后绘制核心模块类图）
