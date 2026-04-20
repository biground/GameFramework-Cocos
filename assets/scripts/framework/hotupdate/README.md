# HotUpdateManager（热更新管理器）

## 职责

管理游戏资源的热更新流程，包括版本检查、差量计算、文件下载、完整性校验和更新应用。**不负责**具体的文件 I/O 和网络请求（通过 `IHotUpdateAdapter` 委托给 Runtime 层）。

## 快速使用

```typescript
import { HotUpdateManager } from '@framework/hotupdate/HotUpdateManager';
import { HotUpdateEvents, HotUpdateState } from '@framework/hotupdate/HotUpdateDefs';

// 1. 获取模块引用
const hotUpdate = GameEntry.getModule<HotUpdateManager>(HotUpdateManager);

// 2. 注入 Runtime 层适配器
hotUpdate.setAdapter(new CocosHotUpdateAdapter());

// 3. 配置
hotUpdate.setConfig({
    remoteVersionUrl: 'https://cdn.example.com/version.json',
    remoteManifestUrl: 'https://cdn.example.com/manifest.json',
    maxRetries: 3,
    concurrentDownloads: 4,
});

// 4. 监听事件（Push 模式）
eventManager.on(HotUpdateEvents.STATE_CHANGED, (data) => {
    console.log('状态: ' + data.previousState + ' → ' + data.currentState);
});

// 5. 执行更新流程
const hasUpdate = await hotUpdate.checkForUpdate();
if (hasUpdate) {
    const downloaded = await hotUpdate.startUpdate();
    if (downloaded) {
        await hotUpdate.applyUpdate();
    }
}
```

## 对外 API

```typescript
// 配置
setAdapter(adapter: IHotUpdateAdapter): void;
setComparator(comparator: IVersionComparator): void;
setConfig(config: Partial<HotUpdateConfig>): void;

// 核心流程
checkForUpdate(): Promise<boolean>;
startUpdate(): Promise<boolean>;
applyUpdate(): Promise<boolean>;

// 查询（Pull 模式）
getState(): HotUpdateState;
getProgress(): HotUpdateProgressData;
getLocalVersion(): string | null;
getRemoteVersion(): string | null;
```

## 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 引擎解耦 | IHotUpdateAdapter 策略注入 | Framework 层禁止依赖 cc，由 Runtime 层实现 |
| 版本比较 | IVersionComparator 策略注入 | 默认 SemverComparator，可替换 |
| 差量下载 | MD5 对比计算 diff | 只下载新增+修改文件 |
| 状态管理 | 枚举状态机 | 10 种状态覆盖完整生命周期 |
| 通知模式 | Push 事件 + Pull getter 混合 | 事件驱动实时推送 + getter 主动查询 |
| 失败处理 | 重试 + 回退 | 下载 maxRetries 重试，应用失败自动 rollback |

## 状态机流转

```
None → CheckingVersion → VersionAvailable → Downloading → Verifying → ReadyToApply → Applying → Completed
                   ↓                             ↓            ↓              ↓
              UpToDate                         Failed        Failed         Failed (→ rollback)
```

## 依赖
- EventManager：状态变化和进度事件广播
- Logger：日志输出

## 被谁依赖
- 业务层（Game 层）通过 IHotUpdateManager 接口使用

## 已知限制
- concurrentDownloads 已预留但未实现并发下载
- 未实现断点续传
- Runtime 层适配器尚未实现

## 关联测试
- 测试文件路径：`tests/hotupdate/hot-update-manager.test.ts`
- 测试数量：36 个
