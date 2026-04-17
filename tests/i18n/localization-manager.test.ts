import { LocalizationManager } from '@framework/i18n/LocalizationManager';
import { Language, LocalizationEvent, LanguageChangedData } from '@framework/i18n/LocalizationDefs';
import { EventManager } from '@framework/event/EventManager';

// ─── 测试数据 ──────────────────────────────────────────

const ZH_CN_TRANSLATIONS = {
    greeting: '你好',
    farewell: '再见',
    item: {
        sword: {
            name: '铁剑',
            desc: '一把锋利的铁剑',
        },
        shield: {
            name: '铁盾',
            desc: '一面坚固的铁盾',
        },
    },
    welcome: '欢迎, [name]!',
    multi_param: '玩家 [name] 的等级是 [level]',
    escaped: '使用 [[name]] 来显示字面量',
    only_bracket: '这是一个 [bracket] 符号',
};

const EN_US_TRANSLATIONS = {
    greeting: 'Hello',
    farewell: 'Goodbye',
    item: {
        sword: {
            name: 'Iron Sword',
            desc: 'A sharp iron sword',
        },
        shield: {
            name: 'Iron Shield',
            desc: 'A sturdy iron shield',
        },
    },
    welcome: 'Welcome, [name]!',
    multi_param: 'Player [name] is level [level]',
    escaped: 'Use [[name]] to display literal',
};

const TEST_DATA: Record<string, Record<string, string>> = {
    'zh-CN': ZH_CN_TRANSLATIONS as unknown as Record<string, string>,
    'en-US': EN_US_TRANSLATIONS as unknown as Record<string, string>,
};

// ─── 测试用例 ──────────────────────────────────────────

describe('LocalizationManager', () => {
    let manager: LocalizationManager;
    let eventManager: EventManager;

    beforeEach(() => {
        eventManager = new EventManager();
        eventManager.onInit();
        manager = new LocalizationManager();
        manager.onInit();
        manager.setEventManager(eventManager);
    });

    afterEach(() => {
        manager.onShutdown();
        eventManager.onShutdown();
    });

    // ─── 基本属性 ──────────────────────────────────────

    describe('基本属性', () => {
        test('moduleName 返回 LocalizationManager', () => {
            expect(manager.moduleName).toBe('LocalizationManager');
        });

        test('priority 返回 350', () => {
            expect(manager.priority).toBe(350);
        });
    });

    // ─── 语言管理 ──────────────────────────────────────

    describe('语言管理', () => {
        test('默认语言为 ZH_CN', () => {
            expect(manager.getCurrentLanguage()).toBe(Language.ZH_CN);
        });

        test('setLanguage 切换语言', () => {
            manager.setLanguage(Language.EN_US);
            expect(manager.getCurrentLanguage()).toBe(Language.EN_US);
        });

        test('setLanguage 相同语言不广播事件', () => {
            const events: LanguageChangedData[] = [];
            eventManager.on(LocalizationEvent.LANGUAGE_CHANGED, (data) => {
                events.push(data);
            });

            manager.setLanguage(Language.ZH_CN); // 设置为相同语言
            expect(events).toHaveLength(0);
        });

        test('setLanguage 广播 LANGUAGE_CHANGED 事件', () => {
            const events: LanguageChangedData[] = [];
            eventManager.on(LocalizationEvent.LANGUAGE_CHANGED, (data) => {
                events.push(data);
            });

            manager.setLanguage(Language.EN_US);
            expect(events).toHaveLength(1);
            expect(events[0].previousLanguage).toBe(Language.ZH_CN);
            expect(events[0].currentLanguage).toBe(Language.EN_US);
        });

        test('多次切换语言广播多个事件', () => {
            const events: LanguageChangedData[] = [];
            eventManager.on(LocalizationEvent.LANGUAGE_CHANGED, (data) => {
                events.push(data);
            });

            manager.setLanguage(Language.EN_US);
            manager.setLanguage(Language.JA_JP);
            manager.setLanguage(Language.KO_KR);

            expect(events).toHaveLength(3);
            expect(events[2].previousLanguage).toBe(Language.JA_JP);
            expect(events[2].currentLanguage).toBe(Language.KO_KR);
        });

        test('getAllLanguages 返回所有支持的语言', () => {
            const languages = manager.getAllLanguages();
            expect(languages).toHaveLength(4);
            expect(languages).toContain(Language.ZH_CN);
            expect(languages).toContain(Language.EN_US);
            expect(languages).toContain(Language.JA_JP);
            expect(languages).toContain(Language.KO_KR);
        });

        test('getAllLanguages 返回的是副本，修改不影响内部状态', () => {
            const languages = manager.getAllLanguages();
            languages.pop();
            expect(manager.getAllLanguages()).toHaveLength(4);
        });
    });

    // ─── 翻译加载 ──────────────────────────────────────

    describe('翻译加载', () => {
        test('loadTranslations 加载翻译数据', () => {
            manager.loadTranslations(TEST_DATA);
            expect(manager.hasKey('greeting')).toBe(true);
            expect(manager.hasKey('item.sword.name')).toBe(true);
        });

        test('loadTranslations 支持扁平化嵌套对象', () => {
            manager.loadTranslations(TEST_DATA);
            expect(manager.hasKey('item.sword.name')).toBe(true);
            expect(manager.hasKey('item.sword.desc')).toBe(true);
            expect(manager.hasKey('item.shield.name')).toBe(true);
        });

        test('多次 loadTranslations 可以合并翻译', () => {
            manager.loadTranslations({
                'zh-CN': { key1: 'value1' } as unknown as Record<string, string>,
            });
            manager.loadTranslations({
                'zh-CN': { key2: 'value2' } as unknown as Record<string, string>,
            });
            expect(manager.hasKey('key1')).toBe(true);
            expect(manager.hasKey('key2')).toBe(true);
        });
    });

    // ─── 翻译查询 ──────────────────────────────────────

    describe('翻译查询', () => {
        beforeEach(() => {
            manager.loadTranslations(TEST_DATA);
        });

        test('t() 返回当前语言的翻译', () => {
            expect(manager.t('greeting')).toBe('你好');
            expect(manager.t('farewell')).toBe('再见');
        });

        test('t() 支持嵌套 key', () => {
            expect(manager.t('item.sword.name')).toBe('铁剑');
            expect(manager.t('item.shield.desc')).toBe('一面坚固的铁盾');
        });

        test('t() 切换语言后返回对应翻译', () => {
            manager.setLanguage(Language.EN_US);
            expect(manager.t('greeting')).toBe('Hello');
            expect(manager.t('item.sword.name')).toBe('Iron Sword');
        });

        test('t() key 不存在时返回 key 本身', () => {
            expect(manager.t('nonexistent.key')).toBe('nonexistent.key');
        });

        test('t() 嵌套 key 中间节点不存在时返回 key 本身', () => {
            expect(manager.t('item.nonexistent.name')).toBe('item.nonexistent.name');
        });

        test('t() 当前语言翻译不存在时回退到 ZH_CN', () => {
            manager.setLanguage(Language.JA_JP); // 日语没有翻译
            expect(manager.t('greeting')).toBe('你好'); // 回退到中文
        });

        test('t() 当前语言和默认语言都不存在时返回 key', () => {
            manager.setLanguage(Language.JA_JP);
            expect(manager.t('nonexistent')).toBe('nonexistent');
        });

        test('t() key 存在但当前语言和 ZH_CN 翻译都不存在时返回 key', () => {
            // 只加载 EN_US 翻译，不加载 ZH_CN
            manager.loadTranslations({
                'en-US': { onlyEn: 'English Only' } as unknown as Record<string, string>,
            });
            manager.setLanguage(Language.JA_JP);
            expect(manager.t('onlyEn')).toBe('onlyEn');
        });
    });

    // ─── 参数插值 ──────────────────────────────────────

    describe('参数插值', () => {
        beforeEach(() => {
            manager.loadTranslations(TEST_DATA);
        });

        test('t() 支持参数插值', () => {
            expect(manager.t('welcome', { name: 'Player' })).toBe('欢迎, Player!');
        });

        test('t() 支持多个参数插值', () => {
            expect(manager.t('multi_param', { name: 'Alice', level: '10' })).toBe(
                '玩家 Alice 的等级是 10',
            );
        });

        test('t() 参数不存在时保留原始 [key] 标记', () => {
            expect(manager.t('welcome', {})).toBe('欢迎, [name]!');
            expect(manager.t('welcome')).toBe('欢迎, [name]!');
        });

        test('t() 支持 [[key]] 转义为字面量 [key]', () => {
            expect(manager.t('escaped')).toBe('使用 [name] 来显示字面量');
        });

        test('t() 普通 [bracket] 仍然被插值', () => {
            expect(manager.t('only_bracket', { bracket: '方括号' })).toBe('这是一个 方括号 符号');
        });

        test('t() 带参数的插值在切换语言后仍然工作', () => {
            manager.setLanguage(Language.EN_US);
            expect(manager.t('welcome', { name: 'Player' })).toBe('Welcome, Player!');
        });
    });

    // ─── hasKey ──────────────────────────────────────────

    describe('hasKey', () => {
        test('hasKey 返回 true 表示 key 存在', () => {
            manager.loadTranslations(TEST_DATA);
            expect(manager.hasKey('greeting')).toBe(true);
            expect(manager.hasKey('item.sword.name')).toBe(true);
        });

        test('hasKey 返回 false 表示 key 不存在', () => {
            expect(manager.hasKey('nonexistent')).toBe(false);
        });

        test('hasKey 不受当前语言影响', () => {
            manager.loadTranslations(TEST_DATA);
            manager.setLanguage(Language.EN_US);
            expect(manager.hasKey('greeting')).toBe(true);
        });
    });

    // ─── 生命周期 ──────────────────────────────────────

    describe('生命周期', () => {
        test('onShutdown 清空翻译数据', () => {
            manager.loadTranslations(TEST_DATA);
            manager.onShutdown();
            expect(manager.hasKey('greeting')).toBe(false);
        });

        test('onShutdown 后可以重新加载翻译', () => {
            manager.loadTranslations(TEST_DATA);
            manager.onShutdown();
            manager.onInit();
            manager.loadTranslations(TEST_DATA);
            expect(manager.t('greeting')).toBe('你好');
        });
    });

    // ─── 边界情况 ──────────────────────────────────────

    describe('边界情况', () => {
        test('t() 空字符串 key 返回空字符串', () => {
            expect(manager.t('')).toBe('');
        });

        test('t() 翻译值为空字符串时返回空字符串', () => {
            manager.loadTranslations({
                'zh-CN': { empty: '' } as unknown as Record<string, string>,
            });
            expect(manager.t('empty')).toBe('');
        });

        test('loadTranslations 空对象不抛错', () => {
            expect(() => manager.loadTranslations({})).not.toThrow();
        });

        test('t() 数字值被转换为字符串', () => {
            manager.loadTranslations({
                'zh-CN': { number: 123 } as unknown as Record<string, string>,
            });
            expect(manager.t('number')).toBe('123');
        });

        test('t() 布尔值被转换为字符串', () => {
            manager.loadTranslations({
                'zh-CN': { bool: true } as unknown as Record<string, string>,
            });
            expect(manager.t('bool')).toBe('true');
        });
    });

    // ─── 扁平化存储 ──────────────────────────────────────

    describe('扁平化存储', () => {
        test('嵌套对象正确扁平化为 dot-notation', () => {
            manager.loadTranslations({
                'zh-CN': {
                    level1: {
                        level2: {
                            level3: 'deep value',
                        },
                    },
                } as unknown as Record<string, string>,
            });
            expect(manager.t('level1.level2.level3')).toBe('deep value');
        });

        test('同级多个键正确扁平化', () => {
            manager.loadTranslations({
                'zh-CN': {
                    a: 'value_a',
                    b: 'value_b',
                } as unknown as Record<string, string>,
            });
            expect(manager.t('a')).toBe('value_a');
            expect(manager.t('b')).toBe('value_b');
        });

        test('混合嵌套和同级键', () => {
            manager.loadTranslations({
                'zh-CN': {
                    simple: 'simple value',
                    nested: {
                        key: 'nested value',
                    },
                } as unknown as Record<string, string>,
            });
            expect(manager.t('simple')).toBe('simple value');
            expect(manager.t('nested.key')).toBe('nested value');
        });
    });
});
