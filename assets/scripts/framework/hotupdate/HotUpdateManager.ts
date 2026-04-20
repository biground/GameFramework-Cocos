import { ModuleBase } from '../core/ModuleBase';
import { EventManager } from '../event/EventManager';
import { Logger } from '../debug/Logger';
import { IHotUpdateManager } from '../interfaces/IHotUpdateManager';
import {
    HotUpdateState,
    HotUpdateEvents,
    HotUpdateProgressData,
    HotUpdateConfig,
    IHotUpdateAdapter,
    IVersionComparator,
    SemverComparator,
    ManifestInfo,
    DiffResult,
    VersionCompareResult,
} from './HotUpdateDefs';

/**
 * 热更新管理器
 * 管理游戏资源的版本检查、差量下载、校验和应用
 *
 * 设计要点：
 * - Framework 层纯 TS 实现，通过 IHotUpdateAdapter 与引擎 API 解耦
 * - 状态机驱动流程，每次状态变化通过 EventManager 广播
 * - 差量下载：只下载新增和修改的文件
 * - 支持失败重试和回退机制
 */
export class HotUpdateManager extends ModuleBase implements IHotUpdateManager {
    private static readonly TAG = 'HotUpdateManager';

    /** 当前状态 */
    private _state: HotUpdateState = HotUpdateState.None;
    /** 热更新适配器 */
    private _adapter: IHotUpdateAdapter | null = null;
    /** 版本比较器 */
    private _comparator: IVersionComparator = new SemverComparator();
    /** 配置 */
    private _config: HotUpdateConfig = {
        remoteVersionUrl: '',
        remoteManifestUrl: '',
        maxRetries: 3,
        concurrentDownloads: 4,
    };
    /** 下载进度 */
    private _progress: HotUpdateProgressData = {
        downloadedFiles: 0,
        totalFiles: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        percentage: 0,
    };
    /** 本地清单 */
    private _localManifest: ManifestInfo | null = null;
    /** 远程清单 */
    private _remoteManifest: ManifestInfo | null = null;
    /** 事件管理器引用 */
    private readonly _eventManager: EventManager;

    constructor(eventManager: EventManager) {
        super();
        this._eventManager = eventManager;
    }

    /** 模块名称 */
    public get moduleName(): string {
        return 'HotUpdateManager';
    }

    /** 模块优先级（核心服务层，在 ResourceManager 之后） */
    public get priority(): number {
        return 150;
    }

    // ─── 生命周期 ──────────────────────────────────────

    /** 模块初始化 */
    public onInit(): void {
        this._state = HotUpdateState.None;
        this._resetProgress();
        this._localManifest = null;
        this._remoteManifest = null;
        Logger.info(HotUpdateManager.TAG, '热更新管理器初始化');
    }

    /** 每帧更新（热更新不需要每帧逻辑） */
    public onUpdate(_deltaTime: number): void {
        /* 热更新不需要每帧更新 */
    }

    /** 模块销毁 */
    public onShutdown(): void {
        Logger.info(HotUpdateManager.TAG, '热更新管理器关闭');
        this._state = HotUpdateState.None;
        this._adapter = null;
        this._localManifest = null;
        this._remoteManifest = null;
        this._resetProgress();
    }

    // ─── 配置 ──────────────────────────────────────

    /**
     * 设置热更新适配器
     * @param adapter 适配器实现
     */
    public setAdapter(adapter: IHotUpdateAdapter): void {
        if (!adapter) {
            Logger.error(HotUpdateManager.TAG, 'adapter 不能为空');
            throw new Error('[HotUpdateManager] adapter 不能为空');
        }
        this._adapter = adapter;
    }

    /**
     * 设置版本比较策略
     * @param comparator 版本比较器
     */
    public setComparator(comparator: IVersionComparator): void {
        this._comparator = comparator;
    }

    /**
     * 设置热更新配置（支持部分更新）
     * @param config 配置项
     */
    public setConfig(config: Partial<HotUpdateConfig>): void {
        Object.assign(this._config, config);
    }

    // ─── 核心流程 ──────────────────────────────────────

    /**
     * 检查是否有可用更新
     * 流程：获取本地清单 → 获取远程版本 → 比较版本 → 按需获取远程清单
     * @returns 是否有新版本
     */
    public async checkForUpdate(): Promise<boolean> {
        if (!this._adapter) {
            throw new Error('[HotUpdateManager] 未设置适配器，请先调用 setAdapter');
        }

        this._setState(HotUpdateState.CheckingVersion);

        try {
            // 获取本地清单
            this._localManifest = await this._adapter.getLocalManifest();
            const localVersion = this._localManifest?.version ?? '';

            // 获取远程版本
            const versionUrl =
                this._config.remoteVersionUrl || this._localManifest?.remoteVersionUrl || '';
            const remoteVersion = await this._adapter.fetchRemoteVersion(versionUrl);

            // 本地无清单时视为有更新
            if (!this._localManifest) {
                const manifestUrl = this._config.remoteManifestUrl || '';
                this._remoteManifest = await this._adapter.fetchRemoteManifest(manifestUrl);
                this._setState(HotUpdateState.VersionAvailable);
                return true;
            }

            // 版本比较
            const compareResult = this._comparator.compare(localVersion, remoteVersion);

            if (compareResult === VersionCompareResult.Newer) {
                // 有新版本，获取远程完整清单
                const manifestUrl =
                    this._config.remoteManifestUrl || this._localManifest.remoteManifestUrl;
                this._remoteManifest = await this._adapter.fetchRemoteManifest(manifestUrl);
                this._setState(HotUpdateState.VersionAvailable);
                return true;
            }

            // 已是最新或远程更旧
            this._setState(HotUpdateState.UpToDate);
            return false;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            Logger.error(HotUpdateManager.TAG, `版本检查失败: ${message}`);
            this._setState(HotUpdateState.Failed);
            this._emitError(HotUpdateState.CheckingVersion, message, true);
            return false;
        }
    }

    /**
     * 开始下载更新
     * 前置条件：checkForUpdate 已返回 true（状态为 VersionAvailable）
     * 流程：计算差量 → 下载文件 → 校验文件
     * @returns 下载和校验是否成功
     */
    public async startUpdate(): Promise<boolean> {
        if (this._state !== HotUpdateState.VersionAvailable) {
            throw new Error('[HotUpdateManager] 请先调用 checkForUpdate 并确认有可用更新');
        }

        if (!this._adapter || !this._remoteManifest) {
            throw new Error('[HotUpdateManager] 内部状态异常：缺少适配器或远程清单');
        }

        // 计算差量
        const diff = this._calculateDiff(this._localManifest, this._remoteManifest);

        // 下载阶段
        this._setState(HotUpdateState.Downloading);
        const downloadSuccess = await this._downloadFiles(diff);

        if (!downloadSuccess) {
            this._setState(HotUpdateState.Failed);
            this._emitError(
                HotUpdateState.Downloading,
                '下载失败：部分文件超过最大重试次数',
                false,
            );
            return false;
        }

        // 校验阶段
        this._setState(HotUpdateState.Verifying);
        const verifySuccess = await this._verifyFiles(diff);

        if (!verifySuccess) {
            this._setState(HotUpdateState.Failed);
            this._emitError(HotUpdateState.Verifying, '校验失败：文件完整性验证不通过', false);
            return false;
        }

        this._setState(HotUpdateState.ReadyToApply);
        return true;
    }

    /**
     * 应用已下载的更新
     * 前置条件：startUpdate 已成功（状态为 ReadyToApply）
     * @returns 应用是否成功
     */
    public async applyUpdate(): Promise<boolean> {
        if (this._state !== HotUpdateState.ReadyToApply) {
            throw new Error('[HotUpdateManager] 请先完成下载（状态应为 ReadyToApply）');
        }

        if (!this._adapter) {
            throw new Error('[HotUpdateManager] 内部状态异常：缺少适配器');
        }

        this._setState(HotUpdateState.Applying);

        const success = await this._adapter.applyUpdate();

        if (success) {
            this._setState(HotUpdateState.Completed);
            Logger.info(HotUpdateManager.TAG, '热更新应用成功');
            return true;
        }

        // 应用失败，尝试回退
        Logger.error(HotUpdateManager.TAG, '热更新应用失败，尝试回退');
        await this._adapter.rollback();
        this._setState(HotUpdateState.Failed);
        this._emitError(HotUpdateState.Applying, '应用更新失败，已回退', false);
        return false;
    }

    // ─── 查询 ──────────────────────────────────────

    /**
     * 获取当前热更新状态
     */
    public getState(): HotUpdateState {
        return this._state;
    }

    /**
     * 获取下载进度
     */
    public getProgress(): HotUpdateProgressData {
        return { ...this._progress };
    }

    /**
     * 获取本地版本号
     */
    public getLocalVersion(): string | null {
        return this._localManifest?.version ?? null;
    }

    /**
     * 获取远程版本号
     */
    public getRemoteVersion(): string | null {
        return this._remoteManifest?.version ?? null;
    }

    // ─── 内部方法 ──────────────────────────────────────

    /**
     * 切换状态并广播事件
     * @param newState 新状态
     */
    private _setState(newState: HotUpdateState): void {
        const previousState = this._state;
        this._state = newState;
        Logger.debug(HotUpdateManager.TAG, `状态变化: ${previousState} → ${newState}`);
        this._eventManager.emit(HotUpdateEvents.STATE_CHANGED, {
            previousState,
            currentState: newState,
        });
    }

    /**
     * 计算本地与远程清单的差量
     * @param local 本地清单（可能为 null）
     * @param remote 远程清单
     * @returns 差量结果
     */
    private _calculateDiff(local: ManifestInfo | null, remote: ManifestInfo): DiffResult {
        const added: string[] = [];
        const modified: string[] = [];
        const deleted: string[] = [];
        let totalSize = 0;

        const localAssets = local?.assets ?? {};

        // 遍历远程清单，找出新增和修改
        for (const [path, remoteInfo] of Object.entries(remote.assets)) {
            const localInfo = localAssets[path];
            if (!localInfo) {
                added.push(path);
                totalSize += remoteInfo.size;
            } else if (localInfo.md5 !== remoteInfo.md5) {
                modified.push(path);
                totalSize += remoteInfo.size;
            }
        }

        // 遍历本地清单，找出已删除
        for (const path of Object.keys(localAssets)) {
            if (!remote.assets[path]) {
                deleted.push(path);
            }
        }

        Logger.info(
            HotUpdateManager.TAG,
            `差量计算: 新增=${added.length}, 修改=${modified.length}, 删除=${deleted.length}, 总大小=${totalSize}`,
        );

        return { added, modified, deleted, totalSize };
    }

    /**
     * 下载差量文件（带重试）
     * @param diff 差量结果
     * @returns 是否全部成功
     */
    private async _downloadFiles(diff: DiffResult): Promise<boolean> {
        const filesToDownload = [...diff.added, ...diff.modified];
        const totalFiles = filesToDownload.length;

        if (totalFiles === 0) {
            this._updateProgress(0, 0, 0, 0);
            return true;
        }

        const totalBytes = diff.totalSize;
        let downloadedFiles = 0;
        let downloadedBytes = 0;

        const packageUrl = this._remoteManifest!.packageUrl;

        for (const filePath of filesToDownload) {
            const fileInfo = this._remoteManifest!.assets[filePath];
            const url = packageUrl + filePath;
            let success = false;

            for (let retry = 0; retry < this._config.maxRetries; retry++) {
                success = await this._adapter!.downloadAsset(url, filePath);
                if (success) break;
                Logger.warn(
                    HotUpdateManager.TAG,
                    `下载重试 ${retry + 1}/${this._config.maxRetries}: ${filePath}`,
                );
            }

            if (!success) {
                Logger.error(HotUpdateManager.TAG, `下载失败（超过重试上限）: ${filePath}`);
                return false;
            }

            downloadedFiles++;
            downloadedBytes += fileInfo.size;
            this._updateProgress(downloadedFiles, totalFiles, downloadedBytes, totalBytes);
        }

        return true;
    }

    /**
     * 校验已下载的文件
     * @param diff 差量结果
     * @returns 是否全部校验通过
     */
    private async _verifyFiles(diff: DiffResult): Promise<boolean> {
        const filesToVerify = [...diff.added, ...diff.modified];

        for (const filePath of filesToVerify) {
            const expectedMd5 = this._remoteManifest!.assets[filePath].md5;
            const valid = await this._adapter!.verifyFile(filePath, expectedMd5);
            if (!valid) {
                Logger.error(HotUpdateManager.TAG, `文件校验失败: ${filePath}`);
                return false;
            }
        }

        return true;
    }

    /**
     * 更新进度并广播事件
     */
    private _updateProgress(
        downloadedFiles: number,
        totalFiles: number,
        downloadedBytes: number,
        totalBytes: number,
    ): void {
        this._progress = {
            downloadedFiles,
            totalFiles,
            downloadedBytes,
            totalBytes,
            percentage: totalFiles > 0 ? Math.round((downloadedFiles / totalFiles) * 100) : 0,
        };
        this._eventManager.emit(HotUpdateEvents.DOWNLOAD_PROGRESS, { ...this._progress });
    }

    /**
     * 广播错误事件
     */
    private _emitError(state: HotUpdateState, message: string, retryable: boolean): void {
        this._eventManager.emit(HotUpdateEvents.ERROR, { state, message, retryable });
    }

    /**
     * 重置进度
     */
    private _resetProgress(): void {
        this._progress = {
            downloadedFiles: 0,
            totalFiles: 0,
            downloadedBytes: 0,
            totalBytes: 0,
            percentage: 0,
        };
    }
}
