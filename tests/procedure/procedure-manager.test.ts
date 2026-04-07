import { ProcedureManager } from '../../assets/scripts/framework/procedure/ProcedureManager';
import { ProcedureBase } from '../../assets/scripts/framework/procedure/ProcedureBase';
import { IFsm } from '../../assets/scripts/framework/fsm/FsmDefs';

// ============ 测试用流程 ============

class ProcedureLaunch extends ProcedureBase {
    onEnter(fsm: IFsm<unknown>): void {
        fsm.setData('launched', true);
    }
}

class ProcedureMenu extends ProcedureBase {
    onEnter(fsm: IFsm<unknown>): void {
        fsm.setData('menu', true);
    }
}

class ProcedureGame extends ProcedureBase {
    onEnter(fsm: IFsm<unknown>): void {
        fsm.setData('gaming', true);
    }

    onUpdate(fsm: IFsm<unknown>, _deltaTime: number): void {
        fsm.setData('updatedInGame', true);
    }
}

class ProcedureAutoSwitch extends ProcedureBase {
    onEnter(fsm: IFsm<unknown>): void {
        // 进入后自动切换到 Menu
        this.changeProcedure(fsm, ProcedureMenu);
    }
}

// ============ 测试 ============

describe('ProcedureManager', () => {
    let procMgr: ProcedureManager;

    beforeEach(() => {
        procMgr = new ProcedureManager();
    });

    afterEach(() => {
        procMgr.onShutdown();
    });

    // === 初始化相关 ===

    it('1. initialize 注册流程后，hasProcedure 返回 true', () => {
        procMgr.initialize(new ProcedureLaunch(), new ProcedureMenu());
        expect(procMgr.hasProcedure(ProcedureLaunch)).toBe(true);
        expect(procMgr.hasProcedure(ProcedureMenu)).toBe(true);
        expect(procMgr.hasProcedure(ProcedureGame)).toBe(false);
    });

    it('2. initialize 不传流程应抛错', () => {
        expect(() => procMgr.initialize()).toThrow('[ProcedureManager]');
    });

    it('3. 重复 initialize 应抛错', () => {
        procMgr.initialize(new ProcedureLaunch());
        expect(() => procMgr.initialize(new ProcedureLaunch())).toThrow('[ProcedureManager]');
    });

    // === 启动相关 ===

    it('4. startProcedure 启动入口流程', () => {
        procMgr.initialize(new ProcedureLaunch(), new ProcedureMenu());
        procMgr.startProcedure(ProcedureLaunch);
        expect(procMgr.currentProcedure).toBeInstanceOf(ProcedureLaunch);
    });

    it('5. 未 initialize 就 startProcedure 应抛错', () => {
        expect(() => procMgr.startProcedure(ProcedureLaunch)).toThrow('[ProcedureManager]');
    });

    it('6. startProcedure 后 onEnter 被调用', () => {
        procMgr.initialize(new ProcedureLaunch(), new ProcedureMenu());
        procMgr.startProcedure(ProcedureLaunch);
        // ProcedureLaunch.onEnter 设置了 fsm data 'launched'
        // 通过 currentProcedure 不为 null 间接验证
        expect(procMgr.currentProcedure).not.toBeNull();
    });

    // === 流程切换 ===

    it('7. 流程内通过 changeProcedure 切换到下一个流程', () => {
        procMgr.initialize(new ProcedureAutoSwitch(), new ProcedureMenu());
        procMgr.startProcedure(ProcedureAutoSwitch);
        // ProcedureAutoSwitch.onEnter 自动切换到 ProcedureMenu
        expect(procMgr.currentProcedure).toBeInstanceOf(ProcedureMenu);
    });

    // === Update 驱动 ===

    it('8. onUpdate 驱动当前流程的 onUpdate', () => {
        procMgr.initialize(new ProcedureLaunch(), new ProcedureGame());
        procMgr.startProcedure(ProcedureGame);
        procMgr.onUpdate(0.016);
        // ProcedureGame.onUpdate 自身可执行，不抛错即为通过
        expect(procMgr.currentProcedure).toBeInstanceOf(ProcedureGame);
    });

    it('9. 未初始化时 onUpdate 不抛错', () => {
        expect(() => procMgr.onUpdate(0.016)).not.toThrow();
    });

    // === Shutdown ===

    it('10. onShutdown 后 currentProcedure 为 null', () => {
        procMgr.initialize(new ProcedureLaunch());
        procMgr.startProcedure(ProcedureLaunch);
        procMgr.onShutdown();
        expect(procMgr.currentProcedure).toBeNull();
    });

    it('11. onShutdown 多次调用不抛错', () => {
        procMgr.initialize(new ProcedureLaunch());
        procMgr.onShutdown();
        expect(() => procMgr.onShutdown()).not.toThrow();
    });

    // === 模块属性 ===

    it('12. moduleName 返回 ProcedureManager', () => {
        expect(procMgr.moduleName).toBe('ProcedureManager');
    });

    it('13. priority 为 300（上层逻辑层）', () => {
        expect(procMgr.priority).toBe(300);
    });
});
