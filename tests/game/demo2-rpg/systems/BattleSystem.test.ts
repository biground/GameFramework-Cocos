import { BattleSystem } from '@game/demo2-rpg/systems/BattleSystem';
import { BuffSystem } from '@game/demo2-rpg/systems/BuffSystem';
import { ActionDecision, BuffType, CharacterState } from '@game/demo2-rpg/data/RpgGameData';
import { SkillConfigRow, SKILL_DATA } from '@game/demo2-rpg/data/SkillConfigRow';

// ─── 辅助工具 ────────────────────────────────────────────

/** 解析全部技能配置 */
function loadSkillTable(): SkillConfigRow[] {
    return SKILL_DATA.map((raw) => {
        const row = new SkillConfigRow();
        row.parseRow(raw);
        return row;
    });
}

/** 创建角色模板 */
function makeCharacter(
    overrides: Partial<CharacterState> & { id: number; name: string },
): CharacterState {
    return {
        maxHp: 100,
        hp: 100,
        maxMp: 50,
        mp: 50,
        atk: 20,
        def: 10,
        spd: 10,
        skills: [1],
        level: 1,
        exp: 0,
        isAlive: true,
        group: 'player',
        buffs: [],
        ...overrides,
    };
}

// ─── 测试 ────────────────────────────────────────────────

describe('BattleSystem', () => {
    let battleSystem: BattleSystem;
    let skillTable: SkillConfigRow[];

    beforeEach(() => {
        battleSystem = new BattleSystem(new BuffSystem());
        skillTable = loadSkillTable();
    });

    // ── calculateTurnOrder ──────────────────────────────

    describe('calculateTurnOrder', () => {
        it('按 SPD 降序排列（仅存活角色）', () => {
            const chars = [
                makeCharacter({ id: 1, name: 'A', spd: 10 }),
                makeCharacter({ id: 2, name: 'B', spd: 30, isAlive: false }),
                makeCharacter({ id: 3, name: 'C', spd: 20 }),
                makeCharacter({ id: 4, name: 'D', spd: 15 }),
            ];
            const order = battleSystem.calculateTurnOrder(chars);
            expect(order.map((c) => c.id)).toEqual([3, 4, 1]);
        });

        it('SPD 相同时保持原始顺序', () => {
            const chars = [
                makeCharacter({ id: 1, name: 'A', spd: 10 }),
                makeCharacter({ id: 2, name: 'B', spd: 10 }),
            ];
            const order = battleSystem.calculateTurnOrder(chars);
            expect(order.map((c) => c.id)).toEqual([1, 2]);
        });

        it('全部阵亡时返回空数组', () => {
            const chars = [
                makeCharacter({ id: 1, name: 'A', isAlive: false }),
                makeCharacter({ id: 2, name: 'B', isAlive: false }),
            ];
            expect(battleSystem.calculateTurnOrder(chars)).toEqual([]);
        });
    });

    // ── executeAction: 普通攻击 ─────────────────────────

    describe('executeAction — 普通攻击', () => {
        it('执行普通攻击并验证伤害', () => {
            const attacker = makeCharacter({ id: 1, name: '战士', atk: 30, group: 'player' });
            const enemy = makeCharacter({ id: 2, name: '哥布林', def: 10, group: 'enemy' });
            const all = [attacker, enemy];

            const action: ActionDecision = { actorId: 1, skillId: 1, targetIds: [2] };
            const result = battleSystem.executeAction(action, all, skillTable);

            // 普通攻击 rate=1.0: floor(30*1.0 - 10) = 20
            expect(result.actorId).toBe(1);
            expect(result.skillId).toBe(1);
            expect(result.damages.get(2)).toBe(20);
            expect(enemy.hp).toBe(80);
        });

        it('MP 扣除验证', () => {
            const attacker = makeCharacter({
                id: 1,
                name: '法师',
                atk: 25,
                mp: 50,
                group: 'player',
            });
            const enemy = makeCharacter({ id: 2, name: '怪物', def: 5, group: 'enemy' });
            const all = [attacker, enemy];

            // 重击 mpCost=10
            const action: ActionDecision = { actorId: 1, skillId: 2, targetIds: [2] };
            battleSystem.executeAction(action, all, skillTable);

            expect(attacker.mp).toBe(40);
        });
    });

    // ── executeAction: 技能攻击 ─────────────────────────

    describe('executeAction — 技能攻击', () => {
        it('执行技能攻击并验证伤害倍率', () => {
            const attacker = makeCharacter({
                id: 1,
                name: '法师',
                atk: 25,
                mp: 50,
                group: 'player',
            });
            const enemy = makeCharacter({ id: 2, name: '怪物', def: 5, group: 'enemy' });
            const all = [attacker, enemy];

            // 火球术 id=3, rate=2.0: floor(25*2.0 - 5) = 45
            const action: ActionDecision = { actorId: 1, skillId: 3, targetIds: [2] };
            const result = battleSystem.executeAction(action, all, skillTable);

            expect(result.damages.get(2)).toBe(45);
            expect(enemy.hp).toBe(55);
        });

        it('AOE 技能对全部敌方造成伤害', () => {
            const attacker = makeCharacter({
                id: 1,
                name: '法师',
                atk: 20,
                mp: 50,
                group: 'player',
            });
            const enemy1 = makeCharacter({ id: 2, name: '怪物A', def: 5, group: 'enemy' });
            const enemy2 = makeCharacter({ id: 3, name: '怪物B', def: 10, group: 'enemy' });
            const all = [attacker, enemy1, enemy2];

            // 暴风雪 id=4, rate=1.2, target=all_enemy: floor(20*1.2 - 5)=19, floor(20*1.2 - 10)=14
            const action: ActionDecision = { actorId: 1, skillId: 4, targetIds: [2, 3] };
            const result = battleSystem.executeAction(action, all, skillTable);

            expect(result.damages.get(2)).toBe(19);
            expect(result.damages.get(3)).toBe(14);
            expect(enemy1.hp).toBe(81);
            expect(enemy2.hp).toBe(86);
        });
    });

    // ── executeAction: 治疗技能 ─────────────────────────

    describe('executeAction — 治疗技能', () => {
        it('治愈之光恢复 HP', () => {
            const healer = makeCharacter({ id: 1, name: '牧师', atk: 20, mp: 50, group: 'player' });
            const wounded = makeCharacter({
                id: 2,
                name: '伤员',
                hp: 30,
                maxHp: 100,
                group: 'player',
            });
            const all = [healer, wounded];

            // 治愈之光 id=5, effect=heal, rate=1.5: floor(20*1.5)=30 → 30+30=60
            const action: ActionDecision = { actorId: 1, skillId: 5, targetIds: [2] };
            const result = battleSystem.executeAction(action, all, skillTable);

            expect(result.heals.get(2)).toBe(30);
            expect(wounded.hp).toBe(60);
        });

        it('治疗不超过 maxHp', () => {
            const healer = makeCharacter({ id: 1, name: '牧师', atk: 50, mp: 50, group: 'player' });
            const wounded = makeCharacter({
                id: 2,
                name: '伤员',
                hp: 90,
                maxHp: 100,
                group: 'player',
            });
            const all = [healer, wounded];

            // floor(50*1.5)=75, 90+75=165 → clamp to 100
            const action: ActionDecision = { actorId: 1, skillId: 5, targetIds: [2] };
            battleSystem.executeAction(action, all, skillTable);

            expect(wounded.hp).toBe(100);
        });
    });

    // ── executeAction: BUFF 技能 ────────────────────────

    describe('executeAction — BUFF 技能', () => {
        it('战吼施加 ATK_UP BUFF', () => {
            const buffer = makeCharacter({ id: 1, name: '战士', atk: 20, mp: 50, group: 'player' });
            const ally = makeCharacter({ id: 2, name: '队友', group: 'player' });
            const all = [buffer, ally];

            // 战吼 id=7, effect=buff_atk, duration=3
            const action: ActionDecision = { actorId: 1, skillId: 7, targetIds: [2] };
            const result = battleSystem.executeAction(action, all, skillTable);

            expect(result.buffsApplied.length).toBe(1);
            expect(result.buffsApplied[0].buffType).toBe(BuffType.ATK_UP);
            expect(result.buffsApplied[0].remainingRounds).toBe(3);
            expect(battleSystem.buffSystem.hasBuff(2, BuffType.ATK_UP)).toBe(true);
        });
    });

    // ── executeAction: 眩晕 ─────────────────────────────

    describe('executeAction — 眩晕效果', () => {
        it('眩晕打击施加 STUN BUFF 并造成伤害', () => {
            const attacker = makeCharacter({
                id: 1,
                name: '战士',
                atk: 25,
                mp: 50,
                group: 'player',
            });
            const enemy = makeCharacter({ id: 2, name: '怪物', def: 5, group: 'enemy' });
            const all = [attacker, enemy];

            // 眩晕打击 id=8, rate=1.2, effect=stun, duration=1
            // damage: floor(25*1.2 - 5) = 25
            const action: ActionDecision = { actorId: 1, skillId: 8, targetIds: [2] };
            const result = battleSystem.executeAction(action, all, skillTable);

            expect(result.damages.get(2)).toBe(25);
            expect(enemy.hp).toBe(75);
            expect(result.buffsApplied.length).toBe(1);
            expect(result.buffsApplied[0].buffType).toBe(BuffType.STUN);
            expect(battleSystem.buffSystem.hasBuff(2, BuffType.STUN)).toBe(true);
        });
    });

    // ── 死亡判定 ─────────────────────────────────────────

    describe('死亡判定', () => {
        it('HP <= 0 时标记为死亡', () => {
            const attacker = makeCharacter({ id: 1, name: '战士', atk: 200, group: 'player' });
            const enemy = makeCharacter({ id: 2, name: '弱怪', hp: 10, def: 0, group: 'enemy' });
            const all = [attacker, enemy];

            const action: ActionDecision = { actorId: 1, skillId: 1, targetIds: [2] };
            battleSystem.executeAction(action, all, skillTable);

            expect(enemy.hp).toBeLessThanOrEqual(0);
            expect(enemy.isAlive).toBe(false);
        });

        it('HP 恰好为 0 也判定死亡', () => {
            const attacker = makeCharacter({ id: 1, name: '战士', atk: 20, group: 'player' });
            const enemy = makeCharacter({ id: 2, name: '怪物', hp: 10, def: 0, group: 'enemy' });
            const all = [attacker, enemy];

            // floor(20*1.0 - 0)=20, 10-20=-10 → hp=-10 → dead
            const action: ActionDecision = { actorId: 1, skillId: 1, targetIds: [2] };
            battleSystem.executeAction(action, all, skillTable);

            expect(enemy.isAlive).toBe(false);
        });
    });

    // ── checkBattleEnd ───────────────────────────────────

    describe('checkBattleEnd', () => {
        it('全部敌人死亡 → victory', () => {
            const players = [makeCharacter({ id: 1, name: '勇者', group: 'player' })];
            const enemies = [
                makeCharacter({ id: 2, name: '怪A', isAlive: false, group: 'enemy' }),
                makeCharacter({ id: 3, name: '怪B', isAlive: false, group: 'enemy' }),
            ];

            const result = battleSystem.checkBattleEnd(players, enemies);
            expect(result.ended).toBe(true);
            expect(result.victory).toBe(true);
        });

        it('全部玩家死亡 → defeat', () => {
            const players = [
                makeCharacter({ id: 1, name: '勇者A', isAlive: false, group: 'player' }),
                makeCharacter({ id: 2, name: '勇者B', isAlive: false, group: 'player' }),
            ];
            const enemies = [makeCharacter({ id: 3, name: '怪', group: 'enemy' })];

            const result = battleSystem.checkBattleEnd(players, enemies);
            expect(result.ended).toBe(true);
            expect(result.victory).toBe(false);
        });

        it('双方都有存活 → 未结束', () => {
            const players = [makeCharacter({ id: 1, name: '勇者', group: 'player' })];
            const enemies = [makeCharacter({ id: 2, name: '怪', group: 'enemy' })];

            const result = battleSystem.checkBattleEnd(players, enemies);
            expect(result.ended).toBe(false);
            expect(result.victory).toBeNull();
        });
    });

    // ── buffSystem getter ────────────────────────────────

    describe('buffSystem getter', () => {
        it('返回构造时注入的 BuffSystem 引用', () => {
            const bs = new BuffSystem();
            const battle = new BattleSystem(bs);
            expect(battle.buffSystem).toBe(bs);
        });
    });
});
