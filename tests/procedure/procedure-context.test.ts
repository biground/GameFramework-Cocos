import { ProcedureBase } from '@framework/procedure/ProcedureBase';
import { IFsm } from '@framework/fsm/FsmDefs';
import { Logger } from '@framework/debug/Logger';

// ============ Mock Logger ============
jest.mock('@framework/debug/Logger', () => ({
    Logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));

// ============ 测试用 FSM Mock ============

function createMockFsm(dataMap: Map<string, unknown> = new Map()): IFsm<unknown> {
    return {
        name: 'test-fsm',
        owner: {},
        currentState: null,
        isDestroyed: false,
        blackboard: {} as Record<string, unknown>,
        changeState: jest.fn(),
        getData: jest.fn((key: string) => dataMap.get(key)) as IFsm<unknown>['getData'],
        setData: jest.fn(),
        removeData: jest.fn(),
        hasState: jest.fn(),
        setBlackboard: jest.fn(),
        start: jest.fn(),
    };
}

// ============ 暴露 protected 方法的测试子类 ============

interface TestContext {
    gold: number;
    level: number;
}

class TestProcedure extends ProcedureBase {
    /**
     * 暴露 protected getContext 用于测试
     */
    public callGetContext<T>(fsm: IFsm<unknown>, key: string): T {
        return this.getContext<T>(fsm, key);
    }
}

// ============ 测试 ============

describe('ProcedureBase.getContext', () => {
    let procedure: TestProcedure;

    beforeEach(() => {
        procedure = new TestProcedure();
        jest.clearAllMocks();
    });

    it('成功返回上下文对象', () => {
        const ctx: TestContext = { gold: 100, level: 5 };
        const dataMap = new Map<string, unknown>([['gameCtx', ctx]]);
        const fsm = createMockFsm(dataMap);

        const result = procedure.callGetContext<TestContext>(fsm, 'gameCtx');

        expect(result).toBe(ctx);
        expect(result.gold).toBe(100);
        expect(result.level).toBe(5);
        expect(fsm.getData).toHaveBeenCalledWith('gameCtx');
        expect(Logger.error).not.toHaveBeenCalled();
    });

    it('上下文不存在时抛出错误并调用 Logger.error', () => {
        const fsm = createMockFsm(); // 空 dataMap

        expect(() => procedure.callGetContext<TestContext>(fsm, 'missingKey')).toThrow(
            '[ProcedureBase] 流程上下文 [missingKey] 不存在',
        );
        expect(Logger.error).toHaveBeenCalledWith(
            'ProcedureBase',
            '流程上下文 [missingKey] 不存在',
        );
    });

    it('getData 返回 undefined 时抛出错误', () => {
        const fsm = createMockFsm();

        expect(() => procedure.callGetContext(fsm, 'noSuchKey')).toThrow('[ProcedureBase]');
        expect(Logger.error).toHaveBeenCalledTimes(1);
    });

    it('类型推导正确——返回值类型与泛型参数一致', () => {
        const ctx: TestContext = { gold: 999, level: 42 };
        const dataMap = new Map<string, unknown>([['ctx', ctx]]);
        const fsm = createMockFsm(dataMap);

        // 编译期类型检查：result 应为 TestContext
        const result: TestContext = procedure.callGetContext<TestContext>(fsm, 'ctx');
        expect(result.gold).toBe(999);
        expect(result.level).toBe(42);
    });
});
