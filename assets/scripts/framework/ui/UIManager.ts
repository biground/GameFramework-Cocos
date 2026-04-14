import { ModuleBase } from '../core/ModuleBase';
import { Logger } from '../debug/Logger';
import { IUIManager } from '../interfaces/IUIManager';
import { UIFormBase } from './UIFormBase';
import { IUIFormFactory, OpenFormCallbacks, UIFormConfig, UILayer } from './UIDefs';

/**
 * UI 管理器
 * 统一管理 UI 表单的注册、加载、打开、关闭与生命周期
 *
 * 设计要点：
 * - 按 UILayer 分组管理（每层一个栈）
 * - 栈顶为活跃表单，非栈顶收到 onCover 通知
 * - 通过 IUIFormFactory 策略注入，Framework 层不依赖引擎 API
 * - 资源加载委托给 ResourceManager
 */
export class UIManager extends ModuleBase implements IUIManager {
    private static readonly TAG = 'UIManager';

    public get moduleName(): string {
        return 'UIManager';
    }

    public get priority(): number {
        return 200;
    }

    /** 表单配置注册表：formName → UIFormConfig */
    private readonly _formConfigs: Map<string, UIFormConfig> = new Map();

    /** 分层管理：UILayer → 表单栈（栈顶 = 数组末尾） */
    private readonly _groups: Map<UILayer, UIFormBase[]> = new Map();

    /**
     * 已打开的表单索引：formName → UIFormBase[]
     * allowMultiple=false 时数组长度为 1，allowMultiple=true 时可有多个实例
     */
    private readonly _openForms: Map<string, UIFormBase[]> = new Map();

    /** 表单工厂（由 Runtime 层注入） */
    private _factory: IUIFormFactory | null = null;

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        this._initGroups();
        Logger.info(UIManager.TAG, 'UI 管理器初始化');
    }

    public onUpdate(deltaTime: number): void {
        // 对所有层所有实例分发 update，包含被覆盖的表单
        // 被覆盖的表单可能仍需维护内部状态（如实时数据刷新）
        // 若子类需要在被覆盖时暂停更新，可在 onCover/onReveal 中自行设置标志
        for (const instances of this._openForms.values()) {
            for (const form of instances) {
                form.onUpdate(deltaTime);
            }
        }
    }

    public onShutdown(): void {
        const formCount = this._openForms.size;
        Logger.info(
            UIManager.TAG,
            `UI 管理器关闭，清理 ${formCount} 个开启的表单，${this._formConfigs.size} 个注册配置`,
        );
        this.closeAllForms();
        this._formConfigs.clear();
        this._groups.clear();
        this._openForms.clear();
    }

    // ─── IUIManager 实现 ──────────────────────────────

    /**
     * 设置 UI 表单工厂
     */
    public setUIFormFactory(factory: IUIFormFactory): void {
        if (!factory) {
            throw new Error('[UIManager] factory 不能为空');
        }
        this._factory = factory;
    }

    /**
     * 注册表单配置
     */
    public registerForm(formName: string, config: UIFormConfig): void {
        if (!formName) {
            throw new Error('[UIManager] 表单名称不能为空');
        }
        if (!config.path) {
            throw new Error('[UIManager] 表单资源路径不能为空');
        }
        if (this._formConfigs.has(formName)) {
            throw new Error(`[UIManager] 表单 "${formName}" 已注册，不能重复注册`);
        }
        this._formConfigs.set(formName, config);
        Logger.debug(UIManager.TAG, `注册表单: ${formName}`);
    }

    /**
     * 打开表单
     */
    public openForm(formName: string, data?: unknown, callbacks?: OpenFormCallbacks): void {
        // 1. 检查是否已注册
        const config = this._formConfigs.get(formName);
        if (!config) {
            throw new Error(`[UIManager] 表单 "${formName}" 未注册，请先调用 registerForm`);
        }

        // 2. 非 allowMultiple 时，已打开则忽略
        if (!config.allowMultiple && (this._openForms.get(formName)?.length ?? 0) > 0) {
            Logger.debug(UIManager.TAG, `表单已打开, 忽略: ${formName}`);
            return;
        }

        // 3. 检查 factory
        if (!this._factory) {
            throw new Error('[UIManager] 未设置 UIFormFactory，请先调用 setUIFormFactory');
        }

        // 4. 通过 factory 创建表单实例
        const form = this._factory.createForm(formName, config, null);
        const group = this._getGroup(config.layer);

        // 5. 通知旧栈顶 onCover()
        const pauseCovered = config.pauseCoveredForm !== false; // 默认 true
        if (pauseCovered && group.length > 0) {
            const topForm = group[group.length - 1];
            topForm.onCover();
        }

        // 6. 推入栈 + 记录
        group.push(form);
        const instances = this._openForms.get(formName) ?? [];
        instances.push(form);
        this._openForms.set(formName, instances);
        form._setOpen(true);

        // 7. 调用 onOpen
        form.onOpen(data);

        Logger.debug(UIManager.TAG, `打开表单: ${formName}`);

        // 8. 成功回调
        callbacks?.onSuccess?.(formName, form);
    }

    /**
     * 关闭表单
     */
    public closeForm(formName: string): void {
        const instances = this._openForms.get(formName);
        if (!instances || instances.length === 0) return; // 静默忽略

        Logger.debug(UIManager.TAG, `关闭表单: ${formName}`);

        // allowMultiple 时关闭最后打开的实例（LIFO）
        const form = instances[instances.length - 1];

        const config = this._formConfigs.get(formName);
        if (!config) return;

        const group = this._getGroup(config.layer);
        const index = group.indexOf(form);
        const wasTop = index === group.length - 1;

        // 从栈中移除
        if (index !== -1) {
            group.splice(index, 1);
        }

        // 调用 onClose + 更新状态
        form.onClose();
        form._setOpen(false);

        // 从 _openForms 中移除该实例
        instances.pop();
        if (instances.length === 0) {
            this._openForms.delete(formName);
        }

        // 如果移除的是栈顶，通知新栈顶 onReveal
        const pauseCovered = config.pauseCoveredForm !== false;
        if (wasTop && pauseCovered && group.length > 0) {
            const newTop = group[group.length - 1];
            Logger.debug(UIManager.TAG, `栈顶恢复: ${newTop.formName}`);
            newTop.onReveal();
        }

        // 销毁表单
        this._factory?.destroyForm(form);
    }

    /**
     * 关闭指定层级的所有表单
     */
    public closeAllForms(layer?: UILayer): void {
        Logger.info(UIManager.TAG, `关闭所有表单`);
        if (layer !== undefined) {
            this._closeGroupForms(layer);
        } else {
            // 关闭所有层级
            for (const l of this._groups.keys()) {
                this._closeGroupForms(l);
            }
        }
    }

    /**
     * 获取已打开的表单
     */
    public getForm(formName: string): UIFormBase | undefined {
        const instances = this._openForms.get(formName);
        // 返回最后打开的实例（allowMultiple 时为最新实例）
        return instances?.[instances.length - 1];
    }

    /**
     * 查询表单是否已打开
     */
    public hasForm(formName: string): boolean {
        return (this._openForms.get(formName)?.length ?? 0) > 0;
    }

    // ─── 内部辅助方法 ──────────────────────────────────

    /**
     * 初始化所有层级的分组栈
     */
    private _initGroups(): void {
        const layers = [
            UILayer.Background,
            UILayer.Normal,
            UILayer.Fixed,
            UILayer.Popup,
            UILayer.Toast,
        ];
        for (const layer of layers) {
            this._groups.set(layer, []);
        }
    }

    /**
     * 获取指定层级的分组栈
     */
    private _getGroup(layer: UILayer): UIFormBase[] {
        let group = this._groups.get(layer);
        if (!group) {
            group = [];
            this._groups.set(layer, group);
        }
        return group;
    }

    /**
     * 关闭指定层级的所有表单
     */
    private _closeGroupForms(layer: UILayer): void {
        const group = this._getGroup(layer);
        // 从栈顶到栈底逆序关闭，避免遍历中修改
        const names = group.map((f) => f.formName);
        for (let i = names.length - 1; i >= 0; i--) {
            this.closeForm(names[i]);
        }
    }
}
