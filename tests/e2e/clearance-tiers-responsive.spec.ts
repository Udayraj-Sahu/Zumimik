import { expect, test, type Page } from "@playwright/test";

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

type IntroKind = "arena" | "pitch";

async function seedIntro(page: Page, intro: IntroKind, theme: "dark" | "light", accent: string) {
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

async function verifyIntroPricing(
  page: Page,
  intro: IntroKind,
  theme: "dark" | "light",
  accent: string,
) {
  const dialog = page.getByRole("dialog");
  const cardHeading = dialog.getByRole("heading", { name: "Choose your plan" });
  const card = cardHeading.locator("xpath=ancestor::section[1]");
  const billing = dialog.getByRole("group", { name: "Billing cycle" });
  const dualPlan = dialog.getByRole("radio", { name: /Build your study stack/ });
  const proPlan = dialog.getByRole("radio", { name: /Pro/ });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-accent", accent);
    if (theme === "light") await expect(dialog).toHaveClass(/light/);

    await billing.getByRole("button", { name: "Monthly" }).click();
    await expect(dualPlan).toContainText("₹649");

    await proPlan.click();
    await expect(proPlan).toHaveAttribute("aria-checked", "true");
    await expect(proPlan).toContainText("₹399");
    const describedBy = await proPlan.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(dialog.getByText("Full adaptive engine for one exam")).toBeVisible();

    const annual = billing.getByRole("button", { name: /Annual/ });
    await annual.scrollIntoViewIfNeeded();
    await annual.click();
    await expect(proPlan).toContainText("₹3,990");

    await dualPlan.click();
    await expect(dualPlan).toHaveAttribute("aria-checked", "true");

    const geometry = await card.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const heading = element.querySelector("header h2")?.getBoundingClientRect();
      const toggle = element
        .querySelector('[role="group"][aria-label="Billing cycle"]')
        ?.getBoundingClientRect();
      const rows = Array.from(element.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
      return {
        width: rect.width,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        headerOverlaps: Boolean(
          heading &&
          toggle &&
          heading.left < toggle.right &&
          heading.right > toggle.left &&
          heading.top < toggle.bottom &&
          heading.bottom > toggle.top,
        ),
        headerSameRow: Boolean(
          heading &&
          toggle &&
          Math.abs(heading.top + heading.height / 2 - (toggle.top + toggle.height / 2)) < 20,
        ),
        rowOverlaps: rows.some((row) => {
          const label = row
            .querySelector<HTMLElement>("[data-plan-title]")
            ?.getBoundingClientRect();
          const price = row
            .querySelector<HTMLElement>("[data-plan-price]")
            ?.getBoundingClientRect();
          return Boolean(
            label &&
            price &&
            label.left < price.right &&
            label.right > price.left &&
            label.top < price.bottom &&
            label.bottom > price.top,
          );
        }),
        rowCount: rows.length,
      };
    });

    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.width).toBeLessThanOrEqual(viewport.width);
    expect(
      geometry.scrollWidth,
      `card horizontal overflow at ${viewport.width}x${viewport.height} (${geometry.scrollWidth}px > ${geometry.clientWidth}px)`,
    ).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(
      geometry.headerOverlaps,
      `header/toggle overlap at ${viewport.width}x${viewport.height}`,
    ).toBe(false);
    expect(
      geometry.headerSameRow,
      `heading/toggle split into separate rows at ${viewport.width}x${viewport.height}`,
    ).toBe(true);
    expect(geometry.rowOverlaps, `plan/price overlap at ${viewport.width}x${viewport.height}`).toBe(
      false,
    );
    expect(geometry.rowCount).toBe(3);
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `page overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(
      viewport.width + 1,
    );

    if (viewport.width === 375) {
      await card.screenshot({ path: test.info().outputPath(`${intro}-clearance-mobile.png`) });
    }
    if (viewport.width === 1440) {
      await card.screenshot({ path: test.info().outputPath(`${intro}-clearance-desktop.png`) });
    }

    await dialog.getByRole("radio", { name: /^Free/ }).click();
    await expect(dialog.getByRole("button", { name: "Join Free" })).toBeVisible();
  }
}

test.describe("Clearance Tiers responsive integration", () => {
  test.setTimeout(90_000);

  test("works in Arena Intro at all requested viewports in dark/lime mode", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "chromium", "Responsive viewport matrix runs in Chromium");
    const runtimeErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location();
        consoleErrors.push(`${message.text()} (${location.url}:${location.lineNumber})`);
      }
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await seedIntro(page, "arena", "dark", "lime");
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await verifyIntroPricing(page, "arena", "dark", "lime");
    expect(runtimeErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("works in Pitch Intro at all requested viewports in light/cyan mode", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "chromium", "Responsive viewport matrix runs in Chromium");
    const runtimeErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location();
        consoleErrors.push(`${message.text()} (${location.url}:${location.lineNumber})`);
      }
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await seedIntro(page, "pitch", "light", "cyan");
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await verifyIntroPricing(page, "pitch", "light", "cyan");
    expect(runtimeErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
