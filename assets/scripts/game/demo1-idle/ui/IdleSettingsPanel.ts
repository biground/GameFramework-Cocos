/**
 * Idle Clicker 设置面板
 *
 * 提供静音切换、删除存档、返回主界面等设置操作。
 * @module
 */

import { HtmlRenderer } from '@game/shared/HtmlRenderer';
import { Logger } from '@framework/debug/Logger';

const TAG = 'IdleSettingsPanel';

/** 设置面板回调集合 */
export interface IdleSettingsPanelCallbacks {
    /** 返回主界面 */
    onBack: () => void;
    /** 删除存档 */
    onDeleteSave: () => void;
    /** 切换静音 */
    onToggleMute: () => void;
}

/**
 * 设置面板
 *
 * 展示设置操作按钮（返回、删除存档、静音切换）。
 */
export class IdleSettingsPanel {
    private _renderer: HtmlRenderer;

    /**
     * 构造设置面板
     * @param renderer HTML 渲染器
     */
    constructor(renderer: HtmlRenderer) {
        this._renderer = renderer;
    }

    /**
     * 创建设置面板 UI 元素
     * @param callbacks 按钮回调集合
     */
    setup(callbacks: IdleSettingsPanelCallbacks): void {
        const group = this._renderer.createButtonGroup('设置');
        this._renderer.addButton(group, '返回主界面', callbacks.onBack);
        this._renderer.addButton(group, '切换静音', callbacks.onToggleMute);
        this._renderer.addButton(group, '删除存档', callbacks.onDeleteSave);

        Logger.info(TAG, '设置面板创建完成');
    }
}
