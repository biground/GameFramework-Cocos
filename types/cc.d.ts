// Type declarations for Cocos Creator
declare module 'cc' {
    export const _decorator: {
        ccclass: (name?: string) => ClassDecorator;
        property: (options?: unknown) => PropertyDecorator;
    };

    export class Component {
        node: Node;
        getComponent<T extends Component>(type: new (...args: unknown[]) => T): T | null;
    }

    export class Node {
        getComponent<T extends Component>(type: new (...args: unknown[]) => T): T | null;
    }

    export class Label extends Component {
        string: string;
    }

    export class Sprite extends Component {
        spriteFrame: SpriteFrame | null;
        isValid: boolean;
    }

    export class SpriteFrame {
        // SpriteFrame 类型定义
    }

    export const resources: {
        load<T>(
            path: string,
            type: new (...args: unknown[]) => T,
            callback: (err: Error | null, asset: T) => void,
        ): void;
    };
}
