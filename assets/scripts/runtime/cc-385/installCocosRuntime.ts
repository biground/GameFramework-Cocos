import { GameEntry } from '../../framework/core/GameEntry';
import { GameModule } from '../../framework/core/GameModule';
import { Logger } from '../../framework/debug/Logger';
import { ResourceManager } from '../../framework/resource/ResourceManager';
import { SceneManager } from '../../framework/scene/SceneManager';
import { UIManager } from '../../framework/ui/UIManager';

import { CocosResourceLoader } from './CocosResourceLoader';
import { CocosSceneLoader } from './CocosSceneLoader';
import { CocosUIFormFactory } from './CocosUIFormFactory';

const TAG = 'CocosRuntime';

/** 装配状态（防重入） */
let _isInstalled = false;

/**
 * 把 cc 适配层一次性装配到框架。
 *
 * 注入顺序：Resource → Scene → UI（UI 依赖 Resource 实例）。
 * 必须在 GameEntry.registerModule(...) 注册完三大模块、init 完成之后，
 * 模块 onUpdate 开始之前调用一次。
 *
 * 重复调用幂等：仅 Logger.warn，不抛错。
 *
 * @throws 当 ResourceManager / SceneManager / UIManager 任一未注册时
 */
export function installCocosRuntime(): void {
    if (_isInstalled) {
        Logger.warn(TAG, '已装配，跳过重复调用');
        return;
    }

    ensureRegistered('ResourceManager');
    ensureRegistered('SceneManager');
    ensureRegistered('UIManager');

    const resourceManager = GameEntry.getModule<ResourceManager>('ResourceManager');
    const sceneManager = GameEntry.getModule<SceneManager>('SceneManager');
    const uiManager = GameEntry.getModule<UIManager>('UIManager');

    resourceManager.setResourceLoader(new CocosResourceLoader());
    sceneManager.setSceneLoader(new CocosSceneLoader());
    uiManager.setUIFormFactory(new CocosUIFormFactory(resourceManager));

    _isInstalled = true;
    Logger.info(TAG, '装配完成');
}

/**
 * 仅供测试 reset 用。生产代码不要调用。
 */
export function _resetCocosRuntimeForTesting(): void {
    _isInstalled = false;
}

function ensureRegistered(moduleName: string): void {
    if (!GameModule.hasModule(moduleName)) {
        const msg = `[installCocosRuntime] 模块 ${moduleName} 未注册，请先 GameEntry.register(...)`;
        Logger.error(TAG, msg);
        throw new Error(msg);
    }
}
