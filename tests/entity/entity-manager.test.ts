import { EntityManager } from '@framework/entity/EntityManager';
import { EntityBase } from '@framework/entity/EntityBase';
import { EntityGroup } from '@framework/entity/EntityGroup';
import { IEntityFactory } from '@framework/entity/EntityDefs';

// ─── Mock 工具 ──────────────────────────────────────

/**
 * Mock 实体类：可追踪所有生命周期调用
 */
class MockEntity extends EntityBase {
    readonly calls: string[] = [];
    lastShowData: unknown = undefined;

    onShow(data?: unknown): void {
        this.calls.push('onShow');
        this.lastShowData = data;
    }

    onHide(): void {
        this.calls.push('onHide');
    }

    onUpdate(_deltaTime: number): void {
        this.calls.push('onUpdate');
    }
}

/**
 * Mock 实体工厂：追踪创建/销毁次数
 */
class MockEntityFactory implements IEntityFactory {
    readonly created: MockEntity[] = [];
    readonly destroyed: EntityBase[] = [];

    createEntity(_groupName: string): EntityBase {
        const entity = new MockEntity();
        this.created.push(entity);
        return entity;
    }

    destroyEntity(entity: EntityBase): void {
        this.destroyed.push(entity);
    }
}

// ─── EntityGroup 单元测试 ────────────────────────────

describe('EntityGroup', () => {
    let factory: MockEntityFactory;
    let group: EntityGroup;

    beforeEach(() => {
        factory = new MockEntityFactory();
        group = new EntityGroup('Enemy', factory);
        void group; // 占位，待实现后移除
    });

    describe('showEntity - 显示实体', () => {
        it('首次 show 时通过 factory 创建实体', () => {
            // TODO: 实现
        });

        it('show 后 activeCount 为 1', () => {
            // TODO: 实现
        });

        it('show 时调用 entity.onShow 并传递 data', () => {
            // TODO: 实现
        });

        it('show 后 entity.isActive 为 true', () => {
            // TODO: 实现
        });

        it('hide 后再次 show，复用等待池中的实体（不创建新实例）', () => {
            // TODO: 同一实体 show → hide → show，factory.created.length 仍为 1
        });
    });

    describe('hideEntity - 隐藏实体', () => {
        it('hide 后 activeCount 减少，waitingCount 增加', () => {
            // TODO: 实现
        });

        it('hide 时调用 entity.onHide', () => {
            // TODO: 实现
        });

        it('hide 后 entity.isActive 为 false', () => {
            // TODO: 实现
        });
    });

    describe('update - 每帧更新', () => {
        it('update 时只有活跃实体收到 onUpdate', () => {
            // TODO: show 两个实体，hide 一个，update 后验证只有活跃的收到 onUpdate
        });
    });

    describe('destroyAll - 销毁分组', () => {
        it('destroyAll 后 activeCount 和 waitingCount 均为 0', () => {
            // TODO: 实现
        });

        it('destroyAll 时 factory.destroyEntity 被调用对应次数', () => {
            // TODO: 活跃 2 个 + 等待池 1 个 = factory.destroyed.length 为 3
        });
    });

    describe('getActiveEntities - 获取活跃实体', () => {
        it('返回活跃实体的只读副本', () => {
            // TODO: 返回副本，修改返回值不影响内部 activeList
        });
    });

    describe('hasEntity - 查询实体', () => {
        it('show 后 hasEntity 返回 true', () => {
            // TODO: 实现
        });

        it('hide 后 hasEntity 返回 false', () => {
            // TODO: 实现
        });
    });
});

// ─── EntityManager 集成测试 ──────────────────────────

describe('EntityManager', () => {
    let manager: EntityManager;
    let factory: MockEntityFactory;

    beforeEach(() => {
        manager = new EntityManager();
        factory = new MockEntityFactory();
        manager.onInit();
    });

    afterEach(() => {
        // 避免测试间状态污染（如果 onShutdown 已实现）
    });

    describe('setEntityFactory - 工厂注入', () => {
        it('未设置 factory 时 registerGroup 应抛出错误', () => {
            // TODO: 实现
        });

        it('setEntityFactory 不接受 null', () => {
            // TODO: 实现
        });
    });

    describe('registerGroup - 注册分组', () => {
        beforeEach(() => {
            manager.setEntityFactory(factory);
        });

        it('注册成功后可以 showEntity', () => {
            // TODO: 实现
        });

        it('重复注册同名分组应抛出错误', () => {
            // TODO: 实现
        });

        it('分组名为空时应抛出错误', () => {
            // TODO: 实现
        });
    });

    describe('showEntity - 显示实体', () => {
        beforeEach(() => {
            manager.setEntityFactory(factory);
            manager.registerGroup('Enemy');
        });

        it('show 后 hasEntity 返回 true', () => {
            // TODO: 实现
        });

        it('show 返回的实体 entityId 递增', () => {
            // TODO: 连续 show 两个，id 分别为 1 和 2
        });

        it('show 时触发 onSuccess 回调', () => {
            // TODO: 实现
        });

        it('show 不存在的分组应抛出错误', () => {
            // TODO: 实现
        });
    });

    describe('hideEntity - 隐藏实体', () => {
        beforeEach(() => {
            manager.setEntityFactory(factory);
            manager.registerGroup('Enemy');
        });

        it('hide 后 hasEntity 返回 false', () => {
            // TODO: 实现
        });

        it('hide 后再次 show 同分组，复用池中实体', () => {
            // TODO: show → hide → show，factory.created.length 仍为 1
        });
    });

    describe('hideAllEntities - 批量隐藏', () => {
        beforeEach(() => {
            manager.setEntityFactory(factory);
            manager.registerGroup('Enemy');
            manager.registerGroup('NPC');
        });

        it('不传 groupName 时隐藏所有实体', () => {
            // TODO: Enemy show 2 个，NPC show 1 个，hideAll 后三个都不活跃
        });

        it('传 groupName 时只隐藏指定分组', () => {
            // TODO: Enemy show 2 个，NPC show 1 个，hideAll('Enemy') 后 NPC 仍活跃
        });
    });

    describe('getEntitiesByGroup - 按组获取', () => {
        beforeEach(() => {
            manager.setEntityFactory(factory);
            manager.registerGroup('Enemy');
        });

        it('返回分组内所有活跃实体', () => {
            // TODO: show 3 个 Enemy，getEntitiesByGroup 返回长度 3
        });

        it('不存在的分组返回空数组', () => {
            // TODO: 实现
        });
    });

    describe('onUpdate - 每帧更新', () => {
        it('update 时所有活跃实体收到 onUpdate', () => {
            // TODO: 实现
        });
    });

    describe('onShutdown - 清理', () => {
        it('shutdown 后所有实体被销毁', () => {
            // TODO: show 若干实体，onShutdown 后 hasEntity 均为 false
        });
    });
});
