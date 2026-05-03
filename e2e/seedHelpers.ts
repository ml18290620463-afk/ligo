import type { Page } from '@playwright/test';

/**
 * Phase 3 §3.f — shared E2E onboarding helper.
 *
 * `useDiaryData` persists everything (password hash, salt, guiding
 * stars, customIdentity) through `idb-keyval`, not raw localStorage,
 * so a Playwright `page.addInitScript` shim cannot fast-forward us
 * past onboarding without re-implementing the entire
 * IndexedDB-keyed schema. Instead we walk the same onboarding flow
 * that `app.spec.ts` / `backup.spec.ts` already use, factored into
 * one helper so the visual baselines stay focused on the rendered
 * surface rather than the click sequence.
 *
 * Wall-clock cost: ~25 s per spec. The visual baselines all share a
 * single Playwright project so the suite total stays under 90 s
 * even with four post-onboarding screens.
 */

export interface SeedOnboardedAppOptions {
  /** Master password for the new vault. Stable so re-seeding the
   *  same machine produces identical hashes. */
  password?: string;
}

export const seedOnboardedApp = async (
  page: Page,
  options: SeedOnboardedAppOptions = {},
): Promise<void> => {
  const password = options.password ?? 'VectorVisual123!';

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Cover screen → Onboarding intro.
  await page.locator('button[title="终端启动"]').dispatchEvent('click');
  await page
    .getByRole('button', { name: /静听|initialize/i })
    .dispatchEvent('click');

  // Onboarding step 1 (intro) → next.
  await page.getByRole('button', { name: /下一步|next/i }).click();

  // Onboarding step 2: master password (twice).
  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill(password);
  await passwordInputs.nth(1).fill(password);
  await page.getByRole('button', { name: /下一步|next/i }).click();

  // Onboarding step 3: acknowledge the recovery key, then continue.
  await page.getByText('我已保存好这把钥匙').click();
  await page.getByRole('button', { name: /下一步|next/i }).click();

  // Onboarding step 4: pick three guiding stars then enter Dashboard.
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
};
