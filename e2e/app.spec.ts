import { expect, test } from '@playwright/test';

test('serves the app shell and health endpoint', async ({ page, request }) => {
  const health = await request.get('/api/health');
  await expect(health).toBeOK();
  expect(health.headers()['x-content-type-options']).toBe('nosniff');

  await page.goto('/');
  await expect(page).toHaveTitle(/VECTOR/);
});

test('renders the cover experience and can switch cover modes', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /曲速引擎|warp/i }).click();
  await expect(page.getByRole('heading', { name: 'VECTOR' })).toBeVisible();
  await expect(page.getByText(/矢量人生|VECTOR LIFE/i).first()).toBeVisible();
});

test('completes onboarding and creates a journal entry', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.locator('button[title="终端启动"]').dispatchEvent('click');
  await page.getByRole('button', { name: /静听|initialize/i }).dispatchEvent('click');

  await page.getByRole('button', { name: /下一步|next/i }).click();

  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill('Vector123!');
  await passwordInputs.nth(1).fill('Vector123!');
  await page.getByRole('button', { name: /下一步|next/i }).click();

  await page.getByText('我已保存好这把钥匙').click();
  await page.getByRole('button', { name: /下一步|next/i }).click();

  await page
    .getByRole('button', { name: /马斯克|Elon Musk/i })
    .first()
    .click();
  await page
    .getByRole('button', { name: /老子|Laozi/i })
    .first()
    .click();
  await page
    .getByRole('button', { name: /加缪|Camus/i })
    .first()
    .click();
  await page.getByRole('button', { name: /留下判断|start/i }).click();

  await expect(page.getByText('矢量人生启航日志').first()).toBeVisible();

  await page.getByRole('button', { name: /刻录此刻/i }).click();
  await page.getByPlaceholder('此刻，尚未被命名。').fill('E2E 自动化航迹');
  await page
    .getByPlaceholder('不要急着说正确的话，说真实的...')
    .fill('这是一条由 Playwright 创建的端到端验证记录。');
  await page.getByRole('button', { name: /执行刻录|engrave/i }).click();

  await page.getByRole('button', { name: /加密记忆舱/i }).click();
  await expect(page.getByText('E2E 自动化航迹').first()).toBeVisible();
});
