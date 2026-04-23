import { IDebugDataSource, DebugSectionData, DebugEntry } from '../DebugDefs';
import { GameModule } from '../../core/GameModule';
import { Logger } from '../Logger';

/**
 * 模块调试数据源
 * 采集 GameModule 已注册模块的信息
 */
export class ModuleDataSource implements IDebugDataSource {
    private static readonly TAG = 'ModuleDataSource';

    /** 数据源名称 */
    public readonly name: string = 'Modules';

    /**
     * 采集已注册模块的信息
     * @returns 调试分区数据
     */
    public collect(): DebugSectionData {
        const modules = GameModule.getDebugInfo();
        if (modules.length === 0) {
            return { title: this.name, entries: [] };
        }

        const entries: DebugEntry[] = [{ label: '模块数量', value: String(modules.length) }];
        for (const m of modules) {
            entries.push({ label: m.name, value: `priority=${m.priority}` });
        }

        Logger.debug(ModuleDataSource.TAG, `采集完成, 模块数=${modules.length}`);
        return { title: this.name, entries };
    }
}
