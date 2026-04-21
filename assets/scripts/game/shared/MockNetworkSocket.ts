import { INetworkSocket } from '@framework/network/NetworkDefs';
import { Logger } from '@framework/debug/Logger';

/** 发送历史记录条目 */
interface SendHistoryEntry {
    /** 发送的数据 */
    data: ArrayBuffer | Uint8Array;
    /** 发送时间戳（ms） */
    timestamp: number;
}

/** 自动响应处理函数，接收原始请求数据，返回响应数据 */
type AutoResponseHandler = (requestData: ArrayBuffer) => ArrayBuffer;

/**
 * 模拟网络 Socket
 * 用于 Demo 和测试环境的网络通信模拟
 *
 * @description
 * 实现 INetworkSocket 接口，在不依赖真实网络连接的情况下
 * 模拟 WebSocket 行为，支持延迟模拟、丢包模拟、自动响应等功能。
 */
export class MockNetworkSocket implements INetworkSocket {
    private static readonly TAG = 'MockNetworkSocket';

    /** 连接状态 */
    private _connected: boolean = false;

    /** 连接 URL */
    private _url: string = '';

    /** 延迟范围 [最小ms, 最大ms] */
    private _latencyRange: [number, number] = [0, 0];

    /** 丢包率 0~1 */
    private _packetLossRate: number = 0;

    /** 自动响应映射：requestId → 处理函数 */
    private _autoResponses: Map<number, AutoResponseHandler> = new Map();

    /** 发送历史 */
    private _sendHistory: SendHistoryEntry[] = [];

    /** 待清理的定时器 ID 集合 */
    private _pendingTimers: Set<ReturnType<typeof setTimeout>> = new Set();

    // ─── INetworkSocket 回调属性 ─────────────────────────

    /** 连接成功回调 */
    public onOpen: (() => void) | null = null;
    /** 连接关闭回调 */
    public onClose: ((code: number, reason: string) => void) | null = null;
    /** 收到数据回调 */
    public onMessage: ((data: ArrayBuffer) => void) | null = null;
    /** 连接错误回调 */
    public onError: ((error: Error) => void) | null = null;

    // ─── INetworkSocket 核心方法 ─────────────────────────

    /**
     * 发起连接（模拟）
     * @param url 服务器地址
     */
    public connect(url: string): void {
        if (this._connected) {
            Logger.warn(MockNetworkSocket.TAG, `已处于连接状态，忽略重复连接: ${url}`);
            return;
        }
        Logger.debug(MockNetworkSocket.TAG, `connect: ${url}`);
        this._url = url;
        this._scheduleCallback(() => {
            this._connected = true;
            this.onOpen?.();
        });
    }

    /**
     * 发送二进制数据（模拟）
     * @param data 要发送的数据
     */
    public send(data: ArrayBuffer | Uint8Array): void {
        if (!this._connected) {
            this.onError?.(new Error('[MockNetworkSocket] 未连接，无法发送数据'));
            return;
        }

        // 记录发送历史
        this._sendHistory.push({ data, timestamp: Date.now() });

        // 丢包模拟
        if (this._packetLossRate > 0 && Math.random() < this._packetLossRate) {
            Logger.debug(MockNetworkSocket.TAG, '模拟丢包，数据未发送');
            return;
        }

        Logger.debug(MockNetworkSocket.TAG, `send: ${data.byteLength} bytes`);

        // 自动响应检查：统一转为 ArrayBuffer
        const buffer = data instanceof ArrayBuffer
            ? data
            : new Uint8Array(data).buffer as ArrayBuffer;
        if (buffer.byteLength >= 4) {
            const view = new DataView(buffer);
            const requestId = view.getUint32(0);
            const handler = this._autoResponses.get(requestId);
            if (handler) {
                Logger.debug(MockNetworkSocket.TAG, `自动响应匹配 requestId=${requestId}`);
                const response = handler(buffer);
                this._scheduleCallback(() => {
                    if (this._connected) {
                        this.onMessage?.(response);
                    }
                });
            }
        }
    }

    /**
     * 关闭连接（模拟）
     */
    public close(): void {
        if (!this._connected) {
            Logger.warn(MockNetworkSocket.TAG, '未处于连接状态，忽略关闭操作');
            return;
        }
        Logger.debug(MockNetworkSocket.TAG, 'close');
        this._connected = false;
        this._clearPendingTimers();
        this.onClose?.(1000, 'Normal closure');
    }

    // ─── 状态查询 ────────────────────────────────────────

    /**
     * 获取连接状态
     */
    public get isConnected(): boolean {
        return this._connected;
    }

    /**
     * 获取发送历史记录
     */
    public get sendHistory(): ReadonlyArray<SendHistoryEntry> {
        return this._sendHistory;
    }

    /**
     * 获取当前连接 URL
     */
    public get url(): string {
        return this._url;
    }

    // ─── 模拟控制 ────────────────────────────────────────

    /**
     * 设置延迟范围
     * @param min 最小延迟（ms）
     * @param max 最大延迟（ms）
     */
    public setLatencyRange(min: number, max: number): void {
        if (min < 0 || max < 0 || min > max) {
            Logger.warn(MockNetworkSocket.TAG, `无效的延迟范围: [${min}, ${max}]`);
            return;
        }
        this._latencyRange = [min, max];
        Logger.debug(MockNetworkSocket.TAG, `setLatencyRange: [${min}, ${max}]ms`);
    }

    /**
     * 设置丢包率
     * @param rate 丢包率，取值范围 0~1
     */
    public setPacketLossRate(rate: number): void {
        if (rate < 0 || rate > 1) {
            Logger.warn(MockNetworkSocket.TAG, `无效的丢包率: ${rate}，应在 0~1 之间`);
            return;
        }
        this._packetLossRate = rate;
        Logger.debug(MockNetworkSocket.TAG, `setPacketLossRate: ${rate}`);
    }

    /**
     * 注册自动响应处理器
     * 当收到的数据前 4 字节（Uint32）匹配 requestId 时，自动调用 handler 生成响应
     * @param requestId 请求 ID
     * @param handler 响应生成函数
     */
    public registerAutoResponse(requestId: number, handler: AutoResponseHandler): void {
        this._autoResponses.set(requestId, handler);
        Logger.debug(MockNetworkSocket.TAG, `registerAutoResponse: requestId=${requestId}`);
    }

    /**
     * 模拟断开连接（不触发正常关闭流程）
     * 模拟网络异常断开场景
     */
    public simulateDisconnect(): void {
        if (!this._connected) {
            Logger.warn(MockNetworkSocket.TAG, '未处于连接状态，无法模拟断开');
            return;
        }
        Logger.debug(MockNetworkSocket.TAG, 'simulateDisconnect');
        this._connected = false;
        this._clearPendingTimers();
        this.onClose?.(1006, 'Simulated abnormal disconnect');
    }

    /**
     * 模拟重新连接
     * 恢复到已连接状态并触发 onOpen 回调
     */
    public simulateReconnect(): void {
        if (this._connected) {
            Logger.warn(MockNetworkSocket.TAG, '已处于连接状态，无需重连');
            return;
        }
        if (!this._url) {
            this.onError?.(new Error('[MockNetworkSocket] 无法重连，未记录连接地址'));
            return;
        }
        Logger.debug(MockNetworkSocket.TAG, `simulateReconnect: ${this._url}`);
        this._scheduleCallback(() => {
            this._connected = true;
            this.onOpen?.();
        });
    }

    /**
     * 模拟收到外部消息
     * 用于测试中注入服务端推送数据
     * @param data 接收到的数据
     */
    public simulateIncomingMessage(data: ArrayBuffer): void {
        if (!this._connected) {
            Logger.warn(MockNetworkSocket.TAG, '未处于连接状态，忽略注入消息');
            return;
        }
        Logger.debug(MockNetworkSocket.TAG, `simulateIncomingMessage: ${data.byteLength} bytes`);
        this._scheduleCallback(() => {
            if (this._connected) {
                this.onMessage?.(data);
            }
        });
    }

    /**
     * 清空发送历史
     */
    public clearSendHistory(): void {
        this._sendHistory.length = 0;
    }

    /**
     * 移除指定的自动响应处理器
     * @param requestId 请求 ID
     */
    public removeAutoResponse(requestId: number): void {
        this._autoResponses.delete(requestId);
    }

    // ─── 内部辅助 ────────────────────────────────────────

    /**
     * 根据延迟范围计算随机延迟
     */
    private _getRandomLatency(): number {
        const [min, max] = this._latencyRange;
        if (min === 0 && max === 0) {
            return 0;
        }
        return min + Math.random() * (max - min);
    }

    /**
     * 调度回调，应用延迟模拟
     */
    private _scheduleCallback(callback: () => void): void {
        const delay = this._getRandomLatency();
        if (delay > 0) {
            const timerId = setTimeout(() => {
                this._pendingTimers.delete(timerId);
                callback();
            }, delay);
            this._pendingTimers.add(timerId);
        } else {
            callback();
        }
    }

    /**
     * 清理所有待执行的定时器
     */
    private _clearPendingTimers(): void {
        for (const timerId of this._pendingTimers) {
            clearTimeout(timerId);
        }
        this._pendingTimers.clear();
    }
}
