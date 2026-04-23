import { IDebugDataSource, DebugSectionData, DebugEntry } from '../DebugDefs';
import { GameModule } from '../../core/GameModule';
import { EventManager } from '../../event/EventManager';
import { Logger } from '../Logger';

/**
 * 事件调试数据源
 * 采集 EventManager 的事件绑定统计信息
 */
export class EventDataSource implements IDebugDataSource {
    private static readonly TAG = 'EventDataSource';

    /** 数据源名称 */
    public readonly name: string = 'Events';

    /**
     * 采集事件绑定统计数据
     * @returns 调试分区数据
     */
    public collect(): DebugSectionData {
        if (!GameModule.hasModule('EventManager')) {
            return { title: this.name, entries: [] };
        }

        const eventMgr = GameModule.getModule<EventManager>('EventManager');
        const stats = eventMgr.getDebugInfo();
        if (stats.length === 0) {
            return { title: this.name, entries: [] };
        }

        const totalListeners = stats.reduce((sum, s) => sum + s.listenerCount, 0);
        const entries: DebugEntry[] = [
            { label: '事件类型数', value: String(stats.length) },
            { label: '总监听器数', value: String(totalListeners) },
        ];
        for (const s of stats) {
            entries.push({ label: s.event, value: `listeners=${s.listenerCount}` });
        }

        Logger.debug(
            EventDataSource.TAG,
            `采集完成, 事件类型=${stats.length}, 总监听器=${totalListeners}`,
        );
        return { title: this.name, entries };
    }
}
