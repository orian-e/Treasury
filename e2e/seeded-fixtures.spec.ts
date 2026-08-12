import { test, expect, Page } from '@playwright/test';

// These specs read the fixtures created by backend/scripts/seed.ts, which the
// test stack runs before the app starts. They are read-only — nothing here may
// create or edit data, or the other specs stop being reproducible. Change a
// fixture and you will need to change the expectations below with it.
//
// Tagged @seeded so a run against an unseeded app can skip them:
//   npx playwright test --grep-invert @seeded
const PASSWORD = 'password123';

async function login(page: Page, email: string, displayName: string) {
  await page.goto('/');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  // The header shows the first name only; the full name lives in the account menu.
  await expect(page.getByTestId('current-user')).toHaveText(
    displayName.split(' ')[0],
    { timeout: 15000 }
  );
}

// Group names carry emoji in the fixtures; getByText matches substrings, so the
// locators below deliberately leave them out.
test.describe('Seeded fixtures', { tag: '@seeded' }, () => {
  test('a seeded user sees their own groups and no others', async ({ page }) => {
    await login(page, 'alice@example.com', 'Alice Martin');

    await expect(page.getByText('Flatmates')).toBeVisible();
    await expect(page.getByText('Building Co-owners')).toBeVisible();

    await expect(page.getByText('Trip to Barcelona')).toBeHidden();
    await expect(page.getByText('Office Lunch Club')).toBeHidden();
    await expect(page.getByText('ארוחות משפחתיות')).toBeHidden();
  });

  test('group search filters the seeded group list', async ({ page }) => {
    await login(page, 'alice@example.com', 'Alice Martin');

    await page.getByLabel('Search groups').fill('flat');

    await expect(page.getByText('Flatmates')).toBeVisible();
    await expect(page.getByText('Building Co-owners')).toBeHidden();
    await expect(page.getByText(/showing 1 of \d+ groups/i)).toBeVisible();

    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(page.getByText('Building Co-owners')).toBeVisible();
  });

  test('a seeded group shows its expenses with the right split amounts', async ({ page }) => {
    await login(page, 'alice@example.com', 'Alice Martin');
    await page.getByText('Flatmates').click();
    await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('Weekly groceries')).toBeVisible();
    await expect(page.getByText('Internet subscription')).toBeVisible();

    // The electricity bill is a custom split: Alice 55, Bob 35, Clara 30 of 120
    // EUR. Asserting the amount, not just the row, so a broken split calculation
    // fails here rather than rendering a plausible-looking wrong number.
    await expect(page.getByText('Electricity bill — March')).toBeVisible();
    await expect(page.getByText(/Alice Martin: €55\.00/)).toBeVisible();
  });

  test('expense search filters the seeded expense list', async ({ page }) => {
    await login(page, 'alice@example.com', 'Alice Martin');
    await page.getByText('Flatmates').click();
    await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible({ timeout: 15000 });

    await page.getByLabel('Search expenses').fill('electricity');

    await expect(page.getByText('Electricity bill — March')).toBeVisible();
    await expect(page.getByText('Weekly groceries')).toBeHidden();
    await expect(page.getByText(/showing 1 of \d+ expenses/i)).toBeVisible();
  });

  test('balances stay separated per currency, with no conversion', async ({ page }) => {
    await login(page, 'alice@example.com', 'Alice Martin');
    await page.getByText('Flatmates').click();
    await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible({ timeout: 15000 });

    // Flatmates holds EUR expenses plus one GBP expense (IKEA, 189 split equally
    // between four members = 47.25 each). The two currencies settle separately,
    // so both headers render and the GBP share is not folded into the EUR total.
    await expect(page.getByTestId('currency-header-EUR')).toBeVisible();
    await expect(page.getByTestId('currency-header-GBP')).toBeVisible();
    await expect(page.getByText(/Alice Martin: £47\.25/)).toBeVisible();
  });

  test('Hebrew group and member names render', async ({ page }) => {
    await login(page, 'noa@example.com', 'נועה כהן');

    await expect(page.getByText('ארוחות משפחתיות')).toBeVisible();
    await page.getByText('ארוחות משפחתיות').click();

    await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible({ timeout: 15000 });
    // The name appears in every split line, so match the first occurrence.
    await expect(page.getByText('יוסי לוי').first()).toBeVisible();
    await expect(page.getByTestId('currency-header-ILS')).toBeVisible();
  });
});
