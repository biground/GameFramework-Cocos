/**
 * 战斗 FSM 与角色 FSM 定义测试
 */
import { BattleFsmDataKeys, BattleFsmStateNames } from '@game/demo2-rpg/fsm/BattleFsmDefs';
import { CharacterFsmDataKeys, CharacterFsmStateNames } from '@game/demo2-rpg/fsm/CharacterFsmDefs';

describe('BattleFsmDefs', () => {
    it('应包含 6 个战斗状态名', () => {
        const names = Object.values(BattleFsmStateNames);
        expect(names).toHaveLength(6);
    });

    it('战斗状态名无重复值', () => {
        const names = Object.values(BattleFsmStateNames);
        const unique = new Set(names);
        expect(unique.size).toBe(names.length);
    });

    it('BattleFsmDataKeys.BLACKBOARD 值正确', () => {
        expect(BattleFsmDataKeys.BLACKBOARD).toBe('battle_blackboard');
    });

    it('包含所有预期的战斗状态名', () => {
        expect(BattleFsmStateNames.ROUND_START).toBe('RoundStart');
        expect(BattleFsmStateNames.SELECT_ACTION).toBe('SelectAction');
        expect(BattleFsmStateNames.EXECUTE_ACTION).toBe('ExecuteAction');
        expect(BattleFsmStateNames.ROUND_END).toBe('RoundEnd');
        expect(BattleFsmStateNames.VICTORY).toBe('Victory');
        expect(BattleFsmStateNames.DEFEAT).toBe('Defeat');
    });
});

describe('CharacterFsmDefs', () => {
    it('应包含 4 个角色状态名', () => {
        const names = Object.values(CharacterFsmStateNames);
        expect(names).toHaveLength(4);
    });

    it('角色状态名无重复值', () => {
        const names = Object.values(CharacterFsmStateNames);
        const unique = new Set(names);
        expect(unique.size).toBe(names.length);
    });

    it('CharacterFsmDataKeys.BLACKBOARD 值正确', () => {
        expect(CharacterFsmDataKeys.BLACKBOARD).toBe('character_blackboard');
    });

    it('包含所有预期的角色状态名', () => {
        expect(CharacterFsmStateNames.IDLE).toBe('Idle');
        expect(CharacterFsmStateNames.ACTING).toBe('Acting');
        expect(CharacterFsmStateNames.STUNNED).toBe('Stunned');
        expect(CharacterFsmStateNames.DEAD).toBe('Dead');
    });
});
