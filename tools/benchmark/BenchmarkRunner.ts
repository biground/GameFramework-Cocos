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
    /** 每轮原始采样数据（ms） */
    samples: number[];
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
     * TODO 1：实现核心测试流程
     * 1. 先跑 _warmupRounds 轮预热（调用 fn，不记录时间）
     *    - 如果有 setup/teardown，预热时也要调用
     * 2. 正式跑 _iterations 轮，每轮：
     *    - 调用 setup（如果有）
     *    - 用 performance.now() 记录开始时间
     *    - 调用 fn
     *    - 用 performance.now() 记录结束时间
     *    - 调用 teardown（如果有）
     *    - 把耗时（结束-开始）存入 samples 数组
     * 3. 返回 BenchmarkResult
     *
     * 注意：setup/teardown 的耗时不要计入 samples！
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
     * 计算统计数据
     *
     * TODO 2：实现统计计算
     * 1. 对 samples 排序（升序）
     * 2. 计算 avg = 总和 / 数量
     * 3. min = 排序后第一个，max = 最后一个
     * 4. p95 = 排序后第 Math.ceil(0.95 * n) - 1 位
     * 5. p99 = 排序后第 Math.ceil(0.99 * n) - 1 位
     * 6. total = 所有 sample 的总和
     */
    private _computeStats(name: string, samples: number[]): BenchmarkResult {
        const sorted = samples.slice().sort((a, b) => a - b);
        const total = sorted.reduce((sum, v) => sum + v, 0);

        return {
            name,
            iterations: samples.length,
            avg: total / samples.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            p95: this._percentile(sorted, 0.95),
            p99: this._percentile(sorted, 0.99),
            total,
            samples,
        };
    }

    /**
     * 计算百分位值
     *
     * TODO 3：实现百分位计算
     * @param sorted 已排序的数组
     * @param percentile 百分位（0-1），如 0.95 表示 p95
     */
    private _percentile(sorted: number[], percentile: number): number {
        const index = Math.max(Math.ceil(percentile * sorted.length) - 1, 0);
        return sorted[index];
    }

    /**
     * 生成 Markdown 格式的性能报告
     *
     * TODO 4：实现 Markdown 报告生成
     * 输出格式示例：
     *
     * # 性能基准报告
     *
     * | 测试名称 | 迭代次数 | Avg (ms) | Min (ms) | Max (ms) | P95 (ms) | P99 (ms) | Total (ms) |
     * |---------|---------|---------|---------|---------|---------|---------|-----------|
     * | EventManager emit x10000 | 1000 | 1.23 | 0.98 | 5.67 | 2.34 | 4.56 | 1230.00 |
     *
     * 要求：
     * - 数字保留 2 位小数
     * - 包含运行配置信息（warmup 轮数、迭代次数）
     * - 包含运行时间戳
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
            '| 测试名称 | 迭代次数 | Avg (ms) | Min (ms) | Max (ms) | P95 (ms) | P99 (ms) | Total (ms) |',
        );
        lines.push(
            '|---------|---------|---------|---------|---------|---------|---------|-----------|',
        );
        for (const r of this._results) {
            lines.push(
                `| ${r.name} | ${r.iterations} | ${r.avg.toFixed(2)} | ${r.min.toFixed(2)} | ${r.max.toFixed(2)} | ${r.p95.toFixed(2)} | ${r.p99.toFixed(2)} | ${r.total.toFixed(2)} |`,
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
