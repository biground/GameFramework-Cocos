/**
 * Auto-chess Lite Demo — 合成系统
 *
 * 实现 3 合 1 升星逻辑：3 个同名 ★1 棋子合成为 1 个 ★2 棋子，属性按倍率提升。
 * @module
 */

import { Logger } from '../../../framework/debug/Logger';
import { ChessPieceRuntimeState, MergeResult } from '../data/AutoChessGameData';

/** 合成所需的同名棋子数量 */
const MERGE_COUNT = 3;

/**
 * 合成系统
 *
 * 负责检测可合成的棋子组合并执行 3 合 1 升星操作。
 */
export class MergeSystem {
    private static readonly TAG = 'MergeSystem';

    /**
     * 检查并执行合成
     *
     * 遍历所有 ★1 棋子，按 name 分组计数。
     * 如果某个 name 有 ≥3 个 ★1 棋子，取前 3 个合成为 ★2。
     *
     * @param pieces 所有棋子列表（bench + board 扁平列表）
     * @param star2Mult ★2 属性倍率
     * @returns 合成结果，无可合成棋子时返回 null
     */
    checkAndMerge(pieces: ChessPieceRuntimeState[], star2Mult: number): MergeResult | null {
        const candidates = this.findMergeCandidates(pieces);

        if (candidates.size === 0) {
            return null;
        }

        // 取第一个满足条件的分组
        const [name, group] = candidates.entries().next().value!;
        const consumed = group.slice(0, MERGE_COUNT);
        const consumedIds = consumed.map((p) => p.id);

        const basePiece = consumed[0];
        const mergedPiece = this.createMergedPiece(basePiece, star2Mult);

        Logger.info(
            MergeSystem.TAG,
            `合成完成: ${name} ★1 x${MERGE_COUNT} → ★2，消耗 ID: [${consumedIds.join(', ')}]`,
        );

        return { mergedPiece, consumedIds };
    }

    /**
     * 基于原始棋子创建 ★2 版本
     *
     * hp、maxHp、atk 按倍率提升，保留原始 name、race、atkSpeed、range、side、position。
     *
     * @param basePiece 原始棋子状态
     * @param star2Mult ★2 属性倍率
     * @returns 升星后的棋子状态（新对象，id 置为 -1 由调用方分配）
     */
    createMergedPiece(
        basePiece: ChessPieceRuntimeState,
        star2Mult: number,
    ): ChessPieceRuntimeState {
        return {
            id: -1,
            configId: basePiece.configId,
            name: basePiece.name,
            race: basePiece.race,
            hp: basePiece.hp * star2Mult,
            maxHp: basePiece.maxHp * star2Mult,
            atk: basePiece.atk * star2Mult,
            atkSpeed: basePiece.atkSpeed,
            range: basePiece.range,
            star: 2,
            side: basePiece.side,
            position: { ...basePiece.position },
            isAlive: true,
        };
    }

    /**
     * 查找所有可合成的候选分组
     *
     * 按 name 过滤 star===1 的棋子进行分组，返回 count ≥ 3 的分组。
     *
     * @param pieces 所有棋子列表
     * @returns name → 棋子列表的映射，仅包含 ≥3 个的分组
     */
    findMergeCandidates(pieces: ChessPieceRuntimeState[]): Map<string, ChessPieceRuntimeState[]> {
        const groups = new Map<string, ChessPieceRuntimeState[]>();

        for (const piece of pieces) {
            if (piece.star !== 1) {
                continue;
            }
            const list = groups.get(piece.name);
            if (list) {
                list.push(piece);
            } else {
                groups.set(piece.name, [piece]);
            }
        }

        // 过滤掉不满足合成数量的分组
        const result = new Map<string, ChessPieceRuntimeState[]>();
        for (const [name, list] of groups) {
            if (list.length >= MERGE_COUNT) {
                result.set(name, list);
            }
        }

        return result;
    }
}
