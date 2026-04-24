import { director, Director } from 'cc';
import { Logger } from '@framework/debug/Logger';
import { CocosSceneLoader } from '@runtime/cc-385/CocosSceneLoader';
import type { LoadSceneCallbacks } from '@framework/scene/SceneDefs';

/**
 * CocosSceneLoader Red 测试
 *
 * 覆盖契约：
 * - loadScene 成功 / 失败回调分发
 * - 同名场景重复加载 → 单 flight（第二次立刻 onFailure，director 只被调一次）
 * - 异名场景并发 → 拒绝后加入者（单 flight 语义）
 * - 事件 listener 基于闭包校验 sceneName，避免并发错乱
 * - unloadScene 在 Cocos 下空实现 + Logger.warn，不抛异常
 */
describe('CocosSceneLoader（Red）', () => {
    let loader: CocosSceneLoader;
    let callbacks: jest.Mocked<Required<LoadSceneCallbacks>>;

    beforeEach(() => {
        jest.clearAllMocks();
        loader = new CocosSceneLoader();
        callbacks = {
            onProgress: jest.fn(),
            onSuccess: jest.fn(),
            onFailure: jest.fn(),
        };
    });

    describe('loadScene 基本回调分发', () => {
        it('加载成功：应调用 director.loadScene(name, onLaunched)，并在 onLaunched(null, scene) 后触发 onSuccess', () => {
            (director.loadScene as jest.Mock).mockImplementation(
                (_name: string, onLaunched: (err: Error | null, scene?: unknown) => void) => {
                    onLaunched(null, { name: 'Main' });
                    return true;
                },
            );

            loader.loadScene('Main', callbacks);

            expect(director.loadScene).toHaveBeenCalledTimes(1);
            const firstCall = (director.loadScene as jest.Mock).mock.calls[0] as [
                string,
                (err: Error | null, scene?: unknown) => void,
            ];
            expect(firstCall[0]).toBe('Main');
            expect(typeof firstCall[1]).toBe('function');
            expect(callbacks.onSuccess).toHaveBeenCalledWith('Main');
            expect(callbacks.onFailure).not.toHaveBeenCalled();
        });

        it('加载失败：onLaunched(new Error) 时应触发 onFailure(name, errorMessage)', () => {
            (director.loadScene as jest.Mock).mockImplementation(
                (_name: string, onLaunched: (err: Error | null) => void) => {
                    onLaunched(new Error('not found'));
                    return false;
                },
            );

            loader.loadScene('Missing', callbacks);

            expect(callbacks.onFailure).toHaveBeenCalledTimes(1);
            const [failedName, errMsg] = callbacks.onFailure.mock.calls[0];
            expect(failedName).toBe('Missing');
            expect(String(errMsg)).toContain('not found');
            expect(callbacks.onSuccess).not.toHaveBeenCalled();
        });
    });

    describe('单 flight 语义', () => {
        it('同一场景重复加载：第二次应立即 onFailure，director.loadScene 只被调一次', () => {
            // director.loadScene 挂起不回调，模拟加载中
            (director.loadScene as jest.Mock).mockImplementation(() => true);

            loader.loadScene('Main', callbacks);
            const secondCb: jest.Mocked<Required<LoadSceneCallbacks>> = {
                onProgress: jest.fn(),
                onSuccess: jest.fn(),
                onFailure: jest.fn(),
            };
            loader.loadScene('Main', secondCb);

            expect(director.loadScene).toHaveBeenCalledTimes(1);
            expect(secondCb.onSuccess).not.toHaveBeenCalled();
            expect(secondCb.onFailure).toHaveBeenCalledTimes(1);
            const [name, msg] = secondCb.onFailure.mock.calls[0];
            expect(name).toBe('Main');
            expect(String(msg)).toMatch(/loading|加载/i);
        });

        it('异名场景并发：A 未完成时 loadScene(B) 应被拒绝 onFailure，director.loadScene 仍只被调一次', () => {
            (director.loadScene as jest.Mock).mockImplementation(() => true);

            loader.loadScene('A', callbacks);
            const cbB: jest.Mocked<Required<LoadSceneCallbacks>> = {
                onProgress: jest.fn(),
                onSuccess: jest.fn(),
                onFailure: jest.fn(),
            };
            loader.loadScene('B', cbB);

            expect(director.loadScene).toHaveBeenCalledTimes(1);
            const concurrentCall = (director.loadScene as jest.Mock).mock.calls[0] as [
                string,
                unknown,
            ];
            expect(concurrentCall[0]).toBe('A');
            expect(cbB.onFailure).toHaveBeenCalledTimes(1);
            expect(cbB.onFailure.mock.calls[0][0]).toBe('B');
        });

        it('加载完成后应释放 flight 锁：下一次 loadScene 能正常进入', () => {
            (director.loadScene as jest.Mock).mockImplementation(
                (_name: string, onLaunched: (err: Error | null, scene?: unknown) => void) => {
                    onLaunched(null, { name: _name });
                    return true;
                },
            );

            loader.loadScene('A', callbacks);
            expect(callbacks.onSuccess).toHaveBeenCalledWith('A');

            const cbB: jest.Mocked<Required<LoadSceneCallbacks>> = {
                onProgress: jest.fn(),
                onSuccess: jest.fn(),
                onFailure: jest.fn(),
            };
            loader.loadScene('B', cbB);

            expect(director.loadScene).toHaveBeenCalledTimes(2);
            expect(cbB.onSuccess).toHaveBeenCalledWith('B');
            expect(cbB.onFailure).not.toHaveBeenCalled();
        });
    });

    describe('事件 listener 闭包校验 sceneName', () => {
        it('加载中若 director 发出其它场景的 EVENT_BEFORE_SCENE_LOADING，当前加载的 onProgress 不应被误触', () => {
            // director.loadScene 挂起，保持 loading 态
            (director.loadScene as jest.Mock).mockImplementation(() => true);

            loader.loadScene('A', callbacks);

            // 模拟引擎/其它来源对异名场景发出事件
            director.emit(Director.EVENT_BEFORE_SCENE_LOADING, 'B');
            director.emit(Director.EVENT_BEFORE_SCENE_LAUNCH, 'B');
            director.emit(Director.EVENT_AFTER_SCENE_LAUNCH, 'B');

            expect(callbacks.onProgress).not.toHaveBeenCalled();
            expect(callbacks.onSuccess).not.toHaveBeenCalled();
            expect(callbacks.onFailure).not.toHaveBeenCalled();
        });
    });

    describe('unloadScene 空实现', () => {
        it('Cocos 下 unloadScene 不支持：应 Logger.warn 且不抛异常', () => {
            const warnSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => {});

            expect(() => loader.unloadScene('Main')).not.toThrow();
            expect(warnSpy).toHaveBeenCalled();

            warnSpy.mockRestore();
        });
    });
});
