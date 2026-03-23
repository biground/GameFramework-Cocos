import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
    AssetInfo,
    ConflictAsset,
    DiffReport,
    ModuleStats,
    ScanReport,
    SharedAsset,
    ATLAS_EXTENSIONS,
    IMAGE_EXTENSIONS,
} from './types';

/**
 * 计算文件的 MD5 哈希值。
 * @param filePath 文件的绝对路径
 * @returns MD5 十六进制字符串
 */
export function hashFile(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * 判断文件是否属于需要扫描的资源类型。
 * @param filePath 文件路径（包含扩展名）
 * @param includeAtlas 是否同时扫描 Atlas/精灵表文件，默认 false
 */
export function isAssetFile(filePath: string, includeAtlas = false): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) return true;
    if (includeAtlas && ATLAS_EXTENSIONS.has(ext)) return true;
    return false;
}

/**
 * 递归收集指定目录下所有符合条件的资源文件路径。
 * @param dir 要扫描的目录
 * @param includeAtlas 是否同时扫描 Atlas/精灵表文件
 */
function collectFiles(dir: string, includeAtlas: boolean): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectFiles(fullPath, includeAtlas));
        } else if (entry.isFile() && isAssetFile(fullPath, includeAtlas)) {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * 扫描单个模块目录，返回该模块内所有 AssetInfo。
 * @param moduleDir 模块目录绝对路径
 * @param moduleName 模块名（通常为目录名）
 * @param includeAtlas 是否同时扫描 Atlas/精灵表文件
 */
export function scanModule(
    moduleDir: string,
    moduleName: string,
    includeAtlas = false,
): AssetInfo[] {
    const files = collectFiles(moduleDir, includeAtlas);
    return files.map((filePath) => {
        const stat = fs.statSync(filePath);
        return {
            name: path.basename(filePath),
            path: filePath,
            module: moduleName,
            hash: hashFile(filePath),
            size: stat.size,
        };
    });
}

/**
 * 扫描根目录下所有一级子目录（每个子目录视为一个模块），
 * 生成完整的跨模块资源对比报告。
 *
 * @param rootDir 资源根目录（包含多个模块子目录）
 * @param includeAtlas 是否同时扫描 Atlas/精灵表文件，默认 false
 * @returns ScanReport 完整扫描报告
 */
export function scanAll(rootDir: string, includeAtlas = false): ScanReport {
    if (!fs.existsSync(rootDir)) {
        throw new Error(`目录不存在: ${rootDir}`);
    }

    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    const moduleDirs = entries.filter((e) => e.isDirectory());

    if (moduleDirs.length === 0) {
        throw new Error(`在 ${rootDir} 下未找到任何子目录（模块）`);
    }

    // 收集所有模块的资源信息
    const allAssets: AssetInfo[] = [];
    for (const moduleEntry of moduleDirs) {
        const moduleDir = path.join(rootDir, moduleEntry.name);
        const assets = scanModule(moduleDir, moduleEntry.name, includeAtlas);
        allAssets.push(...assets);
    }

    // 按 hash 分组，找出跨模块共享的资源
    const byHash = new Map<string, AssetInfo[]>();
    for (const asset of allAssets) {
        const list = byHash.get(asset.hash) ?? [];
        list.push(asset);
        byHash.set(asset.hash, list);
    }

    const sharedAssets: SharedAsset[] = [];
    for (const [hash, assets] of byHash) {
        const modules = [...new Set(assets.map((a) => a.module))];
        if (modules.length > 1) {
            sharedAssets.push({
                name: assets[0].name,
                hash,
                modules,
                paths: assets.map((a) => a.path),
                size: assets[0].size,
            });
        }
    }

    // 按文件名分组，找出同名异内容的资源（潜在冲突）
    const byName = new Map<string, AssetInfo[]>();
    for (const asset of allAssets) {
        const list = byName.get(asset.name) ?? [];
        list.push(asset);
        byName.set(asset.name, list);
    }

    const conflictAssets: ConflictAsset[] = [];
    for (const [name, assets] of byName) {
        const hashes = new Set(assets.map((a) => a.hash));
        if (hashes.size > 1) {
            // 同名但哈希不同 → 内容不一致
            conflictAssets.push({
                name,
                entries: assets.map((a) => ({
                    module: a.module,
                    path: a.path,
                    hash: a.hash,
                    size: a.size,
                })),
            });
        }
    }

    // 计算各模块统计信息
    const sharedHashes = new Set(sharedAssets.map((s) => s.hash));
    const moduleStatsMap = new Map<string, ModuleStats>();

    for (const asset of allAssets) {
        const stats = moduleStatsMap.get(asset.module) ?? {
            module: asset.module,
            total: 0,
            unique: 0,
            shared: 0,
            savedBytes: 0,
        };
        stats.total += 1;
        if (sharedHashes.has(asset.hash)) {
            stats.shared += 1;
        } else {
            stats.unique += 1;
        }
        moduleStatsMap.set(asset.module, stats);
    }

    // 计算可节省的空间：将每个共享资源的各模块副本排序后，
    // 第一个模块视为"主版本"（不计冗余），其余模块各计一份 size 作为可节省字节。
    // 这样所有模块 savedBytes 之和 = (N-1)*size，等于实际可节省的磁盘空间。
    for (const shared of sharedAssets) {
        for (let i = 1; i < shared.modules.length; i++) {
            const stats = moduleStatsMap.get(shared.modules[i]);
            if (stats) {
                stats.savedBytes += shared.size;
            }
        }
    }

    const moduleStats = [...moduleStatsMap.values()].sort((a, b) =>
        a.module.localeCompare(b.module),
    );

    return {
        rootDir: path.resolve(rootDir),
        scannedAt: new Date().toISOString(),
        totalModules: moduleDirs.length,
        totalAssets: allAssets.length,
        sharedAssets: sharedAssets.sort((a, b) => b.modules.length - a.modules.length),
        conflictAssets,
        moduleStats,
    };
}

/**
 * 对比新模块与已有模块目录，找出新模块中哪些图片在已有模块中已存在（内容相同）。
 *
 * @param rootDir 已有模块的根目录
 * @param newModulePath 新模块目录路径（可在 rootDir 外部）
 * @param includeAtlas 是否同时扫描 Atlas/精灵表文件，默认 false
 * @returns DiffReport 差异报告
 */
export function diffNewModule(
    rootDir: string,
    newModulePath: string,
    includeAtlas = false,
): DiffReport {
    if (!fs.existsSync(rootDir)) {
        throw new Error(`已有模块根目录不存在: ${rootDir}`);
    }
    if (!fs.existsSync(newModulePath)) {
        throw new Error(`新模块目录不存在: ${newModulePath}`);
    }

    const newModuleName = path.basename(newModulePath);

    // 扫描已有所有模块
    const existingEntries = fs.readdirSync(rootDir, { withFileTypes: true });
    const existingModuleDirs = existingEntries.filter(
        (e) => e.isDirectory() && path.resolve(rootDir, e.name) !== path.resolve(newModulePath),
    );

    const existingAssets: AssetInfo[] = [];
    for (const entry of existingModuleDirs) {
        const assets = scanModule(path.join(rootDir, entry.name), entry.name, includeAtlas);
        existingAssets.push(...assets);
    }

    // 按 hash 建立已有资源索引
    const existingByHash = new Map<string, AssetInfo[]>();
    for (const asset of existingAssets) {
        const list = existingByHash.get(asset.hash) ?? [];
        list.push(asset);
        existingByHash.set(asset.hash, list);
    }

    // 扫描新模块
    const newAssets = scanModule(newModulePath, newModuleName, includeAtlas);

    const duplicates: DiffReport['duplicates'] = [];
    const newOnly: AssetInfo[] = [];

    for (const asset of newAssets) {
        const matches = existingByHash.get(asset.hash);
        if (matches && matches.length > 0) {
            duplicates.push({
                name: asset.name,
                newPath: asset.path,
                existingMatches: matches.map((m) => ({
                    module: m.module,
                    path: m.path,
                    name: m.name,
                })),
                hash: asset.hash,
                size: asset.size,
            });
        } else {
            newOnly.push(asset);
        }
    }

    return {
        rootDir: path.resolve(rootDir),
        newModulePath: path.resolve(newModulePath),
        newModuleName,
        scannedAt: new Date().toISOString(),
        totalNewAssets: newAssets.length,
        duplicates,
        newOnly,
    };
}
