/**
 * 羁绊系统（SynergySystem）
 *
 * 负责检测场上棋子种族分布，判断羁绊是否激活，
 * 以及应用/移除羁绊加成 buff。
 * @module
 */

import { ChessPieceRuntimeState, ActiveSynergy } from '../data/AutoChessGameData';
import { SynergyConfigRow } from '../data/SynergyConfigRow';
import { Logger } from '../../../framework/debug/Logger';

/** 日志标签 */
const TAG = 'SynergySystem';

/** 棋子基础属性快照，用于移除 buff 时恢复 */
interface BaseStats {
    atk: number;
    maxHp: number;
    hp: number;
    atkSpeed: number;
}

/**
 * 羁绊系统
 *
 * 提供羁绊计算、buff 应用与移除功能。
 */
export class SynergySystem {
    /** 棋子 ID → 基础属性快照（apply 前记录，remove 时恢复） */
    private _baseStatsMap: Map<number, BaseStats> = new Map();

    /**
     * 计算所有羁绊状态
     *
     * 统计场上存活棋子的种族数量，对照配置中的 threshold 判断是否激活。
     *
     * @param pieces - 场上所有棋子
     * @param configs - 羁绊配置列表
     * @returns 所有羁绊的状态列表
     */
    calculateSynergies(
        pieces: ChessPieceRuntimeState[],
        configs: SynergyConfigRow[],
    ): ActiveSynergy[] {
        // 统计存活棋子的种族数量
        const raceCounts = new Map<string, number>();
        for (const piece of pieces) {
            if (!piece.isAlive) {
                continue;
            }
            raceCounts.set(piece.race, (raceCounts.get(piece.race) ?? 0) + 1);
        }

        // 对照配置判断激活状态
        const result: ActiveSynergy[] = [];
        for (const config of configs) {
            const count = raceCounts.get(config.race) ?? 0;
            const isActive = count >= config.threshold;
            result.push({
                race: config.race,
                count,
                threshold: config.threshold,
                effect: config.effect,
                value: config.value,
                isActive,
            });

            if (isActive) {
                Logger.debug(
                    TAG,
                    `羁绊激活: ${config.race} (${count}/${config.threshold}) → ${config.effect} +${config.value}%`,
                );
            }
        }

        return result;
    }

    /**
     * 应用羁绊加成
     *
     * 对所有匹配种族的存活棋子应用 buff，并记录基础属性以便恢复。
     * - atk_boost: atk += baseAtk * value / 100
     * - hp_boost: maxHp += baseHp * value / 100, hp += bonus
     * - spd_boost: atkSpeed *= (1 - value / 100)
     *
     * @param pieces - 场上所有棋子
     * @param synergies - 羁绊状态列表
     */
    applySynergyBuffs(pieces: ChessPieceRuntimeState[], synergies: ActiveSynergy[]): void {
        // 筛选激活的羁绊
        const activeMap = new Map<string, ActiveSynergy>();
        for (const syn of synergies) {
            if (syn.isActive) {
                activeMap.set(syn.race, syn);
            }
        }

        if (activeMap.size === 0) {
            return;
        }

        for (const piece of pieces) {
            if (!piece.isAlive) {
                continue;
            }

            const syn = activeMap.get(piece.race);
            if (!syn) {
                continue;
            }

            // 记录基础属性（仅在未记录时）
            if (!this._baseStatsMap.has(piece.id)) {
                this._baseStatsMap.set(piece.id, {
                    atk: piece.atk,
                    maxHp: piece.maxHp,
                    hp: piece.hp,
                    atkSpeed: piece.atkSpeed,
                });
            }

            const base = this._baseStatsMap.get(piece.id)!;
            this._applyEffect(piece, base, syn.effect, syn.value);
        }
    }

    /**
     * 移除所有羁绊加成，恢复原始属性
     *
     * @param pieces - 场上所有棋子
     */
    removeSynergyBuffs(pieces: ChessPieceRuntimeState[]): void {
        for (const piece of pieces) {
            const base = this._baseStatsMap.get(piece.id);
            if (!base) {
                continue;
            }

            piece.atk = base.atk;
            piece.maxHp = base.maxHp;
            piece.atkSpeed = base.atkSpeed;
            // hp 不超过恢复后的 maxHp
            piece.hp = Math.min(piece.hp, base.maxHp);

            this._baseStatsMap.delete(piece.id);
        }

        Logger.debug(TAG, '已移除所有羁绊加成');
    }

    /**
     * 过滤返回仅已激活的羁绊
     *
     * @param synergies - 羁绊状态列表
     * @returns 已激活的羁绊
     */
    getActiveSynergies(synergies: ActiveSynergy[]): ActiveSynergy[] {
        return synergies.filter((s) => s.isActive);
    }

    /**
     * 应用单个效果到棋子
     *
     * @param piece - 目标棋子
     * @param base - 基础属性快照
     * @param effect - 效果类型
     * @param value - 加成百分比
     */
    private _applyEffect(
        piece: ChessPieceRuntimeState,
        base: BaseStats,
        effect: string,
        value: number,
    ): void {
        switch (effect) {
            case 'atk_boost': {
                const bonus = Math.floor((base.atk * value) / 100);
                piece.atk = base.atk + bonus;
                Logger.debug(TAG, `${piece.name}#${piece.id} ATK: ${base.atk} → ${piece.atk}`);
                break;
            }
            case 'hp_boost': {
                const bonus = Math.floor((base.maxHp * value) / 100);
                piece.maxHp = base.maxHp + bonus;
                piece.hp = piece.hp + bonus;
                Logger.debug(TAG, `${piece.name}#${piece.id} HP: ${base.maxHp} → ${piece.maxHp}`);
                break;
            }
            case 'spd_boost': {
                piece.atkSpeed = base.atkSpeed * (1 - value / 100);
                Logger.debug(
                    TAG,
                    `${piece.name}#${piece.id} SPD: ${base.atkSpeed} → ${piece.atkSpeed.toFixed(3)}`,
                );
                break;
            }
            default:
                Logger.warn(TAG, `未知效果类型: ${effect}`);
        }
    }
}
