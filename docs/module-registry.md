# 📋 模块注册表

> **Agent 提示**：当你需要修改或创建模块时，必须先读此文件了解全局依赖关系。
> 当你完成一个模块后，必须更新此文件。

> **Demo Worktree 分离**：main 分支为纯框架仓库，Demo 业务代码已分离到独立的 git worktree 分支中（`feature/demo1-idle`、`feature/demo2-rpg`、`feature/demo3-autochess`）。框架模块开发和测试在 main 分支上进行，Demo 相关开发在对应 worktree 中进行。

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
  ├── DataTableManager（依赖 → ResourceManager）
  ├── SceneManager（依赖 → ResourceManager, EventManager）
  ├── UIManager（依赖 → ResourceManager, EventManager, ObjectPool）
  ├── EntityManager（依赖 → ResourceManager, EventManager, ObjectPool）
  ├── NetworkManager（依赖 → EventManager）
  ├── HotUpdateManager（依赖 → EventManager, Logger）
  └── LocalizationManager（依赖 → ResourceManager, EventManager）
```

## 模块摘要

| 模块            | 路径                      | 核心 API                                                                                                                                                                                                                                      | 依赖                        | 状态      |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------- |
| Core            | framework/core/           | GameEntry.registerModule() / getModule() / update() / shutdown()                                                                                                                                                                              | 无                          | ✅ 已完成 |
| Event           | framework/event/          | EventKey<T> / on() / once() / off() / offAll() / offByCaller() / emit()                                                                                                                                                                       | 无                          | ✅ 已完成 |
| ObjectPool      | framework/objectpool/     | acquire\<T\>() / release() / clearPool() / clearAll() / getStats() / setMaxSize()                                                                                                                                                             | 无                          | ✅ 已完成 |
| DI/IoC          | framework/di/             | @Injectable / @Inject / Container.resolve()                                                                                                                                                                                                   | 无                          | ✅ 已完成 |
| FSM             | framework/fsm/            | createFsm\<T, TBlackboard\>() / destroyFsm() / getFsm() / hasFsm() / IFsm.changeState() / IFsm.start() / IFsm.blackboard / IFsm.setBlackboard()                                                                                              | 无                          | ✅ 已完成 |
| Procedure       | framework/procedure/      | initialize() / startProcedure() / hasProcedure() / currentProcedure / changeProcedure() / getContext\<T\>(fsm, key)                                                                                                                             | FSM                         | ✅ 已完成 |
| Resource        | framework/resource/       | setResourceLoader() / loadAsset() / releaseAsset() / releaseByOwner() / preload() / hasAsset() / getAssetRefCount() / getAssetInfo()                                                                                                          | Event, ObjectPool           | ✅ 已完成 |
| UI              | framework/ui/             | setUIFormFactory() / registerForm() / openForm() / closeForm() / closeAllForms() / getForm() / hasForm()                                                                                                                                      | Resource, Event, ObjectPool | ✅ 已完成 |
| Entity          | framework/entity/         | showEntity() / hideEntity() / getEntity()                                                                                                                                                                                                     | Resource, Event, ObjectPool | ⬜ 待开发 |
| Network         | framework/network/        | createChannel() / destroyChannel() / getChannel() / setHeartbeatHandler() / setEventManager() / Channel: connect() / send() / close()                                                                                                         | Event                       | ✅ 已完成 |
| Audio           | framework/audio/          | setAudioPlayer() / playMusic() / stopMusic() / pauseMusic() / resumeMusic() / playSound() / stopSound() / stopAllSounds() / set/getMasterVolume() / set/getMusicVolume() / set/getSoundVolume() / setMuted() / isMuted()                      | Resource                    | ✅ 已完成 |
| Scene           | framework/scene/          | setSceneLoader() / loadScene() / currentScene / isLoading                                                                                                                                                                                     | Event（@todo 事件广播）     | ✅ 已完成 |
| HotUpdate       | framework/hotupdate/      | setAdapter() / setComparator() / setConfig() / checkForUpdate() / startUpdate() / applyUpdate() / getState() / getProgress() / getLocalVersion() / getRemoteVersion()                                                                        | Event, Logger               | ✅ 已完成 |
| Timer           | framework/timer/          | addTimer() / removeTimer() / removeAllTimers() / removeTimersByTag() / pauseTimer() / resumeTimer() / pauseAllTimers() / resumeAllTimers() / pauseTimersByTag() / resumeTimersByTag() / getTimerInfo() / hasTimer() / timeScale / activeCount | 无                          | ✅ 已完成 |
| fbi-timer-heap  | packages/fbi-timer-heap/  | HeapTimerManager（ITimerManager 实现），MinHeap 数据结构；绝对到期时间 expireTime，无触发帧 O(1)，触发 O(k log n）                                                                                                                            | @fbi/core（peerDep）        | ✅ 已完成 |
| fbi-timer-wheel | packages/fbi-timer-wheel/ | WheelTimerManager（ITimerManager 实现）；slot 数组 + tick 前进 + 多圈 remainingRounds，添加/触发 O(1)                                                                                                                                         | @fbi/core（peerDep）        | ✅ 已完成 |
| Data            | framework/data/           | loadTable\<T\>() / getRow() / getAllRows()                                                                                                                                                                                                    | Resource                    | ⬜ 待开发 |
| i18n            | framework/i18n/           | t() / setLanguage() / getLanguage()                                                                                                                                                                                                           | Resource, Event             | ✅ 已完成 |
| Debug           | framework/debug/          | Logger.info() / warn() / error() / DebugManager: registerDataSource() / unregisterDataSource() / collectAll() / getLastSnapshot() / getSnapshot() / setConfig() / getDataSource() | Logger; DataSource 可选依赖 GameModule, EventManager | ✅ 已完成 |

## Runtime 适配层

main 分支**不包含** runtime 实现，仅定义 framework 层策略接口（`IResourceLoader` / `ISceneLoader` / `IUIFormFactory` 等）。具体 runtime 实现按引擎/版本拆分到独立 git worktree 分支：

| 分支                    | 适配目标             | worktree 路径建议           | 详细文档                                              |
| ----------------------- | -------------------- | --------------------------- | ----------------------------------------------------- |
| `feature/runtime-cc385` | Cocos Creator 3.8.5  | `.worktrees/runtime-cc385`  | 该分支 `assets/scripts/runtime/cc-385/README.md`      |

**协作模式**：

- runtime 分支以 main 为 upstream
- 框架接口变更后，runtime 分支通过 `git merge main` 同步
- 新增 runtime（如 CC 3.9 / Laya）只需新建 `feature/runtime-*` 分支，main 与现有 runtime 分支无需改动

## 模块间通信规则

1. 模块间 **禁止直接 import 其他模块的实现类**
2. 通过 `GameEntry.getModule<T>()` 获取模块引用
3. 跨模块事件通过 `EventManager` 传递
4. 模块初始化顺序由 `priority` 控制，被依赖方的 priority 必须小于依赖方
5. 所有模块必须继承 `ModuleBase`

## Priority 分配规范

| 优先级范围 | 模块类型 | 说明                                                    |
| ---------- | -------- | ------------------------------------------------------- |
| 0 - 99     | 基础设施 | Logger, EventManager, TimerManager, ObjectPool          |
| 100 - 199  | 核心服务 | ResourceManager, NetworkManager, FSM                    |
| 200 - 299  | 业务框架 | UIManager, EntityManager, AudioManager, SceneManager    |
| 300 - 399  | 上层逻辑 | ProcedureManager, DataTableManager, LocalizationManager |
| 400+       | 调试工具 | DebugPanel                                              |

## 变更日志

| 日期       | 变更内容                                                                                                                                                        | 操作人 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-03-23 | 初始化模块注册表                                                                                                                                                | 系统   |
| 2026-03-30 | Event 模块完成，含 EventKey<T> 类型安全事件系统                                                                                                                 | 大圆   |
| 2026-04-10 | Network 模块完成（NetworkDefs + NetworkChannel + NetworkManager），41 个测试全绿                                                                                | 大圆   |
| 2026-03-31 | ObjectPool + ReferencePool 完成（91/100），插件化架构方案确定                                                                                                   | 大圆   |
| 2026-04-03 | DI Container 核心实现完成（10 个测试通过），装饰器待实现；更新模块状态                                                                                          | 大圆   |
| 2026-04-03 | DI 装饰器实现 + Container 自动注入集成（95/100），30 个测试全绿                                                                                                 | 大圆   |
| 2026-04-04 | FSM 模块完成（FsmDefs + FsmState + Fsm + FsmManager），52 个测试全绿                                                                                            | 大圆   |
| 2026-04-07 | Procedure 模块完成（ProcedureBase + ProcedureManager），13 个测试全绿，94/100                                                                                   | 大圆   |
| 2026-04-07 | Resource 模块完成（ResourceDefs + IResourceManager + ResourceManager），26 个测试全绿                                                                           | 大圆   |
| 2026-04-08 | UI 模块完成（UIDefs + UIFormBase + IUIManager + UIManager），31 个测试全绿                                                                                      | 大圆   |
| 2026-04-13 | Audio 模块完成（AudioDefs + IAudioManager + AudioManager），三级音量乘法链 + IAudioPlayer 策略注入，27 个测试全绿，Review 88 分                                 | 大圆   |
| 2026-04-14 | Scene 模块完成（SceneDefs + ISceneManager + SceneManager），三层加载去重 + ISceneLoader 策略注入，15 个测试全绿，Review 90 分，Phase 2 完成                     | 大圆   |
| 2026-04-15 | Logger 模块完成（LoggerDefs + Logger），静态 API + ModuleBase 混合方案，priority=0，19 个测试全绿，Review 92 分                                                 | 大圆   |
| 2026-04-16 | Timer 模块完成（TimerDefs + ITimerManager + TimerManager），mark-delete 遍历安全 + 溢出精度保留 + timeScale + tag 批量操作，35 个测试全绿，Review 88 分         | 大圆   |
| 2026-04-16 | fbi-timer-heap 插件完成（MinHeap + HeapTimerManager），绝对到期时间 + 堆索引 O(1) 定位 + pause 分离列表，47 个测试全绿                                          | 大圆   |
| 2026-04-16 | fbi-timer-wheel 插件完成（WheelTimerManager），slot 数组 + advance-first tick + 整数 tick 计数 + 多圈 remainingRounds + epsilon 浮点修正，39 个测试全绿         | 大圆   |
| 2026-04-16 | DataTable 模块完成（DataTableDefs + DataTable\<T\> + DataTableManager），双存储模式（Map/Array）+ IDataTableParser 策略注入 + indexMap O(1) 查询，41 个测试全绿 | 大圆   |
| 2026-04-20 | DebugPanel 模块完成（DebugDefs + DebugManager + ModuleDataSource + EventDataSource），DataSource 插件化采集 + 分层采集频率 + 容错隔离 + 快照缓存，69+ 测试全绿 | 大圆   |
| 2026-04-17 | i18n 模块完成（I18nDefs + I18nManager），多语言资源加载 + 动态语言切换 + 占位符替换 + 事件广播，测试全绿                                                        | 大圆   |
| 2026-04-20 | HotUpdate 模块完成（HotUpdateDefs + HotUpdateManager + IHotUpdateManager + SemverComparator），两阶段检查 + 差量下载 + MD5 校验 + 回退机制 + Push/Pull 混合通知，36 个测试全绿 | 大圆   |
