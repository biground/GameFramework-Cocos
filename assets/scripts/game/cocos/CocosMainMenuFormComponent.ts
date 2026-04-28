import { _decorator } from 'cc';

import { CocosUIFormBase } from '@runtime/cc-385/CocosUIFormBase';

import { MainMenuForm } from '../ui/MainMenuForm';

const { ccclass } = _decorator;

/** 主菜单 Prefab 根节点挂载的 Cocos UIForm 桥接组件。 */
@ccclass('CocosMainMenuFormComponent')
export class CocosMainMenuFormComponent extends CocosUIFormBase {
    private _hasInjectedForm = false;

    protected onLoad(): void {
        if (this._hasInjectedForm) {
            return;
        }
        this.setUIForm(new MainMenuForm());
        this._hasInjectedForm = true;
    }

    protected override onDestroy(): void {
        super.onDestroy();
        this._hasInjectedForm = false;
    }
}
