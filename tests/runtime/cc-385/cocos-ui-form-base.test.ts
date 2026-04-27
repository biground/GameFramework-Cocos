import { CocosUIFormBase } from '../../../assets/scripts/runtime/cc-385/CocosUIFormBase';
import { UIFormBase } from '../../../assets/scripts/framework/ui/UIFormBase';
import { UILayer } from '../../../assets/scripts/framework/ui/UIDefs';

class FakeForm extends UIFormBase {
    public get formName(): string {
        return 'fake';
    }
    public get layer(): UILayer {
        return UILayer.Normal;
    }
}

describe('CocosUIFormBase', () => {
    test('__IS_UI_FORM__ 静态标记为 true，可通过实例的 constructor 访问', () => {
        const inst = new CocosUIFormBase();
        expect(CocosUIFormBase.__IS_UI_FORM__).toBe(true);
        expect((inst.constructor as unknown as { __IS_UI_FORM__: boolean }).__IS_UI_FORM__).toBe(
            true,
        );
    });

    test('setUIForm(null) 抛错', () => {
        const inst = new CocosUIFormBase();
        expect(() => inst.setUIForm(null as unknown as UIFormBase)).toThrow(
            '[CocosUIFormBase] form 不能为空',
        );
    });

    test('setUIForm(undefined) 抛错', () => {
        const inst = new CocosUIFormBase();
        expect(() => inst.setUIForm(undefined as unknown as UIFormBase)).toThrow(
            '[CocosUIFormBase] form 不能为空',
        );
    });

    test('setUIForm 后 getUIForm 返回同一实例', () => {
        const inst = new CocosUIFormBase();
        const form = new FakeForm();
        inst.setUIForm(form);
        expect(inst.getUIForm()).toBe(form);
    });

    test('重复 setUIForm 抛错', () => {
        const inst = new CocosUIFormBase();
        const form1 = new FakeForm();
        const form2 = new FakeForm();
        inst.setUIForm(form1);
        expect(() => inst.setUIForm(form2)).toThrow(
            '[CocosUIFormBase] UIForm 已设置，不允许重复注入',
        );
    });

    test('未注入直接 getUIForm 抛错', () => {
        const inst = new CocosUIFormBase();
        expect(() => inst.getUIForm()).toThrow('[CocosUIFormBase] UIForm 未注入');
    });

    test('onDestroy 后 getUIForm 抛错（清理生效）', () => {
        const inst = new CocosUIFormBase();
        const form = new FakeForm();
        inst.setUIForm(form);
        // onDestroy 是 protected，测试中通过类型断言访问
        (inst as unknown as { onDestroy: () => void }).onDestroy();
        expect(() => inst.getUIForm()).toThrow('[CocosUIFormBase] UIForm 未注入');
    });
});
