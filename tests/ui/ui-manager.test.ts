import { UIManager } from '@framework/ui/UIManager';
import { UIFormBase } from '@framework/ui/UIFormBase';
import { IUIFormFactory, UIFormConfig, UILayer } from '@framework/ui/UIDefs';

// ─── Mock 工具 ──────────────────────────────────────

/**
 * Mock UIForm：可追踪所有生命周期调用
 */
class MockUIForm extends UIFormBase {
    private _formName: string;
    private _layer: UILayer;

    /** 生命周期调用记录 */
    readonly calls: string[] = [];
    lastOpenData: unknown = undefined;

    constructor(name: string, layer: UILayer) {
        super();
        this._formName = name;
        this._layer = layer;
    }

    get formName(): string {
        return this._formName;
    }

    get layer(): UILayer {
        return this._layer;
    }

    onOpen(data?: unknown): void {
        this.calls.push('onOpen');
        this.lastOpenData = data;
    }

    onClose(): void {
        this.calls.push('onClose');
    }

    onCover(): void {
        this.calls.push('onCover');
    }

    onReveal(): void {
        this.calls.push('onReveal');
    }

    onUpdate(_deltaTime: number): void {
        this.calls.push('onUpdate');
    }
}

/**
 * Mock UIFormFactory：根据注册配置创建 MockUIForm
 */
class MockUIFormFactory implements IUIFormFactory {
    readonly created: MockUIForm[] = [];
    readonly destroyed: UIFormBase[] = [];

    createForm(formName: string, config: UIFormConfig, _asset: unknown): UIFormBase {
        const form = new MockUIForm(formName, config.layer);
        this.created.push(form);
        return form;
    }

    destroyForm(form: UIFormBase): void {
        this.destroyed.push(form);
    }
}

// ─── 测试 ────────────────────────────────────────────

describe('UIManager', () => {
    let manager: UIManager;
    let factory: MockUIFormFactory;

    beforeEach(() => {
        manager = new UIManager();
        factory = new MockUIFormFactory();
        manager.setUIFormFactory(factory);
        manager.onInit();
    });

    afterEach(() => {
        manager.onShutdown();
    });

    // ─── 模块基础 ─────────────────────────────────────

    describe('模块基础', () => {
        it('模块名称为 UIManager', () => {
            expect(manager.moduleName).toBe('UIManager');
        });

        it('priority 为 200（业务框架层）', () => {
            expect(manager.priority).toBe(200);
        });

        it('未设置 factory 时 openForm 应抛出错误', () => {
            const noFactoryMgr = new UIManager();
            noFactoryMgr.onInit();
            noFactoryMgr.registerForm('Test', { path: 'test', layer: UILayer.Normal });
            expect(() => {
                noFactoryMgr.openForm('Test');
            }).toThrow('[UIManager]');
        });

        it('setUIFormFactory 不接受 null', () => {
            expect(() => {
                manager.setUIFormFactory(null as unknown as IUIFormFactory);
            }).toThrow('[UIManager]');
        });
    });

    // ─── 表单注册 ─────────────────────────────────────

    describe('registerForm - 表单注册', () => {
        it('注册成功后可以打开', () => {
            manager.registerForm('MainPanel', { path: 'ui/main', layer: UILayer.Normal });
            const onSuccess = jest.fn();
            manager.openForm('MainPanel', undefined, { onSuccess });
            expect(onSuccess).toHaveBeenCalled();
        });

        it('空名称应抛出错误', () => {
            expect(() => {
                manager.registerForm('', { path: 'ui/test', layer: UILayer.Normal });
            }).toThrow('[UIManager]');
        });

        it('空路径应抛出错误', () => {
            expect(() => {
                manager.registerForm('Test', { path: '', layer: UILayer.Normal });
            }).toThrow('[UIManager]');
        });

        it('重复注册同名表单应抛出错误', () => {
            manager.registerForm('MainPanel', { path: 'ui/main', layer: UILayer.Normal });
            expect(() => {
                manager.registerForm('MainPanel', { path: 'ui/main2', layer: UILayer.Normal });
            }).toThrow('[UIManager]');
        });
    });

    // ─── 打开表单 ─────────────────────────────────────

    describe('openForm - 打开表单', () => {
        beforeEach(() => {
            manager.registerForm('MainPanel', { path: 'ui/main', layer: UILayer.Normal });
            manager.registerForm('BagPanel', { path: 'ui/bag', layer: UILayer.Normal });
            manager.registerForm('Dialog', { path: 'ui/dialog', layer: UILayer.Popup });
        });

        it('打开表单后 hasForm 返回 true', () => {
            manager.openForm('MainPanel');
            expect(manager.hasForm('MainPanel')).toBe(true);
        });

        it('打开表单后可通过 getForm 获取实例', () => {
            manager.openForm('MainPanel');
            const form = manager.getForm('MainPanel');
            expect(form).toBeDefined();
            expect(form?.formName).toBe('MainPanel');
        });

        it('打开表单时触发 onOpen 并传递 data', () => {
            manager.openForm('MainPanel', { userId: 123 });
            const form = factory.created[0];
            expect(form.calls).toContain('onOpen');
            expect(form.lastOpenData).toEqual({ userId: 123 });
        });

        it('打开表单时 isOpen 状态为 true', () => {
            manager.openForm('MainPanel');
            const form = manager.getForm('MainPanel');
            expect(form?.isOpen).toBe(true);
        });

        it('打开未注册的表单应抛出错误', () => {
            expect(() => {
                manager.openForm('Nonexist');
            }).toThrow('[UIManager]');
        });

        it('成功回调正确触发', () => {
            const onSuccess = jest.fn();
            manager.openForm('MainPanel', undefined, { onSuccess });
            expect(onSuccess).toHaveBeenCalledWith('MainPanel', expect.any(MockUIForm));
        });

        it('非 allowMultiple 时重复打开同一表单应忽略', () => {
            manager.openForm('MainPanel');
            manager.openForm('MainPanel'); // 第二次应被忽略
            expect(factory.created.length).toBe(1);
        });
    });

    // ─── Cover / Reveal ───────────────────────────────

    describe('Cover / Reveal 通知', () => {
        beforeEach(() => {
            manager.registerForm('MainPanel', {
                path: 'ui/main',
                layer: UILayer.Normal,
                pauseCoveredForm: true,
            });
            manager.registerForm('BagPanel', {
                path: 'ui/bag',
                layer: UILayer.Normal,
                pauseCoveredForm: true,
            });
            manager.registerForm('Dialog', {
                path: 'ui/dialog',
                layer: UILayer.Popup,
            });
        });

        it('同层打开新表单时，旧栈顶收到 onCover', () => {
            manager.openForm('MainPanel');
            const mainForm = factory.created[0];

            manager.openForm('BagPanel');
            expect(mainForm.calls).toContain('onCover');
        });

        it('关闭栈顶表单后，新栈顶收到 onReveal', () => {
            manager.openForm('MainPanel');
            manager.openForm('BagPanel');
            const mainForm = factory.created[0];

            manager.closeForm('BagPanel');
            expect(mainForm.calls).toContain('onReveal');
        });

        it('不同层级的表单互不影响 cover/reveal', () => {
            manager.openForm('MainPanel');
            const mainForm = factory.created[0];

            // 打开 Popup 层的弹窗，不应该触发 Normal 层的 onCover
            manager.openForm('Dialog');
            expect(mainForm.calls).not.toContain('onCover');
        });

        it('pauseCoveredForm 为 false 时不触发 onCover', () => {
            // 重新注册一个不暂停覆盖的配置
            const mgr = new UIManager();
            const f = new MockUIFormFactory();
            mgr.setUIFormFactory(f);
            mgr.onInit();
            mgr.registerForm('A', { path: 'a', layer: UILayer.Normal, pauseCoveredForm: false });
            mgr.registerForm('B', { path: 'b', layer: UILayer.Normal, pauseCoveredForm: false });

            mgr.openForm('A');
            const formA = f.created[0];
            mgr.openForm('B');
            expect(formA.calls).not.toContain('onCover');

            mgr.onShutdown();
        });
    });

    // ─── 关闭表单 ─────────────────────────────────────

    describe('closeForm - 关闭表单', () => {
        beforeEach(() => {
            manager.registerForm('MainPanel', { path: 'ui/main', layer: UILayer.Normal });
            manager.registerForm('BagPanel', { path: 'ui/bag', layer: UILayer.Normal });
        });

        it('关闭后 hasForm 返回 false', () => {
            manager.openForm('MainPanel');
            manager.closeForm('MainPanel');
            expect(manager.hasForm('MainPanel')).toBe(false);
        });

        it('关闭时触发 onClose', () => {
            manager.openForm('MainPanel');
            const form = factory.created[0];
            manager.closeForm('MainPanel');
            expect(form.calls).toContain('onClose');
        });

        it('关闭后 isOpen 状态为 false', () => {
            manager.openForm('MainPanel');
            const form = factory.created[0];
            manager.closeForm('MainPanel');
            expect(form.isOpen).toBe(false);
        });

        it('关闭后 factory.destroyForm 被调用', () => {
            manager.openForm('MainPanel');
            manager.closeForm('MainPanel');
            expect(factory.destroyed.length).toBe(1);
        });

        it('关闭未打开的表单不抛错（静默忽略）', () => {
            expect(() => {
                manager.closeForm('MainPanel');
            }).not.toThrow();
        });

        it('关闭栈中间的表单，栈顺序正确维护', () => {
            manager.openForm('MainPanel');
            manager.openForm('BagPanel');

            // 关闭底部的 MainPanel（非栈顶）
            manager.closeForm('MainPanel');

            // BagPanel 仍在栈顶，不应收到 onReveal
            const bagForm = factory.created[1];
            expect(bagForm.calls).not.toContain('onReveal');
            expect(manager.hasForm('BagPanel')).toBe(true);
        });
    });

    // ─── closeAllForms ────────────────────────────────

    describe('closeAllForms - 批量关闭', () => {
        beforeEach(() => {
            manager.registerForm('MainPanel', { path: 'ui/main', layer: UILayer.Normal });
            manager.registerForm('BagPanel', { path: 'ui/bag', layer: UILayer.Normal });
            manager.registerForm('Dialog', { path: 'ui/dialog', layer: UILayer.Popup });
        });

        it('关闭指定层级的所有表单', () => {
            manager.openForm('MainPanel');
            manager.openForm('BagPanel');
            manager.openForm('Dialog');

            manager.closeAllForms(UILayer.Normal);

            expect(manager.hasForm('MainPanel')).toBe(false);
            expect(manager.hasForm('BagPanel')).toBe(false);
            expect(manager.hasForm('Dialog')).toBe(true); // Popup 层不受影响
        });

        it('不传参数时关闭所有层级的表单', () => {
            manager.openForm('MainPanel');
            manager.openForm('Dialog');

            manager.closeAllForms();

            expect(manager.hasForm('MainPanel')).toBe(false);
            expect(manager.hasForm('Dialog')).toBe(false);
        });
    });

    // ─── onUpdate ─────────────────────────────────────

    describe('onUpdate - 表单更新', () => {
        it('每帧调用已打开表单的 onUpdate', () => {
            manager.registerForm('MainPanel', { path: 'ui/main', layer: UILayer.Normal });
            manager.openForm('MainPanel');
            const form = factory.created[0];

            manager.onUpdate(0.016);
            expect(form.calls).toContain('onUpdate');
        });
    });

    // ─── onShutdown ───────────────────────────────────

    describe('onShutdown - 清理', () => {
        it('shutdown 后所有表单被关闭', () => {
            manager.registerForm('MainPanel', { path: 'ui/main', layer: UILayer.Normal });
            manager.registerForm('Dialog', { path: 'ui/dialog', layer: UILayer.Popup });
            manager.openForm('MainPanel');
            manager.openForm('Dialog');

            manager.onShutdown();

            expect(manager.hasForm('MainPanel')).toBe(false);
            expect(manager.hasForm('Dialog')).toBe(false);
        });
    });

    // ─── UIFormBase 基础测试 ──────────────────────────

    describe('UIFormBase 基础行为', () => {
        it('默认 isOpen 为 false', () => {
            const form = new MockUIForm('test', UILayer.Normal);
            expect(form.isOpen).toBe(false);
        });

        it('_setOpen 可以切换 isOpen 状态', () => {
            const form = new MockUIForm('test', UILayer.Normal);
            form._setOpen(true);
            expect(form.isOpen).toBe(true);
            form._setOpen(false);
            expect(form.isOpen).toBe(false);
        });
    });
});
