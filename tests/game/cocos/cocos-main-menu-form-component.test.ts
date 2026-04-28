import { Component } from 'cc';

import { MainMenuForm } from '@game/ui/MainMenuForm';
import { CocosMainMenuFormComponent } from '@game/cocos/CocosMainMenuFormComponent';
import { CocosUIFormBase } from '@runtime/cc-385/CocosUIFormBase';

class TestableCocosMainMenuFormComponent extends CocosMainMenuFormComponent {
    public invokeOnLoad(): void {
        this.onLoad();
    }

    public invokeOnDestroy(): void {
        this.onDestroy();
    }
}

describe('CocosMainMenuFormComponent', () => {
    it('作为 Cocos UIForm 桥接组件注入并缓存 MainMenuForm', () => {
        const component = new TestableCocosMainMenuFormComponent();

        expect(component).toBeInstanceOf(Component);
        expect(component).toBeInstanceOf(CocosUIFormBase);
        expect(CocosMainMenuFormComponent.__IS_UI_FORM__).toBe(true);
        expect((component.constructor as typeof CocosMainMenuFormComponent).__IS_UI_FORM__).toBe(
            true,
        );

        component.invokeOnLoad();
        const firstForm = component.getUIForm();
        component.invokeOnLoad();
        const secondForm = component.getUIForm();

        expect(firstForm).toBeInstanceOf(MainMenuForm);
        expect(secondForm).toBe(firstForm);

        component.invokeOnDestroy();

        expect(() => component.getUIForm()).toThrow('[CocosUIFormBase] UIForm 未注入');
    });
});
