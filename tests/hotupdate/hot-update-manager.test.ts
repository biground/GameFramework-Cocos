import { EventManager } from '@framework/event/EventManager';
import { HotUpdateManager } from '@framework/hotupdate/HotUpdateManager';
import {
    HotUpdateState,
    HotUpdateEvents,
    IHotUpdateAdapter,
    IVersionComparator,
    ManifestInfo,
    VersionCompareResult,
    SemverComparator,
    HotUpdateStateChangeData,
    HotUpdateProgressData,
    HotUpdateErrorData,
} from '@framework/hotupdate/HotUpdateDefs';

// ─── Mock Logger ──────────────────────────────────────

jest.mock('@framework/debug/Logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// ─── 测试用 manifest 数据 ──────────────────────────────

const LOCAL_MANIFEST: ManifestInfo = {
    version: '1.0.0',
    packageUrl: 'https://cdn.example.com/assets/',
    remoteManifestUrl: 'https://cdn.example.com/manifest.json',
    remoteVersionUrl: 'https://cdn.example.com/version.json',
    assets: {
        'scripts/main.js': { md5: 'aaa111', size: 1000 },
        'images/bg.png': { md5: 'bbb222', size: 5000 },
        'data/config.json': { md5: 'ccc333', size: 200 },
    },
};

const REMOTE_MANIFEST: ManifestInfo = {
    version: '1.1.0',
    packageUrl: 'https://cdn.example.com/assets/',
    remoteManifestUrl: 'https://cdn.example.com/manifest.json',
    remoteVersionUrl: 'https://cdn.example.com/version.json',
    assets: {
        'scripts/main.js': { md5: 'aaa999', size: 1200 }, // 修改
        'images/bg.png': { md5: 'bbb222', size: 5000 }, // 未变
        'data/config.json': { md5: 'ccc333', size: 200 }, // 未变
        'scripts/new-feature.js': { md5: 'ddd444', size: 800 }, // 新增
    },
};

// ─── Mock 适配器 ──────────────────────────────────────

function createMockAdapter(overrides: Partial<IHotUpdateAdapter> = {}): IHotUpdateAdapter {
    return {
        getLocalManifest: jest.fn().mockResolvedValue(LOCAL_MANIFEST),
        fetchRemoteVersion: jest.fn().mockResolvedValue('1.1.0'),
        fetchRemoteManifest: jest.fn().mockResolvedValue(REMOTE_MANIFEST),
        downloadAsset: jest.fn().mockResolvedValue(true),
        verifyFile: jest.fn().mockResolvedValue(true),
        applyUpdate: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
        ...overrides,
    };
}

// ─── 辅助函数 ──────────────────────────────────────

function createManager(): { manager: HotUpdateManager; eventManager: EventManager } {
    const eventManager = new EventManager();
    eventManager.onInit();
    const manager = new HotUpdateManager(eventManager);
    manager.onInit();
    return { manager, eventManager };
}

/** 驱动 manager 到 VersionAvailable 状态 */
async function driveToVersionAvailable(
    manager: HotUpdateManager,
    adapter?: IHotUpdateAdapter,
): Promise<IHotUpdateAdapter> {
    const a = adapter ?? createMockAdapter();
    manager.setAdapter(a);
    await manager.checkForUpdate();
    return a;
}

/** 驱动 manager 到 ReadyToApply 状态 */
async function driveToReadyToApply(
    manager: HotUpdateManager,
    adapter?: IHotUpdateAdapter,
): Promise<IHotUpdateAdapter> {
    const a = await driveToVersionAvailable(manager, adapter);
    await manager.startUpdate();
    return a;
}

// ─── 测试 ──────────────────────────────────────

describe('HotUpdateManager', () => {
    // ── 基本属性 ──

    describe('基本属性', () => {
        it('moduleName 应为 HotUpdateManager', () => {
            const { manager } = createManager();
            expect(manager.moduleName).toBe('HotUpdateManager');
        });

        it('priority 应为 150', () => {
            const { manager } = createManager();
            expect(manager.priority).toBe(150);
        });

        it('初始状态应为 None', () => {
            const { manager } = createManager();
            expect(manager.getState()).toBe(HotUpdateState.None);
        });

        it('初始进度应全为 0', () => {
            const { manager } = createManager();
            const progress = manager.getProgress();
            expect(progress.downloadedFiles).toBe(0);
            expect(progress.totalFiles).toBe(0);
            expect(progress.percentage).toBe(0);
        });

        it('初始版本号应为 null', () => {
            const { manager } = createManager();
            expect(manager.getLocalVersion()).toBeNull();
            expect(manager.getRemoteVersion()).toBeNull();
        });
    });

    // ── 配置 ──

    describe('配置', () => {
        it('setAdapter 应正确设置适配器', () => {
            const { manager } = createManager();
            const adapter = createMockAdapter();
            manager.setAdapter(adapter);
            // 不抛异常即正确
        });

        it('setAdapter 传入空值应抛错', () => {
            const { manager } = createManager();
            expect(() => manager.setAdapter(null as never)).toThrow('adapter 不能为空');
        });

        it('setComparator 应替换版本比较器', async () => {
            const { manager } = createManager();
            const customComparator: IVersionComparator = {
                compare: () => VersionCompareResult.Same,
            };
            manager.setComparator(customComparator);

            const adapter = createMockAdapter();
            manager.setAdapter(adapter);
            const hasUpdate = await manager.checkForUpdate();
            expect(hasUpdate).toBe(false);
        });

        it('setConfig 应合并配置', () => {
            const { manager } = createManager();
            manager.setConfig({ maxRetries: 5 });
            // 内部验证：通过后续行为间接测试
        });
    });

    // ── 版本检查 ──

    describe('checkForUpdate', () => {
        it('未设置适配器时应抛错', async () => {
            const { manager } = createManager();
            await expect(manager.checkForUpdate()).rejects.toThrow('未设置适配器');
        });

        it('有新版本时应返回 true 且状态为 VersionAvailable', async () => {
            const { manager } = createManager();
            const adapter = createMockAdapter();
            manager.setAdapter(adapter);

            const result = await manager.checkForUpdate();
            expect(result).toBe(true);
            expect(manager.getState()).toBe(HotUpdateState.VersionAvailable);
        });

        it('版本相同时应返回 false 且状态为 UpToDate', async () => {
            const { manager } = createManager();
            const adapter = createMockAdapter({
                fetchRemoteVersion: jest.fn().mockResolvedValue('1.0.0'),
            });
            manager.setAdapter(adapter);

            const result = await manager.checkForUpdate();
            expect(result).toBe(false);
            expect(manager.getState()).toBe(HotUpdateState.UpToDate);
        });

        it('远程版本更旧时应返回 false', async () => {
            const { manager } = createManager();
            const adapter = createMockAdapter({
                fetchRemoteVersion: jest.fn().mockResolvedValue('0.9.0'),
            });
            manager.setAdapter(adapter);

            const result = await manager.checkForUpdate();
            expect(result).toBe(false);
            expect(manager.getState()).toBe(HotUpdateState.UpToDate);
        });

        it('本地无清单时应视为有更新', async () => {
            const { manager } = createManager();
            const adapter = createMockAdapter({
                getLocalManifest: jest.fn().mockResolvedValue(null),
            });
            manager.setAdapter(adapter);

            const result = await manager.checkForUpdate();
            expect(result).toBe(true);
            expect(manager.getState()).toBe(HotUpdateState.VersionAvailable);
        });

        it('网络错误时应返回 false 且状态为 Failed', async () => {
            const { manager } = createManager();
            const adapter = createMockAdapter({
                fetchRemoteVersion: jest.fn().mockRejectedValue(new Error('网络超时')),
            });
            manager.setAdapter(adapter);

            const result = await manager.checkForUpdate();
            expect(result).toBe(false);
            expect(manager.getState()).toBe(HotUpdateState.Failed);
        });

        it('检查时应广播 STATE_CHANGED 事件', async () => {
            const { manager, eventManager } = createManager();
            const states: HotUpdateStateChangeData[] = [];
            eventManager.on(HotUpdateEvents.STATE_CHANGED, (data) => {
                states.push(data);
            });

            const adapter = createMockAdapter();
            manager.setAdapter(adapter);
            await manager.checkForUpdate();

            expect(states.length).toBeGreaterThanOrEqual(2);
            expect(states[0].currentState).toBe(HotUpdateState.CheckingVersion);
            expect(states[1].currentState).toBe(HotUpdateState.VersionAvailable);
        });

        it('网络错误时应广播 ERROR 事件', async () => {
            const { manager, eventManager } = createManager();
            const errors: HotUpdateErrorData[] = [];
            eventManager.on(HotUpdateEvents.ERROR, (data) => {
                errors.push(data);
            });

            const adapter = createMockAdapter({
                fetchRemoteVersion: jest.fn().mockRejectedValue(new Error('connection refused')),
            });
            manager.setAdapter(adapter);
            await manager.checkForUpdate();

            expect(errors.length).toBe(1);
            expect(errors[0].retryable).toBe(true);
            expect(errors[0].state).toBe(HotUpdateState.CheckingVersion);
        });

        it('应正确记录本地和远程版本号', async () => {
            const { manager } = createManager();
            await driveToVersionAvailable(manager);

            expect(manager.getLocalVersion()).toBe('1.0.0');
            expect(manager.getRemoteVersion()).toBe('1.1.0');
        });
    });

    // ── 下载更新 ──

    describe('startUpdate', () => {
        it('未先 checkForUpdate 时应抛错', async () => {
            const { manager } = createManager();
            await expect(manager.startUpdate()).rejects.toThrow('请先调用 checkForUpdate');
        });

        it('差量下载应只下载新增和修改的文件', async () => {
            const { manager } = createManager();
            const adapter = await driveToVersionAvailable(manager);

            await manager.startUpdate();

            // 应下载 scripts/main.js（修改）和 scripts/new-feature.js（新增），共 2 个
            expect(adapter.downloadAsset).toHaveBeenCalledTimes(2);
        });

        it('下载成功后状态应为 ReadyToApply', async () => {
            const { manager } = createManager();
            await driveToVersionAvailable(manager);

            const result = await manager.startUpdate();
            expect(result).toBe(true);
            expect(manager.getState()).toBe(HotUpdateState.ReadyToApply);
        });

        it('下载失败时应重试', async () => {
            const { manager } = createManager();
            const downloadMock = jest
                .fn()
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true) // 第 3 次成功
                .mockResolvedValue(true);
            const adapter = createMockAdapter({ downloadAsset: downloadMock });
            await driveToVersionAvailable(manager, adapter);

            const result = await manager.startUpdate();
            expect(result).toBe(true);
            // 第一个文件重试了 3 次 + 第二个文件 1 次 = 4 次
            expect(downloadMock).toHaveBeenCalledTimes(4);
        });

        it('超过重试上限时应返回 false', async () => {
            const { manager } = createManager();
            const adapter = createMockAdapter({
                downloadAsset: jest.fn().mockResolvedValue(false),
            });
            await driveToVersionAvailable(manager, adapter);

            const result = await manager.startUpdate();
            expect(result).toBe(false);
            expect(manager.getState()).toBe(HotUpdateState.Failed);
        });

        it('校验失败时应返回 false', async () => {
            const { manager } = createManager();
            const adapter = createMockAdapter({
                verifyFile: jest.fn().mockResolvedValue(false),
            });
            await driveToVersionAvailable(manager, adapter);

            const result = await manager.startUpdate();
            expect(result).toBe(false);
            expect(manager.getState()).toBe(HotUpdateState.Failed);
        });

        it('应广播下载进度事件', async () => {
            const { manager, eventManager } = createManager();
            const progressEvents: HotUpdateProgressData[] = [];
            eventManager.on(HotUpdateEvents.DOWNLOAD_PROGRESS, (data) => {
                progressEvents.push(data);
            });

            await driveToVersionAvailable(manager);
            await manager.startUpdate();

            // 2 个文件应有 2 次进度事件
            expect(progressEvents.length).toBe(2);
            expect(progressEvents[1].percentage).toBe(100);
        });

        it('下载完成后进度应为 100%', async () => {
            const { manager } = createManager();
            await driveToReadyToApply(manager);

            const progress = manager.getProgress();
            expect(progress.percentage).toBe(100);
            expect(progress.downloadedFiles).toBe(progress.totalFiles);
        });
    });

    // ── 应用更新 ──

    describe('applyUpdate', () => {
        it('未先 startUpdate 时应抛错', async () => {
            const { manager } = createManager();
            await expect(manager.applyUpdate()).rejects.toThrow('请先完成下载');
        });

        it('应用成功后状态应为 Completed', async () => {
            const { manager } = createManager();
            await driveToReadyToApply(manager);

            const result = await manager.applyUpdate();
            expect(result).toBe(true);
            expect(manager.getState()).toBe(HotUpdateState.Completed);
        });

        it('应用失败时应自动回退', async () => {
            const { manager } = createManager();
            const adapter = createMockAdapter({
                applyUpdate: jest.fn().mockResolvedValue(false),
            });
            await driveToReadyToApply(manager, adapter);

            const result = await manager.applyUpdate();
            expect(result).toBe(false);
            expect(manager.getState()).toBe(HotUpdateState.Failed);
            expect(adapter.rollback).toHaveBeenCalledTimes(1);
        });

        it('应用失败时应广播 ERROR 事件', async () => {
            const { manager, eventManager } = createManager();
            const errors: HotUpdateErrorData[] = [];
            eventManager.on(HotUpdateEvents.ERROR, (data) => {
                errors.push(data);
            });

            const adapter = createMockAdapter({
                applyUpdate: jest.fn().mockResolvedValue(false),
            });
            await driveToReadyToApply(manager, adapter);
            await manager.applyUpdate();

            expect(errors.length).toBe(1);
            expect(errors[0].state).toBe(HotUpdateState.Applying);
        });
    });

    // ── 生命周期 ──

    describe('生命周期', () => {
        it('onShutdown 应重置所有状态', async () => {
            const { manager } = createManager();
            await driveToReadyToApply(manager);

            manager.onShutdown();

            expect(manager.getState()).toBe(HotUpdateState.None);
            expect(manager.getLocalVersion()).toBeNull();
            expect(manager.getRemoteVersion()).toBeNull();
            expect(manager.getProgress().percentage).toBe(0);
        });

        it('onUpdate 不应抛异常', () => {
            const { manager } = createManager();
            expect(() => manager.onUpdate(0.016)).not.toThrow();
        });
    });

    // ── SemverComparator ──

    describe('SemverComparator', () => {
        const comparator = new SemverComparator();

        it('远程更新应返回 Newer', () => {
            expect(comparator.compare('1.0.0', '1.1.0')).toBe(VersionCompareResult.Newer);
            expect(comparator.compare('1.0.0', '2.0.0')).toBe(VersionCompareResult.Newer);
            expect(comparator.compare('1.0.0', '1.0.1')).toBe(VersionCompareResult.Newer);
        });

        it('版本相同应返回 Same', () => {
            expect(comparator.compare('1.0.0', '1.0.0')).toBe(VersionCompareResult.Same);
        });

        it('远程更旧应返回 Older', () => {
            expect(comparator.compare('1.1.0', '1.0.0')).toBe(VersionCompareResult.Older);
            expect(comparator.compare('2.0.0', '1.0.0')).toBe(VersionCompareResult.Older);
        });

        it('不同长度版本号应正确比较', () => {
            expect(comparator.compare('1.0', '1.0.1')).toBe(VersionCompareResult.Newer);
            expect(comparator.compare('1.0.1', '1.0')).toBe(VersionCompareResult.Older);
        });
    });
});
