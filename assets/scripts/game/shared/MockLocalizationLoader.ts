import { Logger } from '@framework/debug/Logger';

/**
 * 模拟本地化加载器
 * 用于 Demo 和测试环境的多语言数据加载模拟
 *
 * @description
 * 在不依赖真实文件 I/O 的情况下模拟多语言数据加载，
 * 用于单元测试和 Demo 演示。
 *
 * 数据结构为 lang → Record<key, value>，与 LocalizationManager.loadTranslations() 兼容。
 *
 * @example
 * ```typescript
 * const loader = new MockLocalizationLoader();
 * loader.registerLanguage('zh-CN', { 'hello': '你好', 'bye': '再见' });
 * loader.registerLanguage('en-US', { 'hello': 'Hello', 'bye': 'Bye' });
 * const data = await loader.loadLanguage('zh-CN'); // { 'hello': '你好', 'bye': '再见' }
 * const all = loader.getTranslations(); // 兼容 loadTranslations() 格式
 * ```
 */
export class MockLocalizationLoader {
    private static readonly TAG = 'MockLocalizationLoader';

    /** 本地化数据存储：lang → Record<key, value> */
    private _data: Map<string, Record<string, string>> = new Map();

    /** 模拟加载延迟（毫秒） */
    private _loadDelay: number = 0;

    /** 模拟加载失败的语言集合 */
    private _loadErrors: Map<string, Error> = new Map();

    /** 调用追踪：记录所有 loadLanguage 调用 */
    public readonly loadCalls: string[] = [];

    constructor() {
        Logger.debug(MockLocalizationLoader.TAG, 'MockLocalizationLoader 已初始化');
    }

    /**
     * 注册语言数据
     * @param lang 语言代码（如 "zh-CN"、"en-US"）
     * @param data 翻译数据，格式为 Record<key, value>
     */
    public registerLanguage(lang: string, data: Record<string, string>): void {
        this._data.set(lang, { ...data });
        Logger.debug(
            MockLocalizationLoader.TAG,
            `注册语言: ${lang}, 键数: ${Object.keys(data).length}`,
        );
    }

    /**
     * 批量添加语言数据（合并到已有数据）
     * @param lang 语言代码
     * @param data 翻译数据，合并到该语言的已有数据
     */
    public addLanguageData(lang: string, data: Record<string, string>): void {
        const existing = this._data.get(lang) ?? {};
        this._data.set(lang, { ...existing, ...data });
        Logger.debug(
            MockLocalizationLoader.TAG,
            `添加语言数据: ${lang}, 新增键数: ${Object.keys(data).length}`,
        );
    }

    /**
     * 加载语言数据（模拟异步）
     * @param lang 语言代码
     * @returns 该语言的翻译数据，未注册则返回空对象
     */
    public loadLanguage(lang: string): Promise<Record<string, string>> {
        this.loadCalls.push(lang);
        Logger.debug(MockLocalizationLoader.TAG, `loadLanguage: ${lang}`);

        const error = this._loadErrors.get(lang);
        if (error) {
            return this._scheduleResult(() => Promise.reject(error));
        }

        const data = this._data.get(lang) ?? {};
        return this._scheduleResult(() => Promise.resolve({ ...data }));
    }

    /**
     * 获取所有翻译数据，格式与 LocalizationManager.loadTranslations() 兼容
     * @returns Record<lang, Record<key, value>>
     */
    public getTranslations(): Record<string, Record<string, string>> {
        const result: Record<string, Record<string, string>> = {};
        this._data.forEach((data, lang) => {
            result[lang] = { ...data };
        });
        return result;
    }

    /**
     * 检查是否已注册指定语言
     * @param lang 语言代码
     * @returns 已注册返回 true，否则返回 false
     */
    public hasLanguage(lang: string): boolean {
        return this._data.has(lang);
    }

    /**
     * 获取所有已注册的语言代码
     * @returns 语言代码数组
     */
    public getRegisteredLanguages(): string[] {
        return Array.from(this._data.keys());
    }

    /**
     * 清空所有数据
     */
    public clear(): void {
        this._data.clear();
        this._loadErrors.clear();
        this.loadCalls.length = 0;
        Logger.debug(MockLocalizationLoader.TAG, '已清空所有数据');
    }

    /**
     * 设置模拟加载延迟
     * @param ms 延迟毫秒数
     */
    public setLoadDelay(ms: number): void {
        this._loadDelay = ms;
        Logger.debug(MockLocalizationLoader.TAG, `setLoadDelay: ${ms}ms`);
    }

    /**
     * 设置模拟加载失败
     * @param lang 语言代码
     * @param error 错误对象
     */
    public setLoadError(lang: string, error: Error): void {
        this._loadErrors.set(lang, error);
        Logger.debug(MockLocalizationLoader.TAG, `setLoadError: ${lang}`);
    }

    // ─── 私有辅助方法 ─────────────────────────────────

    /**
     * 按延迟调度返回结果
     */
    private _scheduleResult<T>(fn: () => Promise<T>): Promise<T> {
        if (this._loadDelay > 0) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    fn().then(resolve, reject);
                }, this._loadDelay);
            });
        }
        return fn();
    }
}
