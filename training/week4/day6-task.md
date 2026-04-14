# Week 4 Day 6 — Phase 3: 性能优化专项

## 📅 日期：2026-04-16

## 🎯 今日目标

Phase 3 正式进入**性能优化**专题。Logger 模块已全面集成，现在用它来发现和解决性能问题。

## 📋 任务清单

### 任务 1：性能基准测试框架搭建

建立框架级性能基准（Benchmark），为后续优化提供量化依据。

- [ ] 创建 `tools/benchmark/` 目录
- [ ] 实现 `BenchmarkRunner`：封装多轮测试 + 统计（avg/min/max/p95）
- [ ] 编写 3 个基准测试：
  - EventManager emit 10000 次的耗时
  - ObjectPool acquire/release 10000 轮的耗时
  - FSM changeState 1000 次的耗时
- [ ] 使用 `Logger.time/timeEnd` 集成计时
- [ ] 输出 Markdown 格式的性能报告

### 任务 2：热路径分析与优化

基于基准测试结果，识别并优化热路径。

- [ ] 分析 EventManager.emit 的快照遍历：`handlers.slice()` 是否可优化？
- [ ] 分析 ObjectPool 的 `includes()` 防重复入池：O(n) 是否可优化为 O(1)？
- [ ] 分析 Fsm.changeState 的反递归保护开销
- [ ] 实施优化并用基准对比 before/after

### 任务 3（进阶）：内存分析

- [ ] 用 Logger.getHistory() 分析日志热点模块
- [ ] 检查各模块是否有不必要的闭包或临时对象分配
- [ ] 评估 Ring Buffer size 对内存占用的影响

## 🏆 完成标准

1. BenchmarkRunner 可用，3 个基准测试产出量化数据
2. 至少 1 个热路径优化落地，有 before/after 对比
3. 所有 496 测试继续通过
4. Code Review ≥ 90 分

## 📝 学习要点

- 性能优化的「先量化后优化」原则
- V8 引擎热路径内联（inline）与去优化（deopt）
- 微基准测试的陷阱：JIT 预热、死码消除
- Logger.time/timeEnd 在实际场景中的运用
