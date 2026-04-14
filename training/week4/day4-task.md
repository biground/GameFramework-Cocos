# Week 4 Day 4 — Phase 3 启动：性能优化 + Logger 模块

> Phase 3 开始 | 预计日期：2026-04-15

## 学习目标

- 回顾 Phase 2 成果，做一次全模块一致性检查
- 实现 Logger/Debug 模块（Phase 3 基础设施）
- 了解性能优化基础：对象池命中率、事件分发开销、帧分摊策略

## 任务清单

### Phase 3 开场：Phase 2 一致性检查

- [ ] 运行全量测试 `npm test`，确认所有模块测试通过
- [ ] 检查所有模块 console.warn/console.log → 统一替换为 Logger（Logger 完成后）
- [ ] 确认所有模块 @todo 标记清单

### Logger 模块实现

- [ ] 定义 `LogLevel` 枚举（Debug / Info / Warn / Error / None）
- [ ] 定义 `ILogger` 接口
- [ ] 实现 `Logger` 类（单例 or 模块形式，支持级别过滤、格式化输出）
- [ ] TDD：10+ 测试用例
- [ ] Code Review

### 性能优化基础（理论 + 讨论）

- [ ] 了解 Cocos Creator 性能瓶颈典型场景
- [ ] 讨论框架层面可优化的点（ObjectPool 命中率统计、事件分发 benchmark）

## 验收标准

- [ ] 全量测试通过
- [ ] Logger 模块 Code Review ≥ 85
- [ ] 理解性能优化的方向和方法论

## 面试关联

| 考点 | 关联 |
|------|------|
| Logger 为什么需要级别过滤 | 生产环境调试策略 |
| 单例 vs 模块注册的选择 | 架构设计题 |
| 性能优化方法论 | 性能调优题 |
