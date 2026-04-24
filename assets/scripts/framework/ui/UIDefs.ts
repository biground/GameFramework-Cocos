import { UIFormBase } from './UIFormBase';

/**
 * UI 层级枚举
 * 层级值越大，显示越靠前（类似 z-order）
 */
export enum UILayer {
    /** 背景层（全屏背景图、场景背景） */
    Background = 0,
    /** 普通层（主界面、背包、技能面板） */
    Normal = 100,
    /** 固定层（HUD、小地图、聊天栏） */
    Fixed = 200,
    /** 弹窗层（确认框、提示框、系统弹窗） */
    Popup = 300,
    /** 顶层通知（飘字、成就提示、Toast） */
    Toast = 400,
}

/**
 * UI 表单配置
 * 注册表单时提供，决定表单的加载路径和行为
 */
export interface UIFormConfig {
    /** 表单资源路径（对应 ResourceManager 的 path） */
    path: string;
    /** 所属层级 */
    layer: UILayer;
    /**
     * 是否允许多实例（默认 false）
     * false：同一表单只能存在一个实例
     * true：每次 open 都创建新实例（如飘字、伤害数字）
     */
    allowMultiple?: boolean;
    /**
     * 新表单打开时是否通知同层被覆盖的表单（默认 true）
     * true：被覆盖的表单收到 onCover()，露出时收到 onReveal()
     */
    pauseCoveredForm?: boolean;
}

/**
 * UI 表单的运行时信息（内部管理用）
 */
export interface UIFormInfo {
    /** 表单名称 */
    readonly formName: string;
    /** 表单配置 */
    readonly config: UIFormConfig;
    /** 表单实例（打开后赋值） */
    form: UIFormBase | null;
    /** 是否已打开 */
    isOpen: boolean;
}

/**
 * UIFormFactory.createForm 的异步回调
 * Factory 负责资源加载与实例化，加载成功/失败通过回调通知 UIManager
 */
export interface UIFormCreateCallbacks {
    /**
     * 表单创建成功回调
     * @param form 已创建的表单实例
     */
    onSuccess(form: UIFormBase): void;
    /**
     * 表单创建失败回调
     * @param error 错误信息
     */
    onFailure(error: Error): void;
}

/**
 * UI 表单工厂接口（策略模式）
 * Framework 层定义契约，Runtime 层提供实际实现
 *
 * createForm 为异步回调风格：Factory 自己负责加载资源，再回调 onSuccess / onFailure。
 *
 * @example
 * ```typescript
 * // Runtime 层实现
 * class CocosUIFormFactory implements IUIFormFactory {
 *     createForm(formName: string, config: UIFormConfig, callbacks: UIFormCreateCallbacks): void {
 *         resourceManager.loadAsset(config.path, {
 *             onSuccess: (prefab) => {
 *                 const node = cc.instantiate(prefab as cc.Prefab);
 *                 callbacks.onSuccess(node.getComponent(UIFormBase)!);
 *             },
 *             onFailure: (err) => callbacks.onFailure(err),
 *         });
 *     }
 *     destroyForm(form: UIFormBase): void {
 *         // ...
 *     }
 * }
 * ```
 */
export interface IUIFormFactory {
    /**
     * 创建表单实例（异步，通过回调返回结果）
     * Factory 实现负责资源加载与实例化。
     * @param formName 表单名称
     * @param config 表单配置
     * @param callbacks 成功/失败回调
     */
    createForm(formName: string, config: UIFormConfig, callbacks: UIFormCreateCallbacks): void;

    /**
     * 销毁表单实例
     * @param form 要销毁的表单
     */
    destroyForm(form: UIFormBase): void;
}

/**
 * openForm 回调
 */
export interface OpenFormCallbacks {
    /** 打开成功 */
    onSuccess?: (formName: string, form: UIFormBase) => void;
    /** 打开失败 */
    onFailure?: (formName: string, error: Error) => void;
}

/**
 * UI 事件键（用于 EventManager 通知）
 */
export const UIEvents = {
    /** 表单打开事件 */
    FORM_OPENED: 'ui.form_opened',
    /** 表单关闭事件 */
    FORM_CLOSED: 'ui.form_closed',
} as const;
