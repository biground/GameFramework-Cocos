import { Canvas, director, Director, instantiate, Node, Prefab } from 'cc';

import { Logger } from '../../framework/debug/Logger';
import { IResourceManager } from '../../framework/interfaces/IResourceManager';
import { LoadAssetCallbacks } from '../../framework/resource/ResourceDefs';
import { IUIFormFactory, UIFormConfig, UIFormCreateCallbacks } from '../../framework/ui/UIDefs';
import { UIFormBase } from '../../framework/ui/UIFormBase';

/**
 * Cocos Creator 3.8.5 运行时的 UIForm 工厂实现。
 *
 * 职责：
 * - 通过 IResourceManager 加载 Prefab → instantiate 成 Node
 * - 在 Node 上查找带 `__IS_UI_FORM__` 静态标记的组件，反射出 UIForm 实例
 * - 按 layer 懒建容器节点挂到 Canvas，并保持 zIndex 升序排列
 * - 场景切换时清空 layer 容器缓存与 Canvas 缓存，避免跨场景悬挂
 */
export class CocosUIFormFactory implements IUIFormFactory {
    private static readonly TAG = 'CocosUIFormFactory';

    private readonly _resourceManager: IResourceManager;
    /** Canvas 节点缓存（场景切换时失效） */
    private _canvas: Node | null = null;
    /** zIndex → layer 容器节点 */
    private readonly _layerNodes = new Map<number, Node>();
    /** 显式预注册的层 zIndex → 名称 */
    private readonly _registeredLayerNames = new Map<number, string>();
    /** form → node 映射，用于 destroyForm 反查 */
    private readonly _formNodes = new Map<UIFormBase, Node>();

    constructor(resourceManager: IResourceManager) {
        if (!resourceManager) {
            Logger.error(CocosUIFormFactory.TAG, 'resourceManager 不能为空');
            throw new Error('[CocosUIFormFactory] resourceManager 不能为空');
        }
        this._resourceManager = resourceManager;
        director.on(Director.EVENT_BEFORE_SCENE_LOADING, this._onBeforeSceneLoading);
        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this._onAfterSceneLaunch);
    }

    /**
     * 预注册一个自定义层。
     * 不立即创建容器；createForm 触及该 layer 时才懒建。
     */
    public registerLayer(zIndex: number, name?: string): void {
        this._registeredLayerNames.set(zIndex, name ?? `Layer${zIndex}`);
    }

    public createForm(
        formName: string,
        config: UIFormConfig,
        callbacks: UIFormCreateCallbacks,
    ): void {
        const owner = `ui:${formName}`;
        const loadCallbacks: LoadAssetCallbacks = {
            onSuccess: (_path, asset) => {
                let node: Node | null = null;
                try {
                    const instance: Node = instantiate(asset as Prefab);
                    node = instance;
                    const form = this._findUIForm(instance);
                    if (!form) {
                        instance.destroy();
                        callbacks.onFailure(new Error('[CocosUIFormFactory] 找不到 UIForm 组件'));
                        return;
                    }
                    const layerNode = this._getOrCreateLayer(config.layer);
                    layerNode.addChild(instance);
                    this._formNodes.set(form, instance);
                    callbacks.onSuccess(form);
                } catch (e) {
                    if (node) {
                        try {
                            node.destroy();
                        } catch {
                            // 忽略销毁异常
                        }
                    }
                    callbacks.onFailure(e as Error);
                }
            },
            onFailure: (_path, err) => {
                callbacks.onFailure(err);
            },
        };
        this._resourceManager.loadAsset(config.path, owner, loadCallbacks);
    }

    public destroyForm(form: UIFormBase): void {
        const node = this._formNodes.get(form);
        if (!node) {
            return;
        }
        this._formNodes.delete(form);
        node.destroy();
    }

    /**
     * 遍历节点上的组件，找到第一个带 `__IS_UI_FORM__ === true` 标记的组件，
     * 调用其 `getUIForm()` 返回 UIForm 实例。找不到返回 null。
     */
    private _findUIForm(node: Node): UIFormBase | null {
        const components = (node as unknown as { components?: unknown[] }).components ?? [];
        for (const c of components) {
            const comp = c as {
                constructor: { __IS_UI_FORM__?: boolean };
                getUIForm?: () => UIFormBase;
            };
            if (comp.constructor?.__IS_UI_FORM__ === true && typeof comp.getUIForm === 'function') {
                return comp.getUIForm();
            }
        }
        return null;
    }

    /**
     * 获取或懒建指定 layer 的容器节点；每次调用后按 zIndex 升序重排所有容器，
     * 保证高 zIndex 层始终在低 zIndex 层之后渲染。
     */
    private _getOrCreateLayer(layer: number): Node {
        let layerNode = this._layerNodes.get(layer);
        if (!layerNode) {
            const canvas = this._getCanvas();
            if (!canvas) {
                throw new Error('[CocosUIFormFactory] 找不到 Canvas 节点');
            }
            const name = this._registeredLayerNames.get(layer) ?? `Layer${layer}`;
            layerNode = new Node(`UILayer-${name}`);
            canvas.addChild(layerNode);
            this._layerNodes.set(layer, layerNode);
        }
        // 每次都按 layer zIndex 升序重排所有容器（幂等操作）
        const sorted = [...this._layerNodes.entries()].sort((a, b) => a[0] - b[0]);
        sorted.forEach(([, n], i) => {
            n.setSiblingIndex(i);
        });
        return layerNode;
    }

    /**
     * 双策略查找 Canvas 节点：
     *  1. 通过 `Canvas` 组件查找（官方推荐）
     *  2. 名字兜底：按 'Canvas' 名称查找
     */
    private _getCanvas(): Node | null {
        if (this._canvas && (this._canvas as unknown as { isValid?: boolean }).isValid !== false) {
            return this._canvas;
        }
        const scene = director.getScene();
        if (!scene) {
            return null;
        }
        const canvasComp = scene.getComponentInChildren(Canvas);
        if (canvasComp) {
            this._canvas = canvasComp.node;
            return this._canvas;
        }
        // 名字兜底策略：按 'Canvas' 名称查找子节点
        const byName =
            (
                scene as unknown as {
                    getChildByName?: (name: string) => Node | null;
                }
            ).getChildByName?.('Canvas') ?? null;
        this._canvas = byName;
        return this._canvas;
    }

    private readonly _onBeforeSceneLoading = (): void => {
        this._layerNodes.clear();
    };

    private readonly _onAfterSceneLaunch = (): void => {
        this._canvas = null;
    };
}
