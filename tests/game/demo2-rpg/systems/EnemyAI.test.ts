/**
 * EnemyAI 敌方 AI 决策 — 单元测试
 */
import { EnemyAI } from '@game/demo2-rpg/systems/EnemyAI';
import { CharacterState } from '@game/demo2-rpg/data/RpgGameData';
import { SkillConfigRow } from '@game/demo2-rpg/data/SkillConfigRow';

// ─── 辅助工厂 ──────────────────────────────────────────

/** 创建角色状态 */
function makeChar(overrides: Partial<CharacterState> = {}): CharacterState {
    return {
        id: 1,
        name: 'TestChar',
        maxHp: 100,
        hp: 100,
        maxMp: 50,
        mp: 50,
        atk: 20,
        def: 10,
        spd: 10,
        skills: [1, 2],
        level: 1,
        exp: 0,
        isAlive: true,
        group: 'player',
        buffs: [],
        ...overrides,
    };
}

/** 创建技能配置 */
function makeSkill(overrides: Partial<SkillConfigRow> = {}): SkillConfigRow {
    const row = new SkillConfigRow();
    Object.assign(row, {
        id: 1,
        name: '普通攻击',
        mpCost: 0,
        damageRate: 1.0,
        target: 'single_enemy',
        effect: 'none',
        effectDuration: 0,
        cooldown: 0,
        ...overrides,
    });
    return row;
}

// ─── 技能预设 ──────────────────────────────────────────

const normalAttack = makeSkill({ id: 1, name: '普通攻击', mpCost: 0, damageRate: 1.0 });
const heavyStrike = makeSkill({ id: 2, name: '重击', mpCost: 10, damageRate: 1.5 });
const fireball = makeSkill({ id: 3, name: '火球术', mpCost: 20, damageRate: 2.0 });

// ─── 测试 ──────────────────────────────────────────────

describe('EnemyAI', () => {
    const enemy = makeChar({
        id: 100,
        name: '哥布林',
        group: 'enemy',
        mp: 50,
        skills: [1, 2, 3],
    });

    const allSkills = [normalAttack, heavyStrike, fireball];

    describe('目标选择', () => {
        it('优先攻击 HP 最低的玩家角色', () => {
            const players = [
                makeChar({ id: 1, hp: 80 }),
                makeChar({ id: 2, hp: 30 }),
                makeChar({ id: 3, hp: 60 }),
            ];

            const decision = EnemyAI.decideAction(enemy, players, allSkills);

            expect(decision.targetIds).toEqual([2]);
        });

        it('HP 相同时选第一个（索引最小）', () => {
            const players = [
                makeChar({ id: 1, hp: 50 }),
                makeChar({ id: 2, hp: 50 }),
                makeChar({ id: 3, hp: 50 }),
            ];

            const decision = EnemyAI.decideAction(enemy, players, allSkills);

            expect(decision.targetIds).toEqual([1]);
        });

        it('跳过已死亡的玩家角色', () => {
            const players = [
                makeChar({ id: 1, hp: 0, isAlive: false }),
                makeChar({ id: 2, hp: 80 }),
                makeChar({ id: 3, hp: 60 }),
            ];

            const decision = EnemyAI.decideAction(enemy, players, allSkills);

            expect(decision.targetIds).toEqual([3]);
        });
    });

    describe('技能选择', () => {
        it('MP 足够时优先选择伤害倍率最高的技能', () => {
            const richEnemy = makeChar({
                id: 100,
                group: 'enemy',
                mp: 50,
                skills: [1, 2, 3],
            });
            const players = [makeChar({ id: 1, hp: 50 })];

            const decision = EnemyAI.decideAction(richEnemy, players, allSkills);

            // 火球术 damageRate=2.0 且 MP 足够
            expect(decision.skillId).toBe(3);
        });

        it('MP 不足时回退到普攻（id=1）', () => {
            const poorEnemy = makeChar({
                id: 100,
                group: 'enemy',
                mp: 5, // 不够用重击(10)或火球术(20)
                skills: [1, 2, 3],
            });
            const players = [makeChar({ id: 1, hp: 50 })];

            const decision = EnemyAI.decideAction(poorEnemy, players, allSkills);

            expect(decision.skillId).toBe(1);
        });

        it('仅考虑敌方可用的单体攻击技能（single_enemy）', () => {
            const aoeSkill = makeSkill({
                id: 4,
                name: '暴风雪',
                mpCost: 30,
                damageRate: 1.2,
                target: 'all_enemy',
            });
            const healSkill = makeSkill({
                id: 5,
                name: '治愈之光',
                mpCost: 15,
                damageRate: 1.5,
                target: 'single_ally',
                effect: 'heal',
            });
            const skillsWithAoe = [normalAttack, heavyStrike, aoeSkill, healSkill];
            const atkEnemy = makeChar({
                id: 100,
                group: 'enemy',
                mp: 50,
                skills: [1, 2, 4, 5],
            });
            const players = [makeChar({ id: 1, hp: 50 })];

            const decision = EnemyAI.decideAction(atkEnemy, players, skillsWithAoe);

            // 应选重击(1.5) 而非暴风雪(aoe) 或治愈(heal)
            expect(decision.skillId).toBe(2);
        });
    });

    describe('边界情况', () => {
        it('全部玩家已死亡时返回空目标列表', () => {
            const players = [
                makeChar({ id: 1, hp: 0, isAlive: false }),
                makeChar({ id: 2, hp: 0, isAlive: false }),
            ];

            const decision = EnemyAI.decideAction(enemy, players, allSkills);

            expect(decision.actorId).toBe(enemy.id);
            expect(decision.targetIds).toEqual([]);
        });

        it('空玩家列表时返回空目标列表', () => {
            const decision = EnemyAI.decideAction(enemy, [], allSkills);

            expect(decision.actorId).toBe(enemy.id);
            expect(decision.targetIds).toEqual([]);
        });

        it('返回的 actorId 始终为敌方角色 ID', () => {
            const players = [makeChar({ id: 1, hp: 50 })];
            const decision = EnemyAI.decideAction(enemy, players, allSkills);

            expect(decision.actorId).toBe(100);
        });
    });
});
