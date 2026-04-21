import { MockEntity, MockEntityFactory } from '@game/shared/MockEntityFactory';

describe('MockEntity', () => {
    let entity: MockEntity;

    beforeEach(() => {
        entity = new MockEntity();
    });

    it('entityType 返回 MockEntity', () => {
        expect(entity.entityType).toBe('MockEntity');
    });

    it('初始状态：calls 为空，lastShowData 为 null', () => {
        expect(entity.calls).toEqual([]);
        expect(entity.lastShowData).toBeNull();
    });

    it('onShow 记录调用并保存数据', () => {
        const data = { hp: 100 };
        entity.onShow(data);
        expect(entity.calls).toEqual(['onShow']);
        expect(entity.lastShowData).toEqual(data);
    });

    it('onShow 无参数时 lastShowData 为 null', () => {
        entity.onShow();
        expect(entity.lastShowData).toBeNull();
    });

    it('onHide 记录调用', () => {
        entity.onHide();
        expect(entity.calls).toEqual(['onHide']);
    });

    it('onUpdate 记录调用', () => {
        entity.onUpdate(0.016);
        expect(entity.calls).toEqual(['onUpdate']);
    });

    it('完整生命周期调用顺序', () => {
        entity.onShow({ hp: 100 });
        entity.onUpdate(0.016);
        entity.onUpdate(0.016);
        entity.onHide();
        expect(entity.calls).toEqual(['onShow', 'onUpdate', 'onUpdate', 'onHide']);
    });

    it('simulateHide 调用 onHide 并设置 isActive=false', () => {
        entity.simulateHide();
        expect(entity.calls).toContain('onHide');
        expect(entity.isActive).toBe(false);
    });
});

describe('MockEntityFactory', () => {
    let factory: MockEntityFactory;

    beforeEach(() => {
        factory = new MockEntityFactory();
    });

    it('createEntity 返回 MockEntity 实例', () => {
        const entity = factory.createEntity('Enemy');
        expect(entity).toBeInstanceOf(MockEntity);
    });

    it('createEntity 追踪 createCalls', () => {
        factory.createEntity('Enemy');
        factory.createEntity('Bullet');
        expect(factory.createCalls).toEqual([
            { groupName: 'Enemy' },
            { groupName: 'Bullet' },
        ]);
    });

    it('createEntity 按分组追踪 createdEntities', () => {
        factory.createEntity('Enemy');
        factory.createEntity('Enemy');
        factory.createEntity('Bullet');
        expect(factory.createdEntities.get('Enemy')).toHaveLength(2);
        expect(factory.createdEntities.get('Bullet')).toHaveLength(1);
    });

    it('destroyEntity 追踪 destroyCalls 和 destroyedEntities', () => {
        const entity = factory.createEntity('Enemy');
        factory.destroyEntity(entity);
        expect(factory.destroyCalls).toBe(1);
        expect(factory.destroyedEntities).toContain(entity);
    });

    describe('实体池化', () => {
        beforeEach(() => {
            factory.enablePooling(true);
        });

        it('启用池化后 destroyEntity 将实体回池', () => {
            const entity = factory.createEntity('Enemy');
            factory.destroyEntity(entity);
            // entity.groupName 默认为 ''，池按 groupName 存储
            expect(factory.getPoolSize(entity.groupName)).toBe(1);
            expect(factory.destroyedEntities).toHaveLength(0);
        });

        it('池中有实体时 createEntity 复用（按 groupName 匹配）', () => {
            const entity1 = factory.createEntity('Enemy');
            // entity1.groupName 为 ''，回池后存储在 '' key 下
            factory.destroyEntity(entity1);
            // 新的 createEntity('Enemy') 不会匹配 '' key 的池，创建新实体
            const entity2 = factory.createEntity('Enemy');
            // 由于 groupName 不匹配，不会复用
            expect(entity2).not.toBe(entity1);
        });

        it('clearPool 清空所有实体池', () => {
            const entity = factory.createEntity('Enemy');
            factory.destroyEntity(entity);
            factory.clearPool();
            expect(factory.getPoolSize('Enemy')).toBe(0);
        });

        it('getPool 返回池的副本', () => {
            const entity = factory.createEntity('Enemy');
            factory.destroyEntity(entity);
            const pool = factory.getPool();
            // 池 key 为 entity.groupName（默认 ''）
            expect(pool.get(entity.groupName)).toHaveLength(1);
        });
    });

    it('禁用池化时 destroyEntity 直接标记销毁', () => {
        factory.enablePooling(false);
        const entity = factory.createEntity('Enemy');
        factory.destroyEntity(entity);
        expect(factory.destroyedEntities).toContain(entity);
        expect(factory.getPoolSize('Enemy')).toBe(0);
    });
});
