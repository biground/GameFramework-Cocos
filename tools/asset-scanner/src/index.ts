#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * asset-scanner CLI 入口
 *
 * 用法：
 *   npx ts-node tools/asset-scanner/src/index.ts scan <资源根目录> [--atlas] [--json]
 *   npx ts-node tools/asset-scanner/src/index.ts diff <资源根目录> <新模块目录> [--atlas] [--json]
 */

import { diffNewModule, scanAll } from './scanner';
import { printDiffReport, printScanReport, toJson } from './reporter';

function printUsage(): void {
    console.log(`
资源模块扫描工具 (asset-scanner)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

用法：
  scan <资源根目录> [选项]
      扫描根目录下所有子目录（每个子目录为一个模块），
      输出跨模块共享/重复图片报告。

  diff <资源根目录> <新模块目录> [选项]
      对比新模块与已有模块，列出新模块中哪些图片
      在已有模块中已存在（内容相同）。

选项：
  --atlas   同时扫描 .plist / .atlas / .fnt 文件（默认仅扫描图片）
  --json    以 JSON 格式输出结果（方便集成到 CI/脚本）

示例：
  node index.js scan ./art-assets
  node index.js scan ./art-assets --atlas --json
  node index.js diff ./art-assets ./new-module
  node index.js diff ./art-assets ./new-module --json
`);
}

function main(): void {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printUsage();
        process.exit(0);
    }

    const command = args[0];
    const includeAtlas = args.includes('--atlas');
    const outputJson = args.includes('--json');

    if (command === 'scan') {
        const rootDir = args[1];
        if (!rootDir) {
            console.error('错误：scan 命令需要指定资源根目录。\n');
            printUsage();
            process.exit(1);
        }

        try {
            const report = scanAll(rootDir, includeAtlas);
            if (outputJson) {
                console.log(toJson(report));
            } else {
                printScanReport(report);
            }
        } catch (err) {
            console.error(`\n扫描失败：${(err as Error).message}`);
            process.exit(1);
        }
    } else if (command === 'diff') {
        const rootDir = args[1];
        const newModulePath = args[2];
        if (!rootDir || !newModulePath) {
            console.error('错误：diff 命令需要指定资源根目录和新模块目录。\n');
            printUsage();
            process.exit(1);
        }

        try {
            const report = diffNewModule(rootDir, newModulePath, includeAtlas);
            if (outputJson) {
                console.log(toJson(report));
            } else {
                printDiffReport(report);
            }
        } catch (err) {
            console.error(`\n对比失败：${(err as Error).message}`);
            process.exit(1);
        }
    } else {
        console.error(`未知命令：${command}\n`);
        printUsage();
        process.exit(1);
    }
}

main();
