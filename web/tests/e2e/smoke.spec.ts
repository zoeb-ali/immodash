import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Every route in both languages: loads, has one h1, the right lang, no console errors, no CSP violations,
// no horizontal overflow, and no serious or critical accessibility violations (axe, WCAG 2.1 AA).
const ROUTES = ["/", "/cities", "/cities/berlin", "/cities/bielefeld", "/affordability", "/map", "/supply-demand", "/methodology", "/about"];
const PAGES = ROUTES.flatMap((r) => [r, r === "/" ? "/de" : `/de${r}`]);

for (const path of PAGES) {
  test(`page ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !/tiles\.openfreemap|net::ERR|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path, { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.locator("html").getAttribute("lang")).toBe(path.startsWith("/de") ? "de" : "en");
    // scroll so lazily mounted charts render too
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude(".maplibregl-canvas").exclude(".recharts-surface").analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("language switch keeps the page", async ({ page }) => {
  await page.goto("/cities/bielefeld");
  await page.locator('.lang-toggle a[hreflang="de"]').click();
  await expect(page).toHaveURL(/\/de\/cities\/bielefeld$/);
  await expect(page.locator("h1")).toHaveText("Mieten in Bielefeld");
});

test("robots, sitemap and security headers", async ({ request }) => {
  expect((await request.get("/robots.txt")).status()).toBe(200);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/de/cities/berlin");
  const res = await request.get("/");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});
