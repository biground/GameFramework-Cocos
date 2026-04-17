import { Language } from '../i18n/LocalizationDefs';

/**
 * 本地化管理器接口
 * 定义国际化（i18n）系统的公共契约，业务层应依赖此接口而非 LocalizationManager 实现类
 *
 * 核心职责：
 * 1. 多语言切换与管理
 * 2. 翻译文本获取与插值
 * 3. 翻译 key 存在性检查
 */
export interface ILocalizationManager {
    /**
     * 获取当前语言
     * @returns 当前语言枚举值
     */
    getCurrentLanguage(): Language;

    /**
     * 设置当前语言
     * @param lang 语言枚举值
     */
    setLanguage(lang: Language): void;

    /**
     * 获取所有支持的语言
     * @returns 语言枚举数组
     */
    getAllLanguages(): Language[];

    /**
     * 获取翻译文本
     * @param key 翻译 key（支持嵌套 key，如 'item.sword.name'）
     * @param params 插值参数（可选）
     * @returns 翻译后的文本，key 不存在时返回 key 本身
     */
    t(key: string, params?: Record<string, string>): string;

    /**
     * 检查 key 是否存在
     * @param key 翻译 key
     * @returns 是否存在
     */
    hasKey(key: string): boolean;

    /**
     * 加载翻译数据
     * @param data 翻译数据，格式为 { lang: { key: value } }
     */
    loadTranslations(data: Record<string, Record<string, string>>): void;
}
