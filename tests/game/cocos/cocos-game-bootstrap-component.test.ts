import 'reflect-metadata';

import { Component, director } from 'cc';

import { GameEntry } from '@framework/core/GameEntry';
import { GameModule } from '@framework/core/GameModule';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ResourceManager } from '@framework/resource/ResourceManager';
import { SceneManager } from '@framework/scene/SceneManager';
import { UIManager } from '@framework/ui/UIManager';
import { CocosGameBootstrapComponent } from '@game/cocos/CocosGameBootstrapComponent';
import { DEFAULT_RUNTIME_TARGET_SCENE_NAME } from '@game/bootstrapRuntimeGame';
import { ProcedureLoadMainScene } from '@game/procedure/ProcedureLoadMainScene';
import { _resetCocosRuntimeForTesting } from '@runtime/cc-385/installCocosRuntime';

class TestableCocosGameBootstrapComponent extends CocosGameBootstrapComponent {
    public invokeOnLoad(): void {
        this.onLoad();
    }

    public invokeUpdate(deltaTime: number): void {
        this.update(deltaTime);
    }

    public invokeOnDestroy(): void {
        this.onDestroy();
    }
}

describe('CocosGameBootstrapComponent', () => {
    beforeEach(() => {
        GameModule.shutdownAll();
        _resetCocosRuntimeForTesting();
        (director.loadScene as jest.Mock).mockReset();
        // preloadScene 立即回调成功，使 ProcedureScenePreload 能推进到 ProcedureLoadMainScene
        (director.preloadScene as jest.Mock).mockImplementation(
            (_sceneName: string, onLoaded?: (err: Error | null) => void) => {
                onLoaded?.(null);
            },
        );
    });

    afterEach(() => {
        GameModule.shutdownAll();
        _resetCocosRuntimeForTesting();
        jest.clearAllMocks();
        (director.loadScene as jest.Mock).mockReset();
        (director.preloadScene as jest.Mock).mockReset();
    });

    it('onLoad 启动 runtime 并加载默认主场景', () => {
        const component = new TestableCocosGameBootstrapComponent();

        component.invokeOnLoad();

        expect(component).toBeInstanceOf(Component);
        expect(component.context?.targetSceneName).toBe(DEFAULT_RUNTIME_TARGET_SCENE_NAME);
        expect(GameModule.hasModule('ResourceManager')).toBe(true);
        expect(GameModule.hasModule('SceneManager')).toBe(true);
        expect(GameModule.hasModule('UIManager')).toBe(true);
        expect(GameModule.hasModule('ProcedureManager')).toBe(true);
        expect(GameEntry.getModule<ResourceManager>('ResourceManager')).toBeInstanceOf(
            ResourceManager,
        );
        expect(GameEntry.getModule<SceneManager>('SceneManager')).toBeInstanceOf(SceneManager);
        expect(GameEntry.getModule<UIManager>('UIManager')).toBeInstanceOf(UIManager);
        const procedureManager = GameEntry.getModule<ProcedureManager>('ProcedureManager');
        expect(procedureManager.currentProcedure).toBeInstanceOf(ProcedureLoadMainScene);
        expect(director.loadScene).toHaveBeenCalledWith(
            DEFAULT_RUNTIME_TARGET_SCENE_NAME,
            expect.any(Function),
        );
    });

    it('支持自定义目标场景并在 update 时驱动 GameEntry', () => {
        const component = new TestableCocosGameBootstrapComponent();
        const updateSpy = jest.spyOn(GameEntry, 'update');

        component.targetSceneName = '  CustomBattleScene  ';
        component.invokeOnLoad();
        component.invokeUpdate(0.25);

        expect(component.context?.targetSceneName).toBe('CustomBattleScene');
        expect(director.loadScene).toHaveBeenCalledWith('CustomBattleScene', expect.any(Function));
        expect(updateSpy).toHaveBeenCalledWith(0.25);

        updateSpy.mockRestore();
    });

    it('onDestroy 清空上下文并关闭框架模块', () => {
        const component = new TestableCocosGameBootstrapComponent();

        component.invokeOnLoad();
        expect(component.context).not.toBeNull();

        component.invokeOnDestroy();

        expect(component.context).toBeNull();
        expect(GameModule.hasModule('ResourceManager')).toBe(false);
        expect(GameModule.hasModule('SceneManager')).toBe(false);
        expect(GameModule.hasModule('UIManager')).toBe(false);
        expect(GameModule.hasModule('ProcedureManager')).toBe(false);
    });

    it('onDestroy 后同一 JS runtime 可再次 onLoad 并再次加载目标场景', () => {
        const firstComponent = new TestableCocosGameBootstrapComponent();
        firstComponent.invokeOnLoad();
        expect(director.loadScene).toHaveBeenCalledWith(
            DEFAULT_RUNTIME_TARGET_SCENE_NAME,
            expect.any(Function),
        );

        firstComponent.invokeOnDestroy();
        (director.loadScene as jest.Mock).mockClear();

        const secondComponent = new TestableCocosGameBootstrapComponent();
        secondComponent.targetSceneName = 'SecondMainScene';

        secondComponent.invokeOnLoad();

        expect(secondComponent.context?.targetSceneName).toBe('SecondMainScene');
        expect(director.loadScene).toHaveBeenCalledTimes(1);
        expect(director.loadScene).toHaveBeenCalledWith('SecondMainScene', expect.any(Function));
    });
});
