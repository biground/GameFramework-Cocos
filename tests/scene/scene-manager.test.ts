import { SceneManager } from '@framework/scene/SceneManager';
import { ISceneLoader, LoadSceneCallbacks } from '@framework/scene/SceneDefs';

// ─── Mock 工具 ──────────────────────────────────────

/**
 * Mock 场景加载器
 * 保存回调供测试手动触发加载流程的各个阶段
 */
class MockSceneLoader implements ISceneLoader {
    /** 最近一次 loadScene 传入的回调 */
    lastCallbacks: LoadSceneCallbacks | null = null;
    /** 最近一次 loadScene 传入的场景名 */
    lastSceneName: string | null = null;
    /** loadScene 的调用次数 */
    loadCount: number = 0;
    /** unloadScene 的调用记录 */
    unloadHistory: string[] = [];

    loadScene(sceneName: string, callbacks: LoadSceneCallbacks): void {
        this.loadCount++;
        this.lastSceneName = sceneName;
        this.lastCallbacks = callbacks;
    }

    unloadScene(sceneName: string): void {
        this.unloadHistory.push(sceneName);
    }

    // ─── 模拟辅助方法 ──────────────────────────────

    /** 模拟加载进度 */
    simulateProgress(progress: number): void {
        this.lastCallbacks?.onProgress?.(progress);
    }

    /** 模拟加载成功 */
    simulateSuccess(sceneName: string): void {
        this.lastCallbacks?.onSuccess?.(sceneName);
    }

    /** 模拟加载失败 */
    simulateFailure(sceneName: string, error: string): void {
        this.lastCallbacks?.onFailure?.(sceneName, error);
    }
}

// ─── 测试用例 ──────────────────────────────────────

describe('SceneManager', () => {
    let manager: SceneManager;
    let mockLoader: MockSceneLoader;

    beforeEach(() => {
        manager = new SceneManager();
        mockLoader = new MockSceneLoader();
        manager.onInit();
        manager.setSceneLoader(mockLoader);
    });

    afterEach(() => {
        manager.onShutdown();
    });

    // ─── 初始化 ────────────────────────────────────

    describe('初始化', () => {
        test('初始状态：currentScene 为 null，isLoading 为 false', () => {
            const fresh = new SceneManager();
            fresh.onInit();
            expect(fresh.currentScene).toBeNull();
            expect(fresh.isLoading).toBe(false);
        });

        test('moduleName 为 SceneManager', () => {
            expect(manager.moduleName).toBe('SceneManager');
        });

        test('priority 为 220', () => {
            expect(manager.priority).toBe(220);
        });
    });

    // ─── 场景加载 ──────────────────────────────────

    describe('场景加载', () => {
        test('loadScene 成功更新 currentScene', () => {
            manager.loadScene('TestScene');
            mockLoader.simulateSuccess('TestScene');
            expect(manager.currentScene).toBe('TestScene');
        });

        test('loadScene 过程中 isLoading 为 true', () => {
            manager.loadScene('TestScene');
            expect(manager.isLoading).toBe(true);
        });

        test('加载成功后 isLoading 恢复为 false', () => {
            manager.loadScene('TestScene');
            mockLoader.simulateSuccess('TestScene');
            expect(manager.isLoading).toBe(false);
        });

        test('onProgress 回调正确传递加载进度', () => {
            const progressValues: number[] = [];
            manager.loadScene('TestScene', {
                onProgress: (p) => progressValues.push(p),
            });
            mockLoader.simulateProgress(0.3);
            mockLoader.simulateProgress(0.7);
            mockLoader.simulateProgress(1.0);
            expect(progressValues).toEqual([0.3, 0.7, 1.0]);
        });

        test('加载成功后触发 options 中无显式 onSuccess 也不报错', () => {
            // 不传 options，仅验证不抛异常
            manager.loadScene('TestScene');
            expect(() => mockLoader.simulateSuccess('TestScene')).not.toThrow();
        });

        test('加载失败时 isLoading 恢复为 false 且 currentScene 不变', () => {
            manager.loadScene('TestScene');
            mockLoader.simulateFailure('TestScene', '文件不存在');
            expect(manager.isLoading).toBe(false);
            expect(manager.currentScene).toBeNull();
        });
    });

    // ─── 加载去重 ──────────────────────────────────

    describe('加载去重', () => {
        test('正在加载时重复调用同一场景 loadScene 被忽略', () => {
            manager.loadScene('TestScene');
            manager.loadScene('TestScene');
            // loader 只应被调用一次
            expect(mockLoader.loadCount).toBe(1);
        });

        test('加载已是当前场景被忽略', () => {
            manager.loadScene('TestScene');
            mockLoader.simulateSuccess('TestScene');
            // 已是当前场景，再次调用应被忽略
            manager.loadScene('TestScene');
            expect(mockLoader.loadCount).toBe(1);
        });

        test('正在加载其他场景时新请求被忽略', () => {
            manager.loadScene('SceneA');
            manager.loadScene('SceneB');
            // 正在加载 SceneA 时，SceneB 的请求应被忽略
            expect(mockLoader.loadCount).toBe(1);
            expect(mockLoader.lastSceneName).toBe('SceneA');
        });
    });

    // ─── 场景事件 ──────────────────────────────────

    describe('场景事件', () => {
        // @todo 待 EventManager 集成后启用
        test.skip('加载开始时 emit SCENE_LOADING 事件', () => {
            // 待实现
        });

        // @todo 待 EventManager 集成后启用
        test.skip('加载成功后 emit SCENE_LOADED 事件', () => {
            // 待实现
        });

        // @todo 待 EventManager 集成后启用
        test.skip('卸载后 emit SCENE_UNLOADED 事件', () => {
            // 待实现
        });
    });

    // ─── 异常处理 ──────────────────────────────────

    describe('异常处理', () => {
        test('未设置 loader 时调用 loadScene 输出警告', () => {
            const fresh = new SceneManager();
            fresh.onInit();
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            fresh.loadScene('TestScene');
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SceneManager]'));
            warnSpy.mockRestore();
        });

        test('空场景名调用 loadScene 输出警告', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            manager.loadScene('');
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SceneManager]'));
            warnSpy.mockRestore();
        });
    });

    // ─── 生命周期 ──────────────────────────────────

    describe('生命周期', () => {
        test('onShutdown 重置所有状态', () => {
            manager.loadScene('TestScene');
            mockLoader.simulateSuccess('TestScene');
            expect(manager.currentScene).toBe('TestScene');

            manager.onShutdown();

            expect(manager.currentScene).toBeNull();
            expect(manager.isLoading).toBe(false);
        });
    });
});
