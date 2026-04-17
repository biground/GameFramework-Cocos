import { EventKey } from '../event/EventDefs';

// ─── 枚举 ──────────────────────────────────────────────

/**
 * 支持的语言枚举
 */
export enum Language {
    /** 简体中文 */
    ZH_CN = 'zh-CN',
    /** 美式英语 */
    EN_US = 'en-US',
    /** 日语 */
    JA_JP = 'ja-JP',
    /** 韩语 */
    KO_KR = 'ko-KR',
}

// ─── 核心接口 ──────────────────────────────────────────

/**
 * 本地化数据行接口
 * 参考 DataTableDefs.ts 中的 IDataRow 设计
 */
export interface ILocalizationRow {
    /** 行唯一标识（主键） */
    id: number;
    /** 翻译键名 */
    key: string;
    /** 翻译值 */
    value: string;
}

/**
 * 语言切换事件数据
 */
export interface LanguageChangedData {
    /** 切换前的语言 */
    previousLanguage: string;
    /** 切换后的语言 */
    currentLanguage: string;
}

// ─── 事件定义 ──────────────────────────────────────────

/**
 * 本地化事件键定义
 * 参考 EventDefs.ts 中 EventKey 的用法
 */
export class LocalizationEvent {
    /** 语言切换事件 */
    public static readonly LANGUAGE_CHANGED = new EventKey<LanguageChangedData>(
        'LocalizationManager.LanguageChanged',
    );
}
