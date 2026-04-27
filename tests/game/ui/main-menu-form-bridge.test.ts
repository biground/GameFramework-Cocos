import { Component } from 'cc';

import { GameModule } from '@framework/core/GameModule';
import { UILayer } from '@framework/ui/UIDefs';
import { MainMenuForm } from '@game/ui/MainMenuForm';
import { MainMenuFormBridge } from '@game/ui/MainMenuFormBridge';

describe('MainMenuFormBridge', () => {
    afterEach(() => {
        GameModule.shutdownAll();
    });

    it('MainMenuForm 暴露主菜单 UI 元数据', () => {
        const form = new MainMenuForm();

        expect(MainMenuForm.FORM_NAME).toBe('MainMenuForm');
        expect(MainMenuForm.RESOURCE_PATH).toBe('ui/MainMenuForm');
        expect(form.formName).toBe(MainMenuForm.FORM_NAME);
        expect(form.layer).toBe(UILayer.Normal);
    });

    it('Bridge 以 Cocos Component 协议懒创建并缓存 MainMenuForm', () => {
        const bridge = new MainMenuFormBridge();

        expect(bridge).toBeInstanceOf(Component);
        expect(MainMenuFormBridge.__IS_UI_FORM__).toBe(true);
        expect(
            (bridge.constructor as unknown as { readonly __IS_UI_FORM__: boolean }).__IS_UI_FORM__,
        ).toBe(true);

        const firstForm = bridge.getUIForm();
        const secondForm = bridge.getUIForm();

        expect(firstForm).toBeInstanceOf(MainMenuForm);
        expect(secondForm).toBe(firstForm);
        expect(firstForm.formName).toBe(MainMenuForm.FORM_NAME);
        expect(firstForm.layer).toBe(UILayer.Normal);
    });

    it('Bridge 不声明 onLoad 自有方法', () => {
        const bridge = new MainMenuFormBridge();

        expect(Object.prototype.hasOwnProperty.call(MainMenuFormBridge.prototype, 'onLoad')).toBe(
            false,
        );
        expect(Object.prototype.hasOwnProperty.call(bridge, 'onLoad')).toBe(false);
    });
});
