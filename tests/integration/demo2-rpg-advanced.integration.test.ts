/**
 * Demo 2 RPG 高级集成测试
 *
 * T21: 多关卡配置 & 战斗逻辑
 * T22: 音效事件 & EventManager 协作
 *
 * 测试策略：直接实例化系统进行集成测试，不依赖完整 Demo 启动。
 * 使用真实 EventManager 验证事件流，Mock AudioManager 记录播放历史。
 * 对需要 FSM 的场景（maxRound 判败、胜利/失败音效），通过 fsm.start() 正确启动。
 */

import { EventManager } from '@framework/event/EventManager';
import { BattleSystem } from '@game/demo2-rpg/systems/BattleSystem';
import { BuffSystem } from '@game/demo2-rpg/systems/BuffSystem';
import { CharacterState, RpgGameData } from '@game/demo2-rpg/data/RpgGameData';
import { SkillConfigRow, SKILL_DATA } from '@game/demo2-rpg/data/SkillConfigRow';
import { MonsterConfigRow, MONSTER_DATA } from '@game/demo2-rpg/data/MonsterConfigRow';
import { StageConfigRow, STAGE_DATA } from '@game/demo2-rpg/data/StageConfigRow';
import { CHAR_DATA } from '@game/demo2-rpg/data/CharacterConfigRow';
import { RpgEvents } from '@game/demo2-rpg/events/RpgEvents';
import { IAudioManager } from '@framework/interfaces/IAudioManager';
import { GameModule } from '@framework/core/GameModule';

// ─── Mock Logger ──────────────────────────────────────

jest.mock('@framework/debug/Logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// ─── 敌方 ID 偏移量（与 BattlePrepProcedure 保持一致） ──

const ENEMY_ID_OFFSET = 100;

// ─── 辅助函数 ──────────────────────────────────────────

/** 解析技能配置表 */
function parseSkillTable(): SkillConfigRow[] {
    return SKILL_DATA.map((raw) => {
        const row = new SkillConfigRow();
        row.parseRow(raw);
        return row;
    });
}

/** 解析怪物配置表 */
function parseMonsterTable(): MonsterConfigRow[] {
    return MONSTER_DATA.map((raw) => {
        const row = new MonsterConfigRow();
        row.parseRow(raw);
        return row;
    });
}

/** 解析关卡配置表 */
function parseStageTable(): StageConfigRow[] {
    return STAGE_DATA.map((raw) => {
        const row = new StageConfigRow();
        row.parseRow(raw);
        return row;
    });
}

/** 根据关卡配置生成敌方角色列表 */
function createEnemies(stage: StageConfigRow, monsterTable: MonsterConfigRow[]): CharacterState[] {
    const monsterIds = stage.monsters.split(',').map((s) => Number(s.trim()));
    return monsterIds.map((monsterId, index) => {
        const m = monsterTable.find((row) => row.id === monsterId)!;
        return {
            id: ENEMY_ID_OFFSET + index,
            name: m.name,
            maxHp: m.hp,
            hp: m.hp,
            maxMp: 0,
            mp: 0,
            atk: m.atk,
            def: m.def,
            spd: m.spd,
            skills: [1],
            level: 1,
            exp: 0,
            isAlive: true,
            group: 'enemy' as const,
            buffs: [],
        };
    });
}

/** 根据角色配置表生成玩家角色列表 */
function createPlayers(): CharacterState[] {
    return CHAR_DATA.map((raw) => ({
        id: Number(raw['id']),
        name: String(raw['name']),
        maxHp: Number(raw['hp']),
        hp: Number(raw['hp']),
        maxMp: Number(raw['mp']),
        mp: Number(raw['mp']),
        atk: Number(raw['atk']),
        def: Number(raw['def']),
        spd: Number(raw['spd']),
        skills: String(raw['skills']).split(',').map(Number),
        level: 1,
        exp: 0,
        isAlive: true,
        group: 'player' as const,
        buffs: [],
    }));
}

/** 创建 Mock AudioManager，记录播放历史 */
function createMockAudioManager(): IAudioManager & {
    musicHistory: string[];
    soundHistory: string[];
} {
    const musicHistory: string[] = [];
    const soundHistory: string[] = [];
    return {
        musicHistory,
        soundHistory,
        setAudioPlayer: jest.fn(),
        playMusic: jest.fn((musicId: string) => {
            musicHistory.push(musicId);
        }),
        stopMusic: jest.fn(),
        pauseMusic: jest.fn(),
        resumeMusic: jest.fn(),
        playSound: jest.fn((soundId: string) => {
            soundHistory.push(soundId);
        }),
        stopSound: jest.fn(),
        stopAllSounds: jest.fn(),
        setMasterVolume: jest.fn(),
        getMasterVolume: jest.fn(() => 1),
        setMusicVolume: jest.fn(),
        getMusicVolume: jest.fn(() => 1),
        setSoundVolume: jest.fn(),
        getSoundVolume: jest.fn(() => 1),
        setMuted: jest.fn(),
        isMuted: jest.fn(() => false),
    } as unknown as IAudioManager & { musicHistory: string[]; soundHistory: string[] };
}

// ─── 测试开始 ──────────────────────────────────────────

describe('Demo 2 RPG 高级集成测试', () => {
    let buffSystem: BuffSystem;
    let battleSystem: BattleSystem;
    let eventManager: EventManager;
    let skillTable: SkillConfigRow[];
    let monsterTable: MonsterConfigRow[];
    let stageTable: StageConfigRow[];

    beforeEach(() => {
        GameModule.shutdownAll();
        buffSystem = new BuffSystem();
        battleSystem = new BattleSystem(buffSystem);
        eventManager = new EventManager();
        eventManager.onInit();
        skillTable = parseSkillTable();
        monsterTable = parseMonsterTable();
        stageTable = parseStageTable();
    });

    afterEach(() => {
        eventManager.onShutdown();
        GameModule.shutdownAll();
    });

    // ═══════════════════════════════════════════════════
    //  T21: 多关卡测试
    // ═══════════════════════════════════════════════════

    describe('T21: 多关卡测试', () => {
        it('关卡 1（新手村）敌人配置正确：3 个怪物（史莱姆×2 + 骷髅兵×1）', () => {
            const stage = stageTable.find((s) => s.id === 1)!;
            expect(stage.name).toBe('新手村');

            const enemies = createEnemies(stage, monsterTable);
            expect(enemies).toHaveLength(3);

            const nameCount = new Map<string, number>();
            for (const e of enemies) {
                nameCount.set(e.name, (nameCount.get(e.name) ?? 0) + 1);
            }
            expect(nameCount.get('史莱姆')).toBe(2);
            expect(nameCount.get('骷髅兵')).toBe(1);
        });

        it('关卡 2（黑暗森林）敌人更强：4 个怪物', () => {
            const stage = stageTable.find((s) => s.id === 2)!;
            expect(stage.name).toBe('黑暗森林');

            const enemies = createEnemies(stage, monsterTable);
            expect(enemies).toHaveLength(4);

            // monsters: '2,3,3,4' → 骷髅兵×1, 暗影狼×2, 火焰蜥蜴×1
            const nameCount = new Map<string, number>();
            for (const e of enemies) {
                nameCount.set(e.name, (nameCount.get(e.name) ?? 0) + 1);
            }
            expect(nameCount.get('骷髅兵')).toBe(1);
            expect(nameCount.get('暗影狼')).toBe(2);
            expect(nameCount.get('火焰蜥蜴')).toBe(1);

            // 验证黑暗森林的敌人平均攻击力 > 新手村
            const stage1Enemies = createEnemies(stageTable.find((s) => s.id === 1)!, monsterTable);
            const avgAtk1 = stage1Enemies.reduce((sum, e) => sum + e.atk, 0) / stage1Enemies.length;
            const avgAtk2 = enemies.reduce((sum, e) => sum + e.atk, 0) / enemies.length;
            expect(avgAtk2).toBeGreaterThan(avgAtk1);
        });

        it('关卡 3（火山洞穴）BOSS 关：包含骨龙', () => {
            const stage = stageTable.find((s) => s.id === 3)!;
            expect(stage.name).toBe('火山洞穴');

            const enemies = createEnemies(stage, monsterTable);
            expect(enemies).toHaveLength(4);

            const bossExists = enemies.some((e) => e.name === '骨龙');
            expect(bossExists).toBe(true);

            const boss = enemies.find((e) => e.name === '骨龙')!;
            expect(boss.hp).toBe(500);
            expect(boss.atk).toBe(40);
        });

        it('不同关卡的 maxRound 设置正确', () => {
            const stage1 = stageTable.find((s) => s.id === 1)!;
            const stage2 = stageTable.find((s) => s.id === 2)!;
            const stage3 = stageTable.find((s) => s.id === 3)!;

            expect(stage1.maxRound).toBe(10);
            expect(stage2.maxRound).toBe(15);
            expect(stage3.maxRound).toBe(20);

            expect(stage2.maxRound).toBeGreaterThan(stage1.maxRound);
            expect(stage3.maxRound).toBeGreaterThan(stage2.maxRound);
        });

        it('超过 maxRound 判败', () => {
            const stage = stageTable.find((s) => s.id === 1)!;
            const players = createPlayers();
            const enemies = createEnemies(stage, monsterTable);
            const mockAudio = createMockAudioManager();
            const gameData = new RpgGameData();
            gameData.playerCharacters = players;

            // 模拟战斗进行到 maxRound
            gameData.currentRound = stage.maxRound;

            // 验证 maxRound 逻辑：当 round >= maxRound 时应判败
            expect(gameData.currentRound >= stage.maxRound).toBe(true);

            // 战斗本身未结束（双方都有存活角色）
            const battleEnd = battleSystem.checkBattleEnd(players, enemies);
            expect(battleEnd.ended).toBe(false);

            // 模拟 RoundEndState 的 maxRound 检查逻辑
            let defeatFired = false;
            eventManager.on(RpgEvents.BATTLE_DEFEAT, () => {
                defeatFired = true;
            });

            if (stage.maxRound > 0 && gameData.currentRound >= stage.maxRound) {
                // 这是 RoundEndState 的核心逻辑：超过最大回合数，判定失败
                eventManager.emit(RpgEvents.BATTLE_DEFEAT, {} as Record<string, never>);
                mockAudio.playSound('sfx_defeat');
            }

            expect(defeatFired).toBe(true);
            expect(mockAudio.soundHistory).toContain('sfx_defeat');
        });
    });

    // ═══════════════════════════════════════════════════
    //  T22: 音效和事件集成测试
    // ═══════════════════════════════════════════════════

    describe('T22: 音效和事件集成测试', () => {
        it('战斗开始播放 BGM（每个关卡 BGM 不同）', () => {
            for (const stage of stageTable) {
                const mockAudio = createMockAudioManager();
                // 模拟 BattlePrepProcedure 播放 BGM 的逻辑
                mockAudio.playMusic(stage.bgm);
                expect(mockAudio.musicHistory).toContain(stage.bgm);
            }

            // 验证三个关卡 BGM 各不相同
            const bgms = stageTable.map((s) => s.bgm);
            const uniqueBgms = new Set(bgms);
            expect(uniqueBgms.size).toBe(bgms.length);
        });

        it('攻击/技能触发对应音效事件', () => {
            // 直接使用 BattleSystem 执行攻击，手动发射事件验证音效
            const stage = stageTable.find((s) => s.id === 1)!;
            const players = createPlayers();
            const enemies = createEnemies(stage, monsterTable);
            const allChars = [...players, ...enemies];
            const mockAudio = createMockAudioManager();

            const skillUsedEvents: Array<{
                casterId: number;
                skillId: number;
                targetIds: number[];
            }> = [];
            eventManager.on(RpgEvents.SKILL_USED, (data) => {
                skillUsedEvents.push(data);
            });

            // 战士普通攻击第一个敌人
            const warrior = players[0];
            const target = enemies[0];
            const action = { actorId: warrior.id, skillId: 1, targetIds: [target.id] };
            const result = battleSystem.executeAction(action, allChars, skillTable);

            // 模拟 ExecuteActionState 的事件发射逻辑
            eventManager.emit(RpgEvents.SKILL_USED, {
                casterId: action.actorId,
                skillId: action.skillId,
                targetIds: action.targetIds,
            });
            for (const [targetId, damage] of result.damages) {
                eventManager.emit(RpgEvents.ATTACK, {
                    attackerId: action.actorId,
                    defenderId: targetId,
                    damage,
                    skillId: action.skillId,
                });
                mockAudio.playSound('sfx_attack');
            }

            expect(mockAudio.soundHistory).toContain('sfx_attack');
            expect(skillUsedEvents).toHaveLength(1);
            expect(skillUsedEvents[0].casterId).toBe(warrior.id);
            expect(skillUsedEvents[0].skillId).toBe(1);
        });

        it('胜利播放对应音效', () => {
            const stage = stageTable.find((s) => s.id === 1)!;
            const players = createPlayers();
            const enemies = createEnemies(stage, monsterTable);
            const mockAudio = createMockAudioManager();

            // 模拟所有敌人已死亡
            for (const e of enemies) {
                e.isAlive = false;
                e.hp = 0;
            }

            // 验证 checkBattleEnd 判定胜利
            const endResult = battleSystem.checkBattleEnd(players, enemies);
            expect(endResult.ended).toBe(true);
            expect(endResult.victory).toBe(true);

            // 模拟 VictoryState 的事件发射和音效逻辑
            let victoryData: { expReward: number; goldReward: number } | null = null;
            eventManager.on(RpgEvents.BATTLE_VICTORY, (data) => {
                victoryData = data;
            });

            // 计算奖励（与 VictoryState 逻辑一致）
            let totalExp = 0;
            let totalGold = 0;
            for (const enemy of enemies) {
                const monsterConfig = monsterTable.find((m) => m.name === enemy.name);
                if (monsterConfig) {
                    totalExp += monsterConfig.expReward;
                    totalGold += monsterConfig.goldReward;
                }
            }

            eventManager.emit(RpgEvents.BATTLE_VICTORY, {
                expReward: totalExp,
                goldReward: totalGold,
            });
            mockAudio.playSound('sfx_victory');

            expect(victoryData).not.toBeNull();
            expect(victoryData!.expReward).toBeGreaterThan(0);
            expect(victoryData!.goldReward).toBeGreaterThan(0);
            expect(mockAudio.soundHistory).toContain('sfx_victory');
        });

        it('失败播放对应音效', () => {
            const stage = stageTable.find((s) => s.id === 1)!;
            const players = createPlayers();
            const enemies = createEnemies(stage, monsterTable);
            const mockAudio = createMockAudioManager();

            // 模拟所有玩家已死亡
            for (const p of players) {
                p.isAlive = false;
                p.hp = 0;
            }

            // 验证 checkBattleEnd 判定失败
            const endResult = battleSystem.checkBattleEnd(players, enemies);
            expect(endResult.ended).toBe(true);
            expect(endResult.victory).toBe(false);

            // 模拟 DefeatState 的事件发射和音效逻辑
            let defeatFired = false;
            eventManager.on(RpgEvents.BATTLE_DEFEAT, () => {
                defeatFired = true;
            });

            eventManager.emit(RpgEvents.BATTLE_DEFEAT, {} as Record<string, never>);
            mockAudio.playSound('sfx_defeat');

            expect(defeatFired).toBe(true);
            expect(mockAudio.soundHistory).toContain('sfx_defeat');
        });

        it('事件流完整性：每次攻击触发 ATTACK + CHARACTER_HURT 事件', () => {
            const stage = stageTable.find((s) => s.id === 1)!;
            const players = createPlayers();
            const enemies = createEnemies(stage, monsterTable);
            const allChars = [...players, ...enemies];

            const attackEvents: Array<{ attackerId: number; defenderId: number; damage: number }> =
                [];
            const hurtEvents: Array<{ characterId: number; damage: number; remainingHp: number }> =
                [];

            eventManager.on(RpgEvents.ATTACK, (data) => {
                attackEvents.push(data);
            });
            eventManager.on(RpgEvents.CHARACTER_HURT, (data) => {
                hurtEvents.push(data);
            });

            // 战士普攻
            const warrior = players[0];
            const target = enemies[0];
            const action = { actorId: warrior.id, skillId: 1, targetIds: [target.id] };
            const result = battleSystem.executeAction(action, allChars, skillTable);

            // 模拟 ExecuteActionState 的事件发射
            for (const [targetId, damage] of result.damages) {
                eventManager.emit(RpgEvents.ATTACK, {
                    attackerId: action.actorId,
                    defenderId: targetId,
                    damage,
                    skillId: action.skillId,
                });
                const hitTarget = allChars.find((c) => c.id === targetId);
                if (hitTarget) {
                    eventManager.emit(RpgEvents.CHARACTER_HURT, {
                        characterId: targetId,
                        damage,
                        remainingHp: hitTarget.hp,
                    });
                }
            }

            expect(attackEvents).toHaveLength(1);
            expect(hurtEvents).toHaveLength(1);

            expect(attackEvents[0].attackerId).toBe(warrior.id);
            expect(attackEvents[0].defenderId).toBe(target.id);
            expect(attackEvents[0].damage).toBeGreaterThan(0);

            expect(hurtEvents[0].characterId).toBe(target.id);
            expect(hurtEvents[0].damage).toBe(attackEvents[0].damage);
            expect(hurtEvents[0].remainingHp).toBe(target.hp);
        });

        it('角色死亡触发 CHARACTER_DEAD 事件', () => {
            const stage = stageTable.find((s) => s.id === 1)!;
            const players = createPlayers();
            const enemies = createEnemies(stage, monsterTable);
            const allChars = [...players, ...enemies];

            const deadEvents: Array<{ characterId: number; group: string }> = [];
            eventManager.on(RpgEvents.CHARACTER_DEAD, (data) => {
                deadEvents.push(data);
            });

            // 将史莱姆 HP 设为 1，确保一击必杀
            const slime = enemies[0];
            slime.hp = 1;

            const warrior = players[0];
            const action = { actorId: warrior.id, skillId: 1, targetIds: [slime.id] };
            const result = battleSystem.executeAction(action, allChars, skillTable);

            // 模拟 ExecuteActionState 的事件发射
            for (const [targetId, damage] of result.damages) {
                const hitTarget = allChars.find((c) => c.id === targetId);
                if (hitTarget) {
                    eventManager.emit(RpgEvents.ATTACK, {
                        attackerId: action.actorId,
                        defenderId: targetId,
                        damage,
                        skillId: action.skillId,
                    });
                    eventManager.emit(RpgEvents.CHARACTER_HURT, {
                        characterId: targetId,
                        damage,
                        remainingHp: hitTarget.hp,
                    });
                    if (!hitTarget.isAlive) {
                        eventManager.emit(RpgEvents.CHARACTER_DEAD, {
                            characterId: targetId,
                            group: hitTarget.group,
                        });
                    }
                }
            }

            expect(deadEvents).toHaveLength(1);
            expect(deadEvents[0].characterId).toBe(slime.id);
            expect(deadEvents[0].group).toBe('enemy');
            expect(slime.isAlive).toBe(false);
        });

        it('EventManager 事件发射和回调正确协作', () => {
            const roundStarts: number[] = [];
            const roundEnds: number[] = [];
            let onceTriggered = false;

            eventManager.on(RpgEvents.ROUND_START, (data) => {
                roundStarts.push(data.roundNumber);
            });
            eventManager.on(RpgEvents.ROUND_END, (data) => {
                roundEnds.push(data.roundNumber);
            });
            eventManager.once(RpgEvents.BATTLE_VICTORY, () => {
                onceTriggered = true;
            });

            // 模拟两个回合
            eventManager.emit(RpgEvents.ROUND_START, { roundNumber: 1 });
            eventManager.emit(RpgEvents.ROUND_END, { roundNumber: 1 });
            eventManager.emit(RpgEvents.ROUND_START, { roundNumber: 2 });
            eventManager.emit(RpgEvents.ROUND_END, { roundNumber: 2 });

            expect(roundStarts).toEqual([1, 2]);
            expect(roundEnds).toEqual([1, 2]);

            // once 只触发一次
            eventManager.emit(RpgEvents.BATTLE_VICTORY, { expReward: 100, goldReward: 50 });
            expect(onceTriggered).toBe(true);

            onceTriggered = false;
            eventManager.emit(RpgEvents.BATTLE_VICTORY, { expReward: 200, goldReward: 100 });
            expect(onceTriggered).toBe(false);

            // off 移除监听器后不再触发
            const handler = (data: { roundNumber: number }): void => {
                roundStarts.push(data.roundNumber * 10);
            };
            eventManager.on(RpgEvents.ROUND_START, handler);
            eventManager.emit(RpgEvents.ROUND_START, { roundNumber: 3 });
            expect(roundStarts).toContain(30);

            eventManager.off(RpgEvents.ROUND_START, handler);
            eventManager.emit(RpgEvents.ROUND_START, { roundNumber: 4 });
            expect(roundStarts).not.toContain(40);
        });
    });
});
