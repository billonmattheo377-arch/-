import { expect, test } from "@playwright/test";

test("shows actionable Supabase configuration instructions when env is missing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "连接你们的共享空间" })).toBeVisible();
  await expect(page.getByText("VITE_SUPABASE_URL=...")).toBeVisible();
  await expect(page.getByText("VITE_SUPABASE_ANON_KEY=...")).toBeVisible();
});

test("does not create horizontal page overflow at the current viewport", async ({ page }) => {
  await page.goto("/");
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasOverflow).toBe(false);
});
