/**
 * 自走棋实体工厂
 *
 * 实现 IEntityFactory 接口，创建 ChessPieceEntity 实例。
 * 记录创建/销毁计数供调试。
 * @module
 */

import { EntityBase } from '../../../framework/entity/EntityBase';
import { IEntityFactory } from '../../../framework/entity/EntityDefs';
import { Logger } from '../../../framework/debug/Logger';
import { ChessPieceEntity } from '../entities/ChessPieceEntity';

/** 日志标签 */
const TAG = 'AutoChessEntityFactory';

/**
 * 自走棋实体工厂
 *
 * 统一创建 ChessPieceEntity，维护创建/销毁计数。
 */
export class AutoChessEntityFactory implements IEntityFactory {
    /** 创建计数 */
    private _createCount: number = 0;
    /** 销毁计数 */
    private _destroyCount: number = 0;

    /** 获取创建计数 */
    public get createCount(): number {
        return this._createCount;
    }

    /** 获取销毁计数 */
    public get destroyCount(): number {
        return this._destroyCount;
    }

    /**
     * 创建棋子实体
     *
     * @param groupName 分组名
     * @returns ChessPieceEntity 实例
     */
    public createEntity(groupName: string): EntityBase {
        this._createCount++;
        Logger.debug(TAG, `创建实体 [${groupName}]，累计: ${this._createCount}`);
        return new ChessPieceEntity();
    }

    /**
     * 销毁棋子实体
     *
     * @param entity 要销毁的实体
     */
    public destroyEntity(entity: EntityBase): void {
        this._destroyCount++;
        entity.onHide();
        Logger.debug(TAG, `销毁实体 #${entity.entityId}，累计: ${this._destroyCount}`);
    }
}
