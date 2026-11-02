import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1365,height:900},acceptDownloads:true});
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:8123/",{waitUntil:"networkidle"});
  await page.locator("#tempo-agenda-v2").waitFor({state:"attached"});
  await page.locator("[data-view-link=agenda]").click();
  await page.locator("#quick-task-input").fill("Collaudo multivista !1 ^Lavoro @30m *oggi | **Descrizione** Markdown");
  await page.locator("#quick-task-form button[type=submit]").click();

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
  assert.deepEqual(errors,[],"Unexpected uncaught browser errors");
  console.log("PASS: task input, detail pane, subtasks, five views and reload persistence");
} finally {
  await browser.close();
}
