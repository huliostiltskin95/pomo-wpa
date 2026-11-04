import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1365,height:900}});
const errors=[];
page.on("pageerror",error=>errors.push(error.message));

const dateOffset = count => page.evaluate(n => {
  const d=new Date();
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()+n);
  return String(d.getFullYear())+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
},count);

async function addSession(date,start,end) {
  await page.locator("#new-session-button").click();
  await page.locator("#session-dialog[open]").waitFor({state:"visible"});
  await page.locator("#session-title").selectOption("Lavoro");
  await page.locator("#session-date").fill(date);
  await page.locator("#session-start").fill(start);
  await page.locator("#session-end").fill(end);
  await page.locator('#session-form button[type="submit"]').click();
  await page.locator("#session-dialog").waitFor({state:"hidden"});
}

try {
  await page.goto("http://127.0.0.1:8123/",{waitUntil:"networkidle"});
  await page.locator("#tempo-day-timeline").waitFor({state:"attached"});
  await page.locator("[data-view-link=oggi]").click();
  await page.locator("#tempo-today-metrics").waitFor({state:"visible"});
  assert.equal(await page.locator(".tempo-today-grid .timer-card").count(),1);
  assert.equal(await page.locator(".tempo-today-metrics > div").count(),3);

  // Capture a deadline task; it must appear in Today, and completion stays manual.
  await page.locator("#tempo-create-primary").click();
  await page.locator("#quick-task-input").fill("Lezione per oggi ^Lavoro @2h *oggi !1");
  await page.locator('#quick-task-form button[type="submit"]').click();
  await page.locator("#tempo-capture-dialog").waitFor({state:"hidden"});
  await page.locator(".tempo-today-task-title",{hasText:"Lezione per oggi"}).waitFor({state:"visible"});
  const taskBefore=await page.evaluate(() => JSON.parse(localStorage.getItem("tempo-pomodoro-v2")).tasks.find(t=>t.title==="Lezione per oggi"));
  assert.equal(taskBefore.status,"todo");
  await page.locator('[data-today-plan-task="'+taskBefore.id+'"]').click();
  await page.locator("#task-plan-dialog[open]").waitFor({state:"visible"});
  await page.locator("#task-plan-cancel").click();

  // Select a future day and create two sessions, one crossing midnight.
  const date=await dateOffset(1), following=await dateOffset(2);
  await page.locator("[data-view-link=sessioni]").click();
  await page.locator("#filter-date").fill(date);
  await addSession(date,"09:00","10:00");
  await addSession(date,"23:00","01:00");
  await page.locator("#tempo-day-timeline .tempo-planner-block").first().waitFor();
  assert.equal(await page.locator("#tempo-day-timeline .tempo-planner-block").count(),2);
  assert.equal(await page.locator("#tempo-planner-week .tempo-week-day").count(),7);
  await page.locator(".tempo-planner-block").first().click();
  await page.locator("#session-dialog[open]").waitFor({state:"visible"});
  assert.ok(await page.locator("#session-id").inputValue(),"Clicking block should edit existing session");
  await page.locator("#cancel-dialog").click();

  // Next day must show 00:00-01:00 carryover, not drop overnight focus.
  await page.getByRole("button",{name:"Giorno successivo"}).click();
  assert.equal(await page.locator("#filter-date").inputValue(),following);
  assert.equal(await page.locator("#tempo-day-timeline .tempo-planner-block").count(),1);
  const dayText=await page.locator(".tempo-planner-block").first().innerText();
  assert.match(dayText,/00:00.*01:00/);
  assert.match(dayText,/Continua da ieri/);

  // A free hour is an entry point to the original validated session editor.
  await page.locator(".tempo-planner-lane").click({position:{x:35,y:240}});
  await page.locator("#session-dialog[open]").waitFor({state:"visible"});
  assert.equal(await page.locator("#session-date").inputValue(),following);
  assert.ok(await page.locator("#session-start").inputValue());
  await page.locator("#cancel-dialog").click();

  const persisted=await page.evaluate(() => JSON.parse(localStorage.getItem("tempo-pomodoro-v2")));
  assert.equal(persisted.tasks.find(t=>t.id===taskBefore.id).status,"todo");
  assert.equal(persisted.sessions.length,2);
  assert.ok(persisted.sessions.some(s=>s.start==="23:00"&&s.end==="01:00"));

  // Narrow viewport: both daily selector and timeline remain available.
  await page.setViewportSize({width:390,height:844});
  await page.locator("#tempo-planner-week .tempo-week-day").first().waitFor({state:"visible"});
  await page.locator(".tempo-planner-block").first().waitFor({state:"visible"});
  await page.locator("[data-view-link=oggi]").click();
  await page.locator(".tempo-today-task-title",{hasText:"Lezione per oggi"}).waitFor({state:"visible"});

  await page.evaluate(()=>Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error("Service worker not ready")),12000))
  ]));
  await page.context().setOffline(true);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#tempo-day-timeline").waitFor({state:"attached",timeout:12000});
  await page.context().setOffline(false);
  assert.deepEqual(errors,[],"No uncaught JS exceptions");
  console.log("PASS: Today tasks, planning dialog, timeline, overnight carryover, navigation, mobile and offline.");
} finally {
  await browser.close();
}
