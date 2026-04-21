import {
    IVersionComparator,
    VersionCompareResult,
} from '@framework/hotupdate/HotUpdateDefs';

/**
 * 模拟版本比较器
 * 用于 Demo 和测试环境的版本号比较模拟
 * 
 * @description
 * 实现 IVersionComparator 接口，提供语义化版本号比较功能。
 * 支持标准 x.y.z 格式的版本号比较。
 */
export class MockVersionComparator implements IVersionComparator {
    private static readonly TAG = 'MockVersionComparator';

    // Constructor
    constructor() {
        // TODO: 初始化版本比较器配置
    }

    /**
     * 比较本地版本与远程版本
     * @param localVersion 本地版本号
     * @param remoteVersion 远程版本号
     * @returns 比较结果
     */
    public compare(localVersion: string, remoteVersion: string): VersionCompareResult {
        // TODO: 实现语义化版本比较逻辑
        const localParts = this.parseVersion(localVersion);
        const remoteParts = this.parseVersion(remoteVersion);

        for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
            const local = localParts[i] ?? 0;
            const remote = remoteParts[i] ?? 0;

            if (remote > local) {
                return VersionCompareResult.Newer;
            } else if (remote < local) {
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
}
