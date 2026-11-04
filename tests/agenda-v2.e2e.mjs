import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1365,height:900},acceptDownloads:true});
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:8123/",{waitUntil:"networkidle"});
  await page.locator("#tempo-agenda-v2").waitFor({state:"attached"});
  // The quick form is now a global modal and must work outside Agenda.
  await page.locator("#tempo-create-primary").click();
  await page.locator("#tempo-capture-dialog[open]").waitFor({state:"visible"});
  await page.locator("#quick-task-input").fill("Collaudo multivista !1 ^Lavoro @30m *oggi | **Descrizione** Markdown");
  await page.locator("#quick-task-form button[type=submit]").click();
  await page.locator("#tempo-capture-dialog").waitFor({state:"hidden"});
  await page.locator("[data-view-link=agenda]").click();
  assert.equal(await page.locator("#tempo-agenda-v2 .av2-nav-group").count(),2);
  const task=page.locator(".av2-task-title",{hasText:"Collaudo multivista"});
  await task.waitFor({state:"visible"});
  await task.click();
  await page.locator("#tempo-task-panel:not([hidden])").waitFor({state:"visible"});
  await page.locator("#tempo-task-panel [data-importance]").selectOption("yes");
  await page.locator("#tempo-task-panel [data-urgency]").selectOption("no");
  await page.locator("#tempo-task-panel input[name=subtask]").fill("Sottotask di collaudo");
  await page.locator("#tempo-task-panel form[data-sub-form] button[type=submit]").click();
  await page.locator("#tempo-task-panel .av2-subtasks",{hasText:"Sottotask di collaudo"}).waitFor();

  await page.locator("#tempo-task-panel .tempo-task-panel-close").click();
  for(const [view,selector] of [
    ["calendar",".av2-calendar-day"],["kanban",".av2-board"],
    ["timeline",".av2-timeline"],["matrix",".av2-matrix"],["list",".av2-group"]
  ]){
    if (!["calendar","list"].includes(view))
      await page.locator(".av2-more-views summary").click();
    await page.locator('#tempo-agenda-v2 [data-view="'+view+'"]').click();
    await page.locator("#tempo-agenda-v2 "+selector).first().waitFor({state:"visible"});
  }
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#tempo-agenda-v2").waitFor({state:"attached"});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("tempo-pomodoro-v2")));
  const t=saved.tasks.find(item=>item.title==="Collaudo multivista");
  assert.ok(t,"Task must survive reload");
  assert.equal(t.area,"Lavoro");
  assert.equal(t.important,true);
  assert.equal(t.urgent,false);
  assert.equal(t.subtasks.length,1);
  assert.equal(t.subtasks[0].title,"Sottotask di collaudo");
  assert.equal(t.status,"todo","No view should auto-complete a task");
  assert.equal(t.description,"**Descrizione** Markdown");
  // Exported JSON must include the new fields and the original Markdown.
  await page.locator(".tempo-nav-more-toggle").click();
  await page.locator("[data-view-link=impostazioni]").click();
  const downloadPromise=page.waitForEvent("download");
  await page.locator("#export-button").click();
  const downloaded=await downloadPromise;
  const backup=JSON.parse(await readFile(await downloaded.path(),"utf8"));
  const exported=backup.tasks.find(item=>item.title==="Collaudo multivista");
  assert.ok(exported);
  assert.equal(exported.subtasks[0].title,"Sottotask di collaudo");
  assert.equal(exported.important,true);

  // Confirm the same task is accessible on a narrow mobile viewport.
  await page.setViewportSize({width:390,height:844});
  await page.locator("[data-view-link=agenda]").click();
  assert.equal(await page.locator("#tempo-navigation > .tempo-nav-link").count(),4);
  await page.locator('#tempo-agenda-v2 [data-smart="all"]').click();
  await page.locator('#tempo-agenda-v2 [data-view="list"]').click();
  await page.locator(".av2-task-title",{hasText:"Collaudo multivista"}).click();
  await page.locator("#tempo-task-panel:not([hidden])").waitFor({state:"visible"});
  await page.locator("#tempo-task-panel .tempo-task-panel-close").click();

  // Offline reload uses the versioned service-worker cache, not GitHub network.
  await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error("Service worker non attivo")),12000))]));
  await page.context().setOffline(true);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#tempo-agenda-v2").waitFor({state:"attached",timeout:12000});
  await page.context().setOffline(false);
  assert.deepEqual(errors,[],"Unexpected uncaught browser errors");
  console.log("PASS: phase-one global capture, streamlined navigation, five views, details, subtasks, backup, mobile and offline");
} finally {
  await browser.close();
}
