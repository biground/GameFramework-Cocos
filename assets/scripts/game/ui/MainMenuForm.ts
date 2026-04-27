import { UILayer } from '@framework/ui/UIDefs';
import { UIFormBase } from '@framework/ui/UIFormBase';

/** 主菜单 UI 表单。 */
export class MainMenuForm extends UIFormBase {
    /** UIManager 注册使用的表单名称。 */
    public static readonly FORM_NAME = 'MainMenuForm';

    /** 主菜单 Prefab 的资源路径。 */
    public static readonly RESOURCE_PATH = 'ui/MainMenuForm';

    /** 表单名称。 */
    public get formName(): string {
        return MainMenuForm.FORM_NAME;
    }

    /** 主菜单属于普通 UI 层。 */
    public get layer(): UILayer {
        return UILayer.Normal;
    }
}
