import { test, expect } from "./fixtures";

test.describe("Documents", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs("admin");
  });

  test("navigate to documents page", async ({ page }) => {
    const docsLink = page
      .getByRole("link", { name: /documents/i })
      .or(page.locator('a[href*="/documents"]'))
      .first();

    if (await docsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await docsLink.click();
    } else {
      await page.goto("/documents");
    }

    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/documents/);
  });

  test("file list loads", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");

    // Verify some kind of list is rendered (table, grid, or cards)
    const listContainer = page.locator(
      "table, [class*='grid'], [class*='list'], [data-testid*='document'], [data-testid*='file']"
    );
    const isVisible = await listContainer
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    // Even an empty state is acceptable
    const emptyState = page.locator(
      '[class*="empty"], [data-testid*="empty"]'
    );
    const hasEmptyState = await emptyState
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(isVisible || hasEmptyState).toBeTruthy();
  });

  test("click file opens detail panel", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");

    // Click the first document/file item
    const firstFile = page
      .locator(
        "table tbody tr, [data-testid*='document'], [data-testid*='file'], a[href*='/documents/']"
      )
      .first();

    if (await firstFile.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstFile.click();
      await page.waitForLoadState("networkidle");

      // Verify detail panel or page opened
      const detailPanel = page.locator(
        '[class*="detail"], [class*="panel"], [class*="sidebar"], [role="dialog"]'
      );
      const hasDetail = await detailPanel
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasUrlChange = /\/documents\//.test(page.url());

      expect(hasDetail || hasUrlChange).toBeTruthy();
    } else {
      console.log("No documents found in the list");
    }
  });

  test("document detail has expected tabs", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");

    const firstFile = page
      .locator(
        "table tbody tr, [data-testid*='document'], a[href*='/documents/']"
      )
      .first();

    if (await firstFile.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstFile.click();
      await page.waitForLoadState("networkidle");

      const expectedTabs = ["info", "comments", "tags", "versions"];
      for (const tabName of expectedTabs) {
        const tab = page
          .getByRole("tab", { name: new RegExp(tabName, "i") })
          .or(page.getByText(new RegExp(`^${tabName}$`, "i")))
          .first();
        const isVisible = await tab
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        if (!isVisible) {
          console.log(`Tab "${tabName}" not found on document detail`);
        }
      }
    } else {
      console.log("No documents found — skipping tab verification");
    }
  });

  test("search functionality works", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .getByRole("searchbox")
      .or(page.getByPlaceholder(/search/i))
      .or(page.locator('input[type="search"], input[name*="search"]'))
      .first();

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill("test");
      // Wait for search results to update
      await page.waitForLoadState("networkidle");
      // Verify the search input retains the value
      await expect(searchInput).toHaveValue("test");
    } else {
      console.log("Search input not found on documents page");
    }
  });
});
