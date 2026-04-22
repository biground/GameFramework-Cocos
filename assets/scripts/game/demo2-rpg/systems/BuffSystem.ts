/**
 * BUFF 系统
 *
 * 按角色 ID 隔离存储，负责 BUFF 的施加、刷新、回合衰减与移除。
 * @module
 */

import { BuffState, BuffType } from '../data/RpgGameData';
import { Logger } from '@framework/debug/Logger';

const TAG = 'BuffSystem';

/**
 * BUFF 管理系统
 *
 * 提供按角色 ID 隔离的 BUFF 施加、回合衰减、查询等功能。
 * 同类型 BUFF 刷新持续时间和数值，而非叠加。
 */
export class BuffSystem {
    /** 按角色 ID 隔离的 BUFF 存储 */
    private _buffs: Map<number, BuffState[]> = new Map();

    /**
     * 应用 BUFF（同类型刷新持续时间而非叠加）
     * @param targetId - 目标角色 ID
     * @param buffType - BUFF 类型
     * @param duration - 持续回合数
     * @param value - BUFF 数值
     */
    applyBuff(targetId: number, buffType: BuffType, duration: number, value: number): void {
        let list = this._buffs.get(targetId);
        if (!list) {
            list = [];
            this._buffs.set(targetId, list);
        }

        const existing = list.find((b) => b.buffType === buffType);
        if (existing) {
            existing.remainingRounds = duration;
            existing.value = value;
            Logger.debug(
                TAG,
                `刷新角色${targetId}的${buffType}，剩余${duration}回合，数值${value}`,
            );
        } else {
            list.push({ buffType, remainingRounds: duration, value });
            Logger.debug(
                TAG,
                `给角色${targetId}施加${buffType}，持续${duration}回合，数值${value}`,
            );
        }
    }

    /**
     * 回合递减，返回过期的 BUFF 列表
     * @param targetId - 目标角色 ID
     * @returns 本回合过期的 BUFF 列表
     */
    tickBuffs(targetId: number): BuffState[] {
        const list = this._buffs.get(targetId);
        if (!list || list.length === 0) {
            return [];
        }

        const expired: BuffState[] = [];
        for (const buff of list) {
            buff.remainingRounds--;
            if (buff.remainingRounds <= 0) {
                expired.push({ ...buff });
            }
        }

        if (expired.length > 0) {
            this._buffs.set(
                targetId,
                list.filter((b) => b.remainingRounds > 0),
            );
            Logger.debug(TAG, `角色${targetId}移除了${expired.length}个过期BUFF`);
        }

        return expired;
    }

    /**
     * 查询当前活跃 BUFF
     * @param targetId - 目标角色 ID
     * @returns 当前活跃的 BUFF 列表（副本）
     */
    getActiveBuffs(targetId: number): BuffState[] {
        const list = this._buffs.get(targetId);
        if (!list) {
            return [];
        }
        return list.map((b) => ({ ...b }));
    }

    /**
     * 获取指定 BUFF 的数值（无则返回 0）
     * @param targetId - 目标角色 ID
     * @param buffType - BUFF 类型
     * @returns BUFF 数值，无该 BUFF 时返回 0
     */
    getBuffValue(targetId: number, buffType: BuffType): number {
        const list = this._buffs.get(targetId);
        if (!list) {
            return 0;
        }
        const buff = list.find((b) => b.buffType === buffType);
        return buff ? buff.value : 0;
    }

    /**
     * 检查是否有指定 BUFF
     * @param targetId - 目标角色 ID
     * @param buffType - BUFF 类型
     * @returns 是否存在该 BUFF
     */
    hasBuff(targetId: number, buffType: BuffType): boolean {
        const list = this._buffs.get(targetId);
        if (!list) {
            return false;
        }
        return list.some((b) => b.buffType === buffType);
    }

    /**
     * 清除角色所有 BUFF
     * @param targetId - 目标角色 ID
     */
    clearBuffs(targetId: number): void {
        this._buffs.delete(targetId);
        Logger.debug(TAG, `清除角色${targetId}的所有BUFF`);
    }

    /**
     * 清除所有角色的 BUFF（战斗结束时用）
     */
    clearAll(): void {
        this._buffs.clear();
        Logger.debug(TAG, '清除所有角色的BUFF');
    }
}
