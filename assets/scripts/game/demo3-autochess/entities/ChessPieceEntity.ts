/**
 * 棋子实体
 *
 * 继承 EntityBase，实现自走棋棋子的全部属性和生命周期。
 * onShow 接收 IChessPieceShowData 初始化属性，onHide 重置保证池复用干净。
 * @module
 */

import { EntityBase } from '../../../framework/entity/EntityBase';
import { Logger } from '../../../framework/debug/Logger';
import { IChessPieceShowData, IGridPosition } from '../AutoChessDefs';
import { ChessPieceSide } from '../data/AutoChessGameData';

/** 日志标签 */
const TAG = 'ChessPieceEntity';

/**
 * 棋子实体类
 *
 * 属性由 onShow 注入，onHide 清零。
 * 每帧 onUpdate 递减攻击冷却。
 */
export class ChessPieceEntity extends EntityBase {
    // ─── 属性 ─────────────────────────────────────────

    /** 配置表 ID */
    private _configId: number = 0;
    /** 棋子名称 */
    private _name: string = '';
    /** 种族 */
    private _race: string = '';
    /** 当前 HP */
    private _hp: number = 0;
    /** 最大 HP */
    private _maxHp: number = 0;
    /** 攻击力 */
    private _atk: number = 0;
    /** 基础攻击力（加成前） */
    private _baseAtk: number = 0;
    /** 攻击间隔（秒） */
    private _atkSpeed: number = 0;
    /** 攻击范围（格数） */
    private _range: number = 0;
    /** 星级 */
    private _star: number = 0;
    /** 阵营 */
    private _side: ChessPieceSide = 'player';
    /** 棋盘位置 */
    private _position: IGridPosition = { row: -1, col: -1 };
    /** 是否存活 */
    private _isAlive: boolean = false;
    /** 攻击冷却计时器 */
    private _atkCooldown: number = 0;

    // ─── Getters ──────────────────────────────────────

    public get configId(): number {
        return this._configId;
    }
    public get name(): string {
        return this._name;
    }
    public get race(): string {
        return this._race;
    }
    public get hp(): number {
        return this._hp;
    }
    public get maxHp(): number {
        return this._maxHp;
    }
    public get atk(): number {
        return this._atk;
    }
    public get baseAtk(): number {
        return this._baseAtk;
    }
    public get atkSpeed(): number {
        return this._atkSpeed;
    }
    public get range(): number {
        return this._range;
    }
    public get star(): number {
        return this._star;
    }
    public get side(): ChessPieceSide {
        return this._side;
    }
    public get position(): IGridPosition {
        return { ...this._position };
    }
    public get isAlive(): boolean {
        return this._isAlive;
    }
    public get atkCooldown(): number {
        return this._atkCooldown;
    }
    public set atkCooldown(v: number) {
        this._atkCooldown = v;
    }

    // ─── 生命周期 ─────────────────────────────────────

    /**
     * 实体显示时初始化属性
     *
     * @param data IChessPieceShowData（可选扩展 side 字段）
     */
    public override onShow(data?: unknown): void {
        if (!data) {
            Logger.debug(TAG, '未传入初始化数据，跳过属性设置');
            return;
        }

        const d = data as IChessPieceShowData & { side?: ChessPieceSide };
        this._configId = d.configId;
        this._name = d.name;
        this._race = d.race;
        this._hp = d.hp;
        this._maxHp = d.hp;
        this._atk = d.atk;
        this._baseAtk = d.atk;
        this._atkSpeed = d.atkSpeed;
        this._range = d.range;
        this._star = d.star;
        this._side = d.side ?? 'player';
        this._position = { row: d.position.row, col: d.position.col };
        this._isAlive = true;
        this._atkCooldown = 0;

        Logger.debug(TAG, `显示棋子: ${d.name}(★${d.star}) HP=${d.hp} ATK=${d.atk}`);
    }

    /**
     * 实体隐藏时重置所有属性，确保回池后干净复用
     */
    public override onHide(): void {
        this._configId = 0;
        this._name = '';
        this._race = '';
        this._hp = 0;
        this._maxHp = 0;
        this._atk = 0;
        this._baseAtk = 0;
        this._atkSpeed = 0;
        this._range = 0;
        this._star = 0;
        this._side = 'player';
        this._position = { row: -1, col: -1 };
        this._isAlive = false;
        this._atkCooldown = 0;

        Logger.debug(TAG, '棋子已隐藏并重置');
    }

    /**
     * 每帧更新——递减攻击冷却计时器
     *
     * @param deltaTime 帧间隔（秒）
     */
    public override onUpdate(deltaTime: number): void {
        if (!this._isAlive) {
            return;
        }
        if (this._atkCooldown > 0) {
            this._atkCooldown = Math.max(0, this._atkCooldown - deltaTime);
        }
    }

    // ─── 战斗方法 ─────────────────────────────────────

    /**
     * 受到伤害
     *
     * @param damage 伤害值（负数视为 0）
     * @returns 实际造成的伤害
     */
    public takeDamage(damage: number): number {
        if (!this._isAlive) {
            return 0;
        }
        if (damage <= 0) {
            return 0;
        }

        const actual = Math.min(damage, this._hp);
        this._hp -= actual;

        if (this._hp <= 0) {
            this._hp = 0;
            this._isAlive = false;
            Logger.debug(TAG, `${this._name}(#${this.entityId}) 已阵亡`);
        }

        return actual;
    }

    /**
     * 应用属性加成
     *
     * @param stat 属性名（atk / hp / atkSpeed）
     * @param value 加成值（可正可负）
     */
    public applyBuff(stat: string, value: number): void {
        switch (stat) {
            case 'atk':
                this._atk += value;
                break;
            case 'hp':
                this._hp += value;
                this._maxHp += value;
                break;
            case 'atkSpeed':
                this._atkSpeed += value;
                break;
            default:
                Logger.debug(TAG, `未知属性加成: ${stat}`);
                break;
        }
    }
}
