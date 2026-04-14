# Week 4 Day 2 — NetworkManager Code Review + AudioManager 教学与实现

**日期**：2026-04-13  
**目标**：完成 NetworkManager Code Review → AudioManager 教学五步法 → AudioManager 编码实现

## 上午：NetworkManager Code Review

### 任务 1：阅读 Code Review 结果

- [ ] 理解 Review 每个维度的评分和改进建议
- [ ] 记录面试关联知识点

## 下午：AudioManager 模块

### 任务 2：AudioManager 教学（五步法）

- [ ] 理解音频管理器的核心职责和痛点
- [ ] 理解游戏音频系统的分层设计（Music / Sound / 音量控制）
- [ ] 理解 AudioManager 在框架三层架构中的位置
- [ ] 理解 IAudioPlayer 策略注入模式

### 任务 3：AudioManager 编码实现

- [ ] 创建 `AudioDefs.ts` — 音频类型定义、配置接口、事件键
- [ ] 创建 `IAudioManager.ts` — 音频管理器公共接口
- [ ] 创建 `AudioManager.ts` — 音频管理器实现
- [ ] 创建 `tests/audio/audio-manager.test.ts` — TDD 测试
- [ ] 创建 `README.md` — 模块文档

### 编码要求

- 继承 `ModuleBase`，priority = 210（业务框架层）
- 依赖 `ResourceManager`（加载音频资源）
- 双通道设计：背景音乐（Music，同时只一首）+ 音效（Sound，可叠加多个）
- IAudioPlayer 策略注入（framework 层不依赖 cc 命名空间）
- 音量控制：全局音量 / 音乐音量 / 音效音量 三级控制
- 静音功能：全局静音 / 分类静音
- 所有 public API 要有中文 JSDoc
- 测试覆盖：播放/停止/暂停/音量/静音/多实例音效

### 验收标准

- [ ] 测试全绿（25+ 用例）
- [ ] Code Review 达到 90+ 分
- [ ] README.md 完成
- [ ] module-registry.md 更新
