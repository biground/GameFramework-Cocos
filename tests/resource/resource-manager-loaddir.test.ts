import { ResourceManager } from '@framework/resource/ResourceManager';
import {
    IResourceLoader,
    LoadAssetCallbacks,
    LoadDirCallbacks,
} from '@framework/resource/ResourceDefs';

// ─── Mock 工具 ──────────────────────────────────────

/**
 * 支持 loadDir 的可控 MockLoader
 */
class MockLoaderWithDir implements IResourceLoader {
    readonly loadRequests: Map<string, LoadAssetCallbacks> = new Map();
    readonly loadDirRequests: Map<string, LoadDirCallbacks> = new Map();
    readonly releaseRequests: string[] = [];

    loadAsset(path: string, callbacks: LoadAssetCallbacks): void {
        this.loadRequests.set(path, callbacks);
    }

    releaseAsset(path: string): void {
        this.releaseRequests.push(path);
    }

    loadDir(path: string, callbacks: LoadDirCallbacks): void {
        this.loadDirRequests.set(path, callbacks);
    }

    /** 手动模拟目录加载成功 */
    resolveDir(path: string, paths: string[]): void {
        const cbs = this.loadDirRequests.get(path);
        if (cbs) {
            cbs.onSuccess?.(paths);
            this.loadDirRequests.delete(path);
        }
    }

    /** 手动模拟目录加载失败 */
    rejectDir(path: string, error: string = 'load dir failed'): void {
        const cbs = this.loadDirRequests.get(path);
        if (cbs) {
            cbs.onFailure?.(error);
            this.loadDirRequests.delete(path);
        }
    }

    /** 手动模拟 loadAsset 成功 */
    resolveAsset(path: string, asset: unknown = { name: path }): void {
        const cbs = this.loadRequests.get(path);
        if (cbs) {
            cbs.onSuccess?.(path, asset);
            this.loadRequests.delete(path);
        }
    }
}

// ─── 测试 ────────────────────────────────────────────

describe('ResourceManager.loadDir', () => {
    let manager: ResourceManager;
    let loader: MockLoaderWithDir;

    beforeEach(() => {
        manager = new ResourceManager();
        loader = new MockLoaderWithDir();
        manager.onInit();
    });

    afterEach(() => {
        manager.onShutdown();
    });

    // ─── 未注入 loader ─────────────────────────────────

    it('未注入 loader 时应抛出错误', () => {
        expect(() => {
            manager.loadDir('textures/', 'owner1');
        }).toThrow('[ResourceManager] 未设置 ResourceLoader');
    });

    // ─── 基本调用 ──────────────────────────────────────

    it('应调用 loader 的 loadDir 方法', () => {
        manager.setResourceLoader(loader);
        manager.loadDir('textures/', 'owner1');

        expect(loader.loadDirRequests.has('textures/')).toBe(true);
    });

    // ─── onSuccess：owner 注册 ──────────────────────────

    it('onSuccess 回调中 owner 被正确注册到所有 path', () => {
        manager.setResourceLoader(loader);
        const onSuccess = jest.fn();

        manager.loadDir('textures/', 'owner1', { onSuccess });
        loader.resolveDir('textures/', ['textures/a', 'textures/b']);

        expect(onSuccess).toHaveBeenCalledWith(['textures/a', 'textures/b']);
        expect(manager.hasAsset('textures/a')).toBe(true);
        expect(manager.hasAsset('textures/b')).toBe(true);
        expect(manager.getAssetRefCount('textures/a')).toBe(1);
        expect(manager.getAssetRefCount('textures/b')).toBe(1);
    });

    it('已有 AssetInfo（loadAsset 过）时只追加 owner，引用计数正确叠加', () => {
        manager.setResourceLoader(loader);

        // 先用 loadAsset 加载 textures/a（owner1），引用计数 = 1
        manager.loadAsset('textures/a', 'owner1');
        loader.resolveAsset('textures/a');

        expect(manager.getAssetRefCount('textures/a')).toBe(1);

        // 再用 loadDir（owner2）加载包含同一路径的目录
        manager.loadDir('textures/', 'owner2');
        loader.resolveDir('textures/', ['textures/a', 'textures/b']);

        // textures/a：owner1 + owner2，引用计数 = 2
        expect(manager.getAssetRefCount('textures/a')).toBe(2);
        // textures/b：仅 owner2，引用计数 = 1
        expect(manager.getAssetRefCount('textures/b')).toBe(1);
    });

    it('同一 owner 多次 loadDir 同一目录，同一 path 引用计数不重复计', () => {
        manager.setResourceLoader(loader);

        manager.loadDir('textures/', 'owner1');
        loader.resolveDir('textures/', ['textures/a']);

        manager.loadDir('textures/', 'owner1');
        loader.resolveDir('textures/', ['textures/a']);

        // owner1 持有 textures/a，refCount 应为 1（同 owner 不重复计数）
        expect(manager.getAssetRefCount('textures/a')).toBe(1);
    });

    // ─── onFailure ─────────────────────────────────────

    it('onFailure 回调应正确传递错误消息', () => {
        manager.setResourceLoader(loader);
        const onFailure = jest.fn();

        manager.loadDir('textures/', 'owner1', { onFailure });
        loader.rejectDir('textures/', '目录不存在');

        expect(onFailure).toHaveBeenCalledWith('目录不存在');
    });

    it('不传 callbacks 时 onFailure 不报错', () => {
        manager.setResourceLoader(loader);

        manager.loadDir('textures/', 'owner1');
        expect(() => loader.rejectDir('textures/', '目录不存在')).not.toThrow();
    });

    // ─── onProgress ────────────────────────────────────

    it('onProgress 回调应正确透传 completed/total', () => {
        manager.setResourceLoader(loader);
        const onProgress = jest.fn();

        manager.loadDir('textures/', 'owner1', { onProgress });
        const cbs = loader.loadDirRequests.get('textures/');
        cbs?.onProgress?.(3, 10);

        expect(onProgress).toHaveBeenCalledWith(3, 10);
    });
});
