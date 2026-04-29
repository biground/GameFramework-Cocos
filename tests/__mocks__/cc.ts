// Mock for Cocos Creator 'cc' module
// 仅用于 Jest 单测，非真实 cc 代码。通过 jest.config.js 的 moduleNameMapper 映射 'cc' → 此文件。
// mock 层为保持与真实 cc 泛型签名兼容，此处允许 any。
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unsafe-return */

// ──────────────── 装饰器 ────────────────
export const _decorator = {
    ccclass: (_name?: string) => (target: any) => target,
    property: (_options?: any) => (_target: any, _propertyKey: string) => {},
};

// ──────────────── Component / Node ────────────────
export class Component {
    node: Node = null as unknown as Node;
    enabled: boolean = true;
    isValid: boolean = true;

    /** 委托给 node.getComponent；node 为空时返回 null（保持向后兼容） */
    getComponent<T extends Component>(cls: new (...args: any[]) => T): T | null {
        return this.node ? this.node.getComponent(cls) : null;
    }
}

export class Node {
    name: string;
    isValid: boolean = true;
    parent: Node | null = null;
    children: Node[] = [];
    components: Component[] = [];

    constructor(name: string = '') {
        this.name = name;
    }

    addComponent<T extends Component>(cls: new (...args: any[]) => T): T {
        const instance = new cls();
        instance.node = this;
        this.components.push(instance);
        return instance;
    }

    getComponent<T extends Component>(cls: new (...args: any[]) => T): T | null {
        for (const c of this.components) {
            if (c instanceof cls) return c;
        }
        return null;
    }

    getComponentInChildren<T extends Component>(cls: new (...args: any[]) => T): T | null {
        const self = this.getComponent(cls);
        if (self) return self;
        for (const child of this.children) {
            const found = child.getComponentInChildren(cls);
            if (found) return found;
        }
        return null;
    }

    addChild(node: Node): void {
        node.parent = this;
        this.children.push(node);
    }

    setSiblingIndex(_n: number): void {
        // noop：mock 中不维护真实兄弟索引
    }

    destroy(): void {
        this.isValid = false;
    }
}

// ──────────────── Asset / Prefab ────────────────
export class Asset {
    _ref: number = 0;

    get refCount(): number {
        return this._ref;
    }

    addRef(): this {
        this._ref++;
        return this;
    }

    decRef(_autoRelease: boolean = true): void {
        this._ref--;
    }
}

export class Prefab extends Asset {}

export class SpriteFrame extends Asset {}

// ──────────────── UI primitives ────────────────
export class Canvas extends Component {}

export class UITransform extends Component {}

export class Label extends Component {
    string: string = '';
}

export class Sprite extends Component {
    spriteFrame: SpriteFrame | null = null;
}

// ──────────────── instantiate ────────────────
/** 简化实现：返回一个新 Node 'instance'，测试可通过 mockImplementation 覆写。 */
export function instantiate<T = Node>(_obj: unknown): T {
    return new Node('instance') as unknown as T;
}

// ──────────────── resources (Bundle 默认实例) ────────────────
// resources.load 支持三种重载：
//   (paths, onComplete)
//   (paths, type, onComplete)
//   (paths, type, onProgress, onComplete)
// 默认空实现。测试中用 mockImplementation 注入行为；按 arguments.length 分派由被测代码自行识别。
export const resources = {
    load: jest.fn(),
    loadDir: jest.fn(
        (
            _path: string,
            _type: unknown,
            onProgress: ((finished: number, total: number) => void) | null,
            onComplete: ((err: Error | null, assets: unknown[], urls: string[]) => void) | null,
        ) => {
            if (typeof onProgress === 'function') onProgress(0, 0);
            if (typeof onComplete === 'function') onComplete(null, [], []);
        },
    ),
};

// ──────────────── director / Director ────────────────
type DirectorListener = (...args: unknown[]) => void;

class DirectorMock {
    private _scene: Node | null = null;
    private readonly _listeners: Map<string, Set<DirectorListener>> = new Map();

    loadScene = jest.fn(
        (_sceneName: string, _onLaunched?: (...args: unknown[]) => void): boolean => true,
    );

    preloadScene = jest.fn(
        (_sceneName: string, _onLoaded?: (...args: unknown[]) => void): void => {},
    );

    getScene(): Node | null {
        return this._scene;
    }

    /** 测试辅助：设置当前场景 */
    setScene(scene: Node | null): void {
        this._scene = scene;
    }

    on(event: string, cb: DirectorListener): void {
        let set = this._listeners.get(event);
        if (!set) {
            set = new Set();
            this._listeners.set(event, set);
        }
        set.add(cb);
    }

    off(event: string, cb: DirectorListener): void {
        this._listeners.get(event)?.delete(cb);
    }

    emit(event: string, ...args: unknown[]): void {
        const set = this._listeners.get(event);
        if (!set) return;
        // 快照遍历，防止回调内 off 导致的并发修改
        for (const cb of Array.from(set)) cb(...args);
    }
}

/** Director 常量命名空间（真实 cc 中是 Director 类的静态属性） */
export const Director = {
    EVENT_BEFORE_SCENE_LOADING: 'director_before_scene_loading',
    EVENT_BEFORE_SCENE_LAUNCH: 'director_before_scene_launch',
    EVENT_AFTER_SCENE_LAUNCH: 'director_after_scene_launch',
};

export const director = new DirectorMock();

// ──────────────── 工厂函数 ────────────────
/** 构造一个带 Canvas + UITransform 组件、名为 'Canvas' 的 Node，供 UI 相关测试使用。 */
export function makeCanvasMock(): Node {
    const node = new Node('Canvas');
    node.addComponent(Canvas);
    node.addComponent(UITransform);
    return node;
}
