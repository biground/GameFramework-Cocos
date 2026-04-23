---
description: "框架层编码规范。当修改 framework/ 下的模块实现、接口、定义文件时加载。"
applyTo: "assets/scripts/framework/**"
---

# 框架层编码规范

## 铁律

1. **禁止** `import` cc 命名空间 — 框架层是纯 TypeScript，零引擎依赖
2. **禁止** `any` 类型 — ESLint `no-explicit-any: error`
3. **禁止** `console.log/warn/error` — 必须使用 `Logger.debug/info/warn/error(TAG, msg)`
4. 所有 public API 必须有**中文 JSDoc**

## 模块类结构

每个模块必须继承 `ModuleBase`，实现标准签名：

```typescript
import { ModuleBase } from '../core/ModuleBase';
import { Logger } from '../debug/Logger';

export class XxxManager extends ModuleBase implements IXxxManager {
    private static readonly TAG = 'XxxManager';

    public get moduleName(): string { return 'XxxManager'; }
    public get priority(): number { return 100; }  // 按范围分配

    public onInit(): void { Logger.info(XxxManager.TAG, '初始化完成'); }
    public onUpdate(deltaTime: number): void { /* 需要帧更新才 override */ }
    public onShutdown(): void { /* 清理资源 */ }
}
```

### Priority 分配规则

| 范围 | 类型 | 示例 |
|------|------|------|
| 0-99 | 基础设施 | Logger(0), EventManager(10), ObjectPool(10), TimerManager(10) |
| 100-199 | 核心服务 | ResourceManager(100), FsmManager(110), NetworkManager(130) |
| 200-299 | 业务模块 | UIManager(200), AudioManager(210), SceneManager(220) |
| 300-399 | 上层逻辑 | ProcedureManager(300), DataTableManager(310), i18n(350) |
| 400+ | 调试工具 | DebugManager(400) |

## 文件组织

每个模块目录包含：

| 文件 | 命名 | 内容 |
|------|------|------|
| 实现 | `{Module}Manager.ts` | 模块主类 |
| 定义 | `{Module}Defs.ts` | 类型、接口、枚举、EventKey 常量 |
| 接口 | `I{Module}Manager.ts` | 放在 `framework/interfaces/` |
| README | `README.md` | 模块文档（必须，模板见 docs/module-readme-template.md） |

## 导入规则

**框架层内部一律使用相对路径：**

```typescript
// ✅ 正确
import { ModuleBase } from '../core/ModuleBase';
import { Logger } from '../debug/Logger';
import { IResourceManager } from '../interfaces/IResourceManager';
import { ResourceDefs } from './ResourceDefs';

// ❌ 错误（框架层禁止用别名）
import { ModuleBase } from '@framework/core/ModuleBase';
```

## 策略注入模式

需要引擎桥接的模块通过 setter 注入策略接口：

```typescript
private _loader: IResourceLoader | null = null;

public setResourceLoader(loader: IResourceLoader): void {
    if (!loader) {
        Logger.error(XxxManager.TAG, 'loader 不能为空');
        throw new Error('[XxxManager] loader 不能为空');
    }
    this._loader = loader;
}
```

## 错误处理

- 格式：`[模块名] 描述性消息`（中文）
- 关键路径：先 `Logger.error` 再 `throw new Error`
- 策略未注入时调用必须抛异常，不允许静默失败

## 遍历安全

回调列表遍历期间防止并发修改：
1. 进入遍历设 `_emitDepth++` / `_updating = true`
2. 遍历期间 remove 只设 `_removed = true` 标记
3. 遍历后 `_emitDepth === 0` 时统一清理

## 类型安全约定

- 幻影类型：`EventKey<T>` / `ServiceKey<T>` 用 `declare private readonly _phantom: T`
- 只读外部视图：内部 `Set<string>` → 外部 `ReadonlySet<string>`
- FSM 状态名用 `as const` 对象替代枚举

## onShutdown 安全清理

先拷贝快照再清空容器，防止释放副作用影响遍历：

```typescript
public onShutdown(): void {
    const keys = [...this._map.keys()];
    this._map.clear();
    for (const key of keys) { this._loader?.release(key); }
}
```
