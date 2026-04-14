# Week 4 Day 3 — SceneManager（场景管理器）

> Phase 2 最后一个模块 | 预计完成日期：2026-04-14

## 学习目标

- 掌握场景管理器的设计原理（单场景替换、加载去重、事件驱动）
- 第四次实践策略注入模式（ISceneLoader），熟练掌握 Framework→Runtime 解耦
- 理解 SceneManager 与 UIManager、AudioManager 的职责边界

## 任务清单

### Phase 1：类型定义（SceneDefs.ts）

- [ ] 定义 `ISceneLoader` 接口
    - `loadScene(sceneName: string, callbacks: LoadSceneCallbacks): void`
    - `unloadScene(sceneName: string): void`
- [ ] 定义 `LoadSceneCallbacks` 类型
    - `onProgress?: (progress: number) => void` — 加载进度（0~1）
    - `onSuccess?: (sceneName: string) => void` — 加载成功
    - `onFailure?: (sceneName: string, error: string) => void` — 加载失败
- [ ] 定义 `LoadSceneOptions` 类型（用户传入 loadScene 的可选参数）
    - `onProgress?: (progress: number) => void`
    - `userData?: unknown`
- [ ] 定义场景事件 Key（用 EventKey<T>）
    - `SCENE_LOADING` — 场景开始加载
    - `SCENE_LOADED` — 场景加载完成
    - `SCENE_UNLOADED` — 场景卸载完成

### Phase 2：接口定义（ISceneManager.ts）

- [ ] 定义 `ISceneManager` 接口
    - `setSceneLoader(loader: ISceneLoader): void`
    - `loadScene(sceneName: string, options?: LoadSceneOptions): void`
    - `unloadScene(sceneName: string): void`
    - `readonly currentScene: string | null`
    - `readonly isLoading: boolean`

### Phase 3：测试先行（TDD Red）

- [ ] 创建 `tests/scene/scene-manager.test.ts`
- [ ] 测试用例覆盖：
    - 基础：loadScene 成功加载并更新 currentScene
    - 基础：unloadScene 卸载当前场景
    - 去重：正在加载时重复调用 loadScene 被忽略
    - 去重：加载当前已加载场景被忽略
    - 回调：onProgress 正确传递加载进度
    - 回调：onSuccess / onFailure 回调正确触发
    - 事件：加载完成后 emit SCENE_LOADED 事件
    - 事件：卸载后 emit SCENE_UNLOADED 事件
    - 生命周期：onShutdown 清理所有状态
    - 异常：未设置 loader 时调用 loadScene 抛错
    - 异常：空场景名抛错

### Phase 4：实现（TDD Green）

- [ ] 实现 `SceneManager extends ModuleBase implements ISceneManager`
    - priority = 220
    - 内部状态：\_currentScene / \_loadingScene / \_sceneLoader
    - loadScene：去重检查 → 标记加载中 → 委托 ISceneLoader → 回调处理 → emit 事件
    - unloadScene：委托 ISceneLoader → 清理状态 → emit 事件
    - onShutdown：清理所有状态

### Phase 5：文档收尾

- [ ] 创建 `assets/scripts/framework/scene/README.md`
- [ ] 更新 `docs/module-registry.md` 状态为 ✅
- [ ] 更新 `training/progress.md`

## 验收标准

- [ ] 所有测试用例通过（≥ 10 个测试）
- [ ] Code Review ≥ 85 分
- [ ] ISceneLoader 策略注入正确（Framework 层零引擎依赖）
- [ ] 场景事件使用 EventKey<T> 类型安全
- [ ] 加载去重逻辑完备

## 面试关联

| 考点                          | 关联         |
| ----------------------------- | ------------ |
| 场景管理 vs UI 管理的职责边界 | 架构设计题   |
| 策略注入模式的第四次实践      | 设计模式题   |
| 加载去重的必要性              | 健壮性设计题 |
| 事件驱动解耦                  | 模块通信题   |

## 参考模式

- `AudioManager.ts` — IAudioPlayer 策略注入（最近完成，记忆最新）
- `ResourceManager.ts` — 加载去重 + 回调管理
- `UIManager.ts` — 生命周期管理 + 事件广播
