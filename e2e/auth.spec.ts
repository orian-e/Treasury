import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  // Generate a random user to prevent email collisions during testing
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testUser = {
    name: `Test User ${randomSuffix}`,
    email: `testuser${randomSuffix}@example.com`,
    password: 'password123',
  };

  test('should allow a new user to register and see the dashboard', async ({ page }) => {
    // 1. Visit the home page
    await page.goto('/');

    // 2. Click the register tab/link (adjust selector based on your UI)
    await page.getByRole('button', { name: /new here\? create an account/i }).click();

    // 3. Fill out the registration form
    await page.getByLabel(/name/i).fill(testUser.name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);

    // 4. Submit the form
    await page.getByRole('button', { name: /create account/i }).click();

    // 5. Verify successful login by checking for Dashboard elements
    // For example, looking for a text that says "Welcome, User!" or a "Create Group" button
    // The header shows the first name only; the full name lives in the account menu.
    await expect(page.getByTestId('current-user')).toHaveText(
      testUser.name.split(' ')[0],
      { timeout: 10000 }
    );
    await expect(page.getByRole('button', { name: /create.*group/i })).toBeVisible();
  });

  test('should fail login with wrong password', async ({ page }) => {
    // 1. Visit the home page
    await page.goto('/');

    // 2. Click the login tab if it's not the default
    // Note: The default page should be login. Let's just fill the form.
    await page.getByLabel(/email/i).fill(testUser.email);
    // Use an incorrect password
    await page.getByLabel(/password/i).fill('wrongpassword');

    // 3. Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();

    // 4. Verify error message appears
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test('should redirect to login when auth token is removed/expires', async ({ page }) => {
    // 1. Visit the home page and login
    await page.goto('/');
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // 2. Wait for dashboard
    // The header shows the first name only; the full name lives in the account menu.
    await expect(page.getByTestId('current-user')).toHaveText(
      testUser.name.split(' ')[0],
      { timeout: 10000 }
    );

    // 3. Remove auth token from localStorage
    await page.evaluate(() => localStorage.removeItem('authToken'));

    // 4. Reload page
    await page.reload();

    // 5. Verify redirect back to login screen
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByTestId('current-user')).toBeHidden();
  });
});
