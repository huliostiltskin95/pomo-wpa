// Run after npm run build:obsidian. Exercises the real bundle with an Obsidian DOM/API shim.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent(`<style>
    :root{--font-ui-small:14px;--font-ui-smaller:12px;--background-primary:#fff;--background-secondary:#f5f5f8;--background-modifier-border:#dddde5;--background-modifier-hover:#eaeaf1;--text-normal:#252532;--text-muted:#6c6c80;--text-faint:#9494a3;--text-accent:#6c51cf;--interactive-accent:#7656d9;--text-error:#c03939;--text-warning:#9b6500;--text-success:#258252}
    body{margin:0;font-family:system-ui;color:var(--text-normal);background:var(--background-primary)}
    #view{height:100vh}button,input,select,textarea{font:inherit;border:1px solid var(--background-modifier-border);border-radius:7px;padding:8px;background:var(--background-primary);color:var(--text-normal)}button.mod-cta{background:var(--interactive-accent);color:#fff}label{font-weight:500}svg{width:20px;height:20px}p{line-height:1.5}
  </style><div id="view"></div>`);
  await page.addStyleTag({content:readFileSync('obsidian/styles.css','utf8')});
  await page.evaluate(()=>{
    const ep=HTMLElement.prototype;
    ep.createEl=function(tag,opts={}){
      const el=document.createElement(tag);
      if(opts.cls)el.className=opts.cls;
      if(opts.text)el.textContent=opts.text;
      for(const prop of ['value','type','href'])if(opts[prop]!==undefined)el.setAttribute(prop,opts[prop]);
      for(const [key,value]of Object.entries(opts.attr||{}))el.setAttribute(key,value);
      this.append(el);return el;
    };
    ep.createDiv=function(opts){return this.createEl('div',opts)};
    ep.createSpan=function(opts){return this.createEl('span',opts)};
    ep.empty=function(){this.replaceChildren()};
    ep.addClass=function(...names){this.classList.add(...names)};
    ep.hasClass=function(name){return this.classList.contains(name)};
    ep.toggleClass=function(name,yes){this.classList.toggle(name,yes)};
    const leaves=[];
    class Plugin{
      constructor(){this.app={workspace:{getLeavesOfType:()=>leaves,getActiveFile:()=>null}}}
      async loadData(){return null} async saveData(data){this.saved=structuredClone(data)}
      registerView(type,factory){this.factory=factory}
      addSettingTab(){} addCommand(){} addRibbonIcon(){} registerInterval(){} registerDomEvent(){}
    }
    class ItemView{constructor(){this.containerEl=document.querySelector('#view');this.containerEl.createDiv();this.containerEl.createDiv()}}
    const setIcon=(el,name)=>{el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12h8M12 8v8"/></svg>';el.dataset.icon=name};
    window.notices=[];
    window.require=()=>({Plugin,ItemView,Modal:class{},PluginSettingTab:class{},Setting:class{},Platform:{isMobile:true},setIcon,Notice:class{constructor(message){window.notices.push(message)}}});
    window.module={exports:{}};
    window.mount=async()=>{const plugin=new module.exports.default();await plugin.onload();const view=plugin.factory({});leaves.push({view});await view.onOpen();window.plugin=plugin;window.view=view;};
  });
  await page.addScriptTag({content:readFileSync('obsidian/dist/main.js','utf8')});
  await page.evaluate(()=>window.mount());
  await page.getByRole('button',{name:'+ Nuova sessione',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'+ Nuova sessione',exact:true}).getAttribute('aria-expanded'),'true');
  await page.getByRole('button',{name:'15 min',exact:true}).click();
  assert.equal(await page.getByLabel('Durata totale in minuti').inputValue(),'15');
  await page.getByRole('button',{name:'Avvia',exact:true}).click();
  await page.waitForFunction(()=>plugin.state.sessions.length===1);
  assert.equal(await page.locator('.tempvs-create-panel').isVisible(),false);
  assert.equal(await page.locator('.tempvs-progress').isVisible(),true);
  await page.getByRole('button',{name:'Pausa',exact:true}).click();
  await page.waitForFunction(()=>plugin.active().paused);
  assert.equal(await page.locator('.tempvs-phase').textContent(),'Conteggio focus sospeso');
  await page.getByRole('button',{name:'Riprendi',exact:true}).click();
  await page.waitForFunction(()=>!plugin.active().paused);
  await page.getByRole('button',{name:'Suoni',exact:true}).click();
  await page.getByRole('slider',{name:'Volume audio'}).fill('63');
  assert.equal(await page.locator('output').textContent(),'63%');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.tempvs-sound-panel').isVisible(),false);
  await page.getByRole('button',{name:'Giorno successivo'}).click();
  await page.getByRole('button',{name:'Pianifica',exact:true}).click();
  assert.equal(await page.getByLabel('Data',{exact:true}).inputValue(),await page.evaluate(()=>view.day));
  await page.getByLabel('Ora di inizio',{exact:true}).fill('14:00');
  await page.getByLabel('Durata · minuti',{exact:true}).fill('120');
  await page.getByLabel('Durata lorda del pomodoro').fill('60');
  assert.match(await page.locator('.tempvs-method-plan .tempvs-help').first().textContent(),/50 min focus \+ 10 min pausa/);
  await page.getByRole('button',{name:'Programma',exact:true}).click();
  await page.waitForFunction(()=>plugin.state.sessions.length===2);
  assert.deepEqual(await page.evaluate(()=>[plugin.state.sessions[1].workMinutes,plugin.state.sessions[1].cycleMinutes]),[50,60]);
  assert.equal(await page.locator('.tempvs-session').count(),1);
  await page.getByRole('button',{name:'Concludi',exact:true}).click();
  await page.waitForFunction(()=>plugin.state.sessions[0].finished);
  assert.equal(await page.locator('.tempvs-primary-controls').isVisible(),false);
  await page.getByRole('button',{name:'Risorse Obsidian',exact:true}).click();
  assert.equal(await page.locator('.tempvs-note-links').textContent(),'Nessuna nota collegata.');
  await page.keyboard.press('Escape');
  // Form drafts survive one-second ticks and panel changes.
  await page.getByRole('button',{name:'+ Nuova sessione',exact:true}).click();
  await page.locator('.tempvs-method').selectOption('start');
  await page.getByLabel('Durata totale in minuti').fill('42');
  await page.evaluate(()=>plugin.tick());
  assert.equal(await page.getByLabel('Durata totale in minuti').inputValue(),'42');
  await page.screenshot({path:'/tmp/tempvs-ui-form.png',fullPage:true});
  // Text planning overrides guided fields, including an incomplete time.
  await page.locator('.tempvs-method').selectOption('plan');
  await page.getByLabel('Ora di inizio',{exact:true}).fill('');
  await page.locator('.tempvs-batch summary').click();
  await page.getByLabel('Sessioni',{exact:true}).fill('Studio @30m +17:00 -30m\nStudio @30m +18:00');
  await page.getByRole('button',{name:'Programma',exact:true}).click();
  await page.waitForFunction(()=>plugin.state.sessions.length===4);
  assert.equal(await page.locator('.tempvs-session').count(),3);
  for(const width of [280,390,768]){
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.querySelector('.tempvs-root').scrollWidth<=document.querySelector('.tempvs-root').clientWidth),`overflow at ${width}px`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/tempvs-ui-light.png',fullPage:true});
  await page.evaluate(()=>{
    for(const [key,value]of Object.entries({'background-primary':'#202027','background-secondary':'#292931','background-modifier-border':'#40404c','text-normal':'#ededf4','text-muted':'#b0b0c2','text-accent':'#b6a1ff'}))document.documentElement.style.setProperty('--'+key,value);
  });
  await page.screenshot({path:'/tmp/tempvs-ui-dark.png',fullPage:true});
  assert.deepEqual(errors,[]);
  assert.deepEqual(await page.evaluate(()=>notices.filter(n=>/errore|invalid|sovrappost/i.test(n))),[]);
  console.log('Obsidian UI: creation, planning, pause/resume, finish, volume, Escape, drafts and responsive layouts passed.');
} finally { await browser.close(); }
