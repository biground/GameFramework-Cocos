import { MockUIForm, MockUIFormFactory } from '@game/shared/MockUIFormFactory';
import { UILayer, UIFormConfig } from '@framework/ui/UIDefs';

describe('MockUIForm', () => {
    let form: MockUIForm;

    beforeEach(() => {
        form = new MockUIForm('TestForm', UILayer.Normal);
    });

    it('初始属性：formName 和 layer 正确', () => {
        expect(form.formName).toBe('TestForm');
        expect(form.layer).toBe(UILayer.Normal);
        expect(form.calls).toEqual([]);
        expect(form.lastOpenData).toBeNull();
    });

    it('onOpen 记录调用并保存数据', () => {
        const data = { id: 1, name: 'test' };
        form.onOpen(data);
        expect(form.calls).toEqual(['onOpen']);
        expect(form.lastOpenData).toEqual(data);
    });

    it('onOpen 无参数时 lastOpenData 为 null', () => {
        form.onOpen();
        expect(form.lastOpenData).toBeNull();
    });

    it('onClose 记录调用', () => {
        form.onClose();
        expect(form.calls).toEqual(['onClose']);
    });

    it('onCover 记录调用', () => {
        form.onCover();
        expect(form.calls).toEqual(['onCover']);
    });

    it('onReveal 记录调用', () => {
        form.onReveal();
        expect(form.calls).toEqual(['onReveal']);
    });

    it('onUpdate 记录调用', () => {
        form.onUpdate(0.016);
        expect(form.calls).toEqual(['onUpdate']);
    });

    it('完整生命周期调用顺序', () => {
        form.onOpen({ level: 5 });
        form.onUpdate(0.016);
        form.onCover();
        form.onReveal();
        form.onClose();
        expect(form.calls).toEqual(['onOpen', 'onUpdate', 'onCover', 'onReveal', 'onClose']);
    });

    it('不同层级创建', () => {
        const popup = new MockUIForm('PopupForm', UILayer.Popup);
        expect(popup.layer).toBe(UILayer.Popup);

        const toast = new MockUIForm('ToastForm', UILayer.Toast);
        expect(toast.layer).toBe(UILayer.Toast);
    });
});

describe('MockUIFormFactory', () => {
    let factory: MockUIFormFactory;
    const config: UIFormConfig = { path: 'ui/test', layer: UILayer.Normal };

    beforeEach(() => {
        factory = new MockUIFormFactory();
    });

    it('createForm 返回 MockUIForm 实例', () => {
        const form = factory.createForm('MainMenu', config, null);
        expect(form).toBeInstanceOf(MockUIForm);
    });

    it('createForm 设置正确的 formName 和 layer', () => {
        const form = factory.createForm('Settings', config, null) as MockUIForm;
        expect(form.formName).toBe('Settings');
        expect(form.layer).toBe(UILayer.Normal);
    });

    it('createForm 追踪到 createdForms', () => {
        factory.createForm('Form1', config, null);
        factory.createForm('Form2', config, null);
        expect(factory.createdForms).toHaveLength(2);
        expect(factory.createdFormCount).toBe(2);
    });

    it('destroyForm 追踪到 destroyedForms', () => {
        const form = factory.createForm('ToDestroy', config, null);
        factory.destroyForm(form);
        expect(factory.destroyedForms).toContain(form);
    });

    it('destroyForm 从 createdForms 中移除', () => {
        const form1 = factory.createForm('A', config, null);
        const form2 = factory.createForm('B', config, null);
        factory.destroyForm(form1);
        expect(factory.createdForms).toHaveLength(1);
        expect(factory.createdForms[0]).toBe(form2);
    });

    it('不同 layer 的表单创建', () => {
        const popupConfig: UIFormConfig = { path: 'ui/popup', layer: UILayer.Popup };
        const form = factory.createForm('Alert', popupConfig, null) as MockUIForm;
        expect(form.layer).toBe(UILayer.Popup);
    });
});
