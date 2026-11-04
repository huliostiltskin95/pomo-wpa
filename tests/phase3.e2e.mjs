import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1365,height:900}});
const errors=[];
page.on("pageerror",error=>errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:8123/",{waitUntil:"networkidle"});
  await page.locator("#tempo-create-menu-button").waitFor({state:"visible"});

  // Keyboard: open the global action menu, move between commands and restore focus on Esc.
  await page.locator("#tempo-create-menu-button").focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.locator("#tempo-create-menu-button").getAttribute("aria-expanded"),"true");
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.tempoCreate),"quick");
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.tempoCreate),"task");
  await page.keyboard.press("End");
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.tempoCreate),"tags");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#tempo-create-menu-button").getAttribute("aria-expanded"),"false");
  assert.equal(await page.evaluate(()=>document.activeElement?.id),"tempo-create-menu-button");

  // The "More" navigation behaves as a disclosure and returns focus on Escape.
  await page.locator(".tempo-nav-more-toggle").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".tempo-nav-more-toggle").getAttribute("aria-expanded"),"true");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".tempo-nav-more-toggle").getAttribute("aria-expanded"),"false");
  assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains("tempo-nav-more-toggle")),true);

  // Dark theme: no white hard-coded surface should survive in the updated timeline.
  await page.locator(".tempo-nav-more-toggle").click();
  await page.locator("[data-view-link=impostazioni]").click();
  await page.locator("#tempo-theme").selectOption("dark");
  await page.waitForFunction(()=>document.documentElement.dataset.tempoTheme==="dark");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("tempo-pomodoro-v2")).appearance.theme),"dark");

  // The timeline is fully operable by keyboard, without clicking a blank canvas.
  await page.locator("[data-view-link=sessioni]").click();
  await page.locator("#tempo-planner-week .tempo-week-day").first().waitFor({state:"visible"});
  const dayBefore=await page.locator("#filter-date").inputValue();
  const selected=page.locator('#tempo-planner-week button[aria-current="date"]');
  await selected.focus();
  await page.keyboard.press("ArrowRight");
  const dayAfter=await page.locator("#filter-date").inputValue();
  assert.notEqual(dayBefore,dayAfter);
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.day),dayAfter);
  await page.locator(".tempo-planner-new").focus();
  await page.keyboard.press("Enter");
  await page.locator("#session-dialog[open]").waitFor({state:"visible"});
  assert.equal(await page.locator("#session-date").inputValue(),dayAfter);
  await page.locator("#cancel-dialog").click();

  // A no-change update must NOT reconstruct the complete timeline DOM.
  const stable=await page.evaluate(()=>{
    const before=document.querySelector(".tempo-planner-lane");
    window.dispatchEvent(new Event("tempo:rendered"));
    return before===document.querySelector(".tempo-planner-lane");
  });
  assert.equal(stable,true,"No redundant timeline rebuild when data and date are unchanged");

  const darkSurface=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
    const background=getComputedStyle(document.querySelector(".tempo-day-timeline")).backgroundColor;
    const expected=document.createElement("div");
    expected.style.background=root;
    document.body.append(expected);
    const match=getComputedStyle(expected).backgroundColor===background;
    expected.remove();
    return match;
  });
  assert.equal(darkSurface,true,"Timeline must use the active theme surface");

  // Reduced-motion preference must disable decorative animation.
  await page.emulateMedia({reducedMotion:"reduce"});
  const reduced=await page.locator(".tempo-week-day").first().evaluate(el=>
    parseFloat(getComputedStyle(el).transitionDuration) <= 0.001);
  assert.equal(reduced,true);

  // Check compact width and touch-target sizes without relying on pixel snapshots.
  await page.setViewportSize({width:390,height:844});
  await page.locator("#tempo-planner-week").waitFor({state:"visible"});
  const targets=await page.evaluate(()=>{
    const selector=[".tempo-create-primary",".tempo-create-chevron",".tempo-day-arrow",".tempo-planner-new"];
    return selector.map(s=>{
      const el=document.querySelector(s),rect=el?.getBoundingClientRect();
      return {selector:s,width:rect?.width,height:rect?.height};
    });
  });
  for(const target of targets){
    assert.ok(target.width>=35,target.selector+" target must be at least 35 px wide");
    assert.ok(target.height>=40,target.selector+" target must be at least 40 px tall");
  }
  await page.locator("[data-view-link=oggi]").click();
  await page.locator(".tempo-today-grid .timer-card").waitFor({state:"visible"});

  // Theme and UI files must survive offline reload.
  await page.evaluate(()=>Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error("Service worker not ready")),12000))
  ]));
  await page.context().setOffline(true);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#tempo-create-menu-button").waitFor({state:"visible",timeout:12000});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.tempoTheme),"dark");
  await page.context().setOffline(false);
  assert.deepEqual(errors,[],"Unexpected JavaScript errors");
  console.log("PASS: keyboard menus, dark theme, keyboard week, accessible session action, no redundant render, touch targets, reduced motion and offline.");
} finally {
  await browser.close();
}
