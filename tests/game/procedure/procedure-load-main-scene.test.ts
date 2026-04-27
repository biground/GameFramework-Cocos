import 'reflect-metadata';

import type { IProcedureManager } from '@framework/interfaces/IProcedureManager';
import type { IResourceManager } from '@framework/interfaces/IResourceManager';
import type { ISceneManager } from '@framework/interfaces/ISceneManager';
import type { IUIManager } from '@framework/interfaces/IUIManager';
import type { ISceneLoader } from '@framework/scene/SceneDefs';
import { GameModule } from '@framework/core/GameModule';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ProcedureLoadMainScene } from '@game/procedure/ProcedureLoadMainScene';
import { ProcedureMainSceneReady } from '@game/procedure/ProcedureMainSceneReady';
import { ProcedureSceneLoadFailed } from '@game/procedure/ProcedureSceneLoadFailed';
import { RUNTIME_GAME_CONTEXT_KEY, RuntimeGameContext } from '@game/RuntimeGameContext';

class MockSceneManager implements ISceneManager {
    public readonly loadedScenes: string[] = [];
    public currentScene: string | null = null;
    public isLoading = false;

    public setSceneLoader(_loader: ISceneLoader): void {
        // 测试替身不需要真实加载器。
    }

    public loadScene(sceneName: string): void {
        this.loadedScenes.push(sceneName);
        this.isLoading = true;
    }
}

function createProcedureHarness(targetSceneName = 'MainScene'): {
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
        targetSceneName,
    };

    GameModule.register(procedureManager);
    procedureManager.initialize(
        new ProcedureLoadMainScene(),
        new ProcedureMainSceneReady(),
        new ProcedureSceneLoadFailed(),
    );
    procedureManager.setData(RUNTIME_GAME_CONTEXT_KEY, context);

    return { procedureManager, sceneManager, context };
}

describe('ProcedureLoadMainScene', () => {
    afterEach(() => {
        GameModule.shutdownAll();
    });

    it('启动后只发起一次目标场景加载，loading 期间多次 update 不重复加载', () => {
        const { procedureManager, sceneManager } = createProcedureHarness('MainScene');

        procedureManager.startProcedure(ProcedureLoadMainScene);
        GameModule.update(0.016);
        GameModule.update(0.016);
        GameModule.update(0.016);

        expect(sceneManager.loadedScenes).toEqual(['MainScene']);
        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureLoadMainScene);
    });

    it('当前场景命中目标场景后切换到主场景就绪流程', () => {
        const { procedureManager, sceneManager } = createProcedureHarness('MainScene');

        procedureManager.startProcedure(ProcedureLoadMainScene);
        GameModule.update(0.016);
        sceneManager.currentScene = 'MainScene';
        sceneManager.isLoading = false;
        GameModule.update(0.016);

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureMainSceneReady);
    });

    it('加载结束但当前场景不匹配时切换到失败流程并写入 lastFailure', () => {
        const { procedureManager, sceneManager, context } = createProcedureHarness('MainScene');

        procedureManager.startProcedure(ProcedureLoadMainScene);
        GameModule.update(0.016);
        sceneManager.currentScene = 'LoginScene';
        sceneManager.isLoading = false;
        GameModule.update(0.016);

        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureSceneLoadFailed);
        expect(context.lastFailure).toBeInstanceOf(Error);
        expect(context.lastFailure?.message).toContain('MainScene');
        expect(context.lastFailure?.message).toContain('LoginScene');
    });
});
