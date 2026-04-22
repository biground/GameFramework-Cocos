/**
 * RpgGameData 单元测试
 */
import type {
    CharacterState,
    ActionDecision,
    ActionResult,
    BattleEndResult,
} from '@game/demo2-rpg/data/RpgGameData';
import { BuffType, RpgGameData } from '@game/demo2-rpg/data/RpgGameData';

describe('BuffType 枚举', () => {
    it('应包含正确的枚举值', () => {
        expect(BuffType.ATK_UP).toBe('atk_up');
        expect(BuffType.DEF_UP).toBe('def_up');
        expect(BuffType.STUN).toBe('stun');
    });

    it('应只有 3 个枚举成员', () => {
        const values = Object.values(BuffType);
        expect(values).toHaveLength(3);
    });
});

describe('CharacterState 接口', () => {
    it('应能创建完整的角色状态对象', () => {
        const character: CharacterState = {
            id: 1,
            name: '战士',
            maxHp: 100,
            hp: 80,
            maxMp: 50,
            mp: 30,
            atk: 20,
            def: 10,
            spd: 5,
            skills: [1, 2, 3],
            level: 1,
            exp: 0,
            isAlive: true,
            group: 'player',
            buffs: [{ buffType: BuffType.ATK_UP, remainingRounds: 2, value: 5 }],
        };

        expect(character.id).toBe(1);
        expect(character.name).toBe('战士');
        expect(character.group).toBe('player');
        expect(character.buffs).toHaveLength(1);
        expect(character.buffs[0].buffType).toBe(BuffType.ATK_UP);
    });

    it('应支持 enemy 阵营', () => {
        const enemy: CharacterState = {
            id: 100,
            name: '哥布林',
            maxHp: 50,
            hp: 50,
            maxMp: 0,
            mp: 0,
            atk: 8,
            def: 3,
            spd: 4,
            skills: [10],
            level: 1,
            exp: 10,
            isAlive: true,
            group: 'enemy',
            buffs: [],
        };

        expect(enemy.group).toBe('enemy');
        expect(enemy.isAlive).toBe(true);
    });
});

describe('RpgGameData', () => {
    let gameData: RpgGameData;

    beforeEach(() => {
        gameData = new RpgGameData();
    });

    it('应有正确的默认值', () => {
        expect(gameData.gold).toBe(0);
        expect(gameData.totalExp).toBe(0);
        expect(gameData.selectedStageId).toBe(1);
        expect(gameData.playerCharacters).toEqual([]);
        expect(gameData.currentRound).toBe(0);
        expect(gameData.battleLog).toEqual([]);
    });

    it('reset() 应将所有字段恢复为默认值', () => {
        // 修改所有字段
        gameData.gold = 999;
        gameData.totalExp = 500;
        gameData.selectedStageId = 3;
        gameData.playerCharacters = [
            {
                id: 1,
                name: '勇者',
                maxHp: 100,
                hp: 100,
                maxMp: 50,
                mp: 50,
                atk: 20,
                def: 10,
                spd: 5,
                skills: [1],
                level: 5,
                exp: 200,
                isAlive: true,
                group: 'player',
                buffs: [],
            },
        ];
        gameData.currentRound = 10;
        gameData.battleLog = ['战斗开始', '勇者攻击了哥布林'];

        // 重置
        gameData.reset();

        // 验证
        expect(gameData.gold).toBe(0);
        expect(gameData.totalExp).toBe(0);
        expect(gameData.selectedStageId).toBe(1);
        expect(gameData.playerCharacters).toEqual([]);
        expect(gameData.currentRound).toBe(0);
        expect(gameData.battleLog).toEqual([]);
    });

    it('reset() 应创建新的数组引用', () => {
        const oldChars = gameData.playerCharacters;
        const oldLog = gameData.battleLog;

        gameData.reset();

        expect(gameData.playerCharacters).not.toBe(oldChars);
        expect(gameData.battleLog).not.toBe(oldLog);
    });
});

describe('ActionDecision 接口', () => {
    it('应能创建行动决策对象', () => {
        const decision: ActionDecision = {
            actorId: 1,
            skillId: 2,
            targetIds: [100, 101],
        };

        expect(decision.actorId).toBe(1);
        expect(decision.targetIds).toHaveLength(2);
    });
});

describe('ActionResult 接口', () => {
    it('应能创建行动结果对象', () => {
        const result: ActionResult = {
            actorId: 1,
            skillId: 2,
            targetIds: [100],
            damages: new Map([[100, 25]]),
            heals: new Map(),
            buffsApplied: [{ buffType: BuffType.STUN, remainingRounds: 1, value: 0 }],
            effectApplied: '普通攻击',
        };

        expect(result.damages.get(100)).toBe(25);
        expect(result.buffsApplied).toHaveLength(1);
        expect(result.effectApplied).toBe('普通攻击');
    });
});

describe('BattleEndResult 接口', () => {
    it('应能表示战斗未结束', () => {
        const result: BattleEndResult = { ended: false, victory: null };
        expect(result.ended).toBe(false);
        expect(result.victory).toBeNull();
    });

    it('应能表示战斗胜利', () => {
        const result: BattleEndResult = { ended: true, victory: true };
        expect(result.ended).toBe(true);
        expect(result.victory).toBe(true);
    });

    it('应能表示战斗失败', () => {
        const result: BattleEndResult = { ended: true, victory: false };
        expect(result.victory).toBe(false);
    });
});
