import { MockSceneLoader } from '@game/shared/MockSceneLoader';
import { LoadSceneCallbacks } from '@framework/scene/SceneDefs';

describe('MockSceneLoader', () => {
    let loader: MockSceneLoader;

    beforeEach(() => {
        loader = new MockSceneLoader();
    });

    describe('基础接口', () => {
        test('loadScene 应存储回调到 loadRequests', () => {
            const callbacks: LoadSceneCallbacks = {
                onSuccess: jest.fn(),
                onProgress: jest.fn(),
                onFailure: jest.fn(),
            };

            loader.loadScene('TestScene', callbacks);

            expect(loader.loadRequests.has('TestScene')).toBe(true);
            expect(loader.loadRequests.get('TestScene')).toBe(callbacks);
        });

        test('unloadScene 应记录已卸载场景', () => {
            loader.unloadScene('TestScene');

            expect(loader.unloadedScenes).toContain('TestScene');
        });
    });

    describe('手动控制 - resolveLoad', () => {
        test('resolveLoad 应触发 onSuccess 并记录到 loadedScenes', () => {
            const onSuccess = jest.fn();
            const callbacks: LoadSceneCallbacks = { onSuccess };

            loader.loadScene('TestScene', callbacks);
            loader.resolveLoad('TestScene');

            expect(onSuccess).toHaveBeenCalledWith('TestScene');
            expect(loader.loadedScenes).toContain('TestScene');
            expect(loader.loadRequests.has('TestScene')).toBe(false);
        });

        test('resolveLoad 对不存在的场景应不抛异常', () => {
            expect(() => loader.resolveLoad('NonExistent')).not.toThrow();
        });
    });

    describe('手动控制 - rejectLoad', () => {
        test('rejectLoad 应触发 onFailure', () => {
            const onFailure = jest.fn();
            const callbacks: LoadSceneCallbacks = { onFailure };

            loader.loadScene('TestScene', callbacks);
            loader.rejectLoad('TestScene', new Error('Load failed'));

            expect(onFailure).toHaveBeenCalledWith('TestScene', 'Error: Load failed');
            expect(loader.loadRequests.has('TestScene')).toBe(false);
        });

        test('rejectLoad 不提供 error 时应使用默认错误消息', () => {
            const onFailure = jest.fn();
            const callbacks: LoadSceneCallbacks = { onFailure };

            loader.loadScene('TestScene', callbacks);
            loader.rejectLoad('TestScene');

            expect(onFailure).toHaveBeenCalledWith(
                'TestScene',
                expect.stringContaining('MockSceneLoader'),
            );
        });
    });

    describe('手动控制 - simulateProgress', () => {
        test('simulateProgress 应触发 onProgress', () => {
            const onProgress = jest.fn();
            const callbacks: LoadSceneCallbacks = { onProgress };

            loader.loadScene('TestScene', callbacks);
            loader.simulateProgress('TestScene', 0.5);

            expect(onProgress).toHaveBeenCalledWith(0.5);
        });

        test('simulateProgress 不应移除 loadRequest', () => {
            const callbacks: LoadSceneCallbacks = {};

            loader.loadScene('TestScene', callbacks);
            loader.simulateProgress('TestScene', 0.5);

            expect(loader.loadRequests.has('TestScene')).toBe(true);
        });
    });

    describe('自动成功模式', () => {
        test('setAutoSuccess(true) 后 loadScene 应自动完成', (done) => {
            const onSuccess = jest.fn(() => {
                expect(onSuccess).toHaveBeenCalledWith('TestScene');
                expect(loader.loadedScenes).toContain('TestScene');
                done();
            });
            const callbacks: LoadSceneCallbacks = { onSuccess };

            loader.setAutoSuccess(true);
            loader.loadScene('TestScene', callbacks);
        });

        test('setAutoSuccess(false) 后 loadScene 不应自动完成', () => {
            const onSuccess = jest.fn();
            const callbacks: LoadSceneCallbacks = { onSuccess };

            loader.setAutoSuccess(false);
            loader.loadScene('TestScene', callbacks);

            expect(onSuccess).not.toHaveBeenCalled();
            expect(loader.loadRequests.has('TestScene')).toBe(true);
        });
    });

    describe('进度模拟 - simulateProgressSteps', () => {
        test('simulateProgressSteps 应依次触发进度回调', () => {
            const onProgress = jest.fn();
            const callbacks: LoadSceneCallbacks = { onProgress };

            loader.loadScene('TestScene', callbacks);
            loader.simulateProgressSteps('TestScene', [0, 0.25, 0.5, 0.75, 1.0]);

            expect(onProgress).toHaveBeenCalledTimes(5);
            expect(onProgress).toHaveBeenNthCalledWith(1, 0);
            expect(onProgress).toHaveBeenNthCalledWith(2, 0.25);
            expect(onProgress).toHaveBeenNthCalledWith(3, 0.5);
            expect(onProgress).toHaveBeenNthCalledWith(4, 0.75);
            expect(onProgress).toHaveBeenNthCalledWith(5, 1.0);
        });

        test('simulateProgressSteps 不提供 steps 时应使用默认 [0, 0.25, 0.5, 0.75, 1.0]', () => {
            const onProgress = jest.fn();
            const callbacks: LoadSceneCallbacks = { onProgress };

            loader.loadScene('TestScene', callbacks);
            loader.simulateProgressSteps('TestScene');

            expect(onProgress).toHaveBeenCalledTimes(5);
            expect(onProgress).toHaveBeenNthCalledWith(1, 0);
            expect(onProgress).toHaveBeenNthCalledWith(5, 1.0);
        });
    });

    describe('延迟模拟', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('setLoadDelay 后 resolveLoad 应延迟触发', () => {
            const onSuccess = jest.fn();
            const callbacks: LoadSceneCallbacks = { onSuccess };

            loader.setLoadDelay(1000);
            loader.loadScene('TestScene', callbacks);
            loader.resolveLoad('TestScene');

            expect(onSuccess).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1000);

            expect(onSuccess).toHaveBeenCalledWith('TestScene');
        });

        test('setLoadDelay(0) 应同步触发', () => {
            const onSuccess = jest.fn();
            const callbacks: LoadSceneCallbacks = { onSuccess };

            loader.setLoadDelay(0);
            loader.loadScene('TestScene', callbacks);
            loader.resolveLoad('TestScene');

            expect(onSuccess).toHaveBeenCalledWith('TestScene');
        });
    });

    describe('调用追踪', () => {
        test('loadedScenes 应记录所有成功加载的场景', () => {
            loader.loadScene('Scene1', {});
            loader.loadScene('Scene2', {});
            loader.resolveLoad('Scene1');
            loader.resolveLoad('Scene2');

            expect(loader.loadedScenes).toEqual(['Scene1', 'Scene2']);
        });

        test('unloadedScenes 应记录所有卸载的场景', () => {
            loader.unloadScene('Scene1');
            loader.unloadScene('Scene2');

            expect(loader.unloadedScenes).toEqual(['Scene1', 'Scene2']);
        });

        test('loadRequests 应仅包含待处理的请求', () => {
            loader.loadScene('Scene1', {});
            loader.loadScene('Scene2', {});
            loader.resolveLoad('Scene1');

            expect(loader.loadRequests.has('Scene1')).toBe(false);
            expect(loader.loadRequests.has('Scene2')).toBe(true);
        });
    });
});
