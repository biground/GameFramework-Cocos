# ResourceManager（资源管理器）

## 职责

统一管理游戏资源的**加载、缓存、引用计数与释放**。所有模块通过 ResourceManager 获取资源，不直接调用引擎加载 API。

**不做什么**：不负责具体的引擎资源加载实现（由 Runtime 层的 `IResourceLoader` 提供），不负责资源打包/构建流程。

## 对外 API

```typescript
interface IResourceManager {
    // Loader 注入
    setResourceLoader(loader: IResourceLoader): void;

    // 资源加载 / 释放
    loadAsset(path: string, owner: string, callbacks?: LoadAssetCallbacks): void;
    releaseAsset(path: string, owner: string): void;
    releaseByOwner(owner: string): void;

    // 查询
    hasAsset(path: string): boolean;
    getAssetRefCount(path: string): number;
    getAssetInfo(path: string): Readonly<AssetInfo> | undefined;

    // 预加载
    preload(paths: string[], owner: string, callbacks?: PreloadCallbacks): void;
}
```

## 设计决策

| 决策           | 选择                      | 原因                             |
| -------------- | ------------------------- | -------------------------------- |
| 引用计数粒度   | 按 owner（非调用次数）    | 避免 load/release 不配对导致泄漏 |
| 加载去重       | Loading 状态追加回调      | 避免同一资源被重复加载           |
| 框架层资源类型 | `unknown`                 | Framework 层不依赖 cc 命名空间   |
| 加载策略       | IResourceLoader 接口注入  | 测试用 Mock，线上用 CocosLoader  |
| 释放时机       | refCount === 0 后立即释放 | 简单可控，后续可改为延迟释放     |

## 依赖

- **EventManager**（priority: 10）— 加载完成/失败事件通知（预留）
- **ObjectPool**（priority: 20）— AssetInfo 对象复用（预留）

## 被谁依赖

- UIManager, EntityManager, AudioManager, SceneManager, DataManager, LocalizationManager

## 已知限制

- 引用计数无法处理循环引用（游戏资源一般不会出现）
- 释放是同步的，大量资源释放可能卡帧（后续可做分帧释放）
- 暂未实现资源分组（ResourceGroup）和 LRU 缓存淘汰
- onProgress 在预加载场景中是按资源个数计算，不是按字节

## 关联测试

- 测试文件路径：`tests/resource/resource-manager.test.ts`
- 测试数量：26 个
- 覆盖：加载/释放/引用计数/去重/owner 追踪/preload/shutdown
