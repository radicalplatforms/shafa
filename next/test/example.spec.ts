import {test, expect} from '@playwright/test';

test('has title', async ({page}) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Create Next App/);
});

test('has valid items', async ({page}) => {
  await page.goto('/test');
  const table = page.getByRole('row')
  await expect(table).toHaveCount(11);
});