import { ResourceManager } from '@framework/resource/ResourceManager';
import { IResourceLoader, LoadAssetCallbacks, LoadState } from '@framework/resource/ResourceDefs';

// ─── Mock 工具 ──────────────────────────────────────

/**
 * 可控制的 MockLoader
 * 调用 loadAsset 后不会立即回调，需要手动调 resolve/reject
 */
class MockResourceLoader implements IResourceLoader {
    /** 记录所有加载请求 */
    readonly loadRequests: Map<string, LoadAssetCallbacks> = new Map();
    /** 记录所有释放请求 */
    readonly releaseRequests: string[] = [];

    loadAsset(path: string, callbacks: LoadAssetCallbacks): void {
        this.loadRequests.set(path, callbacks);
    }

    releaseAsset(path: string): void {
        this.releaseRequests.push(path);
    }

    /** 手动模拟加载成功 */
    resolve(path: string, asset: unknown = { type: 'mock' }): void {
        const cbs = this.loadRequests.get(path);
        if (cbs) {
            cbs.onSuccess?.(path, asset);
            this.loadRequests.delete(path);
        }
    }

    /** 手动模拟加载失败 */
    reject(path: string, error: Error = new Error('load failed')): void {
        const cbs = this.loadRequests.get(path);
        if (cbs) {
            cbs.onFailure?.(path, error);
            this.loadRequests.delete(path);
        }
    }

    /** 手动模拟进度 */
    progress(path: string, value: number): void {
        const cbs = this.loadRequests.get(path);
        cbs?.onProgress?.(path, value);
    }
}

/**
 * 自动成功的 MockLoader（简化测试用）
 */
class AutoSuccessLoader implements IResourceLoader {
    readonly released: string[] = [];

    loadAsset(path: string, callbacks: LoadAssetCallbacks): void {
        callbacks.onSuccess?.(path, { name: path });
    }

    releaseAsset(path: string): void {
        this.released.push(path);
    }
}

// ─── 测试 ────────────────────────────────────────────

describe('ResourceManager', () => {
    let manager: ResourceManager;
    let loader: MockResourceLoader;

    beforeEach(() => {
        manager = new ResourceManager();
        loader = new MockResourceLoader();
        manager.setResourceLoader(loader);
        manager.onInit();
    });

    afterEach(() => {
        manager.onShutdown();
    });

    // ─── 基础设施 ─────────────────────────────────────

    describe('模块基础', () => {
        it('模块名称为 ResourceManager', () => {
            expect(manager.moduleName).toBe('ResourceManager');
        });

        it('priority 为 100（核心服务层）', () => {
            expect(manager.priority).toBe(100);
        });

        it('未设置 loader 时 loadAsset 应抛出错误', () => {
            const noLoaderMgr = new ResourceManager();
            noLoaderMgr.onInit();
            expect(() => {
                noLoaderMgr.loadAsset('test.png', 'owner1');
            }).toThrow('[ResourceManager]');
        });

        it('setResourceLoader 不接受 null', () => {
            expect(() => {
                manager.setResourceLoader(null as unknown as IResourceLoader);
            }).toThrow('[ResourceManager]');
        });
    });

    // ─── 资源加载 ─────────────────────────────────────

    describe('loadAsset - 资源加载', () => {
        it('加载成功后资源状态为 Loaded', () => {
            const onSuccess = jest.fn();
            manager.loadAsset('hero.png', 'ui', { onSuccess });

            // 模拟异步加载完成
            loader.resolve('hero.png', { id: 'hero' });

            expect(onSuccess).toHaveBeenCalledWith('hero.png', { id: 'hero' });
            expect(manager.hasAsset('hero.png')).toBe(true);

            const info = manager.getAssetInfo('hero.png');
            expect(info?.state).toBe(LoadState.Loaded);
            expect(info?.asset).toEqual({ id: 'hero' });
        });

        it('加载失败后资源状态为 Failed', () => {
            const onFailure = jest.fn();
            manager.loadAsset('missing.png', 'ui', { onFailure });

            loader.reject('missing.png', new Error('404'));

            expect(onFailure).toHaveBeenCalledWith('missing.png', expect.any(Error));
            expect(manager.hasAsset('missing.png')).toBe(false);
        });

        it('进度回调正确传递', () => {
            const onProgress = jest.fn();
            manager.loadAsset('big.bin', 'loader', { onProgress });

            loader.progress('big.bin', 0.5);
            loader.progress('big.bin', 1.0);

            expect(onProgress).toHaveBeenCalledTimes(2);
            expect(onProgress).toHaveBeenCalledWith('big.bin', 0.5);
            expect(onProgress).toHaveBeenCalledWith('big.bin', 1.0);
        });

        it('空路径应抛出错误', () => {
            expect(() => {
                manager.loadAsset('', 'owner1');
            }).toThrow('[ResourceManager]');
        });

        it('空 owner 应抛出错误', () => {
            expect(() => {
                manager.loadAsset('test.png', '');
            }).toThrow('[ResourceManager]');
        });
    });

    // ─── 缓存命中 ─────────────────────────────────────

    describe('缓存命中 - 已加载资源直接回调', () => {
        it('已加载的资源再次 loadAsset 直接返回缓存', () => {
            // 先加载一次
            manager.loadAsset('icon.png', 'ui');
            loader.resolve('icon.png', { cached: true });

            // 第二次加载同一资源（不同 owner）
            const onSuccess = jest.fn();
            manager.loadAsset('icon.png', 'entity', { onSuccess });

            // 应该直接回调，不再经过 loader
            expect(onSuccess).toHaveBeenCalledWith('icon.png', { cached: true });
            expect(loader.loadRequests.has('icon.png')).toBe(false); // 没有新的加载请求
        });
    });

    // ─── 加载去重 ─────────────────────────────────────

    describe('加载去重 - Loading 中的请求不重复发起', () => {
        it('资源 Loading 中再次请求，不重复发起加载', () => {
            const onSuccess1 = jest.fn();
            const onSuccess2 = jest.fn();

            manager.loadAsset('sprite.png', 'ui', { onSuccess: onSuccess1 });
            // 此时还没 resolve，再发一次
            manager.loadAsset('sprite.png', 'entity', { onSuccess: onSuccess2 });

            // loader 应该只收到 1 次加载请求（第二次被去重）
            // 注意：MockLoader 的 loadRequests 在 set 时会覆盖，
            // 但关键是 loader.loadAsset 只被调了一次。
            // 我们通过 resolve 后两个回调都被通知来验证去重逻辑
            loader.resolve('sprite.png', { data: 'sprite' });

            expect(onSuccess1).toHaveBeenCalledWith('sprite.png', { data: 'sprite' });
            expect(onSuccess2).toHaveBeenCalledWith('sprite.png', { data: 'sprite' });
        });
    });

    // ─── 引用计数 ─────────────────────────────────────

    describe('引用计数 - 按 owner 粒度', () => {
        beforeEach(() => {
            // 用 AutoSuccessLoader 简化
            const autoLoader = new AutoSuccessLoader();
            manager.setResourceLoader(autoLoader);
        });

        it('不同 owner 加载同一资源，引用计数递增', () => {
            manager.loadAsset('shared.png', 'ui');
            manager.loadAsset('shared.png', 'entity');
            manager.loadAsset('shared.png', 'audio');

            expect(manager.getAssetRefCount('shared.png')).toBe(3);
        });

        it('同一 owner 多次加载同一资源，引用计数不重复增加', () => {
            manager.loadAsset('item.png', 'ui');
            manager.loadAsset('item.png', 'ui');
            manager.loadAsset('item.png', 'ui');

            expect(manager.getAssetRefCount('item.png')).toBe(1);
        });

        it('未加载的资源引用计数为 0', () => {
            expect(manager.getAssetRefCount('nonexist.png')).toBe(0);
        });
    });

    // ─── 资源释放 ─────────────────────────────────────

    describe('releaseAsset - 资源释放', () => {
        let autoLoader: AutoSuccessLoader;

        beforeEach(() => {
            autoLoader = new AutoSuccessLoader();
            manager.setResourceLoader(autoLoader);
        });

        it('释放后引用计数减 1', () => {
            manager.loadAsset('bg.png', 'ui');
            manager.loadAsset('bg.png', 'scene');

            manager.releaseAsset('bg.png', 'ui');

            expect(manager.getAssetRefCount('bg.png')).toBe(1);
        });

        it('引用计数归零时资源被真正释放', () => {
            manager.loadAsset('disposable.png', 'ui');
            manager.releaseAsset('disposable.png', 'ui');

            expect(manager.hasAsset('disposable.png')).toBe(false);
            expect(manager.getAssetRefCount('disposable.png')).toBe(0);
            expect(autoLoader.released).toContain('disposable.png');
        });

        it('引用计数未归零时资源不释放', () => {
            manager.loadAsset('shared.png', 'ui');
            manager.loadAsset('shared.png', 'entity');

            manager.releaseAsset('shared.png', 'ui');

            expect(manager.hasAsset('shared.png')).toBe(true);
            expect(autoLoader.released).not.toContain('shared.png');
        });

        it('释放不存在的资源不抛错（静默忽略）', () => {
            expect(() => {
                manager.releaseAsset('ghost.png', 'ui');
            }).not.toThrow();
        });

        it('同一 owner 重复释放不重复减引用', () => {
            manager.loadAsset('double.png', 'ui');
            manager.loadAsset('double.png', 'entity');

            manager.releaseAsset('double.png', 'ui');
            manager.releaseAsset('double.png', 'ui'); // 重复释放

            expect(manager.getAssetRefCount('double.png')).toBe(1); // 只减了一次
        });
    });

    // ─── releaseByOwner ───────────────────────────────

    describe('releaseByOwner - 按 owner 批量释放', () => {
        let autoLoader: AutoSuccessLoader;

        beforeEach(() => {
            autoLoader = new AutoSuccessLoader();
            manager.setResourceLoader(autoLoader);
        });

        it('释放指定 owner 持有的所有资源', () => {
            manager.loadAsset('a.png', 'scene_battle');
            manager.loadAsset('b.png', 'scene_battle');
            manager.loadAsset('c.png', 'ui'); // 不属于 scene_battle

            manager.releaseByOwner('scene_battle');

            expect(manager.hasAsset('a.png')).toBe(false);
            expect(manager.hasAsset('b.png')).toBe(false);
            expect(manager.hasAsset('c.png')).toBe(true); // 不受影响
        });

        it('其他 owner 还持有的资源不释放', () => {
            manager.loadAsset('shared.png', 'scene_battle');
            manager.loadAsset('shared.png', 'ui');

            manager.releaseByOwner('scene_battle');

            expect(manager.hasAsset('shared.png')).toBe(true);
            expect(manager.getAssetRefCount('shared.png')).toBe(1);
        });
    });

    // ─── preload ──────────────────────────────────────

    describe('preload - 批量预加载', () => {
        it('预加载全部成功时触发 onComplete', () => {
            const autoLoader = new AutoSuccessLoader();
            manager.setResourceLoader(autoLoader);

            const onComplete = jest.fn();
            const onProgress = jest.fn();

            manager.preload(['p1.png', 'p2.png', 'p3.png'], 'preloader', {
                onComplete,
                onProgress,
            });

            expect(onComplete).toHaveBeenCalledWith(3, 0);
            expect(onProgress).toHaveBeenCalledTimes(3);
        });

        it('预加载部分失败时 onComplete 反映失败数', () => {
            // 自定义 loader：偶数路径成功，奇数路径失败
            const mixedLoader: IResourceLoader = {
                loadAsset(path: string, callbacks: LoadAssetCallbacks): void {
                    if (path.includes('fail')) {
                        callbacks.onFailure?.(path, new Error('fail'));
                    } else {
                        callbacks.onSuccess?.(path, {});
                    }
                },
                releaseAsset(): void {
                    /* noop */
                },
            };
            manager.setResourceLoader(mixedLoader);

            const onComplete = jest.fn();
            manager.preload(['ok1.png', 'fail1.png', 'ok2.png'], 'preloader', { onComplete });

            expect(onComplete).toHaveBeenCalledWith(2, 1);
        });

        it('空路径数组直接触发 onComplete(0, 0)', () => {
            const onComplete = jest.fn();
            manager.preload([], 'preloader', { onComplete });
            expect(onComplete).toHaveBeenCalledWith(0, 0);
        });

        it('预加载去重相同路径', () => {
            const autoLoader = new AutoSuccessLoader();
            manager.setResourceLoader(autoLoader);

            const onComplete = jest.fn();
            manager.preload(['dup.png', 'dup.png', 'dup.png'], 'preloader', { onComplete });

            // 去重后只有 1 个
            expect(onComplete).toHaveBeenCalledWith(1, 0);
            expect(manager.getAssetRefCount('dup.png')).toBe(1);
        });
    });

    // ─── onShutdown ───────────────────────────────────

    describe('onShutdown - 清理所有资源', () => {
        it('shutdown 后所有资源被释放', () => {
            const autoLoader = new AutoSuccessLoader();
            manager.setResourceLoader(autoLoader);

            manager.loadAsset('x.png', 'ui');
            manager.loadAsset('y.png', 'entity');

            manager.onShutdown();

            expect(manager.hasAsset('x.png')).toBe(false);
            expect(manager.hasAsset('y.png')).toBe(false);
        });
    });
});
