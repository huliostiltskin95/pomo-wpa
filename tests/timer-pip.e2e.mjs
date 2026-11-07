import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8123/');
 await page.locator('#instant-minutes').fill('2');
 await page.locator('#instant-pause-mode').selectOption('custom');
 await page.locator('#instant-pause-minutes').fill('1');
 await page.locator('#instant button.primary').click();
 const color=()=>page.locator('#timer').evaluate(e=>e.style.getPropertyValue('--area-color'));
 const focusColor=await color();
 await page.locator('#pause').click(); assert.equal(await color(),'#2563EB');
 await page.locator('#pause').click(); assert.equal(await color(),focusColor);
 // Real Document PiP is available in Chromium, including its own DOM and controls.
 const popupEvent=page.waitForEvent('popup');
 await page.locator('#pip-toggle').click();
 const pip=await popupEvent;
 await pip.waitForSelector('#clock');
 assert.equal(await pip.locator('#title').innerText(),await page.locator('#active-title').innerText());
 await pip.locator('#pause').click(); assert.equal(await color(),'#2563EB');
 await pip.locator('#pause').click();
 await page.locator('#finish').click();
 assert.equal(await pip.locator('#end').innerText(),'Nessuna sessione in corso');
 await page.locator('#pip-toggle').click();
 assert.equal(await page.locator('#pip-toggle').isVisible(),false);
 // Reload into the final custom break, then into an automatic break.
 for(const custom of [true,false]) {
  await page.evaluate(custom=>{
   const key='tempo-pomodoro-v2',s=JSON.parse(localStorage.getItem(key));
   const start=new Date(Date.now()-65000),end=new Date(+start+120000);
   s.sessions=[{id:'test',title:'Studio',area:'Studio',date:start.toISOString().slice(0,10),start:'00:00',end:'00:02',timerStartedAt:start.toISOString(),timerEndsAt:end.toISOString(),workMinutes:1,breakEnabled:true,...(custom?{customBreakMinutes:1}:{})}];
   localStorage.setItem(key,JSON.stringify(s));
  },custom);
  await page.reload(); await page.waitForFunction(()=>document.querySelector('#phase').textContent==='PAUSA');
  assert.equal(await color(),'#2563EB');
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log('PiP, controls, finish, manual/custom/automatic break colors and mobile layout passed');
} finally {await browser.close();}
