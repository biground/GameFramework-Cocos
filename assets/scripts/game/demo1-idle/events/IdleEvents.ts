/**
 * Idle Clicker Demo — 事件键定义
 *
 * 使用框架 EventKey<T> 的幻影类型机制，为所有游戏事件提供编译期类型安全。
 * @module
 */

import { EventKey } from '@framework/event/EventDefs';

// ─── 金币相关 ──────────────────────────────────────────

/** 金币数量变化 */
export const GOLD_CHANGED = new EventKey<{ oldGold: number; newGold: number }>('idle:gold_changed');

/** 手动点击挖矿获取金币 */
export const CLICK_MINE = new EventKey<{ amount: number }>('idle:click_mine');

// ─── 建筑相关 ──────────────────────────────────────────

/** 购买建筑 */
export const BUILDING_PURCHASED = new EventKey<{ buildingId: number; cost: number }>('idle:building_purchased');

/** 建筑升级 */
export const BUILDING_UPGRADED = new EventKey<{
    buildingId: number;
    oldLevel: number;
    newLevel: number;
    cost: number;
}>('idle:building_upgraded');

/** 建筑产出金币 */
export const BUILDING_OUTPUT = new EventKey<{ buildingId: number; amount: number }>('idle:building_output');

// ─── 成就相关 ──────────────────────────────────────────

/** 成就解锁 */
export const ACHIEVEMENT_UNLOCKED = new EventKey<{ achievementId: number; reward: number }>('idle:achievement_unlocked');

// ─── 离线 & 存档 ───────────────────────────────────────

/** 离线收益结算 */
export const OFFLINE_REWARD = new EventKey<{ offlineSeconds: number; totalReward: number }>('idle:offline_reward');

/** 游戏已保存 */
export const GAME_SAVED = new EventKey<{ timestamp: number }>('idle:game_saved');

// ─── 流程相关 ──────────────────────────────────────────

/** Procedure 切换 */
export const PROCEDURE_CHANGED = new EventKey<{ from: string; to: string }>('idle:procedure_changed');
