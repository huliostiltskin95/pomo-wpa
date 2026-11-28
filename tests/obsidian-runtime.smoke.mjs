import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";

function mockPlugin(mobile) {
  let saved=null;
  const storage=new Map(),intervals=new Map(),notices=[];let clockId=0;
  const element=()=>({addClass(){},setAttribute(){},addEventListener(){},textContent:""});
  const workspace={
    getLeavesOfType:()=>[],
    getActiveFile:()=>null,
    getRightLeaf:()=>({setViewState:async()=>{}}),
    revealLeaf:async()=>{}
  };
  const files=new Map();
  const vault={getAbstractFileByPath:path=>files.get(path),getMarkdownFiles:()=>[...files.values()],
    read:async file=>file.text,process:async(file,edit)=>{file.text=edit(file.text);},
    create:async(path,text)=>{const file={path,basename:path.split('/').pop().slice(0,-3),extension:'md',text};files.set(path,file);return file;}};
  class Plugin {
    constructor(){this.app={workspace,vault};this.commands=[];}
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
  class Notice {constructor(message){notices.push(message);if(/failed|errore/i.test(message))throw Error(message);}}
  const context={
    module:{exports:{}},exports:{},require:id=>{
      if(id!=="obsidian")throw Error("Unexpected external "+id);
      return {Plugin,ItemView,Modal,MarkdownRenderChild:class{},Notice,PluginSettingTab,Setting,setIcon,Platform:{isMobile:mobile},requestUrl:async()=>{throw Error("No live Dropbox in mock");}};
    },
    console,Date,Intl,Math,JSON,Map,Set,Symbol,Error,Number,String,Boolean,Array,Object,
    Promise,URL,URLSearchParams,TextEncoder,Uint8Array,btoa,clearTimeout,setTimeout,
    crypto:webcrypto,navigator:{onLine:false},
    window:{localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},setInterval:fn=>{intervals.set(++clockId,fn);return clockId;},clearInterval:id=>intervals.delete(id),setTimeout,clearTimeout},
    document:{hidden:false}
  };
  const code=readFileSync("obsidian/dist/main.js","utf8");
  vm.runInNewContext(code,context,{filename:"tempvs-obsidian.cjs"});
  const PluginClass=context.module.exports.default;
  assert.equal(typeof PluginClass,"function");
  return {PluginClass,getSaved:()=>saved,intervals,notices,context};
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
  await next.onload();await next.daily.initialize();
  assert.equal(next.state.sessions.length,1);
  assert.equal(next.state.sessions[0].finished,true);
  assert.equal(getSaved().archive,undefined);
  assert.equal(next.compact,mobile);
  await next.onunload();
});

test('settings persistence writes no global session archive',async()=>{
 const {PluginClass,getSaved}=mockPlugin(false),p=new PluginClass();await p.onload();
 await p.start('Studio',30,25);await p.persist();
 assert.equal(getSaved().format,2);assert.equal(getSaved().archive,undefined);assert.equal(getSaved().dailyNotes,undefined);
 assert.equal(p.app.vault.getMarkdownFiles().length,1);await p.onunload();
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
 await assert.rejects(p.change(()=>{p.state.defaults.workMinutes=45;}),/disk full/);
 assert.equal(p.state.sessions.length,0);
 p.saveData=save;
 await p.start('Studio',30,25);
 assert.equal(p.state.sessions.length,1);
 await p.onunload();
});

function dailyVault(plugin,initial='Studio +10:00-12:00 -30m'){
 let text='# Giorno\n\n```TEMPVS\n'+initial+'\n```\n\nAltre note.\n';
 const file={path:'Daily/2099-11-06.md',basename:'2099-11-06',extension:'md'};
 plugin.app.internalPlugins={getPluginById:()=>({instance:{options:{folder:'Daily'}}})};
 plugin.app.vault={getMarkdownFiles:()=>[file],getAbstractFileByPath:path=>path===file.path?file:null,read:async()=>text,process:async(f,change)=>{text=change(text);},on:()=>({})};
 const child=()=>({source:text.slice(text.indexOf('```TEMPVS\n')+10,text.indexOf('\n```',text.indexOf('```TEMPVS\n')+10)),ctx:{sourcePath:file.path,getSectionInfo:()=>({lineStart:2})},containerEl:{}});
 return {child,file,text:()=>text,edit:value=>{text=value;}};
}
test('daily note apply is idempotent, survives reload and mirrors new plugin sessions',async()=>{
 const {PluginClass,getSaved}=mockPlugin(false),p=new PluginClass(),vault=dailyVault(p);await p.onload();
 const plan=await p.daily.preview(vault.child());assert.equal(p.state.sessions.length,0);
 await p.daily.apply(plan);assert.equal(p.state.sessions.length,4);assert(!vault.text().includes('tempvs-session:'));assert(vault.text().endsWith('Altre note.\n'));
 const ids=p.state.sessions.map(s=>s.id);
 const again=await p.daily.preview(vault.child());await p.daily.apply(again);
 assert.deepEqual(p.state.sessions.map(s=>s.id),ids);assert.equal(getSaved().dailyNotes,undefined);
 await p.schedule('Lavoro +14:00-15:00 -30m','2099-11-06');
 assert.equal(p.state.sessions.length,6);assert(vault.text().includes('+14:00')&&vault.text().includes('@Lavoro'));
 await p.removeSession(p.state.sessions.at(-1).id);assert.equal(p.state.sessions.length,5);assert(!vault.text().includes('Lavoro +14:30-15:00'));
 await p.onunload();
 const next=new PluginClass();const reopened=dailyVault(next);reopened.edit(vault.text());await next.onload();await next.daily.initialize();
 assert.equal(Object.keys(next.dailyNotes).length,1);const repeated=await next.daily.preview(reopened.child());await next.daily.apply(repeated);assert.equal(next.state.sessions.length,5);await next.onunload();
});
test('daily note refuses stale previews and keeps drafts during plugin changes',async()=>{
 const {PluginClass}=mockPlugin(false),p=new PluginClass(),vault=dailyVault(p);await p.onload();
 const plan=await p.daily.preview(vault.child());vault.edit(vault.text().replace('-30m','-45m'));
 await assert.rejects(p.daily.apply(plan),/nota è cambiata/);assert.equal(p.state.sessions.length,0);
 await p.daily.apply(await p.daily.preview(vault.child()));
 const draft=vault.text().replace('Studio +10:00-11:30','Studio +10:00-12:00');vault.edit(draft);
 await p.schedule('Lavoro +14:00-14:30 -30m','2099-11-06');assert(vault.text().includes('Studio +10:00-12:00'));
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
 await p.daily.syncFile(vault.file.path);const ids=p.state.sessions.map(s=>s.id);
 await p.daily.apply(await p.daily.preview(vault.child()));assert.deepEqual(p.state.sessions.map(s=>s.id),ids);
 const other={...vault.file,path:'Other/2099-11-06.md'};const originalRead=p.app.vault.read,originalGet=p.app.vault.getAbstractFileByPath;
 p.app.vault.getAbstractFileByPath=path=>path===other.path?other:originalGet(path);
 p.app.vault.read=file=>file.path===other.path?Promise.resolve('```TEMPVS\nLavoro +16:00-16:30 -30m\n```'):originalRead(file);
 await assert.rejects(p.daily.preview({source:'Lavoro +16:00-16:30 -30m',ctx:{sourcePath:other.path,getSectionInfo:()=>({lineStart:0})},containerEl:{}}),/nota quotidiana|già un blocco/);await p.onunload();
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


test('starting from an estimate writes the daily and derives gross minutes once',async()=>{
 const {PluginClass}=mockPlugin(true),p=new PluginClass();await p.onload();
 const area=p.config.areas.find(a=>a.name==='Studio');
 await p.estimates.start({path:'Tacito.md',title:'Tacito'},{area:'Studio',areaId:area.id,minutes:30});
 const file=p.app.vault.getMarkdownFiles()[0];
 assert.match(file.text,/Tacito.md/);
 await p.daily.syncFile(file.path);assert.equal(p.state.sessions.length,1);
 assert.equal(p.estimates.totals().get('Tacito.md'),1800);
 await p.onunload();
});
test('assigned study time is editable in the daily note and becomes one linked timer session',async()=>{
 const {PluginClass}=mockPlugin(false),p=new PluginClass();
 const date='2099-11-08',note={path:'Letture/Libro.md',label:'Libro'},files=new Map();
 const vault={
  getAbstractFileByPath:path=>files.get(path),
  read:async file=>file.text,
  process:async(file,edit)=>{file.text=edit(file.text);},
  create:async(path,text)=>{
   const file={path,text,basename:date,extension:'md'};
   files.set(path,file);
   return file;
  }
 };
 p.app.vault=vault;
 await p.onload();
 await p.assignTime({area:'Studio',minutes:30},date,note);
 const file=files.get(date+'.md');
 assert.match(file.text,/- \[\[Letture\/Libro.md\|Libro\]\] @30m @Studio/);
 file.text=file.text.replace('```TEMPVS\n','```TEMPVS\nStudio = 8h\n').replace(' @Studio','');
 assert.equal(p.state.sessions.length,0);
 assert.equal(p.active(),null);
 await p.onunload();
 file.text=file.text.replace('@30m','@40m');
 const next=new PluginClass();next.app.vault=vault;await next.onload();
 await next.daily.syncFile(file.path);
 const [allocation]=next.allocatedOn(date);
 assert.equal(allocation.minutes,40);
 assert.equal(allocation.note.path,note.path);
 const save=next.saveData.bind(next);
 next.saveData=()=>Promise.reject(Error('disk full'));
 await assert.rejects(next.scheduleAllocation(allocation,'13:00'),/disk full/);
 assert.match(file.text,/@40m/);
 assert.equal(next.state.sessions.length,0);
 next.saveData=save;
 await next.schedule('Studio @30m +15:00',date);
 await assert.rejects(next.scheduleAllocation(allocation,'15:15'),/sovrappongono/);
 assert.match(file.text,/@40m/);
 await next.scheduleAllocation(allocation,'13:00');
 assert.equal(next.allocatedOn(date).length,0);
 assert.match(file.text,/Studio = 8h\n- .* @40m \+13:00/);
 const session=next.state.sessions.find(item=>item.start==='13:00');
 assert.equal(session.date,date);
 assert.equal(session.end,'13:40');
 assert.equal(session.linkedNotes[0].path,note.path);
 await assert.rejects(next.scheduleAllocation(allocation,'14:00'),/cambiata/);
 await next.onunload();
});

test('migration adds each previous allocation once and preserves the existing daily block',async()=>{
 const {PluginClass,getSaved}=mockPlugin(false),p=new PluginClass();
 const date='2099-11-08',path='Daily/'+date+'.md';
 const original='# Sabato\n\n```TEMPVS\nStudio +16:00-17:00 -60m\n```\n';
 const file={path,basename:date,extension:'md',text:original};
 p.app.internalPlugins={getPluginById:()=>({instance:{options:{folder:'Daily'}}})};
 p.app.vault={
  getAbstractFileByPath:p=>p===path?file:null,
  read:async()=>file.text,
  process:async(_file,edit)=>{file.text=edit(file.text);}
 };
 await p.onload();
 file.text+='\n```tempvs-assegnazioni\nStudio @25m [[Lettura]]\n```\n';
 await p.daily.migrateAllocationBlock(file);
 await p.daily.syncFile(file.path);
 assert.doesNotMatch(file.text,/tempvs-assegnazioni/);
 assert.match(file.text,/- \[\[Lettura\]\] @25m @Studio/);
 assert.equal(p.allocatedOn(date).length,1);
 assert.equal(getSaved().allocations,undefined);
 await p.onunload();
});

test('e-ink uses one boundary alarm and no hidden countdown, retains focus and restores the device preference',async()=>{
 const {PluginClass,intervals,notices,context}=mockPlugin(true);
 const p=new PluginClass();await p.onload();
 const origin=new Date(2026,10,28,10).getTime();
 let now=origin;
 context.Date=class extends Date{
   constructor(...args){super(...(args.length?args:[now]));}
   static now(){return now;}
 };
 let alarm;
 context.window.setTimeout=(callback,delay)=>{alarm={callback,delay};return 1;};
 context.window.clearTimeout=()=>{alarm=null;};
 p.chimeEnabled=false;p.lastTick=now;p.setEink(true);
 assert.equal(intervals.size,0);
 const start=origin+60000,end=start+1800000;
 p.state.sessions=[{id:'eink-test',title:'Studio',area:'Studio',date:'2026-11-28',start:'10:01',end:'10:31',workMinutes:25,breakEnabled:true,
   timerStartedAt:new Date(start).toISOString(),timerEndsAt:new Date(end).toISOString()}];
 p.refresh();
 assert.equal(alarm.delay,60000);
 now=start;alarm.callback();
 assert.match(notices.at(-1),/Inizia la sessione/);
 assert.equal(alarm.delay,1500000);
 const view={timerVisible:true,containerEl:{getClientRects:()=>[{}]},update(){}};
 p.app.workspace.getLeavesOfType=()=>[{view}];p.updateClock();
 assert.equal(intervals.size,1);
 view.timerVisible=false;p.updateClock();
 assert.equal(intervals.size,0);
 now=start+1500000;alarm.callback();
 assert.match(notices.at(-1),/Inizia la pausa/);
 assert.equal(p.state.sessions[0].actualSeconds,1500);
 assert.equal(alarm.delay,300000);
 now=end;alarm.callback();
 assert.equal(alarm,null);assert.equal(intervals.size,0);
 await p.onunload();
 const next=new PluginClass();await next.onload();
 assert.equal(next.eink,true);assert.equal(intervals.size,0);
 next.setEink(false);assert.equal(intervals.size,1);
 await next.onunload();assert.equal(intervals.size,0);
});
