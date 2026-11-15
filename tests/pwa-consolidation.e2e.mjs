import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('dist/test-artifacts',{recursive:true});
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true});
const url='http://127.0.0.1:8123/';
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>document.querySelector('#areas-open').onclick);
  await page.locator('#areas-open').click();
  await page.locator('#new-area').fill('Studio approfondito');await page.locator('#new-area-form button').click();
  await page.locator('#description').fill('[Risorsa](obsidian://open?vault=V)');await page.locator('#area-form button').click();
  const areaId=await page.evaluate(()=>JSON.parse(localStorage.getItem('tempo-pomodoro-v2')).defaults.simple.areas.find(a=>a.name==='Studio approfondito').id);
  await page.locator('#settings-close').click();
  await page.getByRole('button',{name:'Pianifica',exact:true}).click();await page.locator('.planner-open-quick').click();
  await page.locator('#quick-date').fill('2099-11-06');
  await page.locator('#quick').fill('Studio approfondito +23:50-01:00 -30m\nLavoro +09:00-12:00 -1,5h');await page.locator('#planner-import').click();
  assert.equal(await page.locator('#planner-rows tr').count(),4);
  assert.match(await page.locator('#planner-rows').innerText(),/10 min finali/);
  await page.locator('#prepare-plan').click();assert.match(await page.locator('#proposal-list').innerText(),/10 minuti finali lasciati liberi/);
  await page.locator('#confirm-plan').click();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tempo-pomodoro-v2')));
  assert.equal((await saved()).sessions.length,4);assert((await saved()).sessions.filter(s=>s.areaId===areaId).length===2);
  await page.locator('#areas-open').click();await page.locator('#edit-area').selectOption('Studio approfondito');
  await page.locator('#area-name').fill('Ricerca');await page.locator('#area-form button').click();
  assert((await saved()).sessions.filter(s=>s.areaId===areaId).every(s=>s.area==='Ricerca'));
  const manager=page.locator('.area-order-row').filter({has:page.getByText('Ricerca',{exact:true})});
  await manager.getByRole('button',{name:'Sposta elementi',exact:true}).click();
  await page.locator('#area-records-list input').first().check();
  const lavoroId=(await saved()).defaults.simple.areas.find(a=>a.name==='Lavoro').id;
  await page.locator('#area-records-target').selectOption(lavoroId);await page.locator('#area-records-confirm').click();
  assert.equal((await saved()).sessions.filter(s=>s.areaId===areaId).length,1);
  await manager.getByRole('button',{name:'Elimina',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept());await page.locator('#area-delete-records').click();
  const after=await saved();assert(!after.defaults.simple.areas.some(a=>a.id===areaId));assert.equal(after.sessions.length,3);assert.equal(after.syncDeleted.sessions.length,1);
  await page.locator('#settings-close').click();
  await page.reload();assert.equal((await saved()).sessions.length,3);
  // A broken late line must leave the imported table unchanged.
  await page.locator('.planner-open-quick').click();await page.locator('#quick').fill('Studio +10:00-11:00 -30m\nLavoro +25:00-26:00 -30m');
  const before=await page.locator('#planner-rows tr').count();await page.locator('#planner-import').click();
  assert.equal(await page.locator('#planner-rows tr').count(),before);assert.match(await page.locator('#toast').textContent(),/Riga 2/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>document.querySelector('#areas-open').onclick);
  assert.equal((await saved()).sessions.length,3);
  await page.getByRole('button',{name:'Timer',exact:true}).click();await page.locator('#instant button.primary').click();
  assert.equal(await page.locator('#pause').isVisible(),true);
  await page.screenshot({path:'dist/test-artifacts/tempvs-'+viewport.width+'.png',fullPage:true});
  assert.deepEqual(errors,[]);await context.close();
  console.log('Planning, areas, persistence, offline and timer verified at width '+viewport.width);
 }
 // Test the actual fallback when the PiP API rejects a browser request.
 const page=await browser.newPage();await page.addInitScript(()=>{
  if(window.documentPictureInPicture)window.documentPictureInPicture.requestWindow=async()=>{throw new DOMException('Denied','NotAllowedError');};
 });
 await page.goto(url);await page.locator('#instant button.primary').click();await page.locator('#pip-toggle').click();
 await page.waitForFunction(()=>document.body.classList.contains('focus-immersive'));
 assert.equal(await page.locator('#pause').isVisible(),true);await page.locator('#focus-close').click();
 assert.equal(await page.locator('#finish').isVisible(),true);
 console.log('PiP failure preserves main timer and opens Focus fallback');
}finally{await browser.close();}
