---
description: "Game 层 Demo 开发规范。当修改 game/ 下的 Demo、共享基础设施、Mock 策略实现时加载。"
applyTo: "assets/scripts/game/**"
---

# Game 层 Demo 开发规范

## 架构约束

- **依赖接口，不依赖实现** — 使用 `IEventManager`、`IResourceManager` 等接口类型
- 可使用 `@framework/*` 路径别名导入框架模块
- 禁止直接 import 其他模块的实现类进行跨模块调用，走 EventManager

## DemoBase 继承模式

所有 Demo 继承 `DemoBase`，实现两个抽象方法：

```typescript
export class MyDemo extends DemoBase {
    constructor() { super('Demo 标题'); }

    setupProcedures(): void {
        // 1. getModule<T>(name) 获取模块引用
        // 2. 创建游戏系统（依赖注入）
        // 3. 构建 Context 结构体（跨 Procedure 共享数据）
        // 4. 注册全部 Procedure
    }

    setupDataTables(): void {
        // createTableFromRawData 注册数据表
    }
}
```

### 启动顺序

```
bootstrap()           → 注册 15 个模块 + 注入 Mock 策略
setupProcedures()     → 注册 Procedure 链
setupDataTables()     → 注册数据表
startProcedure(...)   → 启动流程链
startMainLoop(30)     → 30fps 主循环（setInterval → GameModule.update(dt)）
```

## HtmlRenderer UI 规范

### 防日志爆炸（铁律）

| 事件类型 | 方法 | 说明 |
|----------|------|------|
| 高频/周期性 | `updateLog(key, msg)` | 同 key 原地更新，不追加新行 |
| 关键事件 | `log(msg, color)` | 追加新行（购买、升级、成就、战斗结果） |
| 状态数据 | `updateStatus(panelId, key, value)` | 状态面板原地更新 |

```typescript
// ✅ 高频事件：updateLog 原地更新
eventMgr.on(CLICK_MINE, (data) => {
    renderer.updateLog('click-mine', `⛏️ 挖矿 +${data.amount}`, LOG_COLORS.DEBUG);
});

// ✅ 关键事件：log 追加
eventMgr.on(BUILDING_PURCHASED, (data) => {
    renderer.log(`🏗️ 购买建筑 #${data.id}`, LOG_COLORS.SUCCESS);
});
```

### LOG_COLORS 常量

```typescript
SUCCESS: '#4CAF50'   // 绿 — 购买、升级
INFO:    '#2196F3'   // 蓝 — 一般信息
WARNING: '#FF9800'   // 橙 — 警告
ERROR:   '#F44336'   // 红 — 错误
NETWORK: '#9C27B0'   // 紫 — 网络
DEBUG:   '#9E9E9E'   // 灰 — 调试
COMBAT:  '#FF5722'   // 橙红 — 战斗
TIMER:   '#00BCD4'   // 青 — 定时器
```

## FSM 定义规范

Defs 文件只定义名字和接口，状态逻辑在单独的 States 文件：

```typescript
// XxxFsmDefs.ts
export const XxxFsmStateNames = {
    IDLE: 'Idle',
    ACTIVE: 'Active',
} as const;

export interface IXxxBlackboard {
    // FSM 内所有状态共享的数据
}

export const XxxFsmDataKeys = {
    BLACKBOARD: 'blackboard',
} as const;
```

## Procedure Context 模式

跨 Procedure 共享数据通过 Context 接口 + `procMgr.setData()` 传递：

```typescript
interface IProcedureContext {
    gameData: GameData;
    renderer: HtmlRenderer;
    battleSystem: BattleSystem;
    // ...
}

procMgr.setData<IProcedureContext>(CONTEXT_KEY, ctx);
```

## 游戏系统类

- **不继承 ModuleBase**，是纯 TypeScript 类
- 通过构造函数注入依赖（组合模式）
- 纯静态工具类（如 DamageCalculator、EnemyAI）无状态

## Mock 策略实现（shared/）

所有 Mock 放在 `game/shared/`，实现框架层策略接口：

| Mock | 实现接口 | 特点 |
|------|---------|------|
| MockResourceLoader | IResourceLoader | 手动 resolve/reject + 自动成功模式 |
| MockAudioPlayer | IAudioPlayer | calls 数组追踪调用历史 |
| MockUIFormFactory | IUIFormFactory | 创建测试用 UIFormBase |
| MockSceneLoader | ISceneLoader | 模拟场景加载 |
| MockNetworkSocket | INetworkSocket | 模拟网络连接 |
| MockDataTableParser | IDataTableParser | 解析内联数据 |
| MockEntityFactory | IEntityFactory | 创建测试用 Entity |

## 入口文件约定

| 文件 | 用途 |
|------|------|
| `index.ts` | 浏览器执行入口（实例化 Demo + start()） |
| `main.ts` | 备选入口（try/catch 同步启动） |
| 或 `index.ts` 也可做模块 re-export（统一导出公开符号供测试引用） |
