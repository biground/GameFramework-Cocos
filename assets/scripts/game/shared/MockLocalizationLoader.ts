/**
 * 模拟本地化加载器
 * 用于 Demo 和测试环境的多语言数据加载模拟
 * 
 * @description
 * 在不依赖真实文件 I/O 的情况下模拟多语言数据加载，
 * 用于单元测试和 Demo 演示。
 * 
 * 注意：i18n 模块未使用策略接口模式，此类提供独立的 Mock 数据存储。
 */
export class MockLocalizationLoader {
    private static readonly TAG = 'MockLocalizationLoader';

    /** 模拟的多语言数据存储 */
    private _mockData: Map<string, Record<string, string>> = new Map();

    // Constructor
    constructor() {
        // TODO: 初始化本地化加载器配置
    }

    /**
     * 加载指定语言的多语言数据（模拟）
     * @param language 语言代码（如 "zh-CN"）
     * @returns 翻译键值对映射
     */
    public loadLanguage(language: string): Promise<Record<string, string>> {
        // TODO: 实现模拟加载逻辑
        const data = this._mockData.get(language);
        if (data === undefined) {
            return Promise.reject(new Error(`[MockLocalizationLoader] 语言数据不存在: ${language}`));
        }
        return Promise.resolve(data);
    }

    /**
     * 获取支持的语言列表
     * @returns 语言代码数组
     */
    public getSupportedLanguages(): string[] {
        return Array.from(this._mockData.keys());
    }

    /**
     * 注册模拟的多语言数据（仅用于测试）
     * @param language 语言代码
     * @param data 翻译键值对映射
     */
    public registerMockData(language: string, data: Record<string, string>): void {
        this._mockData.set(language, data);
    }
}
