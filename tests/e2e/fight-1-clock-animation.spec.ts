import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

async function openFightOne(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "zuzumik-auth",
      JSON.stringify({
        state: {
          user: { id: "1", name: "QA Operative", email: "qa@example.com", role: "Champion" },
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
          arenaHookSeen: false,
          pitchHookSeen: true,
          planId: "cat-fast-track",
          targetExam: "cat",
        },
        version: 1,
      }),
    );
    localStorage.setItem("zuzumik-walkthrough-v2", JSON.stringify({ state: { completed: true }, version: 0 }));
  });

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".intro-carousel")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Fight." }).click();

  const slide = page.locator('article[aria-label*="FIGHT 1/2"]');
  await expect(slide.locator(".k-fight1.is-active")).toBeVisible();
  return slide;
}

async function sampleClock(page: Page, slide: Locator) {
  return slide.evaluate((article) => {
    const hand = article.querySelector<SVGGElement>(".f1-hand");
    const wedge = article.querySelector<SVGPathElement>(".f1-wedge");
    const transform = hand?.getAttribute("transform") ?? "";
    const rotation = Number(transform.match(/rotate\(([-\d.]+)/)?.[1]);
    const path = wedge?.getAttribute("d") ?? "";
    const endpoint = path.match(/A198 198 0 0 1\s+(-?[\d.]+)\s+(-?[\d.]+)/);
    if (!endpoint || !Number.isFinite(rotation)) throw new Error("Clock SVG geometry is missing");

    const x = Number(endpoint[1]) - 250;
    const y = Number(endpoint[2]) - 300;
    const endpointAngle = (Math.atan2(y, x) * 180) / Math.PI + 360;
    return { handAngle: rotation + 180, endpointAngle };
  });
}

test("Fight 1 ticks once, keeps the sector aligned, and resumes without restarting", async ({ page }, testInfo: TestInfo) => {
  const slide = await openFightOne(page);
  const samples: Array<{ handAngle: number; endpointAngle: number }> = [];

  for (let sample = 0; sample < 53; sample += 1) {
    samples.push(await sampleClock(page, slide));
    await page.waitForTimeout(80);
  }

  expect(samples[0].handAngle).toBeCloseTo(196, 0);
  expect(samples.at(-1)?.handAngle).toBeCloseTo(270, 0);

  let pauseSamples = 0;
  let movementSamples = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    expect(current.handAngle + 0.02).toBeGreaterThanOrEqual(previous.handAngle);
    expect(Math.abs(current.handAngle - current.endpointAngle)).toBeLessThan(0.03);

    if (Math.abs(current.handAngle - previous.handAngle) < 0.02) pauseSamples += 1;
    if (current.handAngle - previous.handAngle > 0.1) movementSamples += 1;
  }
  expect(pauseSamples).toBeGreaterThan(5);
  expect(movementSamples).toBeGreaterThan(6);

  await page.getByRole("tab", { name: "Rank." }).click();
  await page.getByRole("tab", { name: "Fight." }).click();
  await page.waitForTimeout(700);
  const afterNavigation = await sampleClock(page, slide);
  expect(afterNavigation.handAngle).toBeCloseTo(270, 0);
  expect(afterNavigation.endpointAngle).toBeCloseTo(afterNavigation.handAngle, 2);

  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(".k-fight1");
      const documentWidth = document.documentElement.scrollWidth;
      return {
        cardWidth: card?.clientWidth ?? 0,
        cardScrollWidth: card?.scrollWidth ?? 0,
        viewportWidth: window.innerWidth,
        documentWidth,
      };
    });
    expect(layout.cardWidth).toBeGreaterThan(0);
    expect(layout.cardScrollWidth).toBeLessThanOrEqual(layout.cardWidth + 1);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);

    if (width === 320 || width === 1440) {
      await page.screenshot({ path: testInfo.outputPath(`fight-1-clock-${width}.png`) });
    }
  }
});
