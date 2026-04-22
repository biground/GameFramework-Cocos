/**
 * 建筑 FSM 状态机单元测试
 */

import { FsmManager } from '@framework/fsm/FsmManager';
import { Fsm } from '@framework/fsm/Fsm';
import {
    IdleBuildingState,
    ProducingState,
    UpgradingState,
    MaxLevelState,
} from '@game/demo1-idle/fsm/BuildingFsmStates';
import {
    IBuildingBlackboard,
    BuildingFsmDataKeys,
    BUILDING_FSM_PREFIX,
} from '@game/demo1-idle/fsm/BuildingFsmDefs';
import { EventManager } from '@framework/event/EventManager';
import { TimerManager } from '@framework/timer/TimerManager';
import { BuildingSystem } from '@game/demo1-idle/systems/BuildingSystem';
import { IdleGameData } from '@game/demo1-idle/data/IdleGameData';
import { BuildingConfigRow } from '@game/demo1-idle/data/BuildingConfigRow';

// ─── 测试辅助 ──────────────────────────────────────────

function makeConfig(overrides: Partial<BuildingConfigRow> & { id: number }): BuildingConfigRow {
    const c = new BuildingConfigRow();
    Object.assign(c, {
        name: '',
        baseCost: 10,
        baseOutput: 1,
        outputInterval: 2,
        costMultiplier: 1.5,
        outputPerLevel: 1,
        maxLevel: 3,
        unlockCondition: 0,
        ...overrides,
    });
    return c;
}

const TEST_CONFIGS: BuildingConfigRow[] = [
    makeConfig({ id: 1, name: 'mine', baseCost: 10, baseOutput: 1, outputInterval: 2, maxLevel: 3 }),
];

// ─── 测试套件 ──────────────────────────────────────────

describe('BuildingFsm — 建筑状态机', () => {
    let fsmManager: FsmManager;
    let eventManager: EventManager;
    let timerManager: TimerManager;
    let gameData: IdleGameData;
    let buildingSystem: BuildingSystem;

    beforeEach(() => {
        jest.useFakeTimers();
        eventManager = new EventManager();
        eventManager.onInit();
        timerManager = new TimerManager();
        timerManager.onInit();
        gameData = new IdleGameData();
        buildingSystem = new BuildingSystem(gameData, eventManager, timerManager);
        buildingSystem.loadConfigs(TEST_CONFIGS, []);
        fsmManager = new FsmManager();
        fsmManager.onInit();
    });

    afterEach(() => {
        fsmManager.onShutdown();
        buildingSystem.stopAllProduction();
        timerManager.onShutdown();
        eventManager.onShutdown();
        jest.useRealTimers();
    });

    /** 创建建筑 FSM 并写入黑板，返回 Fsm 实例 */
    function createBuildingFsm(buildingId: number): Fsm<IBuildingBlackboard> {
        const fsmName = `${BUILDING_FSM_PREFIX}${buildingId}`;
        const blackboard: IBuildingBlackboard = {
            buildingId,
            buildingSystem,
            gameData,
        };

        const fsm = fsmManager.createFsm(
            fsmName,
            blackboard,
            new IdleBuildingState(),
            new ProducingState(),
            new UpgradingState(),
            new MaxLevelState(),
        ) as Fsm<IBuildingBlackboard>;
        fsm.setData(BuildingFsmDataKeys.BLACKBOARD, blackboard);
        return fsm;
    }

    // ─── 创建与启动 ──────────────────────────────────

    describe('创建与启动', () => {
        it('用 FsmManager 创建包含 4 个状态的 FSM', () => {
            const fsm = createBuildingFsm(1);
            expect(fsm).toBeDefined();
            expect(fsm.hasState(IdleBuildingState)).toBe(true);
            expect(fsm.hasState(ProducingState)).toBe(true);
            expect(fsm.hasState(UpgradingState)).toBe(true);
            expect(fsm.hasState(MaxLevelState)).toBe(true);
        });

        it('启动后进入 IdleBuildingState', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);
            expect(fsm.currentState).toBeInstanceOf(IdleBuildingState);
        });
    });

    // ─── Idle → Producing ────────────────────────────

    describe('Idle → Producing 转换', () => {
        it('建筑未购买时保持 Idle 状态', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);

            fsmManager.onUpdate(0.016);
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(IdleBuildingState);
        });

        it('建筑被购买后切换到 ProducingState', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);

            gameData.buildings.push({
                id: 1, level: 1, owned: true,
                isUpgrading: false, upgradeStartTime: 0,
            });

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(ProducingState);
        });
    });

    // ─── Producing → Upgrading ───────────────────────

    describe('Producing → Upgrading 转换', () => {
        it('建筑开始升级后切换到 UpgradingState', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);

            gameData.buildings.push({
                id: 1, level: 1, owned: true,
                isUpgrading: false, upgradeStartTime: 0,
            });

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(ProducingState);

            const state = gameData.buildings.find((b) => b.id === 1)!;
            state.isUpgrading = true;
            state.upgradeStartTime = Date.now();

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(UpgradingState);
        });
    });

    // ─── Upgrading → Producing ───────────────────────

    describe('Upgrading → Producing 转换', () => {
        it('升级完成后切换回 ProducingState', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);

            gameData.buildings.push({
                id: 1, level: 1, owned: true,
                isUpgrading: false, upgradeStartTime: 0,
            });

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(ProducingState);

            const buildingState = gameData.buildings.find((b) => b.id === 1)!;
            buildingState.isUpgrading = true;
            buildingState.upgradeStartTime = Date.now();

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(UpgradingState);

            buildingState.isUpgrading = false;
            buildingState.level = 2;

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(ProducingState);
        });

        it('升级完成后清理升级临时数据', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);

            gameData.buildings.push({
                id: 1, level: 1, owned: true,
                isUpgrading: true, upgradeStartTime: Date.now(),
            });

            fsmManager.onUpdate(0.016);
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(UpgradingState);

            const buildingState = gameData.buildings.find((b) => b.id === 1)!;
            buildingState.isUpgrading = false;
            buildingState.level = 2;

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(ProducingState);

            expect(fsm.getData(BuildingFsmDataKeys.UPGRADE_START_TIME)).toBeUndefined();
            expect(fsm.getData(BuildingFsmDataKeys.UPGRADE_DURATION)).toBeUndefined();
        });
    });

    // ─── Producing → MaxLevel ────────────────────────

    describe('Producing → MaxLevel 转换', () => {
        it('建筑达到满级时切换到 MaxLevelState', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);

            gameData.buildings.push({
                id: 1, level: 3, owned: true,
                isUpgrading: false, upgradeStartTime: 0,
            });

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(ProducingState);

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(MaxLevelState);
        });

        it('MaxLevel 状态稳定，不再切换', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);

            gameData.buildings.push({
                id: 1, level: 3, owned: true,
                isUpgrading: false, upgradeStartTime: 0,
            });

            fsmManager.onUpdate(0.016);
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(MaxLevelState);

            fsmManager.onUpdate(0.016);
            fsmManager.onUpdate(0.016);
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(MaxLevelState);
        });
    });

    // ─── 生命周期回调 ────────────────────────────────

    describe('生命周期回调', () => {
        it('onEnter 和 onLeave 在状态切换时被调用', () => {
            const idleState = new IdleBuildingState();
            const producingState = new ProducingState();
            const upgradingState = new UpgradingState();
            const maxLevelState = new MaxLevelState();

            const enterSpy = jest.spyOn(producingState, 'onEnter');
            const leaveSpy = jest.spyOn(producingState, 'onLeave');
            const idleEnterSpy = jest.spyOn(idleState, 'onEnter');

            const fsmName = `${BUILDING_FSM_PREFIX}spy_1`;
            const blackboard: IBuildingBlackboard = {
                buildingId: 1,
                buildingSystem,
                gameData,
            };

            const fsm = fsmManager.createFsm(
                fsmName,
                blackboard,
                idleState, producingState, upgradingState, maxLevelState,
            ) as Fsm<IBuildingBlackboard>;
            fsm.setData(BuildingFsmDataKeys.BLACKBOARD, blackboard);

            fsm.start(IdleBuildingState);
            expect(idleEnterSpy).toHaveBeenCalledTimes(1);

            gameData.buildings.push({
                id: 1, level: 1, owned: true,
                isUpgrading: false, upgradeStartTime: 0,
            });

            fsmManager.onUpdate(0.016);
            expect(enterSpy).toHaveBeenCalledTimes(1);

            const buildingState = gameData.buildings.find((b) => b.id === 1)!;
            buildingState.isUpgrading = true;

            fsmManager.onUpdate(0.016);
            expect(leaveSpy).toHaveBeenCalledTimes(1);
        });

        it('UpgradingState.onEnter 记录升级开始时间到 FSM 数据', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);

            const now = Date.now();
            gameData.buildings.push({
                id: 1, level: 1, owned: true,
                isUpgrading: true, upgradeStartTime: now,
            });

            fsmManager.onUpdate(0.016);
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(UpgradingState);
            expect(fsm.getData(BuildingFsmDataKeys.UPGRADE_START_TIME)).toBe(now);
        });
    });

    // ─── 完整流转 ────────────────────────────────────

    describe('完整状态流转', () => {
        it('Idle → Producing → Upgrading → Producing → MaxLevel 全流程', () => {
            const fsm = createBuildingFsm(1);
            fsm.start(IdleBuildingState);
            expect(fsm.currentState).toBeInstanceOf(IdleBuildingState);

            gameData.buildings.push({
                id: 1, level: 1, owned: true,
                isUpgrading: false, upgradeStartTime: 0,
            });
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(ProducingState);

            const bs = gameData.buildings.find((b) => b.id === 1)!;
            bs.isUpgrading = true;
            bs.upgradeStartTime = Date.now();
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(UpgradingState);

            bs.isUpgrading = false;
            bs.level = 2;
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(ProducingState);

            bs.isUpgrading = true;
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(UpgradingState);

            bs.isUpgrading = false;
            bs.level = 3;
            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(ProducingState);

            fsmManager.onUpdate(0.016);
            expect(fsm.currentState).toBeInstanceOf(MaxLevelState);
        });
    });
});
