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
 * 4. 与 ResourceManager 集成的资源加载/释放
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
     * 打开表单
     * - 已打开（非 allowMultiple）：忽略
     * - 未加载：通过 ResourceManager 加载后创建
     * - 已缓存：直接复用
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
