import { Logger } from '@framework/debug/Logger';

/**
 * 模拟本地化加载器
 * 用于 Demo 和测试环境的多语言数据加载模拟
 *
 * @description
 * 在不依赖真实文件 I/O 的情况下模拟多语言数据加载，
 * 用于单元测试和 Demo 演示。
 *
 * 注意：此类是独立的 Mock 实现，不实现框架接口。
 * 数据结构为 key → locale → text 的嵌套映射。
 */
export class MockLocalizationLoader {
    private static readonly TAG = 'MockLocalizationLoader';

    /** 本地化数据存储：key → locale → text */
    private _data: Map<string, Record<string, string>> = new Map();

    /** 调用追踪：记录所有 getText 调用 */
    public readonly loadCalls: Array<{ key: string; locale: string }> = [];

    /** 缺失键追踪：记录请求但未找到的键 */
    public readonly missingKeys: string[] = [];

    // Constructor
    constructor() {
        Logger.debug(MockLocalizationLoader.TAG, 'MockLocalizationLoader 已初始化');
    }

    /**
     * 注册多语言文本
     * @param key 本地化键
     * @param translations 多语言翻译映射，如 { 'zh-CN': '你好', 'en-US': 'Hello' }
     */
    public registerText(key: string, translations: Record<string, string>): void {
        this._data.set(key, { ...translations });
        Logger.debug(
            MockLocalizationLoader.TAG,
            `注册本地化键: ${key}, 语言数: ${Object.keys(translations).length}`,
        );
    }

    /**
     * 批量注册多语言文本
     * @param data 多个本地化键的翻译数据，如 { 'hello': { 'zh-CN': '你好' }, 'bye': { 'zh-CN': '再见' } }
     */
    public registerBulkText(data: Record<string, Record<string, string>>): void {
        let count = 0;
        for (const key of Object.keys(data)) {
            this.registerText(key, data[key]);
            count++;
        }
        Logger.debug(MockLocalizationLoader.TAG, `批量注册 ${count} 个本地化键`);
    }

    /**
     * 获取指定语言的文本
     * @param key 本地化键
     * @param locale 语言代码（如 "zh-CN"）
     * @returns 翻译文本，若不存在则返回 null
     */
    public getText(key: string, locale: string): string | null {
        // 记录调用
        this.loadCalls.push({ key, locale });

        const translations = this._data.get(key);
        if (translations === undefined) {
            // 键不存在
            if (!this.missingKeys.includes(key)) {
                this.missingKeys.push(key);
            }
            Logger.warn(MockLocalizationLoader.TAG, `本地化键不存在: ${key} (locale: ${locale})`);
            return null;
        }

        const text = translations[locale];
        if (text === undefined) {
            // 键存在但语言不支持
            Logger.warn(MockLocalizationLoader.TAG, `语言不支持: key=${key}, locale=${locale}`);
            return null;
        }

        return text;
    }

    /**
     * 获取所有已注册的本地化键
     * @returns 本地化键数组
     */
    public getAllKeys(): string[] {
        return Array.from(this._data.keys());
    }

    /**
     * 获取所有已注册的支持语言
     * @returns 语言代码数组
     */
    public getSupportedLocales(): string[] {
        const localeSet: Set<string> = new Set();
        const translationsList = Array.from(this._data.values());
        for (let i = 0; i < translationsList.length; i++) {
            const locales = Object.keys(translationsList[i]);
            for (let j = 0; j < locales.length; j++) {
                localeSet.add(locales[j]);
            }
        }
        return Array.from(localeSet);
    }

    /**
     * 检查本地化键是否存在
     * @param key 本地化键
     * @returns 键存在返回 true，否则返回 false
     */
    public hasKey(key: string): boolean {
        return this._data.has(key);
    }

    /**
     * 从内存数据结构加载本地化数据（模拟从 YAML/JSON 文件加载）
     * @param data 本地化数据，格式为 { key: { locale: text } }
     */
    public loadFromData(data: Record<string, Record<string, string>>): void {
        this.registerBulkText(data);
        Logger.info(
            MockLocalizationLoader.TAG,
            `从数据加载完成，总计 ${this.getAllKeys().length} 个键，${this.getSupportedLocales().length} 种语言`,
        );
    }
}
