import {isEstimateSource} from '../core/tempo-estimates.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as movedLinks from '../obsidian/moved-links.js';
import vm from 'node:vm';
import * as dailyPlan from '../obsidian/daily-plan.js';
import {normalizeArchive} from '../core/tempo-simple.js';
import {prepareDailyPlan,applyDailyPlan,serializeDailyPlan,parseDailySource,findDailyBlocks} from '../obsidian/daily-plan.js';
const day='2099-11-15', now=new Date('2099-11-15T09:00:00');
const initial='Studio +14:00-16:00 -60m\nPersonale +16:00-17:00 -60m\nStudio +18:00-20:00 -60m';
const revised='Studio +14:00-16:00 -60m\nStudio +21:00-23:00 -60m';
const state=()=>normalizeArchive({sessions:[],history:[],defaults:{}});
function apply(s,source){const p=prepareDailyPlan({state:s,source,date:day,blockId:'daily',now});applyDailyPlan(s,p);return p;}
test('requested ranges create five sessions, edits remove three and add two without duplicates',()=>{
 const s=state();apply(s,initial);assert.equal(s.sessions.length,5);const ids=s.sessions.slice(0,2).map(x=>x.id);
 assert.equal(serializeDailyPlan(s.sessions,day),initial);
 const p=apply(s,revised);assert.equal(p.removeIds.length,3);assert.equal(s.sessions.length,4);assert.deepEqual(s.sessions.slice(0,2).map(x=>x.id),ids);
 apply(s,revised);assert.equal(s.sessions.length,4);assert.equal(serializeDailyPlan(s.sessions,day),revised);
});
test('invalid and overlapping input leaves the archive unchanged',()=>{
 const s=state();apply(s,initial);const before=JSON.stringify(s);
 for(const source of ['Studio +14:00-',initial+'\nStudio +14:00-15:00 -60m'])assert.throws(()=>apply(s,source));
 assert.equal(JSON.stringify(s),before);
});
test('midnight round trip restores exact ratio for future sessions',()=>{
 const s=state();apply(s,'Studio +23:00-02:00 -60m');s.sessions[0].customBreakMinutes=5;
 const source=serializeDailyPlan(s.sessions,day);assert.equal(parseDailySource(source,s.defaults.simple.areas).length,3);
 apply(s,source);assert.equal(s.sessions[0].customBreakMinutes,undefined);assert.equal(s.sessions[0].workMinutes,50);
});
test('removing completed rows preserves the archive and accepts the new plan',()=>{
 const s=state();apply(s,initial);s.sessions[0].finished=true;const id=s.sessions[0].id;const p=apply(s,'Studio +21:00-22:00 -60m');assert(p.retainedIds.includes(id));assert(s.sessions.some(x=>x.id===id));assert(!s.syncDeleted.sessions.includes(id));
});
// Exercise the controller source independently of whether a bundle was built first.
const code=fs.readFileSync(new URL('../obsidian/daily-blocks.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const context={...movedLinks,...dailyPlan,normalizeArchive,isEstimateSource,MarkdownRenderChild:class{},Notice:class{},moment:()=>({isValid:()=>false}),module:{exports:{}},console,setTimeout,clearTimeout,crypto:globalThis.crypto};
vm.createContext(context);vm.runInContext(code+'\nmodule.exports.DailyBlocks=DailyBlocks;',context);
function fixture(date=day){
 let text='# Daily\n\n```TEMPVS\n'+initial+'\n```\n\nOther text';
 const file={path:date+'.md',basename:date,extension:'md'};
 const plugin={state:state(),dailyNotes:{},app:{vault:{getAbstractFileByPath:()=>file,read:async()=>text,process:async(f,fn)=>{text=fn(text);}},workspace:{getLeavesOfType:()=>[]}},persist:async()=>{},change:async fn=>fn()};
 const daily=new context.module.exports.DailyBlocks(plugin);
 return {plugin,daily,file,get text(){return text;},set text(v){text=v;}};
}
test('automatic note import, replacement, plugin writeback, and unrelated text preservation',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);assert.equal(f.plugin.state.sessions.length,5);assert.match(f.text,/Other text$/);assert.doesNotMatch(f.text,/tempvs-block|tempvs-session|date:/);
 f.text=f.text.replace(initial,revised);await f.daily.syncFile(f.file.path);assert.equal(f.plugin.state.sessions.length,4);
 const s=f.plugin.state.sessions.find(s=>s.start==='21:00');s.start='20:00';s.end='21:00';
 await f.daily.archiveChanged();assert.match(f.text,/Studio \+20:00-21:00 -60m/);assert.match(f.text,/Other text$/);
 await f.daily.syncFile(f.file.path);assert.equal(f.plugin.state.sessions.length,4);f.daily.destroy();
});
test('pending and invalid edits are not overwritten by archive changes',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);f.text=f.text.replace(initial,'Studio +');const pending=f.text;
 await f.daily.archiveChanged();assert.equal(f.text,pending);await assert.rejects(f.daily.syncFile(f.file.path));assert.equal(f.plugin.state.sessions.length,5);f.daily.destroy();
});
test('unsaved editor buffer prevents writeback; multiple blocks are rejected',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);const saved=f.text;
 f.plugin.app.workspace.getLeavesOfType=()=>[{view:{file:f.file,editor:{getValue:()=>saved+'editing'}}}];
 f.plugin.state.sessions.pop();await f.daily.archiveChanged();assert.equal(f.text,saved);
 f.plugin.app.workspace.getLeavesOfType=()=>[];
 f.text+='\n```TEMPVS\n\n```';await assert.rejects(f.daily.syncFile(f.file.path));f.daily.destroy();
});
test('old metadata migrates to simple text without changing session ids',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);const ids=f.plugin.state.sessions.map(s=>s.id),id=Object.keys(f.plugin.dailyNotes)[0];
 const legacy='<!-- tempvs-block:'+id+' -->\ndate: '+day+'\n'+f.plugin.state.sessions.map(s=>`${s.area} +${s.start}-${s.end} -60m <!-- tempvs-session:${s.id} -->`).join('\n');
 f.text=f.text.replace(initial,legacy);await f.daily.syncFile(f.file.path);assert.doesNotMatch(f.text,/tempvs-session|tempvs-block/);assert.deepEqual(f.plugin.state.sessions.map(s=>s.id),ids);f.daily.destroy();
});
test('sessions added from the panel can subsequently be removed from the note',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);
 const newPlan=prepareDailyPlan({state:f.plugin.state,source:'Lavoro +21:00-22:00 -60m',date:day,blockId:'new',now});
 const added=newPlan.sessions[0];delete added.noteBlockId;f.plugin.state.sessions.push(added);
 await f.daily.archiveChanged();assert.match(f.text,/Lavoro \+21:00-22:00/);
 assert.equal(added.noteBlockId,Object.keys(f.plugin.dailyNotes)[0]);
 f.text=f.text.replace('\nLavoro +21:00-22:00 -60m','');await f.daily.syncFile(f.file.path);
 assert(!f.plugin.state.sessions.some(s=>s.id===added.id));assert(f.plugin.state.syncDeleted.sessions.includes(added.id));f.daily.destroy();
});
test('completed morning row no longer blocks afternoon import or returns on panel writeback',async()=>{
 const f=fixture();f.text=f.text.replace(initial,'Studio +10:00-12:00 -120m');await f.daily.syncFile(f.file.path);
 const morning=f.plugin.state.sessions[0];morning.finished=true;morning.actualSeconds=7.591;
 f.text=f.text.replace('Studio +10:00-12:00 -120m','Studio +14:30-16:30 -60m');await f.daily.syncFile(f.file.path);
 assert.equal(f.plugin.state.sessions.length,3);assert.equal(morning.finished,true);
 assert.deepEqual(Array.from(f.plugin.state.sessions.filter(s=>!s.finished),s=>s.start),['14:30','15:30']);
 await f.daily.archiveChanged();assert(!f.text.includes('+10:00-12:00'));assert(!f.plugin.state.syncDeleted.sessions.includes(morning.id));f.daily.destroy();
});
test('editor-change imports complete unsaved text and updates the active daily panel',async()=>{
 const f=fixture();const saved=f.text;let buffer=saved.replace(initial,revised),updates=0;
 const view={file:f.file,editor:{getValue:()=>buffer}},panel={day:'2099-11-14',update:()=>updates++},events={};
 f.plugin.app.workspace.getActiveFile=()=>f.file;
 f.plugin.app.workspace.getLeavesOfType=type=>type==='markdown'?[{view}]:[{view:panel}];
 f.plugin.app.workspace.on=(name,handler)=>{events[name]=handler;return {};};
 f.plugin.registerEvent=()=>{};f.plugin.registerMarkdownCodeBlockProcessor=()=>{};f.plugin.addCommand=()=>{};
 f.daily.start();events['editor-change'](view.editor,view);
 await new Promise(resolve=>setTimeout(resolve,450));await f.daily.chain;
 assert.equal(f.plugin.state.sessions.length,4);assert.equal(panel.day,day);assert(updates>0);assert.equal(f.text,saved);
 buffer=buffer.replace(revised,'Studio +');events['editor-change'](view.editor,view);
 await new Promise(resolve=>setTimeout(resolve,450));await f.daily.chain.catch(()=>{});
 assert.equal(f.plugin.state.sessions.length,4);assert(f.daily.errors.get(f.file.path));f.daily.destroy();
});
test('TEMPUS spelling is accepted alongside TEMPVS',()=>{
 assert.equal(findDailyBlocks('```tempus\n'+initial+'\n```').length,1);
});

test('unchanged pre-upgrade daily binding is recalculated once on reload',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);
 const key=Object.keys(f.plugin.dailyNotes)[0];delete f.plugin.dailyNotes[key].ratioVersion;
 const ids=f.plugin.state.sessions.map(s=>s.id);
 for(const s of f.plugin.state.sessions){delete s.cycleMinutes;s.workMinutes=25;s.breakEnabled=false;}
 await f.daily.syncFile(f.file.path);
 assert(f.plugin.state.sessions.every(s=>s.workMinutes===50&&s.cycleMinutes===60&&s.breakEnabled));
 assert.deepEqual(f.plugin.state.sessions.map(s=>s.id),ids);assert.equal(f.plugin.dailyNotes[key].ratioVersion,1);
 f.daily.destroy();
});

test('historical automatic edits record corrected actual time and never restore superseded credits',async()=>{
 const f=fixture('2020-11-15');f.text=f.text.replace(initial,'Studio +10:00-12:00 -30m');await f.daily.syncFile(f.file.path);
 const ids=f.plugin.state.sessions.map(s=>s.id);assert.equal(f.plugin.state.sessions.reduce((n,s)=>n+s.actualSeconds,0),6000);
 f.text=f.text.replace('Studio +10:00-12:00 -30m','Studio +10:15-11:15 -30m');await f.daily.syncFile(f.file.path);
 assert.equal(f.plugin.state.sessions.reduce((n,s)=>n+s.actualSeconds,0),3000);assert.equal(f.plugin.state.sessions.find(s=>s.start==='10:15').id,ids[0]);
 await f.daily.archiveChanged();assert(!f.text.includes('+11:00-12:00'));await f.daily.syncFile(f.file.path);
 assert.equal(f.plugin.state.sessions.reduce((n,s)=>n+s.actualSeconds,0),3000);assert.equal(f.plugin.state.sessions.length,4);f.daily.destroy();
});
test('pre-upgrade unchanged source reconciles stale overlapping reservations on initialization',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);const id=Object.keys(f.plugin.dailyNotes)[0];
 delete f.plugin.dailyNotes[id].agendaVersion;
 f.plugin.state.sessions.push({id:'stale',date:day,start:'14:30',end:'15:30',title:'Studio',area:'Studio',workMinutes:25,breakEnabled:true,actualSeconds:0});
 f.plugin.app.vault.getMarkdownFiles=()=>[f.file];
 const original=f.text;await f.daily.initialize();assert.equal(f.text,original);assert.equal(f.plugin.state.sessions.length,5);assert(f.plugin.state.syncDeleted.sessions.includes('stale'));assert.equal(f.plugin.dailyNotes[id].agendaVersion,2);f.daily.destroy();
});
test('remote archive reconciliation follows unchanged note instead of writing stale remote slots into it',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);const original=f.text;
 f.plugin.state.sessions.push({id:'remote',date:day,start:'14:30',end:'15:30',title:'Studio',area:'Studio',workMinutes:25,breakEnabled:true,actualSeconds:0});
 await f.daily.reconcilePlans();assert.equal(f.text,original);assert.equal(f.plugin.state.sessions.length,5);assert(f.plugin.state.syncDeleted.sessions.includes('remote'));f.daily.destroy();
});
test('an already synchronized open note still selects its day in the plugin panel',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);const panel={day:'2099-11-14',update(){}};
 f.plugin.app.workspace.getActiveFile=()=>f.file;f.plugin.app.workspace.getLeavesOfType=type=>type==='tempvs-timer'?[{view:panel}]:[];
 await f.daily.syncFile(f.file.path);assert.equal(panel.day,day);f.daily.destroy();
});
test('panel note editing writes one session back to daily text without losing its neighbors',async()=>{
 const f=fixture();await f.daily.syncFile(f.file.path);
 const id=Object.keys(f.plugin.dailyNotes)[0],session=f.plugin.state.sessions[0],originalIds=f.plugin.state.sessions.map(s=>s.id);
 await f.daily.updateSessionNotes(id,new Map([[session.id,[{path:'Studio/Nota#Sezione',label:'Lettura'}]]]));
 assert(f.text.includes('[[Studio/Nota#Sezione|Lettura]]'));
 assert.deepEqual(f.plugin.state.sessions.map(s=>s.id),originalIds);
 assert.equal(f.plugin.state.sessions[0].linkedNotes[0].path,'Studio/Nota#Sezione');
 assert.deepEqual(f.plugin.state.sessions[1].linkedNotes,[]);
 await f.daily.updateSessionNotes(id,new Map([[session.id,[]]]));
 assert(!f.text.includes('[[Studio/Nota'));
 f.text=f.text.replace('Studio +14:00','Studio +14:');
 await assert.rejects(f.daily.updateSessionNotes(id,new Map([[session.id,[]]])),/sta cambiando/);
 f.daily.destroy();
});
