# Week 4 Day 7 任务卡

## 日期：2026-04-15

## 主题：Phase 3 启动 — ECS 架构探索 / CI/CD 基础搭建

---

## 任务 1：ECS 架构设计探索（1.5h）

### 目标
对比 EC（Entity-Component）和 ECS（Entity-Component-System）两种架构，为 fbi-ecs 插件设计方案定稿。

### 具体内容
1. 阅读 `packages/gfc-ecs/` 现有代码和 README
2. 梳理 ECS 核心概念：Entity 只是 ID、Component 纯数据、System 纯逻辑
3. 设计 Query API：如何高效查询"拥有 Position + Velocity 的所有实体"
4. 考虑与现有 EntityManager（EC 模式）的共存策略

### 验收标准
- [ ] 输出 ECS 设计文档（API 草案 + 与现有 EntityManager 的对比）
- [ ] 确定 Component 存储方式（SoA vs AoS）

---

## 任务 2：GitHub Actions CI 基础搭建（1h）

### 目标
搭建最小可用的 CI 流水线：push → lint + test → 报告。

### 具体内容
1. 创建 `.github/workflows/ci.yml`
2. 配置 Node.js 环境 + 缓存 node_modules
3. 运行 `npm run lint` + `npm test`
4. 配置 PR 触发和 main 分支保护

### 验收标准
- [ ] CI 配置文件推送后 GitHub Actions 绿色通过
- [ ] 包含 lint + test 两个步骤
- [ ] 使用 cache 加速 npm install

---

## 任务 3：面试题复习（30min）

### 关键面试题
1. **emit 快照 vs emitDepth 方案对比**：各自的优缺点？嵌套 emit 场景怎么处理？
2. **ObjectPool includes vs Set**：什么场景下 Set 反而更慢？为什么？
3. **性能测试方法论**：为什么需要预热？P95/P99 比平均值重要在哪？标准差说明什么？
4. **JIT 编译对 benchmark 的影响**：V8 的 Turbofan 何时触发？deopt 是什么？

---

## 预期产出
- ECS 设计草案文档
- CI/CD 配置文件（可运行）
- 面试 QA 更新
