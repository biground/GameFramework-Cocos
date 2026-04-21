/**
 * Idle Clicker Demo 入口
 * @module
 */

import { IdleClickerDemo } from './IdleClickerDemo';

const demo = new IdleClickerDemo();
demo.start().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[IdleClickerDemo] 启动失败: ${message}`);
});
