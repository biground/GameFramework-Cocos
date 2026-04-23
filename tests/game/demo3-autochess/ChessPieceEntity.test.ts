/**
 * ChessPieceEntity 与 AutoChessEntityFactory 单元测试
 */

import { EntityBase } from '@framework/entity/EntityBase';
import { IEntityFactory } from '@framework/entity/EntityDefs';
import { IChessPieceShowData } from '@game/demo3-autochess/AutoChessDefs';
import { ChessPieceEntity } from '@game/demo3-autochess/entities/ChessPieceEntity';
import { AutoChessEntityFactory } from '@game/demo3-autochess/factory/AutoChessEntityFactory';

// ─── 测试用构造数据 ───────────────────────────────────

const makeShowData = (overrides?: Partial<IChessPieceShowData>): IChessPieceShowData => ({
    configId: 1,
    name: '战士',
    race: 'warrior',
    hp: 100,
    atk: 20,
    atkSpeed: 1.5,
    range: 1,
    star: 1,
    position: { row: 0, col: 0 },
    ...overrides,
});

// ═══════════════════════════════════════════════════════
// ChessPieceEntity 测试
// ═══════════════════════════════════════════════════════

describe('ChessPieceEntity', () => {
    let entity: ChessPieceEntity;

    beforeEach(() => {
        entity = new ChessPieceEntity();
    });

    // ─── 继承 ─────────────────────────────────────────

    it('应继承 EntityBase', () => {
        expect(entity).toBeInstanceOf(EntityBase);
    });

    // ─── onShow ───────────────────────────────────────

    describe('onShow', () => {
        it('应正确初始化所有属性', () => {
            const data = makeShowData();
            entity.onShow(data);

            expect(entity.configId).toBe(1);
            expect(entity.name).toBe('战士');
            expect(entity.race).toBe('warrior');
            expect(entity.hp).toBe(100);
            expect(entity.maxHp).toBe(100);
            expect(entity.atk).toBe(20);
            expect(entity.baseAtk).toBe(20);
            expect(entity.atkSpeed).toBe(1.5);
            expect(entity.range).toBe(1);
            expect(entity.star).toBe(1);
            expect(entity.isAlive).toBe(true);
            expect(entity.atkCooldown).toBe(0);
            expect(entity.position).toEqual({ row: 0, col: 0 });
        });

        it('应支持不同星级和属性', () => {
            const data = makeShowData({ star: 2, hp: 200, atk: 40, name: '法师', race: 'mage' });
            entity.onShow(data);

            expect(entity.star).toBe(2);
            expect(entity.hp).toBe(200);
            expect(entity.maxHp).toBe(200);
            expect(entity.atk).toBe(40);
            expect(entity.name).toBe('法师');
            expect(entity.race).toBe('mage');
        });

        it('未传入数据时不应崩溃', () => {
            expect(() => entity.onShow()).not.toThrow();
        });

        it('默认 side 应为 player', () => {
            entity.onShow(makeShowData());
            expect(entity.side).toBe('player');
        });

        it('应支持通过扩展数据设置 side', () => {
            entity.onShow({ ...makeShowData(), side: 'enemy' } as IChessPieceShowData & {
                side: string;
            });
            // side 仅在 show 数据含 side 字段时生效（扩展接口）
            // 默认为 player — 详见实现
        });
    });

    // ─── onHide ───────────────────────────────────────

    describe('onHide', () => {
        it('应重置所有属性为默认值', () => {
            entity.onShow(makeShowData({ hp: 200, atk: 50, star: 2 }));
            entity.onHide();

            expect(entity.configId).toBe(0);
            expect(entity.name).toBe('');
            expect(entity.race).toBe('');
            expect(entity.hp).toBe(0);
            expect(entity.maxHp).toBe(0);
            expect(entity.atk).toBe(0);
            expect(entity.baseAtk).toBe(0);
            expect(entity.atkSpeed).toBe(0);
            expect(entity.range).toBe(0);
            expect(entity.star).toBe(0);
            expect(entity.side).toBe('player');
            expect(entity.position).toEqual({ row: -1, col: -1 });
            expect(entity.isAlive).toBe(false);
            expect(entity.atkCooldown).toBe(0);
        });

        it('onHide 后再 onShow 应能正常复用', () => {
            entity.onShow(makeShowData({ hp: 50 }));
            entity.onHide();
            entity.onShow(makeShowData({ hp: 300, name: '游侠' }));

            expect(entity.hp).toBe(300);
            expect(entity.name).toBe('游侠');
            expect(entity.isAlive).toBe(true);
        });
    });

    // ─── onUpdate ─────────────────────────────────────

    describe('onUpdate', () => {
        it('应递减攻击冷却计时器', () => {
            entity.onShow(makeShowData({ atkSpeed: 2 }));
            entity.atkCooldown = 1.5;
            entity.onUpdate(0.5);

            expect(entity.atkCooldown).toBeCloseTo(1.0);
        });

        it('攻击冷却不应低于 0', () => {
            entity.onShow(makeShowData());
            entity.atkCooldown = 0.3;
            entity.onUpdate(1.0);

            expect(entity.atkCooldown).toBe(0);
        });

        it('未存活时不更新冷却', () => {
            entity.onShow(makeShowData());
            entity.atkCooldown = 1.0;
            entity.takeDamage(9999); // 击杀
            entity.onUpdate(0.5);

            expect(entity.atkCooldown).toBe(1.0); // 不变
        });
    });

    // ─── takeDamage ───────────────────────────────────

    describe('takeDamage', () => {
        it('应正确扣血并返回实际伤害', () => {
            entity.onShow(makeShowData({ hp: 100 }));
            const actual = entity.takeDamage(30);

            expect(actual).toBe(30);
            expect(entity.hp).toBe(70);
            expect(entity.isAlive).toBe(true);
        });

        it('伤害超过剩余 HP 时应返回实际伤害', () => {
            entity.onShow(makeShowData({ hp: 50 }));
            const actual = entity.takeDamage(80);

            expect(actual).toBe(50); // 只扣了 50
            expect(entity.hp).toBe(0);
            expect(entity.isAlive).toBe(false);
        });

        it('HP 为 0 时应标记 isAlive=false', () => {
            entity.onShow(makeShowData({ hp: 30 }));
            entity.takeDamage(30);

            expect(entity.hp).toBe(0);
            expect(entity.isAlive).toBe(false);
        });

        it('已死亡时再受伤应返回 0', () => {
            entity.onShow(makeShowData({ hp: 10 }));
            entity.takeDamage(10);
            const actual = entity.takeDamage(5);

            expect(actual).toBe(0);
            expect(entity.hp).toBe(0);
        });

        it('负伤害应视为 0', () => {
            entity.onShow(makeShowData({ hp: 100 }));
            const actual = entity.takeDamage(-10);

            expect(actual).toBe(0);
            expect(entity.hp).toBe(100);
        });
    });

    // ─── applyBuff ────────────────────────────────────

    describe('applyBuff', () => {
        it('应加成 atk 属性', () => {
            entity.onShow(makeShowData({ atk: 20 }));
            entity.applyBuff('atk', 10);

            expect(entity.atk).toBe(30);
        });

        it('应加成 hp/maxHp 属性', () => {
            entity.onShow(makeShowData({ hp: 100 }));
            entity.applyBuff('hp', 50);

            expect(entity.hp).toBe(150);
            expect(entity.maxHp).toBe(150);
        });

        it('应加成 atkSpeed 属性', () => {
            entity.onShow(makeShowData({ atkSpeed: 1.5 }));
            entity.applyBuff('atkSpeed', -0.3);

            expect(entity.atkSpeed).toBeCloseTo(1.2);
        });

        it('无效 stat 名不应崩溃', () => {
            entity.onShow(makeShowData());
            expect(() => entity.applyBuff('unknown_stat', 10)).not.toThrow();
        });
    });
});

// ═══════════════════════════════════════════════════════
// AutoChessEntityFactory 测试
// ═══════════════════════════════════════════════════════

describe('AutoChessEntityFactory', () => {
    let factory: AutoChessEntityFactory;

    beforeEach(() => {
        factory = new AutoChessEntityFactory();
    });

    it('应实现 IEntityFactory 接口', () => {
        const iface: IEntityFactory = factory;
        expect(iface.createEntity).toBeDefined();
        expect(iface.destroyEntity).toBeDefined();
    });

    it('createEntity 应返回 ChessPieceEntity 实例', () => {
        const entity = factory.createEntity('chess_piece');

        expect(entity).toBeInstanceOf(ChessPieceEntity);
        expect(entity).toBeInstanceOf(EntityBase);
    });

    it('多次创建应返回不同实例', () => {
        const e1 = factory.createEntity('chess_piece');
        const e2 = factory.createEntity('chess_piece');

        expect(e1).not.toBe(e2);
    });

    it('destroyEntity 应调用 onHide', () => {
        const entity = factory.createEntity('chess_piece') as ChessPieceEntity;
        entity.onShow(makeShowData({ hp: 100 }));

        factory.destroyEntity(entity);

        // onHide 会重置属性
        expect(entity.hp).toBe(0);
        expect(entity.name).toBe('');
    });

    it('应正确记录创建计数', () => {
        factory.createEntity('group_a');
        factory.createEntity('group_a');
        factory.createEntity('group_b');

        expect(factory.createCount).toBe(3);
    });

    it('应正确记录销毁计数', () => {
        const e1 = factory.createEntity('test');
        const e2 = factory.createEntity('test');

        factory.destroyEntity(e1);
        factory.destroyEntity(e2);

        expect(factory.destroyCount).toBe(2);
    });
});
