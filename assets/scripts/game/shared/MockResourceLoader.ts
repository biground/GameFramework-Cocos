import {
    IResourceLoader,
    LoadAssetCallbacks,
} from '@framework/resource/ResourceDefs';

/**
 * 模拟资源加载器
 * 用于 Demo 和测试环境的资源加载模拟
 * 
 * @description
 * 实现 IResourceLoader 接口，在不依赖 CocosCreator 引擎的情况下
 * 模拟资源加载行为，用于单元测试和 Demo 演示。
 */
export class MockResourceLoader implements IResourceLoader {
    private static readonly TAG = 'MockResourceLoader';

    /** 模拟资源存储 */
    private _mockAssets: Map<string, unknown> = new Map();

    /** 模拟加载延迟（毫秒） */
    private _mockDelay: number = 0;

    // Constructor
    constructor(mockDelay: number = 0) {
        this._mockDelay = mockDelay;
    }

    /**
     * 执行资源加载（模拟）
     * @param path 资源路径
     * @param callbacks 加载回调
     */
    public loadAsset(path: string, callbacks: LoadAssetCallbacks): void {
        // TODO: 实现模拟加载逻辑
        const asset = this._mockAssets.get(path);
        if (asset !== undefined) {
            callbacks.onSuccess?.(path, asset);
        } else {
            callbacks.onFailure?.(path, new Error(`[MockResourceLoader] 资源不存在: ${path}`));
        }
    }

    /**
     * 执行资源释放（模拟）
     * @param path 资源路径
     */
    public releaseAsset(path: string): void {
        // TODO: 实现模拟释放逻辑
        this._mockAssets.delete(path);
    }

    /**
     * 注册模拟资源（仅用于测试）
     * @param path 资源路径
     * @param asset 资源对象
     */
    public registerMockAsset(path: string, asset: unknown): void {
        this._mockAssets.set(path, asset);
    }
}
