import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";

function mockPlugin(mobile) {
  let saved=null;
  const element=()=>({addClass(){},setAttribute(){},addEventListener(){},textContent:""});
  const workspace={
    getLeavesOfType:()=>[],
    getActiveFile:()=>null,
    getRightLeaf:()=>({setViewState:async()=>{}}),
    revealLeaf:async()=>{}
  };
  class Plugin {
    constructor(){this.app={workspace};this.commands=[];}
    loadData(){return Promise.resolve(saved);}
    saveData(value){saved=structuredClone(value);return Promise.resolve();}
    registerMarkdownCodeBlockProcessor(){}
    registerEvent(){}
    registerView(){}
    addSettingTab(){}
    addCommand(command){this.commands.push(command);}
    addRibbonIcon(){}
    addStatusBarItem(){return element();}
    registerInterval(){}
    registerDomEvent(){}
  }
  class ItemView {}
  class Modal {}
  class PluginSettingTab { constructor(app,plugin){this.app=app;this.plugin=plugin;} }
  class Setting {}
  const setIcon=()=>{};
  class Notice {constructor(message){if(/failed|errore/i.test(message))throw Error(message);}}
  const context={
    module:{exports:{}},exports:{},require:id=>{
      if(id!=="obsidian")throw Error("Unexpected external "+id);
      return {Plugin,ItemView,Modal,MarkdownRenderChild:class{},Notice,PluginSettingTab,Setting,setIcon,Platform:{isMobile:mobile},requestUrl:async()=>{throw Error("No live Dropbox in mock");}};
    },
    console,Date,Intl,Math,JSON,Map,Set,Symbol,Error,Number,String,Boolean,Array,Object,
    Promise,URL,URLSearchParams,TextEncoder,Uint8Array,btoa,clearTimeout,setTimeout,
    crypto:webcrypto,navigator:{onLine:false},
    window:{setInterval:()=>1,setTimeout,clearTimeout},
    document:{hidden:false}
  };
  const code=readFileSync("obsidian/dist/main.js","utf8");
  vm.runInNewContext(code,context,{filename:"tempvs-obsidian.cjs"});
  const PluginClass=context.module.exports.default;
  assert.equal(typeof PluginClass,"function");
  return {PluginClass,getSaved:()=>saved};
}
for(const mobile of [false,true])test("Obsidian "+(mobile?"mobile":"desktop")+" runtime loads and preserves a completed session",async()=>{
  const {PluginClass,getSaved}=mockPlugin(mobile);
  const p=new PluginClass();
  await p.onload();
  assert.ok(p.commands.some(c=>c.id==="open-tempvs"));
  assert.ok(p.commands.some(c=>c.id==="toggle-compact-view"));
  await p.start("Studio",30,25,5);
  assert.equal(p.state.sessions.length,1);
  assert.equal(p.state.sessions[0].customBreakMinutes,5);
  await p.togglePause();
  assert.equal(p.state.sessions[0].paused,true);
  await p.finish();
  assert.equal(p.state.sessions[0].finished,true);
  await p.onunload();
  const next=new PluginClass();
  await next.onload();
  assert.equal(next.state.sessions.length,1);
  assert.equal(next.state.sessions[0].finished,true);
  assert.ok(getSaved().archive.sessions.length);
  assert.equal(next.compact,mobile);
  await next.onunload();
});

test('sync metadata failure does not undo an already saved Obsidian session',async()=>{
 const {PluginClass,getSaved}=mockPlugin(false),p=new PluginClass();await p.onload();
 const save=p.saveData.bind(p);let writes=0;
 p.saveData=value=>{if(++writes===2)return Promise.reject(Error('quota'));return save(value);};
 await p.start('Studio',30,25);
 assert.equal(p.state.sessions.length,1);
 assert.equal(getSaved().archive.sessions.length,1);
 await p.onunload();
});
test('overlapping Obsidian mutations cannot roll back each other',async()=>{
 const {PluginClass}=mockPlugin(false),p=new PluginClass();await p.onload();
 const save=p.saveData.bind(p);let unblock;
 p.saveData=value=>new Promise(resolve=>{unblock=()=>resolve(save(value));});
 const first=p.change(()=>{p.state.defaults.workMinutes=50;});
 // Let the queued write begin before attempting another mutation.
 await Promise.resolve();await Promise.resolve();
 await assert.rejects(p.change(()=>{p.state.defaults.workMinutes=99;}),/Salvataggio in corso/);
 p.saveData=save;unblock();await first;
 assert.equal(p.state.defaults.workMinutes,50);
 await p.onunload();
});
test('local write failure rolls back and unlocks the next Obsidian mutation',async()=>{
 const {PluginClass}=mockPlugin(false),p=new PluginClass();await p.onload();
 const save=p.saveData.bind(p);
 p.saveData=()=>Promise.reject(Error('disk full'));
 await assert.rejects(p.start('Studio',30,25),/disk full/);
 assert.equal(p.state.sessions.length,0);
 p.saveData=save;
 await p.start('Studio',30,25);
 assert.equal(p.state.sessions.length,1);
 await p.onunload();
});

function dailyVault(plugin,initial='Studio +10:00-12:00 -30m'){
 let text='# Giorno\n\n```TEMPVS\n'+initial+'\n```\n\nAltre note.\n';
 const file={path:'Daily/2099-11-06.md',basename:'2099-11-06',extension:'md'};
 plugin.app.vault={getAbstractFileByPath:path=>path===file.path?file:null,read:async()=>text,process:async(f,change)=>{text=change(text);},on:()=>({})};
 const child=()=>({source:text.slice(text.indexOf('```TEMPVS\n')+10,text.indexOf('\n```',text.indexOf('```TEMPVS\n')+10)),ctx:{sourcePath:file.path,getSectionInfo:()=>({lineStart:2})},containerEl:{}});
 return {child,file,text:()=>text,edit:value=>{text=value;}};
}
test('daily note apply is idempotent, survives reload and mirrors new plugin sessions',async()=>{
 const {PluginClass,getSaved}=mockPlugin(false),p=new PluginClass(),vault=dailyVault(p);await p.onload();
 const plan=await p.daily.preview(vault.child());assert.equal(p.state.sessions.length,0);
 await p.daily.apply(plan);assert.equal(p.state.sessions.length,4);assert(!vault.text().includes('tempvs-session:'));assert(vault.text().endsWith('Altre note.\n'));
 const ids=p.state.sessions.map(s=>s.id);
 const again=await p.daily.preview(vault.child());await p.daily.apply(again);
 assert.deepEqual(p.state.sessions.map(s=>s.id),ids);assert.equal(Object.keys(getSaved().dailyNotes).length,1);
 await p.schedule('Lavoro +14:00-15:00 -30m','2099-11-06');
 assert.equal(p.state.sessions.length,6);assert(vault.text().includes('Lavoro +14:00-15:00'));
 await p.removeSession(p.state.sessions.at(-1).id);assert.equal(p.state.sessions.length,5);assert(!vault.text().includes('Lavoro +14:30-15:00'));
 await p.onunload();
 const next=new PluginClass();const reopened=dailyVault(next);reopened.edit(vault.text());await next.onload();
 assert.equal(Object.keys(next.dailyNotes).length,1);const repeated=await next.daily.preview(reopened.child());await next.daily.apply(repeated);assert.equal(next.state.sessions.length,5);await next.onunload();
});
test('daily note refuses stale previews and keeps drafts during plugin changes',async()=>{
 const {PluginClass}=mockPlugin(false),p=new PluginClass(),vault=dailyVault(p);await p.onload();
 const plan=await p.daily.preview(vault.child());vault.edit(vault.text().replace('-30m','-45m'));
 await assert.rejects(p.daily.apply(plan),/nota è cambiata/);assert.equal(p.state.sessions.length,0);
 await p.daily.apply(await p.daily.preview(vault.child()));
 const draft=vault.text().replace('Studio +10:00-11:30','Studio +10:00-12:00');vault.edit(draft);
 await p.schedule('Lavoro +14:00-14:30 -30m','2099-11-06');assert.equal(vault.text(),draft);
 const child=vault.child(),preview=await p.daily.preview(child);
 await p.schedule('Personale +16:00-16:30 -30m','2099-11-06');
 await assert.rejects(p.daily.apply(preview),/sessioni sono cambiate/);await p.onunload();
});
test('daily note rolls back its text after an archive save failure and rejects file write failure',async()=>{
 const {PluginClass}=mockPlugin(false),p=new PluginClass(),vault=dailyVault(p);await p.onload();
 const original=vault.text(),plan=await p.daily.preview(vault.child()),save=p.saveData.bind(p);
 p.saveData=()=>Promise.reject(Error('disk full'));await assert.rejects(p.daily.apply(plan),/disk full/);
 assert.equal(p.state.sessions.length,0);assert.equal(Object.keys(p.dailyNotes).length,0);assert.equal(vault.text(),original);
 p.saveData=save;p.app.vault.process=async()=>{throw Error('file locked');};
 await assert.rejects(p.daily.apply(plan),/file locked/);assert.equal(p.state.sessions.length,0);await p.onunload();
});
test('daily code import adopts existing session IDs and isolates two notes for the same date',async()=>{
 const {PluginClass}=mockPlugin(false),p=new PluginClass(),vault=dailyVault(p);await p.onload();
 await p.schedule('Studio +10:00-12:00 -30m','2099-11-06');const ids=p.state.sessions.map(s=>s.id);
 await p.daily.apply(await p.daily.preview(vault.child()));assert.deepEqual(p.state.sessions.map(s=>s.id),ids);
 const other={...vault.file,path:'Other/2099-11-06.md'};const originalRead=p.app.vault.read,originalGet=p.app.vault.getAbstractFileByPath;
 p.app.vault.getAbstractFileByPath=path=>path===other.path?other:originalGet(path);
 p.app.vault.read=file=>file.path===other.path?Promise.resolve('```TEMPVS\nLavoro +16:00-16:30 -30m\n```'):originalRead(file);
 await assert.rejects(p.daily.preview({source:'Lavoro +16:00-16:30 -30m',ctx:{sourcePath:other.path,getSectionInfo:()=>({lineStart:0})},containerEl:{}}),/già un blocco/);await p.onunload();
});
test('a plugin change during note write cannot be overwritten by the prepared daily plan',async()=>{
 const {PluginClass}=mockPlugin(false),p=new PluginClass(),vault=dailyVault(p);await p.onload();
 const original=vault.text(),plan=await p.daily.preview(vault.child()),process=p.app.vault.process;
 let first=true;p.app.vault.process=async(...args)=>{await process(...args);if(first){first=false;p.state.defaults.workMinutes=50;await p.persist();}};
 await assert.rejects(p.daily.apply(plan),/sessioni sono cambiate durante il salvataggio/);
 assert.equal(p.state.defaults.workMinutes,50);assert.equal(p.state.sessions.length,0);assert.equal(vault.text(),original);await p.onunload();
});
test('unlinking a daily note preserves all sessions and removes only the local association',async()=>{
 const {PluginClass}=mockPlugin(false),p=new PluginClass(),vault=dailyVault(p);await p.onload();
 await p.daily.apply(await p.daily.preview(vault.child()));const ids=p.state.sessions.map(s=>s.id),text=vault.text();
 await p.daily.detach(vault.file.path);
 assert.deepEqual(p.state.sessions.map(s=>s.id),ids);assert(p.state.sessions.every(s=>!s.noteBlockId));assert.equal(Object.keys(p.dailyNotes).length,0);assert.equal(vault.text(),text);await p.onunload();
});


test('unified note links preserve historical credit while new focus stays in the area',async()=>{
 const {PluginClass,getSaved}=mockPlugin(true),p=new PluginClass();await p.onload();
 const area=p.config.areas.find(a=>a.name==='Studio');
 p.config.noteEstimates={n:{id:'n',title:'Platone',path:'Platone.md',vault:'Test',entries:[{areaId:area.id,area:area.name,count:20,minutes:30}]}};
 await p.start('Studio',30,25,5);
 const s=p.state.sessions[0],now=Date.now();s.timerStartedAt=new Date(now-20000).toISOString();s.timerEndsAt=new Date(now+1780000).toISOString();
 s.noteWork={n:10};p.lastTick=now-5000;p.record();assert.ok(s.actualSeconds>=5);
 await p.estimates.assign(s.id,'n');
 let assigned=p.state.sessions[0];assert.equal(assigned.linkedNotes[0].path,'Platone.md');assert.equal(assigned.noteEstimateId,undefined);
 const recorded=assigned.actualSeconds;p.lastTick=Date.now()-5000;p.record();assert.ok(assigned.actualSeconds>=recorded+4);assert.equal(assigned.noteWork.n,10);
 await p.estimates.assign(s.id,'');assigned=p.state.sessions[0];assert.equal(assigned.linkedNotes.length,0);
 await p.persist();assert.equal(getSaved().archive.sessions[0].noteWork.n,10);assert.equal(getSaved().archive.sessions[0].area,'Studio');
 await p.onunload();
});
