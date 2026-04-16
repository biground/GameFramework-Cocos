import { IHeapTimerEntry } from './HeapTimerDefs';

/**
 * 最小堆（按 expireTime 排序）
 *
 * 数组存储：父节点 i 的左子节点 = 2i+1，右子节点 = 2i+2
 * 堆性质：arr[parent].expireTime <= arr[child].expireTime
 *
 * 每个 entry 维护 heapIndex，使得按 id 查到 entry 后可以 O(1) 定位在堆中的位置
 */
export class MinHeap {
    /** 堆数组 */
    private _data: IHeapTimerEntry[] = [];

    /** 堆中元素数量 */
    public get size(): number {
        return this._data.length;
    }

    /**
     * 查看堆顶元素（不移除）
     * @returns 堆顶元素，堆空时返回 null
     */
    public peek(): IHeapTimerEntry | null {
        return this._data.length > 0 ? this._data[0] : null;
    }

    /**
     * 插入元素并上浮到正确位置
     * 复杂度：O(log n)
     */
    public push(entry: IHeapTimerEntry): void {
        entry.heapIndex = this._data.length;
        this._data.push(entry);
        this._siftUp(this._data.length - 1);
    }

    /**
     * 移除并返回堆顶元素
     * 复杂度：O(log n)
     */
    public pop(): IHeapTimerEntry | null {
        if (this._data.length === 0) {
            return null;
        }

        const top = this._data[0];
        const last = this._data.pop()!;

        if (this._data.length > 0) {
            this._data[0] = last;
            last.heapIndex = 0;
            this._siftDown(0);
        }

        top.heapIndex = -1;
        return top;
    }

    /**
     * 移除指定索引的元素
     * 利用 entry.heapIndex 可以 O(1) 定位，然后 O(log n) 调整
     * 复杂度：O(log n)
     */
    public removeAt(index: number): IHeapTimerEntry | null {
        if (index < 0 || index >= this._data.length) {
            return null;
        }

        const removed = this._data[index];

        // 特殊情况：移除最后一个
        if (index === this._data.length - 1) {
            this._data.pop();
            removed.heapIndex = -1;
            return removed;
        }

        // 用最后一个元素替换被删位置
        const last = this._data.pop()!;
        this._data[index] = last;
        last.heapIndex = index;

        // 判断是上浮还是下沉
        if (index > 0 && last.expireTime < this._data[this._parentIndex(index)].expireTime) {
            this._siftUp(index);
        } else {
            this._siftDown(index);
        }

        removed.heapIndex = -1;
        return removed;
    }

    /**
     * 清空堆
     */
    public clear(): void {
        this._data.length = 0;
    }

    // ─── 堆核心操作 ──────────────────────────────────

    /**
     * 上浮：将 index 处的元素向上移到正确位置
     * 当元素比父节点小时，和父节点交换
     */
    private _siftUp(index: number): void {
        while (index > 0) {
            const parentIdx = this._parentIndex(index);
            if (this._data[index].expireTime >= this._data[parentIdx].expireTime) {
                break;
            }
            this._swap(index, parentIdx);
            index = parentIdx;
        }
    }

    /**
     * 下沉：将 index 处的元素向下移到正确位置
     * 当元素比子节点大时，和较小的子节点交换
     */
    private _siftDown(index: number): void {
        const length = this._data.length;
        let smallest = this._smallestChild(index, length);

        while (smallest !== index) {
            this._swap(index, smallest);
            index = smallest;
            smallest = this._smallestChild(index, length);
        }
    }

    /**
     * 找到 index 和其子节点中 expireTime 最小的索引
     */
    private _smallestChild(index: number, length: number): number {
        let smallest = index;
        const left = 2 * index + 1;
        const right = 2 * index + 2;

        if (left < length && this._data[left].expireTime < this._data[smallest].expireTime) {
            smallest = left;
        }

        if (right < length && this._data[right].expireTime < this._data[smallest].expireTime) {
            smallest = right;
        }

        return smallest;
    }

    /**
     * 交换两个位置的元素，同时维护 heapIndex
     */
    private _swap(i: number, j: number): void {
        const temp = this._data[i];
        this._data[i] = this._data[j];
        this._data[j] = temp;

        this._data[i].heapIndex = i;
        this._data[j].heapIndex = j;
    }

    /**
     * 获取父节点索引
     */
    private _parentIndex(index: number): number {
        return Math.floor((index - 1) / 2);
    }
}
