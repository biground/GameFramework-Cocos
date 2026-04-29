import { director } from 'cc';
import type { ISceneLoader, LoadSceneCallbacks } from '../../framework/scene/SceneDefs';
import { Logger } from '../../framework/debug/Logger';

/**
 * Cocos Creator 3.8.5 场景加载器
 *
 * 封装 director.loadScene，实现 ISceneLoader 策略接口。
 * 采用单 flight 语义：同一时刻只允许一个场景加载任务，避免并发状态错乱。
 */
export class CocosSceneLoader implements ISceneLoader {
    private static readonly TAG = 'CocosSceneLoader';

    /** 当前正在加载的场景名（null 表示空闲） */
    private _loadingScene: string | null = null;

    public loadScene(sceneName: string, callbacks: LoadSceneCallbacks): void {
        if (this._loadingScene !== null) {
            const msg = '已有场景正在加载 (loading)';
            Logger.warn(CocosSceneLoader.TAG, msg);
            callbacks.onFailure?.(sceneName, msg);
            return;
        }

        this._loadingScene = sceneName;

        director.loadScene(sceneName, (err: Error | null) => {
            this._loadingScene = null;
            if (err) {
                callbacks.onFailure?.(sceneName, err.message);
                return;
            }
            callbacks.onSuccess?.(sceneName);
        });
    }

    public unloadScene(sceneName: string): void {
        Logger.warn(
            CocosSceneLoader.TAG,
            `unloadScene 在 Cocos 中由 loadScene 隐式触发，此处为空实现：${sceneName}`,
        );
    }

    public preloadScene(sceneName: string, onComplete?: (error?: string) => void): void {
        Logger.info(CocosSceneLoader.TAG, `预加载场景: ${sceneName}`);
        director.preloadScene(sceneName, (err: Error | null) => {
            if (err) {
                Logger.error(CocosSceneLoader.TAG, '场景预加载失败', sceneName, err.message);
                onComplete?.(err.message);
            } else {
                Logger.info(CocosSceneLoader.TAG, `场景预加载完成: ${sceneName}`);
                onComplete?.();
            }
        });
    }
}
