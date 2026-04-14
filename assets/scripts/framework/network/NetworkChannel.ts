import { Logger } from '../debug/Logger';
import {
    NetworkState,
    NetworkPacket,
    NetworkChannelConfig,
    INetworkSocket,
    IPacketHandler,
    IHeartbeatHandler,
    DEFAULT_CHANNEL_CONFIG,
} from './NetworkDefs';

/**
 * 网络通道回调接口（内部使用）
 * NetworkManager 通过此接口接收通道事件，再转发到 EventManager
 */
export interface NetworkChannelCallbacks {
    /** 连接成功 */
    onConnected(channelName: string): void;
    /** 连接关闭 */
    onClosed(channelName: string, code: number, reason: string): void;
    /** 连接错误 */
    onError(channelName: string, error: Error): void;
    /** 收到消息 */
    onMessage(channelName: string, packet: NetworkPacket): void;
    /** 开始重连 */
    onReconnecting(channelName: string, attempt: number, maxAttempts: number): void;
}

/**
 * 网络通道
 * 封装一条网络连接的完整生命周期：连接、收发消息、心跳检测、断线重连
 *
 * 设计要点：
 * - 双策略注入：INetworkSocket（传输层）+ IPacketHandler（协议层）
 * - 心跳由 update() 驱动（跟随游戏主循环），不用 setInterval
 * - 重连采用指数退避策略，避免雷鸣群效应
 * - 通过 NetworkChannelCallbacks 向上层（NetworkManager）报告事件
 */
export class NetworkChannel {
    private static readonly TAG = 'NetworkChannel';

    // ─── 核心依赖 ──────────────────────────

    /** 通道名称 */
    private readonly _name: string;

    /** Socket 实现（传输层策略） */
    private readonly _socket: INetworkSocket;

    /** 消息包处理器（协议层策略） */
    private readonly _packetHandler: IPacketHandler;

    /** 通道配置 */
    private readonly _config: NetworkChannelConfig;

    /** 事件回调（delegate 到 NetworkManager） */
    private readonly _callbacks: NetworkChannelCallbacks;

    // ─── 可选策略 ──────────────────────────

    /** 心跳处理器 */
    private _heartbeatHandler: IHeartbeatHandler | null = null;

    // ─── 状态 ──────────────────────────────

    /** 当前状态 */
    private _state: NetworkState = NetworkState.Disconnected;

    /** 当前连接的 URL（重连时需要） */
    private _url: string = '';

    /** 用户主动关闭标记（防止触发自动重连） */
    private _userClosed = false;

    // ─── 心跳追踪 ──────────────────────────

    /** 距上次发送心跳的累计时间（秒） */
    private _heartbeatElapsed = 0;

    /** 连续未收到心跳回复的次数 */
    private _missedHeartbeats = 0;

    // ─── 重连追踪 ──────────────────────────

    /** 已重连次数 */
    private _reconnectAttempts = 0;

    /** 距上次重连尝试的累计时间（秒） */
    private _reconnectElapsed = 0;

    /** 当前重连延迟（指数退避递增） */
    private _currentReconnectDelay = 0;

    /**
     * 构造网络通道
     * @param name 通道名称
     * @param socket Socket 实现
     * @param packetHandler 消息包处理器
     * @param callbacks 事件回调
     * @param config 通道配置（可选）
     */
    public constructor(
        name: string,
        socket: INetworkSocket,
        packetHandler: IPacketHandler,
        callbacks: NetworkChannelCallbacks,
        config?: Partial<NetworkChannelConfig>,
    ) {
        this._name = name;
        this._socket = socket;
        this._packetHandler = packetHandler;
        this._callbacks = callbacks;
        this._config = { ...DEFAULT_CHANNEL_CONFIG, ...config };

        this._bindSocketEvents();
    }

    // ─── Getters ──────────────────────────────

    /** 通道名称 */
    public get name(): string {
        return this._name;
    }

    /** 当前状态 */
    public get state(): NetworkState {
        return this._state;
    }

    /** 是否已连接 */
    public get isConnected(): boolean {
        return this._state === NetworkState.Connected;
    }

    /** 通道配置（只读） */
    public get config(): Readonly<NetworkChannelConfig> {
        return this._config;
    }

    // ─── Public API ──────────────────────────

    /**
     * 发起连接
     * 如果已连接或正在连接中，忽略调用
     * @param url 连接地址
     */
    public connect(url: string): void {
        if (this._state === NetworkState.Connected || this._state === NetworkState.Connecting) {
            Logger.debug(NetworkChannel.TAG, `[${this._name}] 已连接或连接中, 忽略`);
            return;
        }

        Logger.debug(NetworkChannel.TAG, `[${this._name}] 发起连接`);
        this._url = url;
        this._userClosed = false;
        this._state = NetworkState.Connecting;
        this._socket.connect(url);
    }

    /**
     * 发送消息
     * @param packet 网络数据包
     * @throws 通道未连接时抛出错误
     */
    public send(packet: NetworkPacket): void {
        if (this._state !== NetworkState.Connected) {
            throw new Error(`[NetworkChannel] 通道 '${this._name}' 未连接，无法发送消息`);
        }

        Logger.debug(NetworkChannel.TAG, `[${this._name}] 发送消息`);
        const data = this._packetHandler.encode(packet);
        this._socket.send(data);
    }

    /**
     * 关闭连接（用户主动关闭，不触发自动重连）
     */
    public close(): void {
        if (this._state === NetworkState.Disconnected) {
            return;
        }

        Logger.debug(NetworkChannel.TAG, `[${this._name}] 用户主动关闭`);
        this._userClosed = true;
        this._resetHeartbeat();
        this._resetReconnect();
        this._socket.close();
    }

    /**
     * 设置心跳处理器
     * @param handler 心跳处理器实现
     */
    public setHeartbeatHandler(handler: IHeartbeatHandler): void {
        this._heartbeatHandler = handler;
    }

    /**
     * 帧更新（由 NetworkManager.onUpdate 调用）
     * 驱动心跳检测和断线重连
     * @param deltaTime 帧间隔（秒）
     */
    public update(deltaTime: number): void {
        if (this._state === NetworkState.Connected) {
            this._updateHeartbeat(deltaTime);
        } else if (this._state === NetworkState.Reconnecting) {
            this._updateReconnect(deltaTime);
        }
    }

    /**
     * 销毁通道（由 NetworkManager 调用）
     * 关闭连接并解绑所有回调
     */
    public shutdown(): void {
        Logger.debug(NetworkChannel.TAG, `[${this._name}] 通道销毁`);
        this._userClosed = true;
        if (this._state !== NetworkState.Disconnected) {
            this._socket.close();
        }
        this._state = NetworkState.Disconnected;
        this._resetHeartbeat();
        this._resetReconnect();
        this._unbindSocketEvents();
    }

    // ─── Socket 事件绑定 ──────────────────────

    /**
     * 绑定 Socket 事件回调
     */
    private _bindSocketEvents(): void {
        this._socket.onOpen = (): void => this._onSocketOpen();
        this._socket.onClose = (code: number, reason: string): void =>
            this._onSocketClose(code, reason);
        this._socket.onMessage = (data: ArrayBuffer): void => this._onSocketMessage(data);
        this._socket.onError = (error: Error): void => this._onSocketError(error);
    }

    /**
     * 解绑 Socket 事件回调
     */
    private _unbindSocketEvents(): void {
        this._socket.onOpen = null;
        this._socket.onClose = null;
        this._socket.onMessage = null;
        this._socket.onError = null;
    }

    /**
     * Socket 连接成功
     */
    private _onSocketOpen(): void {
        Logger.debug(NetworkChannel.TAG, `[${this._name}] Socket 已连接`);
        this._state = NetworkState.Connected;
        this._resetHeartbeat();
        this._resetReconnect();
        this._callbacks.onConnected(this._name);
    }

    /**
     * Socket 连接关闭
     */
    private _onSocketClose(code: number, reason: string): void {
        Logger.debug(NetworkChannel.TAG, `[${this._name}] Socket 关闭`);
        this._resetHeartbeat();

        if (
            !this._userClosed &&
            this._config.autoReconnect &&
            this._reconnectAttempts < this._config.maxReconnectAttempts
        ) {
            this._startReconnect();
        } else {
            this._state = NetworkState.Disconnected;
            this._userClosed = false;
        }

        this._callbacks.onClosed(this._name, code, reason);
    }

    /**
     * Socket 收到数据
     */
    private _onSocketMessage(data: ArrayBuffer): void {
        const packet = this._packetHandler.decode(data);

        // 心跳回复包由通道内部消化，不往上层传
        if (this._heartbeatHandler?.isHeartbeatResponse(packet)) {
            this._missedHeartbeats = 0;
            return;
        }

        this._callbacks.onMessage(this._name, packet);
    }

    /**
     * Socket 错误
     */
    private _onSocketError(error: Error): void {
        Logger.warn(NetworkChannel.TAG, `[${this._name}] Socket 错误`, error);
        this._callbacks.onError(this._name, error);
    }

    // ─── 心跳逻辑 ──────────────────────────

    /**
     * 更新心跳检测
     * 累计 deltaTime，到达心跳间隔后发送心跳包并检查超时
     */
    private _updateHeartbeat(deltaTime: number): void {
        if (!this._heartbeatHandler || this._config.heartbeatInterval <= 0) {
            return;
        }

        this._heartbeatElapsed += deltaTime;
        if (this._heartbeatElapsed >= this._config.heartbeatInterval) {
            this._heartbeatElapsed = 0;
            this._missedHeartbeats++;

            // 超过丢失次数阈值，判定断线
            if (this._missedHeartbeats >= this._config.missHeartbeatCountToClose) {
                Logger.warn(NetworkChannel.TAG, `[${this._name}] 心跳超时, 断开连接`);
                this._socket.close();
                return;
            }

            // 发送心跳包
            const heartbeatPacket = this._heartbeatHandler.createHeartbeatPacket();
            const encoded = this._packetHandler.encode(heartbeatPacket);
            this._socket.send(encoded);
        }
    }

    /** 重置心跳状态 */
    private _resetHeartbeat(): void {
        this._heartbeatElapsed = 0;
        this._missedHeartbeats = 0;
    }

    // ─── 重连逻辑 ──────────────────────────

    /**
     * 开始重连流程
     * 进入 Reconnecting 状态，计算指数退避延迟
     */
    private _startReconnect(): void {
        Logger.info(NetworkChannel.TAG, `[${this._name}] 开始重连`);
        this._state = NetworkState.Reconnecting;
        this._reconnectAttempts++;
        // 指数退避：baseDelay * 2^(attempt - 1)
        this._currentReconnectDelay =
            this._config.reconnectBaseDelay * Math.pow(2, this._reconnectAttempts - 1);
        this._reconnectElapsed = 0;
        this._callbacks.onReconnecting(
            this._name,
            this._reconnectAttempts,
            this._config.maxReconnectAttempts,
        );
    }

    /**
     * 更新重连倒计时
     * 累计 deltaTime，到达延迟后发起重连
     */
    private _updateReconnect(deltaTime: number): void {
        this._reconnectElapsed += deltaTime;
        if (this._reconnectElapsed >= this._currentReconnectDelay) {
            this._state = NetworkState.Connecting;
            this._socket.connect(this._url);
        }
    }

    /** 重置重连状态 */
    private _resetReconnect(): void {
        this._reconnectAttempts = 0;
        this._reconnectElapsed = 0;
        this._currentReconnectDelay = 0;
    }
}
