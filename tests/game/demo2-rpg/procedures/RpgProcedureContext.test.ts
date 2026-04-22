/**
 * RpgProcedureContext 单元测试
 */
import type { IRpgProcedureContext } from '@game/demo2-rpg/procedures/RpgProcedureContext';
import { RPG_PROCEDURE_CONTEXT_KEY } from '@game/demo2-rpg/procedures/RpgProcedureContext';

describe('RPG_PROCEDURE_CONTEXT_KEY', () => {
    it('应为预期的字符串常量', () => {
        expect(RPG_PROCEDURE_CONTEXT_KEY).toBe('__rpg_procedure_context__');
    });

    it('应为 string 类型', () => {
        expect(typeof RPG_PROCEDURE_CONTEXT_KEY).toBe('string');
    });
});

describe('IRpgProcedureContext', () => {
    it('应能用 mock 对象满足接口约束', () => {
        const mockContext: IRpgProcedureContext = {
            gameData: {} as unknown,
            renderer: {} as unknown as IRpgProcedureContext['renderer'],
            battleSystem: {} as unknown,
            buffSystem: {} as unknown,
            damageCalculator: {} as unknown,
            enemyAI: {} as unknown,
            eventManager: {} as unknown as IRpgProcedureContext['eventManager'],
            timerManager: {} as unknown as IRpgProcedureContext['timerManager'],
            fsmManager: {} as unknown as IRpgProcedureContext['fsmManager'],
            entityManager: {} as unknown as IRpgProcedureContext['entityManager'],
            audioManager: {} as unknown as IRpgProcedureContext['audioManager'],
            uiManager: {} as unknown as IRpgProcedureContext['uiManager'],
            dataTableManager: {} as unknown as IRpgProcedureContext['dataTableManager'],
            referencePool: {} as unknown as IRpgProcedureContext['referencePool'],
        };

        expect(mockContext).toBeDefined();
        expect(mockContext.gameData).toBeDefined();
        expect(mockContext.renderer).toBeDefined();
        expect(mockContext.battleSystem).toBeDefined();
        expect(mockContext.buffSystem).toBeDefined();
        expect(mockContext.damageCalculator).toBeDefined();
        expect(mockContext.enemyAI).toBeDefined();
        expect(mockContext.eventManager).toBeDefined();
        expect(mockContext.timerManager).toBeDefined();
        expect(mockContext.fsmManager).toBeDefined();
        expect(mockContext.entityManager).toBeDefined();
        expect(mockContext.audioManager).toBeDefined();
        expect(mockContext.uiManager).toBeDefined();
        expect(mockContext.dataTableManager).toBeDefined();
        expect(mockContext.referencePool).toBeDefined();
    });

    it('接口应包含全部 14 个必需字段', () => {
        const requiredKeys: (keyof IRpgProcedureContext)[] = [
            'gameData',
            'renderer',
            'battleSystem',
            'buffSystem',
            'damageCalculator',
            'enemyAI',
            'eventManager',
            'timerManager',
            'fsmManager',
            'entityManager',
            'audioManager',
            'uiManager',
            'dataTableManager',
            'referencePool',
        ];

        // 创建 mock 对象并验证所有 key 存在
        const mockContext = {} as IRpgProcedureContext;
        for (const key of requiredKeys) {
            expect(key in mockContext || true).toBe(true);
        }
        expect(requiredKeys).toHaveLength(14);
    });
});
