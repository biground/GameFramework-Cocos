import { NetworkManager } from '@framework/network/NetworkManager';
import { NetworkChannel } from '@framework/network/NetworkChannel';
import {
    NetworkState,
    NetworkPacket,
    INetworkSocket,
    IPacketHandler,
    IHeartbeatHandler,
    NETWORK_CONNECTED,
    NETWORK_CLOSED,
    NETWORK_ERROR,
    NETWORK_MESSAGE,
    NETWORK_RECONNECTING,
    NetworkConnectedEventData,
    NetworkClosedEventData,
    NetworkErrorEventData,
    NetworkMessageEventData,
    NetworkReconnectingEventData,
} from '@framework/network/NetworkDefs';
import { EventKey, EventCallback } from '@framework/event/EventDefs';
import { IEventManager } from '@framework/interfaces/IEventManager';

// ─── Mock 工具 ──────────────────────────────────────

/**
 * 可控制的 MockSocket
 * 连接/关闭不会立即触发回调，需要手动调用 simulateXxx 方法
 */
class MockSocket implements INetworkSocket {
    /** 记录连接地址 */
    readonly connectCalls: string[] = [];
    /** 记录发送的数据 */
    readonly sendCalls: (ArrayBuffer | Uint8Array)[] = [];
    /** 记录 close 调用次数 */
    closeCalls = 0;

    onOpen: (() => void) | null = null;
    onClose: ((code: number, reason: string) => void) | null = null;
    onMessage: ((data: ArrayBuffer) => void) | null = null;
    onError: ((error: Error) => void) | null = null;

    connect(url: string): void {
        this.connectCalls.push(url);
    }

    send(data: ArrayBuffer | Uint8Array): void {
        this.sendCalls.push(data);
    }

    close(): void {
        this.closeCalls++;
    }

    // ─── 手动触发回调 ──────────────

    /** 模拟连接成功 */
    simulateOpen(): void {
        this.onOpen?.();
    }

    /** 模拟连接关闭 */
    simulateClose(code = 1000, reason = 'normal'): void {
        this.onClose?.(code, reason);
    }

    /** 模拟收到消息 */
    simulateMessage(data: ArrayBuffer): void {
        this.onMessage?.(data);
    }

    /** 模拟连接错误 */
    simulateError(error: Error = new Error('socket error')): void {
        this.onError?.(error);
    }
}

/**
 * 自动连接成功的 MockSocket
 * connect() 调用后立即触发 onOpen
 */
class AutoConnectSocket implements INetworkSocket {
    onOpen: (() => void) | null = null;
    onClose: ((code: number, reason: string) => void) | null = null;
    onMessage: ((data: ArrayBuffer) => void) | null = null;
    onError: ((error: Error) => void) | null = null;

    connect(_url: string): void {
        this.onOpen?.();
    }

    send(_data: ArrayBuffer | Uint8Array): void {}

    close(): void {
        this.onClose?.(1000, 'normal');
    }
}

/**
 * 简单的 MockPacketHandler
 * 使用 JSON 序列化/反序列化（仅用于测试）
 */
class MockPacketHandler implements IPacketHandler {
    encode(packet: NetworkPacket): ArrayBuffer {
        const json = JSON.stringify({
            id: packet.id,
            data: Array.from(packet.data),
        });
        return new TextEncoder().encode(json).buffer;
    }

    decode(data: ArrayBuffer): NetworkPacket {
        const json = new TextDecoder().decode(data);
        const obj = JSON.parse(json) as { id: number; data: number[] };
        return { id: obj.id, data: new Uint8Array(obj.data) };
    }
}

/**
 * MockHeartbeatHandler
 * 心跳包 id = 0，心跳回复包 id = 0
 */
class MockHeartbeatHandler implements IHeartbeatHandler {
    createHeartbeatPacket(): NetworkPacket {
        return { id: 0, data: new Uint8Array(0) };
    }

    isHeartbeatResponse(packet: NetworkPacket): boolean {
        return packet.id === 0;
    }
}

/**
 * MockEventManager
 * 记录所有 emit 调用，用于验证事件发射
 */
class MockEventManager implements IEventManager {
    readonly emitCalls: Array<{ key: EventKey<unknown>; data: unknown }> = [];

    on<T>(_key: EventKey<T>, _callback: EventCallback<T>, _caller?: unknown): void {}
    once<T>(_key: EventKey<T>, _callback: EventCallback<T>, _caller?: unknown): void {}
    off<T>(_key: EventKey<T>, _callback: EventCallback<T>, _caller?: unknown): void {}
    offAll(_key?: EventKey<unknown>): void {}
    offByCaller(_caller: unknown): void {}

    emit<T>(key: EventKey<T>, ...args: [T] extends [void] ? [] : [data: T]): void {
        this.emitCalls.push({ key: key as EventKey<unknown>, data: args[0] });
    }

    /** 获取指定事件键的所有 emit 数据 */
    getEmits<T>(key: EventKey<T>): T[] {
        return this.emitCalls.filter((c) => c.key === key).map((c) => c.data as T);
    }

    /** 重置记录 */
    reset(): void {
        this.emitCalls.length = 0;
    }
}

// ─── 公共辅助 ──────────────────────────────────────

/** 创建一个已初始化的 NetworkManager */
function createManager(eventManager?: MockEventManager): {
    manager: NetworkManager;
    eventManager: MockEventManager;
} {
    const em = eventManager ?? new MockEventManager();
    const manager = new NetworkManager();
    manager.onInit();
    manager.setEventManager(em);
    return { manager, eventManager: em };
}

/** 创建一个 mock 数据包的 ArrayBuffer */
function createPacketBuffer(id: number, payload: number[] = []): ArrayBuffer {
    const handler = new MockPacketHandler();
    return handler.encode({ id, data: new Uint8Array(payload) });
}

// ─── 测试 ──────────────────────────────────────────

describe('NetworkManager', () => {
    // ━━━ 基础生命周期 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    describe('生命周期', () => {
        it('onInit 应重置通道注册表', () => {
            const { manager } = createManager();
            const socket = new AutoConnectSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('ch1', socket, handler);
            expect(manager.getChannelCount()).toBe(1);

            manager.onInit();
            expect(manager.getChannelCount()).toBe(0);
        });

        it('onShutdown 应关闭所有通道并清空', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('ch1', socket, handler);
            manager.createChannel('ch2', new MockSocket(), handler);

            manager.onShutdown();
            expect(manager.getChannelCount()).toBe(0);
            expect(socket.closeCalls).toBe(0); // shutdown 调用 channel.shutdown()，但 channel 未连接无需 close
        });

        it('onShutdown 应关闭已连接的通道', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('ch1', socket, handler);

            // 模拟连接
            const channel = manager.getChannel('ch1')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            expect(channel.isConnected).toBe(true);

            manager.onShutdown();
            expect(socket.closeCalls).toBe(1);
        });
    });

    // ━━━ 通道管理 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    describe('通道管理', () => {
        it('createChannel 应创建并返回通道', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();

            const channel = manager.createChannel('game', socket, handler);
            expect(channel).toBeInstanceOf(NetworkChannel);
            expect(channel.name).toBe('game');
            expect(manager.hasChannel('game')).toBe(true);
            expect(manager.getChannelCount()).toBe(1);
        });

        it('createChannel 应支持自定义配置', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();

            const channel = manager.createChannel('game', socket, handler, {
                heartbeatInterval: 5,
                maxReconnectAttempts: 3,
            });
            expect(channel.config.heartbeatInterval).toBe(5);
            expect(channel.config.maxReconnectAttempts).toBe(3);
            // 默认值应保留
            expect(channel.config.autoReconnect).toBe(true);
        });

        it('createChannel 重复名称应抛出错误', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            expect(() => manager.createChannel('game', socket, handler)).toThrow(
                "通道 'game' 已存在",
            );
        });

        it('createChannel 空名称应抛出错误', () => {
            const { manager } = createManager();
            expect(() =>
                manager.createChannel('', new MockSocket(), new MockPacketHandler()),
            ).toThrow('通道名称不能为空');
        });

        it('createChannel null socket 应抛出错误', () => {
            const { manager } = createManager();
            expect(() =>
                manager.createChannel(
                    'game',
                    null as unknown as INetworkSocket,
                    new MockPacketHandler(),
                ),
            ).toThrow('socket 不能为空');
        });

        it('createChannel null packetHandler 应抛出错误', () => {
            const { manager } = createManager();
            expect(() =>
                manager.createChannel('game', new MockSocket(), null as unknown as IPacketHandler),
            ).toThrow('packetHandler 不能为空');
        });

        it('destroyChannel 应关闭并移除通道', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            manager.destroyChannel('game');
            expect(manager.hasChannel('game')).toBe(false);
            expect(manager.getChannelCount()).toBe(0);
        });

        it('destroyChannel 不存在的通道应抛出错误', () => {
            const { manager } = createManager();
            expect(() => manager.destroyChannel('nonexistent')).toThrow(
                "通道 'nonexistent' 不存在",
            );
        });

        it('getChannel 应返回正确通道', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game');
            expect(channel).toBeDefined();
            expect(channel!.name).toBe('game');
        });

        it('getChannel 不存在的通道应返回 undefined', () => {
            const { manager } = createManager();
            expect(manager.getChannel('nonexistent')).toBeUndefined();
        });

        it('hasChannel 应正确判断', () => {
            const { manager } = createManager();
            expect(manager.hasChannel('game')).toBe(false);

            manager.createChannel('game', new MockSocket(), new MockPacketHandler());
            expect(manager.hasChannel('game')).toBe(true);
        });

        it('应支持多个通道', () => {
            const { manager } = createManager();
            const handler = new MockPacketHandler();
            manager.createChannel('game', new MockSocket(), handler);
            manager.createChannel('chat', new MockSocket(), handler);
            manager.createChannel('push', new MockSocket(), handler);

            expect(manager.getChannelCount()).toBe(3);
            expect(manager.hasChannel('game')).toBe(true);
            expect(manager.hasChannel('chat')).toBe(true);
            expect(manager.hasChannel('push')).toBe(true);
        });
    });

    // ━━━ EventManager 注入 ━━━━━━━━━━━━━━━━━━━━━━

    describe('EventManager 注入', () => {
        it('setEventManager null 应抛出错误', () => {
            const manager = new NetworkManager();
            manager.onInit();
            expect(() => manager.setEventManager(null as unknown as IEventManager)).toThrow(
                'eventManager 不能为空',
            );
        });

        it('未设置 EventManager 时事件应静默丢弃（不报错）', () => {
            const manager = new NetworkManager();
            manager.onInit();
            // 不调用 setEventManager
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            // 不应抛出错误
            expect(() => socket.simulateOpen()).not.toThrow();
        });
    });

    // ━━━ 连接与断开 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    describe('连接与断开', () => {
        it('connect 应发起连接', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            channel.connect('ws://localhost:8080');

            expect(socket.connectCalls).toEqual(['ws://localhost:8080']);
            expect(channel.state).toBe(NetworkState.Connecting);
        });

        it('connect 成功应更新状态并发射事件', () => {
            const { manager, eventManager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            channel.connect('ws://localhost:8080');
            socket.simulateOpen();

            expect(channel.state).toBe(NetworkState.Connected);
            expect(channel.isConnected).toBe(true);

            const emits = eventManager.getEmits<NetworkConnectedEventData>(NETWORK_CONNECTED);
            expect(emits).toHaveLength(1);
            expect(emits[0].channelName).toBe('game');
        });

        it('已连接时重复 connect 应被忽略', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            channel.connect('ws://localhost:8080');
            socket.simulateOpen();
            channel.connect('ws://another-url');

            // 不应发起新连接
            expect(socket.connectCalls).toHaveLength(1);
        });

        it('close 应关闭连接并发射关闭事件', () => {
            const { manager, eventManager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            eventManager.reset();

            channel.close();
            // close() 调用 socket.close()，触发 onClose 回调
            socket.simulateClose(1000, 'user close');

            expect(channel.state).toBe(NetworkState.Disconnected);
            const emits = eventManager.getEmits<NetworkClosedEventData>(NETWORK_CLOSED);
            expect(emits).toHaveLength(1);
            expect(emits[0].code).toBe(1000);
        });

        it('close 已断开的通道应忽略', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            // 未连接，close 应为空操作
            channel.close();
            expect(socket.closeCalls).toBe(0);
        });

        it('close 不应触发自动重连', () => {
            const { manager, eventManager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler, {
                autoReconnect: true,
                maxReconnectAttempts: 3,
            });

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            eventManager.reset();

            // 用户主动关闭
            channel.close();
            socket.simulateClose(1000, 'user close');

            // 不应进入重连状态
            expect(channel.state).toBe(NetworkState.Disconnected);
            const reconnectEmits = eventManager.getEmits(NETWORK_RECONNECTING);
            expect(reconnectEmits).toHaveLength(0);
        });
    });

    // ━━━ 消息收发 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    describe('消息收发', () => {
        it('send 应编码并发送数据', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();

            channel.send({ id: 1001, data: new Uint8Array([1, 2, 3]) });
            expect(socket.sendCalls).toHaveLength(1);

            // 验证编码正确
            const sent = socket.sendCalls[0] as ArrayBuffer;
            const decoded = handler.decode(sent);
            expect(decoded.id).toBe(1001);
            expect(Array.from(decoded.data)).toEqual([1, 2, 3]);
        });

        it('send 未连接时应抛出错误', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            expect(() => channel.send({ id: 1, data: new Uint8Array(0) })).toThrow('未连接');
        });

        it('收到消息应解码并发射事件', () => {
            const { manager, eventManager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            eventManager.reset();

            const packetBuffer = createPacketBuffer(1001, [10, 20, 30]);
            socket.simulateMessage(packetBuffer);

            const emits = eventManager.getEmits<NetworkMessageEventData>(NETWORK_MESSAGE);
            expect(emits).toHaveLength(1);
            expect(emits[0].channelName).toBe('game');
            expect(emits[0].packet.id).toBe(1001);
            expect(Array.from(emits[0].packet.data)).toEqual([10, 20, 30]);
        });

        it('多个通道的消息应正确区分', () => {
            const { manager, eventManager } = createManager();
            const handler = new MockPacketHandler();
            const socket1 = new MockSocket();
            const socket2 = new MockSocket();
            manager.createChannel('game', socket1, handler);
            manager.createChannel('chat', socket2, handler);

            const ch1 = manager.getChannel('game')!;
            const ch2 = manager.getChannel('chat')!;
            ch1.connect('ws://game');
            socket1.simulateOpen();
            ch2.connect('ws://chat');
            socket2.simulateOpen();
            eventManager.reset();

            socket1.simulateMessage(createPacketBuffer(100));
            socket2.simulateMessage(createPacketBuffer(200));

            const emits = eventManager.getEmits<NetworkMessageEventData>(NETWORK_MESSAGE);
            expect(emits).toHaveLength(2);
            expect(emits[0].channelName).toBe('game');
            expect(emits[0].packet.id).toBe(100);
            expect(emits[1].channelName).toBe('chat');
            expect(emits[1].packet.id).toBe(200);
        });
    });

    // ━━━ 错误处理 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    describe('错误处理', () => {
        it('socket 错误应发射错误事件', () => {
            const { manager, eventManager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler);

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            eventManager.reset();

            const err = new Error('connection reset');
            socket.simulateError(err);

            const emits = eventManager.getEmits<NetworkErrorEventData>(NETWORK_ERROR);
            expect(emits).toHaveLength(1);
            expect(emits[0].channelName).toBe('game');
            expect(emits[0].error).toBe(err);
        });
    });

    // ━━━ 心跳检测 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    describe('心跳检测', () => {
        it('setHeartbeatHandler 应设置心跳处理器', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const handler = new MockPacketHandler();
            manager.createChannel('game', socket, handler, {
                heartbeatInterval: 5,
            });

            expect(() =>
                manager.setHeartbeatHandler('game', new MockHeartbeatHandler()),
            ).not.toThrow();
        });

        it('setHeartbeatHandler 不存在的通道应抛出错误', () => {
            const { manager } = createManager();
            expect(() =>
                manager.setHeartbeatHandler('nonexistent', new MockHeartbeatHandler()),
            ).toThrow("通道 'nonexistent' 不存在");
        });

        it('心跳到期应发送心跳包', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            const packetHandler = new MockPacketHandler();
            manager.createChannel('game', socket, packetHandler, {
                heartbeatInterval: 5,
            });
            manager.setHeartbeatHandler('game', new MockHeartbeatHandler());

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            socket.sendCalls.length = 0; // 清空之前的 send

            // 累计 5 秒
            manager.onUpdate(3);
            expect(socket.sendCalls).toHaveLength(0);
            manager.onUpdate(2); // 达到 5 秒
            expect(socket.sendCalls).toHaveLength(1);

            // 验证发送的是心跳包
            const decoded = packetHandler.decode(socket.sendCalls[0] as ArrayBuffer);
            expect(decoded.id).toBe(0);
        });

        it('无心跳处理器时不应发送心跳', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            manager.createChannel('game', socket, new MockPacketHandler(), {
                heartbeatInterval: 5,
            });

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            socket.sendCalls.length = 0;

            manager.onUpdate(10); // 远超心跳间隔
            expect(socket.sendCalls).toHaveLength(0);
        });

        it('heartbeatInterval = 0 时不应发送心跳', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            manager.createChannel('game', socket, new MockPacketHandler(), {
                heartbeatInterval: 0,
            });
            manager.setHeartbeatHandler('game', new MockHeartbeatHandler());

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            socket.sendCalls.length = 0;

            manager.onUpdate(100);
            expect(socket.sendCalls).toHaveLength(0);
        });

        it('收到心跳回复应重置丢失计数', () => {
            const { manager, eventManager } = createManager();
            const socket = new MockSocket();
            const packetHandler = new MockPacketHandler();
            manager.createChannel('game', socket, packetHandler, {
                heartbeatInterval: 5,
                missHeartbeatCountToClose: 3,
            });
            manager.setHeartbeatHandler('game', new MockHeartbeatHandler());

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();

            // 发一次心跳
            manager.onUpdate(5);
            // 收到心跳回复（id = 0）
            socket.simulateMessage(createPacketBuffer(0));

            // 心跳回复不应作为普通消息传递
            const msgEmits = eventManager.getEmits(NETWORK_MESSAGE);
            expect(msgEmits.filter((e) => e.packet.id === 0)).toHaveLength(0);

            // 再发多次心跳，不应触发断线（因为之前回复重置了计数）
            manager.onUpdate(5);
            manager.onUpdate(5);
            expect(channel.isConnected).toBe(true);
        });

        it('连续丢失心跳超过阈值应触发断线', () => {
            const { manager, eventManager } = createManager();
            const socket = new MockSocket();
            const packetHandler = new MockPacketHandler();
            manager.createChannel('game', socket, packetHandler, {
                heartbeatInterval: 5,
                missHeartbeatCountToClose: 3,
                autoReconnect: false, // 关闭重连以简化测试
            });
            manager.setHeartbeatHandler('game', new MockHeartbeatHandler());

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            eventManager.reset();

            // 第 1 次心跳（missedHeartbeats = 1）
            manager.onUpdate(5);
            // 第 2 次心跳（missedHeartbeats = 2）
            manager.onUpdate(5);
            // 第 3 次心跳（missedHeartbeats = 3 >= 3），触发 socket.close()
            manager.onUpdate(5);
            expect(socket.closeCalls).toBe(1);

            // 模拟 socket 关闭回调
            socket.simulateClose(1006, 'heartbeat timeout');

            const closedEmits = eventManager.getEmits<NetworkClosedEventData>(NETWORK_CLOSED);
            expect(closedEmits).toHaveLength(1);
        });
    });

    // ━━━ 自动重连 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    describe('自动重连', () => {
        it('异常断线应进入重连状态', () => {
            const { manager, eventManager } = createManager();
            const socket = new MockSocket();
            manager.createChannel('game', socket, new MockPacketHandler(), {
                autoReconnect: true,
                maxReconnectAttempts: 3,
                reconnectBaseDelay: 1,
            });

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();
            eventManager.reset();

            // 服务端关闭连接（异常断线）
            socket.simulateClose(1006, 'abnormal');

            expect(channel.state).toBe(NetworkState.Reconnecting);
            const reconnectEmits =
                eventManager.getEmits<NetworkReconnectingEventData>(NETWORK_RECONNECTING);
            expect(reconnectEmits).toHaveLength(1);
            expect(reconnectEmits[0].attempt).toBe(1);
            expect(reconnectEmits[0].maxAttempts).toBe(3);
        });

        it('重连延迟应遵循指数退避', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            manager.createChannel('game', socket, new MockPacketHandler(), {
                autoReconnect: true,
                maxReconnectAttempts: 5,
                reconnectBaseDelay: 1,
            });

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();

            // 第一次断线
            socket.simulateClose(1006, 'abnormal');
            expect(channel.state).toBe(NetworkState.Reconnecting);

            // 第 1 次重连延迟 = 1 * 2^0 = 1 秒
            manager.onUpdate(0.5); // 还不够
            expect(socket.connectCalls).toHaveLength(1); // 只有初始连接
            manager.onUpdate(0.5); // 达到 1 秒
            expect(socket.connectCalls).toHaveLength(2); // 发起重连
            expect(channel.state).toBe(NetworkState.Connecting);

            // 重连失败（直接 close，未经过 open）
            socket.simulateClose(1006, 'reconnect failed');
            expect(channel.state).toBe(NetworkState.Reconnecting);

            // 第 2 次重连延迟 = 1 * 2^1 = 2 秒
            manager.onUpdate(1.5);
            expect(socket.connectCalls).toHaveLength(2); // 1.5 < 2，还没到
            manager.onUpdate(0.5); // 达到 2 秒
            expect(socket.connectCalls).toHaveLength(3);
        });

        it('达到最大重连次数应停止重连', () => {
            const { manager, eventManager } = createManager();
            const socket = new MockSocket();
            manager.createChannel('game', socket, new MockPacketHandler(), {
                autoReconnect: true,
                maxReconnectAttempts: 2,
                reconnectBaseDelay: 0.1,
            });

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();

            // 第 1 次断线 → 重连（attempts = 1）
            socket.simulateClose(1006, 'fail');
            expect(channel.state).toBe(NetworkState.Reconnecting);
            manager.onUpdate(0.1); // 触发第 1 次重连尝试

            // 第 1 次重连失败 → 再次重连（attempts = 2 = max）
            socket.simulateClose(1006, 'fail');
            expect(channel.state).toBe(NetworkState.Reconnecting);
            manager.onUpdate(0.2); // 触发第 2 次重连尝试

            // 第 2 次重连失败 → attempts(2) >= max(2)，不再重连
            socket.simulateClose(1006, 'fail');
            expect(channel.state).toBe(NetworkState.Disconnected);

            const reconnectEmits = eventManager.getEmits(NETWORK_RECONNECTING);
            expect(reconnectEmits).toHaveLength(2);
        });

        it('autoReconnect = false 时不应重连', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            manager.createChannel('game', socket, new MockPacketHandler(), {
                autoReconnect: false,
            });

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();

            socket.simulateClose(1006, 'abnormal');
            expect(channel.state).toBe(NetworkState.Disconnected);
        });

        it('重连成功应重置重连计数', () => {
            const { manager } = createManager();
            const socket = new MockSocket();
            manager.createChannel('game', socket, new MockPacketHandler(), {
                autoReconnect: true,
                maxReconnectAttempts: 2,
                reconnectBaseDelay: 0.1,
            });

            const channel = manager.getChannel('game')!;
            channel.connect('ws://test');
            socket.simulateOpen();

            // 断线 → 重连 → 连上
            socket.simulateClose(1006, 'fail');
            manager.onUpdate(0.1);
            socket.simulateOpen();
            expect(channel.isConnected).toBe(true);

            // 再次断线，应该还有 2 次重连机会（而非上次用掉的减少）
            socket.simulateClose(1006, 'fail again');
            expect(channel.state).toBe(NetworkState.Reconnecting);
            manager.onUpdate(0.1);
            socket.simulateOpen();
            socket.simulateClose(1006, 'fail');
            expect(channel.state).toBe(NetworkState.Reconnecting);
        });
    });

    // ━━━ onUpdate 驱动 ━━━━━━━━━━━━━━━━━━━━━━━━━━

    describe('onUpdate 驱动', () => {
        it('onUpdate 应驱动所有通道', () => {
            const { manager } = createManager();
            const handler = new MockPacketHandler();
            const socket1 = new MockSocket();
            const socket2 = new MockSocket();
            manager.createChannel('ch1', socket1, handler, { heartbeatInterval: 5 });
            manager.createChannel('ch2', socket2, handler, { heartbeatInterval: 3 });
            manager.setHeartbeatHandler('ch1', new MockHeartbeatHandler());
            manager.setHeartbeatHandler('ch2', new MockHeartbeatHandler());

            const ch1 = manager.getChannel('ch1')!;
            const ch2 = manager.getChannel('ch2')!;
            ch1.connect('ws://1');
            socket1.simulateOpen();
            ch2.connect('ws://2');
            socket2.simulateOpen();
            socket1.sendCalls.length = 0;
            socket2.sendCalls.length = 0;

            manager.onUpdate(3);
            // ch1 还没到（5秒间隔），ch2 到了（3秒间隔）
            expect(socket1.sendCalls).toHaveLength(0);
            expect(socket2.sendCalls).toHaveLength(1);
        });
    });
});
