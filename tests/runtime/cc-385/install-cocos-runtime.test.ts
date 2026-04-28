/**
 * installCocosRuntime Red 测试
 *
 * 契约：
 * - 一次装配三个策略：CocosResourceLoader / CocosSceneLoader / CocosUIFormFactory
 * - 三模块缺一抛错（消息含模块名）
 * - 重复调用幂等：Logger.warn + 不再装配
 * - GameEntry.shutdown 后新注册的一批 Manager 需要重新装配
 * - _resetCocosRuntimeForTesting 后能再次装配成功
 */
import 'reflect-metadata';

import { GameEntry } from '@framework/core/GameEntry';
import { Logger } from '@framework/debug/Logger';
import { ResourceManager } from '@framework/resource/ResourceManager';
import { SceneManager } from '@framework/scene/SceneManager';
import { UIManager } from '@framework/ui/UIManager';

import { CocosResourceLoader } from '@runtime/cc-385/CocosResourceLoader';
import { CocosSceneLoader } from '@runtime/cc-385/CocosSceneLoader';
import { CocosUIFormFactory } from '@runtime/cc-385/CocosUIFormFactory';
import {
    _resetCocosRuntimeForTesting,
    installCocosRuntime,
} from '@runtime/cc-385/installCocosRuntime';

function registerAll(): {
    resourceManager: ResourceManager;
    sceneManager: SceneManager;
    uiManager: UIManager;
} {
    const resourceManager = new ResourceManager();
    const sceneManager = new SceneManager();
    const uiManager = new UIManager();
    GameEntry.registerModule(resourceManager);
    GameEntry.registerModule(sceneManager);
    GameEntry.registerModule(uiManager);
    return { resourceManager, sceneManager, uiManager };
}

describe('installCocosRuntime', () => {
    let warnSpy: jest.SpyInstance;
    let infoSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        _resetCocosRuntimeForTesting();
        GameEntry.shutdown();
        warnSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
        infoSpy = jest.spyOn(Logger, 'info').mockImplementation(() => undefined);
        errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        warnSpy.mockRestore();
        infoSpy.mockRestore();
        errorSpy.mockRestore();
        GameEntry.shutdown();
        _resetCocosRuntimeForTesting();
    });

    it('happy path：三个 setter 各被调一次，参数类型正确', () => {
        const { resourceManager, sceneManager, uiManager } = registerAll();
        const setRes = jest.spyOn(resourceManager, 'setResourceLoader');
        const setScene = jest.spyOn(sceneManager, 'setSceneLoader');
        const setUI = jest.spyOn(uiManager, 'setUIFormFactory');

        installCocosRuntime();

        expect(setRes).toHaveBeenCalledTimes(1);
        expect(setRes.mock.calls[0][0]).toBeInstanceOf(CocosResourceLoader);
        expect(setScene).toHaveBeenCalledTimes(1);
        expect(setScene.mock.calls[0][0]).toBeInstanceOf(CocosSceneLoader);
        expect(setUI).toHaveBeenCalledTimes(1);
        expect(setUI.mock.calls[0][0]).toBeInstanceOf(CocosUIFormFactory);
    });

    it('重复调用：第二次三个 setter 不再被调，触发 Logger.warn', () => {
        const { resourceManager, sceneManager, uiManager } = registerAll();
        installCocosRuntime();
        const setRes = jest.spyOn(resourceManager, 'setResourceLoader');
        const setScene = jest.spyOn(sceneManager, 'setSceneLoader');
        const setUI = jest.spyOn(uiManager, 'setUIFormFactory');
        warnSpy.mockClear();

        installCocosRuntime();

        expect(setRes).not.toHaveBeenCalled();
        expect(setScene).not.toHaveBeenCalled();
        expect(setUI).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith('CocosRuntime', expect.any(String));
    });

    it('已安装后如果三大 Manager 实例变化则重新装配新实例', () => {
        const first = registerAll();
        installCocosRuntime();
        GameEntry.shutdown();

        const second = registerAll();
        const setRes = jest.spyOn(second.resourceManager, 'setResourceLoader');
        const setScene = jest.spyOn(second.sceneManager, 'setSceneLoader');
        const setUI = jest.spyOn(second.uiManager, 'setUIFormFactory');
        warnSpy.mockClear();

        installCocosRuntime();

        expect(setRes).toHaveBeenCalledTimes(1);
        expect(setScene).toHaveBeenCalledTimes(1);
        expect(setUI).toHaveBeenCalledTimes(1);
        expect(first.resourceManager).not.toBe(second.resourceManager);
        expect(first.sceneManager).not.toBe(second.sceneManager);
        expect(first.uiManager).not.toBe(second.uiManager);
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('ResourceManager 未注册 → throw 包含模块名', () => {
        GameEntry.registerModule(new SceneManager());
        GameEntry.registerModule(new UIManager());
        expect(() => installCocosRuntime()).toThrow(/ResourceManager/);
        expect(() => installCocosRuntime()).toThrow(/installCocosRuntime/);
    });

    it('SceneManager 未注册 → throw 包含模块名', () => {
        GameEntry.registerModule(new ResourceManager());
        GameEntry.registerModule(new UIManager());
        expect(() => installCocosRuntime()).toThrow(/SceneManager/);
    });

    it('UIManager 未注册 → throw 包含模块名', () => {
        GameEntry.registerModule(new ResourceManager());
        GameEntry.registerModule(new SceneManager());
        expect(() => installCocosRuntime()).toThrow(/UIManager/);
    });

    it('_resetCocosRuntimeForTesting 后再次 install 成功', () => {
        const first = registerAll();
        installCocosRuntime();
        // 重置并重新注册一组新模块
        GameEntry.shutdown();
        _resetCocosRuntimeForTesting();
        const second = registerAll();
        const setRes = jest.spyOn(second.resourceManager, 'setResourceLoader');
        const setScene = jest.spyOn(second.sceneManager, 'setSceneLoader');
        const setUI = jest.spyOn(second.uiManager, 'setUIFormFactory');

        installCocosRuntime();

        expect(setRes).toHaveBeenCalledTimes(1);
        expect(setScene).toHaveBeenCalledTimes(1);
        expect(setUI).toHaveBeenCalledTimes(1);
        // 前后实例不同，避免误用旧引用
        expect(first.uiManager).not.toBe(second.uiManager);
    });
});
