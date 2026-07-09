import { test, expect } from "@playwright/test";

test.describe("public smoke", () => {
  test("landing page loads", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.ok() || res?.status() === 307 || res?.status() === 302).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page is reachable", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
  });
});
