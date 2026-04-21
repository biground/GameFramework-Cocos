/**
 * @jest-environment jsdom
 */
import { HtmlRenderer, LOG_COLORS } from '@game/shared/HtmlRenderer';

// Mock Logger，避免真实日志输出
jest.mock('@framework/debug/Logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('HtmlRenderer', () => {
    let container: HTMLDivElement;
    let renderer: HtmlRenderer;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        renderer = new HtmlRenderer('测试 Demo', container);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('构造函数', () => {
        it('应创建包含标题、日志区、状态面板区、按钮区的布局', () => {
            // 标题
            const header = container.querySelector('div div');
            expect(header).not.toBeNull();
            expect(header!.textContent).toBe('测试 Demo');

            // 日志区域（右侧 flex:1）
            const logArea = container.querySelectorAll('div div div div');
            expect(logArea.length).toBeGreaterThan(0);

            // 按钮区域（底部）
            const buttons = container.querySelector('div > div:last-child');
            expect(buttons).not.toBeNull();
        });

        it('未传 container 时挂载到 document.body', () => {
            new HtmlRenderer('Body Demo');
            // 应在 body 中创建根元素
            expect(document.body.children.length).toBeGreaterThan(1);
        });
    });

    describe('log()', () => {
        it('应在日志区域添加日志条目', () => {
            renderer.log('测试消息');
            // 日志容器应包含一个 div 子元素
            const logEntries = container.querySelectorAll('div');
            const found = Array.from(logEntries).find((el) =>
                el.textContent?.includes('测试消息'),
            );
            expect(found).toBeTruthy();
        });

        it('带颜色参数时设置正确的 style', () => {
            renderer.log('绿色消息', LOG_COLORS.SUCCESS);
            const entries = container.querySelectorAll('div');
            // 找到直接包含日志文字的叶子节点（无子 div）
            const greenEntry = Array.from(entries).find(
                (el) => el.textContent?.includes('绿色消息') && el.children.length === 0,
            );
            expect(greenEntry).toBeTruthy();
            // jsdom 将 #4CAF50 转为 rgb(76, 175, 80)
            expect(greenEntry!.style.color).toBe('rgb(76, 175, 80)');
        });

        it('默认颜色为 #d4d4d4', () => {
            renderer.log('默认颜色');
            const entries = container.querySelectorAll('div');
            const entry = Array.from(entries).find(
                (el) => el.textContent?.includes('默认颜色') && el.children.length === 0,
            );
            expect(entry).toBeTruthy();
            // jsdom 将 #d4d4d4 转为 rgb(212, 212, 212)
            expect(entry!.style.color).toBe('rgb(212, 212, 212)');
        });
    });

    describe('separator()', () => {
        it('无标题时添加纯分隔线', () => {
            renderer.separator();
            const divs = container.querySelectorAll('div');
            const sep = Array.from(divs).find(
                (el) => el.style.borderTop.includes('solid') && !el.textContent,
            );
            expect(sep).toBeTruthy();
        });

        it('带标题时添加带文字的分隔线', () => {
            renderer.separator('分隔标题');
            const divs = container.querySelectorAll('div');
            const sep = Array.from(divs).find((el) =>
                el.textContent?.includes('分隔标题'),
            );
            expect(sep).toBeTruthy();
            expect(sep!.textContent).toContain('── 分隔标题 ──');
        });
    });

    describe('createButtonGroup()', () => {
        it('应创建按钮组容器并包含组名标签', () => {
            const group = renderer.createButtonGroup('测试组');
            expect(group).toBeTruthy();
            expect(group.textContent).toContain('测试组');
            // 应包含 button-row 子容器
            const row = group.querySelector('[data-role="button-row"]');
            expect(row).not.toBeNull();
        });
    });

    describe('addButton()', () => {
        let group: HTMLElement;

        beforeEach(() => {
            group = renderer.createButtonGroup('操作组');
        });

        it('应创建按钮并绑定点击回调', () => {
            const onClick = jest.fn();
            const btn = renderer.addButton(group, '点击我', onClick);

            expect(btn.textContent).toBe('点击我');
            expect(btn.disabled).toBe(false);

            btn.click();
            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it('disabled=true 时创建禁用按钮', () => {
            const onClick = jest.fn();
            const btn = renderer.addButton(group, '禁用按钮', onClick, true);

            expect(btn.disabled).toBe(true);
            expect(btn.style.opacity).toBe('0.5');
            expect(btn.style.cursor).toBe('not-allowed');
        });

        it('按钮被添加到 button-row 子容器中', () => {
            renderer.addButton(group, '测试', jest.fn());
            const row = group.querySelector('[data-role="button-row"]');
            expect(row).not.toBeNull();
            expect(row!.querySelector('button')).not.toBeNull();
        });
    });

    describe('clearLog()', () => {
        it('应清空日志区域所有内容', () => {
            renderer.log('消息1');
            renderer.log('消息2');
            renderer.separator('分隔');

            renderer.clearLog();

            // 查找包含消息的元素应为空
            const entries = container.querySelectorAll('div');
            const hasMsg = Array.from(entries).some(
                (el) => el.textContent?.includes('消息1') || el.textContent?.includes('消息2'),
            );
            expect(hasMsg).toBe(false);
        });
    });

    describe('createStatusPanel()', () => {
        it('应创建带标题的状态面板', () => {
            const panel = renderer.createStatusPanel('test-panel', '测试面板');
            expect(panel).toBeTruthy();
            expect(panel.element).toBeTruthy();
            // 面板标题
            const header = panel.element.querySelector('div');
            expect(header!.textContent).toBe('测试面板');
        });

        it('重复创建相同 ID 面板时返回已有面板', () => {
            const panel1 = renderer.createStatusPanel('dup', '面板A');
            const panel2 = renderer.createStatusPanel('dup', '面板B');
            expect(panel1.element).toBe(panel2.element);
        });
    });

    describe('updateStatus()', () => {
        it('应更新面板中指定键的值', () => {
            const panel = renderer.createStatusPanel('status', '状态');
            panel.update('帧率', '60');

            const valEl = panel.element.querySelector('[data-role="value"]');
            expect(valEl).not.toBeNull();
            expect(valEl!.textContent).toBe('60');
        });

        it('多次更新同一键只更新值不新增行', () => {
            const panel = renderer.createStatusPanel('status2', '状态2');
            panel.update('连接数', '1');
            panel.update('连接数', '5');

            const body = panel.element.querySelector('[data-role="panel-body"]');
            // 只有一行
            expect(body!.children.length).toBe(1);
            const valEl = panel.element.querySelector('[data-role="value"]');
            expect(valEl!.textContent).toBe('5');
        });

        it('不存在的面板 ID 调用 updateStatus 不抛异常', () => {
            expect(() => {
                renderer.updateStatus('not-exist', 'k', 'v');
            }).not.toThrow();
        });
    });

    describe('createTable()', () => {
        it('应生成正确的表格结构（thead + tbody）', () => {
            const headers = ['姓名', '分数', '等级'];
            const rows = [
                ['Alice', '100', 'S'],
                ['Bob', '80', 'A'],
            ];
            const table = renderer.createTable(headers, rows);

            expect(table.tagName).toBe('TABLE');

            // thead
            const thead = table.querySelector('thead');
            expect(thead).not.toBeNull();
            const ths = thead!.querySelectorAll('th');
            expect(ths.length).toBe(3);
            expect(ths[0].textContent).toBe('姓名');
            expect(ths[1].textContent).toBe('分数');
            expect(ths[2].textContent).toBe('等级');

            // tbody
            const tbody = table.querySelector('tbody');
            expect(tbody).not.toBeNull();
            const trs = tbody!.querySelectorAll('tr');
            expect(trs.length).toBe(2);
            const firstRowCells = trs[0].querySelectorAll('td');
            expect(firstRowCells[0].textContent).toBe('Alice');
            expect(firstRowCells[1].textContent).toBe('100');
            expect(firstRowCells[2].textContent).toBe('S');
        });

        it('空行数据时只有表头', () => {
            const table = renderer.createTable(['列A'], []);
            const tbody = table.querySelector('tbody');
            expect(tbody!.querySelectorAll('tr').length).toBe(0);
        });
    });
});
