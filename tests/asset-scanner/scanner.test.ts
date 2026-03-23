import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    diffNewModule,
    hashFile,
    isAssetFile,
    scanAll,
    scanModule,
} from '../../tools/asset-scanner/src/scanner';
import { formatBytes, toJson } from '../../tools/asset-scanner/src/reporter';

// ─── 测试辅助：在临时目录构建模拟的模块目录结构 ───────────────────────────────

/**
 * 在系统临时目录创建一个测试用的资源目录树。
 * 返回根目录路径，测试结束后需手动清理。
 *
 * 目录结构：
 *   <tmpDir>/
 *     moduleA/   icon_a.png (内容 "alpha"), shared.png (内容 "shared")
 *     moduleB/   icon_b.png (内容 "beta"),  shared.png (内容 "shared")
 *     moduleC/   conflict.png (内容 "v1"),  nested/deep.png (内容 "deep")
 */
function createTmpAssetTree(): string {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-scanner-'));

    const write = (relPath: string, content: string): void => {
        const fullPath = path.join(tmpRoot, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf-8');
    };

    // moduleA
    write('moduleA/icon_a.png', 'alpha');
    write('moduleA/shared.png', 'shared-content');

    // moduleB：shared.png 与 moduleA 内容相同
    write('moduleB/icon_b.png', 'beta');
    write('moduleB/shared.png', 'shared-content');

    // moduleC：conflict.png 文件名与 moduleD 相同但内容不同
    write('moduleC/conflict.png', 'version-1');
    write('moduleC/nested/deep.png', 'deep-nested');

    // moduleD：与 moduleC 同名但内容不同的 conflict.png
    write('moduleD/conflict.png', 'version-2');

    return tmpRoot;
}

/**
 * 创建一个独立的"新模块"目录，用于 diff 测试。
 * 包含：
 *   new_icon.png  — 全新资源
 *   shared.png    — 内容与 moduleA/shared.png 相同（重复）
 */
function createNewModuleDir(tmpRoot: string): string {
    const newModDir = path.join(tmpRoot, '_new_module');
    fs.mkdirSync(newModDir, { recursive: true });
    fs.writeFileSync(path.join(newModDir, 'new_icon.png'), 'brand-new', 'utf-8');
    fs.writeFileSync(path.join(newModDir, 'shared.png'), 'shared-content', 'utf-8');
    return newModDir;
}

// ─── 主测试套件 ───────────────────────────────────────────────────────────────

describe('asset-scanner', () => {
    let tmpRoot: string;

    beforeAll(() => {
        tmpRoot = createTmpAssetTree();
    });

    afterAll(() => {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    // ── isAssetFile ──────────────────────────────────────────────────────────

    describe('isAssetFile()', () => {
        it('应识别常见图片扩展名', () => {
            expect(isAssetFile('icon.png')).toBe(true);
            expect(isAssetFile('bg.jpg')).toBe(true);
            expect(isAssetFile('sprite.jpeg')).toBe(true);
            expect(isAssetFile('logo.webp')).toBe(true);
        });

        it('应忽略非图片文件', () => {
            expect(isAssetFile('script.ts')).toBe(false);
            expect(isAssetFile('config.json')).toBe(false);
            expect(isAssetFile('readme.md')).toBe(false);
        });

        it('包含 atlas 模式时应识别 .plist / .atlas / .fnt', () => {
            expect(isAssetFile('sprites.plist', true)).toBe(true);
            expect(isAssetFile('spine.atlas', true)).toBe(true);
            expect(isAssetFile('font.fnt', true)).toBe(true);
        });

        it('不包含 atlas 模式时应忽略 .plist 等文件', () => {
            expect(isAssetFile('sprites.plist', false)).toBe(false);
            expect(isAssetFile('spine.atlas', false)).toBe(false);
        });

        it('扩展名大小写不敏感', () => {
            expect(isAssetFile('ICON.PNG')).toBe(true);
            expect(isAssetFile('Bg.JPG')).toBe(true);
        });
    });

    // ── hashFile ─────────────────────────────────────────────────────────────

    describe('hashFile()', () => {
        it('相同内容的文件哈希值应相等', () => {
            const fileA = path.join(tmpRoot, 'moduleA/shared.png');
            const fileB = path.join(tmpRoot, 'moduleB/shared.png');
            expect(hashFile(fileA)).toBe(hashFile(fileB));
        });

        it('不同内容的文件哈希值应不同', () => {
            const fileA = path.join(tmpRoot, 'moduleA/icon_a.png');
            const fileB = path.join(tmpRoot, 'moduleB/icon_b.png');
            expect(hashFile(fileA)).not.toBe(hashFile(fileB));
        });

        it('返回的哈希值应为 32 位十六进制字符串（MD5）', () => {
            const file = path.join(tmpRoot, 'moduleA/icon_a.png');
            expect(hashFile(file)).toMatch(/^[0-9a-f]{32}$/);
        });

        it('哈希值应与 crypto.createHash("md5") 计算结果一致', () => {
            const file = path.join(tmpRoot, 'moduleA/icon_a.png');
            const expected = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
            expect(hashFile(file)).toBe(expected);
        });
    });

    // ── scanModule ───────────────────────────────────────────────────────────

    describe('scanModule()', () => {
        it('应返回模块内所有图片的 AssetInfo 列表', () => {
            const moduleDir = path.join(tmpRoot, 'moduleA');
            const assets = scanModule(moduleDir, 'moduleA');
            expect(assets).toHaveLength(2);
            expect(assets.every((a) => a.module === 'moduleA')).toBe(true);
        });

        it('AssetInfo 应包含正确的 name / path / hash / size', () => {
            const moduleDir = path.join(tmpRoot, 'moduleA');
            const assets = scanModule(moduleDir, 'moduleA');
            const icon = assets.find((a) => a.name === 'icon_a.png');
            expect(icon).toBeDefined();
            expect(icon!.path).toContain('icon_a.png');
            expect(icon!.hash).toMatch(/^[0-9a-f]{32}$/);
            expect(icon!.size).toBeGreaterThan(0);
        });

        it('应递归扫描嵌套子目录', () => {
            const moduleDir = path.join(tmpRoot, 'moduleC');
            const assets = scanModule(moduleDir, 'moduleC');
            const names = assets.map((a) => a.name);
            expect(names).toContain('conflict.png');
            expect(names).toContain('deep.png');
        });

        it('不存在的目录应返回空数组', () => {
            const assets = scanModule(path.join(tmpRoot, 'non_exist'), 'none');
            expect(assets).toHaveLength(0);
        });
    });

    // ── scanAll ──────────────────────────────────────────────────────────────

    describe('scanAll()', () => {
        it('应正确统计模块总数和资源总数', () => {
            const report = scanAll(tmpRoot);
            expect(report.totalModules).toBe(4); // moduleA / B / C / D
            expect(report.totalAssets).toBeGreaterThanOrEqual(7);
        });

        it('应正确检测跨模块共享资源', () => {
            const report = scanAll(tmpRoot);
            expect(report.sharedAssets.length).toBeGreaterThanOrEqual(1);
            const shared = report.sharedAssets.find(
                (s) => s.modules.includes('moduleA') && s.modules.includes('moduleB'),
            );
            expect(shared).toBeDefined();
        });

        it('共享资源应包含两个模块中的路径', () => {
            const report = scanAll(tmpRoot);
            const shared = report.sharedAssets.find(
                (s) => s.modules.includes('moduleA') && s.modules.includes('moduleB'),
            );
            expect(shared!.paths.length).toBe(2);
        });

        it('应正确检测同名异内容的冲突资源', () => {
            const report = scanAll(tmpRoot);
            const conflict = report.conflictAssets.find((c) => c.name === 'conflict.png');
            expect(conflict).toBeDefined();
            expect(conflict!.entries.length).toBe(2);
        });

        it('moduleStats 应包含每个模块的正确统计', () => {
            const report = scanAll(tmpRoot);
            const statsA = report.moduleStats.find((s) => s.module === 'moduleA');
            expect(statsA).toBeDefined();
            expect(statsA!.total).toBe(2);
            expect(statsA!.shared).toBe(1);
            expect(statsA!.unique).toBe(1);
        });

        it('savedBytes 应只统计冗余副本的大小（第一个模块不计冗余）', () => {
            const report = scanAll(tmpRoot);
            // moduleA 是第一个模块，其 shared.png 被视为"主版本"，不计入 savedBytes
            const statsA = report.moduleStats.find((s) => s.module === 'moduleA');
            // moduleB 排在 moduleA 之后，其 shared.png 视为冗余，计入 savedBytes
            const statsB = report.moduleStats.find((s) => s.module === 'moduleB');
            expect(statsA).toBeDefined();
            expect(statsB).toBeDefined();
            // 两个模块的 savedBytes 之和 = 实际可节省大小（只有一份冗余）
            const totalSaved = statsA!.savedBytes + statsB!.savedBytes;
            const sharedAsset = report.sharedAssets.find(
                (s) => s.modules.includes('moduleA') && s.modules.includes('moduleB'),
            );
            expect(totalSaved).toBe(sharedAsset!.size);
        });

        it('不存在的目录应抛出错误', () => {
            expect(() => scanAll('/non/existent/path')).toThrow('目录不存在');
        });

        it('没有子目录时应抛出错误', () => {
            const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
            try {
                expect(() => scanAll(emptyDir)).toThrow('未找到任何子目录');
            } finally {
                fs.rmdirSync(emptyDir);
            }
        });

        it('报告中应包含根目录和扫描时间', () => {
            const report = scanAll(tmpRoot);
            expect(report.rootDir).toBeTruthy();
            expect(report.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
    });

    // ── diffNewModule ────────────────────────────────────────────────────────

    describe('diffNewModule()', () => {
        let newModulePath: string;

        beforeAll(() => {
            newModulePath = createNewModuleDir(tmpRoot);
        });

        it('应正确检测新模块中与已有模块重复的资源', () => {
            const report = diffNewModule(tmpRoot, newModulePath);
            expect(report.duplicates.length).toBe(1);
            expect(report.duplicates[0].name).toBe('shared.png');
        });

        it('重复资源应指向正确的已有模块', () => {
            const report = diffNewModule(tmpRoot, newModulePath);
            const dup = report.duplicates[0];
            const modules = dup.existingMatches.map((m) => m.module);
            expect(modules).toContain('moduleA');
            expect(modules).toContain('moduleB');
        });

        it('应正确识别全新资源', () => {
            const report = diffNewModule(tmpRoot, newModulePath);
            expect(report.newOnly.length).toBe(1);
            expect(report.newOnly[0].name).toBe('new_icon.png');
        });

        it('总资源数应等于重复数 + 全新数', () => {
            const report = diffNewModule(tmpRoot, newModulePath);
            expect(report.totalNewAssets).toBe(report.duplicates.length + report.newOnly.length);
        });

        it('新模块不存在时应抛出错误', () => {
            expect(() => diffNewModule(tmpRoot, '/non/existent')).toThrow('新模块目录不存在');
        });

        it('已有模块根目录不存在时应抛出错误', () => {
            expect(() => diffNewModule('/non/existent', newModulePath)).toThrow(
                '已有模块根目录不存在',
            );
        });
    });

    // ── reporter ─────────────────────────────────────────────────────────────

    describe('reporter helpers', () => {
        it('formatBytes 应正确格式化字节数', () => {
            expect(formatBytes(0)).toBe('0 B');
            expect(formatBytes(1023)).toBe('1023.00 B');
            expect(formatBytes(1024)).toBe('1.00 KB');
            expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
            expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
        });

        it('toJson 应将报告序列化为有效 JSON', () => {
            const report = scanAll(tmpRoot);
            const json = toJson(report);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            expect(() => JSON.parse(json)).not.toThrow();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parsed: { totalModules: number } = JSON.parse(json);
            expect(parsed.totalModules).toBe(report.totalModules);
        });
    });
});
