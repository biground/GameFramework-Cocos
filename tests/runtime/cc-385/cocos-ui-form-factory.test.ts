/**
 * CocosUIFormFactory Red 测试
 * 锁定 w2-t3-green 必须遵守的行为契约。
 *
 * 契约摘要：
 *  - constructor(resourceManager: IResourceManager) — 非空校验，null 时抛
 *    `[CocosUIFormFactory] resourceManager 不能为空`
 *  - createForm(formName, config, callbacks):
 *      1) 调 resourceManager.loadAsset(config.path, `ui:${formName}`, inner)
 *      2) 内部 onSuccess → cc.instantiate(Prefab) → 遍历 node.components 找静态
 *         `__IS_UI_FORM__ === true` 的组件 → 调 comp.getUIForm() → callbacks.onSuccess(form)
 *      3) 按 config.layer 懒建 layer 容器并挂到 Canvas；每次更新后按 zIndex 升序
 *         setSiblingIndex（Normal 在 Popup 之前）
 *      4) loadAsset 失败 → callbacks.onFailure(err)；不调用 instantiate
 *      5) 找不到 UIForm 组件 → callbacks.onFailure(new Error('[CocosUIFormFactory] 找不到 UIForm 组件'))
 *  - registerLayer(zIndex, name?) — 预注册新层；createForm 用该 zIndex 能成功
 *  - 场景切换：
 *      - EVENT_BEFORE_SCENE_LOADING → 清空 layerNodes Map
 *      - EVENT_AFTER_SCENE_LAUNCH   → _canvas 置 null
 *      - 切场景后下次 createForm 能用新 Canvas 正常工作
 *  - destroyForm(form) — 调 form 所在 node.destroy()
 *  - Canvas 双策略查找：Component 优先（getComponentInChildren(Canvas)）+ 名字兜底（'Canvas'）
 */

import 'reflect-metadata';
import * as cc from 'cc';
import { UIFormBase } from '@framework/ui/UIFormBase';
import { UILayer, UIFormConfig, UIFormCreateCallbacks } from '@framework/ui/UIDefs';
import { IResourceManager } from '@framework/interfaces/IResourceManager';
import { LoadAssetCallbacks } from '@framework/resource/ResourceDefs';
// 注意：此模块尚未实现，import 本身会让所有测试 red（ts-jest 模块解析失败）。
import { CocosUIFormFactory } from '@runtime/cc-385/CocosUIFormFactory';

// ─────────────────────── helpers ───────────────────────

class TestForm extends UIFormBase {
    private readonly _name: string;
    private readonly _layer: UILayer;
    constructor(name: string, layer: UILayer) {
        super();
        this._name = name;
        this._layer = layer;
    }
    get formName(): string {
        return this._name;
    }
    get layer(): UILayer {
        return this._layer;
    }
}

/** 构造一个标记了 __IS_UI_FORM__ 的 mock Component 类，getUIForm 返回传入的 form 实例。 */
function makeMockFormComponent(uiForm: UIFormBase): new (...args: unknown[]) => cc.Component {
    class MockFormComp extends cc.Component {
        static readonly __IS_UI_FORM__ = true;
        getUIForm(): UIFormBase {
            return uiForm;
        }
    }
    return MockFormComp as unknown as new (...args: unknown[]) => cc.Component;
}

/** 无 __IS_UI_FORM__ 标记的普通 Component，用于 "找不到 UIForm 组件" 场景。 */
class PlainComponent extends cc.Component {}

function createMockResourceManager(): IResourceManager & {
    loadAsset: jest.Mock;
    releaseAsset: jest.Mock;
} {
    return {
        loadAsset: jest.fn(),
        releaseAsset: jest.fn(),
        releaseByOwner: jest.fn(),
        setResourceLoader: jest.fn(),
        hasAsset: jest.fn().mockReturnValue(false),
        getAssetRefCount: jest.fn().mockReturnValue(0),
        getAssetInfo: jest.fn(),
        preload: jest.fn(),
    } as unknown as IResourceManager & { loadAsset: jest.Mock; releaseAsset: jest.Mock };
}

/** 在 director 中装一个带 Canvas 的场景，返回 [scene, canvasNode]。 */
function setupSceneWithCanvas(): { scene: cc.Node; canvas: cc.Node } {
    const scene = new cc.Node('Scene');
    const canvas = cc.makeCanvasMock();
    scene.addChild(canvas);
    cc.director.setScene(scene);
    return { scene, canvas };
}

function makeCallbacks(): UIFormCreateCallbacks & {
    onSuccess: jest.Mock;
    onFailure: jest.Mock;
} {
    return {
        onSuccess: jest.fn(),
        onFailure: jest.fn(),
    };
}

/** 让 loadAsset 同步触发 onSuccess，返回一个新 Prefab。 */
function stubLoadAssetSuccess(
    rm: IResourceManager & { loadAsset: jest.Mock },
    prefab: cc.Prefab,
): void {
    rm.loadAsset.mockImplementation(
        (path: string, _owner: string, callbacks?: LoadAssetCallbacks) => {
            callbacks?.onSuccess?.(path, prefab);
        },
    );
}

// ─────────────────────── suite ───────────────────────

describe('CocosUIFormFactory（Red 阶段）', () => {
    let instantiateSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        cc.director.setScene(null);
        instantiateSpy = jest.spyOn(cc, 'instantiate');
    });

    afterEach(() => {
        instantiateSpy.mockRestore();
    });

    // ───────── 1. 构造注入 ─────────

    describe('构造注入', () => {
        it('传入 IResourceManager 能成功构造', () => {
            const rm = createMockResourceManager();
            const factory = new CocosUIFormFactory(rm);
            expect(factory).toBeInstanceOf(CocosUIFormFactory);
        });

        it('resourceManager 为 null 时抛 "[CocosUIFormFactory] resourceManager 不能为空"', () => {
            expect(() => new CocosUIFormFactory(null as unknown as IResourceManager)).toThrow(
                '[CocosUIFormFactory] resourceManager 不能为空',
            );
        });
    });

    // ───────── 2. createForm 成功路径 ─────────

    it('createForm 成功：按 path + owner 加载、instantiate、取 __IS_UI_FORM__ 组件、回调 onSuccess 并挂到对应 layer 容器', () => {
        const { canvas } = setupSceneWithCanvas();
        const rm = createMockResourceManager();
        const factory = new CocosUIFormFactory(rm);

        const form = new TestForm('HomeForm', UILayer.Normal);
        const instantiatedNode = new cc.Node('HomeForm');
        instantiatedNode.addComponent(makeMockFormComponent(form));
        instantiateSpy.mockReturnValue(instantiatedNode);

        const prefab = new cc.Prefab();
        stubLoadAssetSuccess(rm, prefab);

        const config: UIFormConfig = { path: 'ui/HomeForm', layer: UILayer.Normal };
        const cbs = makeCallbacks();

        factory.createForm('HomeForm', config, cbs);

        expect(rm.loadAsset).toHaveBeenCalledTimes(1);
        expect(rm.loadAsset).toHaveBeenCalledWith(
            'ui/HomeForm',
            'ui:HomeForm',
            expect.objectContaining({
                onSuccess: expect.any(Function) as unknown,
                onFailure: expect.any(Function) as unknown,
            }),
        );
        expect(instantiateSpy).toHaveBeenCalledTimes(1);
        expect(instantiateSpy).toHaveBeenCalledWith(prefab);

        expect(cbs.onSuccess).toHaveBeenCalledTimes(1);
        expect(cbs.onSuccess).toHaveBeenCalledWith(form);
        expect(cbs.onFailure).not.toHaveBeenCalled();

        // 节点应已挂到某个 layer 容器，容器的 parent 应为 Canvas
        expect(instantiatedNode.parent).not.toBeNull();
        expect(instantiatedNode.parent!.parent).toBe(canvas);
    });

    // ───────── 3. createForm 失败（资源加载失败） ─────────

    it('createForm 资源加载失败：回调 onFailure，不调 instantiate', () => {
        setupSceneWithCanvas();
        const rm = createMockResourceManager();
        const factory = new CocosUIFormFactory(rm);

        const loadErr = new Error('资源不存在');
        rm.loadAsset.mockImplementation(
            (path: string, _owner: string, callbacks?: LoadAssetCallbacks) => {
                callbacks?.onFailure?.(path, loadErr);
            },
        );

        const cbs = makeCallbacks();
        factory.createForm('MissingForm', { path: 'ui/MissingForm', layer: UILayer.Normal }, cbs);

        expect(cbs.onFailure).toHaveBeenCalledTimes(1);
        expect(cbs.onFailure).toHaveBeenCalledWith(loadErr);
        expect(cbs.onSuccess).not.toHaveBeenCalled();
        expect(instantiateSpy).not.toHaveBeenCalled();
    });

    // ───────── 4. createForm 失败（找不到 UIForm 组件） ─────────

    it('createForm 找不到带 __IS_UI_FORM__ 标记的组件：回调 onFailure，错误消息含 "找不到 UIForm 组件"', () => {
        setupSceneWithCanvas();
        const rm = createMockResourceManager();
        const factory = new CocosUIFormFactory(rm);

        const node = new cc.Node('NoForm');
        node.addComponent(PlainComponent); // 无 __IS_UI_FORM__
        instantiateSpy.mockReturnValue(node);

        stubLoadAssetSuccess(rm, new cc.Prefab());

        const cbs = makeCallbacks();
        factory.createForm('NoForm', { path: 'ui/NoForm', layer: UILayer.Normal }, cbs);

        expect(cbs.onSuccess).not.toHaveBeenCalled();
        expect(cbs.onFailure).toHaveBeenCalledTimes(1);
        const failureCall = cbs.onFailure.mock.calls[0] as [Error];
        const err = failureCall[0];
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('找不到 UIForm 组件');
    });

    // ───────── 5. registerLayer ─────────

    it('registerLayer 预注册新层：createForm 用该 zIndex 能成功挂到新容器', () => {
        const { canvas } = setupSceneWithCanvas();
        const rm = createMockResourceManager();
        const factory = new CocosUIFormFactory(rm);

        factory.registerLayer(150, 'Guide');

        const form = new TestForm('GuideForm', 150 as UILayer);
        const node = new cc.Node('GuideForm');
        node.addComponent(makeMockFormComponent(form));
        instantiateSpy.mockReturnValue(node);
        stubLoadAssetSuccess(rm, new cc.Prefab());

        const cbs = makeCallbacks();
        factory.createForm('GuideForm', { path: 'ui/GuideForm', layer: 150 as UILayer }, cbs);

        expect(cbs.onSuccess).toHaveBeenCalledWith(form);
        // 容器挂到 Canvas
        expect(node.parent).not.toBeNull();
        expect(node.parent!.parent).toBe(canvas);
        // 容器名称应包含 'Guide'（自定义层名）
        expect(node.parent!.name).toContain('Guide');
    });

    // ───────── 6. layer 容器懒建 + sibling 排序 ─────────

    it('layer 容器懒建 + 按 zIndex 升序 setSiblingIndex（Normal 在 Popup 之前）', () => {
        const { canvas } = setupSceneWithCanvas();
        const rm = createMockResourceManager();
        const factory = new CocosUIFormFactory(rm);

        // 先创建 Popup(300)
        const formPopup = new TestForm('PopupForm', UILayer.Popup);
        const nodePopup = new cc.Node('PopupForm');
        nodePopup.addComponent(makeMockFormComponent(formPopup));

        // 后创建 Normal(100)
        const formNormal = new TestForm('NormalForm', UILayer.Normal);
        const nodeNormal = new cc.Node('NormalForm');
        nodeNormal.addComponent(makeMockFormComponent(formNormal));

        instantiateSpy.mockReturnValueOnce(nodePopup).mockReturnValueOnce(nodeNormal);
        stubLoadAssetSuccess(rm, new cc.Prefab());

        factory.createForm(
            'PopupForm',
            { path: 'ui/PopupForm', layer: UILayer.Popup },
            makeCallbacks(),
        );
        factory.createForm(
            'NormalForm',
            { path: 'ui/NormalForm', layer: UILayer.Normal },
            makeCallbacks(),
        );

        const popupContainer = nodePopup.parent!;
        const normalContainer = nodeNormal.parent!;

        // 两个 layer 容器都应该是 Canvas 的子节点
        expect(popupContainer.parent).toBe(canvas);
        expect(normalContainer.parent).toBe(canvas);

        // 收集两个容器的 setSiblingIndex 调用
        const normalSpy = jest.spyOn(normalContainer, 'setSiblingIndex');
        const popupSpy = jest.spyOn(popupContainer, 'setSiblingIndex');

        // 再创建一个 Normal 表单，触发排序重算；Normal(100) 的兄弟索引应小于 Popup(300)
        const formNormal2 = new TestForm('NormalForm2', UILayer.Normal);
        const nodeNormal2 = new cc.Node('NormalForm2');
        nodeNormal2.addComponent(makeMockFormComponent(formNormal2));
        instantiateSpy.mockReturnValueOnce(nodeNormal2);

        factory.createForm(
            'NormalForm2',
            { path: 'ui/NormalForm2', layer: UILayer.Normal },
            makeCallbacks(),
        );

        expect(normalSpy).toHaveBeenCalled();
        expect(popupSpy).toHaveBeenCalled();
        const lastNormalIdx = normalSpy.mock.calls[normalSpy.mock.calls.length - 1][0];
        const lastPopupIdx = popupSpy.mock.calls[popupSpy.mock.calls.length - 1][0];
        expect(lastNormalIdx).toBeLessThan(lastPopupIdx);
    });

    // ───────── 7. 场景切换失效处理 ─────────

    it('场景切换：EVENT_BEFORE_SCENE_LOADING 清空 layerNodes，EVENT_AFTER_SCENE_LAUNCH 置 _canvas=null，切换后能继续 createForm', () => {
        // 场景 1
        const first = setupSceneWithCanvas();
        const rm = createMockResourceManager();
        const factory = new CocosUIFormFactory(rm);

        const formA = new TestForm('FormA', UILayer.Normal);
        const nodeA = new cc.Node('FormA');
        nodeA.addComponent(makeMockFormComponent(formA));
        instantiateSpy.mockReturnValueOnce(nodeA);
        stubLoadAssetSuccess(rm, new cc.Prefab());

        factory.createForm('FormA', { path: 'ui/FormA', layer: UILayer.Normal }, makeCallbacks());
        expect(nodeA.parent!.parent).toBe(first.canvas);

        // 模拟场景切换
        (cc.director as unknown as { emit: (e: string, ...a: unknown[]) => void }).emit(
            cc.Director.EVENT_BEFORE_SCENE_LOADING,
        );
        (cc.director as unknown as { emit: (e: string, ...a: unknown[]) => void }).emit(
            cc.Director.EVENT_AFTER_SCENE_LAUNCH,
        );

        // 场景 2：新 Canvas
        const second = setupSceneWithCanvas();
        expect(second.canvas).not.toBe(first.canvas);

        const formB = new TestForm('FormB', UILayer.Normal);
        const nodeB = new cc.Node('FormB');
        nodeB.addComponent(makeMockFormComponent(formB));
        instantiateSpy.mockReturnValueOnce(nodeB);

        const cbsB = makeCallbacks();
        factory.createForm('FormB', { path: 'ui/FormB', layer: UILayer.Normal }, cbsB);

        expect(cbsB.onSuccess).toHaveBeenCalledWith(formB);
        // 新节点应挂到新 Canvas，而不是旧的
        expect(nodeB.parent).not.toBeNull();
        expect(nodeB.parent!.parent).toBe(second.canvas);
        expect(nodeB.parent!.parent).not.toBe(first.canvas);
    });

    // ───────── 8. destroyForm ─────────

    it('destroyForm(form) 调用 form 所在 node.destroy()', () => {
        setupSceneWithCanvas();
        const rm = createMockResourceManager();
        const factory = new CocosUIFormFactory(rm);

        const form = new TestForm('ByeForm', UILayer.Normal);
        const node = new cc.Node('ByeForm');
        node.addComponent(makeMockFormComponent(form));
        const destroySpy = jest.spyOn(node, 'destroy');
        instantiateSpy.mockReturnValue(node);
        stubLoadAssetSuccess(rm, new cc.Prefab());

        factory.createForm(
            'ByeForm',
            { path: 'ui/ByeForm', layer: UILayer.Normal },
            makeCallbacks(),
        );

        factory.destroyForm(form);

        expect(destroySpy).toHaveBeenCalledTimes(1);
    });

    // ───────── 9. Canvas 双策略查找 ─────────

    describe('Canvas 双策略查找', () => {
        it('场景内存在名为 "Canvas" 的节点时能找到', () => {
            // makeCanvasMock 返回的 Node 名称即为 'Canvas'
            const { canvas } = setupSceneWithCanvas();
            const rm = createMockResourceManager();
            const factory = new CocosUIFormFactory(rm);

            const form = new TestForm('F', UILayer.Normal);
            const node = new cc.Node('F');
            node.addComponent(makeMockFormComponent(form));
            instantiateSpy.mockReturnValue(node);
            stubLoadAssetSuccess(rm, new cc.Prefab());

            const cbs = makeCallbacks();
            factory.createForm('F', { path: 'ui/F', layer: UILayer.Normal }, cbs);

            expect(cbs.onSuccess).toHaveBeenCalledWith(form);
            expect(node.parent!.parent).toBe(canvas);
        });

        it('场景内无 "Canvas" 名称但有带 Canvas Component 的节点时，通过 getComponentInChildren(Canvas) 找到', () => {
            const scene = new cc.Node('Scene');
            const weirdCanvas = new cc.Node('MainUI'); // 注意名称不是 'Canvas'
            weirdCanvas.addComponent(cc.Canvas);
            weirdCanvas.addComponent(cc.UITransform);
            scene.addChild(weirdCanvas);
            cc.director.setScene(scene);

            const rm = createMockResourceManager();
            const factory = new CocosUIFormFactory(rm);

            const form = new TestForm('G', UILayer.Normal);
            const node = new cc.Node('G');
            node.addComponent(makeMockFormComponent(form));
            instantiateSpy.mockReturnValue(node);
            stubLoadAssetSuccess(rm, new cc.Prefab());

            const cbs = makeCallbacks();
            factory.createForm('G', { path: 'ui/G', layer: UILayer.Normal }, cbs);

            expect(cbs.onSuccess).toHaveBeenCalledWith(form);
            expect(node.parent!.parent).toBe(weirdCanvas);
        });
    });
});
