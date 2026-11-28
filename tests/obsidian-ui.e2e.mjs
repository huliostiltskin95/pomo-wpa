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
      constructor(){this.app={workspace:{getLeavesOfType:()=>leaves,getActiveFile:()=>null,on:(name,handler)=>{(window.workspaceEvents??={})[name]=handler;return {};}}}}
      async loadData(){return null} async saveData(data){this.saved=structuredClone(data)}
      registerMarkdownCodeBlockProcessor(language,processor){(this.processors??={})[language]=processor} registerEvent(){}
      registerView(type,factory){this.factory=factory}
      addSettingTab(){} addCommand(command){(this.commands??={})[command.id]=command;} addRibbonIcon(){} registerInterval(){} registerDomEvent(){}
    }
    class ItemView{constructor(){this.containerEl=document.querySelector('#view');this.containerEl.createDiv();this.containerEl.createDiv()}}
    const setIcon=(el,name)=>{el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12h8M12 8v8"/></svg>';el.dataset.icon=name};
    window.notices=[];
    window.require=()=>({Plugin,ItemView,MarkdownRenderChild:class{constructor(el){this.containerEl=el}},Modal:class{constructor(app){this.app=app;this.contentEl=document.createElement("div")}open(){document.body.append(this.contentEl);this.onOpen()}close(){this.onClose();this.contentEl.remove()}},PluginSettingTab:class{},Setting:class{},Platform:{isMobile:true},setIcon,Notice:class{constructor(message){window.notices.push(message)}}});
    window.module={exports:{}};
    window.mount=async()=>{const plugin=new module.exports.default();
      const files=new Map();
      plugin.app.vault={getAbstractFileByPath:path=>files.get(path),read:async f=>f.text,
        process:async(f,edit)=>{f.text=edit(f.text);},create:async(path,text)=>{
          const f={path,basename:path.split('/').at(-1).slice(0,-3),extension:'md',text}; files.set(path,f); return f;}};
      await plugin.onload();const view=plugin.factory({});leaves.push({view});await view.onOpen();window.plugin=plugin;window.view=view;};
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
  for (const style of ['digits','ring','bar']) {
    await page.evaluate(style=>{plugin.timerStyle=style;view.update();},style);
    assert.equal(await page.locator('.tempvs-progress').isVisible(),style!=='digits');
    assert.equal(await page.locator('.tempvs-timer').getAttribute('data-style'),style);
  }
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
  // A daily note with no TEMPVS block still drives the panel.
  await page.evaluate(()=>{
    const file={path:'Daily/2099-11-07.md',basename:'2099-11-07',extension:'md'};
    const files=new Map([[file.path,{...file,text:'# Daily'}]]);
    window.allocationVault={
      getAbstractFileByPath:path=>files.get(path),
      read:async file=>file.text,
      process:async(file,edit)=>{file.text=edit(file.text);},
      create:async(path,text)=>{
        const file={path,text,basename:path.split('/').at(-1).slice(0,-3),extension:'md'};
        files.set(path,file);
        return file;
      }
    };
    plugin.app.vault=allocationVault;
    plugin.app.workspace.getActiveFile=()=>files.get(file.path);
    workspaceEvents['file-open'](file);
  });
  assert.equal(await page.evaluate(()=>view.day),'2099-11-07');
  await page.getByRole('button',{name:'Pianifica',exact:true}).click();
  assert.equal(await page.getByLabel('Data',{exact:true}).inputValue(),'2099-11-07');
  await page.getByLabel('Data',{exact:true}).fill('2099-11-08');
  await page.getByRole('button',{name:'Programma',exact:true}).click();
  await page.getByText('Da programmare').waitFor();
  await page.evaluate(async()=>{
    const file=allocationVault.getAbstractFileByPath('2099-11-08.md');
    file.text=file.text.replace('- @120m','- [[Letture/Santrock|Santrock et al. (2017) Psicologia dello sviluppo: p. 101–102]] @90m');
    file.text=file.text.replace('```TEMPVS\n','```TEMPVS\nStudio = 8h\n').replace(' @Studio','');
    if(!file.text.includes('```TEMPVS'))throw Error('Missing unified block');
    await plugin.daily.syncFile(file.path);
  });
  await page.getByText('90 min · Da programmare').waitFor();
  const allocation=page.locator('.tempvs-allocation').first();
  for(const width of [280,390,800]){
    await page.setViewportSize({width,height:844});
    const layout=await allocation.evaluate(card=>{
      const controls=[...card.querySelectorAll('button,input')];
      const rects=controls.map(el=>el.getBoundingClientRect());
      const bounds=card.getBoundingClientRect();
      return {
        outside:rects.some(r=>r.left<bounds.left||r.right>bounds.right),
        overlapping:rects.some((a,i)=>rects.slice(i+1).some(b=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom)),
        clipped:controls.some(el=>el.tagName==='BUTTON'&&(el.scrollWidth>el.clientWidth||el.scrollHeight>el.clientHeight))
      };
    });
    assert.deepEqual(layout,{outside:false,overlapping:false,clipped:false},'allocation card at '+width+'px');
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.tempvs-sessions').getByLabel('Ora di inizio').fill('13:00');
  await page.evaluate(()=>view.update(true));
  assert.equal(await page.locator('.tempvs-sessions').getByLabel('Ora di inizio').inputValue(),'13:00');
  await page.getByRole('button',{name:'Imposta orario'}).click();
  await page.waitForFunction(()=>plugin.allocatedOn('2099-11-08').length===0&&plugin.state.sessions.some(s=>s.date==='2099-11-08'&&s.start==='13:00'&&s.end==='14:30'));
  await page.evaluate(async()=>{
    const file=allocationVault.getAbstractFileByPath('2099-11-08.md');
    if(!file.text.includes('Studio = 8h')||!file.text.includes('@90m +13:00'))throw Error('Missing start in Markdown');
    file.text=file.text.replace('@90m +13:00','@90m +14:00');
    await plugin.daily.syncFile(file.path);
  });
  await page.waitForFunction(()=>plugin.state.sessions.some(s=>s.date==='2099-11-08'&&s.start==='14:00'&&s.end==='15:30')
    &&!plugin.state.sessions.some(s=>s.date==='2099-11-08'&&s.start==='13:00'));
  await page.evaluate(()=>plugin.app.workspace.getActiveFile=()=>null);
  // Exercise the actual TEMPVS Markdown code-block processor with a vault adapter.
  await page.evaluate(()=>{
    window.dailyText='# Daily\n\n```TEMPVS\nStudio +10:00-12:00 -30m\n```\n\nAltre note.';
    const file={path:'Daily/2099-11-06.md',basename:'2099-11-06',extension:'md'};
    plugin.app.vault={getAbstractFileByPath:path=>path===file.path?file:null,read:async()=>dailyText,process:async(file,update)=>{window.dailyText=update(window.dailyText);}};
    const root=document.body.createDiv({cls:'daily-container'});
    plugin.processors.TEMPVS('Studio +10:00-12:00 -30m\n',root,{sourcePath:file.path,getSectionInfo:()=>({lineStart:2}),addChild:child=>{window.dailyChild=child;child.onload();}});
  });
  const daily=page.locator('.daily-container');
  await page.waitForFunction(()=>plugin.state.sessions.filter(s=>s.date==='2099-11-06').length===4);
  assert.equal(await daily.locator('button').count(),0);
  assert.equal(await daily.locator('textarea').count(),0);
  assert.ok(await daily.locator('code .tempvs-syntax-area').count()>0);
  assert.ok(await daily.locator('code .tempvs-syntax-time').count()>0);
  assert.doesNotMatch(await daily.locator('code').textContent(),/tempvs-session/);
  const ids=await page.evaluate(()=>plugin.state.sessions.filter(s=>s.date==='2099-11-06').map(s=>s.id));
  await page.evaluate(()=>{
    window.dailyText=dailyText.replace('Studio +10:00-12:00 -30m','Studio +10:00-11:30 -30m\nLavoro +14:00-14:30 -30m');
    plugin.daily.schedule('Daily/2099-11-06.md');
  });
  await page.waitForFunction(()=>plugin.state.sessions.some(s=>s.date==='2099-11-06'&&s.area==='Lavoro'&&s.start==='14:00'));
  assert.deepEqual(await page.evaluate(()=>plugin.state.sessions.filter(s=>s.date==='2099-11-06'&&s.area==='Studio').map(s=>s.id)),ids.slice(0,3));
  await page.evaluate(async()=>{const s=plugin.state.sessions.find(s=>s.area==='Lavoro'&&s.date==='2099-11-06');await plugin.removeSession(s.id);await plugin.schedule('Personale +16:00-17:00 -1h','2099-11-06');});
  await page.waitForFunction(()=>dailyText.includes('+16:00')&&dailyText.includes('@Personale'));
  assert(!await page.evaluate(()=>dailyText.includes('Lavoro +14:00-14:30')));
  await page.waitForFunction(()=>document.querySelector('.daily-container code')?.textContent.includes('@Personale'));
  // A completed earlier plan must not prevent live unsaved afternoon edits.
  await page.evaluate(()=>{
    for(const session of plugin.state.sessions.filter(s=>s.date==='2099-11-06'))session.finished=true;
    const file={path:'Daily/2099-11-06.md',basename:'2099-11-06',extension:'md'};
    window.liveDailyText='# Daily\n\n```TEMPVS\nStudio +18:00-20:00 -60m\n```\n\nAltre note.';
    const oldLeaves=plugin.app.workspace.getLeavesOfType;
    const editorView={file,editor:{getValue:()=>liveDailyText},getMode:()=> 'source'};
    plugin.app.workspace.getLeavesOfType=type=>type==='markdown'?[{view:editorView}]:oldLeaves(type);
    plugin.app.workspace.getActiveFile=()=>file;
    workspaceEvents['editor-change'](editorView.editor,editorView);
  });
  await page.waitForFunction(()=>plugin.state.sessions.filter(s=>s.date==='2099-11-06'&&!s.finished).length===2);
  await page.waitForFunction(()=>view.day==='2099-11-06');
  assert.equal(await page.locator('.tempvs-session').count(),1);
  assert.match(await page.locator('.tempvs-sessions').textContent(),/18:00/);
  assert(await page.evaluate(()=>plugin.state.sessions.some(s=>s.date==='2099-11-06'&&s.finished)));
  await page.evaluate(async()=>{window.dailyText=liveDailyText;await plugin.daily.archiveChanged();});
  assert(!await page.evaluate(()=>dailyText.includes('+10:00')));
  for(const width of [280,390,768]){
    await page.setViewportSize({width,height:900});
    assert(await daily.evaluate(el=>el.scrollWidth<=el.clientWidth),'daily block overflow at '+width);
  }
  await page.setViewportSize({width:390,height:844});
  await daily.screenshot({path:'/tmp/tempvs-daily-note.png'});
  await page.evaluate(()=>{
    const previous=plugin.app.vault;
    window.estimateText='```tempus\n@Studio 20 -30m\n@Studio 10 -60m\n```';
    const file={path:'Studio/Platone.md',basename:'Platone',extension:'md'};
    plugin.app.vault={...previous,getName:()=> 'Test',
     getAbstractFileByPath:path=>path===file.path?file:previous.getAbstractFileByPath(path)||allocationVault.getAbstractFileByPath(path),
     read:async f=>f.path===file.path?estimateText:f.path==='Daily/2099-11-06.md'?previous.read(f):allocationVault.read(f),
     create:allocationVault.create};
    const root=document.body.createDiv({cls:'estimate-container'});
    plugin.processors.tempus('@Studio 20 -30m\n@Studio 10 -60m',root,{sourcePath:file.path,addChild:child=>{window.estimateChild=child;child.onload();}});
  });
  await page.waitForFunction(()=>plugin.estimates.notes.length===1);
  await page.waitForFunction(()=>document.querySelector('.estimate-container')?.textContent.includes('20 h'));
  await page.locator('.estimate-container').getByRole('button',{name:'Assegna tempo',exact:true}).click();
  const day=await page.getByLabel('Giorno di studio').inputValue();
  const localToday=await page.evaluate(()=>{
    const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  });
  assert.equal(day,localToday);
  await page.getByLabel('Giorno di studio').fill('2099-11-09');
  await page.getByRole('button',{name:'Assegna tempo',exact:true}).last().click();
  await page.waitForFunction(()=>allocationVault.getAbstractFileByPath('2099-11-09.md')?.text.includes('[[Studio/Platone.md|Platone]]'));
  const estimates=page.locator('.tempvs-estimates');
  await estimates.locator('.tempvs-estimate-details > summary').click();
  await estimates.getByLabel('Azioni studio').click();
  await page.evaluate(()=>{const old=plugin.app.vault.process;plugin.app.vault.process=async(file,change)=>{await old(file,change);window.liveDailyText=dailyText;};});
  await estimates.getByRole('button',{name:'Collega alle sessioni libere del giorno',exact:true}).click();
  await page.waitForFunction(()=>plugin.state.sessions.filter(s=>s.date==='2099-11-06'&&!s.finished).every(s=>s.linkedNotes?.length===1));
  assert.match(await estimates.textContent(),/10%/);
  assert.match(await estimates.textContent(),/20 h/);
  assert.equal(await page.locator('.tempvs-note-assignment').count(),0);
  await page.locator('.tempvs-session-cycles > summary').click();
  const cycle=page.locator('.tempvs-session-cycle').first();
  await page.evaluate(()=>{
    const file={path:'Appunti.md',basename:'Appunti',extension:'md'};
    plugin.app.vault.getMarkdownFiles=()=>[file];
    plugin.app.metadataCache={...plugin.app.metadataCache,getFileCache:()=>({frontmatter:{title:'Quaderno',aliases:['Taccuino']},headings:[{heading:'Lettura',level:2}]})};
  });
  await cycle.getByRole('button',{name:'Cambia nota'}).click();
  await page.getByLabel('Cerca nota').fill('Taccuino');
  await page.getByRole('button',{name:/Quaderno.*Appunti/}).click();
  await page.getByRole('button',{name:/Lettura.*H2/}).click();
  await page.waitForFunction(()=>plugin.state.sessions.find(s=>s.start==='18:00'&&s.date==='2099-11-06').linkedNotes?.[0]?.path==='Appunti#Lettura');
  assert(await page.evaluate(()=>dailyText.includes('[[Appunti#Lettura|Lettura]]')));
  assert.equal(await page.locator('.tempvs-session').count(),2);
  await estimates.getByRole('button',{name:'Segna completata',exact:true}).click();
  await page.waitForFunction(()=>plugin.estimates.notes[0].completed);
  assert.equal(await page.evaluate(()=>plugin.state.sessions.filter(s=>s.date==='2099-11-06'&&!s.finished).length),2);
  await estimates.getByRole('button',{name:'Riapri attività',exact:true}).click();
  await page.waitForFunction(()=>!plugin.estimates.notes[0].completed);
  await page.evaluate(async()=>{window.estimateText='```tempus\n@Studio 10h\n```';await plugin.daily.syncFile('Studio/Platone.md');});
  await page.waitForFunction(()=>plugin.estimates.notes[0].entries[0].targetMinutes===600);
  assert.equal(await page.evaluate(()=>plugin.estimates.notes.length),1);
  console.log('Note estimates: ordinary note, exact totals, daily assignment, progress and manual completion passed.');
  console.log('Daily block: uppercase fence, source edits, stable IDs, panel-to-note updates and mobile layout passed.');
  // Edit an elapsed interval through the same automatic Markdown workflow.
  await page.evaluate(async()=>{
   const oldGet=plugin.app.vault.getAbstractFileByPath,oldRead=plugin.app.vault.read,oldProcess=plugin.app.vault.process;
   const file={path:'Daily/2020-11-10.md',basename:'2020-11-10',extension:'md'};
   window.pastText='```TEMPVS\nStudio +10:00-12:00 -30m\n```';
   plugin.app.vault.getAbstractFileByPath=path=>path===file.path?file:oldGet(path);
   plugin.app.vault.read=file=>file.path==='Daily/2020-11-10.md'?Promise.resolve(pastText):oldRead(file);
   plugin.app.vault.process=async(file,change)=>{if(file.path==='Daily/2020-11-10.md')window.pastText=change(pastText);else await oldProcess(file,change);};
   const root=document.body.createDiv({cls:'past-container'});
   plugin.processors.TEMPVS('Studio +10:00-12:00 -30m\n',root,{sourcePath:file.path,getSectionInfo:()=>({lineStart:0}),addChild:child=>child.onload()});
   await plugin.daily.syncFile(file.path);
  });
  assert.equal(await page.evaluate(()=>plugin.state.sessions.filter(s=>s.date==='2020-11-10').reduce((n,s)=>n+s.actualSeconds,0)),6000);
  await page.evaluate(async()=>{window.pastText=pastText.replace('+10:00-12:00','+10:15-11:15');await plugin.daily.syncFile('Daily/2020-11-10.md');});
  await page.waitForFunction(()=>document.querySelector('.past-container small')?.textContent.includes('60 min registrati, pause comprese'));
  assert.equal(await page.evaluate(()=>plugin.state.sessions.filter(s=>s.date==='2020-11-10').reduce((n,s)=>n+s.actualSeconds,0)),3000);
  assert.match(await page.locator('.past-container code').textContent(),/10:15-11:15/);
  console.log('Retrospective blocks: corrected intervals, manual net totals and no duplicate historical credits passed.');
  // Reproduce the screenshot: valid Italian daily note, stale overlapping archive,
  // and an in-progress Svago break at 20:25 that must drive the actual timer.
  await page.evaluate(async()=>{
   const NativeDate=Date,clock=+new NativeDate('2026-11-15T20:25:00');
   window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
   const file={path:'agenda/15 novembre 2026.md',basename:'15 novembre 2026',extension:'md'};
   plugin.legacyPaths[file.path]='2026-11-15';
   window.screenshotNote='---\ntitle: 15 novembre 2026\n---\n\n# 15 novembre 2026\n\n```TEMPVS\ndate: 2026-11-15\nPersonale +01:26-01:56 -30m\nStudio +15:00-16:00 -60m\nSvago +18:30-21:00 -120m\nStudio +21:00-23:00 -60m\n```';
   plugin.dailyNotes=Object.create(null);plugin.app.workspace.getActiveFile=()=>file;
   const oldLeaves=plugin.app.workspace.getLeavesOfType;plugin.app.workspace.getLeavesOfType=type=>type==='markdown'?[]:oldLeaves(type);
   plugin.app.vault={getAbstractFileByPath:path=>path===file.path?file:null,getMarkdownFiles:()=>[file],read:async()=>screenshotNote,process:async(file,change)=>{window.screenshotNote=change(screenshotNote);}};
   await plugin.change(()=>{
    if(!plugin.config.areas.some(a=>a.name==='Svago'))plugin.config.areas.push({id:'svago',name:'Svago',description:'',color:'#54769B'});
    plugin.state.history=[];
    plugin.state.sessions=[{id:'stale-calendar',date:'2026-11-15',start:'18:00',end:'22:00',area:'Studio',title:'Studio',workMinutes:25,breakEnabled:true,actualSeconds:3600}];
   });
   plugin.daily.errors.set(file.path,'Le righe si sovrappongono a una sessione della giornata.');
   await plugin.daily.syncFile(file.path);plugin.refresh(true);
  });
  await page.waitForFunction(()=>document.querySelector('.tempvs-clock')?.textContent==='05:00');
  assert.equal(await page.locator('.tempvs-area').textContent(),'Svago');assert.equal(await page.locator('.tempvs-phase').textContent(),'Pausa');
  assert.equal(await page.locator('.tempvs-session').count(),4);assert.equal(await page.locator('.tempvs-daily-status').isVisible(),false);
  assert.match(await page.locator('.tempvs-sessions').textContent(),/01:26–01:56/);assert.match(await page.locator('.tempvs-sessions').textContent(),/21:00–22:00/);
  await page.evaluate(async()=>{
   window.screenshotNote=screenshotNote.replace('Svago +18:30-21:00 -120m\n','');await plugin.daily.syncFile('agenda/15 novembre 2026.md');
  });
  assert.equal(await page.locator('.tempvs-area').textContent(),'Studio');assert.equal(await page.locator('.tempvs-clock').textContent(),'50:00');
  assert.match(await page.locator('.tempvs-timer-hint').textContent(),/21:00/);
  assert.equal(await page.locator('.tempvs-primary-controls').isVisible(),false);
  console.log('Screenshot regression: note overrides old calendar, shows all daily slots, current 5-minute break and next 50-minute focus.');
  await page.evaluate(async()=>{
    view.app=plugin.app;
    plugin.app.workspace.openLinkText=async(...args)=>{window.openedResource=args;};
    window.screenshotNote=screenshotNote.replace('Studio +21:00-23:00 -60m','Studio +21:00-23:00 -60m [[personal-management#Serie TV|Serie TV]] [[Appunti|Seconda nota]]');
    await plugin.daily.syncFile('agenda/15 novembre 2026.md');plugin.refresh(true);
  });
  assert.equal(await page.locator('.tempvs-session-info > .tempvs-session-resources .tempvs-session-resource').count(),2);
  await page.evaluate(()=>{
    const root=document.body.createDiv({cls:'linked-daily'});
    plugin.processors.TEMPVS('',root,{sourcePath:'agenda/15 novembre 2026.md',addChild:child=>child.onload()});
  });
  await page.locator('.linked-daily code').getByRole('link',{name:'Serie TV',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>openedResource),['personal-management#Serie TV','agenda/15 novembre 2026.md',false]);
  await page.locator('.tempvs-session-resource').first().click();
  assert.deepEqual(await page.evaluate(()=>openedResource),['personal-management#Serie TV','agenda/15 novembre 2026.md',false]);
  await page.setViewportSize({width:320,height:800});
  assert(await page.locator('.tempvs-session-resource').first().isVisible());
  await page.evaluate(async()=>{
    window.screenshotNote=['```TEMPVS','date: 2026-11-15','Studio @8h','- [[Greco]] @6h = 12 +09:00','Personale @4h','- [[Personale#Budapest|Budapest]] @1h = 2 +02:50','```'].join('\n');
    await plugin.daily.syncFile('agenda/15 novembre 2026.md');
  });
  await page.waitForFunction(()=>document.querySelector('.tempvs-sessions')?.textContent.includes('3 h disponibili'));
  assert.equal(await page.locator('.tempvs-sessions tbody tr').count(),14);
  const rows=page.locator('.tempvs-sessions tbody tr');
  assert.match(await rows.first().textContent(),/02:50.*Budapest/);
  assert.match(await rows.nth(1).textContent(),/03:20.*Budapest.*30 min/);
  assert.match(await rows.last().textContent(),/Greco/);
  await page.evaluate(()=>plugin.commands['plan-daily-note'].callback());
  const planner=page.locator('form').filter({has:page.getByRole('button',{name:'Aggiungi alla giornata'})});
  await planner.getByLabel('Inizio',{exact:true}).fill('16:00');
  await planner.getByLabel('Fine',{exact:true}).fill('17:00');
  await planner.getByLabel('Area',{exact:true}).selectOption('Studio');
  await planner.getByLabel('Nota',{exact:true}).fill('Platone');
  assert.equal(await planner.locator('code').textContent(),'16:00-17:00 30m Studio [[Platone]]');
  await planner.getByRole('button',{name:'Aggiungi alla giornata'}).click();
  await page.waitForFunction(()=>screenshotNote.includes('16:00-17:00 30m Studio [[Platone]]'));
  assert.deepEqual(errors,[]);
  assert.deepEqual(await page.evaluate(()=>notices.filter(n=>/errore|invalid|sovrappost/i.test(n))),[]);
  console.log('Obsidian UI: creation, planning, pause/resume, finish, volume, Escape, drafts and responsive layouts passed.');
} finally { await browser.close(); }
