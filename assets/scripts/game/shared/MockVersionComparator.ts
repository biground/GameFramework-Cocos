import { IVersionComparator, VersionCompareResult } from '@framework/hotupdate/HotUpdateDefs';
import { Logger } from '@framework/debug/Logger';

/** 调用记录 */
interface CompareCall {
    /** 本地版本号 */
    local: string;
    /** 远程版本号 */
    remote: string;
    /** 比较结果 */
    result: VersionCompareResult;
}

/**
 * 模拟版本比较器
 * 用于 Demo 和测试环境的版本号比较模拟
 *
 * @description
 * 实现 IVersionComparator 接口，提供语义化版本号比较功能。
 * 支持标准 x.y.z 格式的版本号比较，并支持可编程结果覆盖、
 * 调用追踪和错误模拟，便于单元测试和 Demo 演示。
 */
export class MockVersionComparator implements IVersionComparator {
    private static readonly TAG = 'MockVersionComparator';

    /** 强制返回的结果（null 表示使用正常比较逻辑） */
    private _forcedResult: VersionCompareResult | null = null;

    /** 自定义版本对结果映射，key 格式为 "local|remote" */
    private _versionMap: Map<string, VersionCompareResult> = new Map();

    /** 下一次 compare 调用要抛出的错误（null 表示不抛出） */
    private _errorOnCompare: Error | null = null;

    /** 所有 compare 调用的记录 */
    private _compareCalls: CompareCall[] = [];

    // Constructor
    constructor() {
        Logger.debug(MockVersionComparator.TAG, 'MockVersionComparator 已创建');
    }

    /**
     * 获取所有比较调用记录
     * @returns 调用记录数组（只读）
     */
    public get compareCalls(): ReadonlyArray<CompareCall> {
        return this._compareCalls;
    }

    /**
     * 设置强制返回结果
     * @param result 强制返回的比较结果，null 表示取消强制结果
     */
    public setForcedResult(result: VersionCompareResult | null): void {
        this._forcedResult = result;
        Logger.debug(MockVersionComparator.TAG, `设置强制结果: ${result ?? 'null'}`);
    }

    /**
     * 设置自定义版本对结果映射
     * @param map 版本对到结果的映射，key 格式为 "local|remote"
     */
    public setVersionMap(map: Map<string, VersionCompareResult>): void {
        this._versionMap = map;
        Logger.debug(MockVersionComparator.TAG, `设置版本映射，共 ${map.size} 条记录`);
    }

    /**
     * 设置下一次比较调用要抛出的错误
     * @param error 要抛出的错误对象，null 表示取消错误
     */
    public setErrorOnCompare(error: Error | null): void {
        this._errorOnCompare = error;
        Logger.debug(MockVersionComparator.TAG, `设置比较错误: ${error?.message ?? 'null'}`);
    }

    /**
     * 比较本地版本与远程版本
     * @param localVersion 本地版本号
     * @param remoteVersion 远程版本号
     * @returns 比较结果
     */
    public compare(localVersion: string, remoteVersion: string): VersionCompareResult {
        // 检查是否需要抛出错误
        if (this._errorOnCompare !== null) {
            const error = this._errorOnCompare;
            this._errorOnCompare = null;
            Logger.error(MockVersionComparator.TAG, `比较时抛出错误: ${error.message}`);
            throw error;
        }

        let result: VersionCompareResult;

        // 1. 检查强制结果
        if (this._forcedResult !== null) {
            result = this._forcedResult;
            Logger.debug(MockVersionComparator.TAG, `使用强制结果: ${result}`);
        } else {
            // 2. 检查版本映射
            const mapKey = `${localVersion}|${remoteVersion}`;
            const mappedResult = this._versionMap.get(mapKey);
            if (mappedResult !== undefined) {
                result = mappedResult;
                Logger.debug(MockVersionComparator.TAG, `使用映射结果: ${result}`);
            } else {
                // 3. 执行标准 semver 比较
                result = this.compareSemver(localVersion, remoteVersion);
            }
        }

        // 记录调用
        this._compareCalls.push({ local: localVersion, remote: remoteVersion, result });

        return result;
    }

    /**
     * 执行语义化版本号比较
     * @param localVersion 本地版本号
     * @param remoteVersion 远程版本号
     * @returns 比较结果
     */
    private compareSemver(localVersion: string, remoteVersion: string): VersionCompareResult {
        const localParts = this.parseVersion(localVersion);
        const remoteParts = this.parseVersion(remoteVersion);

        const maxLength = Math.max(localParts.length, remoteParts.length);
        for (let i = 0; i < maxLength; i++) {
            const local = localParts[i] ?? 0;
            const remote = remoteParts[i] ?? 0;

            if (remote > local) {
                return VersionCompareResult.Newer;
            }
            if (remote < local) {
                return VersionCompareResult.Older;
            }
        }

        return VersionCompareResult.Same;
    }

    /**
     * 解析版本号字符串为数字数组
     * @param version 版本号字符串（如 "1.2.3"）
     * @returns 版本号数字数组
     */
    private parseVersion(version: string): number[] {
        return version.split('.').map((part) => {
            const num = parseInt(part, 10);
            return isNaN(num) ? 0 : num;
        });
    }

    /**
     * 重置所有状态
     */
    public reset(): void {
        this._forcedResult = null;
        this._versionMap.clear();
        this._errorOnCompare = null;
        this._compareCalls.length = 0;
        Logger.debug(MockVersionComparator.TAG, '已重置所有状态');
    }
}
