import { test, expect } from "./fixtures";

test.describe("Authentication", () => {
  test("login with valid credentials redirects to dashboard", async ({
    page,
    loginAs,
  }) => {
    await loginAs("admin");
    await expect(page).toHaveURL(/\/dashboard/);
    // Verify the page has loaded with some dashboard content
    await expect(
      page.getByRole("heading").filter({ hasText: /dashboard/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("login with invalid password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill(
      'input[name="email"], input[type="email"]',
      "admin@automax.com"
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      "wrongpassword"
    );
    await page.click('button[type="submit"]');

    // Should stay on login page and show an error
    await expect(page).toHaveURL(/\/login/);
    // Look for any error indication (toast, alert, or inline message)
    const errorVisible = await page
      .locator('[role="alert"], [data-sonner-toast], .text-red-500, .error')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(errorVisible).toBeTruthy();
  });

  test("logout redirects to login", async ({ page, loginAs }) => {
    await loginAs("admin");
    await expect(page).toHaveURL(/\/dashboard/);

    // Look for a user menu / avatar button or logout button
    const userMenu = page.locator(
      'button[aria-label*="user" i], button[aria-label*="profile" i], button[aria-label*="account" i], [data-testid="user-menu"], button:has(img[alt*="avatar" i])'
    );
    const directLogout = page.getByRole("button", { name: /logout|sign out/i });

    if (await directLogout.isVisible({ timeout: 2000 }).catch(() => false)) {
      await directLogout.click();
    } else if (await userMenu.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenu.first().click();
      // After opening user menu, click logout
      await page
        .getByRole("menuitem", { name: /logout|sign out/i })
        .or(page.getByText(/logout|sign out/i))
        .first()
        .click();
    } else {
      // Fallback: navigate to logout URL directly
      await page.goto("/logout");
    }

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
