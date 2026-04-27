import { _decorator, Component } from 'cc';

import { UIFormBase } from '../../framework/ui/UIFormBase';

const { ccclass } = _decorator;

/**
 * Cocos Creator 3.8.5 UIForm 桥接组件基类。
 *
 * 设计：组合而非继承——组件本身 extends `cc.Component`，内部持有一个上层
 * `UIFormBase` 实例，通过静态标记 `__IS_UI_FORM__` 让 {@link CocosUIFormFactory}
 * 在节点的 components 列表中识别并反射出 UIForm。
 *
 * 用法：
 * - 把本组件挂到 Prefab 根节点上
 * - 在子类 `onLoad` 或工厂创建后调用 {@link setUIForm} 注入业务 UIForm 实例
 * - {@link CocosUIFormFactory._findUIForm} 通过 {@link getUIForm} 取出实例
 */
@ccclass('CocosUIFormBase')
export class CocosUIFormBase extends Component {
    /** 标记为 UIForm 桥接组件，供 CocosUIFormFactory 识别 */
    public static readonly __IS_UI_FORM__ = true;

    /** 持有的上层 UIForm 实例 */
    private _uiForm: UIFormBase | null = null;

    /**
     * 注入 UIForm 实例。
     * @throws 当 form 为空或已设置过 UIForm 时
     */
    public setUIForm(form: UIFormBase): void {
        if (!form) {
            throw new Error('[CocosUIFormBase] form 不能为空');
        }
        if (this._uiForm) {
            throw new Error('[CocosUIFormBase] UIForm 已设置，不允许重复注入');
        }
        this._uiForm = form;
    }

    /**
     * 获取 UIForm 实例，由 {@link CocosUIFormFactory} 调用。
     * @throws 当尚未注入 UIForm 时
     */
    public getUIForm(): UIFormBase {
        if (!this._uiForm) {
            throw new Error('[CocosUIFormBase] UIForm 未注入');
        }
        return this._uiForm;
    }

    /** cc 生命周期：节点销毁时清理引用，方便 GC */
    protected onDestroy(): void {
        this._uiForm = null;
    }
}
