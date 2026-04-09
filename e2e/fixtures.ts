import { test as base, expect, type Page } from "@playwright/test";

// Test user credentials
const USERS = {
  admin: { email: "admin@automax.com", password: "admin123" },
  sarah: { email: "sarah.manager@automax.com", password: "admin123" },
  ahmed: { email: "ahmed.reviewer@automax.com", password: "admin123" },
  khalid: { email: "khalid.viewer@automax.com", password: "admin123" },
};

type UserRole = keyof typeof USERS;

// Login helper
async function login(page: Page, role: UserRole) {
  const user = USERS[role];
  await page.goto("/login");
  await page.fill('input[name="email"], input[type="email"]', user.email);
  await page.fill(
    'input[name="password"], input[type="password"]',
    user.password
  );
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

// Custom test fixture with login
export const test = base.extend<{
  loginAs: (role: UserRole) => Promise<void>;
}>({
  loginAs: async ({ page }, use) => {
    const loginFn = async (role: UserRole) => {
      await login(page, role);
    };
    await use(loginFn);
  },
});

export { expect, USERS };
export type { UserRole };
