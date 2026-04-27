# Cocos Creator 3.8.5 Runtime 适配层

`runtime/cc-385/` 是把框架层（`@framework/*`）落到 Cocos Creator 3.8.5 引擎上的唯一桥接点。它实现 Resource / Scene / UI 三大模块的策略接口，并通过 `installCocosRuntime()` 一次性装配到框架。

业务代码（Game 层）**不会**也**不应该**直接 `import` 本目录下的任何符号——它们对用户是不可见的，业务层只面向 `@framework/*` 接口编程。

## 1. 架构图

```
┌──────────────────────────────────────────────────────────────┐
│  Game 层 (用户代码)                                            │
│  仅依赖 @framework/* 接口与 Manager Facade                     │
└──────────────────────────────┬───────────────────────────────┘
                               │ ResourceManager / SceneManager / UIManager
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Framework 层 (assets/scripts/framework/)                     │
│                                                               │
│  ResourceManager ──┐                                          │
│  SceneManager   ───┼─── 策略接口 (IResourceLoader,             │
│  UIManager      ───┘    ISceneLoader, IUIFormFactory)         │
└──────────────────────────────┬───────────────────────────────┘
                               │ setXxxLoader / setUIFormFactory
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Runtime 层 (assets/scripts/runtime/cc-385/)                  │
│  ─── 唯一允许 import 'cc' 的层 ───                              │
│                                                               │
│  CocosResourceLoader  → cc.resources.load / Asset.addRef      │
│  CocosSceneLoader     → cc.director.loadScene                 │
│  CocosUIFormFactory   → instantiate / Canvas / Node           │
└──────────────────────────────┬───────────────────────────────┘
                               │ import { ... } from 'cc'
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Cocos Creator 3.8.5 引擎                                     │
└──────────────────────────────────────────────────────────────┘
```

**关键点**：用户感知不到 runtime 层的存在。切换到其他引擎时，只需新建 `runtime/<engine-tag>/` 目录提供同样的策略实现，再换一个 `installXxxRuntime()` 入口即可，框架层与 Game 层零改动。

## 2. 引用计数转发契约

`ResourceManager` 维护 owner → path → AssetInfo 的引用账本，`refCount = owners.size`。`CocosResourceLoader` 作为底层适配，**只在 owner 维度的边界上**与 `cc.Asset` 的内置引用计数交互：

- **首次** owner 调用 `loadAsset(path)` → 底层 `cc.resources.load` 完成时调一次 `asset.addRef()`
- **最后一个** owner 调用 `releaseAsset(path)` → 调一次 `asset.decRef(true)`，`true` 表示连带释放贴图等子资源

> **不要**在每次 `load` / `release` 上都做 `addRef` / `decRef`。框架层已把"同一 owner 的重复 load"和"非末次 release"全部拦在 ResourceManager 里，底层只看到一次 add 与一次 dec。重复调底层引用计数 = 双重记账，必然内存泄漏或提前释放。

### 双往返代码示例

```typescript
import { GameEntry } from '@framework/core/GameEntry';
import { ResourceManager } from '@framework/resource/ResourceManager';

const rm = GameEntry.getModule<ResourceManager>('ResourceManager');

// 第一次往返：底层 _ref 0 → 1 → 0
rm.loadAsset('ui/MainMenu', 'menu', {
    onSuccess: (path, asset) => {
        // 此时 (asset as any)._ref === 1
        rm.releaseAsset(path, 'menu');
        // 此时 (asset as any)._ref === 0，asset 已被引擎释放
    },
});

// 第二次往返：从底层重新加载，_ref 再次 0 → 1 → 0
rm.loadAsset('ui/MainMenu', 'menu', {
    onSuccess: (path, asset) => {
        rm.releaseAsset(path, 'menu');
    },
});
```

`CocosResourceLoader` 内部用 `_loaded: Map<string, Asset>` 缓存"当前持有 ref 的资源"，`releaseAsset` 后立即从 map 移除，下次 `loadAsset` 重新走一遍 `cc.resources.load`。

> 该契约的源头在 `ResourceDefs.ts` 的 `IResourceLoader` JSDoc，所有未来的引擎适配都必须遵守。

## 3. UI 层管理说明

`CocosUIFormFactory` 负责把 `UIManager` 的逻辑层 (zIndex 数字) 落到 Cocos 节点树上。

### 3.1 Map<number, Node> 懒建机制

```typescript
private readonly _layerNodes = new Map<number, Node>();
```

层容器节点**不在初始化时全建出来**，而是 `createForm` 命中某个 `config.layer` 时才在 Canvas 下 `new Node('UILayer-Foo')` 并 `addChild`。每次懒建后会按 zIndex 升序对所有容器执行 `setSiblingIndex`，保证渲染顺序：

```typescript
const sorted = [...this._layerNodes.entries()].sort((a, b) => a[0] - b[0]);
sorted.forEach(([, n], i) => n.setSiblingIndex(i));
```

这意味着层的相对顺序与"建出来的先后"无关，只与 zIndex 数字大小有关，幂等可靠。

### 3.2 registerLayer(zIndex, name?)

可选的预注册接口，**不创建容器**，只是给 zIndex 起个名字，将来懒建时容器节点的 `name` 会用上：

```typescript
const factory = uiManager.getUIFormFactory() as CocosUIFormFactory;
factory.registerLayer(150, 'Hud');     // 容器节点名将是 'UILayer-Hud'
factory.registerLayer(900);             // 容器节点名将是 'UILayer-900' (默认 'Layer{zIndex}')
```

不调 `registerLayer` 也能用——`config.layer = 150` 第一次出现时，容器名直接退到 `Layer150`。

### 3.3 跨场景 Canvas 失效订阅

切换场景后，旧 Canvas 节点会被销毁，缓存里的 `Node` 引用会变成野指针。工厂在构造时订阅了 director 事件：

```typescript
director.on(Director.EVENT_BEFORE_SCENE_LOADING, this._onBeforeSceneLoading);
director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this._onAfterSceneLaunch);
```

- `EVENT_BEFORE_SCENE_LOADING`：`_layerNodes.clear()`，丢弃所有层容器引用（节点会随旧场景一起被引擎销毁）
- `EVENT_AFTER_SCENE_LAUNCH`：`_canvas = null`，强制下次 `_getCanvas()` 重新查找新场景的 Canvas

下次 `createForm` 时会按需重新懒建。

### 3.4 双策略 Canvas 查找

`_getCanvas()` 用两种策略查 Canvas，提高对不同项目结构的容错：

1. **Component 优先**：`scene.getComponentInChildren(Canvas)`——官方推荐，不依赖节点名
2. **名字兜底**：`scene.getChildByName('Canvas')`——少数项目有自定义 Component 但保留了 `Canvas` 节点名

两种策略都失败才返回 `null`，由 `_getOrCreateLayer` 抛出 `找不到 Canvas 节点` 异常。

### 3.5 UIForm 反射

工厂不要求 UI 组件继承某个固定基类；它在 Prefab 实例化出来的根节点上遍历 components，找 `constructor.__IS_UI_FORM__ === true` 的那一个，调它的 `getUIForm()` 取出框架层 `UIFormBase` 实例。

`CocosUIFormBase` 是官方提供的桥接组件——`extends cc.Component` + `__IS_UI_FORM__ = true` + `setUIForm/getUIForm`。业务也可以自己实现这套约定，不依赖本目录的具体类。

## 4. installCocosRuntime 用法

> **注意：函数无参！** 不要写成 `installCocosRuntime(gameEntry)`。它通过 `GameEntry.getModule(name)` 自己找到所需模块。

### 4.1 完整启动序列

```typescript
import { GameEntry } from '@framework/core/GameEntry';
import { EventManager } from '@framework/event/EventManager';
import { ObjectPoolManager } from '@framework/objectpool/ObjectPoolManager';
import { ResourceManager } from '@framework/resource/ResourceManager';
import { SceneManager } from '@framework/scene/SceneManager';
import { UIManager } from '@framework/ui/UIManager';
import { installCocosRuntime } from '@runtime/cc-385/installCocosRuntime';

async function bootstrap(): Promise<void> {
    // 1. 注册：先三大基础设施，再 Resource/Scene/UI
    GameEntry.register('EventManager', new EventManager());
    GameEntry.register('ObjectPoolManager', new ObjectPoolManager());
    GameEntry.register('ResourceManager', new ResourceManager());
    GameEntry.register('SceneManager', new SceneManager());
    GameEntry.register('UIManager', new UIManager());

    // 2. 初始化所有模块（priority 升序）
    GameEntry.init();

    // 3. 装配 Cocos 适配层 —— 此时三大 Manager 已 init 完成
    installCocosRuntime();

    // 4. 启动主循环
    GameEntry.start();
}
```

### 4.2 装配顺序硬约束

`installCocosRuntime()` 内部按 `Resource → Scene → UI` 顺序注入策略，原因：`CocosUIFormFactory` 构造函数需要传入 `IResourceManager` 实例，只能在 ResourceManager 拿到之后再建。

任意一个 Manager 未注册都会抛 `[installCocosRuntime] 模块 XXX 未注册，请先 GameEntry.register(...)`。

### 4.3 幂等

```typescript
let _isInstalled = false;
```

重复调用只 `Logger.warn('已装配，跳过重复调用')`，**不抛错**。这样在开发热重载场景下不会因为旧模块残留而崩。

### 4.4 测试钩子

```typescript
import { _resetCocosRuntimeForTesting } from '@runtime/cc-385/installCocosRuntime';

afterEach(() => {
    _resetCocosRuntimeForTesting();
});
```

仅供单元测试使用，**生产代码绝不要调用**。它只重置 `_isInstalled` 标志，不会卸载已注入的 loader 实例。

## 5. 已知限制

1. **仅支持从 `resources/` 目录加载**：`CocosResourceLoader` 调用的是 `cc.resources.load`，受 Cocos Creator `Bundle.resources` API 限制，无法加载其他自定义 Bundle 中的资源。如需多 Bundle，请实现一个新的 `IResourceLoader`。
2. **不支持在 Cocos Creator Editor 模式下运行**：本适配层仅面向运行时，依赖 `director` / `instantiate` / `Canvas` 等运行时 API。在编辑器扩展插件场景下不可用。
3. **不保证 jsb 原生平台行为完全一致**：当前实现仅在 Web / Web Mobile 预览过；jsb (iOS/Android/Mac/Win 原生) 平台未做平台测试。`asset.decRef(true)` 的子资源连带释放、`director.loadScene` 的内存峰值等细节可能存在平台差异。
4. **不支持 `loadAsset` 中途取消**：`cc.resources.load` 没有公开的 cancel API，因此 `CocosResourceLoader` 也没有暴露取消语义。需要取消的场景请改用预加载 + 业务侧丢弃结果的模式。
