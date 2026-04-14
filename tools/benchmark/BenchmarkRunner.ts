/**
 * 性能基准测试运行器
 *
 * 封装多轮测试 + 统计（avg/min/max/p95/p99），
 * 支持 JIT warmup 预热，输出 Markdown 格式报告。
 *
 * @example
 * ```ts
 * const runner = new BenchmarkRunner({ warmupRounds: 100, iterations: 1000 });
 * runner.add('EventManager emit', () => { eventManager.emit(key, 42); });
 * runner.runAll();
 * console.log(runner.reportMarkdown());
 * ```
 */

/** 单个基准测试的统计结果 */
export interface BenchmarkResult {
    /** 测试名称 */
    name: string;
    /** 正式迭代次数 */
    iterations: number;
    /** 平均耗时（ms） */
    avg: number;
    /** 最小耗时（ms） */
    min: number;
    /** 最大耗时（ms） */
    max: number;
    /** 第 95 百分位耗时（ms） */
    p95: number;
    /** 第 99 百分位耗时（ms） */
    p99: number;
    /** 总耗时（ms） */
    total: number;
    /** 标准差（ms） */
    stddev: number;
    /** 每秒操作数 */
    opsPerSec: number;
    /** 每轮原始采样数据（ms） */
    samples: readonly number[];
}

/** BenchmarkRunner 配置 */
export interface BenchmarkOptions {
    /** JIT 预热轮数（不计入统计） */
    warmupRounds?: number;
    /** 正式测试迭代次数 */
    iterations?: number;
}

/** 一个待执行的基准测试用例 */
interface BenchmarkCase {
    name: string;
    fn: () => void;
    /** 可选的 setup 函数，每轮前执行（不计入计时） */
    setup?: () => void;
    /** 可选的 teardown 函数，每轮后执行（不计入计时） */
    teardown?: () => void;
}

/**
 * 防止 V8 死码消除的"黑洞"变量
 * 基准测试应将中间结果通过 consumeSink 写入此变量
 */
export let __benchmarkSink: unknown = 0;

/** 将值写入 sink，防止跨模块 import 无法赋值 */
export function consumeSink(value: unknown): void {
    __benchmarkSink = value;
}

export class BenchmarkRunner {
    /** JIT 预热轮数 */
    private readonly _warmupRounds: number;
    /** 正式测试迭代次数 */
    private readonly _iterations: number;
    /** 注册的测试用例 */
    private readonly _cases: BenchmarkCase[] = [];
    /** 测试结果 */
    private readonly _results: BenchmarkResult[] = [];

    constructor(options: BenchmarkOptions = {}) {
        this._warmupRounds = options.warmupRounds ?? 100;
        this._iterations = options.iterations ?? 1000;
    }

    /**
     * 注册一个基准测试用例
     * @param name 测试名称
     * @param fn 被测函数（应包含防死码消除逻辑）
     * @param setup 可选，每轮前的准备函数
     * @param teardown 可选，每轮后的清理函数
     */
    add(name: string, fn: () => void, setup?: () => void, teardown?: () => void): void {
        this._cases.push({ name, fn, setup, teardown });
    }

    /**
     * 运行单个基准测试
     *
     * 先跑预热轮（不计入统计），再跑正式轮收集 samples。
     * setup/teardown 的耗时不计入 samples。
     */
    run(benchCase: BenchmarkCase): BenchmarkResult {
        const { name, fn, setup, teardown } = benchCase;
        const samples: number[] = [];

        // 预热阶段：跑 _warmupRounds 轮，不记录时间
        for (let i = 0; i < this._warmupRounds; i++) {
            if (setup) setup();
            fn();
            if (teardown) teardown();
        }

        // 正式测试阶段：跑 _iterations 轮，收集每轮耗时
        for (let i = 0; i < this._iterations; i++) {
            if (setup) setup();
            const start = performance.now();
            fn();
            const end = performance.now();
            if (teardown) teardown();
            samples.push(end - start);
        }

        return this._computeStats(name, samples);
    }

    /**
     * 运行所有已注册的基准测试
     */
    runAll(): BenchmarkResult[] {
        this._results.length = 0;
        for (const benchCase of this._cases) {
            const result = this.run(benchCase);
            this._results.push(result);
        }
        return this._results;
    }

    /**
     * 计算统计数据（avg/min/max/p95/p99/total）
     * 对 samples 排序后提取各指标
     */
    private _computeStats(name: string, samples: number[]): BenchmarkResult {
        if (samples.length === 0) {
            return {
                name,
                iterations: 0,
                avg: 0,
                min: 0,
                max: 0,
                p95: 0,
                p99: 0,
                total: 0,
                stddev: 0,
                opsPerSec: 0,
                samples,
            };
        }

        const sorted = samples.slice().sort((a, b) => a - b);
        const total = sorted.reduce((sum, v) => sum + v, 0);
        const avg = total / samples.length;
        const variance = sorted.reduce((sum, v) => sum + (v - avg) ** 2, 0) / samples.length;
        const stddev = Math.sqrt(variance);

        return {
            name,
            iterations: samples.length,
            avg,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            p95: this._percentile(sorted, 0.95),
            p99: this._percentile(sorted, 0.99),
            total,
            stddev,
            opsPerSec: avg > 0 ? 1000 / avg : 0,
            samples,
        };
    }

    /**
     * 计算百分位值
     * @param sorted 已排序的数组
     * @param percentile 百分位（0-1），如 0.95 表示 p95
     */
    private _percentile(sorted: number[], percentile: number): number {
        const index = Math.max(Math.ceil(percentile * sorted.length) - 1, 0);
        return sorted[index];
    }

    /**
     * 生成 Markdown 格式的性能报告
     * 包含运行配置、时间戳和各测试统计表格
     */
    reportMarkdown(): string {
        const lines: string[] = [];
        lines.push(`# 性能基准报告`);
        lines.push('');
        lines.push(`- **运行时间**: ${new Date().toISOString()}`);
        lines.push(`- **预热轮数**: ${this._warmupRounds}`);
        lines.push(`- **迭代次数**: ${this._iterations}`);
        lines.push('');
        lines.push(
            '| 测试名称 | 迭代次数 | Avg (ms) | Stddev (ms) | Min (ms) | Max (ms) | P95 (ms) | P99 (ms) | ops/sec | Total (ms) |',
        );
        lines.push(
            '|---------|---------|---------|-----------|---------|---------|---------|---------|---------|-----------|',
        );
        for (const r of this._results) {
            lines.push(
                `| ${r.name} | ${r.iterations} | ${r.avg.toFixed(2)} | ${r.stddev.toFixed(2)} | ${r.min.toFixed(2)} | ${r.max.toFixed(2)} | ${r.p95.toFixed(2)} | ${r.p99.toFixed(2)} | ${r.opsPerSec.toFixed(0)} | ${r.total.toFixed(2)} |`,
            );
        }
        lines.push('');
        return lines.join('\n');
    }

    /** 获取所有结果 */
    get results(): ReadonlyArray<BenchmarkResult> {
        return this._results;
    }
}
