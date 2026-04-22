/**
 * Turn-based RPG Demo 浏览器入口
 * @module
 */

import { TurnBasedRpgDemo } from './TurnBasedRpgDemo';

const demo = new TurnBasedRpgDemo();
try {
    demo.start();
} catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[TurnBasedRpgDemo] 启动失败: ${message}`);
}
