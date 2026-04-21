import { IUIFormFactory, UIFormConfig, UILayer } from '@framework/ui/UIDefs';
import { UIFormBase } from '@framework/ui/UIFormBase';
import { Logger } from '@framework/debug/Logger';

/**
 * 模拟 UI 表单
 * 继承 UIFormBase，用于 Demo 和测试环境
 * 记录所有生命周期方法调用，便于测试验证
 */
export class MockUIForm extends UIFormBase {
    private static readonly TAG = 'MockUIForm';

    /** 生命周期调用记录 */
    public readonly calls: string[] = [];

    /** 最后一次 onOpen 接收的数据 */
    public lastOpenData: unknown = null;

    private readonly _formName: string;
    private readonly _layer: UILayer;

    constructor(formName: string, layer: UILayer) {
        super();
        this._formName = formName;
        this._layer = layer;
    }

    /**
     * 表单名称
     */
    public get formName(): string {
        return this._formName;
    }

    /**
     * 所属层级
     */
    public get layer(): UILayer {
        return this._layer;
    }

    /**
     * 表单打开时调用
     * @param data 业务数据（可选）
     */
    public onOpen(data?: unknown): void {
        this.calls.push('onOpen');
        this.lastOpenData = data ?? null;
        Logger.debug(MockUIForm.TAG, `onOpen: ${this._formName}`);
    }

    /**
     * 表单关闭时调用
     */
    public onClose(): void {
        this.calls.push('onClose');
        Logger.debug(MockUIForm.TAG, `onClose: ${this._formName}`);
    }

    /**
     * 表单被覆盖时调用
     */
    public onCover(): void {
        this.calls.push('onCover');
        Logger.debug(MockUIForm.TAG, `onCover: ${this._formName}`);
    }

    /**
     * 表单重新可见时调用
     */
    public onReveal(): void {
        this.calls.push('onReveal');
        Logger.debug(MockUIForm.TAG, `onReveal: ${this._formName}`);
    }

    /**
     * 每帧更新
     * @param deltaTime 帧间隔时间（秒）
     */
    public onUpdate(deltaTime: number): void {
        this.calls.push('onUpdate');
        Logger.debug(MockUIForm.TAG, `onUpdate: ${this._formName}, dt: ${deltaTime}`);
    }
}

/**
 * 模拟 UI 表单工厂
 * 用于 Demo 和测试环境的 UI 表单创建模拟
 *
 * @description
 * 实现 IUIFormFactory 接口，在不依赖 CocosCreator 引擎的情况下
 * 模拟 UI 表单的创建和销毁，用于单元测试和 Demo 演示。
 * 所有操作均会被追踪记录，便于测试验证。
 *
 * @example
 * ```typescript
 * const factory = new MockUIFormFactory();
 * const form = factory.createForm('MainMenu', { path: 'ui/main', layer: UILayer.Normal }, null);
 * factory.destroyForm(form);
 * ```
 */
export class MockUIFormFactory implements IUIFormFactory {
    private static readonly TAG = 'MockUIFormFactory';

    /** 追踪已创建的表单 */
    public readonly createdForms: MockUIForm[] = [];

    /** 追踪已销毁的表单 */
    public readonly destroyedForms: UIFormBase[] = [];

    /**
     * 创建表单实例（模拟）
     * @param formName 表单名称
     * @param config 表单配置
     * @param _asset 已加载的资源（模拟环境下忽略）
     * @returns 表单实例
     */
    public createForm(formName: string, config: UIFormConfig, _asset: unknown): UIFormBase {
        const form = new MockUIForm(formName, config.layer);
        this.createdForms.push(form);
        Logger.debug(MockUIFormFactory.TAG, `createForm: ${formName}, layer: ${config.layer}`);
        return form;
    }

    /**
     * 销毁表单实例（模拟）
     * @param form 要销毁的表单
     */
    public destroyForm(form: UIFormBase): void {
        this.destroyedForms.push(form);
        const idx = this.createdForms.indexOf(form as MockUIForm);
        if (idx >= 0) {
            this.createdForms.splice(idx, 1);
        }
        Logger.debug(MockUIFormFactory.TAG, `destroyForm: ${form.formName}`);
    }

    /**
     * 获取已创建的表单数量（仅用于测试）
     * @returns 表单数量
     */
    public get createdFormCount(): number {
        return this.createdForms.length;
    }
}
