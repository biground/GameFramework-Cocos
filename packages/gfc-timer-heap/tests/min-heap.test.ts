import { MinHeap } from '../src/MinHeap';
import { IHeapTimerEntry } from '../src/HeapTimerDefs';

/** 创建测试用 entry 的工厂函数 */
function makeEntry(id: number, expireTime: number): IHeapTimerEntry {
    return {
        id,
        delay: 1,
        callback: () => {},
        repeat: 0,
        expireTime,
        useTimeScale: true,
        tag: null,
        heapIndex: -1,
    };
}

describe('MinHeap', () => {
    let heap: MinHeap;

    beforeEach(() => {
        heap = new MinHeap();
    });

    test('空堆 peek 返回 null', () => {
        expect(heap.peek()).toBeNull();
        expect(heap.size).toBe(0);
    });

    test('空堆 pop 返回 null', () => {
        expect(heap.pop()).toBeNull();
    });

    test('单元素 push + peek + pop', () => {
        const entry = makeEntry(1, 5.0);
        heap.push(entry);

        expect(heap.size).toBe(1);
        expect(heap.peek()!.id).toBe(1);
        expect(entry.heapIndex).toBe(0);

        const popped = heap.pop();
        expect(popped!.id).toBe(1);
        expect(popped!.heapIndex).toBe(-1);
        expect(heap.size).toBe(0);
    });

    test('多元素保持最小堆性质', () => {
        // 乱序插入
        heap.push(makeEntry(3, 3.0));
        heap.push(makeEntry(1, 1.0));
        heap.push(makeEntry(5, 5.0));
        heap.push(makeEntry(2, 2.0));
        heap.push(makeEntry(4, 4.0));

        // 应该按 expireTime 升序弹出
        expect(heap.pop()!.id).toBe(1);
        expect(heap.pop()!.id).toBe(2);
        expect(heap.pop()!.id).toBe(3);
        expect(heap.pop()!.id).toBe(4);
        expect(heap.pop()!.id).toBe(5);
        expect(heap.size).toBe(0);
    });

    test('heapIndex 始终准确', () => {
        const e1 = makeEntry(1, 10.0);
        const e2 = makeEntry(2, 5.0);
        const e3 = makeEntry(3, 1.0);

        heap.push(e1);
        heap.push(e2);
        heap.push(e3); // 最小，应该在堆顶 index=0

        expect(e3.heapIndex).toBe(0);
        // 所有 index 应该在 [0, size) 范围内
        expect(e1.heapIndex).toBeGreaterThanOrEqual(0);
        expect(e2.heapIndex).toBeGreaterThanOrEqual(0);
    });

    test('removeAt 移除中间元素', () => {
        heap.push(makeEntry(1, 1.0));
        const e2 = makeEntry(2, 2.0);
        heap.push(e2);
        heap.push(makeEntry(3, 3.0));
        heap.push(makeEntry(4, 4.0));
        heap.push(makeEntry(5, 5.0));

        // 移除 e2
        const removed = heap.removeAt(e2.heapIndex);
        expect(removed!.id).toBe(2);
        expect(removed!.heapIndex).toBe(-1);
        expect(heap.size).toBe(4);

        // 剩余元素仍然有序
        expect(heap.pop()!.id).toBe(1);
        expect(heap.pop()!.id).toBe(3);
        expect(heap.pop()!.id).toBe(4);
        expect(heap.pop()!.id).toBe(5);
    });

    test('removeAt 移除堆顶', () => {
        heap.push(makeEntry(1, 1.0));
        heap.push(makeEntry(2, 2.0));
        heap.push(makeEntry(3, 3.0));

        const removed = heap.removeAt(0);
        expect(removed!.id).toBe(1);
        expect(heap.pop()!.id).toBe(2);
        expect(heap.pop()!.id).toBe(3);
    });

    test('removeAt 移除最后一个元素', () => {
        heap.push(makeEntry(1, 1.0));
        const e2 = makeEntry(2, 5.0);
        heap.push(e2);

        const removed = heap.removeAt(e2.heapIndex);
        expect(removed!.id).toBe(2);
        expect(heap.size).toBe(1);
        expect(heap.pop()!.id).toBe(1);
    });

    test('removeAt 无效索引返回 null', () => {
        expect(heap.removeAt(-1)).toBeNull();
        expect(heap.removeAt(100)).toBeNull();
    });

    test('clear 清空堆', () => {
        heap.push(makeEntry(1, 1.0));
        heap.push(makeEntry(2, 2.0));
        heap.clear();
        expect(heap.size).toBe(0);
        expect(heap.peek()).toBeNull();
    });

    test('相同 expireTime 不崩溃', () => {
        heap.push(makeEntry(1, 1.0));
        heap.push(makeEntry(2, 1.0));
        heap.push(makeEntry(3, 1.0));

        expect(heap.size).toBe(3);
        // 三个都是 1.0，弹出顺序不确定但不应崩溃
        heap.pop();
        heap.pop();
        heap.pop();
        expect(heap.size).toBe(0);
    });

    test('大量数据排序正确', () => {
        const n = 1000;
        const entries: IHeapTimerEntry[] = [];

        // 随机顺序插入
        for (let i = 0; i < n; i++) {
            const entry = makeEntry(i, Math.random() * 10000);
            entries.push(entry);
            heap.push(entry);
        }

        // 弹出应该升序
        let prevTime = -Infinity;
        for (let i = 0; i < n; i++) {
            const popped = heap.pop()!;
            expect(popped.expireTime).toBeGreaterThanOrEqual(prevTime);
            prevTime = popped.expireTime;
        }
    });
});
