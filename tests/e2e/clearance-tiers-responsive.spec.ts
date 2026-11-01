import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 600, height: 800 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
];

const ACCENTS = ["lime", "cyan", "violet", "emerald", "amber", "red", "orange", "blue"];
type IntroKind = "arena" | "pitch";
type Theme = "dark" | "light";

async function seedIntro(page: Page, intro: IntroKind, theme: Theme, accent: string) {
  await page.addInitScript(
    ({ selectedIntro, selectedTheme, selectedAccent }) => {
      localStorage.setItem(
        "zuzumik-auth",
        JSON.stringify({
          state: {
            user: {
              id: "qa-user",
              name: "QA Operative",
              email: "qa@example.com",
              role: "Champion",
            },
            token: "mock-jwt-token",
            refreshToken: null,
            isAuthenticated: true,
            isOnboarded: true,
          },
          version: 0,
        }),
      );
      localStorage.setItem(
        "zuzumik-onboarding",
        JSON.stringify({
          state: {
            isOnboarded: true,
            planHookSeen: true,
            arenaHookSeen: selectedIntro === "pitch",
            pitchHookSeen: selectedIntro === "arena",
            targetExam: "cat",
            temporalWindow: selectedIntro === "arena" ? "this_year" : "whenever",
            planId: "dual-lane",
          },
          version: 1,
        }),
      );
      localStorage.setItem(
        "zuzumik-theme",
        JSON.stringify({ state: { theme: selectedTheme, accent: selectedAccent }, version: 0 }),
      );
      localStorage.setItem(
        "zuzumik-walkthrough-v2",
        JSON.stringify({ state: { completed: true }, version: 0 }),
      );
    },
    { selectedIntro: intro, selectedTheme: theme, selectedAccent: accent },
  );
}

async function verifyPricingFlow(
  browser: Browser,
  testInfo: TestInfo,
  intro: IntroKind,
  viewport: (typeof VIEWPORTS)[number],
  theme: Theme,
  accent: string,
) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  const runtimeErrors: string[] = [];
  const consoleErrors: string[] = [];
  const localAssetFailures: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/_next/")) localAssetFailures.push(request.url());
  });

  await seedIntro(page, intro, theme, accent);
  await page.goto("http://localhost:3210/dashboard", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-accent", accent);
  if (theme === "light") await expect(dialog).toHaveClass(/light/);

  const heading = dialog.getByRole("heading", { name: "Choose your plan" });
  const card = heading.locator("xpath=ancestor::section[1]");
  const billing = dialog.getByRole("group", { name: "Billing cycle" });
  const monthly = billing.getByRole("button", { name: "Monthly" });
  const annual = billing.getByRole("button", { name: /Annual/ });
  const dual = dialog.getByRole("radio", { name: /Build your study stack/ });
  const pro = dialog.getByRole("radio", { name: /Pro/ });

  // On mobile, expand the real bottom sheet before selecting a plan.
  if (viewport.width < 768) await heading.click();
  await monthly.scrollIntoViewIfNeeded();
  await monthly.click();
  await expect(monthly).toHaveAttribute("aria-pressed", "true");
  await expect(dual).toContainText("₹649");

  await pro.scrollIntoViewIfNeeded();
  await pro.click();
  await expect(pro).toHaveAttribute("aria-checked", "true");
  await expect(pro).toContainText("₹399");
  const describedBy = await pro.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(dialog.getByText("Full adaptive engine for one exam")).toBeVisible();

  await annual.scrollIntoViewIfNeeded();
  await annual.click();
  await expect(annual).toHaveAttribute("aria-pressed", "true");
  await expect(pro).toContainText("₹3,990");

  await dual.scrollIntoViewIfNeeded();
  await dual.click();
  await expect(dual).toHaveAttribute("aria-checked", "true");

  const geometry = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const title = element.querySelector("header h2")?.getBoundingClientRect();
    const toggle = element
      .querySelector('[role="group"][aria-label="Billing cycle"]')
      ?.getBoundingClientRect();
    const rows = Array.from(element.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    return {
      width: rect.width,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      headerOverlaps: Boolean(
        title &&
        toggle &&
        title.left < toggle.right &&
        title.right > toggle.left &&
        title.top < toggle.bottom &&
        title.bottom > toggle.top,
      ),
      headerSameRow: Boolean(
        title &&
        toggle &&
        Math.abs(title.top + title.height / 2 - (toggle.top + toggle.height / 2)) < 20,
      ),
      rowOverlaps: rows.some((row) => {
        const label = row.querySelector<HTMLElement>("[data-plan-title]")?.getBoundingClientRect();
        const price = row.querySelector<HTMLElement>("[data-plan-price]")?.getBoundingClientRect();
        return Boolean(
          label &&
          price &&
          label.left < price.right &&
          label.right > price.left &&
          label.top < price.bottom &&
          label.bottom > price.top,
        );
      }),
    };
  });

  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.width).toBeLessThanOrEqual(viewport.width);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.headerOverlaps).toBe(false);
  expect(geometry.headerSameRow).toBe(true);
  expect(geometry.rowOverlaps).toBe(false);
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewport.width + 1);

  if (viewport.width === 375 || viewport.width === 1440) {
    await card.screenshot({
      path: testInfo.outputPath(`${intro}-clearance-${viewport.width}x${viewport.height}.png`),
    });
  }

  await dialog.getByRole("radio", { name: /^Free/ }).click();
  const primaryAction = dialog.getByRole("button", { name: "Join Free" });
  await primaryAction.scrollIntoViewIfNeeded();
  await expect(primaryAction).toBeVisible();

  // The dashboard currently emits this unrelated RadarChart SVG warning on mount.
  const unexpectedConsoleErrors = consoleErrors.filter(
    (message) => !message.includes('<svg> attribute height: Expected length, "auto".'),
  );
  expect(runtimeErrors).toEqual([]);
  expect(unexpectedConsoleErrors).toEqual([]);
  expect(localAssetFailures).toEqual([]);
  await context.close();
}

async function verifyIntroMatrix(browser: Browser, testInfo: TestInfo, intro: IntroKind) {
  for (const [index, viewport] of VIEWPORTS.entries()) {
    const theme: Theme = index % 2 === 0 ? "dark" : "light";
    const accent = ACCENTS[index % ACCENTS.length];
    await verifyPricingFlow(browser, testInfo, intro, viewport, theme, accent);
  }
}

test.describe("Clearance Tiers responsive integration", () => {
  test.setTimeout(180_000);

  test("works in Arena Intro at every requested viewport", async ({ browser }, info) => {
    test.skip(info.project.name !== "chromium", "Responsive viewport matrix runs in Chromium");
    await verifyIntroMatrix(browser, info, "arena");
  });

  test("works in Pitch Intro at every requested viewport", async ({ browser }, info) => {
    test.skip(info.project.name !== "chromium", "Responsive viewport matrix runs in Chromium");
    await verifyIntroMatrix(browser, info, "pitch");
  });
});
