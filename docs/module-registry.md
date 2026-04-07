# 📋 模块注册表

> **Agent 提示**：当你需要修改或创建模块时，必须先读此文件了解全局依赖关系。
> 当你完成一个模块后，必须更新此文件。

## 模块依赖关系图

```
GameEntry（框架入口）
  ├── EventManager（无依赖）
  ├── ObjectPool（无依赖）
  ├── TimerManager（无依赖）
  ├── Logger（无依赖，其他所有模块可选依赖它）
  ├── FSM（依赖 → EventManager）
  ├── ProcedureManager（依赖 → FSM）
  ├── ResourceManager（依赖 → EventManager, ObjectPool）
  ├── AudioManager（依赖 → ResourceManager）
  ├── DataManager（依赖 → ResourceManager）
  ├── SceneManager（依赖 → ResourceManager, EventManager）
  ├── UIManager（依赖 → ResourceManager, EventManager, ObjectPool）
  ├── EntityManager（依赖 → ResourceManager, EventManager, ObjectPool）
  ├── NetworkManager（依赖 → EventManager）
  └── LocalizationManager（依赖 → ResourceManager, EventManager）
```

## 模块摘要

| 模块       | 路径                  | 核心 API                                                                                                                             | 依赖                        | 状态      |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | --------- |
| Core       | framework/core/       | GameEntry.registerModule() / getModule() / update() / shutdown()                                                                     | 无                          | ✅ 已完成 |
| Event      | framework/event/      | EventKey<T> / on() / once() / off() / offAll() / offByCaller() / emit()                                                              | 无                          | ✅ 已完成 |
| ObjectPool | framework/objectpool/ | acquire\<T\>() / release() / clearPool() / clearAll() / getStats() / setMaxSize()                                                    | 无                          | ✅ 已完成 |
| DI/IoC     | framework/di/         | @Injectable / @Inject / Container.resolve()                                                                                          | 无                          | ✅ 已完成 |
| FSM        | framework/fsm/        | createFsm\<T\>() / destroyFsm() / getFsm() / hasFsm() / IFsm.changeState() / IFsm.start()                                            | 无                          | ✅ 已完成 |
| Procedure  | framework/procedure/  | initialize() / startProcedure() / hasProcedure() / currentProcedure / changeProcedure()                                              | FSM                         | ✅ 已完成 |
| Resource   | framework/resource/   | setResourceLoader() / loadAsset() / releaseAsset() / releaseByOwner() / preload() / hasAsset() / getAssetRefCount() / getAssetInfo() | Event, ObjectPool           | ✅ 已完成 |
| UI         | framework/ui/         | openUI() / closeUI() / getUI()                                                                                                       | Resource, Event, ObjectPool | ⬜ 待开发 |
| Entity     | framework/entity/     | showEntity() / hideEntity() / getEntity()                                                                                            | Resource, Event, ObjectPool | ⬜ 待开发 |
| Network    | framework/network/    | connect() / send() / close()                                                                                                         | Event                       | ⬜ 待开发 |
| Audio      | framework/audio/      | playMusic() / playSound() / stop()                                                                                                   | Resource                    | ⬜ 待开发 |
| Scene      | framework/scene/      | loadScene() / unloadScene()                                                                                                          | Resource, Event             | ⬜ 待开发 |
| Timer      | framework/timer/      | addTimer() / removeTimer() / pause()                                                                                                 | 无                          | ⬜ 待开发 |
| Data       | framework/data/       | loadTable\<T\>() / getRow() / getAllRows()                                                                                           | Resource                    | ⬜ 待开发 |
| i18n       | framework/i18n/       | t() / setLanguage() / getLanguage()                                                                                                  | Resource, Event             | ⬜ 待开发 |
| Debug      | framework/debug/      | Logger.info() / warn() / error() / DebugPanel                                                                                        | 无                          | ⬜ 待开发 |

## 模块间通信规则

1. 模块间 **禁止直接 import 其他模块的实现类**
2. 通过 `GameEntry.getModule<T>()` 获取模块引用
3. 跨模块事件通过 `EventManager` 传递
4. 模块初始化顺序由 `priority` 控制，被依赖方的 priority 必须小于依赖方
5. 所有模块必须继承 `ModuleBase`

## Priority 分配规范

| 优先级范围 | 模块类型 | 说明                                                 |
| ---------- | -------- | ---------------------------------------------------- |
| 0 - 99     | 基础设施 | Logger, EventManager, TimerManager, ObjectPool       |
| 100 - 199  | 核心服务 | ResourceManager, NetworkManager, FSM                 |
| 200 - 299  | 业务框架 | UIManager, EntityManager, AudioManager, SceneManager |
| 300 - 399  | 上层逻辑 | ProcedureManager, DataManager, LocalizationManager   |
| 400+       | 调试工具 | DebugPanel                                           |

## 变更日志

| 日期       | 变更内容                                                                              | 操作人 |
| ---------- | ------------------------------------------------------------------------------------- | ------ |
| 2026-03-23 | 初始化模块注册表                                                                      | 系统   |
| 2026-03-30 | Event 模块完成，含 EventKey<T> 类型安全事件系统                                       | 大圆   |
| 2026-03-31 | ObjectPool + ReferencePool 完成（91/100），插件化架构方案确定                         | 大圆   |
| 2026-04-03 | DI Container 核心实现完成（10 个测试通过），装饰器待实现；更新模块状态                | 大圆   |
| 2026-04-03 | DI 装饰器实现 + Container 自动注入集成（95/100），30 个测试全绿                       | 大圆   |
| 2026-04-04 | FSM 模块完成（FsmDefs + FsmState + Fsm + FsmManager），52 个测试全绿                  | 大圆   |
| 2026-04-07 | Procedure 模块完成（ProcedureBase + ProcedureManager），13 个测试全绿，94/100         | 大圆   |
| 2026-04-07 | Resource 模块完成（ResourceDefs + IResourceManager + ResourceManager），26 个测试全绿 | 大圆   |
