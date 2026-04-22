/**
 * @jest-environment jsdom
 */

/**
 * Demo 2 RPG 集成测试
 *
 * T19: 端到端战斗流程测试
 * T20: BUFF 系统集成测试
 *
 * 验证 BattleSystem ↔ BuffSystem ↔ DamageCalculator ↔ EventManager 的模块间协作。
 */

import { GameModule } from '@framework/core/GameModule';
import { EventManager } from '@framework/event/EventManager';
import { CharacterState, ActionDecision, BuffType } from '@game/demo2-rpg/data/RpgGameData';
import { SkillConfigRow, SKILL_DATA } from '@game/demo2-rpg/data/SkillConfigRow';
import { BattleSystem } from '@game/demo2-rpg/systems/BattleSystem';
import { BuffSystem } from '@game/demo2-rpg/systems/BuffSystem';
import { EnemyAI } from '@game/demo2-rpg/systems/EnemyAI';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';

// Mock Logger
jest.mock('@framework/debug/Logger', () => {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class MockLogger {
        moduleName = 'Logger';
        priority = 0;
        onInit = jest.fn();
        onUpdate = jest.fn();
        onShutdown = jest.fn();

        static debug = jest.fn();
        static info = jest.fn();
        static warn = jest.fn();
        static error = jest.fn();
    }
    return { Logger: MockLogger };
});

// ─── 工具函数 ──────────────────────────────────────────

/** 构建技能配置表 */
function buildSkillTable(): SkillConfigRow[] {
    return SKILL_DATA.map((raw) => {
        const row = new SkillConfigRow();
        row.parseRow(raw);
        return row;
    });
}

/** 创建角色状态 */
function createCharacter(
    overrides: Partial<CharacterState> & { id: number; name: string; group: 'player' | 'enemy' },
): CharacterState {
    return {
        maxHp: 100,
        hp: 100,
        maxMp: 50,
        mp: 50,
        atk: 20,
        def: 5,
        spd: 10,
        skills: [1],
        level: 1,
        exp: 0,
        isAlive: true,
        buffs: [],
        ...overrides,
    };
}

// ─── 测试主体 ──────────────────────────────────────────

describe('Demo 2 RPG 集成测试', () => {
    let buffSystem: BuffSystem;
    let battleSystem: BattleSystem;
    let skillTable: SkillConfigRow[];
    let eventMgr: EventManager;

    beforeEach(() => {
        jest.useFakeTimers();
        GameModule.shutdownAll();

        buffSystem = new BuffSystem();
        battleSystem = new BattleSystem(buffSystem);
        skillTable = buildSkillTable();

        // 注册 EventManager 用于事件协作测试
        eventMgr = new EventManager();
    });

    afterEach(() => {
        GameModule.shutdownAll();
        jest.useRealTimers();
        document.body.innerHTML = '';
    });

    // ═══════════════════════════════════════════════════
    // T19: 端到端战斗流程测试
    // ═══════════════════════════════════════════════════

    describe('T19: 端到端战斗流程', () => {
        let warrior: CharacterState;
        let mage: CharacterState;
        let goblin: CharacterState;
        let slime: CharacterState;

        beforeEach(() => {
            warrior = createCharacter({
                id: 1,
                name: '战士',
                group: 'player',
                hp: 150,
                maxHp: 150,
                atk: 25,
                def: 10,
                spd: 12,
                mp: 50,
                maxMp: 50,
                skills: [1, 2, 7],
            });
            mage = createCharacter({
                id: 2,
                name: '法师',
                group: 'player',
                hp: 80,
                maxHp: 80,
                atk: 30,
                def: 3,
                spd: 8,
                mp: 100,
                maxMp: 100,
                skills: [1, 3, 5],
            });
            goblin = createCharacter({
                id: 101,
                name: '哥布林',
                group: 'enemy',
                hp: 60,
                maxHp: 60,
                atk: 15,
                def: 3,
                spd: 15,
                mp: 30,
                maxMp: 30,
                skills: [1, 2],
            });
            slime = createCharacter({
                id: 102,
                name: '史莱姆',
                group: 'enemy',
                hp: 40,
                maxHp: 40,
                atk: 10,
                def: 2,
                spd: 5,
                mp: 10,
                maxMp: 10,
                skills: [1],
            });
        });

        it('回合顺序按 SPD 降序排列', () => {
            const all = [warrior, mage, goblin, slime];
            const order = battleSystem.calculateTurnOrder(all);

            // SPD: 哥布林(15) > 战士(12) > 法师(8) > 史莱姆(5)
            expect(order.map((c) => c.id)).toEqual([101, 1, 2, 102]);
        });

        it('死亡角色不参与行动顺序', () => {
            goblin.isAlive = false;
            const all = [warrior, mage, goblin, slime];
            const order = battleSystem.calculateTurnOrder(all);

            expect(order.map((c) => c.id)).toEqual([1, 2, 102]);
            expect(order.find((c) => c.id === 101)).toBeUndefined();
        });

        it('伤害计算验证：ATK × rate - DEF 公式', () => {
            // 战士(ATK=25) 使用普攻(rate=1.0) 攻击哥布林(DEF=3)
            // 预期伤害 = floor(25 * 1.0 - 3) = 22
            const action: ActionDecision = {
                actorId: warrior.id,
                skillId: 1, // 普通攻击
                targetIds: [goblin.id],
            };

            const all = [warrior, mage, goblin, slime];
            const result = battleSystem.executeAction(action, all, skillTable);

            expect(result.damages.get(goblin.id)).toBe(22);
            expect(goblin.hp).toBe(60 - 22); // 38
        });

        it('重击伤害使用 1.5 倍率', () => {
            // 战士(ATK=25) 使用重击(rate=1.5) 攻击哥布林(DEF=3)
            // 预期伤害 = floor(25 * 1.5 - 3) = floor(34.5) = 34
            const action: ActionDecision = {
                actorId: warrior.id,
                skillId: 2,
                targetIds: [goblin.id],
            };

            const all = [warrior, mage, goblin, slime];
            const result = battleSystem.executeAction(action, all, skillTable);

            expect(result.damages.get(goblin.id)).toBe(34);
        });

        it('死亡判定：HP ≤ 0 标记 isAlive = false', () => {
            // 让哥布林 HP 很低，一击致死
            goblin.hp = 10;
            const action: ActionDecision = {
                actorId: warrior.id,
                skillId: 1,
                targetIds: [goblin.id],
            };

            const all = [warrior, mage, goblin, slime];
            battleSystem.executeAction(action, all, skillTable);

            expect(goblin.isAlive).toBe(false);
            expect(goblin.hp).toBeLessThanOrEqual(0);
        });

        it('胜利结算路径：所有敌人死亡', () => {
            goblin.isAlive = false;
            slime.isAlive = false;

            const endResult = battleSystem.checkBattleEnd([warrior, mage], [goblin, slime]);

            expect(endResult.ended).toBe(true);
            expect(endResult.victory).toBe(true);
        });

        it('失败结算路径：所有玩家死亡', () => {
            warrior.isAlive = false;
            mage.isAlive = false;

            const endResult = battleSystem.checkBattleEnd([warrior, mage], [goblin, slime]);

            expect(endResult.ended).toBe(true);
            expect(endResult.victory).toBe(false);
        });

        it('战斗未结束：双方均有存活', () => {
            const endResult = battleSystem.checkBattleEnd([warrior, mage], [goblin, slime]);

            expect(endResult.ended).toBe(false);
            expect(endResult.victory).toBeNull();
        });

        it('完整战斗流程：多回合直到一方全灭', () => {
            const players = [warrior, mage];
            const enemies = [goblin, slime];
            const all = [...players, ...enemies];
            let round = 0;

            // 模拟最多 20 回合
            while (round < 20) {
                round++;
                const order = battleSystem.calculateTurnOrder(all);

                for (const actor of order) {
                    if (!actor.isAlive) continue;

                    // 简单 AI：攻击对方阵营第一个存活目标
                    const isPlayer = actor.group === 'player';
                    const opposites = isPlayer ? enemies : players;
                    const target = opposites.find((c) => c.isAlive);
                    if (!target) break;

                    const action: ActionDecision = {
                        actorId: actor.id,
                        skillId: 1, // 普攻
                        targetIds: [target.id],
                    };
                    battleSystem.executeAction(action, all, skillTable);

                    const endResult = battleSystem.checkBattleEnd(players, enemies);
                    if (endResult.ended) {
                        // 战斗结束
                        expect(endResult.ended).toBe(true);
                        expect(typeof endResult.victory).toBe('boolean');
                        return;
                    }
                }
            }

            // 20 回合内应该结束（数值保证）
            fail('战斗未在 20 回合内结束');
        });

        it('治疗技能恢复 HP，不超过 maxHp', () => {
            // 法师(ATK=30) 使用治愈之光(rate=1.5) 治疗战士
            // 治疗量 = floor(30 * 1.5) = 45
            warrior.hp = 50; // 受伤状态
            const action: ActionDecision = {
                actorId: mage.id,
                skillId: 5, // 治愈之光
                targetIds: [warrior.id],
            };

            const all = [warrior, mage, goblin, slime];
            const result = battleSystem.executeAction(action, all, skillTable);

            expect(result.heals.get(warrior.id)).toBe(45);
            expect(warrior.hp).toBe(95); // 50 + 45 = 95 < 150(maxHp)
        });

        it('治疗不超过 maxHp 上限', () => {
            warrior.hp = 140; // 接近满血
            const action: ActionDecision = {
                actorId: mage.id,
                skillId: 5,
                targetIds: [warrior.id],
            };

            const all = [warrior, mage, goblin, slime];
            battleSystem.executeAction(action, all, skillTable);

            // 140 + 45 = 185 → clamp 到 150
            expect(warrior.hp).toBe(150);
        });

        it('技能消耗 MP', () => {
            const mpBefore = mage.mp;
            const action: ActionDecision = {
                actorId: mage.id,
                skillId: 3, // 火球术 mpCost=20
                targetIds: [goblin.id],
            };

            const all = [warrior, mage, goblin, slime];
            battleSystem.executeAction(action, all, skillTable);

            expect(mage.mp).toBe(mpBefore - 20);
        });

        it('EnemyAI 选择 HP 最低的玩家目标', () => {
            mage.hp = 30; // 法师 HP 更低
            const decision = EnemyAI.decideAction(goblin, [warrior, mage], skillTable);

            expect(decision.actorId).toBe(goblin.id);
            expect(decision.targetIds).toContain(mage.id);
        });

        it('EnemyAI 优先选高伤害技能（MP 足够时）', () => {
            // 哥布林有 skills: [1, 2]，技能 2 重击 rate=1.5, mpCost=10
            const decision = EnemyAI.decideAction(goblin, [warrior], skillTable);

            // MP=30 足够使用重击(mpCost=10)
            expect(decision.skillId).toBe(2);
        });

        it('EnemyAI MP 不足时回退普攻', () => {
            goblin.mp = 0;
            const decision = EnemyAI.decideAction(goblin, [warrior], skillTable);

            expect(decision.skillId).toBe(1);
        });
    });

    // ═══════════════════════════════════════════════════
    // T20: BUFF 系统集成测试
    // ═══════════════════════════════════════════════════

    describe('T20: BUFF 系统集成', () => {
        let warrior: CharacterState;
        let mage: CharacterState;
        let goblin: CharacterState;

        beforeEach(() => {
            warrior = createCharacter({
                id: 1,
                name: '战士',
                group: 'player',
                hp: 150,
                maxHp: 150,
                atk: 25,
                def: 10,
                spd: 12,
                mp: 50,
                maxMp: 50,
                skills: [1, 2, 7, 8],
            });
            mage = createCharacter({
                id: 2,
                name: '法师',
                group: 'player',
                hp: 80,
                maxHp: 80,
                atk: 30,
                def: 3,
                spd: 8,
                mp: 100,
                maxMp: 100,
                skills: [1, 3, 5],
            });
            goblin = createCharacter({
                id: 101,
                name: '哥布林',
                group: 'enemy',
                hp: 60,
                maxHp: 60,
                atk: 15,
                def: 3,
                spd: 15,
                mp: 30,
                maxMp: 30,
                skills: [1, 2],
            });
        });

        it('ATK_UP BUFF 增加伤害输出', () => {
            const all = [warrior, mage, goblin];

            // 先无 BUFF 普攻一次，记录伤害
            const actionNoBuff: ActionDecision = {
                actorId: warrior.id,
                skillId: 1,
                targetIds: [goblin.id],
            };
            const resultNoBuff = battleSystem.executeAction(actionNoBuff, all, skillTable);
            const damageNoBuff = resultNoBuff.damages.get(goblin.id)!;

            // 恢复哥布林 HP
            goblin.hp = 60;

            // 施加 ATK_UP BUFF
            buffSystem.applyBuff(warrior.id, BuffType.ATK_UP, 3, 10);

            // 再次攻击
            const actionWithBuff: ActionDecision = {
                actorId: warrior.id,
                skillId: 1,
                targetIds: [goblin.id],
            };
            const resultWithBuff = battleSystem.executeAction(actionWithBuff, all, skillTable);
            const damageWithBuff = resultWithBuff.damages.get(goblin.id)!;

            // ATK_UP(+10) 应增加伤害
            // 无 BUFF: floor(25*1.0 - 3) = 22
            // 有 BUFF: floor((25+10)*1.0 - 3) = 32
            expect(damageNoBuff).toBe(22);
            expect(damageWithBuff).toBe(32);
            expect(damageWithBuff).toBeGreaterThan(damageNoBuff);
        });

        it('BUFF 回合递减和过期', () => {
            buffSystem.applyBuff(warrior.id, BuffType.ATK_UP, 2, 10);

            // 回合 1：递减后剩余 1 回合
            const expired1 = buffSystem.tickBuffs(warrior.id);
            expect(expired1).toHaveLength(0);
            expect(buffSystem.hasBuff(warrior.id, BuffType.ATK_UP)).toBe(true);

            const activeAfterTick1 = buffSystem.getActiveBuffs(warrior.id);
            expect(activeAfterTick1[0].remainingRounds).toBe(1);

            // 回合 2：递减后过期
            const expired2 = buffSystem.tickBuffs(warrior.id);
            expect(expired2).toHaveLength(1);
            expect(expired2[0].buffType).toBe(BuffType.ATK_UP);
            expect(buffSystem.hasBuff(warrior.id, BuffType.ATK_UP)).toBe(false);
        });

        it('同类型 BUFF 刷新而非叠加', () => {
            buffSystem.applyBuff(warrior.id, BuffType.ATK_UP, 2, 10);
            buffSystem.applyBuff(warrior.id, BuffType.ATK_UP, 3, 15);

            const active = buffSystem.getActiveBuffs(warrior.id);
            // 同类型只有一个，数值和持续时间被刷新
            expect(active).toHaveLength(1);
            expect(active[0].remainingRounds).toBe(3);
            expect(active[0].value).toBe(15);
        });

        it('STUN 效果：hasBuff 返回 true', () => {
            buffSystem.applyBuff(goblin.id, BuffType.STUN, 1, 0);

            expect(buffSystem.hasBuff(goblin.id, BuffType.STUN)).toBe(true);
        });

        it('眩晕打击施加 STUN BUFF', () => {
            // 战士使用眩晕打击(id=8, effect='stun', duration=1)
            const action: ActionDecision = {
                actorId: warrior.id,
                skillId: 8,
                targetIds: [goblin.id],
            };

            const all = [warrior, mage, goblin];
            const result = battleSystem.executeAction(action, all, skillTable);

            // 验证 STUN 被施加
            expect(buffSystem.hasBuff(goblin.id, BuffType.STUN)).toBe(true);
            expect(result.buffsApplied).toHaveLength(1);
            expect(result.buffsApplied[0].buffType).toBe(BuffType.STUN);
        });

        it('战吼技能施加 ATK_UP BUFF', () => {
            // 战士使用战吼(id=7, effect='buff_atk', duration=3) 给自己
            const action: ActionDecision = {
                actorId: warrior.id,
                skillId: 7,
                targetIds: [warrior.id],
            };

            const all = [warrior, mage, goblin];
            const result = battleSystem.executeAction(action, all, skillTable);

            expect(buffSystem.hasBuff(warrior.id, BuffType.ATK_UP)).toBe(true);
            expect(result.buffsApplied).toHaveLength(1);
            expect(result.buffsApplied[0].buffType).toBe(BuffType.ATK_UP);
            expect(result.buffsApplied[0].remainingRounds).toBe(3);
        });

        it('战斗结束时清理所有 BUFF', () => {
            buffSystem.applyBuff(warrior.id, BuffType.ATK_UP, 3, 10);
            buffSystem.applyBuff(goblin.id, BuffType.STUN, 1, 0);

            // 模拟战斗结束清理
            buffSystem.clearAll();

            expect(buffSystem.getActiveBuffs(warrior.id)).toHaveLength(0);
            expect(buffSystem.getActiveBuffs(goblin.id)).toHaveLength(0);
            expect(buffSystem.hasBuff(warrior.id, BuffType.ATK_UP)).toBe(false);
            expect(buffSystem.hasBuff(goblin.id, BuffType.STUN)).toBe(false);
        });

        it('clearBuffs 只清除指定角色的 BUFF', () => {
            buffSystem.applyBuff(warrior.id, BuffType.ATK_UP, 3, 10);
            buffSystem.applyBuff(goblin.id, BuffType.STUN, 1, 0);

            buffSystem.clearBuffs(warrior.id);

            expect(buffSystem.hasBuff(warrior.id, BuffType.ATK_UP)).toBe(false);
            expect(buffSystem.hasBuff(goblin.id, BuffType.STUN)).toBe(true);
        });

        it('多个不同类型 BUFF 并存', () => {
            buffSystem.applyBuff(warrior.id, BuffType.ATK_UP, 3, 10);
            buffSystem.applyBuff(warrior.id, BuffType.DEF_UP, 2, 5);

            const active = buffSystem.getActiveBuffs(warrior.id);
            expect(active).toHaveLength(2);

            const types = active.map((b) => b.buffType);
            expect(types).toContain(BuffType.ATK_UP);
            expect(types).toContain(BuffType.DEF_UP);
        });

        it('BUFF 与伤害计算集成：战吼 → 攻击 → BUFF 递减 → 过期后伤害恢复', () => {
            const all = [warrior, goblin];

            // 1. 战士使用战吼(duration=3)给自己加 ATK_UP
            battleSystem.executeAction(
                { actorId: warrior.id, skillId: 7, targetIds: [warrior.id] },
                all,
                skillTable,
            );
            expect(buffSystem.hasBuff(warrior.id, BuffType.ATK_UP)).toBe(true);

            // 2. 有 BUFF 时攻击
            goblin.hp = 60;
            const resultBuffed = battleSystem.executeAction(
                { actorId: warrior.id, skillId: 1, targetIds: [goblin.id] },
                all,
                skillTable,
            );
            const buffedDamage = resultBuffed.damages.get(goblin.id)!;
            // (25+10)*1.0 - 3 = 32
            expect(buffedDamage).toBe(32);

            // 3. 递减 3 回合使 BUFF 过期
            buffSystem.tickBuffs(warrior.id); // 剩余 2
            buffSystem.tickBuffs(warrior.id); // 剩余 1
            buffSystem.tickBuffs(warrior.id); // 过期
            expect(buffSystem.hasBuff(warrior.id, BuffType.ATK_UP)).toBe(false);

            // 4. BUFF 过期后攻击
            goblin.hp = 60;
            const resultNoBuff = battleSystem.executeAction(
                { actorId: warrior.id, skillId: 1, targetIds: [goblin.id] },
                all,
                skillTable,
            );
            const normalDamage = resultNoBuff.damages.get(goblin.id)!;
            // 25*1.0 - 3 = 22
            expect(normalDamage).toBe(22);
            expect(normalDamage).toBeLessThan(buffedDamage);
        });

        it('事件协作：战斗事件通过 EventManager 发射和接收', () => {
            const attackHandler = jest.fn();
            const hurtHandler = jest.fn();
            const deadHandler = jest.fn();

            eventMgr.on(RpgEvents.ATTACK, attackHandler);
            eventMgr.on(RpgEvents.CHARACTER_HURT, hurtHandler);
            eventMgr.on(RpgEvents.CHARACTER_DEAD, deadHandler);

            // 发射攻击事件
            eventMgr.emit(RpgEvents.ATTACK, {
                attackerId: warrior.id,
                defenderId: goblin.id,
                damage: 22,
                skillId: 1,
            });

            expect(attackHandler).toHaveBeenCalledTimes(1);
            expect(attackHandler).toHaveBeenCalledWith({
                attackerId: 1,
                defenderId: 101,
                damage: 22,
                skillId: 1,
            });

            // 发射受伤事件
            eventMgr.emit(RpgEvents.CHARACTER_HURT, {
                characterId: goblin.id,
                damage: 22,
                remainingHp: 38,
            });
            expect(hurtHandler).toHaveBeenCalledTimes(1);

            // 发射死亡事件
            eventMgr.emit(RpgEvents.CHARACTER_DEAD, {
                characterId: goblin.id,
                group: 'enemy',
            });
            expect(deadHandler).toHaveBeenCalledTimes(1);
        });

        it('BUFF 事件协作：施加和过期事件', () => {
            const appliedHandler = jest.fn();
            const expiredHandler = jest.fn();

            eventMgr.on(RpgEvents.BUFF_APPLIED, appliedHandler);
            eventMgr.on(RpgEvents.BUFF_EXPIRED, expiredHandler);

            // 模拟 BUFF 施加事件
            buffSystem.applyBuff(warrior.id, BuffType.ATK_UP, 1, 10);
            eventMgr.emit(RpgEvents.BUFF_APPLIED, {
                targetId: warrior.id,
                buffType: BuffType.ATK_UP,
                duration: 1,
            });
            expect(appliedHandler).toHaveBeenCalledTimes(1);

            // 模拟 BUFF 过期事件
            const expired = buffSystem.tickBuffs(warrior.id);
            expect(expired).toHaveLength(1);
            eventMgr.emit(RpgEvents.BUFF_EXPIRED, {
                targetId: warrior.id,
                buffType: BuffType.ATK_UP,
            });
            expect(expiredHandler).toHaveBeenCalledTimes(1);
        });
    });
});
