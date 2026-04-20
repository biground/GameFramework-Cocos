import {
    HotUpdateState,
    HotUpdateProgressData,
    HotUpdateConfig,
    IHotUpdateAdapter,
    IVersionComparator,
} from '../hotupdate/HotUpdateDefs';

/**
 * 热更新管理器接口
 * 定义热更新系统的公共契约，业务层应依赖此接口而非 HotUpdateManager 实现类
 */
export interface IHotUpdateManager {
    /**
     * 设置热更新适配器（Runtime 层注入）
     * @param adapter 热更新适配器实现
     */
    setAdapter(adapter: IHotUpdateAdapter): void;

    /**
     * 设置版本比较策略
     * @param comparator 版本比较器
     */
    setComparator(comparator: IVersionComparator): void;

    /**
     * 设置热更新配置
     * @param config 配置（支持部分更新）
     */
    setConfig(config: Partial<HotUpdateConfig>): void;

    /**
     * 检查是否有可用更新
     * @returns 是否有新版本
     */
    checkForUpdate(): Promise<boolean>;

    /**
     * 开始下载更新
     * @returns 下载是否成功
     */
    startUpdate(): Promise<boolean>;

    /**
     * 应用已下载的更新
     * @returns 应用是否成功
     */
    applyUpdate(): Promise<boolean>;

    /**
     * 获取当前热更新状态
     * @returns 当前状态
     */
    getState(): HotUpdateState;

    /**
     * 获取下载进度
     * @returns 进度数据
     */
    getProgress(): HotUpdateProgressData;

    /**
     * 获取本地版本号
     * @returns 本地版本号，未初始化时返回 null
     */
    getLocalVersion(): string | null;

    /**
     * 获取远程版本号
     * @returns 远程版本号，未检查时返回 null
     */
    getRemoteVersion(): string | null;
}
