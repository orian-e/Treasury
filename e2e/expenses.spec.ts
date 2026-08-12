import { test, expect } from '@playwright/test';

test.describe('Group, Expense, and Settlement Flow', () => {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testUser = {
    name: `UserA ${randomSuffix}`,
    email: `usera${randomSuffix}@example.com`,
    password: 'password123',
  };
  const guestName = `GuestB ${randomSuffix}`;
  const groupName = `Trip ${randomSuffix}`;

  test('should allow user to create a group, add guest, add expense, and see settlements', async ({ page }) => {
    // 1. Register User A
    await page.goto('/');
    await page.getByRole('button', { name: /new here\? create an account/i }).click();
    await page.getByLabel(/name/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByRole('button', { name: /create account/i }).click();

    // 2. Dashboard - Create Group
    await expect(page.getByTestId('current-user')).toHaveText(
      testUser.name.split(' ')[0],
      { timeout: 10000 }
    );
    
    // Create new group
    await page.getByRole('button', { name: /create group/i }).click();
    await page.getByRole('textbox', { name: /group name/i }).fill(groupName);
    await page.getByRole('button', { name: 'Create Group' }).click();
    
    // Check for success notification
    await expect(page.getByText('Group created successfully!')).toBeVisible();
    
    // Click on the group card to enter it
    await page.getByText(groupName).click();
    
    // Verify we are inside the group (Add Expense button should be available)
    await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible({ timeout: 10000 });

    // 3. Add a Guest User to the Group
    // AddUserForm has an input with placeholder 'e.g., John Doe' or label 'Add Guest'
    await page.getByLabel(/add guest/i).fill(guestName);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    
    // Verify guest added successfully (might show a notification or appear in user list)
    await expect(page.getByText(guestName)).toBeVisible();

    // 4. Add an Expense paid by User A, split between User A and Guest B
    const expenseDesc = 'Dinner';
    const expenseAmount = '50';
    
    await page.getByLabel(/description/i).fill(expenseDesc);
    await page.getByLabel(/amount/i).fill(expenseAmount);
    
    // Select the users in the "Split With" dropdown
    await page.getByLabel(/split with/i).click();
    await page.getByRole('option', { name: testUser.name }).click();
    await page.getByRole('option', { name: guestName }).click();
    
    // Check for the "Done" button inside the dropdown or just press Escape
    await page.getByRole('button', { name: 'Done' }).click();

    await page.getByRole('button', { name: 'Add Expense' }).click();
    
    // Capture the state of the form to see validation errors
    await page.screenshot({ path: 'test-results/form-validation-error.png', fullPage: true });

    // Verify expense appears in the list
    await expect(page.getByText('Expense added successfully!')).toBeVisible();
    await expect(page.getByText(expenseDesc)).toBeVisible();

    // 5. Check Settlements Tab
    // Guest B should owe User A 25 EUR.
    await page.getByRole('tab', { name: /settlements/i }).click();
    
    // Verify the settlement is calculated correctly
    // The SettlementPanel renders: GuestB -> UserA : €25.00
    // Because DOM structure separates these visually, we check for presence of both names and the amount
    await expect(page.getByText(guestName)).toBeVisible();
    await expect(page.getByText(testUser.name).first()).toBeVisible();
    await expect(page.getByText('€25.00')).toBeVisible();

    // 6. Edit the Expense 
    await page.getByRole('tab', { name: /expenses/i }).click();
    await page.getByLabel('edit').first().click();
    await expect(page.getByText('Edit Expense')).toBeVisible();
    
    // We must reset to Single Payer because the previous amount was 50 for the payer
    await page.getByRole('button', { name: 'Single Payer' }).click();
    
    await page.getByLabel(/description/i).fill('Edited Dinner');
    await page.getByLabel(/amount/i).fill('100');

    // Make sure splits are recalculated for the new amount
    await page.getByRole('button', { name: /equal/i }).first().click();

    await page.getByRole('button', { name: 'Update Expense' }).click();

    await expect(page.getByText('Edited Dinner')).toBeVisible();

    // 7. Check Settlements Tab Again
    await page.getByRole('tab', { name: /settlements/i }).click();
    
    // 100 EUR split between 2 people -> Guest B owes 50 EUR
    await expect(page.getByText('€50.00')).toBeVisible();
  });

  test('should show validation errors on failed group creation', async ({ page }) => {
    const errorUserSuffix = Math.floor(Math.random() * 1000000);
    const errorUser = {
      name: `Error User ${errorUserSuffix}`,
      email: `erroruser${errorUserSuffix}@example.com`,
      password: 'password123',
    };

    // 1. Register User
    await page.goto('/');
    await page.getByRole('button', { name: /new here\? create an account/i }).click();
    await page.getByLabel(/name/i).fill(errorUser.name);
    await page.getByLabel(/email/i).fill(errorUser.email);
    await page.getByLabel(/password/i).fill(errorUser.password);
    await page.getByRole('button', { name: /create account/i }).click();

    // 2. Dashboard - Create Group
    await expect(page.getByTestId('current-user')).toHaveText(
      errorUser.name.split(' ')[0],
      { timeout: 10000 }
    );
    await page.getByRole('button', { name: /create group/i }).click();
    
    // The button should be disabled when required fields are empty
    await expect(page.getByRole('button', { name: 'Create Group' })).toBeDisabled();
  });
});
