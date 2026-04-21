import {
    IUIFormFactory,
    UIFormConfig,
    UIFormBase,
} from '@framework/ui/UIDefs';

/**
 * 模拟 UI 表单工厂
 * 用于 Demo 和测试环境的 UI 表单创建模拟
 * 
 * @description
 * 实现 IUIFormFactory 接口，在不依赖 CocosCreator 引擎的情况下
 * 模拟 UI 表单的创建和销毁，用于单元测试和 Demo 演示。
 */
export class MockUIFormFactory implements IUIFormFactory {
    private static readonly TAG = 'MockUIFormFactory';

    /** 已创建的表单列表 */
    private _createdForms: Set<UIFormBase> = new Set();

    // Constructor
    constructor() {
        // TODO: 初始化 UI 表单工厂配置
    }

    /**
     * 创建表单实例（模拟）
     * @param formName 表单名称
     * @param config 表单配置
     * @param asset 已加载的资源
     * @returns 表单实例
     */
    public createForm(_formName: string, _config: UIFormConfig, _asset: unknown): UIFormBase {
        // TODO: 实现模拟表单创建逻辑
        // 注意：实际实现需要创建 UIFormBase 的子类实例
        throw new Error('[MockUIFormFactory] createForm 尚未实现');
    }

    /**
     * 销毁表单实例（模拟）
     * @param form 要销毁的表单
     */
    public destroyForm(form: UIFormBase): void {
        // TODO: 实现模拟表单销毁逻辑
        this._createdForms.delete(form);
    }

    /**
     * 获取已创建的表单数量（仅用于测试）
     * @returns 表单数量
     */
    public get createdFormCount(): number {
        return this._createdForms.size;
    }
}
