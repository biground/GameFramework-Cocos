# Data（数据管理）

## 职责

规划中的游戏数据管理模块，负责游戏运行时数据的存取和持久化。
**当前状态：待开发**，目录下仅有 `.gitkeep` 占位文件。

## 规划功能

- 游戏存档数据的读写
- 运行时数据的集中管理
- 数据变更通知（与 EventManager 配合）
- 数据持久化策略抽象（LocalStorage / 文件系统 / 云端）

## 依赖（规划）

- **Core**（`ModuleBase`）— 继承 ModuleBase 注册为框架模块
- **Event**（`EventManager`）— 数据变更广播
- **Logger** — 日志输出

## 关联模块

- **DataTable** — 静态配置表数据（已实现），与 Data 模块互补
- Data 模块侧重运行时动态数据，DataTable 侧重只读配置数据

## 状态

⬜ 待开发
