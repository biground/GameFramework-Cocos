import {
    Language,
    ILocalizationRow,
    LanguageChangedData,
    LocalizationEvent,
} from '../../assets/scripts/framework/i18n/LocalizationDefs';
import { EventKey } from '../../assets/scripts/framework/event/EventDefs';

describe('LocalizationDefs', () => {
    describe('Language enum', () => {
        it('should contain ZH_CN with value zh-CN', () => {
            expect(Language.ZH_CN).toBe('zh-CN');
        });

        it('should contain EN_US with value en-US', () => {
            expect(Language.EN_US).toBe('en-US');
        });

        it('should contain JA_JP with value ja-JP', () => {
            expect(Language.JA_JP).toBe('ja-JP');
        });

        it('should contain KO_KR with value ko-KR', () => {
            expect(Language.KO_KR).toBe('ko-KR');
        });

        it('should have exactly 4 language options', () => {
            const values = Object.values(Language);
            expect(values).toHaveLength(4);
        });
    });

    describe('ILocalizationRow interface', () => {
        it('should accept valid localization row', () => {
            const row: ILocalizationRow = {
                id: 1,
                key: 'greeting',
                value: 'Hello',
            };
            expect(row.id).toBe(1);
            expect(row.key).toBe('greeting');
            expect(row.value).toBe('Hello');
        });

        it('should have id field as number', () => {
            const row: ILocalizationRow = {
                id: 123,
                key: 'test_key',
                value: 'test value',
            };
            expect(typeof row.id).toBe('number');
        });

        it('should have key field as string', () => {
            const row: ILocalizationRow = {
                id: 1,
                key: 'some_key',
                value: 'some value',
            };
            expect(typeof row.key).toBe('string');
        });

        it('should have value field as string', () => {
            const row: ILocalizationRow = {
                id: 1,
                key: 'key',
                value: 'translated value',
            };
            expect(typeof row.value).toBe('string');
        });
    });

    describe('LanguageChangedData interface', () => {
        it('should accept valid language changed data', () => {
            const data: LanguageChangedData = {
                previousLanguage: 'zh-CN',
                currentLanguage: 'en-US',
            };
            expect(data.previousLanguage).toBe('zh-CN');
            expect(data.currentLanguage).toBe('en-US');
        });

        it('should have previousLanguage field as string', () => {
            const data: LanguageChangedData = {
                previousLanguage: 'zh-CN',
                currentLanguage: 'en-US',
            };
            expect(typeof data.previousLanguage).toBe('string');
        });

        it('should have currentLanguage field as string', () => {
            const data: LanguageChangedData = {
                previousLanguage: 'zh-CN',
                currentLanguage: 'en-US',
            };
            expect(typeof data.currentLanguage).toBe('string');
        });
    });

    describe('LocalizationEvent', () => {
        it('should have LANGUAGE_CHANGED as EventKey instance', () => {
            expect(LocalizationEvent.LANGUAGE_CHANGED).toBeInstanceOf(EventKey);
        });

        it('should have LANGUAGE_CHANGED with correct description', () => {
            expect(LocalizationEvent.LANGUAGE_CHANGED.description).toBe(
                'LocalizationManager.LanguageChanged',
            );
        });

        it('should be typed with LanguageChangedData', () => {
            // This test verifies compile-time type safety
            // The EventKey<LanguageChangedData> ensures type compatibility
            const eventKey: EventKey<LanguageChangedData> = LocalizationEvent.LANGUAGE_CHANGED;
            expect(eventKey).toBeDefined();
        });
    });
});
