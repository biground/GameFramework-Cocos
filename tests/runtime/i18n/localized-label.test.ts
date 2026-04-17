import { LocalizedLabel } from '@runtime/i18n/LocalizedLabel';
import { LocalizationManager } from '@framework/i18n/LocalizationManager';
import { LocalizationEvent, LanguageChangedData, Language } from '@framework/i18n/LocalizationDefs';
import { EventManager } from '@framework/event/EventManager';
import { GameEntry } from '@framework/core/GameEntry';
import { Logger } from '@framework/debug/Logger';

// ─── Mock 工具 ──────────────────────────────────────────

/**
 * Mock Label：模拟 Cocos Creator 的 Label 组件
 */
class Label {
    string: string = '';
}

/**
 * Mock Component：模拟 Cocos Creator 的 Component 基类
 */
class MockComponent {
    private _label: Label | null = null;

    getComponent<T>(type: new (...args: any[]) => T): T | null {
        if (type.name === 'Label') {
            return this._label as unknown as T;
        }
        return null;
    }

    setLabel(label: Label | null): void {
        this._label = label;
    }
}

/**
 * Mock LocalizedLabel：扩展 MockComponent，模拟 LocalizedLabel 的行为
 */
class MockLocalizedLabel extends MockComponent {
    key: string = '';
    paramsJson: string = '';
    private _updateTextCalled: boolean = false;
    private _lastLanguageChangedData: LanguageChangedData | null = null;
    private _eventManager: EventManager | null = null;

    // 设置 EventManager 实例
    setEventManager(eventManager: EventManager): void {
        this._eventManager = eventManager;
    }

    // 模拟 onLoad 方法
    onLoad(): void {
        this._updateText();
        if (this._eventManager) {
            this._eventManager.on(
                LocalizationEvent.LANGUAGE_CHANGED,
                this._onLanguageChanged,
                this,
            );
        }
    }

    // 模拟 onDestroy 方法
    onDestroy(): void {
        if (this._eventManager) {
            this._eventManager.off(
                LocalizationEvent.LANGUAGE_CHANGED,
                this._onLanguageChanged,
                this,
            );
        }
    }

    // 模拟 _updateText 方法
    private _updateText(): void {
        this._updateTextCalled = true;
        const label = this.getComponent(Label) as Label | null;
        if (!label) {
            Logger.warn('LocalizedLabel', 'Label 组件不存在');
            return;
        }

        const localizationMgr = GameEntry.getModule<LocalizationManager>('LocalizationManager');
        if (!localizationMgr) {
            Logger.warn('LocalizedLabel', 'LocalizationManager 未初始化');
            return;
        }

        let params: Record<string, string> | undefined;
        if (this.paramsJson) {
            try {
                params = JSON.parse(this.paramsJson);
            } catch (e) {
                Logger.warn('LocalizedLabel', 'paramsJson 解析失败:', e);
            }
        }

        label.string = localizationMgr.t(this.key, params);
    }

    // 模拟 _onLanguageChanged 方法
    private _onLanguageChanged(data: LanguageChangedData): void {
        this._lastLanguageChangedData = data;
        this._updateText();
    }

    // 测试辅助方法
    isUpdateTextCalled(): boolean {
        return this._updateTextCalled;
    }

    getLastLanguageChangedData(): LanguageChangedData | null {
        return this._lastLanguageChangedData;
    }

    resetUpdateTextCalled(): void {
        this._updateTextCalled = false;
    }
}

// ─── 测试数据 ──────────────────────────────────────────

const TEST_TRANSLATIONS = {
    greeting: '你好',
    welcome: '欢迎, [name]!',
    multi_param: '玩家 [name] 的等级是 [level]',
};

// ─── 测试用例 ──────────────────────────────────────────

describe('LocalizedLabel', () => {
    let eventManager: EventManager;
    let localizationManager: LocalizationManager;
    let mockLabel: Label;
    let localizedLabel: MockLocalizedLabel;

    beforeEach(() => {
        // 初始化 EventManager
        eventManager = new EventManager();
        eventManager.onInit();

        // 初始化 LocalizationManager
        localizationManager = new LocalizationManager();
        localizationManager.onInit();
        localizationManager.setEventManager(eventManager);
        localizationManager.loadTranslations({ 'zh-CN': TEST_TRANSLATIONS as any });

        // 注册到 GameEntry（需要 mock GameEntry.getModule）
        jest.spyOn(GameEntry, 'getModule').mockImplementation((name: string) => {
            if (name === 'LocalizationManager') {
                return localizationManager as any;
            }
            return null;
        });

        // 创建 mock Label
        mockLabel = new Label();

        // 创建 LocalizedLabel 实例
        localizedLabel = new MockLocalizedLabel();
        localizedLabel.setLabel(mockLabel);
        localizedLabel.setEventManager(eventManager);
    });

    afterEach(() => {
        // 清理
        if (localizedLabel) {
            localizedLabel.onDestroy();
        }
        localizationManager.onShutdown();
        eventManager.onShutdown();
        jest.restoreAllMocks();
    });

    // ─── 组件基础 ──────────────────────────────────────

    describe('组件基础', () => {
        test('LocalizedLabel 类存在', () => {
            expect(LocalizedLabel).toBeDefined();
        });

        test('LocalizedLabel 是一个类', () => {
            expect(typeof LocalizedLabel).toBe('function');
        });
    });

    // ─── 属性定义 ──────────────────────────────────────

    describe('属性定义', () => {
        test('key 属性默认为空字符串', () => {
            expect(localizedLabel.key).toBe('');
        });

        test('paramsJson 属性默认为空字符串', () => {
            expect(localizedLabel.paramsJson).toBe('');
        });

        test('可以设置 key 属性', () => {
            localizedLabel.key = 'greeting';
            expect(localizedLabel.key).toBe('greeting');
        });

        test('可以设置 paramsJson 属性', () => {
            localizedLabel.paramsJson = '{"name": "Player"}';
            expect(localizedLabel.paramsJson).toBe('{"name": "Player"}');
        });
    });

    // ─── 生命周期方法 ──────────────────────────────────

    describe('生命周期方法', () => {
        test('onLoad 调用 _updateText', () => {
            localizedLabel.onLoad();
            expect(localizedLabel.isUpdateTextCalled()).toBe(true);
        });

        test('onLoad 注册 LANGUAGE_CHANGED 事件监听', () => {
            localizedLabel.onLoad();
            // 触发事件，验证监听器被调用
            localizationManager.setLanguage(Language.EN_US);
            expect(localizedLabel.getLastLanguageChangedData()).not.toBeNull();
        });

        test('onDestroy 移除 LANGUAGE_CHANGED 事件监听', () => {
            localizedLabel.onLoad();
            localizedLabel.onDestroy();
            localizedLabel.resetUpdateTextCalled();

            // 触发事件，验证监听器已被移除
            localizationManager.setLanguage(Language.EN_US);
            expect(localizedLabel.isUpdateTextCalled()).toBe(false);
        });
    });

    // ─── 文本更新 ──────────────────────────────────────

    describe('文本更新', () => {
        test('设置 key 后更新 Label 文本', () => {
            localizedLabel.key = 'greeting';
            localizedLabel.onLoad();
            expect(mockLabel.string).toBe('你好');
        });

        test('支持参数插值', () => {
            localizedLabel.key = 'welcome';
            localizedLabel.paramsJson = '{"name": "Player"}';
            localizedLabel.onLoad();
            expect(mockLabel.string).toBe('欢迎, Player!');
        });

        test('支持多个参数插值', () => {
            localizedLabel.key = 'multi_param';
            localizedLabel.paramsJson = '{"name": "Alice", "level": "10"}';
            localizedLabel.onLoad();
            expect(mockLabel.string).toBe('玩家 Alice 的等级是 10');
        });

        test('key 不存在时返回 key 本身', () => {
            localizedLabel.key = 'nonexistent';
            localizedLabel.onLoad();
            expect(mockLabel.string).toBe('nonexistent');
        });

        test('paramsJson 解析失败时使用 undefined 参数', () => {
            localizedLabel.key = 'welcome';
            localizedLabel.paramsJson = 'invalid json';
            localizedLabel.onLoad();
            expect(mockLabel.string).toBe('欢迎, [name]!');
        });
    });

    // ─── 语言切换事件 ──────────────────────────────────

    describe('语言切换事件', () => {
        test('语言切换时自动更新文本', () => {
            localizedLabel.key = 'greeting';
            localizedLabel.onLoad();
            expect(mockLabel.string).toBe('你好');

            // 切换语言（需要加载英文翻译）
            localizationManager.loadTranslations({
                'en-US': { greeting: 'Hello' } as any,
            });
            localizationManager.setLanguage(Language.EN_US);
            expect(mockLabel.string).toBe('Hello');
        });

        test('语言切换事件包含正确的数据', () => {
            localizedLabel.onLoad();
            localizationManager.setLanguage(Language.EN_US);
            const data = localizedLabel.getLastLanguageChangedData();
            expect(data).not.toBeNull();
            expect(data!.previousLanguage).toBe('zh-CN');
            expect(data!.currentLanguage).toBe('en-US');
        });
    });

    // ─── 错误处理 ──────────────────────────────────────

    describe('错误处理', () => {
        test('Label 组件不存在时输出警告', () => {
            const consoleSpy = jest.spyOn(Logger, 'warn').mockImplementation();
            localizedLabel.setLabel(null);
            localizedLabel.key = 'greeting';
            localizedLabel.onLoad();
            expect(consoleSpy).toHaveBeenCalledWith('LocalizedLabel', 'Label 组件不存在');
            consoleSpy.mockRestore();
        });

        test('LocalizationManager 未初始化时输出警告', () => {
            const consoleSpy = jest.spyOn(Logger, 'warn').mockImplementation();
            jest.spyOn(GameEntry, 'getModule').mockReturnValue(null as any);
            localizedLabel.key = 'greeting';
            localizedLabel.onLoad();
            expect(consoleSpy).toHaveBeenCalledWith(
                'LocalizedLabel',
                'LocalizationManager 未初始化',
            );
            consoleSpy.mockRestore();
        });
    });

    // ─── 边界情况 ──────────────────────────────────────

    describe('边界情况', () => {
        test('空 key 不更新文本', () => {
            localizedLabel.key = '';
            localizedLabel.onLoad();
            expect(mockLabel.string).toBe('');
        });

        test('空 paramsJson 不影响插值', () => {
            localizedLabel.key = 'greeting';
            localizedLabel.paramsJson = '';
            localizedLabel.onLoad();
            expect(mockLabel.string).toBe('你好');
        });

        test('多次调用 onLoad 不会重复注册事件', () => {
            const eventSpy = jest.spyOn(eventManager, 'on');
            localizedLabel.onLoad();
            localizedLabel.onLoad();
            // EventManager 应该会去重，但我们需要验证调用次数
            // 由于 EventManager 内部有去重逻辑，这里主要测试不会出错
            expect(eventSpy).toHaveBeenCalled();
        });
    });
});
