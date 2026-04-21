import { MockSceneLoader } from '@game/shared/MockSceneLoader';
import { LoadSceneCallbacks } from '@framework/scene/SceneDefs';

describe('MockSceneLoader', () => {
    let loader: MockSceneLoader;

    beforeEach(() => {
        jest.useFakeTimers();
        loader = new MockSceneLoader();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('loadScene 基础流程', () => {
        it('loadScene 将请求加入 loadRequests', () => {
            const callbacks: LoadSceneCallbacks = {};
            loader.loadScene('GameScene', callbacks);

            expect(loader.loadRequests.has('GameScene')).toBe(true);
            expect(loader.loadRequests.get('GameScene')).toBe(callbacks);
        });

        it('多次 loadScene 分别记录不同场景', () => {
            loader.loadScene('Scene1', {});
            loader.loadScene('Scene2', {});

            expect(loader.loadRequests.size).toBe(2);
        });
    });

    describe('手动 resolveLoad / rejectLoad', () => {
        it('resolveLoad 触发 onSuccess 并记录到 loadedScenes', () => {
            const onSuccess = jest.fn();
            loader.loadScene('MainMenu', { onSuccess });

            loader.resolveLoad('MainMenu');

            expect(onSuccess).toHaveBeenCalledWith('MainMenu');
            expect(loader.loadedScenes).toContain('MainMenu');
            expect(loader.loadRequests.has('MainMenu')).toBe(false);
        });

        it('resolveLoad 不存在的场景不报错', () => {
            expect(() => loader.resolveLoad('NonExistent')).not.toThrow();
        });

        it('rejectLoad 触发 onFailure 并清除请求', () => {
            const onFailure = jest.fn();
            loader.loadScene('BrokenScene', { onFailure });

            const error = new Error('加载失败');
            loader.rejectLoad('BrokenScene', error);

            expect(onFailure).toHaveBeenCalledWith('BrokenScene', error.toString());
            expect(loader.loadRequests.has('BrokenScene')).toBe(false);
        });

        it('rejectLoad 无 error 参数时使用默认错误消息', () => {
            const onFailure = jest.fn();
            loader.loadScene('Scene1', { onFailure });

            loader.rejectLoad('Scene1');

            expect(onFailure).toHaveBeenCalledWith(
                'Scene1',
                expect.stringContaining('加载失败')
            );
        });

        it('rejectLoad 不存在的场景不报错', () => {
            expect(() => loader.rejectLoad('NonExistent')).not.toThrow();
        });
    });

    describe('simulateProgress', () => {
        it('simulateProgress 触发 onProgress 回调', () => {
            const onProgress = jest.fn();
            loader.loadScene('Level1', { onProgress });

            loader.simulateProgress('Level1', 0.5);

            expect(onProgress).toHaveBeenCalledWith(0.5);
        });

        it('simulateProgressSteps 发射默认进度序列', () => {
            const onProgress = jest.fn();
            loader.loadScene('Level2', { onProgress });

            loader.simulateProgressSteps('Level2');

            expect(onProgress).toHaveBeenCalledTimes(5);
            expect(onProgress).toHaveBeenNthCalledWith(1, 0);
            expect(onProgress).toHaveBeenNthCalledWith(2, 0.25);
            expect(onProgress).toHaveBeenNthCalledWith(3, 0.5);
            expect(onProgress).toHaveBeenNthCalledWith(4, 0.75);
            expect(onProgress).toHaveBeenNthCalledWith(5, 1.0);
        });

        it('simulateProgressSteps 自定义步长', () => {
            const onProgress = jest.fn();
            loader.loadScene('Level3', { onProgress });

            loader.simulateProgressSteps('Level3', [0, 0.5, 1.0]);

            expect(onProgress).toHaveBeenCalledTimes(3);
        });

        it('simulateProgress 不存在的场景不报错', () => {
            expect(() => loader.simulateProgress('None', 0.5)).not.toThrow();
        });
    });

    describe('setAutoSuccess 模式', () => {
        it('开启 autoSuccess 后 loadScene 自动触发 onSuccess', () => {
            const onSuccess = jest.fn();
            loader.setAutoSuccess(true);

            loader.loadScene('AutoScene', { onSuccess });

            expect(onSuccess).toHaveBeenCalledWith('AutoScene');
            expect(loader.loadedScenes).toContain('AutoScene');
        });

        it('关闭 autoSuccess 后 loadScene 不自动完成', () => {
            const onSuccess = jest.fn();
            loader.setAutoSuccess(false);

            loader.loadScene('ManualScene', { onSuccess });

            expect(onSuccess).not.toHaveBeenCalled();
            expect(loader.loadRequests.has('ManualScene')).toBe(true);
        });
    });

    describe('setLoadDelay 延迟模拟', () => {
        it('设置延迟后 resolveLoad 通过 setTimeout 异步执行', () => {
            const onSuccess = jest.fn();
            loader.loadScene('DelayScene', { onSuccess });
            loader.setLoadDelay(100);

            loader.resolveLoad('DelayScene');
            expect(onSuccess).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);
            expect(onSuccess).toHaveBeenCalledWith('DelayScene');
        });

        it('设置延迟后 rejectLoad 也异步执行', () => {
            const onFailure = jest.fn();
            loader.loadScene('DelayFail', { onFailure });
            loader.setLoadDelay(50);

            loader.rejectLoad('DelayFail');
            expect(onFailure).not.toHaveBeenCalled();

            jest.advanceTimersByTime(50);
            expect(onFailure).toHaveBeenCalled();
        });

        it('设置延迟后 autoSuccess 也异步执行', () => {
            const onSuccess = jest.fn();
            loader.setLoadDelay(200);
            loader.setAutoSuccess(true);

            loader.loadScene('DelayAuto', { onSuccess });
            expect(onSuccess).not.toHaveBeenCalled();

            jest.advanceTimersByTime(200);
            // _scheduleResolve -> resolveLoad (又一次 delay)
            jest.advanceTimersByTime(200);
            expect(onSuccess).toHaveBeenCalledWith('DelayAuto');
        });
    });

    describe('unloadScene', () => {
        it('unloadScene 记录到 unloadedScenes 并清除请求', () => {
            loader.loadScene('OldScene', {});
            loader.unloadScene('OldScene');

            expect(loader.unloadedScenes).toContain('OldScene');
            expect(loader.loadRequests.has('OldScene')).toBe(false);
        });

        it('unloadScene 不存在的场景也记录', () => {
            loader.unloadScene('NeverLoaded');
            expect(loader.unloadedScenes).toContain('NeverLoaded');
        });
    });
});
