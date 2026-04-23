---
description: '插件包开发规范。当修改 packages/ 下的独立插件时加载。'
applyTo: 'packages/**'
---

# 插件包开发规范

## 命名与结构

- 包名：`fbi-{plugin-name}`（目录名）/ `@fbi/{plugin-name}`（package.json name）
- peerDependency：`"@fbi/core": ">=0.1.0"`
- 入口：`src/index.ts`（统一 re-export）

```
packages/fbi-xxx/
├── package.json
├── README.md
├── tsconfig.json（可选，继承根 tsconfig）
├── src/
│   ├── index.ts          # 统一导出
│   ├── XxxDefs.ts        # 类型定义
│   └── XxxManager.ts     # 主实现
└── __tests__/            # 或在根 tests/ 下
```

## 替换默认模块

插件通过 `allowReplace` 替换框架默认实现：

```typescript
import { GameModule } from '@framework/core/GameModule';

// 替换默认 TimerManager
GameModule.register(new HeapTimerManager(), { allowReplace: true });
```

- `moduleName` 必须与被替换模块一致（如 `'TimerManager'`）
- 实现同一 `ITimerManager` 接口

## 现有插件

| 包                | 替换目标     | 特点                                        | 复杂度         |
| ----------------- | ------------ | ------------------------------------------- | -------------- |
| `fbi-ecs`         | 独立模块     | SparseSet + BitMask，Generational Entity ID | O(1) 组件访问  |
| `fbi-timer-heap`  | TimerManager | MinHeap，O(1) 无触发帧                      | 适合少量高精度 |
| `fbi-timer-wheel` | TimerManager | 时间轮，O(1) 添加/触发                      | 适合海量低精度 |

## ECS 插件特殊约定（fbi-ecs）

- Entity ID 编码：20-bit index + 12-bit generation（防悬挂引用）
- BitMask：`Uint32Array` 多字掩码（无组件数量限制）
- QueryCache：注册查询 + 脏标记自动重算
- CommandBuffer：帧末延迟执行（createEntity / destroyEntity / addComponent）
- ReactiveGroup：响应式实体分组（Enter / Remove 生命周期）

## 代码规范

与框架层完全一致：

- 禁止 `any`，禁止 `console`，必须用 `Logger`
- PascalCase 文件名，中文 JSDoc
- 错误格式 `[模块名] 描述性消息`
