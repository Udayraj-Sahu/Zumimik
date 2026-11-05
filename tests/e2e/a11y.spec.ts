import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seedAppState } from "./helpers/responsive";

const PUBLIC_ROUTES = ["/", "/auth", "/onboarding"];

const AUTHENTICATED_ROUTES = [
  "/dashboard",
  "/dashboard/feed",
  "/dashboard/analytics",
  "/dashboard/family",
  "/learn",
  "/learn/explorer",
  "/learn/practice",
  "/play",
  "/play/configure-sprint",
  "/play/duel",
  "/settings",
  "/settings/profile",
  "/settings/profile/edit",
  "/settings/history",
  "/settings/reports",
  "/settings/planner",
  "/settings/notifications",
  "/settings/help",
];

test.describe("automated accessibility scan", () => {
  test.setTimeout(120_000);
  for (const route of PUBLIC_ROUTES) {
    test(`${route} has no serious/critical violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route);
      await page.waitForLoadState("networkidle").catch(() => {});
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
      expect(
        serious.map((v) => v.id),
        JSON.stringify(serious, null, 2),
      ).toEqual([]);
    });
  }
});

test.describe("authenticated accessibility scan", () => {
  test.setTimeout(120_000);
  for (const route of AUTHENTICATED_ROUTES) {
    test(`${route} has no serious/critical violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      seedAppState(page);
      await page.goto(route);
      await page.waitForLoadState("networkidle").catch(() => {});
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
      expect(
        serious.map((v) => v.id),
        JSON.stringify(serious, null, 2),
      ).toEqual([]);
    });
  }
});