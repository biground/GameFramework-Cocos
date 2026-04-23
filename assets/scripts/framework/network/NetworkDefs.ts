import { EventKey } from '../event/EventDefs';

// ─── 枚举 ──────────────────────────────────────────────

/**
 * 网络通道状态
 */
export enum NetworkState {
    /** 已断开 */
    Disconnected = 0,
    /** 连接中 */
    Connecting = 1,
    /** 已连接 */
    Connected = 2,
    /** 重连中（等待下一次重连尝试） */
    Reconnecting = 3,
}

// ─── 数据结构 ──────────────────────────────────────────

/**
 * 网络数据包
 * 上层业务的最小通信单元
 */
export interface NetworkPacket {
    /** 消息 ID / 命令号 */
    id: number;
    /** 消息体（二进制数据） */
    data: Uint8Array;
}

/**
 * 网络通道配置
 */
export interface NetworkChannelConfig {
    /** 心跳间隔（秒），0 表示不发心跳，默认 10 */
    heartbeatInterval: number;
    /** 连续丢失心跳次数后判定断线，默认 3 */
    missHeartbeatCountToClose: number;
    /** 是否启用自动重连，默认 true */
    autoReconnect: boolean;
    /** 最大重连次数，默认 5 */
    maxReconnectAttempts: number;
    /** 初始重连延迟（秒），指数退避基数，默认 1 */
    reconnectBaseDelay: number;
}

/**
 * 默认通道配置
 */
export const DEFAULT_CHANNEL_CONFIG: Readonly<NetworkChannelConfig> = {
    heartbeatInterval: 10,
    missHeartbeatCountToClose: 3,
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectBaseDelay: 1,
};

// ─── 策略接口 ──────────────────────────────────────────

/**
 * 网络 Socket 接口（传输层策略）
 * Framework 层定义契约，Runtime 层提供平台实现
 *
 * @example
 * ```typescript
 * // Runtime 层实现
 * class CocosWebSocket implements INetworkSocket {
 *     private _ws: WebSocket | null = null;
 *     connect(url: string): void { this._ws = new WebSocket(url); ... }
 *     send(data: ArrayBuffer | Uint8Array): void { this._ws?.send(data); }
 *     close(): void { this._ws?.close(); }
 *     onOpen: (() => void) | null = null;
 *     onClose: ((code: number, reason: string) => void) | null = null;
 *     onMessage: ((data: ArrayBuffer) => void) | null = null;
 *     onError: ((error: Error) => void) | null = null;
 * }
 * ```
 */
export interface INetworkSocket {
    /** 发起连接 */
    connect(url: string): void;
    /** 发送二进制数据 */
    send(data: ArrayBuffer | Uint8Array): void;
    /** 关闭连接 */
    close(): void;

    /** 连接成功回调 */
    onOpen: (() => void) | null;
    /** 连接关闭回调 */
    onClose: ((code: number, reason: string) => void) | null;
    /** 收到数据回调 */
    onMessage: ((data: ArrayBuffer) => void) | null;
    /** 连接错误回调 */
    onError: ((error: Error) => void) | null;
}

/**
 * 消息包处理器接口（协议层策略）
 * 负责 NetworkPacket ↔ 二进制 的编解码
 *
 * @example
 * ```typescript
 * class JsonPacketHandler implements IPacketHandler {
 *     encode(packet: NetworkPacket): ArrayBuffer {
 *         const json = JSON.stringify({ id: packet.id, data: Array.from(packet.data) });
 *         return new TextEncoder().encode(json).buffer;
 *     }
 *     decode(data: ArrayBuffer): NetworkPacket {
 *         const json = new TextDecoder().decode(data);
 *         const obj = JSON.parse(json);
 *         return { id: obj.id, data: new Uint8Array(obj.data) };
 *     }
 * }
 * ```
 */
export interface IPacketHandler {
    /** 编码：NetworkPacket → 二进制 */
    encode(packet: NetworkPacket): ArrayBuffer;
    /** 解码：二进制 → NetworkPacket */
    decode(data: ArrayBuffer): NetworkPacket;
}

/**
 * 心跳处理器接口（可选策略）
 * 如不设置心跳处理器，即使 heartbeatInterval > 0 也不会发送心跳
 */
export interface IHeartbeatHandler {
    /** 创建心跳请求包 */
    createHeartbeatPacket(): NetworkPacket;
    /** 判断收到的包是否为心跳回复 */
    isHeartbeatResponse(packet: NetworkPacket): boolean;
}

// ─── 事件数据 ──────────────────────────────────────────

/**
 * 网络事件基础数据
 */
export interface NetworkEventData {
    /** 通道名称 */
    channelName: string;
}

/**
 * 连接成功事件数据
 */
export interface NetworkConnectedEventData extends NetworkEventData {}

/**
 * 连接关闭事件数据
 */
export interface NetworkClosedEventData extends NetworkEventData {
    /** 关闭码 */
    code: number;
    /** 关闭原因 */
    reason: string;
}

/**
 * 连接错误事件数据
 */
export interface NetworkErrorEventData extends NetworkEventData {
    /** 错误对象 */
    error: Error;
}

/**
 * 收到消息事件数据
 */
export interface NetworkMessageEventData extends NetworkEventData {
    /** 网络数据包 */
    packet: NetworkPacket;
}

/**
 * 重连中事件数据
 */
export interface NetworkReconnectingEventData extends NetworkEventData {
    /** 当前重连次数 */
    attempt: number;
    /** 最大重连次数 */
    maxAttempts: number;
}

// ─── 事件键 ──────────────────────────────────────────

/** 网络连接成功事件 */
export const NETWORK_CONNECTED = new EventKey<NetworkConnectedEventData>('Network.Connected');

/** 网络连接关闭事件 */
export const NETWORK_CLOSED = new EventKey<NetworkClosedEventData>('Network.Closed');

/** 网络连接错误事件 */
export const NETWORK_ERROR = new EventKey<NetworkErrorEventData>('Network.Error');

/** 收到网络消息事件 */
export const NETWORK_MESSAGE = new EventKey<NetworkMessageEventData>('Network.Message');

/** 网络重连中事件 */
export const NETWORK_RECONNECTING = new EventKey<NetworkReconnectingEventData>(
    'Network.Reconnecting',
);
