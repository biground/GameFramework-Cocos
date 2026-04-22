# i18n（国际化 / 本地化）

## 职责

提供多语言翻译文本的加载、存储、查询和参数插值功能，支持运行时语言切换并通过事件广播通知 UI 更新。
**不负责**翻译文本的来源（由外部加载后调用 `loadTranslations`），也不负责 UI 文本的自动刷新（由 UI 层监听事件自行处理）。

## 对外 API

```typescript
// === LocalizationManager（本地化管理器，priority = 350） ===
LocalizationManager.getCurrentLanguage(): Language           // 获取当前语言
LocalizationManager.setLanguage(lang: Language): void        // 设置当前语言（广播事件）
LocalizationManager.getAllLanguages(): Language[]             // 获取所有支持的语言
LocalizationManager.t(key: string, params?: Record<string, string>): string  // 获取翻译
LocalizationManager.hasKey(key: string): boolean             // 检查 key 是否存在
LocalizationManager.loadTranslations(data): void             // 加载翻译数据
LocalizationManager.setEventManager(em: IEventManager): void // 注入事件管理器

// === Language（语言枚举） ===
enum Language {
    ZH_CN = 'zh-CN',   // 简体中文
    EN_US = 'en-US',   // 美式英语
    JA_JP = 'ja-JP',   // 日语
    KO_KR = 'ko-KR',   // 韩语
}

// === LocalizationEvent（事件定义） ===
LocalizationEvent.LANGUAGE_CHANGED: EventKey<LanguageChangedData>

// === 类型定义 ===
interface LanguageChangedData { previousLanguage: string; currentLanguage: string; }
interface ILocalizationRow { id: number; key: string; value: string; }
```

## 设计决策

| 决策       | 选择                                    | 原因                                          |
| ---------- | --------------------------------------- | --------------------------------------------- |
| 存储方式   | 扁平化 `Map<flatKey, Map<lang, value>>` | 嵌套 key 自动扁平化为 dot-notation，查询 O(1) |
| 参数插值   | `[name]` → `params.name`                | 简单直观，避免与模板引擎冲突                  |
| 转义语法   | `[[key]]` → 字面量 `[key]`              | 需要显示方括号时使用双方括号转义              |
| 语言回退   | 当前语言缺失 → 回退到 ZH_CN             | 保证始终有文本返回，中文作为基准语言          |
| key 不存在 | 返回 key 本身                           | 开发阶段容易发现缺失翻译，不会崩溃            |
| 事件广播   | 可选注入 EventManager                   | 解耦事件依赖，未设置时静默跳过                |

## 依赖

- **Core**（`ModuleBase`）— LocalizationManager 继承 ModuleBase
- **Event**（`IEventManager`）— 可选，用于广播语言切换事件
- **Logger** — 日志输出

## 被谁依赖

- Game 层 UI 组件监听 `LANGUAGE_CHANGED` 事件刷新文本
- 业务层通过 `ILocalizationManager` 接口使用

## 已知限制

- 支持的语言列表硬编码在类内部，扩展新语言需修改源码
- 不支持复数规则（plural rules）
- 不支持性别等复杂语法变体
- 参数插值仅支持简单字符串替换，不支持格式化（数字、日期等）
- 翻译数据一次性全量加载，不支持按需懒加载

## 关联测试

- `tests/i18n/`

## 状态

✅ 已完成 — 核心功能就绪，通过全部单元测试
