import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {updatedSessionNotes} from '../obsidian/session-notes.js';
import * as estimates from '../core/tempo-estimates.js';
import * as core from '../core/tempo-core.js';
import * as simple from '../core/tempo-simple.js';
import * as dailyPlan from '../obsidian/daily-plan.js';
import {mergeSnapshots} from '../core/tempo-merge.js';
const {parseEstimate,estimateProgress,recordNoteWork,setEstimateCompleted}=estimates;
const source='@Studio 20 -30m\n@Studio 10 -60m';
const state=()=>simple.normalizeArchive({sessions:[]});
const note=s=>({id:'note-1',title:'Platone',path:'zettel/Platone.md',vault:'Test',entries:parseEstimate(source,s.defaults.simple.areas),completed:false});
const session=(s,start='15:00',end='16:00')=>({id:'session-1',title:'Studio',area:'Studio',areaId:s.defaults.simple.areas.find(a=>a.name==='Studio').id,date:'2099-11-15',start,end,workMinutes:50,cycleMinutes:60,breakEnabled:true,actualSeconds:0});
test('example adds both rows: 30 legacy sessions give a 20-hour target',()=>{
 const s=state(),n=note(s),p=estimateProgress(n,s);
 assert.equal(n.entries.reduce((v,e)=>v+e.count,0),30);assert.equal(p.estimated,72000);assert.equal(p.remaining,72000);assert.equal(p.percent,0);
 assert.equal(parseEstimate('@Studio 2 -45m',s.defaults.simple.areas)[0].minutes*50,2250);
 for(const bad of ['@Studio 20 -60m -30m','@Studio -1 -30m','@Studio 0 -30m','@Missing 1 -30m','@Studio 2 -1.5m',source+'\ninvalid'])assert.throws(()=>parseEstimate(bad,s.defaults.simple.areas));
});
test('only measured work assigned to this note counts, switching never reallocates past work',()=>{
 const s=state(),n=note(s),a=session(s);s.sessions.push(a);
 recordNoteWork(a,100);assert.equal(estimateProgress(n,s).done,0);
 a.noteEstimateId=n.id;recordNoteWork(a,120);a.noteEstimateId='other';recordNoteWork(a,60);
 assert.equal(estimateProgress(n,s).done,120);assert.equal(estimateProgress(n,s).remaining,71880);
 s.history=[{sessionId:a.id,areaId:a.areaId,area:a.area,measured:true,minutes:2,noteWork:{[n.id]:120}}];
 assert.equal(estimateProgress(n,s).done,120);s.sessions=[];assert.equal(estimateProgress(n,s).done,120);
 assert.equal(simple.normalizeArchive(s).history[0].noteWork[n.id],120);
});
test('area budget counts only recorded seconds in matching primary sessions and freezes the final variance',()=>{
 const s=state(),n=note(s);n.entries=parseEstimate('@Studio 10h',s.defaults.simple.areas);
 const a=session(s);a.linkedNotes=[{path:n.path}];s.sessions=[a];
 assert.equal(estimateProgress(n,s).remaining,36000);
 a.actualSeconds=9000;
 s.sessions.push({...a,id:'work',area:'Lavoro',areaId:'other'}, {...a,id:'resource',linkedNotes:[{path:'Other'},...a.linkedNotes]});
 assert.equal(estimateProgress(n,s).done,9000);
 setEstimateCompleted(n,s,true);
 a.actualSeconds=40000;n.entries=parseEstimate('@Studio 12h',s.defaults.simple.areas);
 assert.equal(estimateProgress(n,s).difference,-27000);
 setEstimateCompleted(n,s,false);
 n.entries=parseEstimate('@Studio 10h',s.defaults.simple.areas);
 setEstimateCompleted(n,s,true);
 assert.equal(estimateProgress(n,s).difference,4000);
 s.defaults.simple.noteEstimates={[n.id]:n};
 assert.deepEqual(simple.normalizeArchive(JSON.parse(JSON.stringify(s))).defaults.simple.noteEstimates[n.id].completion,{estimated:36000,done:40000});
});
test('backup and cloud merge preserve estimates, note bindings and measured ledger',()=>{
 const base=state(),local=structuredClone(base),n=note(local);local.defaults.simple.noteEstimates={[n.id]:n};local.sessions=[{...session(local),noteEstimateId:n.id,noteWork:{[n.id]:30},actualSeconds:30}];
 const result=mergeSnapshots(base,local,base);assert.equal(result.conflicts.length,0);
 const restored=simple.normalizeArchive(JSON.parse(JSON.stringify(result.merged)));assert.equal(estimateProgress(restored.defaults.simple.noteEstimates[n.id],restored).done,30);
});
function fixture(){
 const plugin={state:state(),dailyNotes:{},app:{vault:{getName:()=> 'Test'},workspace:{getLeavesOfType:()=>[]}},refresh(){},persist:async()=>{}};
 Object.defineProperty(plugin,'config',{get:()=>plugin.state.defaults.simple});
 let markdown='```TEMPVS\n'+source+'\n```';let file={path:'zettel/Platone.md',basename:'Platone',extension:'md'};
 Object.assign(plugin.app.vault,{getAbstractFileByPath:p=>p===file.path?file:null,read:async()=>markdown});
 const context={...estimates,...core,...simple,...dailyPlan,Notice:class{},MarkdownRenderChild:class{},moment:()=>({isValid:()=>false}),module:{exports:{}},console,setTimeout,clearTimeout,crypto:globalThis.crypto};
 vm.createContext(context);
 for(const [path,name] of [['note-estimates.js','NoteEstimates'],['daily-blocks.js','DailyBlocks']]){
  const code=fs.readFileSync(new URL('../obsidian/'+path,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
  // Separate lexical scopes for each source module.
  vm.runInContext('{'+code+'\nmodule.exports.'+name+'='+name+';}',context);
 }
 plugin.estimates=new context.module.exports.NoteEstimates(plugin);plugin.daily=new context.module.exports.DailyBlocks(plugin);
 plugin.change=async fn=>{fn();plugin.state=simple.normalizeArchive(plugin.state);await plugin.daily.archiveChanged();};
 plugin.setSessionNote=async(ids,input)=>plugin.change(()=>{for(const id of ids){const s=plugin.state.sessions.find(s=>s.id===id);s.linkedNotes=updatedSessionNotes(s,input);delete s.noteEstimateId;}});
 return {plugin,file,set text(value){markdown=value;}};
}
test('ordinary note imports without daily date, updates without duplicates and avoids queue deadlock',{timeout:2000},async()=>{
 const f=fixture(),p=f.plugin;await p.daily.syncFile(f.file.path);
 assert.equal(p.state.sessions.length,0);assert.equal(p.estimates.notes.length,1);const id=p.estimates.notes[0].id;
 await p.daily.syncFile(f.file.path);assert.equal(p.estimates.notes[0].id,id);
 f.text='```TEMPVS\n@Studio 2 -60m\n```';await p.daily.syncFile(f.file.path);assert.equal(p.estimates.notes[0].entries[0].count,2);
 f.text='```TEMPVS\n@Studio bad\n```';await assert.rejects(p.daily.syncFile(f.file.path));assert.equal(p.estimates.notes[0].entries[0].count,2);
 f.text='Nota senza blocco';await p.daily.syncFile(f.file.path);assert.equal(p.estimates.notes[0].archived,true);
 f.text='```tempus\n'+source+'\n```';await p.daily.syncFile(f.file.path);assert.equal(p.estimates.notes[0].id,id);assert.equal(p.estimates.notes[0].archived,false);
 p.daily.destroy();
});
test('assignment respects area and occupied assignments, rename retains identity and progress',async()=>{
 const f=fixture(),p=f.plugin;await p.daily.syncFile(f.file.path);let n=p.estimates.notes[0];
 p.state.sessions=[session(p.state),{...session(p.state,'16:00','17:00'),id:'other-session',noteEstimateId:'other-note'}];
 await p.estimates.assignDay(n,'2099-11-15');assert.equal(p.state.sessions[0].linkedNotes[0].path,n.path);assert.equal(p.state.sessions[0].noteEstimateId,undefined);assert.equal(p.state.sessions[1].noteEstimateId,'other-note');
 p.state.sessions[0].noteWork={[n.id]:60};
 await p.estimates.rename({path:'zettel/Platone nuovo.md'},f.file.path);n=p.estimates.notes[0];assert.equal(n.path,'zettel/Platone nuovo.md');assert.equal(estimateProgress(n,p.state).done,60);
 p.daily.destroy();
});


test('a single @14h directive is the total gross budget of the file',()=>{
 const s=state(),entries=parseEstimate('@14h',s.defaults.simple.areas);
 assert.deepEqual(entries,[{kind:'total',grossMinutes:840}]);
 assert.deepEqual(parseEstimate('@1,5h',s.defaults.simple.areas),[{kind:'total',grossMinutes:90}]);
 assert.deepEqual(parseEstimate('@90m',s.defaults.simple.areas),[{kind:'total',grossMinutes:90}]);
 for(const bad of ['@0h','@0,1m','@14h\n@Studio 1 -30m','@14h\n@2h','@-14h'])
  assert.throws(()=>parseEstimate(bad,s.defaults.simple.areas));
 const n={...note(s),entries};s.defaults.simple.noteEstimates={[n.id]:n};
 assert.equal(simple.normalizeArchive(s).defaults.simple.noteEstimates[n.id].entries[0].grossMinutes,840);
 const p=estimateProgress(n,s);
 assert.equal(p.estimated,14*3600);
 assert.equal(p.done,0);assert.equal(p.remaining,14*3600);
});
test('only measured time in the primary linked note reduces its gross estimate',()=>{
 const s=state(),n={...note(s),entries:parseEstimate('@14h',s.defaults.simple.areas)};
 s.defaults.simple.noteEstimates={[n.id]:n};
 const a=session(s);a.linkedNotes=[{path:'Platone#Capitolo 1',label:'Lettura'},{path:'Risorsa',label:'Riferimento'}];
 s.sessions.push(a);
 let p=estimateProgress(n,s,{day:a.date,now:new Date('2099-11-15T14:00:00')});
 assert.equal(p.done,0);assert.equal(p.remaining,14*3600);
 a.actualSeconds=25*60;
 p=estimateProgress(n,s);
 assert.equal(p.done,25*60);
 a.actualSeconds=50*60;
 p=estimateProgress(n,s);
 assert.equal(p.done,50*60);assert.equal(p.remaining,14*3600-3000);
 assert.equal(Math.round(p.percent*100)/100,5.95);
 const other={...n,id:'other',path:'zettel/Risorsa.md'};
 s.defaults.simple.noteEstimates[other.id]=other;
 assert.equal(estimateProgress(other,s).done,0);
 a.linkedNotes=[{path:'Risorsa',label:'Riferimento'},{path:'Platone#Capitolo 1',label:'Lettura'}];
 assert.equal(estimateProgress(n,s).done,0);
 assert.equal(estimateProgress(other,s).done,3000);
});
test('partial and custom-pause sessions credit only their measured seconds',()=>{
 const s=state(),n={...note(s),entries:parseEstimate('@2h',s.defaults.simple.areas)};
 s.defaults.simple.noteEstimates={[n.id]:n};
 const a=session(s);a.customBreakMinutes=5;a.workMinutes=55;a.cycleMinutes=undefined;
 a.linkedNotes=[{path:'zettel/Platone.md',label:'Platone'}];a.actualSeconds=55*60;
 s.sessions.push(a);assert.equal(estimateProgress(n,s).done,55*60);
 a.actualSeconds=27.5*60;assert.equal(estimateProgress(n,s).done,27.5*60);
 a.actualSeconds=0;assert.equal(estimateProgress(n,s).done,0);
});
test('unallocated measured work and historical ledger cannot be counted twice',()=>{
 const s=state(),n={...note(s),entries:parseEstimate('@14h',s.defaults.simple.areas)};
 s.defaults.simple.noteEstimates={[n.id]:n};
 const a=session(s);a.linkedNotes=[{path:'Platone',label:'Platone'}];a.actualSeconds=3000;
 a.noteWork={[n.id]:600,other:1000};
 s.sessions.push(a);
 assert.equal(estimateProgress(n,s).done,2000);
 a.noteWork={[n.id]:3000};
 assert.equal(estimateProgress(n,s).done,3000);
 const conflict={...n,id:'note-duplicate',path:'archivio/Platone.md'};
 s.defaults.simple.noteEstimates[conflict.id]=conflict;
 delete a.noteWork;
 assert.equal(estimateProgress(n,s).done,0);
 a.linkedNotes=[{path:'zettel/Platone.md',label:'Platone'}];
 assert.equal(estimateProgress(n,s).done,3000);
});
test('gross note estimate is imported by ordinary-note controller and retains the same identity',async()=>{
 const f=fixture(),p=f.plugin;
 f.text='```TEMPVS\n@14h\n```';
 await p.daily.syncFile(f.file.path);
 const n=p.estimates.notes[0],id=n.id;
 assert.equal(n.entries[0].grossMinutes,840);
 assert.equal(estimateProgress(n,p.state).estimated,840*60);
 f.text='```TEMPVS\n@12h\n```';
 await p.daily.syncFile(f.file.path);
 assert.equal(p.estimates.notes[0].id,id);
 assert.equal(p.estimates.notes[0].entries[0].grossMinutes,720);
 p.daily.destroy();
});
