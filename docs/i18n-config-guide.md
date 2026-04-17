# i18n 配置表格式与加载策略指南

> 本文档描述 i18n 模块的配置表格式、文件路径约定和加载策略。
> CSV 解析由业务层负责，LocalizationManager 直接接收已解析的数据格式。

## 1. 配置表设计

### 1.1 主表：languages.csv

定义支持的语言列表，每行代表一种语言。

**文件路径**：`resources/i18n/languages.csv`

**格式定义**：

| 列名 | 类型   | 说明               | 示例     |
| ---- | ------ | ------------------ | -------- |
| id   | number | 行唯一标识（主键） | 1        |
| code | string | 语言代码（ISO）    | zh-CN    |
| name | string | 语言显示名称       | 简体中文 |

**完整示例**：

```csv
id,code,name
1,zh-CN,简体中文
2,en-US,English
3,ja-JP,日本語
4,ko-KR,한국어
```

**注意事项**：

- 第一行为表头，必须包含 `id,code,name`
- `code` 字段遵循 ISO 639-1 标准（如 `zh-CN`, `en-US`）
- `id` 必须唯一，建议从 1 开始递增
- 文件编码：UTF-8（建议无 BOM）

---

### 1.2 翻译表：i18n\_{lang}.csv

每种语言一个翻译文件，包含该语言的所有翻译键值对。

**文件路径**：`resources/i18n/i18n_{lang}.csv`（其中 `{lang}` 为语言代码）

**格式定义**：

| 列名  | 类型   | 说明                          | 示例            |
| ----- | ------ | ----------------------------- | --------------- |
| id    | number | 行唯一标识（主键）            | 1               |
| key   | string | 翻译键名（支持 dot 分隔嵌套） | item.sword.name |
| value | string | 翻译值（支持参数插值占位符）  | 长剑            |

**完整示例**（i18n_zh-CN.csv）：

```csv
id,key,value
1,game.title,游戏标题
2,item.sword.name,长剑
3,item.sword.desc,一把锋利的长剑
4,item.shield.name,盾牌
5,item.shield.desc,坚固的盾牌
6,greeting.welcome,欢迎 [name]！
7,greeting.farewell,再见，[name]！
8,error.not_found,未找到 [item]
9,format.example,使用 [[brackets]] 表示字面量括号
```

**完整示例**（i18n_en-US.csv）：

```csv
id,key,value
1,game.title,Game Title
2,item.sword.name,Sword
3,item.sword.desc,A sharp sword
4,item.shield.name,Shield
5,item.shield.desc,A sturdy shield
6,greeting.welcome,Welcome, [name]!
7,greeting.farewell,Goodbye, [name]!
8,error.not_found,[item] not found
9,format.example,Use [[brackets]] for literal brackets
```

**完整示例**（i18n_ja-JP.csv）：

```csv
id,key,value
1,game.title,ゲームタイトル
2,item.sword.name,剣
3,item.sword.desc,鋭い剣
4,item.shield.name,盾
5,item.shield.desc,堅い盾
6,greeting.welcome,ようこそ、[name]！
7,greeting.farewell,さようなら、[name]！
8,error.not_found,[item] が見つかりません
9,format.example,リテラル括弧には [[brackets]] を使用
```

**完整示例**（i18n_ko-KR.csv）：

```csv
id,key,value
1,game.title,게임 제목
2,item.sword.name,검
3,item.sword.desc,날카로운 검
4,item.shield.name,방패
5,item.shield.desc,튼튼한 방패
6,greeting.welcome,환영합니다, [name]！
7,greeting.farewell,안녕히 가세요, [name]！
8,error.not_found,[item]을(를) 찾을 수 없습니다
9,format.example,리터럴 대괄호에는 [[brackets]] 사용
```

---

## 2. 文件路径约定

```
resources/i18n/
├── languages.csv          # 语言定义主表
├── i18n_zh-CN.csv         # 简体中文翻译
├── i18n_en-US.csv         # 英文翻译
├── i18n_ja-JP.csv         # 日文翻译
└── i18n_ko-KR.csv         # 韩文翻译
```

**命名规则**：

- 主表固定名称：`languages.csv`
- 翻译表命名：`i18n_{lang}.csv`（`{lang}` 与 `languages.csv` 中的 `code` 字段一致）
- 所有文件放置在 `resources/i18n/` 目录下

---

## 3. Excel 编辑流程

### 3.1 标准流程

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  策划在 Excel   │ →  │  导出为 CSV     │ →  │  放置到指定目录  │ →  │  Localization   │
│  编辑翻译内容   │    │  （UTF-8 编码）  │    │  resources/i18n/ │    │  Manager 加载   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 3.2 详细步骤

1. **编辑翻译内容**
    - 使用 Excel 或 WPS 打开 CSV 文件
    - 按照格式要求编辑 `id`, `key`, `value` 列
    - 保持表头不变

2. **导出为 CSV 格式**
    - 选择「另存为」→「CSV UTF-8（逗号分隔）」
    - 确保编码为 UTF-8
    - 建议选择「无 BOM」格式（如 Excel 支持）

3. **放置到指定目录**
    - 将导出的 CSV 文件复制到 `resources/i18n/` 目录
    - 文件名必须与语言代码一致（如 `i18n_zh-CN.csv`）

4. **自动加载**
    - LocalizationManager 初始化时自动加载所有语言包
    - 无需手动触发加载

### 3.3 注意事项

- **UTF-8 BOM 处理**：如果 Excel 导出的 CSV 包含 BOM 头，LocalizationManager 会自动移除
- **逗号转义**：如果翻译值中包含逗号，使用双引号包围（CSV 标准）
- **换行符**：翻译值中不建议包含换行符
- **空行**：CSV 文件末尾可以有空行，会被自动忽略

---

## 4. 批量加载策略

### 4.1 加载流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         业务层职责                                │
│  1. 使用 ResourceManager 加载 CSV 文件                           │
│  2. 解析 CSV 为 Record<string, Record<string, string>> 格式     │
│  3. 调用 localizationManager.loadTranslations(data)              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LocalizationManager.loadTranslations()          │
│  1. 遍历每种语言的翻译数据                                        │
│  2. 使用 _flattenObject() 扁平化嵌套 key                         │
│  3. 存储到内部数据结构                                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  存储到内部数据结构                                │
│  Map<flatKey, Map<lang, value>>                                 │
│  例如：'item.sword.name' → { 'zh-CN': '长剑', 'en-US': 'Sword' } │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 核心代码

```typescript
/**
 * 业务层加载示例
 * CSV 解析由业务层负责，LocalizationManager 接收已解析的数据
 */
async function loadI18nData(): Promise<void> {
    const i18n = GameEntry.getModule<LocalizationManager>('LocalizationManager');

    // 1. 加载并解析 CSV 文件
    const zhCNData = await loadAndParseCSV('resources/i18n/i18n_zh-CN.csv');
    const enUSData = await loadAndParseCSV('resources/i18n/i18n_en-US.csv');

    // 2. 调用 loadTranslations 加载翻译数据
    i18n.loadTranslations({
        'zh-CN': zhCNData,
        'en-US': enUSData,
    });
}

/**
 * CSV 解析示例（业务层实现）
 * 将 CSV 字符串解析为 Record<key, value> 格式
 */
function parseCSV(csvContent: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = csvContent.split('\n');

    // 跳过表头行
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [id, key, value] = line.split(',');
        if (key && value) {
            result[key] = value;
        }
    }

    return result;
}
```

### 4.3 UTF-8 BOM 处理

```typescript
/**
 * 移除 UTF-8 BOM 头
 * Excel 导出的 CSV 可能包含 BOM（\uFEFF），导致解析失败
 * @param content 原始内容
 * @returns 移除 BOM 后的内容
 */
private _stripBOM(content: string): string {
    // 移除 UTF-8 BOM 头（\uFEFF）
    if (content.charCodeAt(0) === 0xFEFF) {
        return content.slice(1);
    }
    return content;
}
```

### 4.4 加载到内存流程

1. **业务层解析**：业务层加载 CSV 文件并解析为 `Record<key, value>` 格式
2. **调用加载方法**：业务层调用 `localizationManager.loadTranslations(data)`
3. **数据转换**：`loadTranslations` 内部使用 `_flattenObject()` 扁平化 key
4. **内存存储**：存储到内部 `Map<flatKey, Map<lang, value>>` 结构

### 4.5 数据存储结构

```
输入 CSV 行：
id=1, key="item.sword.name", value="长剑"

扁平化存储：
Map {
  'item.sword.name' → Map {
    'zh-CN' → '长剑',
    'en-US' → 'Sword',
    'ja-JP' → '剣',
    'ko-KR' → '검'
  }
}
```

---

## 5. 大文件优化策略

### 5.1 当前决策

- **全量加载**：启动时加载所有语言包到内存
- **性能估算**：10000 条翻译约 500KB，加载时间 < 100ms
- **内存占用**：4 种语言 × 10000 条 ≈ 2MB

### 5.2 未来扩展

如果翻译量增长到 10 万+ 条，可考虑以下优化：

1. **懒加载模式**
    - 启动时只加载默认语言
    - 切换语言时按需加载
    - 使用 LRU 缓存管理已加载的语言包

2. **分块加载**
    - 按模块拆分翻译文件（如 `i18n_zh-CN_items.csv`, `i18n_zh-CN_ui.csv`）
    - 按需加载特定模块的翻译

3. **二进制格式**
    - 将 CSV 转换为二进制格式
    - 减少解析时间，降低内存占用

---

## 6. 参数插值说明

### 6.1 基本用法

在翻译值中使用 `[paramName]` 作为占位符：

```csv
id,key,value
1,greeting.welcome,欢迎 [name]！
2,error.not_found,未找到 [item]
```

调用方式：

```typescript
localizationManager.t('greeting.welcome', { name: '玩家' });
// 输出：欢迎 玩家！

localizationManager.t('error.not_found', { item: '长剑' });
// 输出：未找到 长剑
```

### 6.2 转义括号

使用 `[[key]]` 表示字面量 `[key]`：

```csv
id,key,value
1,format.example,使用 [[brackets]] 表示字面量括号
```

调用方式：

```typescript
localizationManager.t('format.example');
// 输出：使用 [brackets] 表示字面量括号
```

### 6.3 参数不存在处理

如果参数不存在，保留原始 `[key]` 标记：

```typescript
localizationManager.t('greeting.welcome', {});
// 输出：欢迎 [name]！
```

---

## 7. 验收标准

- [x] 包含 `languages.csv` 格式定义
- [x] 包含 `i18n_{lang}.csv` 格式定义
- [x] 包含加载策略说明
- [x] 包含 Excel 编辑 → CSV 导出流程说明
- [x] CSV 格式示例正确
- [x] 加载策略描述清晰
- [x] 包含 UTF-8 BOM 处理说明
- [x] 包含参数插值说明
- [x] 包含大文件优化策略

---

## 8. 相关文档

- [DataTable 模块文档](./datatable-config-guide.md) - CSV 解析机制参考
- [模块注册表](./module-registry.md) - i18n 模块依赖关系
- [架构设计文档](./architecture.md) - 整体架构说明
