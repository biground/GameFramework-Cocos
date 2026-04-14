/**
 * 基准测试入口
 *
 * 使用方式：npx ts-node tools/benchmark/run-benchmarks.ts
 */

import { BenchmarkRunner, consumeSink } from './BenchmarkRunner';
import { EventKey } from '../../assets/scripts/framework/event/EventDefs';
import { EventManager } from '../../assets/scripts/framework/event/EventManager';
import { IPoolable } from '../../assets/scripts/framework/objectpool/PoolDefs';
import { ObjectPool } from '../../assets/scripts/framework/objectpool/ObjectPool';
import { FsmState } from '../../assets/scripts/framework/fsm/FsmState';
import { Fsm } from '../../assets/scripts/framework/fsm/Fsm';
import { IFsm } from '../../assets/scripts/framework/fsm/FsmDefs';
import { GameModule } from '../../assets/scripts/framework/core/GameModule';

// ─── 测试辅助类 ──────────────────────────────

/** 用于 ObjectPool 基准测试的简单可池化对象 */
class BenchPoolable implements IPoolable {
    public value = 0;
    onSpawn(): void {
        this.value = 1;
    }
    onRecycle(): void {
        this.value = 0;
    }
}

/** 用于 FSM 基准测试的简单状态 */
class StateA extends FsmState<object> {
    onInit(_fsm: IFsm<object>): void {
        /* noop */
    }
    onEnter(_fsm: IFsm<object>): void {
        /* noop */
    }
    onUpdate(_fsm: IFsm<object>, _dt: number): void {
        /* noop */
    }
    onLeave(_fsm: IFsm<object>): void {
        /* noop */
    }
    onDestroy(_fsm: IFsm<object>): void {
        /* noop */
    }
}

class StateB extends FsmState<object> {
    onInit(_fsm: IFsm<object>): void {
        /* noop */
    }
    onEnter(_fsm: IFsm<object>): void {
        /* noop */
    }
    onUpdate(_fsm: IFsm<object>, _dt: number): void {
        /* noop */
    }
    onLeave(_fsm: IFsm<object>): void {
        /* noop */
    }
    onDestroy(_fsm: IFsm<object>): void {
        /* noop */
    }
}

// ─── 基准测试定义 ──────────────────────────────

function main(): void {
    const runner = new BenchmarkRunner({
        warmupRounds: 200,
        iterations: 1000,
    });

    // ─── Benchmark 1：EventManager emit × 10000 ───
    {
        const eventMgr = new EventManager();
        GameModule.register(eventMgr);
        const testKey = new EventKey<number>('bench_event');

        // 注册 10 个监听器（模拟真实场景）
        for (let i = 0; i < 10; i++) {
            eventMgr.on(testKey, (_val: number) => {
                /* noop */
            });
        }

        runner.add('EventManager.emit × 10000', () => {
            let sink = 0;
            for (let i = 0; i < 10000; i++) {
                eventMgr.emit(testKey, i);
                sink += i;
            }
            consumeSink(sink);
        });
    }

    // ─── Benchmark 2：ObjectPool acquire/release × 10000 ───
    {
        const pool = new ObjectPool(BenchPoolable, 10240);

        runner.add('ObjectPool acquire/release × 10000', () => {
            // 先批量 acquire 10000 个对象
            const objs: BenchPoolable[] = [];
            for (let i = 0; i < 10000; i++) {
                objs.push(pool.acquire());
            }
            // 再批量 release（此时 freeList 逐步增长，release 的查重才有意义）
            let sink = 0;
            for (let i = 0; i < 10000; i++) {
                sink += objs[i].value;
                pool.release(objs[i]);
            }
            consumeSink(sink);
        });
    }

    // ─── Benchmark 3：FSM changeState × 1000 ───
    {
        const owner = {};
        const stateA = new StateA();
        const stateB = new StateB();
        const fsm = new Fsm('bench_fsm', owner, [stateA, stateB]);
        fsm.start(StateA);

        runner.add('Fsm.changeState × 1000', () => {
            let sink = 0;
            for (let i = 0; i < 1000; i++) {
                if (i % 2 === 0) {
                    fsm.changeState(StateB);
                } else {
                    fsm.changeState(StateA);
                }
                sink += i;
            }
            consumeSink(sink);
        });
    }

    // ─── 运行并输出报告 ───
    console.log('开始运行基准测试...\n');
    runner.runAll();
    console.log(runner.reportMarkdown());

    // 清理
    GameModule.shutdownAll();
}

main();
