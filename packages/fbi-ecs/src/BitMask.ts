/**
 * 多字位掩码
 * 基于 Uint32Array，突破 JavaScript 32-bit 位运算限制
 * 支持任意数量的位标记
 */
export class BitMask {
    private _words: Uint32Array;

    /**
     * @param bitCount 初始支持的位数（自动按 32 对齐扩展）
     */
    constructor(bitCount: number = 64) {
        const wordCount = Math.ceil(bitCount / 32) || 1;
        this._words = new Uint32Array(wordCount);
    }

    /** 位数容量 */
    get capacity(): number {
        return this._words.length * 32;
    }

    /** 底层数据（只读，用于测试/调试） */
    get words(): Readonly<Uint32Array> {
        return this._words;
    }

    /**
     * 设置指定位为 1
     * 如果 bit 超出当前容量，自动扩展
     */
    set(bit: number): void {
        const wordIndex = bit >>> 5; // bit / 32
        if (wordIndex >= this._words.length) {
            this._grow(wordIndex + 1);
        }
        this._words[wordIndex] |= (1 << (bit & 31)) >>> 0;
    }

    /**
     * 清除指定位（设为 0）
     */
    clear(bit: number): void {
        const wordIndex = bit >>> 5;
        if (wordIndex < this._words.length) {
            this._words[wordIndex] &= ~((1 << (bit & 31)) >>> 0);
        }
    }

    /**
     * 检查指定位是否为 1
     */
    has(bit: number): boolean {
        const wordIndex = bit >>> 5;
        if (wordIndex >= this._words.length) return false;
        return (this._words[wordIndex] & ((1 << (bit & 31)) >>> 0)) !== 0;
    }

    /**
     * 检查 this 是否包含 other 的所有位（AND 检查）
     * 即 other 是 this 的子集
     */
    containsAll(other: BitMask): boolean {
        const otherWords = other._words;
        const thisWords = this._words;
        const len = otherWords.length;
        for (let i = 0; i < len; i++) {
            const otherVal = otherWords[i];
            const thisVal = i < thisWords.length ? thisWords[i] : 0;
            if ((thisVal & otherVal) !== otherVal) return false;
        }
        return true;
    }

    /**
     * 检查 this 和 other 是否有任意交集（OR 检查）
     */
    containsAny(other: BitMask): boolean {
        const otherWords = other._words;
        const thisWords = this._words;
        const len = Math.min(thisWords.length, otherWords.length);
        for (let i = 0; i < len; i++) {
            if ((thisWords[i] & otherWords[i]) !== 0) return true;
        }
        return false;
    }

    /**
     * 检查 this 和 other 没有任何交集
     */
    containsNone(other: BitMask): boolean {
        return !this.containsAny(other);
    }

    /** 清零所有位 */
    reset(): void {
        this._words.fill(0);
    }

    /** 克隆 */
    clone(): BitMask {
        const m = new BitMask(1);
        m._words = new Uint32Array(this._words);
        return m;
    }

    /** 是否所有位都是 0 */
    isEmpty(): boolean {
        for (let i = 0; i < this._words.length; i++) {
            if (this._words[i] !== 0) return false;
        }
        return true;
    }

    /** 扩展内部数组 */
    private _grow(minWordCount: number): void {
        const newWords = new Uint32Array(minWordCount);
        newWords.set(this._words);
        this._words = newWords;
    }
}
