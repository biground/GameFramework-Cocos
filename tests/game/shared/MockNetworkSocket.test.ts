import { MockNetworkSocket } from '@game/shared/MockNetworkSocket';

describe('MockNetworkSocket', () => {
    let socket: MockNetworkSocket;

    beforeEach(() => {
        jest.useFakeTimers();
        socket = new MockNetworkSocket();
    });

    afterEach(() => {
        // 确保关闭并清理定时器
        if (socket.isConnected) {
            socket.close();
        }
        jest.useRealTimers();
    });

    describe('connect', () => {
        it('触发 onOpen 回调', () => {
            const onOpen = jest.fn();
            socket.onOpen = onOpen;
            socket.connect('ws://localhost:8080');
            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(socket.isConnected).toBe(true);
            expect(socket.url).toBe('ws://localhost:8080');
        });

        it('已连接时忽略重复连接', () => {
            const onOpen = jest.fn();
            socket.onOpen = onOpen;
            socket.connect('ws://localhost:8080');
            socket.connect('ws://localhost:9090');
            expect(onOpen).toHaveBeenCalledTimes(1);
        });
    });

    describe('send', () => {
        it('未连接时触发 onError', () => {
            const onError = jest.fn();
            socket.onError = onError;
            const data = new ArrayBuffer(4);
            socket.send(data);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
        });

        it('记录到 sendHistory', () => {
            socket.connect('ws://localhost:8080');
            const data = new ArrayBuffer(8);
            socket.send(data);
            expect(socket.sendHistory).toHaveLength(1);
            expect(socket.sendHistory[0].data).toBe(data);
        });

        it('发送 Uint8Array 也记录到 sendHistory', () => {
            socket.connect('ws://localhost:8080');
            const data = new Uint8Array([1, 2, 3, 4]);
            socket.send(data);
            expect(socket.sendHistory).toHaveLength(1);
        });
    });

    describe('自动响应', () => {
        it('registerAutoResponse → send → 触发 onMessage', () => {
            socket.connect('ws://localhost:8080');
            const onMessage = jest.fn();
            socket.onMessage = onMessage;

            const responseBuffer = new ArrayBuffer(4);
            new DataView(responseBuffer).setUint32(0, 999);

            socket.registerAutoResponse(42, (_req) => responseBuffer);

            // 构造 requestId=42 的数据包
            const requestData = new ArrayBuffer(8);
            new DataView(requestData).setUint32(0, 42);
            socket.send(requestData);

            expect(onMessage).toHaveBeenCalledTimes(1);
            expect(onMessage).toHaveBeenCalledWith(responseBuffer);
        });

        it('requestId 不匹配时不触发 onMessage', () => {
            socket.connect('ws://localhost:8080');
            const onMessage = jest.fn();
            socket.onMessage = onMessage;

            socket.registerAutoResponse(42, () => new ArrayBuffer(4));

            const requestData = new ArrayBuffer(8);
            new DataView(requestData).setUint32(0, 99);
            socket.send(requestData);

            expect(onMessage).not.toHaveBeenCalled();
        });

        it('removeAutoResponse 后不再自动响应', () => {
            socket.connect('ws://localhost:8080');
            const onMessage = jest.fn();
            socket.onMessage = onMessage;

            socket.registerAutoResponse(42, () => new ArrayBuffer(4));
            socket.removeAutoResponse(42);

            const requestData = new ArrayBuffer(8);
            new DataView(requestData).setUint32(0, 42);
            socket.send(requestData);

            expect(onMessage).not.toHaveBeenCalled();
        });
    });

    describe('丢包模拟', () => {
        it('packetLossRate=1.0 时发送不触发 onMessage', () => {
            socket.connect('ws://localhost:8080');
            const onMessage = jest.fn();
            socket.onMessage = onMessage;

            jest.spyOn(Math, 'random').mockReturnValue(0.5);

            socket.setPacketLossRate(1.0);
            socket.registerAutoResponse(1, () => new ArrayBuffer(4));

            const data = new ArrayBuffer(8);
            new DataView(data).setUint32(0, 1);
            socket.send(data);

            expect(onMessage).not.toHaveBeenCalled();
            jest.restoreAllMocks();
        });

        it('packetLossRate=0 时正常发送', () => {
            socket.connect('ws://localhost:8080');
            const onMessage = jest.fn();
            socket.onMessage = onMessage;

            jest.spyOn(Math, 'random').mockReturnValue(0.5);

            socket.setPacketLossRate(0);
            socket.registerAutoResponse(1, () => new ArrayBuffer(4));

            const data = new ArrayBuffer(8);
            new DataView(data).setUint32(0, 1);
            socket.send(data);

            expect(onMessage).toHaveBeenCalledTimes(1);
            jest.restoreAllMocks();
        });

        it('无效丢包率被忽略', () => {
            socket.setPacketLossRate(-0.1);
            socket.setPacketLossRate(1.5);
            // 不报错即可，内部仍为默认值 0
        });
    });

    describe('延迟模拟', () => {
        it('setLatencyRange 后回调延迟执行', () => {
            socket.setLatencyRange(100, 200);
            jest.spyOn(Math, 'random').mockReturnValue(0.5);

            const onOpen = jest.fn();
            socket.onOpen = onOpen;
            socket.connect('ws://localhost:8080');

            // 延迟 = 100 + 0.5 * (200-100) = 150ms
            expect(onOpen).not.toHaveBeenCalled();
            jest.advanceTimersByTime(149);
            expect(onOpen).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(onOpen).toHaveBeenCalledTimes(1);

            jest.restoreAllMocks();
        });

        it('无效延迟范围被忽略', () => {
            socket.setLatencyRange(-1, 100);
            socket.setLatencyRange(200, 100);
            // 不报错，内部仍为默认 [0,0]
        });
    });

    describe('simulateDisconnect', () => {
        it('触发 onClose 并设置 isConnected=false', () => {
            socket.connect('ws://localhost:8080');
            const onClose = jest.fn();
            socket.onClose = onClose;

            socket.simulateDisconnect();
            expect(onClose).toHaveBeenCalledWith(1006, 'Simulated abnormal disconnect');
            expect(socket.isConnected).toBe(false);
        });

        it('未连接时不触发 onClose', () => {
            const onClose = jest.fn();
            socket.onClose = onClose;
            socket.simulateDisconnect();
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    describe('simulateReconnect', () => {
        it('断开后重连触发 onOpen', () => {
            socket.connect('ws://localhost:8080');
            socket.simulateDisconnect();

            const onOpen = jest.fn();
            socket.onOpen = onOpen;
            socket.simulateReconnect();
            expect(onOpen).toHaveBeenCalledTimes(1);
            expect(socket.isConnected).toBe(true);
        });

        it('无 URL 时触发 onError', () => {
            const onError = jest.fn();
            socket.onError = onError;
            socket.simulateReconnect();
            expect(onError).toHaveBeenCalledTimes(1);
        });

        it('已连接时不触发重连', () => {
            socket.connect('ws://localhost:8080');
            const onOpen = jest.fn();
            socket.onOpen = onOpen;
            socket.simulateReconnect();
            expect(onOpen).not.toHaveBeenCalled();
        });
    });

    describe('simulateIncomingMessage', () => {
        it('连接状态下触发 onMessage', () => {
            socket.connect('ws://localhost:8080');
            const onMessage = jest.fn();
            socket.onMessage = onMessage;

            const data = new ArrayBuffer(16);
            socket.simulateIncomingMessage(data);
            expect(onMessage).toHaveBeenCalledWith(data);
        });

        it('未连接时不触发 onMessage', () => {
            const onMessage = jest.fn();
            socket.onMessage = onMessage;
            socket.simulateIncomingMessage(new ArrayBuffer(4));
            expect(onMessage).not.toHaveBeenCalled();
        });
    });

    describe('close', () => {
        it('触发 onClose 回调', () => {
            socket.connect('ws://localhost:8080');
            const onClose = jest.fn();
            socket.onClose = onClose;
            socket.close();
            expect(onClose).toHaveBeenCalledWith(1000, 'Normal closure');
            expect(socket.isConnected).toBe(false);
        });

        it('未连接时不触发 onClose', () => {
            const onClose = jest.fn();
            socket.onClose = onClose;
            socket.close();
            expect(onClose).not.toHaveBeenCalled();
        });

        it('清理待执行的定时器', () => {
            socket.setLatencyRange(1000, 2000);
            jest.spyOn(Math, 'random').mockReturnValue(0.5);

            socket.connect('ws://localhost:8080');
            // connect 回调还在定时器中
            const onOpen = jest.fn();
            socket.onOpen = onOpen;
            // 强制设置连接状态以测试 close 清理
            // （connect 的 onOpen 尚未触发）
            // 此时 close 不触发（因为 _connected 还是 false）
            // 推进定时器让 connect 完成
            jest.advanceTimersByTime(1500);
            expect(socket.isConnected).toBe(true);

            // 设置延迟后发送消息，然后立即 close
            const onMessage = jest.fn();
            socket.onMessage = onMessage;
            socket.registerAutoResponse(1, () => new ArrayBuffer(4));
            const reqData = new ArrayBuffer(8);
            new DataView(reqData).setUint32(0, 1);
            socket.send(reqData);

            socket.close();
            // 推进时间，消息回调不应触发（定时器已清理）
            jest.advanceTimersByTime(5000);
            expect(onMessage).not.toHaveBeenCalled();

            jest.restoreAllMocks();
        });
    });

    describe('clearSendHistory', () => {
        it('清空发送历史', () => {
            socket.connect('ws://localhost:8080');
            socket.send(new ArrayBuffer(4));
            socket.send(new ArrayBuffer(4));
            expect(socket.sendHistory).toHaveLength(2);
            socket.clearSendHistory();
            expect(socket.sendHistory).toHaveLength(0);
        });
    });
});
