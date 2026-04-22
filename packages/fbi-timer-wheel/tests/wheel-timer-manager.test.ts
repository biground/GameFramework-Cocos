import { WheelTimerManager } from '../src/WheelTimerManager';
import { TIMER_REPEAT_FOREVER } from '@framework/timer/TimerDefs';

/**
 * 时间轮定时器测试
 *
 * 注意：时间轮有 tickInterval 精度限制。
 * 测试中使用 tickInterval=0.1, wheelSize=10 以方便验证。
 * 最大单圈范围 = 0.1 × 10 = 1.0s
 */
describe('WheelTimerManager', () => {
    let timerMgr: WheelTimerManager;

    beforeEach(() => {
        // 小轮：0.1s 粒度, 10 格, 最大范围 1s
        timerMgr = new WheelTimerManager({ tickInterval: 0.1, wheelSize: 10 });
        timerMgr.onInit();
    });

    afterEach(() => {
        timerMgr.onShutdown();
    });

    // ─── 构造 ──────────────────────────────────────────

    describe('构造参数', () => {
        test('tickInterval <= 0 抛出错误', () => {
            expect(() => new WheelTimerManager({ tickInterval: 0 })).toThrow();
            expect(() => new WheelTimerManager({ tickInterval: -1 })).toThrow();
        });

        test('wheelSize <= 0 抛出错误', () => {
            expect(() => new WheelTimerManager({ wheelSize: 0 })).toThrow();
            expect(() => new WheelTimerManager({ wheelSize: -1 })).toThrow();
        });

        test('默认参数不会抛出', () => {
            expect(() => new WheelTimerManager()).not.toThrow();
        });
    });

    // ─── 基础创建 & 触发 ──────────────────────────────

    describe('基础创建 & 触发', () => {
        test('一次性定时器在到达 delay 附近触发', () => {
            const cb = jest.fn();
            timerMgr.addTimer(0.5, cb);

            // 推进 0.4s (4 个 tick)
            timerMgr.onUpdate(0.4);
            expect(cb).not.toHaveBeenCalled();

            // 推进 0.1s (第 5 个 tick) → 触发
            timerMgr.onUpdate(0.1);
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('一次性定时器触发后自动移除', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(0.3, cb);

            timerMgr.onUpdate(0.3);
            expect(timerMgr.hasTimer(id)).toBe(false);
            expect(timerMgr.activeCount).toBe(0);
        });

        test('addTimer 返回递增的唯一 ID', () => {
            const id1 = timerMgr.addTimer(0.1, () => {});
            const id2 = timerMgr.addTimer(0.1, () => {});
            const id3 = timerMgr.addTimer(0.1, () => {});
            expect(id2).toBe(id1 + 1);
            expect(id3).toBe(id2 + 1);
        });

        test('delay <= 0 抛出错误', () => {
            expect(() => timerMgr.addTimer(0, () => {})).toThrow();
            expect(() => timerMgr.addTimer(-1, () => {})).toThrow();
        });

        test('callback 为空抛出错误', () => {
            expect(() => timerMgr.addTimer(0.1, null as unknown as () => void)).toThrow();
        });
    });

    // ─── 重复定时器 ──────────────────────────────────

    describe('重复定时器', () => {
        test('repeat=N 触发 N+1 次后自动移除', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(0.2, cb, { repeat: 2 });

            // 每 0.2s 触发一次: 3 次后移除
            for (let i = 0; i < 3; i++) {
                timerMgr.onUpdate(0.2);
            }
            expect(cb).toHaveBeenCalledTimes(3);

            timerMgr.onUpdate(0.2);
            expect(cb).toHaveBeenCalledTimes(3);
            expect(timerMgr.hasTimer(id)).toBe(false);
        });

        test('repeat=-1 无限重复', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(0.1, cb, { repeat: TIMER_REPEAT_FOREVER });

            for (let i = 0; i < 50; i++) {
                timerMgr.onUpdate(0.1);
            }
            expect(cb).toHaveBeenCalledTimes(50);
            expect(timerMgr.hasTimer(id)).toBe(true);
        });
    });

    // ─── initialDelay ──────────────────────────────────

    describe('initialDelay', () => {
        test('initialDelay 不同于 delay', () => {
            const cb = jest.fn();
            // 首次 0.3s 后触发，后续 0.1s 间隔
            timerMgr.addTimer(0.1, cb, { repeat: 1, initialDelay: 0.3 });

            timerMgr.onUpdate(0.2);
            expect(cb).not.toHaveBeenCalled();

            timerMgr.onUpdate(0.1); // 0.3s → 首次触发
            expect(cb).toHaveBeenCalledTimes(1);

            timerMgr.onUpdate(0.1); // 0.4s → 0.1s 后第二次触发
            expect(cb).toHaveBeenCalledTimes(2);
        });

        test('initialDelay < 0 抛出错误', () => {
            expect(() => timerMgr.addTimer(0.1, () => {}, { initialDelay: -1 })).toThrow();
        });
    });

    // ─── 超范围 delay（多圈） ────────────────────────

    describe('超范围 delay（多圈）', () => {
        test('delay 超过一圈范围仍能正确触发', () => {
            const cb = jest.fn();
            // 最大一圈 = 10 × 0.1 = 1.0s，delay = 1.5s 需要 1 圈 + 5 格
            timerMgr.addTimer(1.5, cb);

            // 推进 1.0s（完成第一圈）
            timerMgr.onUpdate(1.0);
            expect(cb).not.toHaveBeenCalled();

            // 推进 0.5s（第二圈的 5 格）
            timerMgr.onUpdate(0.5);
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('delay 正好等于一圈范围', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb);

            timerMgr.onUpdate(0.9);
            expect(cb).not.toHaveBeenCalled();

            timerMgr.onUpdate(0.1);
            expect(cb).toHaveBeenCalledTimes(1);
        });
    });

    // ─── 移除 ──────────────────────────────────────────

    describe('移除', () => {
        test('removeTimer 正确移除', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(0.3, cb);

            expect(timerMgr.removeTimer(id)).toBe(true);
            expect(timerMgr.hasTimer(id)).toBe(false);

            timerMgr.onUpdate(0.5);
            expect(cb).not.toHaveBeenCalled();
        });

        test('removeTimer 不存在的 ID 返回 false', () => {
            expect(timerMgr.removeTimer(999)).toBe(false);
        });

        test('removeAllTimers 清除所有', () => {
            timerMgr.addTimer(0.1, () => {});
            timerMgr.addTimer(0.2, () => {});
            timerMgr.addTimer(0.3, () => {});

            timerMgr.removeAllTimers();
            expect(timerMgr.activeCount).toBe(0);
        });

        test('removeTimersByTag 按标签批量移除', () => {
            timerMgr.addTimer(0.1, () => {}, { tag: 'combat' });
            timerMgr.addTimer(0.1, () => {}, { tag: 'combat' });
            timerMgr.addTimer(0.1, () => {}, { tag: 'ui' });

            const removed = timerMgr.removeTimersByTag('combat');
            expect(removed).toBe(2);
            expect(timerMgr.activeCount).toBe(1);
        });
    });

    // ─── 遍历安全 ──────────────────────────────────────

    describe('遍历安全', () => {
        test('回调中 removeTimer 自己不崩', () => {
            let timerId = 0;
            const cb = jest.fn(() => {
                timerMgr.removeTimer(timerId);
            });
            timerId = timerMgr.addTimer(0.1, cb);

            expect(() => timerMgr.onUpdate(0.1)).not.toThrow();
            expect(cb).toHaveBeenCalledTimes(1);
            expect(timerMgr.hasTimer(timerId)).toBe(false);
        });

        test('回调中 removeAllTimers 不崩', () => {
            const results: number[] = [];

            timerMgr.addTimer(0.1, () => {
                results.push(1);
                timerMgr.removeAllTimers();
            });

            timerMgr.addTimer(0.1, () => {
                results.push(2);
            });

            expect(() => timerMgr.onUpdate(0.1)).not.toThrow();
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(timerMgr.activeCount).toBe(0);
        });
    });

    // ─── 暂停 & 恢复 ──────────────────────────────────

    describe('暂停 & 恢复', () => {
        test('pauseTimer 暂停后不触发', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(0.3, cb);

            timerMgr.pauseTimer(id);
            timerMgr.onUpdate(0.5);
            expect(cb).not.toHaveBeenCalled();
        });

        test('resumeTimer 恢复后继续计时', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(0.5, cb);

            timerMgr.onUpdate(0.3); // 距到期还剩 0.2s
            timerMgr.pauseTimer(id);
            timerMgr.onUpdate(10.0); // 暂停中，不触发
            expect(cb).not.toHaveBeenCalled();

            timerMgr.resumeTimer(id);
            timerMgr.onUpdate(0.2); // 恢复后 0.2s 到期
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('pauseAllTimers / resumeAllTimers', () => {
            const cb1 = jest.fn();
            const cb2 = jest.fn();
            timerMgr.addTimer(0.3, cb1);
            timerMgr.addTimer(0.3, cb2);

            timerMgr.pauseAllTimers();
            timerMgr.onUpdate(0.5);
            expect(cb1).not.toHaveBeenCalled();
            expect(cb2).not.toHaveBeenCalled();

            timerMgr.resumeAllTimers();
            timerMgr.onUpdate(0.3);
            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);
        });

        test('pauseTimersByTag / resumeTimersByTag', () => {
            const cbCombat = jest.fn();
            const cbUi = jest.fn();

            timerMgr.addTimer(0.2, cbCombat, { tag: 'combat' });
            timerMgr.addTimer(0.2, cbUi, { tag: 'ui' });

            const paused = timerMgr.pauseTimersByTag('combat');
            expect(paused).toBe(1);

            timerMgr.onUpdate(0.2);
            expect(cbCombat).not.toHaveBeenCalled();
            expect(cbUi).toHaveBeenCalledTimes(1);

            const resumed = timerMgr.resumeTimersByTag('combat');
            expect(resumed).toBe(1);

            timerMgr.onUpdate(0.2);
            expect(cbCombat).toHaveBeenCalledTimes(1);
        });

        test('pauseTimer 已暂停的返回 false', () => {
            const id = timerMgr.addTimer(0.1, () => {});
            timerMgr.pauseTimer(id);
            expect(timerMgr.pauseTimer(id)).toBe(false);
        });

        test('resumeTimer 未暂停的返回 false', () => {
            const id = timerMgr.addTimer(0.1, () => {});
            expect(timerMgr.resumeTimer(id)).toBe(false);
        });

        test('removeTimer 暂停中的定时器', () => {
            const id = timerMgr.addTimer(0.3, () => {});
            timerMgr.pauseTimer(id);
            expect(timerMgr.removeTimer(id)).toBe(true);
            expect(timerMgr.hasTimer(id)).toBe(false);
        });
    });

    // ─── 时间缩放 ──────────────────────────────────────

    describe('时间缩放', () => {
        test('timeScale=2.0 加速计时', () => {
            const cb = jest.fn();
            timerMgr.addTimer(0.4, cb);
            timerMgr.timeScale = 2.0;

            timerMgr.onUpdate(0.2); // 缩放后 = 0.4s
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('timeScale=0 冻结时间', () => {
            const cb = jest.fn();
            timerMgr.addTimer(0.1, cb);
            timerMgr.timeScale = 0;

            timerMgr.onUpdate(100.0);
            expect(cb).not.toHaveBeenCalled();
        });

        test('timeScale 负数被拒绝', () => {
            timerMgr.timeScale = -1;
            expect(timerMgr.timeScale).toBe(1.0);
        });
    });

    // ─── 查询 ──────────────────────────────────────────

    describe('查询', () => {
        test('getTimerInfo 返回正确信息', () => {
            const id = timerMgr.addTimer(0.5, () => {}, {
                repeat: 3,
                tag: 'test',
            });

            const info = timerMgr.getTimerInfo(id);
            expect(info).not.toBeNull();
            expect(info!.id).toBe(id);
            expect(info!.delay).toBe(0.5);
            expect(info!.repeat).toBe(3);
            expect(info!.paused).toBe(false);
            expect(info!.tag).toBe('test');
        });

        test('getTimerInfo 不存在时返回 null', () => {
            expect(timerMgr.getTimerInfo(999)).toBeNull();
        });

        test('hasTimer 正确判断', () => {
            const id = timerMgr.addTimer(0.1, () => {});
            expect(timerMgr.hasTimer(id)).toBe(true);
            expect(timerMgr.hasTimer(999)).toBe(false);

            timerMgr.removeTimer(id);
            expect(timerMgr.hasTimer(id)).toBe(false);
        });

        test('activeCount 正确统计', () => {
            timerMgr.addTimer(0.1, () => {});
            timerMgr.addTimer(0.2, () => {});
            expect(timerMgr.activeCount).toBe(2);
        });
    });

    // ─── 生命周期 ──────────────────────────────────────

    describe('生命周期', () => {
        test('onShutdown 清理所有状态', () => {
            timerMgr.addTimer(0.1, () => {});
            timerMgr.addTimer(0.2, () => {});
            timerMgr.timeScale = 2.0;

            timerMgr.onShutdown();

            expect(timerMgr.activeCount).toBe(0);
            expect(timerMgr.timeScale).toBe(1.0);
        });

        test('空 timer 列表调用 onUpdate 不报错', () => {
            expect(() => timerMgr.onUpdate(0.1)).not.toThrow();
        });
    });

    // ─── 时间轮特有验证 ──────────────────────────────

    describe('时间轮特有验证', () => {
        test('大量定时器同一帧触发', () => {
            const results: number[] = [];

            for (let i = 0; i < 100; i++) {
                const val = i;
                timerMgr.addTimer(0.2, () => results.push(val));
            }

            timerMgr.onUpdate(0.2);
            expect(results.length).toBe(100);
        });

        test('单帧 deltaTime 大于多个 tick 时批量前进', () => {
            const cb = jest.fn();
            timerMgr.addTimer(0.3, cb);

            // 单帧 0.5s = 5 个 tick，第 3 个 tick 时应触发
            timerMgr.onUpdate(0.5);
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('tickInterval 精度限制——不会在 delay 到期前触发', () => {
            const cb = jest.fn();
            // delay = 0.15s, tickInterval = 0.1s → ceil(0.15/0.1) = 2 个 tick = 0.2s
            timerMgr.addTimer(0.15, cb);

            timerMgr.onUpdate(0.1); // 1 tick
            expect(cb).not.toHaveBeenCalled();

            timerMgr.onUpdate(0.1); // 2 ticks → 触发
            expect(cb).toHaveBeenCalledTimes(1);
        });
    });
});
