import { MockLocalizationLoader } from '@game/shared/MockLocalizationLoader';

describe('MockLocalizationLoader', () => {
    let loader: MockLocalizationLoader;

    beforeEach(() => {
        loader = new MockLocalizationLoader();
    });

    describe('registerLanguage', () => {
        it('注册后 hasLanguage 返回 true', () => {
            loader.registerLanguage('zh-CN', { hello: '你好' });
            expect(loader.hasLanguage('zh-CN')).toBe(true);
        });

        it('未注册的语言 hasLanguage 返回 false', () => {
            expect(loader.hasLanguage('ja-JP')).toBe(false);
        });

        it('getRegisteredLanguages 返回所有已注册语言', () => {
            loader.registerLanguage('zh-CN', { hello: '你好' });
            loader.registerLanguage('en-US', { hello: 'Hello' });
            expect(loader.getRegisteredLanguages()).toEqual(['zh-CN', 'en-US']);
        });
    });

    describe('addLanguageData', () => {
        it('合并到已有数据', () => {
            loader.registerLanguage('zh-CN', { hello: '你好' });
            loader.addLanguageData('zh-CN', { bye: '再见' });
            return loader.loadLanguage('zh-CN').then((data) => {
                expect(data).toEqual({ hello: '你好', bye: '再见' });
            });
        });

        it('对不存在的语言创建新条目', () => {
            loader.addLanguageData('fr-FR', { bonjour: 'Bonjour' });
            expect(loader.hasLanguage('fr-FR')).toBe(true);
        });

        it('覆盖已有 key 的值', () => {
            loader.registerLanguage('zh-CN', { hello: '你好旧' });
            loader.addLanguageData('zh-CN', { hello: '你好新' });
            return loader.loadLanguage('zh-CN').then((data) => {
                expect(data.hello).toBe('你好新');
            });
        });
    });

    describe('loadLanguage', () => {
        it('返回已注册的语言数据', async () => {
            loader.registerLanguage('en-US', { hello: 'Hello', bye: 'Bye' });
            const data = await loader.loadLanguage('en-US');
            expect(data).toEqual({ hello: 'Hello', bye: 'Bye' });
        });

        it('未注册的语言返回空对象', async () => {
            const data = await loader.loadLanguage('unknown');
            expect(data).toEqual({});
        });

        it('追踪 loadCalls', async () => {
            await loader.loadLanguage('zh-CN');
            await loader.loadLanguage('en-US');
            expect(loader.loadCalls).toEqual(['zh-CN', 'en-US']);
        });

        it('返回数据的副本，修改不影响原数据', async () => {
            loader.registerLanguage('zh-CN', { hello: '你好' });
            const data = await loader.loadLanguage('zh-CN');
            data.hello = '被篡改';
            const data2 = await loader.loadLanguage('zh-CN');
            expect(data2.hello).toBe('你好');
        });
    });

    describe('getTranslations', () => {
        it('返回所有语言数据（兼容 loadTranslations 格式）', () => {
            loader.registerLanguage('zh-CN', { hello: '你好' });
            loader.registerLanguage('en-US', { hello: 'Hello' });
            const result = loader.getTranslations();
            expect(result).toEqual({
                'zh-CN': { hello: '你好' },
                'en-US': { hello: 'Hello' },
            });
        });

        it('空数据时返回空对象', () => {
            expect(loader.getTranslations()).toEqual({});
        });
    });

    describe('clear', () => {
        it('清空所有数据', () => {
            loader.registerLanguage('zh-CN', { hello: '你好' });
            loader.clear();
            expect(loader.hasLanguage('zh-CN')).toBe(false);
            expect(loader.getRegisteredLanguages()).toEqual([]);
            expect(loader.loadCalls).toEqual([]);
        });
    });

    describe('setLoadDelay', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('设置延迟后 loadLanguage 异步延迟返回', async () => {
            loader.registerLanguage('zh-CN', { hello: '你好' });
            loader.setLoadDelay(500);

            let resolved = false;
            const promise = loader.loadLanguage('zh-CN').then((data) => {
                resolved = true;
                return data;
            });

            expect(resolved).toBe(false);
            jest.advanceTimersByTime(500);
            const data = await promise;
            expect(data).toEqual({ hello: '你好' });
        });
    });

    describe('setLoadError', () => {
        it('设置错误后 loadLanguage reject', async () => {
            loader.setLoadError('ko-KR', new Error('加载失败'));
            await expect(loader.loadLanguage('ko-KR')).rejects.toThrow('加载失败');
        });

        it('错误仅影响指定语言', async () => {
            loader.registerLanguage('zh-CN', { hello: '你好' });
            loader.setLoadError('ko-KR', new Error('失败'));
            const data = await loader.loadLanguage('zh-CN');
            expect(data).toEqual({ hello: '你好' });
        });
    });
});
