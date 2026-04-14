# SceneManager（场景管理器）

## 职责

统一管理游戏场景的加载、卸载和切换。**不负责**场景内容的创建/销毁（由引擎处理）、场景间数据传递（由业务层处理）、场景内对象管理（由 EntityManager 处理）。

## 核心概念

### 加载去重（三层防护）

1. **空名拦截**：`sceneName` 为空直接忽略并 warn
2. **当前场景拦截**：已在目标场景中时忽略重复加载
3. **正在加载拦截**：有场景正在加载时忽略新请求

### ISceneLoader 策略注入

Framework 层通过 `ISceneLoader` 接口定义场景加载契约，Runtime 层注入引擎实现（如 `CocosSceneLoader`），实现框架与引擎解耦。

```typescript
// Runtime 层注入
const sceneMgr = GameEntry.getModule<ISceneManager>('SceneManager');
sceneMgr.setSceneLoader(new CocosSceneLoader());
```

### 异步回调

通过 `LoadSceneOptions` 支持加载进度和自定义数据透传：

```typescript
sceneMgr.loadScene('BattleScene', {
    onProgress: (progress) => Logger.debug('Scene', `加载进度: ${progress * 100}%`),
    userData: { levelId: 1 },
});
```

### 事件广播（@todo）

`SceneEvents` 已定义 `SCENE_LOADING` / `SCENE_LOADED` / `SCENE_UNLOADED` 三个类型安全事件键（`EventKey<T>`），待集成 EventManager 后启用。

## 对外 API

```typescript
interface ISceneManager {
    // 策略注入
    setSceneLoader(loader: ISceneLoader): void;

    // 场景加载
    loadScene(sceneName: string, options?: LoadSceneOptions): void;

    // 只读属性
    readonly currentScene: string | null;
    readonly isLoading: boolean;
}
```

## 设计决策

| 决策                   | 选择                       | 原因                                                                |
| ---------------------- | -------------------------- | ------------------------------------------------------------------- |
| 三层加载去重           | 空名 + 当前场景 + 正在加载 | 防止重复加载导致状态混乱                                            |
| ISceneLoader 策略注入  | 接口 + setter              | 与 IAudioPlayer / IResourceLoader 一致的 Framework→Runtime 解耦模式 |
| priority = 220         | 业务框架范围 200-299       | 在 AudioManager(210) 之后，可按需调整                               |
| 只管加载、不管卸载逻辑 | loadScene 内置状态切换     | 引擎通常在加载新场景时自动卸载旧场景                                |
| 回调而非 Promise       | LoadSceneCallbacks         | 与框架其他模块一致的异步风格，支持 onProgress 渐进反馈              |
| 事件定义预留           | SceneEvents + EventKey     | 提前定义类型安全事件，集成 EventManager 时零改动                    |

## 依赖

- **无硬依赖**：ISceneLoader 由 Runtime 层注入
- **EventManager**（@todo）：场景事件广播，待集成

## 被谁依赖

- 业务层 Game 模块（通过 `ISceneManager` 接口）
- ProcedureManager（流程切换时触发场景加载）

## 已知限制

- 无场景卸载 API（当前引擎加载新场景时自动卸载旧场景）
- `SceneEvents` 事件已定义但未启用发布（待集成 EventManager）
- 无场景预加载支持
- 无场景过渡动画支持（如 fade in/out）
- 加载失败无重试机制

## 后续拓展方向

1. **EventManager 集成**：在 loadScene 各阶段 emit 事件，支持 UI 层监听加载进度
2. **场景卸载 API**：配合 ISceneLoader.unloadScene 支持显式卸载
3. **场景预加载**：提前加载场景资源，减少切换延迟
4. **过渡动画**：fadeIn/fadeOut、loading 界面等过渡效果
5. **加载失败重试**：可配置重试次数和间隔

## 关联测试

- 测试文件路径：`tests/scene/scene-manager.test.ts`
- 测试数量：15 个
- 覆盖场景：策略注入、正常加载流程、三层加载去重、进度回调、加载失败处理、生命周期（onInit/onShutdown）
