import { IDebugDataSource, DebugSectionData } from '../DebugDefs';

/**
 * 模块调试数据源
 * 采集 GameModule 已注册模块的信息
 */
export class ModuleDataSource implements IDebugDataSource {
    /** 数据源名称 */
    public readonly name: string = 'Modules';

    /**
     * 采集已注册模块的信息
     * @returns 调试分区数据
     */
    public collect(): DebugSectionData {
        // TODO: 学员实现 - 从 GameModule 采集已注册模块信息
        return {
            title: 'Modules',
            entries: [],
        };
    }
}
