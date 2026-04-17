import { ModuleBase } from '../core/ModuleBase';
import { ILocalizationManager } from '../interfaces/ILocalizationManager';
import { Language, LocalizationEvent } from './LocalizationDefs';
import { IEventManager } from '../interfaces/IEventManager';
import { Logger } from '../debug/Logger';

/**
 * 本地化管理器
 * 提供多语言翻译文本的加载、存储、查询和插值功能
 *
 * 设计要点：
 * - 扁平化存储：嵌套 key（如 'item.sword.name'）扁平化为 dot-notation 存储
 * - 参数插值：[name] 会被替换为 params.name 的值
 * - 转义支持：[[key]] 会被转义为字面量 [key]
 * - 语言回退：当前语言翻译不存在时，回退到默认语言（ZH_CN）
 * - 事件广播：语言切换时广播 LANGUAGE_CHANGED 事件
 *
 * @example
 * ```typescript
 * const i18n = GameEntry.getModule<LocalizationManager>('LocalizationManager');
 * i18n.loadTranslations(zhCNData);
 * i18n.setLanguage(Language.ZH_CN);
 * const text = i18n.t('item.sword.name'); // 获取翻译
 * const greeting = i18n.t('hello', { name: 'Player' }); // 参数插值
 * ```
 */
export class LocalizationManager extends ModuleBase implements ILocalizationManager {
    // ─── ModuleBase ────────────────────────────────────

    public get moduleName(): string {
        return 'LocalizationManager';
    }

    public get priority(): number {
        return 350;
    }

    // ─── 内部存储 ──────────────────────────────────────

    /** 扁平化存储：Map<flatKey, Map<lang, value>> */
    private _translations: Map<string, Map<string, string>> = new Map();

    /** 当前语言 */
    private _currentLanguage: Language = Language.ZH_CN;

    /** 支持的语言列表 */
    private readonly _supportedLanguages: Language[] = [
        Language.ZH_CN,
        Language.EN_US,
        Language.JA_JP,
        Language.KO_KR,
    ];

    /** 事件管理器引用（可选，未设置时事件静默丢弃） */
    private _eventManager: IEventManager | null = null;

    // ─── 生命周期 ──────────────────────────────────────

    public onInit(): void {
        Logger.info('[LocalizationManager] 初始化完成，默认语言:', this._currentLanguage);
    }

    public onShutdown(): void {
        this._translations.clear();
        Logger.info('[LocalizationManager] 已关闭');
    }

    // ─── EventManager 注入 ─────────────────────────────

    /**
     * 设置事件管理器（用于广播语言切换事件）
     * 建议在 onInit 之后调用
     * @param eventManager 事件管理器实例
     */
    public setEventManager(eventManager: IEventManager): void {
        this._eventManager = eventManager;
    }

    // ─── ILocalizationManager 实现 ─────────────────────

    /**
     * 获取当前语言
     * @returns 当前语言枚举值
     */
    public getCurrentLanguage(): Language {
        return this._currentLanguage;
    }

    /**
     * 设置当前语言
     * @param lang 语言枚举值
     */
    public setLanguage(lang: Language): void {
        if (this._currentLanguage === lang) {
            // 相同语言不广播事件，直接返回
            return;
        }
        const previousLanguage = this._currentLanguage;
        this._currentLanguage = lang;
        // 广播语言切换事件
        this._eventManager?.emit(LocalizationEvent.LANGUAGE_CHANGED, {
            previousLanguage,
            currentLanguage: lang,
        });
    }

    /**
     * 获取所有支持的语言
     * @returns 语言枚举数组
     */
    public getAllLanguages(): Language[] {
        return [...this._supportedLanguages];
    }

    /**
     * 获取翻译文本
     * @param key 翻译 key（支持嵌套 key，如 'item.sword.name'）
     * @param params 插值参数（可选）
     * @returns 翻译后的文本，key 不存在时返回 key 本身
     */
    public t(key: string, params?: Record<string, string>): string {
        const langTranslations = this._translations.get(key);
        if (!langTranslations) {
            // key 不存在时返回 key 本身
            return key;
        }
        const value = langTranslations.get(this._currentLanguage);
        if (value === undefined) {
            // 当前语言翻译不存在时尝试默认语言
            const defaultValue = langTranslations.get(Language.ZH_CN);
            if (defaultValue === undefined) {
                return key;
            }
            return this._interpolate(defaultValue, params);
        }
        return this._interpolate(value, params);
    }

    /**
     * 检查 key 是否存在
     * @param key 翻译 key
     * @returns 是否存在
     */
    public hasKey(key: string): boolean {
        return this._translations.has(key);
    }

    /**
     * 加载翻译数据（内部使用）
     * @param data 多语言翻译数据，结构为 Record<lang, Record<key, value>>
     */
    public loadTranslations(data: Record<string, Record<string, string>>): void {
        for (const [lang, translations] of Object.entries(data)) {
            const flatTranslations = this._flattenObject(translations);
            for (const [key, value] of flatTranslations) {
                if (!this._translations.has(key)) {
                    this._translations.set(key, new Map());
                }
                this._translations.get(key)!.set(lang, value);
            }
        }
    }

    // ─── 内部方法 ──────────────────────────────────────

    /**
     * 扁平化嵌套对象为 dot-notation keys
     * @param obj 嵌套对象
     * @param prefix 当前前缀
     * @returns 扁平化的 Map
     */
    private _flattenObject(obj: Record<string, unknown>, prefix: string = ''): Map<string, string> {
        const result = new Map<string, string>();
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 递归扁平化嵌套对象
                const nested = this._flattenObject(value as Record<string, unknown>, fullKey);
                for (const [nestedKey, nestedValue] of nested) {
                    result.set(nestedKey, nestedValue);
                }
            } else {
                // 叶子节点：转换为字符串存储
                result.set(fullKey, String(value));
            }
        }
        return result;
    }

    /**
     * 参数插值
     * @param template 模板字符串
     * @param params 插值参数
     * @returns 插值后的字符串
     */
    private _interpolate(template: string, params?: Record<string, string>): string {
        // 先处理转义：[[key]] → [key]
        const result = template.replace(/\[\[([^\]]+)\]\]/g, '[$1]');
        // 如果没有参数，直接返回处理后的结果
        if (!params) return result;
        // 再处理参数插值
        return result.replace(/\[([^\]]+)\]/g, (match, key: string) => {
            return params[key] ?? match;
        });
    }
}
