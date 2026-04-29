import 'reflect-metadata';

import { GameEntry } from '@framework/core/GameEntry';
import { GameModule } from '@framework/core/GameModule';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ResourceManager } from '@framework/resource/ResourceManager';
import { SceneManager } from '@framework/scene/SceneManager';
import { ISceneLoader, LoadSceneCallbacks } from '@framework/scene/SceneDefs';
import { IUIFormFactory, UIFormConfig, UIFormCreateCallbacks, UILayer } from '@framework/ui/UIDefs';
import { UIFormBase } from '@framework/ui/UIFormBase';
import { UIManager } from '@framework/ui/UIManager';
import { _resetCocosRuntimeForTesting } from '@runtime/cc-385/installCocosRuntime';

import {
    bootstrapRuntimeGame,
    DEFAULT_RUNTIME_TARGET_SCENE_NAME,
} from '@game/bootstrapRuntimeGame';
import { RuntimeGameContext } from '@game/RuntimeGameContext';
import { ProcedureLoadMainScene } from '@game/procedure/ProcedureLoadMainScene';
import { MainMenuForm } from '@game/ui/MainMenuForm';

class MockSceneLoader implements ISceneLoader {
    public readonly loadedScenes: string[] = [];

    public loadScene(sceneName: string, _callbacks: LoadSceneCallbacks): void {
        this.loadedScenes.push(sceneName);
    }

    public unloadScene(_sceneName: string): void {
        // 测试替身不需要卸载场景。
    }

    public preloadScene(_sceneName: string, onComplete?: (error?: string) => void): void {
        // 立即回调成功，使 ProcedureScenePreload 能顺利推进到 ProcedureLoadMainScene
        onComplete?.(undefined);
    }
}

class MockUIFormFactory implements IUIFormFactory {
    public readonly createdForms: Array<{ formName: string; config: UIFormConfig }> = [];

    public createForm(
        formName: string,
        config: UIFormConfig,
        callbacks: UIFormCreateCallbacks,
    ): void {
        this.createdForms.push({ formName, config });
        callbacks.onSuccess(new MainMenuForm());
    }

    public destroyForm(_form: UIFormBase): void {
        // 测试替身不需要销毁资源。
    }
}

describe('bootstrapRuntimeGame', () => {
    beforeEach(() => {
        GameModule.shutdownAll();
        _resetCocosRuntimeForTesting();
    });

    afterEach(() => {
        GameModule.shutdownAll();
        _resetCocosRuntimeForTesting();
    });

    it('注册四个核心 Manager，装配 runtime，并返回默认主场景上下文', () => {
        const installRuntime = jest.fn<void, []>();

        const context = bootstrapRuntimeGame({ installRuntime });

        expect(installRuntime).toHaveBeenCalledTimes(1);
        expect(GameModule.hasModule('ResourceManager')).toBe(true);
        expect(GameModule.hasModule('SceneManager')).toBe(true);
        expect(GameModule.hasModule('UIManager')).toBe(true);
        expect(GameModule.hasModule('ProcedureManager')).toBe(true);
        expect(context.resourceManager).toBe(
            GameEntry.getModule<ResourceManager>('ResourceManager'),
        );
        expect(context.sceneManager).toBe(GameEntry.getModule<SceneManager>('SceneManager'));
        expect(context.uiManager).toBe(GameEntry.getModule<UIManager>('UIManager'));
        expect(context.procedureManager).toBe(
            GameEntry.getModule<ProcedureManager>('ProcedureManager'),
        );
        expect(context.resourceManager).toBeInstanceOf(ResourceManager);
        expect(context.sceneManager).toBeInstanceOf(SceneManager);
        expect(context.uiManager).toBeInstanceOf(UIManager);
        expect(context.procedureManager).toBeInstanceOf(ProcedureManager);
        expect(context.targetSceneName).toBe(DEFAULT_RUNTIME_TARGET_SCENE_NAME);
        expect(DEFAULT_RUNTIME_TARGET_SCENE_NAME).toBe('MainScene');
    });

    it('装配主菜单表单与主场景加载流程，并允许测试在 runtime 安装后注入策略', () => {
        const sceneLoader = new MockSceneLoader();
        const uiFactory = new MockUIFormFactory();
        const hookCalls: string[] = [];

        const context = bootstrapRuntimeGame({
            installRuntime: () => {
                hookCalls.push('installRuntime');
            },
            afterInstallRuntime: (runtimeContext: RuntimeGameContext) => {
                hookCalls.push('afterInstallRuntime');
                runtimeContext.sceneManager.setSceneLoader(sceneLoader);
                runtimeContext.uiManager.setUIFormFactory(uiFactory);
            },
        });

        expect(hookCalls).toEqual(['installRuntime', 'afterInstallRuntime']);
        // 流程链：HotUpdateCheck（无管理器跳过）→ ConfigLoad（无目录跳过）→ ScenePreload（preload 完成）→ LoadMainScene（进行中）
        expect(context.procedureManager.currentProcedure).toBeInstanceOf(ProcedureLoadMainScene);
        expect(sceneLoader.loadedScenes).toEqual([DEFAULT_RUNTIME_TARGET_SCENE_NAME]);

        let openedForm: UIFormBase | null = null;
        context.uiManager.openForm(MainMenuForm.FORM_NAME, undefined, {
            onSuccess: (_formName, form) => {
                openedForm = form;
            },
        });

        expect(uiFactory.createdForms).toEqual([
            {
                formName: MainMenuForm.FORM_NAME,
                config: {
                    path: MainMenuForm.RESOURCE_PATH,
                    layer: UILayer.Normal,
                },
            },
        ]);
        expect(openedForm).toBeInstanceOf(MainMenuForm);
        expect(context.uiManager.getForm(MainMenuForm.FORM_NAME)).toBe(openedForm);
    });
});
