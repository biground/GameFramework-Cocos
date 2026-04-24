// cc mock 自身的 sanity 测试：验证 mock 行为符合约定
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import {
    Asset,
    Canvas,
    Director,
    Node,
    Prefab,
    UITransform,
    director,
    instantiate,
    makeCanvasMock,
    resources,
} from 'cc';

describe('cc mock sanity', () => {
    describe('resources.load 三种重载分派', () => {
        beforeEach(() => {
            (resources.load as jest.Mock).mockReset();
        });

        it('2 参：(paths, onComplete) 可触发完成回调', () => {
            const onComplete = jest.fn();
            (resources.load as jest.Mock).mockImplementation((paths: unknown, cb: unknown) => {
                (cb as (err: unknown, asset: unknown) => void)(null, { paths });
            });
            (resources.load as any)('p1', onComplete);
            expect(onComplete).toHaveBeenCalledWith(null, { paths: 'p1' });
        });

        it('3 参：(paths, type, onComplete) 可触发完成回调', () => {
            const onComplete = jest.fn();
            (resources.load as jest.Mock).mockImplementation(
                (paths: unknown, _type: unknown, cb: unknown) => {
                    (cb as (err: unknown, asset: unknown) => void)(null, paths);
                },
            );
            (resources.load as any)('p2', Prefab, onComplete);
            expect(onComplete).toHaveBeenCalledWith(null, 'p2');
        });

        it('4 参：(paths, type, onProgress, onComplete) 可触发进度和完成回调', () => {
            const onProgress = jest.fn();
            const onComplete = jest.fn();
            (resources.load as jest.Mock).mockImplementation(
                (_paths: unknown, _type: unknown, progress: unknown, cb: unknown) => {
                    (progress as (finished: number, total: number) => void)(1, 2);
                    (cb as (err: unknown, asset: unknown) => void)(null, 'ok');
                },
            );
            (resources.load as any)('p3', Prefab, onProgress, onComplete);
            expect(onProgress).toHaveBeenCalledWith(1, 2);
            expect(onComplete).toHaveBeenCalledWith(null, 'ok');
        });

        it('mockReset 后无默认副作用', () => {
            expect(() => (resources.load as any)('p4', jest.fn())).not.toThrow();
        });
    });

    describe('Asset 引用计数', () => {
        it('addRef 递增 _ref 并返回自身', () => {
            const a = new Asset();
            expect(a.refCount).toBe(0);
            const ret = a.addRef();
            expect(ret).toBe(a);
            expect(a.refCount).toBe(1);
            a.addRef();
            expect(a.refCount).toBe(2);
        });

        it('decRef 递减 _ref', () => {
            const a = new Asset();
            a.addRef();
            a.addRef();
            a.decRef();
            expect(a.refCount).toBe(1);
            a.decRef(false);
            expect(a.refCount).toBe(0);
        });

        it('Prefab 继承 Asset', () => {
            const p = new Prefab();
            expect(p).toBeInstanceOf(Asset);
            p.addRef();
            expect(p.refCount).toBe(1);
        });
    });

    describe('director 事件系统', () => {
        it('暴露三个 scene 生命周期常量', () => {
            expect(Director.EVENT_BEFORE_SCENE_LOADING).toBe('director_before_scene_loading');
            expect(typeof Director.EVENT_BEFORE_SCENE_LAUNCH).toBe('string');
            expect(typeof Director.EVENT_AFTER_SCENE_LAUNCH).toBe('string');
        });

        it('on/emit/off 一轮流转', () => {
            const cb = jest.fn();
            director.on(Director.EVENT_AFTER_SCENE_LAUNCH, cb);
            director.emit(Director.EVENT_AFTER_SCENE_LAUNCH, 'scene1');
            expect(cb).toHaveBeenCalledWith('scene1');
            director.off(Director.EVENT_AFTER_SCENE_LAUNCH, cb);
            director.emit(Director.EVENT_AFTER_SCENE_LAUNCH, 'scene2');
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('loadScene 是 jest mock 且默认返回 true', () => {
            expect(jest.isMockFunction(director.loadScene)).toBe(true);
            expect(director.loadScene('any')).toBe(true);
        });

        it('preloadScene 是 jest mock', () => {
            expect(jest.isMockFunction(director.preloadScene)).toBe(true);
        });

        it('getScene 默认返回 null', () => {
            expect(director.getScene()).toBeNull();
        });
    });

    describe('Node 组件系统', () => {
        it('addComponent 创建实例并挂载到 node', () => {
            const n = new Node('n1');
            const t = n.addComponent(UITransform);
            expect(t).toBeInstanceOf(UITransform);
            expect(t.node).toBe(n);
            expect(n.components).toContain(t);
        });

        it('getComponent 通过 instanceof 查找', () => {
            const n = new Node();
            const t = n.addComponent(UITransform);
            expect(n.getComponent(UITransform)).toBe(t);
            expect(n.getComponent(Canvas)).toBeNull();
        });

        it('getComponentInChildren 递归查找子孙', () => {
            const root = new Node('root');
            const child = new Node('c');
            const grand = new Node('g');
            root.addChild(child);
            child.addChild(grand);
            const t = grand.addComponent(UITransform);
            expect(root.getComponentInChildren(UITransform)).toBe(t);
        });

        it('addChild 建立父子关系', () => {
            const p = new Node('p');
            const c = new Node('c');
            p.addChild(c);
            expect(p.children).toContain(c);
            expect(c.parent).toBe(p);
        });

        it('destroy 翻转 isValid', () => {
            const n = new Node();
            expect(n.isValid).toBe(true);
            n.destroy();
            expect(n.isValid).toBe(false);
        });

        it('setSiblingIndex 可调用且不抛错', () => {
            const n = new Node();
            expect(() => n.setSiblingIndex(3)).not.toThrow();
        });

        it('name 字段可读写', () => {
            const n = new Node('hello');
            expect(n.name).toBe('hello');
            n.name = 'world';
            expect(n.name).toBe('world');
        });
    });

    describe('instantiate', () => {
        it('返回新的 Node 实例', () => {
            const p = new Prefab();
            const inst = instantiate<Node>(p);
            expect(inst).toBeInstanceOf(Node);
        });
    });

    describe('makeCanvasMock', () => {
        it('返回带 Canvas 和 UITransform 的 Node', () => {
            const node = makeCanvasMock();
            expect(node).toBeInstanceOf(Node);
            expect(node.name).toBe('Canvas');
            expect(node.getComponent(Canvas)).toBeInstanceOf(Canvas);
            expect(node.getComponent(UITransform)).toBeInstanceOf(UITransform);
        });

        it('每次调用返回独立实例', () => {
            const a = makeCanvasMock();
            const b = makeCanvasMock();
            expect(a).not.toBe(b);
            expect(a.getComponent(Canvas)).not.toBe(b.getComponent(Canvas));
        });
    });
});
