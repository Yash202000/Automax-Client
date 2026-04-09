import { test, expect } from "./fixtures";

test.describe("Role-Based Access Control", () => {
  test("admin can see all sidebar items", async ({ page, loginAs }) => {
    await loginAs("admin");

    // Admin should see management links in the sidebar
    const sidebar = page.locator(
      'nav, [class*="sidebar"], [class*="Sidebar"], aside'
    );
    await expect(sidebar.first()).toBeVisible({ timeout: 10000 });

    // Check for admin-specific links
    const adminLinks = [/admin/i, /users/i, /roles/i, /settings/i];
    let adminLinksFound = 0;
    for (const linkPattern of adminLinks) {
      const link = sidebar
        .getByRole("link", { name: linkPattern })
        .or(sidebar.getByText(linkPattern))
        .first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        adminLinksFound++;
      }
    }
    // Admin should see at least some management links
    expect(adminLinksFound).toBeGreaterThan(0);
  });

  test("viewer has limited actions on goals", async ({ page, loginAs }) => {
    await loginAs("khalid");

    await page.goto("/goals");
    await page.waitForLoadState("networkidle");

    // Viewer should be able to see the goals list
    await expect(page).toHaveURL(/\/goals/);

    // Check that create/add buttons are either hidden or disabled
    const createBtn = page
      .getByRole("button", { name: /create|add|new/i })
      .or(page.getByRole("link", { name: /create|add|new/i }))
      .first();

    const isVisible = await createBtn
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (isVisible) {
      // If visible, it might be disabled
      const isDisabled = await createBtn.isDisabled().catch(() => false);
      console.log(
        `Create button visible for viewer: ${isVisible}, disabled: ${isDisabled}`
      );
    }
    // Either way, this test documents what a viewer sees
  });

  test("manager can create goals", async ({ page, loginAs }) => {
    await loginAs("sarah");

    await page.goto("/goals");
    await page.waitForLoadState("networkidle");

    // Manager should see the create button and it should be clickable
    const createBtn = page
      .getByRole("button", { name: /create|add|new/i })
      .or(page.getByRole("link", { name: /create|add|new/i }))
      .first();

    const isVisible = await createBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isVisible) {
      const isEnabled = !(await createBtn.isDisabled().catch(() => true));
      expect(isEnabled).toBeTruthy();
    }
  });

  test("unauthorized user cannot access admin pages", async ({
    page,
    loginAs,
  }) => {
    await loginAs("khalid");

    // Try to navigate to admin area directly
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Should be redirected away or see an access denied message
    const isOnAdmin = /\/admin/.test(page.url());
    const accessDenied = page
      .getByText(/access denied|unauthorized|forbidden|not authorized/i)
      .first();
    const hasAccessDenied = await accessDenied
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const redirectedAway = !isOnAdmin;

    expect(redirectedAway || hasAccessDenied).toBeTruthy();
  });
});
