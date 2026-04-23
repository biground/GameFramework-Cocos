import { ServiceKey } from './DITypes';
import { IEventManager } from '../interfaces/IEventManager';
import { IResourceManager } from '../interfaces/IResourceManager';
import { IAudioManager } from '../interfaces/IAudioManager';
import { ISceneManager } from '../interfaces/ISceneManager';
import { IUIManager } from '../interfaces/IUIManager';
import { IEntityManager } from '../interfaces/IEntityManager';
import { INetworkManager } from '../interfaces/INetworkManager';
import { IFsmManager } from '../interfaces/IFsmManager';
import { IProcedureManager } from '../interfaces/IProcedureManager';
import { ITimerManager } from '../interfaces/ITimerManager';
import { ILocalizationManager } from '../interfaces/ILocalizationManager';
import { IHotUpdateManager } from '../interfaces/IHotUpdateManager';
import { Logger } from '../debug/Logger';
import { DataTableManager } from '../datatable/DataTableManager';
import { DebugManager } from '../debug/DebugManager';
import { IResourceLoader } from '../resource/ResourceDefs';
import { IAudioPlayer } from '../audio/AudioDefs';
import { ISceneLoader } from '../scene/SceneDefs';
import { IUIFormFactory } from '../ui/UIDefs';
import { IEntityFactory } from '../entity/EntityDefs';
import { IDataTableParser } from '../datatable/DataTableDefs';
import { IHotUpdateAdapter, IVersionComparator } from '../hotupdate/HotUpdateDefs';

/**
 * 框架模块 ServiceKey 定义
 * 统一管理所有模块和策略接口的 DI 服务标识符
 *
 * 分为两组：
 * - 模块标识：对应各 Manager 模块的接口（或具体类）
 * - 策略标识：对应各模块通过 setter 注入的策略接口
 *
 * @example
 * ```typescript
 * import { SERVICE_KEYS } from '@framework/di/ServiceKeys';
 * container.bind(SERVICE_KEYS.EventManager).toValue(eventManager);
 * container.bind(SERVICE_KEYS.ResourceLoader).toValue(new MockResourceLoader());
 * ```
 */
export const SERVICE_KEYS = {
    // ─── 模块标识 ──────────────────────────────────────

    /** 事件管理器 */
    EventManager: new ServiceKey<IEventManager>('IEventManager'),
    /** 资源管理器 */
    ResourceManager: new ServiceKey<IResourceManager>('IResourceManager'),
    /** 音频管理器 */
    AudioManager: new ServiceKey<IAudioManager>('IAudioManager'),
    /** 场景管理器 */
    SceneManager: new ServiceKey<ISceneManager>('ISceneManager'),
    /** UI 管理器 */
    UIManager: new ServiceKey<IUIManager>('IUIManager'),
    /** 实体管理器 */
    EntityManager: new ServiceKey<IEntityManager>('IEntityManager'),
    /** 网络管理器 */
    NetworkManager: new ServiceKey<INetworkManager>('INetworkManager'),
    /** 有限状态机管理器 */
    FsmManager: new ServiceKey<IFsmManager>('IFsmManager'),
    /** 流程管理器 */
    ProcedureManager: new ServiceKey<IProcedureManager>('IProcedureManager'),
    /** 定时器管理器 */
    TimerManager: new ServiceKey<ITimerManager>('ITimerManager'),
    /** 本地化管理器 */
    LocalizationManager: new ServiceKey<ILocalizationManager>('ILocalizationManager'),
    /** 热更新管理器 */
    HotUpdateManager: new ServiceKey<IHotUpdateManager>('IHotUpdateManager'),
    /** 日志模块（无独立接口，使用具体类） */
    Logger: new ServiceKey<Logger>('Logger'),
    /** 数据表管理器（无独立接口，使用具体类） */
    DataTableManager: new ServiceKey<DataTableManager>('DataTableManager'),
    /** 调试管理器（无独立接口，使用具体类） */
    DebugManager: new ServiceKey<DebugManager>('DebugManager'),

    // ─── 策略标识 ──────────────────────────────────────

    /** 资源加载器策略 */
    ResourceLoader: new ServiceKey<IResourceLoader>('IResourceLoader'),
    /** 音频播放器策略 */
    AudioPlayer: new ServiceKey<IAudioPlayer>('IAudioPlayer'),
    /** 场景加载器策略 */
    SceneLoader: new ServiceKey<ISceneLoader>('ISceneLoader'),
    /** UI 表单工厂策略 */
    UIFormFactory: new ServiceKey<IUIFormFactory>('IUIFormFactory'),
    /** 实体工厂策略 */
    EntityFactory: new ServiceKey<IEntityFactory>('IEntityFactory'),
    /** 数据表解析器策略 */
    DataTableParser: new ServiceKey<IDataTableParser>('IDataTableParser'),
    /** 热更新适配器策略 */
    HotUpdateAdapter: new ServiceKey<IHotUpdateAdapter>('IHotUpdateAdapter'),
    /** 版本比较器策略 */
    VersionComparator: new ServiceKey<IVersionComparator>('IVersionComparator'),
} as const;
