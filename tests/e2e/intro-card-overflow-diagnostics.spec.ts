import { expect, test } from "@playwright/test";

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

const TARGETS = [
  {
    name: "Fight2",
    index: 2,
    selectors: [".eyebrow", "h1", ".chart", ".annotation", ".loss-label", ".axis"],
  },
  {
    name: "Rank1",
    index: 3,
    selectors: [".eyebrow", "h1", ".categories", ".category", ".summary"],
  },
  {
    name: "Rank2",
    index: 4,
    selectors: [".eyebrow", "h1", ".question", ".answers", ".fix", ".fix-trap"],
  },
  { name: "Rise1", index: 5, selectors: [".eyebrow", "h1", ".score", ".meter", ".note"] },
  { name: "Rise2", index: 6, selectors: [".eyebrow", "h1", ".stairs", ".baseline", ".dot"] },
  {
    name: "Join",
    index: 7,
    selectors: [
      ".poster",
      ".poster-title",
      ".poster-title .top",
      ".poster-title .bottom",
      ".illustration",
    ],
  },
];

const PALETTES = ["lime", "cyan", "violet", "emerald", "amber", "red", "orange", "blue"];

test("keeps every affected Arena intro card fully visible at supported viewports", async ({
  browser,
}) => {
  test.skip(test.info().project.name !== "chromium", "Viewport diagnostics run in Chromium");
  test.setTimeout(180_000);
  const failures: string[] = [];

  for (const [viewportIndex, viewport] of VIEWPORTS.entries()) {
    const theme = viewportIndex % 2 === 0 ? "dark" : "light";
    const accent = PALETTES[viewportIndex % PALETTES.length];
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    await context.addInitScript(
      ({ selectedTheme, selectedAccent }) => {
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
              arenaHookSeen: false,
              pitchHookSeen: true,
              targetExam: "cat",
              temporalWindow: "this_year",
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
      { selectedTheme: theme, selectedAccent: accent },
    );

    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const runtimeErrors: string[] = [];
    const localAssetFailures: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      if (request.url().includes("/_next/")) localAssetFailures.push(request.url());
    });
    await page.goto("http://localhost:3210/dashboard", { waitUntil: "domcontentloaded" });
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toHaveAttribute("data-accent", accent);
    if (theme === "light") await expect(dialog).toHaveClass(/light/);

    const slides = dialog.locator(".intro-carousel > article");
    let currentIndex = 0;

    for (const target of TARGETS) {
      while (currentIndex < target.index) {
        await page.keyboard.press("ArrowRight");
        currentIndex += 1;
      }

      const slide = slides.nth(target.index);
      await expect(slide).not.toHaveAttribute("aria-hidden", "true");
      const card = slide.locator(`.card.k-${target.name.toLowerCase()}`);
      await expect(card).toBeVisible();

      const measurement = await card.evaluate((element, selectors) => {
        const cardRect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const elements = selectors.flatMap((selector) =>
          Array.from(element.querySelectorAll<HTMLElement | SVGElement>(selector)).map((node) => {
            const rect = node.getBoundingClientRect();
            const css = getComputedStyle(node);
            return {
              selector,
              text: node.textContent?.trim().replace(/\s+/g, " ").slice(0, 100),
              width: rect.width,
              height: rect.height,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
              visible:
                css.display !== "none" &&
                css.visibility !== "hidden" &&
                Number(css.opacity) > 0 &&
                rect.width > 0 &&
                rect.height > 0,
              outsideCard:
                rect.top < cardRect.top - 1 ||
                rect.bottom > cardRect.bottom + 1 ||
                rect.left < cardRect.left - 1 ||
                rect.right > cardRect.right + 1,
            };
          }),
        );
        const annotationRect = element.querySelector(".annotation")?.getBoundingClientRect();
        const labelRects = Array.from(element.querySelectorAll<HTMLElement>(".loss-label")).map(
          (label) => label.getBoundingClientRect(),
        );
        const track = element.closest(".intro-carousel");
        const trackRect = track?.getBoundingClientRect();
        const stepsRect = document.querySelector(".steps")?.getBoundingClientRect();
        const annotationOverlapsLabel = Boolean(
          annotationRect &&
          labelRects.some(
            (rect) =>
              rect.left < annotationRect.right &&
              rect.right > annotationRect.left &&
              rect.top < annotationRect.bottom &&
              rect.bottom > annotationRect.top,
          ),
        );
        const overlapsSteps = Boolean(
          trackRect &&
          stepsRect &&
          cardRect.left < stepsRect.right &&
          cardRect.right > stepsRect.left &&
          cardRect.top < stepsRect.bottom &&
          cardRect.bottom > stepsRect.top,
        );

        return {
          answersDisplay: element.querySelector(".answers-list")
            ? getComputedStyle(element.querySelector(".answers-list")!).display
            : "not-applicable",
          compactMedia: window.matchMedia("(max-width: 400px) and (max-height: 700px)").matches,
          card: {
            width: cardRect.width,
            height: cardRect.height,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
          },
          elements,
          annotationOverlapsLabel,
          overlapsSteps,
          track: trackRect && {
            top: trackRect.top,
            bottom: trackRect.bottom,
            clientHeight: track?.clientHeight,
            scrollHeight: track?.scrollHeight,
            overflowY: getComputedStyle(track!).overflowY,
          },
          steps: stepsRect && { top: stepsRect.top, bottom: stepsRect.bottom },
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      }, target.selectors);

      const summary = {
        viewport,
        theme,
        accent,
        name: target.name,
        card: measurement.card,
        scrollDelta: measurement.card.scrollHeight - measurement.card.clientHeight,
        pageWidth: measurement.pageWidth,
        viewportWidth: measurement.viewportWidth,
        answersDisplay: measurement.answersDisplay,
        compactMedia: measurement.compactMedia,
        outside: measurement.elements
          .filter((element) => element.outsideCard)
          .map(({ selector, text }) => `${selector}: ${text}`),
        hidden: measurement.elements
          .filter((element) => !element.visible)
          .map(({ selector, text }) => `${selector}: ${text}`),
        annotationOverlapsLabel: measurement.annotationOverlapsLabel,
        overlapsSteps: measurement.overlapsSteps,
        track: measurement.track,
        steps: measurement.steps,
        elementBounds: measurement.elements.map(({ selector, text, top, bottom, height }) => ({
          selector,
          text,
          top: Math.round(top),
          bottom: Math.round(bottom),
          height: Math.round(height),
        })),
      };
      const context = `${target.name} at ${viewport.width}x${viewport.height}`;
      if (summary.card.scrollWidth > summary.card.clientWidth + 1) {
        failures.push(`${context}: horizontal overflow in card`);
      }
      if (summary.scrollDelta > 12)
        failures.push(`${context}: ${summary.scrollDelta}px vertical overflow`);
      if (summary.outside.length > 0)
        failures.push(`${context}: outside elements ${summary.outside.join("; ")}`);
      if (summary.hidden.length > 0)
        failures.push(`${context}: hidden elements ${summary.hidden.join("; ")}`);
      if (target.name === "Fight2" && summary.annotationOverlapsLabel) {
        failures.push(`${context}: stall badge overlaps a loss label`);
      }
      if (target.name === "Rank2") {
        const expectedAnswerLayout = viewport.width <= 400 && viewport.height <= 700 ? "grid" : "flex";
        if (summary.answersDisplay !== expectedAnswerLayout) {
          failures.push(`${context}: expected answer layout ${expectedAnswerLayout}, received ${summary.answersDisplay}`);
        }
      }
      if (target.name === "Rank2" && summary.overlapsSteps) {
        failures.push(`${context}: expanded card overlaps carousel steps`);
      }
      if (summary.pageWidth > summary.viewportWidth + 1)
        failures.push(`${context}: page horizontal overflow`);
      if (viewport.width === 320 || viewport.width === 1024) {
        await card.screenshot({
          path: test
            .info()
            .outputPath(`${target.name}-${viewport.width}x${viewport.height}-after.png`),
        });
      }
      if (target.name === "Rank2" && viewport.width === 320) {
        await page.screenshot({
          path: test.info().outputPath("rank2-320x568-carousel-after.png"),
        });
      }
    }

    if (runtimeErrors.length > 0) {
      failures.push(
        `${viewport.width}x${viewport.height}: uncaught browser errors ${runtimeErrors.join("; ")}`,
      );
    }
    const unrelatedDashboardSvgErrors = consoleErrors.filter((message) =>
      message.includes('<svg> attribute height: Expected length, "auto".'),
    );
    const relevantConsoleErrors = consoleErrors.filter(
      (message) => !message.includes('<svg> attribute height: Expected length, "auto".'),
    );
    if (relevantConsoleErrors.length > 0) {
      failures.push(
        `${viewport.width}x${viewport.height}: console errors ${relevantConsoleErrors.join("; ")}`,
      );
    }
    if (localAssetFailures.length > 0) {
      failures.push(
        `${viewport.width}x${viewport.height}: failed local assets ${localAssetFailures.join("; ")}`,
      );
    }
    if (unrelatedDashboardSvgErrors.length > 0) {
      console.info(
        `${viewport.width}x${viewport.height}: ignored the known dashboard RadarChart SVG height="auto" warning`,
      );
    }

    await context.close();
  }

  expect(failures).toEqual([]);
});

test("preserves animated card visibility and carousel navigation", async ({ browser }) => {
  test.skip(test.info().project.name !== "chromium", "Animation smoke test runs in Chromium");
  test.setTimeout(90_000);

  for (const viewport of [
    { width: 375, height: 667 },
    { width: 1280, height: 720 },
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
    await context.addInitScript(() => {
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
            arenaHookSeen: false,
            pitchHookSeen: true,
            targetExam: "cat",
            temporalWindow: "this_year",
          },
          version: 1,
        }),
      );
      localStorage.setItem(
        "zuzumik-theme",
        JSON.stringify({ state: { theme: "dark", accent: "lime" }, version: 0 }),
      );
      localStorage.setItem(
        "zuzumik-walkthrough-v2",
        JSON.stringify({ state: { completed: true }, version: 0 }),
      );
    });

    const page = await context.newPage();
    await page.goto("http://localhost:3210/dashboard", { waitUntil: "domcontentloaded" });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    const slides = dialog.locator(".intro-carousel > article");
    let currentIndex = 0;

    for (const [groupName, arrowSteps, target] of [
      ["Fight.", 1, TARGETS[0]],
      ["Rank.", 0, TARGETS[1]],
      ["Rank.", 1, TARGETS[2]],
      ["Rise.", 0, TARGETS[3]],
      ["Rise.", 1, TARGETS[4]],
      ["Rise.", 2, TARGETS[5]],
    ] as const) {
      await dialog.getByRole("tab", { name: groupName }).click();
      const groupStart = target.index - arrowSteps;
      currentIndex = groupStart;
      for (let step = 0; step < arrowSteps; step += 1) {
        await page.keyboard.press("ArrowRight");
        currentIndex += 1;
      }
      const slide = slides.nth(target.index);
      await expect(slide).not.toHaveAttribute("aria-hidden", "true");
      const card = slide.locator(`.card.k-${target.name.toLowerCase()}`);

      await card.evaluate(async (element) => {
        const finiteAnimations = element.getAnimations({ subtree: true }).filter((animation) => {
          const endTime = Number(animation.effect?.getComputedTiming().endTime);
          return Number.isFinite(endTime) && endTime > 0;
        });
        await Promise.all(
          finiteAnimations.map((animation) => animation.finished.catch(() => undefined)),
        );
      });

      const visible = await card.evaluate((element, selectors) => {
        const cardRect = element.getBoundingClientRect();
        return selectors.flatMap((selector) =>
          Array.from(element.querySelectorAll<HTMLElement | SVGElement>(selector)).map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              selector,
              visible: rect.width > 0 && rect.height > 0,
              withinCard:
                rect.top >= cardRect.top - 1 &&
                rect.bottom <= cardRect.bottom + 1 &&
                rect.left >= cardRect.left - 1 &&
                rect.right <= cardRect.right + 1,
            };
          }),
        );
      }, target.selectors);
      expect(visible.filter((item) => !item.visible || !item.withinCard)).toEqual([]);
    }

    await context.close();
  }
});
