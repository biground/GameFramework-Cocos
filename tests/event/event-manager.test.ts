import { EventKey } from '../../assets/scripts/framework/event/EventDefs';
import { EventManager } from '../../assets/scripts/framework/event/EventManager';
import { GameModule } from '../../assets/scripts/framework/core/GameModule';

// 无数据事件
const TEST_EVENT = new EventKey('test_event');
const EVENT_1 = new EventKey('event_1');
const EVENT_2 = new EventKey('event_2');
// 带数据事件
const DATA_EVENT = new EventKey<[num: number, desc: string]>('data_event');

describe('EventManager', () => {
    let eventMgr: EventManager;

    beforeEach(() => {
        eventMgr = new EventManager();
        GameModule.register(eventMgr);
    });

    afterEach(() => {
        GameModule.shutdownAll();
    });

    // ---- 测试用例 ----

    it('1. on + emit：注册监听后触发事件，回调被正确调用', () => {
        const callback = jest.fn();
        eventMgr.on(TEST_EVENT, callback);
        eventMgr.emit(TEST_EVENT);
        expect(callback).toHaveBeenCalled();
    });

    it('2. on 带 caller：验证回调中 this 指向正确', () => {
        const caller = { id: 1 };
        let callbackThis: unknown;
        const callback = function (this: unknown): void {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            callbackThis = this;
        };

        eventMgr.on(TEST_EVENT, callback, caller);
        eventMgr.emit(TEST_EVENT);

        expect(callbackThis).toBe(caller);
    });

    it('3. once：一次性监听只触发一次，之后自动移除', () => {
        const callback = jest.fn();
        eventMgr.once(TEST_EVENT, callback);
        eventMgr.emit(TEST_EVENT);
        eventMgr.emit(TEST_EVENT);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('4. off：取消监听后不再触发', () => {
        const callback = jest.fn();
        eventMgr.on(TEST_EVENT, callback);
        eventMgr.off(TEST_EVENT, callback);
        eventMgr.emit(TEST_EVENT);
        expect(callback).not.toHaveBeenCalled();
    });

    it('5. off 带 caller：精确匹配 callback + caller 才能取消', () => {
        const caller1 = { id: 1 };
        const caller2 = { id: 2 };
        const callback = jest.fn();

        eventMgr.on(TEST_EVENT, callback, caller1);
        eventMgr.off(TEST_EVENT, callback, caller2); // 错误的 caller，无法取消
        eventMgr.emit(TEST_EVENT);
        expect(callback).toHaveBeenCalled(); // 仍然被调用

        eventMgr.off(TEST_EVENT, callback, caller1); // 正确的 caller，成功取消
        eventMgr.emit(TEST_EVENT);
        expect(callback).toHaveBeenCalledTimes(1); // 不再被调用
    });

    it('6. offAll(key)：清除特定事件的所有监听', () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();
        eventMgr.on(TEST_EVENT, callback1);
        eventMgr.on(TEST_EVENT, callback2);
        eventMgr.offAll(TEST_EVENT);
        eventMgr.emit(TEST_EVENT);
        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
    });

    it('7. offAll()：清除所有事件的所有监听', () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();
        eventMgr.on(EVENT_1, callback1);
        eventMgr.on(EVENT_2, callback2);
        eventMgr.offAll();
        eventMgr.emit(EVENT_1);
        eventMgr.emit(EVENT_2);
        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
    });

    it('8. offByCaller(caller)：批量移除某个 caller 的所有监听', () => {
        const caller = { id: 1 };
        const callback1 = jest.fn();
        const callback2 = jest.fn();
        eventMgr.on(EVENT_1, callback1, caller);
        eventMgr.on(EVENT_2, callback2, caller);
        eventMgr.offByCaller(caller);
        eventMgr.emit(EVENT_1);
        eventMgr.emit(EVENT_2);
        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
    });

    it('9. 重复注册同一 callback + caller：不会触发两次', () => {
        const caller = { id: 1 };
        const callback = jest.fn();
        eventMgr.on(TEST_EVENT, callback, caller);
        eventMgr.on(TEST_EVENT, callback, caller); // 重复注册
        eventMgr.emit(TEST_EVENT);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('10. emit 过程中 once 回调的安全移除（不影响后续回调）', () => {
        const callbackA = jest.fn();
        const callbackB = jest.fn();
        eventMgr.once(TEST_EVENT, callbackA);
        eventMgr.on(TEST_EVENT, callbackB);
        eventMgr.emit(TEST_EVENT);
        expect(callbackA).toHaveBeenCalledTimes(1);
        expect(callbackB).toHaveBeenCalledTimes(1);

        eventMgr.emit(TEST_EVENT);
        expect(callbackA).toHaveBeenCalledTimes(1); // 不再被调用
        expect(callbackB).toHaveBeenCalledTimes(2); // 仍然被调用
    });

    it('11. 事件数据传递：emit 传入的数据能正确传到回调', () => {
        const callback = jest.fn();
        const data: [number, string] = [42, 'The answer'];
        eventMgr.on(DATA_EVENT, callback);
        eventMgr.emit(DATA_EVENT, data);
        expect(callback).toHaveBeenCalledWith(data);
    });
});
