# Interfaces（框架接口定义）

## 职责

集中定义所有框架模块的公共接口契约，业务层（Game 层）**必须**依赖这些接口而非模块实现类，确保依赖倒置和模块可替换性。
**不包含**任何实现代码，仅定义接口签名和契约注释。

## 接口清单

| 接口文件 | 对应模块 | 说明 |
|----------|----------|------|
| `IEventManager.ts` | EventManager | 事件发布-订阅 |
| `IFsmManager.ts` | FsmManager | 有限状态机管理 |
| `IProcedureManager.ts` | ProcedureManager | 流程管理 |
| `IObjectPoolManager.ts` | ReferencePool | 对象池管理 |
| `IResourceManager.ts` | ResourceManager | 资源加载与管理 |
| `IUIManager.ts` | UIManager | UI 界面管理 |
| `INetworkManager.ts` | NetworkManager | 网络通信 |
| `IEntityManager.ts` | EntityManager | 实体管理 |
| `ILocalizationManager.ts` | LocalizationManager | 国际化 |
| `IHotUpdateManager.ts` | HotUpdateManager | 热更新 |

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 集中存放 | 所有接口在 `interfaces/` 目录 | 便于查找和维护，清晰展示框架能力全景 |
| 依赖倒置 | Game 层依赖接口，不依赖实现 | 模块可通过 `GameModule.register({ allowReplace })` 替换 |
| 接口命名 | `I` 前缀 + 模块名 | 统一规范，一目了然 |
| 无实现 | 仅签名和 JSDoc | 保持纯契约，实现在各模块目录中 |

## 使用方式

```typescript
// Game 层引用接口（正确 ✅）
import { IEventManager } from '@framework/interfaces/IEventManager';
import { IResourceManager } from '@framework/interfaces/IResourceManager';

// 直接引用实现类（错误 ❌）
// import { EventManager } from '@framework/event/EventManager';
```

## 新模块接口添加规范

1. 在 `interfaces/` 目录创建 `I{ModuleName}.ts`
2. 定义接口，包含完整的中文 JSDoc 注释
3. 接口方法签名应与实现类的 public API 保持一致
4. 更新本 README 的接口清单

## 被谁依赖

- **Game 层**（业务代码）— 所有模块访问都通过接口
- **Runtime 层** — 桥接引擎时依赖接口定义
- **其他模块** — 跨模块依赖时引用接口而非实现

## 状态

✅ 持续维护 — 随新模块开发同步更新
