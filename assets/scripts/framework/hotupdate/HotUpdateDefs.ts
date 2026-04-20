import { EventKey } from '../event/EventDefs';

// ─── 热更新状态 ──────────────────────────────────────

/**
 * 热更新状态枚举
 * 描述热更新流程中所有可能的状态
 */
export enum HotUpdateState {
    /** 初始状态 */
    None = 'none',
    /** 正在检查版本 */
    CheckingVersion = 'checking_version',
    /** 发现新版本可用 */
    VersionAvailable = 'version_available',
    /** 已是最新版本 */
    UpToDate = 'up_to_date',
    /** 正在下载更新 */
    Downloading = 'downloading',
    /** 正在校验文件 */
    Verifying = 'verifying',
    /** 下载完成，等待应用 */
    ReadyToApply = 'ready_to_apply',
    /** 正在应用更新 */
    Applying = 'applying',
    /** 更新完成 */
    Completed = 'completed',
    /** 更新失败 */
    Failed = 'failed',
}

// ─── 版本比较 ──────────────────────────────────────

/**
 * 版本比较结果
 */
export enum VersionCompareResult {
    /** 远程版本更新 */
    Newer = 1,
    /** 版本相同 */
    Same = 0,
    /** 远程版本更旧 */
    Older = -1,
}

/**
 * 版本比较策略接口
 */
export interface IVersionComparator {
    /**
     * 比较本地版本与远程版本
     * @param localVersion 本地版本号
     * @param remoteVersion 远程版本号
     * @returns 比较结果
     */
    compare(localVersion: string, remoteVersion: string): VersionCompareResult;
}

// ─── 清单与资源 ──────────────────────────────────────

/**
 * 单个资源文件信息
 */
export interface AssetFileInfo {
    /** 文件 MD5 */
    md5: string;
    /** 文件大小（字节） */
    size: number;
}

/**
 * 资源清单信息
 */
export interface ManifestInfo {
    /** 版本号 */
    version: string;
    /** 资源包下载基础 URL */
    packageUrl: string;
    /** 远程完整清单 URL */
    remoteManifestUrl: string;
    /** 远程版本文件 URL */
    remoteVersionUrl: string;
    /** 资源文件映射：路径 → 文件信息 */
    assets: Record<string, AssetFileInfo>;
}

/**
 * 差量计算结果
 */
export interface DiffResult {
    /** 新增文件列表 */
    added: string[];
    /** 修改文件列表 */
    modified: string[];
    /** 删除文件列表 */
    deleted: string[];
    /** 需要下载的总大小（字节） */
    totalSize: number;
}

// ─── 热更新适配器 ──────────────────────────────────────

/**
 * 热更新适配器接口（Runtime 层实现）
 * Framework 层通过此接口与引擎 API 解耦
 */
export interface IHotUpdateAdapter {
    /** 获取本地 manifest */
    getLocalManifest(): Promise<ManifestInfo | null>;
    /** 下载远程版本号（轻量请求） */
    fetchRemoteVersion(url: string): Promise<string>;
    /** 下载远程完整 manifest */
    fetchRemoteManifest(url: string): Promise<ManifestInfo>;
    /** 下载单个资源文件 */
    downloadAsset(url: string, savePath: string): Promise<boolean>;
    /** 验证文件完整性 */
    verifyFile(filePath: string, expectedMd5: string): Promise<boolean>;
    /** 应用更新（替换文件） */
    applyUpdate(): Promise<boolean>;
    /** 回退到之前的版本 */
    rollback(): Promise<boolean>;
}

// ─── 事件数据 ──────────────────────────────────────

/**
 * 状态变化事件数据
 */
export interface HotUpdateStateChangeData {
    /** 变化前的状态 */
    previousState: HotUpdateState;
    /** 变化后的状态 */
    currentState: HotUpdateState;
}

/**
 * 下载进度事件数据
 */
export interface HotUpdateProgressData {
    /** 已下载文件数 */
    downloadedFiles: number;
    /** 总文件数 */
    totalFiles: number;
    /** 已下载字节数 */
    downloadedBytes: number;
    /** 总字节数 */
    totalBytes: number;
    /** 百分比（0-100） */
    percentage: number;
}

/**
 * 错误事件数据
 */
export interface HotUpdateErrorData {
    /** 发生错误时的状态 */
    state: HotUpdateState;
    /** 错误消息 */
    message: string;
    /** 是否可重试 */
    retryable: boolean;
}

// ─── 事件键 ──────────────────────────────────────

/**
 * 热更新事件键
 */
export const HotUpdateEvents = {
    /** 状态变化事件 */
    STATE_CHANGED: new EventKey<HotUpdateStateChangeData>('HotUpdate.StateChanged'),
    /** 下载进度事件 */
    DOWNLOAD_PROGRESS: new EventKey<HotUpdateProgressData>('HotUpdate.DownloadProgress'),
    /** 错误事件 */
    ERROR: new EventKey<HotUpdateErrorData>('HotUpdate.Error'),
} as const;

// ─── 配置 ──────────────────────────────────────

/**
 * 热更新配置
 */
export interface HotUpdateConfig {
    /** 远程版本文件 URL */
    remoteVersionUrl: string;
    /** 远程完整清单 URL */
    remoteManifestUrl: string;
    /** 单文件最大重试次数 */
    maxRetries: number;
    /** 并发下载数 */
    concurrentDownloads: number;
}

// ─── 默认版本比较器 ──────────────────────────────────────

/**
 * Semver 版本比较器
 * 支持标准 x.y.z 格式的版本号比较
 */
export class SemverComparator implements IVersionComparator {
    /**
     * 比较两个 semver 版本号
     * @param localVersion 本地版本号（如 "1.2.3"）
     * @param remoteVersion 远程版本号（如 "1.3.0"）
     * @returns 比较结果
     */
    public compare(localVersion: string, remoteVersion: string): VersionCompareResult {
        const localParts = localVersion.split('.').map(Number);
        const remoteParts = remoteVersion.split('.').map(Number);
        const maxLen = Math.max(localParts.length, remoteParts.length);

        for (let i = 0; i < maxLen; i++) {
            const l = localParts[i] ?? 0;
            const r = remoteParts[i] ?? 0;
            if (r > l) return VersionCompareResult.Newer;
            if (r < l) return VersionCompareResult.Older;
        }

        return VersionCompareResult.Same;
    }
}
