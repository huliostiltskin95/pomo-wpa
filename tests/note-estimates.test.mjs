import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as estimates from '../core/tempo-estimates.js';
import * as core from '../core/tempo-core.js';
import * as simple from '../core/tempo-simple.js';
import * as dailyPlan from '../obsidian/daily-plan.js';
import {mergeSnapshots} from '../core/tempo-merge.js';
const {parseEstimate,estimateProgress,recordNoteWork,remainingFocus}=estimates;
const source='@Studio 20 -30m\n@Studio 10 -60m';
const state=()=>simple.normalizeArchive({sessions:[]});
const note=s=>({id:'note-1',title:'Platone',path:'zettel/Platone.md',vault:'Test',entries:parseEstimate(source,s.defaults.simple.areas),completed:false});
const session=(s,start='15:00',end='16:00')=>({id:'session-1',title:'Studio',area:'Studio',areaId:s.defaults.simple.areas.find(a=>a.name==='Studio').id,date:'2099-11-15',start,end,workMinutes:50,cycleMinutes:60,breakEnabled:true,actualSeconds:0});
test('example adds both rows: 30 sessions, 20 gross hours, 16h40 focus, exact 5:1',()=>{
 const s=state(),n=note(s),p=estimateProgress(n,s);
 assert.equal(n.entries.reduce((v,e)=>v+e.count,0),30);assert.equal(p.estimated,60000);assert.equal(p.remaining*6/5,72000);assert.equal(p.percent,0);
 assert.equal(parseEstimate('@Studio 2 -45m',s.defaults.simple.areas)[0].minutes*50,2250);
 for(const bad of ['@Studio 20 -60m -30m','@Studio -1 -30m','@Studio 0 -30m','@Missing 1 -30m','@Studio 2 -1.5m',source+'\ninvalid'])assert.throws(()=>parseEstimate(bad,s.defaults.simple.areas));
});
test('only measured work assigned to this note counts, switching never reallocates past work',()=>{
 const s=state(),n=note(s),a=session(s);s.sessions.push(a);
 recordNoteWork(a,100);assert.equal(estimateProgress(n,s).done,0);
 a.noteEstimateId=n.id;recordNoteWork(a,120);a.noteEstimateId='other';recordNoteWork(a,60);
 assert.equal(estimateProgress(n,s).done,120);assert.equal(estimateProgress(n,s).remaining,59880);
 s.history=[{sessionId:a.id,areaId:a.areaId,area:a.area,measured:true,minutes:2,noteWork:{[n.id]:120}}];
 assert.equal(estimateProgress(n,s).done,120);s.sessions=[];assert.equal(estimateProgress(n,s).done,120);
 assert.equal(simple.normalizeArchive(s).history[0].noteWork[n.id],120);
});
test('day forecast excludes past, finished and unrelated areas; planned work is not done',()=>{
 const s=state(),n=note(s),a=session(s);a.noteEstimateId=n.id;s.sessions=[a];
 let p=estimateProgress(n,s,{day:a.date,now:new Date('2099-11-15T15:25:00')});
 assert.equal(p.done,0);assert.equal(p.planned,25*60);assert.equal(p.afterDay,60000-25*60);
 assert.equal(remainingFocus(a,new Date('2099-11-15T15:55:00')),0);
 a.finished=true;assert.equal(estimateProgress(n,s,{day:a.date,now:new Date('2099-11-15T14:00:00')}).planned,0);
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
 await p.estimates.assignDay(n,'2099-11-15');assert.equal(p.state.sessions[0].noteEstimateId,n.id);assert.equal(p.state.sessions[1].noteEstimateId,'other-note');
 recordNoteWork(p.state.sessions[0],60);
 await p.estimates.rename({path:'zettel/Platone nuovo.md'},f.file.path);n=p.estimates.notes[0];assert.equal(n.path,'zettel/Platone nuovo.md');assert.equal(estimateProgress(n,p.state).done,60);
 p.daily.destroy();
});
