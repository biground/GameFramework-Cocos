import { TimerManager } from '@framework/timer/TimerManager';
import { TIMER_REPEAT_FOREVER } from '@framework/timer/TimerDefs';

describe('TimerManager', () => {
    let timerMgr: TimerManager;

    beforeEach(() => {
        timerMgr = new TimerManager();
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

        test('时间溢出量保留到下一次触发', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb, { repeat: 1 });

            // 一次性推进 2.5 秒：应触发 1 次（1.0s），然后 elapsed 剩余 1.5s
            timerMgr.onUpdate(2.5);
            expect(cb).toHaveBeenCalledTimes(1);

            // 再推进 0，不触发（elapsed 是 1.5，已 >= delay，应在下一帧触发）
            // 实际上溢出 2.5-1.0=1.5 已经 >= 1.0，所以这帧再 update 一次就能触发
            timerMgr.onUpdate(0);
            expect(cb).toHaveBeenCalledTimes(2);
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

            // 触发 3 次：初始 1 次 + 重复 2 次
            timerMgr.onUpdate(1.0); // 第 1 次
            timerMgr.onUpdate(1.0); // 第 2 次
            timerMgr.onUpdate(1.0); // 第 3 次
            expect(cb).toHaveBeenCalledTimes(3);

            timerMgr.onUpdate(1.0); // 已移除，不再触发
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

            // elapsed=0 已经 >= currentDelay(0)，立即触发
            timerMgr.onUpdate(0);
            expect(cb).toHaveBeenCalledTimes(1);

            // 后续按 delay=1.0 间隔触发
            timerMgr.onUpdate(0.5);
            expect(cb).toHaveBeenCalledTimes(1);

            timerMgr.onUpdate(0.5);
            expect(cb).toHaveBeenCalledTimes(2);
        });

        test('initialDelay 不同于 delay', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb, { repeat: 1, initialDelay: 2.0 });

            timerMgr.onUpdate(1.0);
            expect(cb).not.toHaveBeenCalled(); // initialDelay=2.0，还没到

            timerMgr.onUpdate(1.0);
            expect(cb).toHaveBeenCalledTimes(1); // 2.0s 首次触发

            timerMgr.onUpdate(1.0);
            expect(cb).toHaveBeenCalledTimes(2); // 后续按 delay=1.0 触发
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
        test('回调中 removeTimer 不破坏遍历', () => {
            const results: number[] = [];

            timerMgr.addTimer(1, () => {
                results.push(1);
                timerMgr.removeTimer(id2);
            });

            const id2 = timerMgr.addTimer(1, () => {
                results.push(2);
            });

            timerMgr.addTimer(1, () => {
                results.push(3);
            });

            timerMgr.onUpdate(1.0);
            // timer1 触发，删除 timer2
            // timer2 已标记删除，被跳过
            // timer3 正常触发
            expect(results).toEqual([1, 3]);
        });

        test('回调中 removeAllTimers 不破坏遍历', () => {
            const results: number[] = [];

            timerMgr.addTimer(1, () => {
                results.push(1);
                timerMgr.removeAllTimers();
            });

            timerMgr.addTimer(1, () => {
                results.push(2);
            });

            timerMgr.onUpdate(1.0);
            // timer1 触发，removeAll 标记全部删除
            // timer2 已标记删除，被跳过
            expect(results).toEqual([1]);
            expect(timerMgr.activeCount).toBe(0);
        });

        test('回调中添加新定时器不影响当前帧', () => {
            const cb = jest.fn();

            timerMgr.addTimer(1, () => {
                // 回调中添加新定时器
                timerMgr.addTimer(1, cb);
            });

            timerMgr.onUpdate(1.0);
            // 新加的定时器在本帧不触发（它的 elapsed 还是 0）
            expect(cb).not.toHaveBeenCalled();

            timerMgr.onUpdate(1.0);
            expect(cb).toHaveBeenCalledTimes(1);
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

            timerMgr.onUpdate(0.5); // elapsed = 0.5
            timerMgr.pauseTimer(id);
            timerMgr.onUpdate(10.0); // 暂停中，elapsed 不变
            timerMgr.resumeTimer(id);
            timerMgr.onUpdate(0.5); // elapsed = 1.0，触发
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

        test('pauseTimer 已经暂停的返回 false', () => {
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

            timerMgr.onUpdate(0.5); // 实际 dt = 0.5 * 2.0 = 1.0
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('timeScale=0.5 慢动作', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb);
            timerMgr.timeScale = 0.5;

            timerMgr.onUpdate(1.0); // 实际 dt = 1.0 * 0.5 = 0.5
            expect(cb).not.toHaveBeenCalled();

            timerMgr.onUpdate(1.0); // 实际 dt = 0.5，总 elapsed = 1.0
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('timeScale=0 冻结时间', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb);
            timerMgr.timeScale = 0;

            timerMgr.onUpdate(100.0);
            expect(cb).not.toHaveBeenCalled();
        });

        test('useTimeScale=false 忽略时间缩放', () => {
            const cb = jest.fn();
            timerMgr.addTimer(1.0, cb, { useTimeScale: false });
            timerMgr.timeScale = 0; // 冻结全局时间

            timerMgr.onUpdate(1.0); // 不受 timeScale 影响
            expect(cb).toHaveBeenCalledTimes(1);
        });

        test('timeScale 负数被拒绝', () => {
            timerMgr.timeScale = -1;
            expect(timerMgr.timeScale).toBe(1.0); // 保持默认值
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
            expect(info!.elapsed).toBeCloseTo(0.5);
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

            timerMgr.addTimer(3, () => {});
            expect(timerMgr.activeCount).toBe(3);
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
});
