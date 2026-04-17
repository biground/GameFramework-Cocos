import { _decorator, Component, Label } from 'cc';
import { LocalizationManager } from '../../framework/i18n/LocalizationManager';
import { LocalizationEvent, LanguageChangedData } from '../../framework/i18n/LocalizationDefs';
import { GameEntry } from '../../framework/core/GameEntry';
import { EventManager } from '../../framework/event/EventManager';
import { Logger } from '../../framework/debug/Logger';

const { ccclass, property } = _decorator;

@ccclass('LocalizedLabel')
export class LocalizedLabel extends Component {
    @property({ tooltip: '翻译 key' })
    public key: string = '';

    @property({ tooltip: 'JSON 格式插值参数（如 {"name": "Player"}）' })
    public paramsJson: string = '';

    protected onLoad(): void {
        this._updateText();
        const eventMgr = GameEntry.getModule<EventManager>('EventManager');
        if (eventMgr) {
            eventMgr.on(LocalizationEvent.LANGUAGE_CHANGED, this._onLanguageChanged, this);
        }
    }

    protected onDestroy(): void {
        const eventMgr = GameEntry.getModule<EventManager>('EventManager');
        if (eventMgr) {
            eventMgr.off(LocalizationEvent.LANGUAGE_CHANGED, this._onLanguageChanged, this);
        }
    }

    private _updateText(): void {
        const label = this.node.getComponent(Label);
        if (!label) {
            Logger.warn('LocalizedLabel', 'Label 组件不存在');
            return;
        }

        const localizationMgr = GameEntry.getModule<LocalizationManager>('LocalizationManager');
        if (!localizationMgr) {
            Logger.warn('LocalizedLabel', 'LocalizationManager 未初始化');
            return;
        }

        let params: Record<string, string> | undefined;
        if (this.paramsJson) {
            try {
                params = JSON.parse(this.paramsJson) as Record<string, string>;
            } catch (e) {
                Logger.warn('LocalizedLabel', 'paramsJson 解析失败:', e);
            }
        }

        label.string = localizationMgr.t(this.key, params);
    }

    private _onLanguageChanged(_data: LanguageChangedData): void {
        this._updateText();
    }
}
