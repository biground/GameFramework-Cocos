import 'reflect-metadata';

import type { IProcedureManager } from '@framework/interfaces/IProcedureManager';
import type { IResourceManager } from '@framework/interfaces/IResourceManager';
import type { ISceneManager } from '@framework/interfaces/ISceneManager';
import type { IUIManager } from '@framework/interfaces/IUIManager';
import type { ISceneLoader } from '@framework/scene/SceneDefs';
import { GameModule } from '@framework/core/GameModule';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ProcedureScenePreload } from '@game/procedure/ProcedureScenePreload';
import { ProcedureLoadMainScene } from '@game/procedure/ProcedureLoadMainScene';
import { ProcedureMainSceneReady } from '@game/procedure/ProcedureMainSceneReady';
import { ProcedureSceneLoadFailed } from '@game/procedure/ProcedureSceneLoadFailed';
import { RUNTIME_GAME_CONTEXT_KEY, RuntimeGameContext } from '@game/RuntimeGameContext';

/** 可手动触发回调的场景管理器替身。 */
class MockSceneManager implements ISceneManager {
    public currentScene: string | null = null;
    public isLoading = false;

    private _preloadCallback: ((error?: string) => void) | null = null;

    public setSceneLoader(_loader: ISceneLoader): void {}

    public loadScene(_sceneName: string): void {}

    public preloadScene(_sceneName: string, onComplete?: (error?: string) => void): void {
        this._preloadCallback = onComplete ?? null;
    }

    /** 模拟预加载成功。 */
    public triggerPreloadSuccess(): void {
        this._preloadCallback?.(undefined);
        this._preloadCallback = null;
    }

    /** 模拟预加载失败。 */
    public triggerPreloadFailure(error: string): void {
        this._preloadCallback?.(error);
        this._preloadCallback = null;
    }
}

function createHarness(opts: { targetSceneName?: string; sceneToPreload?: string }): {
    procedureManager: ProcedureManager;
    sceneManager: MockSceneManager;
    context: RuntimeGameContext;
} {
    const procedureManager = new ProcedureManager();
    const sceneManager = new MockSceneManager();
    const context: RuntimeGameContext = {
        resourceManager: {} as IResourceManager,
        sceneManager,
        uiManager: {} as IUIManager,
        procedureManager: procedureManager as IProcedureManager,
        targetSceneName: opts.targetSceneName ?? 'MainScene',
        sceneToPreload: opts.sceneToPreload,
    };

    GameModule.register(procedureManager);
    procedureManager.initialize(
        new ProcedureScenePreload(),
        new ProcedureLoadMainScene(),
        new ProcedureMainSceneReady(),
        new ProcedureSceneLoadFailed(),
    );
    procedureManager.setData(RUNTIME_GAME_CONTEXT_KEY, context);

    return { procedureManager, sceneManager, context };
}

describe('ProcedureScenePreload', () => {
    afterEach(() => {
        GameModule.shutdownAll();
    });

    it('sceneToPreload 存在时使用它，否则使用 targetSceneName', () => {
        const { procedureManager: pm1, sceneManager: sm1 } = createHarness({
            targetSceneName: 'MainScene',
            sceneToPreload: 'GameScene',
        });
        const preloadSpy1 = jest.spyOn(sm1, 'preloadScene');
        pm1.startProcedure(ProcedureScenePreload);
        expect(preloadSpy1).toHaveBeenCalledWith('GameScene', expect.any(Function));

        GameModule.shutdownAll();

        const { procedureManager: pm2, sceneManager: sm2 } = createHarness({
            targetSceneName: 'MainScene',
            sceneToPreload: undefined,
        });
        const preloadSpy2 = jest.spyOn(sm2, 'preloadScene');
        pm2.startProcedure(ProcedureScenePreload);
        expect(preloadSpy2).toHaveBeenCalledWith('MainScene', expect.any(Function));
    });

    it('preloadScene 成功，切换到 ProcedureLoadMainScene', () => {
        const { procedureManager, sceneManager } = createHarness({ targetSceneName: 'MainScene' });

        procedureManager.startProcedure(ProcedureScenePreload);
        sceneManager.triggerPreloadSuccess();

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureLoadMainScene);
    });

    it('preloadScene 失败，lastFailure 被设置，切换到 ProcedureSceneLoadFailed', () => {
        const { procedureManager, sceneManager, context } = createHarness({
            targetSceneName: 'MainScene',
        });

        procedureManager.startProcedure(ProcedureScenePreload);
        sceneManager.triggerPreloadFailure('场景文件找不到');

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureSceneLoadFailed);
        expect(context.lastFailure).toBeInstanceOf(Error);
        expect(context.lastFailure?.message).toContain('MainScene');
        expect(context.lastFailure?.message).toContain('场景文件找不到');
    });
});
