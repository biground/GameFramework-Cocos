import { _decorator, Component, Sprite, SpriteFrame, resources } from 'cc';
import { LocalizationManager } from '../../framework/i18n/LocalizationManager';
import { LocalizationEvent, LanguageChangedData } from '../../framework/i18n/LocalizationDefs';
import { GameEntry } from '../../framework/core/GameEntry';
import { EventManager } from '../../framework/event/EventManager';
import { Logger } from '../../framework/debug/Logger';

const { ccclass, property } = _decorator;

/**
 * 本地化精灵组件
 * 根据当前语言自动切换 SpriteFrame 资源
 *
 * 使用说明：
 * 1. 将此组件挂载到带有 Sprite 组件的节点上
 * 2. 在编辑器中配置 key 属性（图片资源的 key）
 * 3. 可选：设置 defaultSpriteFrame 作为默认图片
 * 4. 图片资源路径格式：resources/i18n/{language}/{key}.png（或 .jpg）
 * 5. 组件会自动监听 LANGUAGE_CHANGED 事件并更新图片
 *
 * @example
 * ```typescript
 * // 在编辑器中配置：
 * // key: 'logo'
 * // defaultSpriteFrame: 拖入默认图片
 *
 * // 运行时会自动加载：
 * // resources/i18n/zh-CN/logo.png
 * // resources/i18n/en-US/logo.png
 * // 等等...
 * ```
 */
@ccclass('LocalizedSprite')
export class LocalizedSprite extends Component {
    // ─── 属性定义 ──────────────────────────────────────

    /**
     * 图片资源的 key
     * 用于构建资源路径：i18n/{language}/{key}
     */
    @property({ tooltip: '图片资源的 key，用于构建资源路径' })
    public key: string = '';

    /**
     * 默认 SpriteFrame
     * 当资源加载失败或 key 为空时使用
     */
    @property({ tooltip: '默认 SpriteFrame（资源加载失败时使用）' })
    public defaultSpriteFrame: SpriteFrame | null = null;

    // ─── 内部状态 ──────────────────────────────────────

    /** 当前是否正在加载 */
    private _isLoading: boolean = false;

    // ─── 生命周期方法 ──────────────────────────────────

    /**
     * 组件加载时调用
     * 初始化图片并注册语言切换事件监听
     */
    protected onLoad(): void {
        // 立即更新一次图片
        void this._updateSprite();

        // 监听语言切换事件
        const eventMgr = GameEntry.getModule<EventManager>('EventManager');
        if (eventMgr) {
            eventMgr.on(LocalizationEvent.LANGUAGE_CHANGED, this._onLanguageChanged, this);
        } else {
            Logger.warn('LocalizedSprite', 'EventManager 未初始化，无法监听语言切换事件');
        }
    }

    /**
     * 组件销毁时调用
     * 移除事件监听，防止内存泄漏
     */
    protected onDestroy(): void {
        const eventMgr = GameEntry.getModule<EventManager>('EventManager');
        if (eventMgr) {
            eventMgr.off(LocalizationEvent.LANGUAGE_CHANGED, this._onLanguageChanged, this);
        }
    }

    // ─── 公共方法 ──────────────────────────────────────

    /**
     * 手动设置 key 并刷新图片
     * @param key 新的图片 key
     */
    public setKey(key: string): void {
        this.key = key;
        void this._updateSprite();
    }

    /**
     * 强制刷新图片（重新加载）
     */
    public refresh(): void {
        void this._updateSprite();
    }

    // ─── 内部方法 ──────────────────────────────────────

    /**
     * 语言切换事件处理
     * @param _data 语言切换事件数据
     */
    private _onLanguageChanged(_data: LanguageChangedData): void {
        void this._updateSprite();
    }

    /**
     * 更新 Sprite 图片
     * 根据当前语言加载对应的图片资源
     */
    private async _updateSprite(): Promise<void> {
        // 防止重复加载
        if (this._isLoading) {
            return;
        }

        // 获取 Sprite 组件
        const sprite = this.getComponent(Sprite);
        if (!sprite) {
            Logger.warn('LocalizedSprite', 'Sprite 组件不存在');
            return;
        }

        // 检查 key 是否有效
        if (!this.key || this.key.trim() === '') {
            Logger.warn('LocalizedSprite', 'key 为空，使用默认 SpriteFrame');
            this._applyDefaultSprite(sprite);
            return;
        }

        // 获取 LocalizationManager
        const localizationMgr = GameEntry.getModule<LocalizationManager>('LocalizationManager');
        if (!localizationMgr) {
            Logger.warn('LocalizedSprite', 'LocalizationManager 未初始化，使用默认 SpriteFrame');
            this._applyDefaultSprite(sprite);
            return;
        }

        // 构建资源路径
        const currentLang = localizationMgr.getCurrentLanguage();
        const imagePath = `i18n/${currentLang}/${this.key}`;

        this._isLoading = true;

        try {
            // 使用 Cocos Creator 的 resources.load 加载 SpriteFrame
            const spriteFrame = await this._loadSpriteFrame(imagePath);
            if (sprite && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
            }
        } catch (error) {
            Logger.warn('LocalizedSprite', '图片加载失败:', imagePath, error);
            this._applyDefaultSprite(sprite);
        } finally {
            this._isLoading = false;
        }
    }

    /**
     * 加载 SpriteFrame 资源
     * @param path 资源路径
     * @returns Promise<SpriteFrame>
     */
    private _loadSpriteFrame(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err: Error | null, spriteFrame: SpriteFrame) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(spriteFrame);
                }
            });
        });
    }

    /**
     * 应用默认 SpriteFrame
     * @param sprite Sprite 组件
     */
    private _applyDefaultSprite(sprite: Sprite): void {
        if (this.defaultSpriteFrame && sprite.isValid) {
            sprite.spriteFrame = this.defaultSpriteFrame;
        }
    }
}
