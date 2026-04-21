import { Logger } from '@framework/debug/Logger';

/** 日志颜色常量 */
export const LOG_COLORS = {
    /** 🟢 成功 / 初始化完成 */
    SUCCESS: '#4CAF50',
    /** 🔵 信息 / 状态变化 */
    INFO: '#2196F3',
    /** 🟡 警告 / 资源释放 */
    WARNING: '#FF9800',
    /** 🔴 错误 / 断线 */
    ERROR: '#F44336',
    /** 🟣 网络消息 */
    NETWORK: '#9C27B0',
    /** ⚪ 调试 / 帧更新 */
    DEBUG: '#9E9E9E',
    /** 🔶 战斗 / 伤害数字 */
    COMBAT: '#FF5722',
    /** 🩵 定时器 / 计时 */
    TIMER: '#00BCD4',
} as const;

/**
 * 状态面板接口
 * 用于在 HtmlRenderer 中展示和更新键值对状态信息
 */
export interface StatusPanel {
    /** 面板根元素 */
    element: HTMLElement;
    /** 更新面板中指定键的值 */
    update(key: string, value: string): void;
}

/**
 * HTML 渲染器
 *
 * @description
 * Demo 基础设施的核心展示组件。基于 DOM API 构建完整的 HTML 布局，
 * 提供彩色日志、状态面板、按钮交互、表格等能力，供所有 Demo 共享使用。
 *
 * 布局结构：
 * ```
 * ┌─────────────────────────────────────────────┐
 * │  [Demo 标题]                                │
 * ├──────────────────┬──────────────────────────┤
 * │  状态面板区域     │  日志输出区域             │
 * │  (StatusPanel)   │  (彩色日志，自动滚动)     │
 * ├──────────────────┴──────────────────────────┤
 * │  按钮操作区域                                │
 * │  [按钮1] [按钮2] [按钮3] ...                 │
 * └─────────────────────────────────────────────┘
 * ```
 */
export class HtmlRenderer {
    private static readonly TAG = 'HtmlRenderer';

    private readonly container: HTMLElement;
    private readonly logContainer: HTMLElement;
    private readonly statusArea: HTMLElement;
    private readonly buttonArea: HTMLElement;
    private readonly panels: Map<
        string,
        { element: HTMLElement; entries: Map<string, HTMLElement> }
    > = new Map();

    /**
     * 创建 HTML 渲染器并构建完整布局
     * @param title Demo 标题
     * @param container 挂载的父容器元素，默认为 document.body
     */
    constructor(title: string, container?: HTMLElement) {
        this.container = container ?? document.body;

        // 根容器
        const root = document.createElement('div');
        root.style.cssText =
            'font-family: "Consolas", "Monaco", monospace; background: #1e1e1e; color: #d4d4d4;' +
            ' width: 100%; max-width: 960px; margin: 0 auto; border: 1px solid #333; border-radius: 4px;' +
            ' display: flex; flex-direction: column; overflow: hidden;';

        // 标题栏
        const header = document.createElement('div');
        header.style.cssText =
            'padding: 12px 16px; font-size: 18px; font-weight: bold; background: #252526;' +
            ' border-bottom: 1px solid #333; color: #ffffff;';
        header.textContent = title;
        root.appendChild(header);

        // 内容区：状态面板 + 日志
        const contentArea = document.createElement('div');
        contentArea.style.cssText =
            'display: flex; flex: 1; min-height: 400px; border-bottom: 1px solid #333;';

        // 状态面板区域（左侧）
        this.statusArea = document.createElement('div');
        this.statusArea.style.cssText =
            'width: 280px; min-width: 280px; padding: 8px; overflow-y: auto;' +
            ' border-right: 1px solid #333; background: #1e1e1e;';

        // 日志区域（右侧）
        this.logContainer = document.createElement('div');
        this.logContainer.style.cssText =
            'flex: 1; padding: 8px; overflow-y: auto; background: #1a1a1a; font-size: 13px; line-height: 1.5;';

        contentArea.appendChild(this.statusArea);
        contentArea.appendChild(this.logContainer);
        root.appendChild(contentArea);

        // 按钮操作区域（底部）
        this.buttonArea = document.createElement('div');
        this.buttonArea.style.cssText =
            'padding: 8px 16px; background: #252526; display: flex; flex-wrap: wrap; gap: 8px;' +
            ' align-items: flex-start;';
        root.appendChild(this.buttonArea);

        this.container.appendChild(root);
        Logger.debug(HtmlRenderer.TAG, `渲染器已创建: ${title}`);
    }

    /**
     * 添加带颜色的日志条目，自动滚动到底部
     * @param message 日志消息内容
     * @param color CSS 颜色值，默认为 #d4d4d4（浅灰）
     */
    public log(message: string, color?: string): void {
        const entry = document.createElement('div');
        entry.style.cssText = `color: ${color ?? '#d4d4d4'}; padding: 1px 0; white-space: pre-wrap; word-break: break-all;`;

        const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        entry.textContent = `[${timestamp}] ${message}`;

        this.logContainer.appendChild(entry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    /**
     * 添加分隔线，可附带标题
     * @param title 分隔线标题文字（可选）
     */
    public separator(title?: string): void {
        const hr = document.createElement('div');
        if (title) {
            hr.style.cssText =
                'border-top: 1px solid #444; margin: 8px 0; padding-top: 4px;' +
                ' color: #888; font-size: 12px; font-weight: bold;';
            hr.textContent = `── ${title} ──`;
        } else {
            hr.style.cssText = 'border-top: 1px solid #444; margin: 8px 0;';
        }
        this.logContainer.appendChild(hr);
    }

    /**
     * 在按钮区域创建命名按钮组
     * @param groupName 按钮组名称（显示为组标题）
     * @returns 按钮组容器元素
     */
    public createButtonGroup(groupName: string): HTMLElement {
        const group = document.createElement('div');
        group.style.cssText = 'display: flex; flex-direction: column; gap: 4px; padding: 4px 0;';

        const label = document.createElement('div');
        label.style.cssText =
            'font-size: 11px; color: #888; font-weight: bold; text-transform: uppercase;';
        label.textContent = groupName;
        group.appendChild(label);

        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';
        buttonRow.dataset['role'] = 'button-row';
        group.appendChild(buttonRow);

        this.buttonArea.appendChild(group);
        return group;
    }

    /**
     * 在指定按钮组中添加按钮
     * @param group 按钮组容器（由 createButtonGroup 返回）
     * @param label 按钮文字
     * @param onClick 点击回调
     * @param disabled 是否禁用，默认 false
     * @returns 创建的按钮元素
     */
    public addButton(
        group: HTMLElement,
        label: string,
        onClick: () => void,
        disabled?: boolean,
    ): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.disabled = disabled ?? false;
        btn.style.cssText =
            'padding: 4px 12px; border: 1px solid #555; border-radius: 3px;' +
            ' background: #333; color: #d4d4d4; cursor: pointer; font-size: 12px;' +
            ' font-family: inherit;';

        if (btn.disabled) {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }

        btn.addEventListener('click', onClick);

        // 查找 button-row 子容器
        const row = group.querySelector('[data-role="button-row"]') ?? group;
        row.appendChild(btn);
        return btn;
    }

    /**
     * 清空日志区域的所有内容
     */
    public clearLog(): void {
        this.logContainer.innerHTML = '';
    }

    /**
     * 创建状态面板（键值对显示）
     * @param panelId 面板唯一标识
     * @param title 面板标题
     * @returns StatusPanel 接口实例
     */
    public createStatusPanel(panelId: string, title: string): StatusPanel {
        if (this.panels.has(panelId)) {
            Logger.warn(HtmlRenderer.TAG, `状态面板已存在: ${panelId}，返回已有面板`);
            const existing = this.panels.get(panelId)!;
            return {
                element: existing.element,
                update: (key: string, value: string) => this.updateStatus(panelId, key, value),
            };
        }

        const panel = document.createElement('div');
        panel.style.cssText =
            'margin-bottom: 8px; border: 1px solid #333; border-radius: 3px; overflow: hidden;';

        const header = document.createElement('div');
        header.style.cssText =
            'padding: 4px 8px; background: #2d2d2d; font-size: 12px;' +
            ' font-weight: bold; color: #cccccc; border-bottom: 1px solid #333;';
        header.textContent = title;
        panel.appendChild(header);

        const body = document.createElement('div');
        body.style.cssText = 'padding: 4px 8px; font-size: 12px;';
        body.dataset['role'] = 'panel-body';
        panel.appendChild(body);

        this.statusArea.appendChild(panel);

        const entries = new Map<string, HTMLElement>();
        this.panels.set(panelId, { element: panel, entries });

        return {
            element: panel,
            update: (key: string, value: string) => this.updateStatus(panelId, key, value),
        };
    }

    /**
     * 更新状态面板中指定键的值
     * @param panelId 面板唯一标识
     * @param key 键名
     * @param value 要显示的值
     */
    public updateStatus(panelId: string, key: string, value: string): void {
        const panelData = this.panels.get(panelId);
        if (!panelData) {
            Logger.warn(HtmlRenderer.TAG, `状态面板不存在: ${panelId}`);
            return;
        }

        let row = panelData.entries.get(key);
        if (!row) {
            row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; padding: 2px 0;';

            const keySpan = document.createElement('span');
            keySpan.style.cssText = 'color: #888;';
            keySpan.textContent = key;
            row.appendChild(keySpan);

            const valSpan = document.createElement('span');
            valSpan.style.cssText = 'color: #d4d4d4; font-weight: bold;';
            valSpan.dataset['role'] = 'value';
            row.appendChild(valSpan);

            const body = panelData.element.querySelector('[data-role="panel-body"]');
            if (body) {
                body.appendChild(row);
            }
            panelData.entries.set(key, row);
        }

        const valEl = row.querySelector('[data-role="value"]');
        if (valEl) {
            valEl.textContent = value;
        }
    }

    /**
     * 创建数据表格并追加到日志区域
     * @param headers 表头列名数组
     * @param rows 行数据二维数组
     * @returns 表格元素
     */
    public createTable(headers: string[], rows: string[][]): HTMLElement {
        const table = document.createElement('table');
        table.style.cssText =
            'width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px;';

        // 表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        for (const h of headers) {
            const th = document.createElement('th');
            th.style.cssText =
                'padding: 4px 8px; border: 1px solid #444; background: #2d2d2d;' +
                ' color: #cccccc; text-align: left; font-weight: bold;';
            th.textContent = h;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 表体
        const tbody = document.createElement('tbody');
        for (const row of rows) {
            const tr = document.createElement('tr');
            for (const cell of row) {
                const td = document.createElement('td');
                td.style.cssText = 'padding: 4px 8px; border: 1px solid #444; color: #d4d4d4;';
                td.textContent = cell;
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        this.logContainer.appendChild(table);
        return table;
    }
}
