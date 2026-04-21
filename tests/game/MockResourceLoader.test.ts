import { MockResourceLoader } from '@game/shared/MockResourceLoader';
import { LoadAssetCallbacks } from '@framework/resource/ResourceDefs';

describe('MockResourceLoader', () => {
    let loader: MockResourceLoader;

    beforeEach(() => {
        loader = new MockResourceLoader();
    });

    describe('基础加载', () => {
        it('加载已注册的资源后 resolve 应触发 onSuccess', () => {
            const mockAsset = { id: 'hero', name: 'Hero' };
            loader.registerAsset('hero.png', mockAsset);

            const onSuccess = jest.fn();
            const onFailure = jest.fn();

            loader.loadAsset('hero.png', { onSuccess, onFailure });

            // 手动模式下需要调用 resolve
            loader.resolve('hero.png');

            expect(onSuccess).toHaveBeenCalledWith('hero.png', mockAsset);
            expect(onFailure).not.toHaveBeenCalled();
        });

        it('加载未注册的资源后 reject 应触发 onFailure', () => {
            const onSuccess = jest.fn();
            const onFailure = jest.fn();

            loader.loadAsset('missing.png', { onSuccess, onFailure });

            // 手动模式下需要调用 reject
            loader.reject('missing.png');

            expect(onFailure).toHaveBeenCalledWith('missing.png', expect.any(Error));
            expect(onSuccess).not.toHaveBeenCalled();
        });

        it('释放资源应从注册表中移除', () => {
            loader.registerAsset('hero.png', { id: 'hero' });
            loader.releaseAsset('hero.png');

            const onSuccess = jest.fn();
            const onFailure = jest.fn();
            loader.loadAsset('hero.png', { onSuccess, onFailure });

            // 资源已被释放，resolve 应使用默认 mock 对象而非注册的资源
            loader.resolve('hero.png');

            expect(onSuccess).toHaveBeenCalledWith(
                'hero.png',
                expect.objectContaining({ type: 'mock' }),
            );
        });
    });

    describe('调用追踪', () => {
        it('loadRequests 应记录待处理的加载请求', () => {
            const callbacks: LoadAssetCallbacks = {
                onSuccess: jest.fn(),
            };

            // 关闭自动成功，以便请求保持待处理状态
            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', callbacks);

            expect(loader.loadRequests.has('hero.png')).toBe(true);
            expect(loader.loadRequests.get('hero.png')).toBe(callbacks);
        });

        it('releaseRequests 应记录所有释放调用', () => {
            loader.releaseAsset('hero.png');
            loader.releaseAsset('enemy.png');

            expect(loader.releaseRequests).toContain('hero.png');
            expect(loader.releaseRequests).toContain('enemy.png');
            expect(loader.releaseRequests.length).toBe(2);
        });

        it('resolve 后应从 loadRequests 中移除', () => {
            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onSuccess: jest.fn() });

            expect(loader.loadRequests.has('hero.png')).toBe(true);

            loader.resolve('hero.png');

            expect(loader.loadRequests.has('hero.png')).toBe(false);
        });

        it('reject 后应从 loadRequests 中移除', () => {
            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onFailure: jest.fn() });

            loader.reject('hero.png');

            expect(loader.loadRequests.has('hero.png')).toBe(false);
        });
    });

    describe('手动控制', () => {
        it('resolve 应触发 onSuccess', () => {
            const onSuccess = jest.fn();
            const customAsset = { custom: true };

            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onSuccess });

            loader.resolve('hero.png', customAsset);

            expect(onSuccess).toHaveBeenCalledWith('hero.png', customAsset);
        });

        it('resolve 不提供 asset 时应使用默认 mock 对象', () => {
            const onSuccess = jest.fn();

            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onSuccess });

            loader.resolve('hero.png');

            expect(onSuccess).toHaveBeenCalledWith(
                'hero.png',
                expect.objectContaining({ type: 'mock' }),
            );
        });

        it('reject 应触发 onFailure', () => {
            const onFailure = jest.fn();
            const customError = new Error('custom error');

            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onFailure });

            loader.reject('hero.png', customError);

            expect(onFailure).toHaveBeenCalledWith('hero.png', customError);
        });

        it('reject 不提供 error 时应使用默认错误', () => {
            const onFailure = jest.fn();

            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onFailure });

            loader.reject('hero.png');

            expect(onFailure).toHaveBeenCalledWith('hero.png', expect.any(Error));
        });

        it('progress 应触发 onProgress', () => {
            const onProgress = jest.fn();

            loader.setAutoSuccess(false);
            loader.loadAsset('big.bin', { onProgress });

            loader.progress('big.bin', 0.5);
            loader.progress('big.bin', 1.0);

            expect(onProgress).toHaveBeenCalledTimes(2);
            expect(onProgress).toHaveBeenCalledWith('big.bin', 0.5);
            expect(onProgress).toHaveBeenCalledWith('big.bin', 1.0);
        });

        it('progress 不应从 loadRequests 中移除', () => {
            const onProgress = jest.fn();

            loader.setAutoSuccess(false);
            loader.loadAsset('big.bin', { onProgress });

            loader.progress('big.bin', 0.5);

            expect(loader.loadRequests.has('big.bin')).toBe(true);
        });

        it('对不存在的请求调用 resolve 不应抛出错误', () => {
            expect(() => {
                loader.resolve('nonexistent.png');
            }).not.toThrow();
        });

        it('对不存在的请求调用 reject 不应抛出错误', () => {
            expect(() => {
                loader.reject('nonexistent.png');
            }).not.toThrow();
        });
    });

    describe('自动成功模式', () => {
        it('启用自动成功后 loadAsset 应立即触发 onSuccess', () => {
            const onSuccess = jest.fn();

            loader.setAutoSuccess(true);
            loader.loadAsset('any.png', { onSuccess });

            expect(onSuccess).toHaveBeenCalledWith('any.png', expect.any(Object));
        });

        it('自动成功模式下请求不应加入 loadRequests', () => {
            loader.setAutoSuccess(true);
            loader.loadAsset('any.png', { onSuccess: jest.fn() });

            expect(loader.loadRequests.has('any.png')).toBe(false);
        });

        it('禁用自动成功时请求应加入 loadRequests 等待手动处理', () => {
            const onSuccess = jest.fn();

            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onSuccess });

            expect(loader.loadRequests.has('hero.png')).toBe(true);
            expect(onSuccess).not.toHaveBeenCalled();
        });

        it('默认应禁用自动成功模式', () => {
            const onSuccess = jest.fn();
            const freshLoader = new MockResourceLoader();

            freshLoader.loadAsset('test.png', { onSuccess });

            expect(onSuccess).not.toHaveBeenCalled();
            expect(freshLoader.loadRequests.has('test.png')).toBe(true);
        });
    });

    describe('模拟延迟', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('设置延迟后 resolve 应在延迟后触发回调', () => {
            const onSuccess = jest.fn();

            loader.setLoadDelay(100);
            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onSuccess });

            loader.resolve('hero.png', { id: 'hero' });

            expect(onSuccess).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);

            expect(onSuccess).toHaveBeenCalledWith('hero.png', { id: 'hero' });
        });

        it('设置延迟后 reject 应在延迟后触发回调', () => {
            const onFailure = jest.fn();
            const error = new Error('timeout');

            loader.setLoadDelay(200);
            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onFailure });

            loader.reject('hero.png', error);

            expect(onFailure).not.toHaveBeenCalled();

            jest.advanceTimersByTime(200);

            expect(onFailure).toHaveBeenCalledWith('hero.png', error);
        });

        it('零延迟应立即触发回调', () => {
            const onSuccess = jest.fn();

            loader.setLoadDelay(0);
            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onSuccess });

            loader.resolve('hero.png');

            expect(onSuccess).toHaveBeenCalled();
        });

        it('自动成功模式也应遵守延迟设置', () => {
            const onSuccess = jest.fn();

            loader.setLoadDelay(50);
            loader.setAutoSuccess(true);
            loader.loadAsset('hero.png', { onSuccess });

            expect(onSuccess).not.toHaveBeenCalled();

            jest.advanceTimersByTime(50);

            expect(onSuccess).toHaveBeenCalled();
        });
    });

    describe('资源注册', () => {
        it('registerAsset 应存储资源供加载使用', () => {
            const asset = { texture: 'data' };
            loader.registerAsset('tex.png', asset);

            const onSuccess = jest.fn();
            loader.setAutoSuccess(false);
            loader.loadAsset('tex.png', { onSuccess });

            // 手动 resolve 时应使用注册的资源
            loader.resolve('tex.png');

            expect(onSuccess).toHaveBeenCalledWith('tex.png', asset);
        });

        it('registerAsset 应覆盖同名路径的旧资源', () => {
            loader.registerAsset('hero.png', { version: 1 });
            loader.registerAsset('hero.png', { version: 2 });

            const onSuccess = jest.fn();
            loader.setAutoSuccess(false);
            loader.loadAsset('hero.png', { onSuccess });
            loader.resolve('hero.png');

            expect(onSuccess).toHaveBeenCalledWith('hero.png', { version: 2 });
        });
    });
});
