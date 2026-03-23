# 🎨 美术资源跨模块重复检测工具

> **解决的问题**：美术在制作新模块时会复用旧图片，但客户端开发人员不知道哪些图片已存在，
> 导致同一张图片被打包进多个模块图集，浪费包体体积并增加无效 DrawCall。

## 工具简介

`tools/asset-scanner` 是一个纯 Node.js CLI 工具（TypeScript），无需额外依赖，
通过 **文件内容 MD5 哈希对比** 精准检测跨模块的重复资源。

### 核心功能

| 命令 | 说明 |
|------|------|
| `scan <dir>` | 扫描根目录下所有模块，生成完整的跨模块重复报告 |
| `diff <dir> <new>` | 对比新模块与已有模块，列出新模块中哪些图片已存在于其他模块 |

## 快速开始

```bash
# 在项目根目录下执行
npx ts-node tools/asset-scanner/src/index.ts scan  <美术资源根目录>
npx ts-node tools/asset-scanner/src/index.ts diff  <美术资源根目录> <新模块目录>
```

## 目录结构约定

工具假设美术资源按如下结构组织（每个一级子目录为一个模块）：

```
art-assets/
├── module_battle/        ← 战斗模块
│   ├── btn_attack.png
│   ├── hero_sword.png
│   └── shared_bg.png
├── module_lobby/         ← 大厅模块
│   ├── lobby_bg.png
│   └── shared_bg.png     ← 与 battle 内容相同！
└── module_shop/          ← 商城模块
    └── ...
```

## 使用示例

### 1. scan — 全量扫描

```bash
npx ts-node tools/asset-scanner/src/index.ts scan ./art-assets
```

**输出示例：**

```
════════════════════════════════════════════════════════════
  🎨 资源模块扫描报告
════════════════════════════════════════════════════════════
  根目录：/project/art-assets
  模块总数：3     资源总数：12

▶ 各模块统计
  模块名         │ 总计 │ 独占 │ 共享 │ 冗余占用
  ──────────────┼──────┼──────┼──────┼──────────
  module_battle  │  4   │  3   │  1   │ 24.00 KB
  module_lobby   │  4   │  3   │  1   │ 24.00 KB
  module_shop    │  4   │  4   │  0   │  0.00 B

▶ ⚠️  跨模块共享资源（共 1 个，建议合并到公共目录）

  ● shared_bg.png  (24.00 KB, hash: a3f8c1d2…)
    出现在 2 个模块：module_battle, module_lobby
      module_battle/shared_bg.png
      module_lobby/shared_bg.png
```

### 2. diff — 新模块对比

美术交付新模块后，在接收目录运行：

```bash
npx ts-node tools/asset-scanner/src/index.ts diff ./art-assets ./new_delivered_module
```

**输出示例：**

```
════════════════════════════════════════════════════════════
  🆕 新模块资源差异报告
════════════════════════════════════════════════════════════
  新模块名：new_delivered_module
  新模块资源总数：5

  ⚠️  与已有模块重复的资源：2 个  (内容完全相同，无需再次存储)
  ✅ 全新资源（本模块独有）：3 个

▶ 重复资源详情（建议复用已有模块中的版本）

  ● shared_bg.png  (24.00 KB, hash: a3f8c1d2…)
    新模块路径：new_delivered_module/shared_bg.png
    已存在于：
      [module_battle] module_battle/shared_bg.png
      [module_lobby]  module_lobby/shared_bg.png

▶ 全新资源列表（共 3 个）
  + new_enemy.png       (18.00 KB)
  + new_skill_icon.png  (4.00 KB)
  + new_map.png         (128.00 KB)
```

### 3. JSON 输出（集成 CI）

```bash
# 保存报告到文件
npx ts-node tools/asset-scanner/src/index.ts scan ./art-assets --json > report.json

# 在 CI 中检查是否有新增共享资源（示例：github actions step）
npx ts-node tools/asset-scanner/src/index.ts diff ./art-assets ./new_module --json \
  | node -e "
    const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
    if (r.duplicates.length > 0) {
      console.error('❌ 发现 ' + r.duplicates.length + ' 个重复资源！请确认是否需要复用已有图片。');
      process.exit(1);
    }
  "
```

### 4. 扫描 Atlas 文件

加 `--atlas` 参数可同时扫描 `.plist` / `.atlas` / `.fnt` 精灵表文件：

```bash
npx ts-node tools/asset-scanner/src/index.ts scan ./art-assets --atlas
```

## 命令行参数

```
scan <资源根目录> [选项]

diff <资源根目录> <新模块目录> [选项]

选项：
  --atlas   同时扫描 .plist / .atlas / .fnt 文件（默认仅扫描图片）
  --json    以 JSON 格式输出结果
  --help    显示帮助信息
```

## 支持的文件类型

| 类别 | 扩展名 |
|------|--------|
| 图片（默认扫描） | `.png` `.jpg` `.jpeg` `.webp` `.svg` `.bmp` `.tga` `.tif` `.tiff` |
| 精灵表（`--atlas`） | `.plist` `.atlas` `.fnt` |

## 工作原理

1. **模块识别**：把扫描根目录下的每个一级子目录视为一个独立模块
2. **内容哈希**：对每个图片文件计算 MD5 值（而非依赖文件名），确保改名后的相同图片也能被发现
3. **跨模块对比**：
   - 相同 hash → 内容完全相同，即重复/共享图片
   - 相同文件名但不同 hash → 可能是版本冲突（同名异内容）
4. **报告生成**：输出人类可读的彩色表格，或 JSON 格式供 CI 消费

## 推荐工作流

```
美术交付新模块
      │
      ▼
运行 diff 命令
      │
   ┌──┴──┐
   │重复？│
   └──┬──┘
      │ 有重复
      ▼
确认复用策略：
  A. 新模块引用已有模块的图片（推荐）
  B. 将共享图片移入 common/ 公共目录
  C. 保留副本（需说明原因）
      │
      ▼
打包进图集 / 降低 DrawCall
```

## 运行测试

```bash
# 在项目根目录
npm test -- --testPathPattern="asset-scanner"
```
