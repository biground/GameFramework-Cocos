/**
 * Idle Clicker Demo — 游戏运行时状态数据
 *
 * 包含运行时状态接口、序列化/反序列化逻辑。
 * @module
 */

// ─── 接口定义 ──────────────────────────────────────────

/** 单个建筑的运行时状态 */
export interface IBuildingState {
    /** 建筑配置 ID */
    id: number;
    /** 当前等级（0 = 未购买） */
    level: number;
    /** 是否已拥有（已购买） */
    owned: boolean;
    /** 是否正在升级中 */
    isUpgrading: boolean;
    /** 升级开始时间戳（毫秒，用于升级 Timer） */
    upgradeStartTime: number;
}

/** 游戏运行时完整状态 */
export interface IIdleGameData {
    /** 当前金币 */
    gold: number;
    /** 历史累计获得金币总量 */
    totalGoldEarned: number;
    /** 手动点击单次金币收益 */
    clickPower: number;
    /** 各建筑状态 */
    buildings: IBuildingState[];
    /** 已解锁的成就 ID 列表 */
    unlockedAchievements: number[];
    /** 上次存档时间戳（毫秒） */
    lastSaveTime: number;
    /** 上次在线时间戳（毫秒） */
    lastOnlineTime: number;
}

// ─── 实现类 ────────────────────────────────────────────

/**
 * 游戏状态数据实现类
 *
 * 提供默认值、JSON 序列化/反序列化和重置功能。
 */
export class IdleGameData implements IIdleGameData {
    /** 当前金币 */
    gold = 0;
    /** 历史累计获得金币总量 */
    totalGoldEarned = 0;
    /** 手动点击单次金币收益 */
    clickPower = 1;
    /** 各建筑状态 */
    buildings: IBuildingState[] = [];
    /** 已解锁的成就 ID 列表 */
    unlockedAchievements: number[] = [];
    /** 上次存档时间戳（毫秒） */
    lastSaveTime = 0;
    /** 上次在线时间戳（毫秒） */
    lastOnlineTime = 0;

    /**
     * 从 JSON 字符串反序列化为 IdleGameData 实例
     * @param json 序列化的 JSON 字符串
     * @returns 反序列化后的游戏状态
     */
    static fromJSON(json: string): IdleGameData {
        const raw: unknown = JSON.parse(json);
        if (typeof raw !== 'object' || raw === null) {
            throw new Error('[IdleGameData] 无效的存档数据');
        }

        const obj = raw as Record<string, unknown>;
        const data = new IdleGameData();

        data.gold = Number(obj['gold'] ?? 0);
        data.totalGoldEarned = Number(obj['totalGoldEarned'] ?? 0);
        data.clickPower = Number(obj['clickPower'] ?? 1);
        data.lastSaveTime = Number(obj['lastSaveTime'] ?? 0);
        data.lastOnlineTime = Number(obj['lastOnlineTime'] ?? 0);

        if (Array.isArray(obj['buildings'])) {
            data.buildings = (obj['buildings'] as Record<string, unknown>[]).map((b) => ({
                id: Number(b['id'] ?? 0),
                level: Number(b['level'] ?? 0),
                owned: Boolean(b['owned']),
                isUpgrading: Boolean(b['isUpgrading']),
                upgradeStartTime: Number(b['upgradeStartTime'] ?? 0),
            }));
        }

        if (Array.isArray(obj['unlockedAchievements'])) {
            data.unlockedAchievements = (obj['unlockedAchievements'] as unknown[]).map(Number);
        }

        return data;
    }

    /**
     * 序列化为 JSON 字符串
     * @returns JSON 字符串
     */
    toJSON(): string {
        return JSON.stringify({
            gold: this.gold,
            totalGoldEarned: this.totalGoldEarned,
            clickPower: this.clickPower,
            buildings: this.buildings,
            unlockedAchievements: this.unlockedAchievements,
            lastSaveTime: this.lastSaveTime,
            lastOnlineTime: this.lastOnlineTime,
        });
    }

    /**
     * 重置为初始状态
     */
    reset(): void {
        this.gold = 0;
        this.totalGoldEarned = 0;
        this.clickPower = 1;
        this.buildings = [];
        this.unlockedAchievements = [];
        this.lastSaveTime = 0;
        this.lastOnlineTime = 0;
    }
}
