import { IDebugDataSource, DebugSectionData } from '../DebugDefs';

/**
 * 事件调试数据源
 * 采集 EventManager 的事件绑定统计信息
 */
export class EventDataSource implements IDebugDataSource {
    /** 数据源名称 */
    public readonly name: string = 'Events';

    /**
     * 采集事件绑定统计数据
     * @returns 调试分区数据
     */
    public collect(): DebugSectionData {
        // TODO: 学员实现 - 从 EventManager 采集事件绑定信息
        return {
            title: 'Events',
            entries: [],
        };
    }
}
