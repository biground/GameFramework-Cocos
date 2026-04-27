# Week 5 Day 2 任务卡（2026-04-21）

## 🎯 主题：Phase 4 启动 — 综合 Demo 设计

> Phase 3 全部模块已完成 ✅，正式进入 Phase 4（综合 Demo + 面试冲刺）

## 📋 任务列表

### 任务 1：综合 Demo 需求设计

- **目标**：设计一个能串联全部 17 个框架模块的综合 Demo
- **涉及模块**：Core / Event / ObjectPool / DI / FSM / Procedure / Resource / UI / Network / Audio / Scene / Timer / DataTable / i18n / Logger / DebugPanel / HotUpdate
  - 游戏流程图（Procedure 驱动）
  - 每个模块在 Demo 中的职责和交互点
  - UI 界面清单和层级规划
  - 数据表结构设计
- **考核点**：
  - 能否合理规划模块间的协作关系
  - 是否利用 EventManager 解耦跨模块通信
  - Procedure 流程是否覆盖完整游戏生命周期

### 任务 2：Demo 脚手架搭建

- **目标**：用 ProcedureManager 驱动游戏主流程
- **交付物**：
  - `game/procedures/` 目录：LaunchProcedure → PreloadProcedure → MenuProcedure → GameProcedure → SettleProcedure
  - `game/GameApp.ts`：框架初始化入口，注册所有模块
  - 基础测试覆盖
- **考核点**：
  - Procedure 之间的数据传递（Blackboard）
  - 模块注册顺序（priority 规划）
  - 分层架构是否清晰（Framework / Runtime / Game）

### 任务 3：面试模拟

- **形式**：深度考核已完成模块
- **重点方向**：
  - 架构设计决策（为什么选择策略注入而非继承？）
  - 性能优化思路（EventManager emit 优化原理）
  - 模块间解耦方式（Event vs DI vs 直接引用的取舍）
  - 热更新方案的工程考量（两阶段检查的收益）
- **评分标准**：深度 40% + 广度 30% + 表达 30%

## 📊 预估

- **难度**：⭐⭐⭐⭐ 高
- **核心目标**：理解如何用框架构建完整游戏流程
- **学习重点**：从"造轮子"到"用轮子"的思维转换

## 📌 前置准备

- 回顾 `docs/module-registry.md` 了解全部模块依赖关系
- 回顾 `docs/architecture.md` 三层架构设计
- 思考：一个简单的游戏（如打僵尸）需要哪些流程节点？
