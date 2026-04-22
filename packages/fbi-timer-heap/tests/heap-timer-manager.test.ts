import { HeapTimerManager } from '../src/HeapTimerManager';
import { TIMER_REPEAT_FOREVER } from '@framework/timer/TimerDefs';

describe('HeapTimerManager', () => {
    let timerMgr: HeapTimerManager;

    beforeEach(() => {
        timerMgr = new HeapTimerManager();
        timerMgr.onInit();
    });

    afterEach(() => {
        timerMgr.onShutdown();
    });

    // ─── 基础创建 & 触发 ──────────────────────────────

    describe('基础创建 & 触发', () => {
        test('一次性定时器在到达 delay 后触发', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb);

            timerMgr.onUpdate(0.5);
            expect(cb).not.toHaveBeenCalled();

            timerMgr.onUpdate(0.5);
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('一次性定时器触发后自动移除', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(1.0, cb);

            timerMgr.onUpdate(1.0);
            expect(cb).toHaveBeenCalledTimes(1);
            expect(timerMgr.hasTimer(id)).toBe(false);
            expect(timerMgr.activeCount).toBe(0);
        });

        test('addTimer 返回递增的唯一 ID', () => {
            const id1 = timerMgr.addTimer(1, () => {});
            const id2 = timerMgr.addTimer(1, () => {});
            const id3 = timerMgr.addTimer(1, () => {});
            expect(id2).toBe(id1 + 1);
            expect(id3).toBe(id2 + 1);
        });

        test('delay <= 0 抛出错误', () => {
            expect(() => timerMgr.addTimer(0, () => {})).toThrow();
            expect(() => timerMgr.addTimer(-1, () => {})).toThrow();
        });

        test('callback 为空抛出错误', () => {
            expect(() => timerMgr.addTimer(1, null as unknown as () => void)).toThrow();
        });
    });

    // ─── 重复定时器 ──────────────────────────────────

    describe('重复定时器', () => {
        test('repeat=N 触发 N+1 次后自动移除', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(1.0, cb, { repeat: 2 });

            timerMgr.onUpdate(1.0); // 第 1 次
            timerMgr.onUpdate(1.0); // 第 2 次
            timerMgr.onUpdate(1.0); // 第 3 次
            expect(cb).toHaveBeenCalledTimes(3);

            timerMgr.onUpdate(1.0); // 已移除
            expect(cb).toHaveBeenCalledTimes(3);
            expect(timerMgr.hasTimer(id)).toBe(false);
        });

        test('repeat=-1 无限重复', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(0.5, cb, { repeat: TIMER_REPEAT_FOREVER });

            for (let i = 0; i < 100; i++) {
                timerMgr.onUpdate(0.5);
            }
            expect(cb).toHaveBeenCalledTimes(100);
            expect(timerMgr.hasTimer(id)).toBe(true);
        });
    });

    // ─── initialDelay ───────────────────────────────

    describe('initialDelay', () => {
        test('initialDelay=0 立即触发首次', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb, { repeat: TIMER_REPEAT_FOREVER, initialDelay: 0 });

            timerMgr.onUpdate(0); // expireTime = currentTime，立即触发
            expect(cb).toHaveBeenCalledTimes(1);

            timerMgr.onUpdate(0.5);
            expect(cb).toHaveBeenCalledTimes(1);

            timerMgr.onUpdate(0.5);
            expect(cb).toHaveBeenCalledTimes(2);
        });

        test('initialDelay 不同于 delay', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb, { repeat: 1, initialDelay: 2.0 });

            timerMgr.onUpdate(1.0);
            expect(cb).not.toHaveBeenCalled();

            timerMgr.onUpdate(1.0);
            expect(cb).toHaveBeenCalledTimes(1); // 2.0s 首次触发

            timerMgr.onUpdate(1.0);
            expect(cb).toHaveBeenCalledTimes(2); // 后续按 delay=1.0
        });

        test('initialDelay < 0 抛出错误', () => {
            expect(() => timerMgr.addTimer(1, () => {}, { initialDelay: -1 })).toThrow();
        });
    });

    // ─── 移除 ──────────────────────────────────────────

    describe('移除', () => {
        test('removeTimer 正确移除', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(1.0, cb);

            expect(timerMgr.removeTimer(id)).toBe(true);
            expect(timerMgr.hasTimer(id)).toBe(false);

            timerMgr.onUpdate(2.0);
            expect(cb).not.toHaveBeenCalled();
        });

        test('removeTimer 不存在的 ID 返回 false', () => {
            expect(timerMgr.removeTimer(999)).toBe(false);
        });

        test('removeAllTimers 清除所有', () => {
            timerMgr.addTimer(1, () => {});
            timerMgr.addTimer(2, () => {});
            timerMgr.addTimer(3, () => {});

            timerMgr.removeAllTimers();
            expect(timerMgr.activeCount).toBe(0);
        });

        test('removeTimersByTag 按标签批量移除', () => {
            timerMgr.addTimer(1, () => {}, { tag: 'combat' });
            timerMgr.addTimer(1, () => {}, { tag: 'combat' });
            timerMgr.addTimer(1, () => {}, { tag: 'ui' });

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
            timerId = timerMgr.addTimer(1, cb);

            expect(() => timerMgr.onUpdate(1.0)).not.toThrow();
            expect(cb).toHaveBeenCalledTimes(1);
            expect(timerMgr.hasTimer(timerId)).toBe(false);
        });

        test('回调中 removeAllTimers 不崩', () => {
            const results: number[] = [];

            timerMgr.addTimer(1, () => {
                results.push(1);
                timerMgr.removeAllTimers();
            });

            timerMgr.addTimer(1, () => {
                results.push(2);
            });

            timerMgr.onUpdate(1.0);
            // timer1 在回调中清空了所有，但 timer2 也已在同一帧弹出
            // 堆实现中两个 timer 同时到期，while 循环中 pop 出来的顺序取决于堆
            // removeAllTimers 后 activeMap 为空，所以后续 pop 出来的在 has 检查时被跳过
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(timerMgr.activeCount).toBe(0);
        });
    });

    // ─── 暂停 & 恢复 ──────────────────────────────────

    describe('暂停 & 恢复', () => {
        test('pauseTimer 暂停后不触发', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(1, cb);

            timerMgr.pauseTimer(id);
            timerMgr.onUpdate(2.0);
            expect(cb).not.toHaveBeenCalled();
        });

        test('resumeTimer 恢复后继续计时', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(1, cb);

            timerMgr.onUpdate(0.5); // 距到期还剩 0.5s
            timerMgr.pauseTimer(id);
            timerMgr.onUpdate(10.0); // 暂停中，不触发
            timerMgr.resumeTimer(id);
            timerMgr.onUpdate(0.5); // 恢复后 0.5s 到期
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('pauseAllTimers / resumeAllTimers', () => {
            const cb1 = jest.fn();
            const cb2 = jest.fn();
            timerMgr.addTimer(1, cb1);
            timerMgr.addTimer(1, cb2);

            timerMgr.pauseAllTimers();
            timerMgr.onUpdate(2.0);
            expect(cb1).not.toHaveBeenCalled();
            expect(cb2).not.toHaveBeenCalled();

            timerMgr.resumeAllTimers();
            timerMgr.onUpdate(1.0);
            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);
        });

        test('pauseTimersByTag / resumeTimersByTag', () => {
            const cbCombat1 = jest.fn();
            const cbCombat2 = jest.fn();
            const cbUi = jest.fn();

            timerMgr.addTimer(1, cbCombat1, { tag: 'combat' });
            timerMgr.addTimer(1, cbCombat2, { tag: 'combat' });
            timerMgr.addTimer(1, cbUi, { tag: 'ui' });

            const paused = timerMgr.pauseTimersByTag('combat');
            expect(paused).toBe(2);

            timerMgr.onUpdate(1.0);
            expect(cbCombat1).not.toHaveBeenCalled();
            expect(cbCombat2).not.toHaveBeenCalled();
            expect(cbUi).toHaveBeenCalledTimes(1);

            const resumed = timerMgr.resumeTimersByTag('combat');
            expect(resumed).toBe(2);

            timerMgr.onUpdate(1.0);
            expect(cbCombat1).toHaveBeenCalledTimes(1);
            expect(cbCombat2).toHaveBeenCalledTimes(1);
        });

        test('pauseTimer 已暂停的返回 false', () => {
            const id = timerMgr.addTimer(1, () => {});
            timerMgr.pauseTimer(id);
            expect(timerMgr.pauseTimer(id)).toBe(false);
        });

        test('resumeTimer 未暂停的返回 false', () => {
            const id = timerMgr.addTimer(1, () => {});
            expect(timerMgr.resumeTimer(id)).toBe(false);
        });
    });

    // ─── 时间缩放 ──────────────────────────────────────

    describe('时间缩放', () => {
        test('timeScale=2.0 加速计时', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb);
            timerMgr.timeScale = 2.0;

            timerMgr.onUpdate(0.5); // 缩放后 = 1.0s
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('timeScale=0.5 慢动作', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb);
            timerMgr.timeScale = 0.5;

            timerMgr.onUpdate(1.0); // 缩放后 = 0.5s
            expect(cb).not.toHaveBeenCalled();

            timerMgr.onUpdate(1.0); // 总缩放 = 1.0s
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('timeScale=0 冻结时间', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb);
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
            const id = timerMgr.addTimer(2.0, () => {}, {
                repeat: 3,
                tag: 'test',
            });

            timerMgr.onUpdate(0.5);

            const info = timerMgr.getTimerInfo(id);
            expect(info).not.toBeNull();
            expect(info!.id).toBe(id);
            expect(info!.delay).toBe(2.0);
            expect(info!.repeat).toBe(3);
            expect(info!.paused).toBe(false);
            expect(info!.tag).toBe('test');
        });

        test('getTimerInfo 不存在时返回 null', () => {
            expect(timerMgr.getTimerInfo(999)).toBeNull();
        });

        test('hasTimer 正确判断', () => {
            const id = timerMgr.addTimer(1, () => {});
            expect(timerMgr.hasTimer(id)).toBe(true);
            expect(timerMgr.hasTimer(999)).toBe(false);

            timerMgr.removeTimer(id);
            expect(timerMgr.hasTimer(id)).toBe(false);
        });

        test('activeCount 正确统计', () => {
            timerMgr.addTimer(1, () => {});
            timerMgr.addTimer(2, () => {});
            expect(timerMgr.activeCount).toBe(2);
        });
    });

    // ─── 生命周期 ──────────────────────────────────────

    describe('生命周期', () => {
        test('onShutdown 清理所有状态', () => {
            timerMgr.addTimer(1, () => {});
            timerMgr.addTimer(2, () => {});
            timerMgr.timeScale = 2.0;

            timerMgr.onShutdown();

            expect(timerMgr.activeCount).toBe(0);
            expect(timerMgr.timeScale).toBe(1.0);
        });

        test('空 timer 列表调用 onUpdate 不报错', () => {
            expect(() => timerMgr.onUpdate(1.0)).not.toThrow();
        });
    });

    // ─── 堆特有优势验证 ──────────────────────────────

    describe('堆特有优势', () => {
        test('多定时器按到期时间顺序触发', () => {
            const order: number[] = [];

            timerMgr.addTimer(3.0, () => order.push(3));
            timerMgr.addTimer(1.0, () => order.push(1));
            timerMgr.addTimer(2.0, () => order.push(2));

            timerMgr.onUpdate(3.0);
            // 堆实现应按到期顺序触发：1 → 2 → 3
            expect(order).toEqual([1, 2, 3]);
        });

        test('暂停中的 timer 从堆转移到 pausedMap，resume 后恢复精确计时', () => {
            const cb = jest.fn();
            const id = timerMgr.addTimer(5, cb);

            timerMgr.onUpdate(3.0); // 运行 3s，距到期还剩 2s
            timerMgr.pauseTimer(id);

            // 暂停期间推进大量时间
            timerMgr.onUpdate(100.0);
            expect(cb).not.toHaveBeenCalled();

            // 恢复后应该 2s 内触发
            timerMgr.resumeTimer(id);
            timerMgr.onUpdate(1.9);
            expect(cb).not.toHaveBeenCalled();

            timerMgr.onUpdate(0.1);
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('removeTimer 暂停中的定时器', () => {
            const id = timerMgr.addTimer(1, () => {});
            timerMgr.pauseTimer(id);
            expect(timerMgr.removeTimer(id)).toBe(true);
            expect(timerMgr.hasTimer(id)).toBe(false);
        });
    });
});
