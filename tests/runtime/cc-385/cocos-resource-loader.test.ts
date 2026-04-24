// CocosResourceLoader Red 测试
// 驱动 assets/scripts/runtime/cc-385/CocosResourceLoader.ts 的实现
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */

import { Asset, Prefab, resources } from 'cc';

import { CocosResourceLoader } from '@runtime/cc-385/CocosResourceLoader';
import type { LoadAssetCallbacks } from '@framework/resource/ResourceDefs';

describe('CocosResourceLoader', () => {
    let loader: CocosResourceLoader;

    beforeEach(() => {
        jest.clearAllMocks();
        (resources.load as jest.Mock).mockReset();
        loader = new CocosResourceLoader();
    });

    describe('loadAsset', () => {
        it('成功时回调 onSuccess 且 asset.addRef() 被调一次', () => {
            const asset = new Prefab();
            (resources.load as jest.Mock).mockImplementation(
                (_path: string, _type: unknown, _onProgress: unknown, onComplete: unknown) => {
                    (onComplete as (err: Error | null, a: Asset) => void)(null, asset);
                },
            );

            const callbacks: LoadAssetCallbacks = {
                onSuccess: jest.fn(),
                onFailure: jest.fn(),
                onProgress: jest.fn(),
            };
            loader.loadAsset('prefabs/hero', callbacks);

            expect(resources.load).toHaveBeenCalledTimes(1);
            expect(callbacks.onSuccess).toHaveBeenCalledWith('prefabs/hero', asset);
            expect(callbacks.onFailure).not.toHaveBeenCalled();
            expect(asset.refCount).toBe(1);
        });

        it('失败时回调 onFailure，asset.addRef 不被调', () => {
            const err = new Error('not found');
            (resources.load as jest.Mock).mockImplementation(
                (_path: string, _type: unknown, _onProgress: unknown, onComplete: unknown) => {
                    (onComplete as (e: Error | null, a: Asset | null) => void)(err, null);
                },
            );

            const callbacks: LoadAssetCallbacks = {
                onSuccess: jest.fn(),
                onFailure: jest.fn(),
            };
            loader.loadAsset('prefabs/missing', callbacks);

            expect(callbacks.onFailure).toHaveBeenCalledWith('prefabs/missing', err);
            expect(callbacks.onSuccess).not.toHaveBeenCalled();
        });

        it('进度回调时回调 onProgress(path, 0.5)', () => {
            (resources.load as jest.Mock).mockImplementation(
                (_path: string, _type: unknown, onProgress: unknown, _onComplete: unknown) => {
                    // 模拟 cc：onProgress(finished, total) → 被测代码应转成 (path, 0~1)
                    (onProgress as (finished: number, total: number) => void)(1, 2);
                },
            );

            const callbacks: LoadAssetCallbacks = {
                onProgress: jest.fn(),
            };
            loader.loadAsset('prefabs/hero', callbacks);

            expect(callbacks.onProgress).toHaveBeenCalledWith('prefabs/hero', 0.5);
        });
    });

    describe('releaseAsset', () => {
        it('先 load 成功再 release 时 asset.decRef(true) 被调', () => {
            const asset = new Prefab();
            (resources.load as jest.Mock).mockImplementation(
                (_path: string, _type: unknown, _onProgress: unknown, onComplete: unknown) => {
                    (onComplete as (err: Error | null, a: Asset) => void)(null, asset);
                },
            );
            const decRefSpy = jest.spyOn(asset, 'decRef');

            loader.loadAsset('prefabs/hero', { onSuccess: jest.fn() });
            expect(asset.refCount).toBe(1);

            loader.releaseAsset('prefabs/hero');

            expect(decRefSpy).toHaveBeenCalledTimes(1);
            expect(decRefSpy).toHaveBeenCalledWith(true);
            expect(asset.refCount).toBe(0);
        });

        it('未曾 load 过的 path：不抛错，decRef 不被调', () => {
            expect(() => loader.releaseAsset('prefabs/never-loaded')).not.toThrow();
        });
    });

    describe('引用计数往返为 0', () => {
        it('load→release→load→release 后 asset._ref 回到 0', () => {
            const asset = new Prefab();
            // 同一 asset 实例两次都返回（模拟 cc resources 内部缓存）
            (resources.load as jest.Mock).mockImplementation(
                (_path: string, _type: unknown, _onProgress: unknown, onComplete: unknown) => {
                    (onComplete as (err: Error | null, a: Asset) => void)(null, asset);
                },
            );

            loader.loadAsset('prefabs/hero', { onSuccess: jest.fn() });
            expect(asset.refCount).toBe(1);

            loader.releaseAsset('prefabs/hero');
            expect(asset.refCount).toBe(0);

            loader.loadAsset('prefabs/hero', { onSuccess: jest.fn() });
            expect(asset.refCount).toBe(1);

            loader.releaseAsset('prefabs/hero');
            expect(asset.refCount).toBe(0);
        });
    });

    describe('并发 load 同路径', () => {
        it('两次 loadAsset 同 path：resources.load 只被调 1 次，addRef 只 1 次', () => {
            const asset = new Prefab();
            let pendingComplete: ((err: Error | null, a: Asset) => void) | null = null;
            (resources.load as jest.Mock).mockImplementation(
                (_path: string, _type: unknown, _onProgress: unknown, onComplete: unknown) => {
                    pendingComplete = onComplete as (err: Error | null, a: Asset) => void;
                },
            );

            const cb1: LoadAssetCallbacks = { onSuccess: jest.fn() };
            const cb2: LoadAssetCallbacks = { onSuccess: jest.fn() };
            loader.loadAsset('prefabs/hero', cb1);
            loader.loadAsset('prefabs/hero', cb2);

            expect(resources.load).toHaveBeenCalledTimes(1);

            // 底层完成后两个回调都触发
            pendingComplete!(null, asset);

            expect(cb1.onSuccess).toHaveBeenCalledWith('prefabs/hero', asset);
            expect(cb2.onSuccess).toHaveBeenCalledWith('prefabs/hero', asset);
            expect(asset.refCount).toBe(1);
        });
    });
});
