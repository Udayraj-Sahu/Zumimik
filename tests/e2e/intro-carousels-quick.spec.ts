import { test, expect } from "@playwright/test";

test.describe("Arena and Pitch intros quick check", () => {
  test("ArenaIntro opens and slides render without horizontal scroll", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("zuzumik-auth", JSON.stringify({state:{user:{id:"1",name:"QA Operative",email:"qa@example.com",role:"Champion"},token:"mock-jwt-token",refreshToken:null,isAuthenticated:true,isOnboarded:true},version:0}));
      localStorage.setItem("zuzumik-onboarding", JSON.stringify({state:{isOnboarded:true,planHookSeen:true,arenaHookSeen:false,pitchHookSeen:true,planId:"cat-fast-track",targetExam:"cat"},version:1}));
      localStorage.setItem("zuzumik-walkthrough-v2", JSON.stringify({state:{completed:true},version:0}));
    });
    await page.setViewportSize({width:375,height:667});
    await page.goto("/dashboard", {waitUntil:"domcontentloaded"});
    await page.waitForTimeout(3000);
    const scrollCheck = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(scrollCheck).toBeFalsy();
  });

  test("PitchIntro opens and slides render without horizontal scroll", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("zuzumik-auth", JSON.stringify({state:{user:{id:"1",name:"QA Operative",email:"qa@example.com",role:"Champion"},token:"mock-jwt-token",refreshToken:null,isAuthenticated:true,isOnboarded:true},version:0}));
      localStorage.setItem("zuzumik-onboarding", JSON.stringify({state:{isOnboarded:true,planHookSeen:true,arenaHookSeen:true,pitchHookSeen:false,targetExam:null,planId:null},version:1}));
      localStorage.setItem("zuzumik-walkthrough-v2", JSON.stringify({state:{completed:true},version:0}));
    });
    await page.setViewportSize({width:390,height:844});
    await page.goto("/dashboard", {waitUntil:"domcontentloaded"});
    await page.waitForTimeout(3000);
    const scrollCheck = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(scrollCheck).toBeFalsy();
  });
});