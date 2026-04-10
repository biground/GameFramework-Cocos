import { ModuleBase } from '../core/ModuleBase';
import { IEventManager } from '../interfaces/IEventManager';
import { INetworkManager } from '../interfaces/INetworkManager';
import { NetworkChannel, NetworkChannelCallbacks } from './NetworkChannel';
import {
    NetworkChannelConfig,
    INetworkSocket,
    IPacketHandler,
    IHeartbeatHandler,
    NETWORK_CONNECTED,
    NETWORK_CLOSED,
    NETWORK_ERROR,
    NETWORK_MESSAGE,
    NETWORK_RECONNECTING,
} from './NetworkDefs';

/**
 * 网络管理器
 * 统一管理多个网络通道的生命周期，并将网络事件转发到 EventManager
 *
 * 设计要点：
 * - 支持多通道（Channel）：游戏服、聊天服、推送服等各自独立
 * - 通过 EventManager 分发网络事件，业务层只需 on(NETWORK_MESSAGE, handler)
 * - onUpdate() 驱动所有通道的心跳检测和断线重连
 * - 双策略注入：INetworkSocket（传输层）+ IPacketHandler（协议层）
 * - Priority = 110（核心服务层，在 EventManager 之后）
 */
export class NetworkManager extends ModuleBase implements INetworkManager, NetworkChannelCallbacks {
    public get moduleName(): string {
        return 'NetworkManager';
    }

    public get priority(): number {
        return 110;
    }

    /** 通道注册表：channelName → NetworkChannel */
    private readonly _channels: Map<string, NetworkChannel> = new Map();

    /** 事件管理器引用（可选，未设置时事件静默丢弃） */
    private _eventManager: IEventManager | null = null;

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        // 初始化状态重置
        this._channels.clear();
    }

    public onUpdate(deltaTime: number): void {
        for (const channel of this._channels.values()) {
            channel.update(deltaTime);
        }
    }

    public onShutdown(): void {
        for (const channel of this._channels.values()) {
            channel.shutdown();
        }
        this._channels.clear();
    }

    // ─── EventManager 注入 ──────────────────────────

    /**
     * 设置事件管理器（用于分发网络事件）
     * 建议在 onInit 之后、createChannel 之前调用
     * @param eventManager 事件管理器实例
     */
    public setEventManager(eventManager: IEventManager): void {
        if (!eventManager) {
            throw new Error('[NetworkManager] eventManager 不能为空');
        }
        this._eventManager = eventManager;
    }

    // ─── INetworkManager 实现 ──────────────────────────

    /**
     * 创建网络通道
     */
    public createChannel(
        name: string,
        socket: INetworkSocket,
        packetHandler: IPacketHandler,
        config?: Partial<NetworkChannelConfig>,
    ): NetworkChannel {
        if (!name) {
            throw new Error('[NetworkManager] 通道名称不能为空');
        }
        if (this._channels.has(name)) {
            throw new Error(`[NetworkManager] 通道 '${name}' 已存在，不能重复创建`);
        }
        if (!socket) {
            throw new Error('[NetworkManager] socket 不能为空');
        }
        if (!packetHandler) {
            throw new Error('[NetworkManager] packetHandler 不能为空');
        }

        const channel = new NetworkChannel(
            name,
            socket,
            packetHandler,
            this, // NetworkManager 自身作为 callbacks
            config,
        );
        this._channels.set(name, channel);
        return channel;
    }

    /**
     * 销毁网络通道
     */
    public destroyChannel(name: string): void {
        const channel = this._channels.get(name);
        if (!channel) {
            throw new Error(`[NetworkManager] 通道 '${name}' 不存在，无法销毁`);
        }
        channel.shutdown();
        this._channels.delete(name);
    }

    /**
     * 获取网络通道
     */
    public getChannel(name: string): NetworkChannel | undefined {
        return this._channels.get(name);
    }

    /**
     * 查询通道是否存在
     */
    public hasChannel(name: string): boolean {
        return this._channels.has(name);
    }

    /**
     * 获取当前通道数量
     */
    public getChannelCount(): number {
        return this._channels.size;
    }

    /**
     * 为指定通道设置心跳处理器
     */
    public setHeartbeatHandler(channelName: string, handler: IHeartbeatHandler): void {
        const channel = this._channels.get(channelName);
        if (!channel) {
            throw new Error(`[NetworkManager] 通道 '${channelName}' 不存在，无法设置心跳处理器`);
        }
        channel.setHeartbeatHandler(handler);
    }

    // ─── NetworkChannelCallbacks 实现 ──────────────────

    /**
     * 通道连接成功回调
     */
    public onConnected(channelName: string): void {
        this._eventManager?.emit(NETWORK_CONNECTED, { channelName });
    }

    /**
     * 通道连接关闭回调
     */
    public onClosed(channelName: string, code: number, reason: string): void {
        this._eventManager?.emit(NETWORK_CLOSED, {
            channelName,
            code,
            reason,
        });
    }

    /**
     * 通道连接错误回调
     */
    public onError(channelName: string, error: Error): void {
        this._eventManager?.emit(NETWORK_ERROR, { channelName, error });
    }

    /**
     * 通道收到消息回调
     */
    public onMessage(channelName: string, packet: { id: number; data: Uint8Array }): void {
        this._eventManager?.emit(NETWORK_MESSAGE, { channelName, packet });
    }

    /**
     * 通道重连中回调
     */
    public onReconnecting(channelName: string, attempt: number, maxAttempts: number): void {
        this._eventManager?.emit(NETWORK_RECONNECTING, {
            channelName,
            attempt,
            maxAttempts,
        });
    }
}
