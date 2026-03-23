/* eslint-disable no-console */
import * as path from 'path';
import { ConflictAsset, DiffReport, ModuleStats, ScanReport, SharedAsset } from './types';

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** ANSI 转义序列的额外字符数（padEnd 需补偿此长度以对齐列宽） */
const ANSI_ESCAPE_LEN = 9;

/** 将字节数格式化为人类可读的大小字符串（如 "1.23 MB"） */
function formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, exp);
    return `${val.toFixed(2)} ${units[exp]}`;
}

/** 将完整路径截短为相对于根目录的相对路径（方便阅读） */
function relPath(fullPath: string, rootDir: string): string {
    return path.relative(rootDir, fullPath);
}

/** 输出彩色标题 */
function printTitle(text: string): void {
    console.log(`\n\x1b[1;34m${'═'.repeat(60)}\x1b[0m`);
    console.log(`\x1b[1;34m  ${text}\x1b[0m`);
    console.log(`\x1b[1;34m${'═'.repeat(60)}\x1b[0m`);
}

/** 输出彩色小节标题 */
function printSection(text: string): void {
    console.log(`\n\x1b[1;33m▶ ${text}\x1b[0m`);
}

/** 高亮警告文本 */
function warn(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
}

/** 高亮成功文本 */
function ok(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
}

/** 高亮信息文本 */
function info(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
}

// ─── 控制台报告 ───────────────────────────────────────────────────────────────

/**
 * 将扫描报告以人类可读的格式输出到控制台。
 * @param report ScanReport 完整扫描报告
 */
export function printScanReport(report: ScanReport): void {
    printTitle('🎨 资源模块扫描报告');
    console.log(`  根目录：${info(report.rootDir)}`);
    console.log(`  扫描时间：${report.scannedAt}`);
    console.log(`  模块总数：${info(String(report.totalModules))}`);
    console.log(`  资源总数：${info(String(report.totalAssets))}`);

    // ── 各模块统计 ──
    printSection('各模块统计');
    const colW = [20, 8, 8, 8, 14];
    const header = [
        '模块名'.padEnd(colW[0]),
        '总计'.padEnd(colW[1]),
        '独占'.padEnd(colW[2]),
        '共享'.padEnd(colW[3]),
        '冗余占用'.padEnd(colW[4]),
    ].join(' │ ');
    const divider = colW.map((w) => '─'.repeat(w)).join('─┼─');
    console.log(`  ${header}`);
    console.log(`  ${divider}`);

    for (const stats of report.moduleStats) {
        const row = [
            stats.module.padEnd(colW[0]),
            String(stats.total).padEnd(colW[1]),
            ok(String(stats.unique)).padEnd(colW[2] + ANSI_ESCAPE_LEN),
            (stats.shared > 0 ? warn(String(stats.shared)) : String(stats.shared)).padEnd(
                colW[3] + ANSI_ESCAPE_LEN,
            ),
            (stats.savedBytes > 0
                ? warn(formatBytes(stats.savedBytes))
                : formatBytes(stats.savedBytes)
            ).padEnd(colW[4] + ANSI_ESCAPE_LEN),
        ].join(' │ ');
        console.log(`  ${row}`);
    }

    // ── 共享资源列表 ──
    if (report.sharedAssets.length === 0) {
        printSection(ok('✅ 未发现跨模块共享资源（各模块图片完全独立）'));
    } else {
        printSection(
            warn(`⚠️  跨模块共享资源（共 ${report.sharedAssets.length} 个，建议合并到公共目录）`),
        );
        printSharedAssets(report.sharedAssets, report.rootDir);
    }

    // ── 同名冲突资源 ──
    if (report.conflictAssets.length > 0) {
        printSection(
            warn(`🔴 同名异内容资源（共 ${report.conflictAssets.length} 个，可能存在版本冲突！）`),
        );
        printConflictAssets(report.conflictAssets, report.rootDir);
    }
}

/** 输出共享资源详情 */
function printSharedAssets(shared: SharedAsset[], rootDir: string): void {
    for (const asset of shared) {
        console.log(
            `\n  ${warn('●')} ${info(asset.name)}  (${formatBytes(asset.size)}, hash: ${asset.hash.slice(0, 8)}…)`,
        );
        console.log(
            `    出现在 ${asset.modules.length} 个模块：${asset.modules.map((m) => warn(m)).join(', ')}`,
        );
        for (const p of asset.paths) {
            console.log(`      ${relPath(p, rootDir)}`);
        }
    }
}

/** 输出同名冲突资源详情 */
function printConflictAssets(conflicts: ConflictAsset[], rootDir: string): void {
    for (const conflict of conflicts) {
        console.log(`\n  ${warn('●')} ${info(conflict.name)}`);
        for (const entry of conflict.entries) {
            console.log(
                `    [${warn(entry.module)}]  hash: ${entry.hash.slice(0, 8)}…  ${formatBytes(entry.size)}`,
            );
            console.log(`      ${relPath(entry.path, rootDir)}`);
        }
    }
}

// ─── Diff 报告 ────────────────────────────────────────────────────────────────

/**
 * 将 diff 报告以人类可读的格式输出到控制台。
 * @param report DiffReport 差异报告
 */
export function printDiffReport(report: DiffReport): void {
    printTitle('🆕 新模块资源差异报告');
    console.log(`  已有模块根目录：${info(report.rootDir)}`);
    console.log(`  新模块路径：    ${info(report.newModulePath)}`);
    console.log(`  新模块名：      ${info(report.newModuleName)}`);
    console.log(`  扫描时间：      ${report.scannedAt}`);
    console.log(`  新模块资源总数：${info(String(report.totalNewAssets))}`);

    const dupCount = report.duplicates.length;
    const newCount = report.newOnly.length;

    console.log(
        `\n  ${warn(`⚠️  与已有模块重复的资源：${dupCount} 个`)}  (内容完全相同，无需再次存储)`,
    );
    console.log(`  ${ok(`✅ 全新资源（本模块独有）：${newCount} 个`)}`);

    // ── 重复资源详情 ──
    if (dupCount > 0) {
        printSection(warn('重复资源详情（建议复用已有模块中的版本）'));
        for (const dup of report.duplicates) {
            console.log(
                `\n  ${warn('●')} ${info(dup.name)}  (${formatBytes(dup.size)}, hash: ${dup.hash.slice(0, 8)}…)`,
            );
            console.log(`    新模块路径：${relPath(dup.newPath, report.rootDir)}`);
            console.log(`    已存在于：`);
            for (const match of dup.existingMatches) {
                console.log(
                    `      [${warn(match.module)}] ${relPath(match.path, report.rootDir)}  (文件名: ${match.name})`,
                );
            }
        }
    }

    // ── 全新资源列表（简略） ──
    if (newCount > 0) {
        printSection(ok(`全新资源列表（共 ${newCount} 个）`));
        for (const asset of report.newOnly) {
            console.log(`  ${ok('+')} ${asset.name}  (${formatBytes(asset.size)})`);
        }
    }

    console.log('');
}

// ─── JSON 输出 ────────────────────────────────────────────────────────────────

/**
 * 将扫描报告序列化为格式化的 JSON 字符串。
 * @param report ScanReport 或 DiffReport
 */
export function toJson(report: ScanReport | DiffReport): string {
    return JSON.stringify(report, null, 2);
}

// ─── 模块统计辅助（供测试使用） ───────────────────────────────────────────────
export { formatBytes };
export type { ModuleStats };
