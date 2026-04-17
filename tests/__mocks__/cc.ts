// Mock for Cocos Creator 'cc' module
export const _decorator = {
    ccclass: (_name?: string) => (target: any) => target,
    property: (_options?: any) => (_target: any, _propertyKey: string) => {},
};

export class Component {
    node: any = null;

    getComponent<T>(_type: new (...args: any[]) => T): T | null {
        return null;
    }
}

export class Node {
    getComponent<T>(_type: new (...args: any[]) => T): T | null {
        return null;
    }
}

export class Label extends Component {
    string: string = '';
}

export class Sprite extends Component {
    spriteFrame: any = null;
    isValid: boolean = true;
}

export class SpriteFrame {
    // Mock SpriteFrame
}

export const resources = {
    load: jest.fn(),
};
