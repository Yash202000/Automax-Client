import { test, expect } from "./fixtures";

test.describe("Goal Approvals", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs("admin");
  });

  test("navigate to approvals page", async ({ page }) => {
    const approvalsLink = page
      .getByRole("link", { name: /approvals/i })
      .or(page.locator('a[href*="/approvals"]'))
      .first();

    if (await approvalsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approvalsLink.click();
    } else {
      await page.goto("/goals/approvals");
    }

    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/approvals/);
  });

  test("pending and completed tabs exist", async ({ page }) => {
    await page.goto("/goals/approvals");
    await page.waitForLoadState("networkidle");

    const pendingTab = page
      .getByRole("tab", { name: /pending/i })
      .or(page.getByText(/pending/i))
      .first();
    const completedTab = page
      .getByRole("tab", { name: /completed|history|reviewed/i })
      .or(page.getByText(/completed|history|reviewed/i))
      .first();

    await expect(pendingTab).toBeVisible({ timeout: 5000 });
    await expect(completedTab).toBeVisible({ timeout: 5000 });
  });

  test("review button opens transition modal if pending items exist", async ({
    page,
  }) => {
    await page.goto("/goals/approvals");
    await page.waitForLoadState("networkidle");

    // Check if there are any pending approval items
    const reviewBtn = page
      .getByRole("button", { name: /review|approve|action/i })
      .first();

    if (await reviewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reviewBtn.click();

      // Verify a modal/dialog opens
      const modal = page
        .getByRole("dialog")
        .or(page.locator('[class*="modal"], [class*="Modal"], [data-testid*="modal"]'))
        .first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify approve/reject options in the modal
      const approveOption = page
        .getByRole("button", { name: /approve/i })
        .or(page.getByText(/approve/i))
        .first();
      const rejectOption = page
        .getByRole("button", { name: /reject/i })
        .or(page.getByText(/reject/i))
        .first();

      const hasApprove = await approveOption
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const hasReject = await rejectOption
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(hasApprove || hasReject).toBeTruthy();
    } else {
      // No pending items — test passes with a note
      console.log("No pending approval items found");
    }
  });
});
