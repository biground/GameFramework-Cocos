/**
 * 资源扫描工具 — 类型定义
 *
 * 用于描述资源扫描过程中涉及的所有数据结构。
 */

/** 单个资源文件的信息 */
export interface AssetInfo {
    /** 文件名（不含路径） */
    name: string;
    /** 文件完整路径 */
    path: string;
    /** 所属模块名（一级子目录名） */
    module: string;
    /** 文件内容 MD5 哈希值 */
    hash: string;
    /** 文件大小（字节） */
    size: number;
}

/** 跨模块共享的资源（相同内容出现在多个模块中） */
export interface SharedAsset {
    /** 文件名（以第一个发现的为准） */
    name: string;
    /** 文件内容 MD5 哈希值 */
    hash: string;
    /** 所有包含该资源的模块名列表 */
    modules: string[];
    /** 所有包含该资源的完整路径列表 */
    paths: string[];
    /** 文件大小（字节） */
    size: number;
}

/** 文件名相同但内容不同的资源（同名异内容，可能是版本冲突） */
export interface ConflictAsset {
    /** 文件名 */
    name: string;
    /** 出现该文件名的所有模块及对应哈希值 */
    entries: Array<{
        module: string;
        path: string;
        hash: string;
        size: number;
    }>;
}

/** 单个模块的统计信息 */
export interface ModuleStats {
    /** 模块名 */
    module: string;
    /** 该模块资源总数 */
    total: number;
    /** 独占资源数（仅出现在本模块） */
    unique: number;
    /** 与其他模块共享的资源数 */
    shared: number;
    /** 共享资源节省的磁盘空间（字节） */
    savedBytes: number;
}

/** 完整的扫描报告 */
export interface ScanReport {
    /** 扫描根目录 */
    rootDir: string;
    /** 扫描时间（ISO 8601） */
    scannedAt: string;
    /** 扫描到的模块总数 */
    totalModules: number;
    /** 扫描到的资源文件总数 */
    totalAssets: number;
    /** 跨模块共享的资源列表 */
    sharedAssets: SharedAsset[];
    /** 同名但内容不同的资源列表（潜在冲突） */
    conflictAssets: ConflictAsset[];
    /** 各模块统计信息 */
    moduleStats: ModuleStats[];
}

/** diff 命令的报告：新模块与已有模块的对比结果 */
export interface DiffReport {
    /** 扫描根目录（已有模块所在目录） */
    rootDir: string;
    /** 新模块路径 */
    newModulePath: string;
    /** 新模块名 */
    newModuleName: string;
    /** 扫描时间（ISO 8601） */
    scannedAt: string;
    /** 新模块资源总数 */
    totalNewAssets: number;
    /** 与已有模块内容相同的资源（重复图片） */
    duplicates: Array<{
        /** 新模块中的文件名 */
        name: string;
        /** 新模块中的路径 */
        newPath: string;
        /** 内容相同的已有模块资源信息 */
        existingMatches: Array<{
            module: string;
            path: string;
            name: string;
        }>;
        hash: string;
        size: number;
    }>;
    /** 仅在新模块中存在的全新资源 */
    newOnly: AssetInfo[];
}

/** 支持扫描的图片扩展名 */
export const IMAGE_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.svg',
    '.bmp',
    '.tga',
    '.tif',
    '.tiff',
]);

/** 支持扫描的 Atlas/精灵表扩展名 */
export const ATLAS_EXTENSIONS = new Set(['.plist', '.atlas', '.fnt']);
