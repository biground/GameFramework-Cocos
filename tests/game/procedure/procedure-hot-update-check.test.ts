import 'reflect-metadata';

import type { IProcedureManager } from '@framework/interfaces/IProcedureManager';
import type { IResourceManager } from '@framework/interfaces/IResourceManager';
import type { ISceneManager } from '@framework/interfaces/ISceneManager';
import type { IUIManager } from '@framework/interfaces/IUIManager';
import type { IHotUpdateManager } from '@framework/interfaces/IHotUpdateManager';
import type { ISceneLoader } from '@framework/scene/SceneDefs';
import { HotUpdateState, HotUpdateProgressData } from '@framework/hotupdate/HotUpdateDefs';
import { GameModule } from '@framework/core/GameModule';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ProcedureHotUpdateCheck } from '@game/procedure/ProcedureHotUpdateCheck';
import { ProcedureConfigLoad } from '@game/procedure/ProcedureConfigLoad';
import { ProcedureScenePreload } from '@game/procedure/ProcedureScenePreload';
import { ProcedureLoadMainScene } from '@game/procedure/ProcedureLoadMainScene';
import { ProcedureMainSceneReady } from '@game/procedure/ProcedureMainSceneReady';
import { ProcedureSceneLoadFailed } from '@game/procedure/ProcedureSceneLoadFailed';
import { RUNTIME_GAME_CONTEXT_KEY, RuntimeGameContext } from '@game/RuntimeGameContext';

class MockHotUpdateManager implements IHotUpdateManager {
    private _resolveWith: boolean | null = null;
    private _rejectWith: Error | null = null;

    public setupResolve(value: boolean): void {
        this._resolveWith = value;
        this._rejectWith = null;
    }

    public setupReject(error: Error): void {
        this._rejectWith = error;
        this._resolveWith = null;
    }

    public checkForUpdate(): Promise<boolean> {
        if (this._rejectWith) {
            return Promise.reject(this._rejectWith);
        }
        return Promise.resolve(this._resolveWith ?? false);
    }

    public setAdapter = jest.fn();
    public setComparator = jest.fn();
    public setConfig = jest.fn();
    public startUpdate = jest.fn<Promise<boolean>, []>().mockResolvedValue(false);
    public applyUpdate = jest.fn<Promise<boolean>, []>().mockResolvedValue(false);
    public getState = jest.fn<HotUpdateState, []>().mockReturnValue(HotUpdateState.None);
    public getProgress = jest.fn<HotUpdateProgressData, []>().mockReturnValue({
        downloadedFiles: 0,
        totalFiles: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        percentage: 0,
    });
    public getLocalVersion = jest.fn<string | null, []>().mockReturnValue(null);
    public getRemoteVersion = jest.fn<string | null, []>().mockReturnValue(null);
}

/** 空实现场景管理器——preloadScene 不回调，让流程停在 ProcedureScenePreload。 */
class StubSceneManager implements ISceneManager {
    public currentScene: string | null = null;
    public isLoading = false;
    public setSceneLoader(_loader: ISceneLoader): void {}
    public loadScene(_sceneName: string): void {}
    public preloadScene(_sceneName: string, _onComplete?: (error?: string) => void): void {}
}

function createHarness(hotUpdateManager?: IHotUpdateManager): {
    procedureManager: ProcedureManager;
    context: RuntimeGameContext;
} {
    const procedureManager = new ProcedureManager();
    const context: RuntimeGameContext = {
        resourceManager: {} as IResourceManager,
        sceneManager: new StubSceneManager(),
        uiManager: {} as IUIManager,
        procedureManager: procedureManager as IProcedureManager,
        targetSceneName: 'MainScene',
        hotUpdateManager,
        configDirs: [],
    };

    GameModule.register(procedureManager);
    procedureManager.initialize(
        new ProcedureHotUpdateCheck(),
        new ProcedureConfigLoad(),
        new ProcedureScenePreload(),
        new ProcedureLoadMainScene(),
        new ProcedureMainSceneReady(),
        new ProcedureSceneLoadFailed(),
    );
    procedureManager.setData(RUNTIME_GAME_CONTEXT_KEY, context);

    return { procedureManager, context };
}

const flushPromises = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('ProcedureHotUpdateCheck', () => {
    afterEach(() => {
        GameModule.shutdownAll();
    });

    it('未配置 hotUpdateManager 时，跳过热更新，流程推进到 ProcedureScenePreload', () => {
        const { procedureManager } = createHarness(undefined);

        procedureManager.startProcedure(ProcedureHotUpdateCheck);

        // HotUpdateCheck → (无管理器直接跳) → ConfigLoad → (无目录直接跳) → ScenePreload（等待预加载回调）
        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureScenePreload);
    });

    it('checkForUpdate 返回 false（无更新），流程推进到 ProcedureScenePreload', async () => {
        const manager = new MockHotUpdateManager();
        manager.setupResolve(false);
        const { procedureManager } = createHarness(manager);

        procedureManager.startProcedure(ProcedureHotUpdateCheck);
        await flushPromises();

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureScenePreload);
    });

    it('checkForUpdate 返回 true（有更新），记录日志后流程推进到 ProcedureScenePreload（demo 模式跳过下载）', async () => {
        const manager = new MockHotUpdateManager();
        manager.setupResolve(true);
        const { procedureManager } = createHarness(manager);

        procedureManager.startProcedure(ProcedureHotUpdateCheck);
        await flushPromises();

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureScenePreload);
    });

    it('checkForUpdate reject 时，lastFailure 被设置，流程容错推进到 ProcedureScenePreload', async () => {
        const manager = new MockHotUpdateManager();
        manager.setupReject(new Error('网络超时'));
        const { procedureManager, context } = createHarness(manager);

        procedureManager.startProcedure(ProcedureHotUpdateCheck);
        await flushPromises();

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureScenePreload);
        expect(context.lastFailure).toBeInstanceOf(Error);
        expect(context.lastFailure?.message).toBe('网络超时');
    });
});
