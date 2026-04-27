---
description: '测试策略与约定。当编写或修改测试文件时加载。'
applyTo: 'tests/**'
---

# 测试策略与约定

## 测试框架

- **Jest** + **ts-jest**：单元/集成测试
- **Playwright**：E2E 浏览器测试（`tests/e2e/`，被 Jest 的 `testPathIgnorePatterns` 排除）
- 运行命令：`npm test`（Jest）| `npm run test:e2e`（Playwright）

## 目录结构

```
tests/
├── __mocks__/cc.ts       # Cocos Creator cc 模块全局 Mock
├── {module}/             # 框架模块单元测试（镜像 framework/ 结构）
├── game/shared/          # Demo 共享 Mock 测试
├── game/demo1-idle/      # Demo1 业务测试
├── game/demo2-rpg/       # Demo2 业务测试
├── integration/          # 集成测试
└── e2e/                  # Playwright E2E
```

## 文件命名

| 层       | 格式                         | 示例                            |
| -------- | ---------------------------- | ------------------------------- |
| 框架测试 | `kebab-case.test.ts`         | `event-manager.test.ts`         |
| 游戏测试 | `PascalCase.test.ts`         | `BattleSystem.test.ts`          |
| 集成测试 | `{name}.integration.test.ts` | `demo2-rpg.integration.test.ts` |
| E2E      | `{name}.e2e.test.ts`         | `demo2-rpg.e2e.test.ts`         |

## 导入规则

**测试文件统一使用路径别名**（jest.config.js 中的 moduleNameMapper）：

```typescript
// ✅ 正确
import { EventManager } from '@framework/event/EventManager';
import { IResourceLoader } from '@framework/resource/ResourceDefs';

// ❌ 错误（测试文件不用相对路径）
import { EventManager } from '../../assets/scripts/framework/event/EventManager';
```

## 标准测试模式

### 模块测试骨架

```typescript
import { GameModule } from '@framework/core/GameModule';
import { XxxManager } from '@framework/xxx/XxxManager';

describe('XxxManager', () => {
    let manager: XxxManager;

    beforeEach(() => {
        manager = new XxxManager();
        GameModule.register(manager); // 触发 onInit()
    });

    afterEach(() => {
        GameModule.shutdownAll(); // 清理全局注册表，防止状态污染
    });

    it('描述测试行为', () => {
        // Arrange → Act → Assert
    });
});
```

### 关键约定

1. **`afterEach(() => GameModule.shutdownAll())`** — 每个测试后必须清理
2. **`jest.fn()`** — 回调 spy
3. **内部 Mock 类** — 测试文件内定义 `class MockXxx extends ModuleBase`
4. **`callLog: string[]`** — 记录调用顺序，用 `toEqual` 断言
5. **`jest.useFakeTimers()`** — 集成测试中模拟主循环时间推进

## Mock 策略

### Cocos 引擎 Mock（仅 runtime 分支）

main 分支为纯框架，**不 import 'cc'**，因此 main 上不存在 `tests/__mocks__/cc.ts`。
runtime 适配层在独立分支（如 `feature/runtime-cc385`）中按需提供 cc mock 与 `^cc$` 映射，详见对应分支的 `tests/__mocks__/cc.ts` 与 `jest.config.js`。

### 模块级 Mock

```typescript
// 集成测试中 mock Logger（避免噪声输出）
jest.mock('@framework/debug/Logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        onInit: jest.fn(),
        onUpdate: jest.fn(),
        onShutdown: jest.fn(),
    },
}));
```

### 策略接口 Mock（game/shared/）

每个框架模块的策略接口都有对应 Mock 实现，支持：

- **手动控制模式**：`resolve(path)` / `reject(path)` 手动触发回调
- **自动成功模式**：`setAutoSuccess(true)` 立即触发成功回调
- **调用追踪**：`calls: string[]` 记录调用历史

## 集成测试

- 环境：`/** @jest-environment jsdom */`（需要 DOM 的测试）
- 使用 `jest.useFakeTimers()` + `jest.advanceTimersByTime(ms)` 模拟时间推进
- `jest.spyOn(GameModule, 'update')` 断言 update 调用次数

## E2E 测试（Playwright）

- 配置：`playwright.config.ts`，baseURL `http://localhost:3002`
- 自动启动 webServer：`npm run demo2:serve`
- 选择器策略：`getByRole('button', { name })` + `getByText(text)` + `waitFor`
- 超时：60 秒，单 worker

## 覆盖率

```bash
npm run test:coverage
```

收集范围：`assets/scripts/framework/**/*.ts`（排除 `.d.ts`）
