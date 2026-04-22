import { test, expect } from '@playwright/test';

/**
 * Demo 2 — Turn-based RPG E2E 测试
 *
 * HtmlRenderer 使用纯内联样式，无 CSS class，
 * 因此选择器主要依赖 role、text 匹配和结构定位。
 *
 * 流程：Launch → (setTimeout) → Preload → (setTimeout) → Lobby
 * Lobby 渲染后才有按钮，需要 waitFor 而非固定 timeout。
 */
test.describe('Demo 2 - Turn-based RPG', () => {
    test.beforeEach(async ({ page }) => {
        // 监听页面错误，方便调试
        page.on('pageerror', (err) => console.error('[PageError]', err.message));
        await page.goto('/');
    });

    test('应该正确加载并显示标题', async ({ page }) => {
        // HtmlRenderer 构造函数同步创建标题 div（textContent = title 参数）
        const title = page.getByText('Turn-based RPG Demo', { exact: true });
        await expect(title).toBeVisible({ timeout: 5000 });
    });

    test('应该显示大厅界面', async ({ page }) => {
        // Lobby 在 2 个 setTimeout(0) 后渲染，等待"出发"按钮出现
        const goBtn = page.getByRole('button', { name: '出发' });
        await expect(goBtn).toBeVisible({ timeout: 10000 });

        // 验证关卡按钮也存在（PreloadProcedure 注册了"草原之路"等关卡）
        const stageBtn = page.getByRole('button', { name: /草原之路/ });
        await expect(stageBtn).toBeVisible();
    });

    test('应该能选择关卡并出发', async ({ page }) => {
        // 等待大厅 UI 就绪
        const goBtn = page.getByRole('button', { name: '出发' });
        await expect(goBtn).toBeVisible({ timeout: 10000 });

        // 选择关卡
        const stageBtn = page.getByRole('button', { name: /草原之路/ });
        await stageBtn.click();

        // 验证选关日志
        await expect(page.getByText(/已选择关卡/)).toBeVisible({ timeout: 3000 });

        // 点击出发
        await goBtn.click();

        // 验证进入战斗准备或战斗流程（BattlePrepProcedure 会输出日志）
        await expect(page.getByText(/回合开始/).first()).toBeVisible({ timeout: 10000 });
    });

    test('应该能完成一场战斗', async ({ page }) => {
        // 等待大厅
        const goBtn = page.getByRole('button', { name: '出发' });
        await expect(goBtn).toBeVisible({ timeout: 10000 });

        // 选关卡 → 出发
        await page.getByRole('button', { name: /草原之路/ }).click();
        await goBtn.click();

        // 等待战斗日志出现（自动战斗，BattleProcedure 会输出回合、攻击等日志）
        await expect(page.getByText(/回合开始/).first()).toBeVisible({ timeout: 15000 });

        // 等待战斗结束（SettleProcedure 输出结算信息 + 返回大厅按钮）
        await expect(page.getByRole('button', { name: '返回大厅' })).toBeVisible({
            timeout: 30000,
        });
    });

    test('战后应能返回大厅并再次出发', async ({ page }) => {
        // 等待大厅
        const goBtn = page.getByRole('button', { name: '出发' });
        await expect(goBtn).toBeVisible({ timeout: 10000 });

        // 第一轮：选关卡 → 出发 → 等待战斗结束
        await page.getByRole('button', { name: /草原之路/ }).click();
        await goBtn.click();
        await expect(page.getByText(/回合开始/).first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: '返回大厅' })).toBeVisible({
            timeout: 30000,
        });

        // 点击"返回大厅"
        const backBtn = page.getByRole('button', { name: '返回大厅' });
        await expect(backBtn).toBeVisible({ timeout: 5000 });
        await backBtn.click();

        // 验证回到大厅（"出发"按钮重新出现）
        const goBtn2 = page.getByRole('button', { name: '出发' });
        await expect(goBtn2).toBeVisible({ timeout: 10000 });

        // 第二轮：选另一个关卡 → 出发
        const stageBtn2 = page.getByRole('button', { name: /暗影森林/ });
        await expect(stageBtn2).toBeVisible();
        await stageBtn2.click();
        await goBtn2.click();

        // 验证第二轮战斗正常开始
        await expect(page.getByText(/回合开始/).first()).toBeVisible({ timeout: 15000 });
    });
});
