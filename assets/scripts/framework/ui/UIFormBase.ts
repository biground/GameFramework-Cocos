import { UILayer } from './UIDefs';

/**
 * UI 表单抽象基类
 * 所有具体的 UI 表单都必须继承此类，实现生命周期钩子
 *
 * 生命周期：
 * onOpen(data?) → [onCover() ↔ onReveal()] → onClose()
 *               → onUpdate(dt) 每帧（可选）
 */
export abstract class UIFormBase {
    /**
     * 表单名称（唯一标识）
     * 子类必须实现
     */
    abstract get formName(): string;

    /**
     * 所属层级
     * 子类必须实现
     */
    abstract get layer(): UILayer;

    /** 是否已打开 */
    private _isOpen: boolean = false;

    /** 是否已打开 */
    public get isOpen(): boolean {
        return this._isOpen;
    }

    /**
     * 内部方法：设置打开状态
     * 仅由 UIManager 调用，业务层不应直接调用
     * @internal
     */
    public _setOpen(open: boolean): void {
        this._isOpen = open;
    }

    /**
     * 表单打开时调用
     * @param data 业务数据（可选）
     */
    public onOpen(_data?: unknown): void {
        // 子类重写
    }

    /**
     * 表单关闭时调用
     */
    public onClose(): void {
        // 子类重写
    }

    /**
     * 表单被覆盖时调用（同层有新表单入栈）
     */
    public onCover(): void {
        // 子类重写
    }

    /**
     * 表单重新可见时调用（覆盖它的表单已关闭）
     */
    public onReveal(): void {
        // 子类重写
    }

    /**
     * 每帧更新（可选）
     * @param deltaTime 帧间隔时间（秒）
     */
    public onUpdate(_deltaTime: number): void {
        // 子类重写
    }
}
