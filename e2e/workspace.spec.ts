import { expect, test } from "@playwright/test";

const hasE2EBackend = Boolean(
  process.env.E2E_SUPABASE_URL && process.env.E2E_SUPABASE_ANON_KEY,
);

test.describe("shared workspace flow", () => {
  test.skip(!hasE2EBackend, "需要真实的 Supabase 测试项目和 E2E 环境变量");

  test("one person can create a space and invite a second browser", async ({ page, browser }) => {
    await page.goto("/");
    await page.getByLabel("你的称呼").fill("小邵");
    await page.getByLabel("空间名称").fill("E2E 空间");
    await page.getByRole("button", { name: "创建我们的空间" }).click();

    const inviteCode = await page.locator(".invite-code span").textContent();
    expect(inviteCode).toBeTruthy();
    await page.getByRole("button", { name: "我知道了" }).click();
    await expect(page.getByText("E2E 空间")).toBeVisible();

    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await secondPage.goto("/");
    await secondPage.getByRole("button", { name: "加入空间" }).click();
    await secondPage.getByLabel("你的称呼").fill("另一个人");
    await secondPage.getByLabel("共享邀请码").fill(inviteCode ?? "");
    await secondPage.getByRole("button", { name: "进入共享空间" }).click();
    await expect(secondPage.getByText("E2E 空间")).toBeVisible();
    await secondContext.close();
  });

  test("a wrong invitation cannot enter a space", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "加入空间" }).click();
    await page.getByLabel("你的称呼").fill("访客");
    await page.getByLabel("共享邀请码").fill("WRONG12345");
    await page.getByRole("button", { name: "进入共享空间" }).click();
    await expect(page.getByText("邀请码不正确")).toBeVisible();
  });
});
