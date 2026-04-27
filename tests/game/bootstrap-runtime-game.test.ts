import 'reflect-metadata';

import { GameEntry } from '@framework/core/GameEntry';
import { GameModule } from '@framework/core/GameModule';
import { ProcedureManager } from '@framework/procedure/ProcedureManager';
import { ResourceManager } from '@framework/resource/ResourceManager';
import { SceneManager } from '@framework/scene/SceneManager';
import { UIManager } from '@framework/ui/UIManager';
import { _resetCocosRuntimeForTesting } from '@runtime/cc-385/installCocosRuntime';

import {
    bootstrapRuntimeGame,
    DEFAULT_RUNTIME_TARGET_SCENE_NAME,
} from '@game/bootstrapRuntimeGame';

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
});
