import { INetworkSocket } from '@framework/network/NetworkDefs';

/**
 * 模拟网络 Socket
 * 用于 Demo 和测试环境的网络通信模拟
 * 
 * @description
 * 实现 INetworkSocket 接口，在不依赖真实网络连接的情况下
 * 模拟 WebSocket 行为，用于单元测试和 Demo 演示。
 */
export class MockNetworkSocket implements INetworkSocket {
    private static readonly TAG = 'MockNetworkSocket';

    /** 连接状态 */
    private _connected: boolean = false;

    /** 连接 URL */
    private _url: string = '';

    // 回调属性
    public onOpen: (() => void) | null = null;
    public onClose: ((code: number, reason: string) => void) | null = null;
    public onMessage: ((data: ArrayBuffer) => void) | null = null;
    public onError: ((error: Error) => void) | null = null;

    // Constructor
    constructor() {
        // TODO: 初始化网络 Socket 配置
    }

    /**
     * 发起连接（模拟）
     * @param url 服务器地址
     */
    public connect(url: string): void {
        // TODO: 实现模拟连接逻辑
        this._url = url;
        this._connected = true;
        this.onOpen?.();
    }

    /**
     * 发送二进制数据（模拟）
     * @param data 要发送的数据
     */
    public send(_data: ArrayBuffer | Uint8Array): void {
        // TODO: 实现模拟发送逻辑
        if (!this._connected) {
            this.onError?.(new Error('[MockNetworkSocket] 未连接'));
        }
    }

    /**
     * 关闭连接（模拟）
     */
    public close(): void {
        // TODO: 实现模拟关闭逻辑
        if (this._connected) {
            this._connected = false;
            this.onClose?.(1000, 'Normal closure');
        }
    }

    /**
     * 模拟接收消息（仅用于测试）
     * @param data 接收到的数据
     */
    public simulateMessage(data: ArrayBuffer): void {
        this.onMessage?.(data);
    }

    /**
     * 获取连接状态
     * @returns 是否已连接
     */
    public get isConnected(): boolean {
        return this._connected;
    }
}
