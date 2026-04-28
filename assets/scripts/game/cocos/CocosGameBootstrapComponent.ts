import { _decorator, Component } from 'cc';

import { GameEntry } from '@framework/core/GameEntry';

import { bootstrapRuntimeGame, DEFAULT_RUNTIME_TARGET_SCENE_NAME } from '../bootstrapRuntimeGame';
import type { RuntimeGameContext } from '../RuntimeGameContext';

const { ccclass } = _decorator;

/** Cocos 节点生命周期驱动的 Runtime 游戏启动组件。 */
@ccclass('CocosGameBootstrapComponent')
export class CocosGameBootstrapComponent extends Component {
    /** 启动后进入的目标主场景名称。 */
    public targetSceneName: string = DEFAULT_RUNTIME_TARGET_SCENE_NAME;

    private _context: RuntimeGameContext | null = null;

    /** 最近一次 Runtime 启动上下文。 */
    public get context(): RuntimeGameContext | null {
        return this._context;
    }

    protected onLoad(): void {
        const targetSceneName = this.targetSceneName.trim() || DEFAULT_RUNTIME_TARGET_SCENE_NAME;
        this._context = bootstrapRuntimeGame({ targetSceneName });
    }

    protected update(deltaTime: number): void {
        if (!this._context) {
            return;
        }
        GameEntry.update(deltaTime);
    }

    protected onDestroy(): void {
        if (!this._context) {
            return;
        }
        GameEntry.shutdown();
        this._context = null;
    }
}
