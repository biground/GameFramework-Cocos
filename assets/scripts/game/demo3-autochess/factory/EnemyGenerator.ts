/**
 * 敌方棋子生成器
 *
 * 根据当前回合数和配置表生成敌方棋子阵容。
 * round 越高，棋子数量越多、星级越高。
 * @module
 */

import { ChessPieceRuntimeState, IChessPieceConfig } from '../data/AutoChessGameData';
import { ENEMY_ROWS, BOARD_COLS } from '../AutoChessDefs';
import { Logger } from '../../../framework/debug/Logger';

/** 日志标签 */
const TAG = 'EnemyGenerator';

/** 最少敌方棋子数 */
const MIN_ENEMIES = 2;

/** 最多敌方棋子数 */
const MAX_ENEMIES = 6;

/** 出现 2 星的最低回合 */
const STAR2_MIN_ROUND = 5;

/** 高回合 2 星概率（round >= STAR2_MIN_ROUND 时） */
const STAR2_BASE_CHANCE = 0.15;

/** 每多 1 回合增加的 2 星概率 */
const STAR2_CHANCE_PER_ROUND = 0.05;

/** 自增 ID 计数器 */
let _nextEnemyId = 10000;

/**
 * 敌方棋子工厂
 *
 * 纯静态工具类，根据 round 和棋子配置表生成敌方阵容。
 */
export class EnemyGenerator {
    /**
     * 重置内部 ID 计数器（测试用）
     */
    static resetIdCounter(): void {
        _nextEnemyId = 10000;
    }

    /**
     * 根据回合和配置表生成敌方棋子列表
     *
     * @param round 当前回合数（从 1 开始）
     * @param configs 棋子配置表
     * @returns 敌方棋子运行时状态列表
     */
    static generate(round: number, configs: IChessPieceConfig[]): ChessPieceRuntimeState[] {
        if (configs.length === 0) {
            Logger.warn(TAG, '配置表为空，无法生成敌方棋子');
            return [];
        }

        // 计算棋子数量：基础 2 个，每 2 回合 +1，上限 MAX_ENEMIES
        const count = Math.min(MIN_ENEMIES + Math.floor(round / 2), MAX_ENEMIES);
        const enemies: ChessPieceRuntimeState[] = [];

        // 收集可用位置（敌方区域）
        const availablePositions: { row: number; col: number }[] = [];
        for (const row of ENEMY_ROWS) {
            for (let col = 0; col < BOARD_COLS; col++) {
                availablePositions.push({ row, col });
            }
        }

        // 打乱位置
        for (let i = availablePositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availablePositions[i], availablePositions[j]] = [
                availablePositions[j],
                availablePositions[i],
            ];
        }

        for (let i = 0; i < count && i < availablePositions.length; i++) {
            // 随机选取配置
            const config = configs[Math.floor(Math.random() * configs.length)];

            // 判定星级
            let star = 1;
            if (round >= STAR2_MIN_ROUND) {
                const chance =
                    STAR2_BASE_CHANCE + (round - STAR2_MIN_ROUND) * STAR2_CHANCE_PER_ROUND;
                if (Math.random() < chance) {
                    star = 2;
                }
            }

            const mult = star >= 2 ? config.star2Mult : 1;
            const pos = availablePositions[i];

            const piece: ChessPieceRuntimeState = {
                id: _nextEnemyId++,
                configId: config.id,
                name: config.name,
                race: config.race,
                hp: config.hp * mult,
                maxHp: config.hp * mult,
                atk: config.atk * mult,
                atkSpeed: config.atkSpeed,
                range: config.range,
                star,
                side: 'enemy',
                position: { row: pos.row, col: pos.col },
                isAlive: true,
            };

            enemies.push(piece);
        }

        Logger.info(TAG, `回合 ${round}: 生成 ${enemies.length} 个敌方棋子`);
        return enemies;
    }
}
