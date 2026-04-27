import { Component } from 'cc';

import { MainMenuForm } from './MainMenuForm';

/** 主菜单 Prefab 上挂载的 UIForm 桥接组件。 */
export class MainMenuFormBridge extends Component {
    /** 标记为 UIForm 桥接组件，供运行时 UI 工厂识别。 */
    public static readonly __IS_UI_FORM__ = true;

    private _uiForm: MainMenuForm | null = null;

    /** 获取主菜单 UIForm；首次调用时创建并缓存。 */
    public getUIForm(): MainMenuForm {
        if (!this._uiForm) {
            this._uiForm = new MainMenuForm();
        }
        return this._uiForm;
    }
}
