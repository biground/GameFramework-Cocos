/**
 * RPG Demo — 游戏运行时状态数据
 *
 * 包含角色状态、BUFF、战斗行动等运行时数据结构。
 * @module
 */

// ─── 枚举定义 ──────────────────────────────────────────

/** BUFF 类型枚举 */
export enum BuffType {
    /** 攻击力提升 */
    ATK_UP = 'atk_up',
    /** 防御力提升 */
    DEF_UP = 'def_up',
    /** 眩晕（无法行动） */
    STUN = 'stun',
}

// ─── 接口定义 ──────────────────────────────────────────

/** BUFF 状态 */
export interface BuffState {
    /** BUFF 类型 */
    buffType: BuffType;
    /** 剩余回合数 */
    remainingRounds: number;
    /** BUFF 数值 */
    value: number;
}

/** 角色运行时状态 */
export interface CharacterState {
    /** 角色唯一 ID */
    id: number;
    /** 角色名称 */
    name: string;
    /** 最大生命值 */
    maxHp: number;
    /** 当前生命值 */
    hp: number;
    /** 最大魔法值 */
    maxMp: number;
    /** 当前魔法值 */
    mp: number;
    /** 攻击力 */
    atk: number;
    /** 防御力 */
    def: number;
    /** 速度 */
    spd: number;
    /** 技能 ID 列表 */
    skills: number[];
    /** 等级 */
    level: number;
    /** 经验值 */
    exp: number;
    /** 是否存活 */
    isAlive: boolean;
    /** 阵营：玩家 / 敌方 */
    group: 'player' | 'enemy';
    /** 当前 BUFF 列表 */
    buffs: BuffState[];
}

/** 行动决策 */
export interface ActionDecision {
    /** 行动者 ID */
    actorId: number;
    /** 使用的技能 ID */
    skillId: number;
    /** 目标 ID 列表 */
    targetIds: number[];
}

/** 行动结果 */
export interface ActionResult {
    /** 行动者 ID */
    actorId: number;
    /** 使用的技能 ID */
    skillId: number;
    /** 目标 ID 列表 */
    targetIds: number[];
    /** 伤害映射：目标 ID → 伤害值 */
    damages: Map<number, number>;
    /** 治疗映射：目标 ID → 治疗值 */
    heals: Map<number, number>;
    /** 施加的 BUFF 列表 */
    buffsApplied: BuffState[];
    /** 效果描述 */
    effectApplied: string;
}

/** 战斗结束结果 */
export interface BattleEndResult {
    /** 战斗是否已结束 */
    ended: boolean;
    /** 是否胜利（null 表示未结束） */
    victory: boolean | null;
}

// ─── 实现类 ────────────────────────────────────────────

/**
 * RPG 游戏运行时数据
 *
 * 维护金币、经验、队伍角色、战斗回合等运行时状态。
 */
export class RpgGameData {
    /** 当前金币 */
    gold: number = 0;
    /** 累计经验 */
    totalExp: number = 0;
    /** 当前选中的关卡 ID */
    selectedStageId: number = 1;
    /** 玩家队伍角色列表 */
    playerCharacters: CharacterState[] = [];
    /** 当前战斗回合数 */
    currentRound: number = 0;
    /** 战斗日志 */
    battleLog: string[] = [];

    /**
     * 重置所有运行时状态为默认值
     */
    reset(): void {
        this.gold = 0;
        this.totalExp = 0;
        this.selectedStageId = 1;
        this.playerCharacters = [];
        this.currentRound = 0;
        this.battleLog = [];
    }
}
