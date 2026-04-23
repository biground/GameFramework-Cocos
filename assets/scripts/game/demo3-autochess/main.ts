/**
 * Auto-chess Lite Demo 浏览器入口
 * @module
 */

import { AutoChessDemo } from './AutoChessDemo';

const demo = new AutoChessDemo();
try {
    demo.start();
} catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[AutoChessDemo] 启动失败: ${message}`);
}
