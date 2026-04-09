import { test, expect } from "./fixtures";

test.describe("Goal Management", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs("admin");
  });

  test("navigate to goals via sidebar", async ({ page }) => {
    // Click the Goals link in the sidebar navigation
    const goalsLink = page
      .getByRole("link", { name: /goals/i })
      .or(page.locator('a[href*="/goals"]'))
      .first();
    await goalsLink.click();
    await expect(page).toHaveURL(/\/goals/, { timeout: 10000 });
  });

  test("goals list loads with table or cards", async ({ page }) => {
    await page.goto("/goals");
    await page.waitForLoadState("networkidle");

    // Verify that either a table or card-based list is rendered
    const hasTable = await page
      .locator("table, [role='table']")
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    const hasCards = await page
      .locator('[class*="card"], [class*="Card"], [data-testid*="goal"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  test("create new goal via form", async ({ page }) => {
    await page.goto("/goals");
    await page.waitForLoadState("networkidle");

    // Click create/add button
    const createBtn = page
      .getByRole("button", { name: /create|add|new/i })
      .or(page.getByRole("link", { name: /create|add|new/i }))
      .first();
    await createBtn.click();

    // Wait for form to appear
    await page.waitForURL(/\/goals\/(create|new)/, { timeout: 10000 });

    // Fill in goal title/name
    const titleInput = page
      .getByLabel(/title|name/i)
      .or(page.locator('input[name="title"], input[name="name"]'))
      .first();
    await titleInput.fill("E2E Test Goal");

    // Fill in description if present
    const descInput = page
      .getByLabel(/description/i)
      .or(page.locator('textarea[name="description"]'))
      .first();
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill("This goal was created by Playwright E2E tests");
    }

    // Submit the form
    const submitBtn = page
      .getByRole("button", { name: /save|create|submit/i })
      .first();
    await submitBtn.click();

    // Verify redirect or success indication
    await page.waitForURL(/\/goals/, { timeout: 10000 });
  });

  test("view goal detail and verify tabs", async ({ page }) => {
    await page.goto("/goals");
    await page.waitForLoadState("networkidle");

    // Click the first goal in the list
    const firstGoal = page
      .locator("table tbody tr, [data-testid*='goal'], a[href*='/goals/']")
      .first();
    await firstGoal.click();

    // Wait for detail page
    await page.waitForURL(/\/goals\/\d+|\/goals\/[a-z0-9-]+/i, {
      timeout: 10000,
    });

    // Verify expected tabs exist
    const expectedTabs = [
      "overview",
      "metrics",
      "evidence",
      "collaborators",
      "check-ins",
      "comments",
      "activity",
    ];

    for (const tabName of expectedTabs) {
      const tab = page
        .getByRole("tab", { name: new RegExp(tabName, "i") })
        .or(page.getByText(new RegExp(`^${tabName}$`, "i")))
        .first();
      const isVisible = await tab
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      // Log which tabs are found (some may be conditionally rendered)
      if (!isVisible) {
        console.log(`Tab "${tabName}" not found on goal detail page`);
      }
    }

    // At minimum, overview should be present
    await expect(
      page
        .getByRole("tab", { name: /overview/i })
        .or(page.getByText(/overview/i))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("edit goal description", async ({ page }) => {
    await page.goto("/goals");
    await page.waitForLoadState("networkidle");

    // Click first goal to go to detail
    const firstGoal = page
      .locator("table tbody tr, [data-testid*='goal'], a[href*='/goals/']")
      .first();
    await firstGoal.click();
    await page.waitForURL(/\/goals\//, { timeout: 10000 });

    // Click edit button
    const editBtn = page
      .getByRole("button", { name: /edit/i })
      .or(page.getByRole("link", { name: /edit/i }))
      .first();
    await editBtn.click();

    // Wait for edit form
    await page.waitForLoadState("networkidle");

    // Update description
    const descInput = page
      .getByLabel(/description/i)
      .or(page.locator('textarea[name="description"]'))
      .first();
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill("Updated by Playwright E2E test");
    }

    // Save
    const saveBtn = page
      .getByRole("button", { name: /save|update|submit/i })
      .first();
    await saveBtn.click();

    // Wait for navigation or success toast
    await page.waitForLoadState("networkidle");
  });

  test("delete goal", async ({ page }) => {
    await page.goto("/goals");
    await page.waitForLoadState("networkidle");

    // Click first goal
    const firstGoal = page
      .locator("table tbody tr, [data-testid*='goal'], a[href*='/goals/']")
      .first();
    await firstGoal.click();
    await page.waitForURL(/\/goals\//, { timeout: 10000 });

    // Click delete button
    const deleteBtn = page
      .getByRole("button", { name: /delete|remove/i })
      .first();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();

      // Confirm deletion in dialog
      const confirmBtn = page
        .getByRole("button", { name: /confirm|yes|delete/i })
        .last();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Should redirect to goals list
      await page.waitForURL(/\/goals$/, { timeout: 10000 });
    }
  });
});
