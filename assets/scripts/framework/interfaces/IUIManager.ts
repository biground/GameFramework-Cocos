import { UIFormBase } from '../ui/UIFormBase';
import { UIFormConfig, UILayer, IUIFormFactory, OpenFormCallbacks } from '../ui/UIDefs';

/**
 * UI 管理器接口
 * 定义 UI 系统的公共契约，业务层应依赖此接口而非 UIManager 实现类
 *
 * 核心职责：
 * 1. UI 表单的配置注册与生命周期管理
 * 2. 分层分组管理（UILayer → UIGroup 栈）
 * 3. 覆盖/恢复通知（onCover / onReveal）
 * 4. 通过 IUIFormFactory 策略注入创建/销毁表单（资源加载由 factory 实现负责）
 */
export interface IUIManager {
    /**
     * 设置 UI 表单工厂（策略注入）
     * 必须在打开表单之前调用
     * @param factory 表单工厂实现
     */
    setUIFormFactory(factory: IUIFormFactory): void;

    /**
     * 注册表单配置
     * 必须在 openForm 之前注册
     * @param formName 表单名称（唯一标识）
     * @param config 表单配置
     */
    registerForm(formName: string, config: UIFormConfig): void;

    /**
     * 打开表单（异步）
     * - 资源加载与实例化由注入的 IUIFormFactory 负责，UIManager 通过 Factory 的
     *   onSuccess/onFailure 回调完成入栈与通知。
     * - 已打开（非 allowMultiple）或创建中：忽略，直接返回。
     * - allowMultiple=true：每次调用创建新实例，closeForm 按 LIFO 顺序关闭。
     * - openForm 对调用方返回 void；如需在表单真正打开后执行动作，使用 callbacks.onSuccess。
     *
     * @param formName 表单名称
     * @param data 传递给 onOpen 的业务数据（可选）
     * @param callbacks 打开回调（可选）
     */
    openForm(formName: string, data?: unknown, callbacks?: OpenFormCallbacks): void;

    /**
     * 关闭表单
     * 从对应 UIGroup 栈中移除，触发 onClose
     * 如果下方有被覆盖的表单，触发其 onReveal
     *
     * @param formName 表单名称
     */
    closeForm(formName: string): void;

    /**
     * 关闭指定层级的所有表单
     * @param layer 目标层级（可选，不传则关闭全部）
     */
    closeAllForms(layer?: UILayer): void;

    /**
     * 获取已打开的表单实例
     * @param formName 表单名称
     * @returns 表单实例，未打开返回 undefined
     */
    getForm(formName: string): UIFormBase | undefined;

    /**
     * 查询表单是否已打开
     * @param formName 表单名称
     */
    hasForm(formName: string): boolean;
}
