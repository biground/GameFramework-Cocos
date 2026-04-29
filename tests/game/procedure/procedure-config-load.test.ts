import 'reflect-metadata';

import type { IProcedureManager } from '@framework/interfaces/IProcedureManager';
import type { IResourceManager } from '@framework/interfaces/IResourceManager';
import type { ISceneManager } from '@framework/interfaces/ISceneManager';
import type { IUIManager } from '@framework/interfaces/IUIManager';
import type { LoadDirCallbacks } from '@framework/resource/ResourceDefs';
import type { ISceneLoader } from '@framework/scene/SceneDefs';
import { GameModule } from '@framework/core/GameModule';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ProcedureConfigLoad } from '@game/procedure/ProcedureConfigLoad';
import { ProcedureScenePreload } from '@game/procedure/ProcedureScenePreload';
import { ProcedureLoadMainScene } from '@game/procedure/ProcedureLoadMainScene';
import { ProcedureMainSceneReady } from '@game/procedure/ProcedureMainSceneReady';
import { ProcedureSceneLoadFailed } from '@game/procedure/ProcedureSceneLoadFailed';
import { RUNTIME_GAME_CONTEXT_KEY, RuntimeGameContext } from '@game/RuntimeGameContext';

/** 可手动触发回调的资源管理器替身。 */
class MockResourceManager implements Pick<IResourceManager, 'loadDir'> {
    private _pendingCallbacks: Map<string, LoadDirCallbacks> = new Map();

    public loadDir(path: string, _owner: string, callbacks?: LoadDirCallbacks): void {
        if (callbacks) {
            this._pendingCallbacks.set(path, callbacks);
        }
    }

    /** 模拟指定目录加载成功。 */
    public triggerSuccess(path: string): void {
        this._pendingCallbacks.get(path)?.onSuccess?.([path]);
        this._pendingCallbacks.delete(path);
    }

    /** 模拟指定目录加载失败。 */
    public triggerFailure(path: string, error: string): void {
        this._pendingCallbacks.get(path)?.onFailure?.(error);
        this._pendingCallbacks.delete(path);
    }
}

/** 空实现场景管理器（ProcedureScenePreload 进入时不触发任何真实操作）。 */
class StubSceneManager implements ISceneManager {
    public currentScene: string | null = null;
    public isLoading = false;
    public setSceneLoader(_loader: ISceneLoader): void {}
    public loadScene(_sceneName: string): void {}
    public preloadScene(_sceneName: string, _onComplete?: (error?: string) => void): void {}
}

function createHarness(configDirs: string[]): {
    procedureManager: ProcedureManager;
    resourceManager: MockResourceManager;
    context: RuntimeGameContext;
} {
    const procedureManager = new ProcedureManager();
    const resourceManager = new MockResourceManager();
    const context: RuntimeGameContext = {
        resourceManager: resourceManager as unknown as IResourceManager,
        sceneManager: new StubSceneManager(),
        uiManager: {} as IUIManager,
        procedureManager: procedureManager as IProcedureManager,
        targetSceneName: 'MainScene',
        configDirs,
    };

    GameModule.register(procedureManager);
    procedureManager.initialize(
        new ProcedureConfigLoad(),
        new ProcedureScenePreload(),
        new ProcedureLoadMainScene(),
        new ProcedureMainSceneReady(),
        new ProcedureSceneLoadFailed(),
    );
    procedureManager.setData(RUNTIME_GAME_CONTEXT_KEY, context);

    return { procedureManager, resourceManager, context };
}

describe('ProcedureConfigLoad', () => {
    afterEach(() => {
        GameModule.shutdownAll();
    });

    it('configDirs 为空时，直接切换到 ProcedureScenePreload', () => {
        const { procedureManager } = createHarness([]);

        procedureManager.startProcedure(ProcedureConfigLoad);

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureScenePreload);
    });

    it('单目录加载成功时，切换到 ProcedureScenePreload', () => {
        const { procedureManager, resourceManager } = createHarness(['configs/settings']);

        procedureManager.startProcedure(ProcedureConfigLoad);
        resourceManager.triggerSuccess('configs/settings');

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureScenePreload);
    });

    it('多目录全部成功时，切换到 ProcedureScenePreload（并行完成）', () => {
        const { procedureManager, resourceManager } = createHarness([
            'configs/settings',
            'configs/levels',
            'configs/items',
        ]);

        procedureManager.startProcedure(ProcedureConfigLoad);

        // 前两个完成，还没有切换
        resourceManager.triggerSuccess('configs/settings');
        resourceManager.triggerSuccess('configs/levels');
        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureConfigLoad);

        // 最后一个完成，触发切换
        resourceManager.triggerSuccess('configs/items');
        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureScenePreload);
    });

    it('任意目录失败时，lastFailure 被设置，切换到 ProcedureScenePreload', () => {
        const { procedureManager, resourceManager, context } = createHarness([
            'configs/settings',
            'configs/levels',
        ]);

        procedureManager.startProcedure(ProcedureConfigLoad);
        resourceManager.triggerFailure('configs/settings', '文件不存在');

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureScenePreload);
        expect(context.lastFailure).toBeInstanceOf(Error);
        expect(context.lastFailure?.message).toContain('configs/settings');
        expect(context.lastFailure?.message).toContain('文件不存在');
    });
});
