import { director } from 'cc';
import { CocosSceneLoader } from '@runtime/cc-385/CocosSceneLoader';

/**
 * CocosSceneLoader.preloadScene 测试
 *
 * 覆盖契约：
 * - 成功时回调无参数（undefined）
 * - 失败时回调携带 error 消息字符串
 * - 不传 onComplete 时成功/失败均不报错
 */
describe('CocosSceneLoader.preloadScene', () => {
    let loader: CocosSceneLoader;

    beforeEach(() => {
        jest.clearAllMocks();
        loader = new CocosSceneLoader();
    });

    it('成功时：director.preloadScene 被调用，onComplete 回调无参数', () => {
        (director.preloadScene as jest.Mock).mockImplementation(
            (_name: string, onLoaded: (err: Error | null) => void) => {
                onLoaded(null);
            },
        );

        const onComplete = jest.fn();
        loader.preloadScene('Battle', onComplete);

        expect(director.preloadScene).toHaveBeenCalledTimes(1);
        expect(director.preloadScene).toHaveBeenCalledWith('Battle', expect.any(Function));
        expect(onComplete).toHaveBeenCalledTimes(1);
        // 成功时无参数调用 onComplete()
        expect(onComplete.mock.calls[0]).toEqual([]);
    });

    it('失败时：onComplete 回调传递 error 消息字符串', () => {
        (director.preloadScene as jest.Mock).mockImplementation(
            (_name: string, onLoaded: (err: Error | null) => void) => {
                onLoaded(new Error('场景文件不存在'));
            },
        );

        const onComplete = jest.fn();
        loader.preloadScene('Missing', onComplete);

        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledWith('场景文件不存在');
    });

    it('不传 onComplete 时成功不报错', () => {
        (director.preloadScene as jest.Mock).mockImplementation(
            (_name: string, onLoaded: (err: Error | null) => void) => {
                onLoaded(null);
            },
        );

        expect(() => loader.preloadScene('Battle')).not.toThrow();
    });

    it('不传 onComplete 时失败不报错', () => {
        (director.preloadScene as jest.Mock).mockImplementation(
            (_name: string, onLoaded: (err: Error | null) => void) => {
                onLoaded(new Error('加载失败'));
            },
        );

        expect(() => loader.preloadScene('Missing')).not.toThrow();
    });
});
