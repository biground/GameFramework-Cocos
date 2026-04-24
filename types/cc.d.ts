// Type declarations for Cocos Creator（mock 子集，供测试类型检查）
// 泛型构造器参数用 any 以兼容调用方的任意构造函数签名。
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'cc' {
    export const _decorator: {
        ccclass: (name?: string) => ClassDecorator;
        property: (options?: unknown) => PropertyDecorator;
    };

    export class Component {
        node: Node;
        enabled: boolean;
        isValid: boolean;
        getComponent<T extends Component>(type: new (...args: any[]) => T): T | null;
    }

    export class Node {
        name: string;
        isValid: boolean;
        parent: Node | null;
        children: Node[];
        components: Component[];

        constructor(name?: string);

        addComponent<T extends Component>(cls: new (...args: any[]) => T): T;
        getComponent<T extends Component>(cls: new (...args: any[]) => T): T | null;
        getComponentInChildren<T extends Component>(cls: new (...args: any[]) => T): T | null;
        addChild(node: Node): void;
        setSiblingIndex(index: number): void;
        destroy(): void;
    }

    export class Asset {
        _ref: number;
        readonly refCount: number;
        addRef(): this;
        decRef(autoRelease?: boolean): void;
    }

    export class Prefab extends Asset {}

    export class SpriteFrame extends Asset {}

    export class Canvas extends Component {}

    export class UITransform extends Component {}

    export class Label extends Component {
        string: string;
    }

    export class Sprite extends Component {
        spriteFrame: SpriteFrame | null;
    }

    export function instantiate<T = Node>(obj: unknown): T;

    export function makeCanvasMock(): Node;

    export const Director: {
        EVENT_BEFORE_SCENE_LOADING: string;
        EVENT_BEFORE_SCENE_LAUNCH: string;
        EVENT_AFTER_SCENE_LAUNCH: string;
    };

    export const director: {
        loadScene(sceneName: string, onLaunched?: (...args: any[]) => void): boolean;
        preloadScene(sceneName: string, onLoaded?: (...args: any[]) => void): void;
        getScene(): Node | null;
        setScene(scene: Node | null): void;
        on(event: string, cb: (...args: any[]) => void): void;
        off(event: string, cb: (...args: any[]) => void): void;
        emit(event: string, ...args: any[]): void;
    };

    export const resources: {
        // 重载 1：(paths, onComplete)
        load<T>(paths: string | string[], onComplete: (err: Error | null, asset: T) => void): void;
        // 重载 2：(paths, type, onComplete)
        load<T>(
            paths: string | string[],
            type: new (...args: any[]) => T,
            onComplete: (err: Error | null, asset: T) => void,
        ): void;
        // 重载 3：(paths, type, onProgress, onComplete)
        load<T>(
            paths: string | string[],
            type: new (...args: any[]) => T,
            onProgress: (finished: number, total: number, item?: unknown) => void,
            onComplete: (err: Error | null, asset: T) => void,
        ): void;
    };
}
