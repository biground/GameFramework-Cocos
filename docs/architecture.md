# 🏗️ GameFramework-Cocos 架构设计文档

> 本文档随框架开发持续更新

## 设计理念

参照 Unity GameFramework (EllanJiang) 的设计思想，结合 CocosCreator 3.x 和 TypeScript 的特性，
构建一套模块化、可测试、引擎无关的游戏框架。

## 架构分层

```
┌──────────────────────────────────────┐
│           Game Layer (业务层)          │
│      assets/scripts/game/            │
│   具体的游戏逻辑、UI、战斗等           │
├──────────────────────────────────────┤
│         Runtime Layer (适配层)         │
│      assets/scripts/runtime/         │
│   桥接框架层与 CocosCreator 引擎      │
├──────────────────────────────────────┤
│        Framework Layer (框架层)        │
│      assets/scripts/framework/       │
│   纯 TypeScript，不依赖任何引擎 API    │
└──────────────────────────────────────┘
```

## 核心原则
1. **框架层引擎无关**：framework/ 下禁止 import cc 命名空间
2. **模块化注册**：所有模块通过 GameModule 统一注册和管理
3. **事件驱动解耦**：模块间通信通过 EventManager
4. **对象池优先**：频繁创建销毁的对象走 ObjectPool
5. **可测试性**：框架层可独立跑单元测试

## 模块列表

（随开发进度更新）

| 模块 | 职责 | 状态 |
|------|------|------|
| Core (GameEntry/ModuleBase/GameModule) | 框架核心入口与模块管理 | 🟡 开发中 |
| Event | 事件系统 | ⬜ 待开发 |
| ObjectPool | 通用对象池 | ⬜ 待开发 |
| ... | ... | ... |

## 类图

（待补充）
