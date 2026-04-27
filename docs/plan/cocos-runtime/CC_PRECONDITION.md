# Cocos Runtime 集成前置条件（CC 3.8.5）

> TL;DR — 读完本文你能确认 5 件事：
>
> 1. 已通过 **Cocos Dashboard** 安装编辑器，不是手工解压。
> 2. 编辑器版本**锁定 3.8.5**，且项目级配置也写死该版本。
> 3. CC 项目目录**位于内置磁盘**（避开 `/Volumes/...` 外置 SSD）。
> 4. 项目内 `tsconfig.json` 的 `paths` 别名状态已确认（spike 通过 / 暂走相对路径）。
> 5. `installCocosRuntime()` 调用时 `ResourceManager` / `SceneManager` / `UIManager` 已 `GameModule.register()` 完毕。

本文档对应 `plan.yaml` 中 **w4-t0** 任务的 coverage_matrix。

---

## 1. Cocos Dashboard 安装步骤

- 下载入口：<https://www.cocos.com/creator>，下拉到「下载 Cocos Dashboard」。
- 安装位置：
    - macOS：`/Applications/CocosDashboard.app`
    - Windows：`C:\Program Files\Cocos\Dashboard\`
- 通过 Dashboard 安装编辑器：打开 Dashboard → 顶部「编辑器」标签 → 「安装编辑器」→ 选择 **3.8.5** → 等待下载完成。
- 创建项目：Dashboard → 「项目」标签 → 「新建」→ 选择 **3.8.5** 编辑器 → 选择 `Empty (3D)` 或 `2D` 模板 → 起项目名 `cocos-runtime-demo`。

> 强制要求：项目脚手架**必须**通过 Dashboard 创建。手工拷贝目录会缺失 `.creator/`、`library/`、`temp/` 等索引，导致首次打开时资源数据库无法重建。

---

## 2. 3.8.5 版本锁定

- 为什么是 3.8.5：
    - 本仓库 `types/cc.d.ts` 与 mocks 都基于 3.8.5 API 推导，跨小版本（如 3.8.6 / 3.9.x）会出现签名漂移。
    - `resources.load` 的三种重载、`Director.EVENT_BEFORE_SCENE_LOADING` / `EVENT_AFTER_SCENE_LAUNCH` 常量、`Asset.addRef/decRef` 的语义在 3.8.5 已稳定。
- 在 Dashboard 列表中安装：「编辑器」→ 选择 `3.8.5`（**不要**点「最新」/「Beta」）→ 安装。
- 项目级锁版（任选其一即可，推荐都写）：
    - `<project>/package.json` 中 `creator.version`：
      ```json
      { "creator": { "version": "3.8.5" } }
      ```
    - `<project>/settings/v2/packages/project.json` 中 `engineVersion` 字段。
- 切版风险：
    - `resources.load` 的回调签名在 3.9 起加入 `bundle` 参数。
    - `Director` 的部分常量在 3.10 计划改名（CC 路线图）。
    - 升版前必须重跑 `tests/runtime/cc-385/*.test.ts` 全套用例并对照 `cc.d.ts` 差异。

---

## 3. 外置 SSD 规避说明

- 现象：本仓库位于 `/Volumes/Extreme SSD/...`（exFAT/APFS 外置盘），CC 编辑器在 macOS 下对外置卷有以下已知问题：
    - 资源数据库（`library/`）偶现路径解析失败，重启后又恢复。
    - 文件监听 / 热重载（`fsevents`）在卸盘 → 重连后失效。
    - `dot_clean` 残留的 `._*` AppleDouble 会污染 `library/imports/`。
- 推荐方案：
    1. 在**内置磁盘**创建 CC 项目：`~/CocosProjects/cocos-runtime-demo`。
    2. 把仓库的 `assets/scripts/runtime/cc-385/` 同步到 CC 项目的 `assets/scripts/runtime/cc-385/`，可选：
        - 软链接：`ln -s "/Volumes/Extreme SSD/.../runtime/cc-385" ~/CocosProjects/cocos-runtime-demo/assets/scripts/runtime/cc-385`
        - 或 `rsync` / file watcher 单向同步（CC 不要写回仓库）。
    3. **不要**直接把 CC 项目根目录放在外置 SSD。
- 备选方案（强行外置 SSD 时）：
    - 在「磁盘工具」中确认卷格式为 **APFS**（非 exFAT；exFAT 的 mtime 精度只有 2 秒，会引发热重载抖动）。
    - 系统设置 → 隐私与安全 → 「完整磁盘访问」勾选 `CocosCreator.app`。
    - 关闭 `._` 文件生成：`defaults write com.apple.desktopservices DSDontWriteUSBStores -bool true`。

---

## 4. paths 别名 spike 清单

CC 3.8.5 编辑器对 TypeScript `paths` 别名的支持**未经本项目验证**，需在集成前完成 spike。

- 已知事实：
    - CC 编辑器**不读取**仓库根的 `tsconfig.json`，仅使用 `<project>/tsconfig.json`。
    - 编辑器内部用自家的 ts 转译（非 vanilla `tsc`），对 `paths` 的支持历史上不完整。
- 建议默认策略：
    - 适配层先用**相对路径**导入：`import { ResourceManager } from '../../../runtime/cc-385/CocosResourceLoader'`。
    - spike 通过后再统一切到 `@framework/*` / `@runtime/*`。
- spike 步骤清单：
    1. 在 demo 项目内新建 `assets/scripts/_spike/AliasProbe.ts`，写一行 `import { ResourceManager } from '@framework/resource/ResourceManager';`。
    2. 在编辑器内触发构建（菜单：项目 → 构建发布 → Web Mobile）→ 观察 Console。
    3. 若报 `Cannot find module '@framework/...'`：在 `<project>/tsconfig.json` 补：
       ```json
       {
           "compilerOptions": {
               "baseUrl": "./",
               "paths": {
                   "@framework/*": ["assets/scripts/framework/*"],
                   "@runtime/*": ["assets/scripts/runtime/*"]
               }
           }
       }
       ```
    4. 重启编辑器（**不是** reload，是完全退出再开），重试构建。
    5. 仍失败 → 把现象、版本、堆栈记录到 `VALIDATION.md`，保留相对路径方案，不阻塞 w4 后续任务。

---

## 完成检查表

- [ ] Cocos Dashboard 已安装并可启动
- [ ] 已通过 Dashboard 安装 Cocos Creator **3.8.5**（非最新版）
- [ ] CC 项目通过 Dashboard 新建，位于 `~/CocosProjects/cocos-runtime-demo`（内置磁盘）
- [ ] `<project>/package.json` 的 `creator.version` 写死 `3.8.5`
- [ ] 适配层目录已通过 symlink / 同步脚本进入 CC 项目 `assets/scripts/runtime/cc-385/`
- [ ] paths 别名 spike 已执行，结论记录到 `VALIDATION.md`（pass / fallback-relative）
- [ ] 验证 `installCocosRuntime()` 调用前 `ResourceManager` / `SceneManager` / `UIManager` 已 `GameModule.register()`
