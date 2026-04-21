/**
 * Demo 基类
 * 所有 Demo 示例的抽象基类，提供通用的生命周期管理
 * 
 * @description
 * 为 Demo 0 基础设施测试提供统一的基类接口。
 * 所有 Demo 类应继承此类，实现标准化的启动、运行和清理流程。
 */
export abstract class DemoBase {
    private static readonly TAG = 'DemoBase';

    /** Demo 是否已启动 */
    protected _isRunning: boolean = false;

    // Constructor
    constructor() {
        // 基类初始化
    }

    /**
     * 启动 Demo
     * @description 初始化并启动 Demo 示例
     */
    public abstract start(): void;

    /**
     * 停止 Demo
     * @description 停止 Demo 并清理资源
     */
    public abstract stop(): void;

    /**
     * 获取 Demo 运行状态
     * @returns 是否正在运行
     */
    public get isRunning(): boolean {
        return this._isRunning;
    }
}
