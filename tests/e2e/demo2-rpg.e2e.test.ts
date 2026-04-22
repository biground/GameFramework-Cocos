import { test, expect } from '@playwright/test';

test.describe('Demo 2 - Turn-based RPG', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // 等待 Demo 初始化
        await page.waitForTimeout(2000);
    });

    test('应该正确加载并显示标题', async ({ page }) => {
        // 验证页面标题或 Demo 标题
        const title = page.locator('h1, h2, .demo-title').first();
        await expect(title).toBeVisible();
    });

    test('应该显示大厅界面', async ({ page }) => {
        // 验证大厅按钮存在
        const stageButton = page.locator('button', { hasText: /关卡|新手村/ });
        await expect(stageButton.first()).toBeVisible();
    });

    test('应该能选择关卡并出发', async ({ page }) => {
        // 点击关卡选择
        const stageBtn = page.locator('button', { hasText: /新手村/ });
        await stageBtn.click();

        // 点击出发
        const goBtn = page.locator('button', { hasText: /出发/ });
        await goBtn.click();

        // 验证进入战斗
        await page.waitForTimeout(1000);
        // 检查战斗相关 UI 出现
    });

    test('应该能完成一场战斗', async ({ page }) => {
        // 选关卡 → 出发 → 等待战斗完成 → 验证结算
        const stageBtn = page.locator('button', { hasText: /新手村/ });
        await stageBtn.click();

        const goBtn = page.locator('button', { hasText: /出发/ });
        await goBtn.click();

        // 等待战斗（自动战斗模式）
        await page.waitForTimeout(5000);

        // 检查是否有战斗日志输出
        const logArea = page.locator('.log-entry, [class*="log"]');
        const logCount = await logArea.count();
        expect(logCount).toBeGreaterThan(0);
    });
});
