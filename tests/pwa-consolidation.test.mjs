import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchive,parseQuick,planSessions} from '../core/tempo-simple.js';
import {sessionBounds,getPhase} from '../core/tempo-core.js';
import {createArea,renameArea,reorderArea,moveAreaRecords,deleteArea} from '../core/tempo-areas.js';
import {mergeSnapshots} from '../core/tempo-merge.js';
const s={id:'s1',title:'Studio',area:'Studio',date:'2099-11-06',start:'14:00',end:'14:45',workMinutes:25,breakEnabled:true,actualSeconds:60};
const fixture=()=>normalizeArchive({sessions:[s],tasks:[{id:'t1',title:'Una task',area:'Studio',status:'todo',description:'**Nota**'}],history:[{sessionId:'s1',title:'Studio',area:'Studio',minutes:1,measured:true}]});
const areas=[{name:'Studio approfondito'},{name:'Lavoro'},{name:'Personale'}];
const defaults={workMinutes:25,breakEnabled:true};
const plan=(requests,existing=[])=>planSessions(requests,[],existing,defaults,new Date('2099-11-01'),(()=>{let i=0;return ()=>String(++i);})(),'2099-11-06');
test('range grammar supports hours, comma decimals, whitespace and several instructions',()=>{
 const requests=parseQuick('  Studio   approfondito  + 14:00 - 17:00  - 1,5 h\nLavoro +09:00-12:00 -45m\nPersonale +21:00-00:00 -1h',areas);
 assert.deepEqual(requests.map(r=>r.minutes),[90,90,45,45,45,45,60,60,60]);
 const result=plan(requests);assert.equal(result.sessions.length,9);
 assert(result.sessions.every(s=>sessionBounds(s).end>sessionBounds(s).start));
});
test('range grammar rejects malformed and fractional-minute input with line context',()=>{
 for(const line of ['Lavoro +14:00-15:00 -1,333h','Lavoro +14:00-15:00 -1.5m','Lavoro +14:00-15:00 -0m','Lavoro +14:00-15:00 -2h','Lavoro +24:00-15:00 -30m','Lavoro +14:00-14:00 -30m','Lavoro +14:00-15:00 -30m @1h'])
 assert.throws(()=>parseQuick('Lavoro +09:00-10:00 -1h\n'+line,areas),/Riga 2:/,line);
 assert.equal(parseQuick('Lavoro +09:00-12:00 -1.1h',areas)[0].minutes,66);
});
test('full overnight sessions leave the tail free and reject overlapping batches',()=>{
 const requests=parseQuick('Personale +23:50-01:00 -30m',areas),result=plan(requests);
 assert.equal(result.unusedMinutes,10);assert.equal(result.sessions.length,2);
 assert.deepEqual(result.sessions.map(s=>[s.date,s.start,s.end]),[['2099-11-06','23:50','00:20'],['2099-11-07','00:20','00:50']]);
 assert.throws(()=>plan([...requests,...parseQuick('Lavoro +23:00-00:00 -30m',areas)]),/sovrappongono/);
 assert.throws(()=>plan(requests,[{...s,start:'23:55',end:'00:05'}]),/sovrappongono/);
});
test('automatic and custom pauses remain within each gross session',()=>{
 const result=plan(parseQuick('Lavoro +09:00-10:00 -30m',areas));
 for(const session of result.sessions){
 const b=sessionBounds(session);let work=0,rest=0;
 for(let t=+b.start;t<+b.end;t+=60000)getPhase(session,new Date(t)).kind==='work'?work++:rest++;
 assert.deepEqual([work,rest],[25,5]);
 }
 const {sessions:[custom]}=plan([{area:'Lavoro',minutes:45,start:'11:00',customBreakMinutes:5}]);
 assert.equal(custom.end,'11:45');assert.equal(getPhase(custom,new Date('2099-11-06T11:40:00')).kind,'break');
});
test('legacy migration adds deterministic area IDs without changing task status or source data',()=>{
 const raw={sessions:[structuredClone(s)],tasks:[{id:'t',area:'Studio',status:'todo'}]};
 const before=JSON.stringify(raw),one=normalizeArchive(raw),two=normalizeArchive(raw);
 assert.equal(JSON.stringify(raw),before);assert.deepEqual(one,two);
 assert.deepEqual(normalizeArchive(one),one);
 assert.equal(one.sessions[0].areaId,one.tasks[0].areaId);assert.equal(one.tasks[0].status,'todo');
});
test('area create, rename, reorder and selective move preserve identities and Markdown',()=>{
 const state=fixture(),id=state.sessions[0].areaId;
 createArea(state,{id:'new',name:'Ricerca',description:'[Obsidian](obsidian://open?vault=V)'});
 renameArea(state,id,'Università');
 assert.equal(state.sessions[0].areaId,id);assert.equal(state.history[0].area,'Università');assert.equal(state.tasks[0].area,'Università');assert.equal(state.tasks[0].title,'Una task');assert.equal(state.tasks[0].status,'todo');
 reorderArea(state,'new',-1);assert.equal(state.defaults.simple.areas.at(-2).id,'new');
 moveAreaRecords(state,id,'new',{collections:['tasks'],ids:['t1']});
 assert.equal(state.tasks[0].areaId,'new');assert.equal(state.sessions[0].areaId,id);
 assert.equal(normalizeArchive(state).defaults.simple.areas.find(a=>a.id==='new').description,'[Obsidian](obsidian://open?vault=V)');
 assert.throws(()=>renameArea(state,'new','università'));
 createArea(state,{id:'spaced',name:'Studio avanzato'});assert.throws(()=>createArea(state,{id:'ambiguous',name:'Studio   avanzato'}));
});
test('area deletion requires a choice and transfers all records to the destination',()=>{
 const state=fixture(),id=state.sessions[0].areaId,to=state.defaults.simple.areas.find(a=>a.name==='Lavoro');
 assert.throws(()=>deleteArea(state,id));
 deleteArea(state,id,{transferTo:to.id});
 assert([state.sessions[0],state.tasks[0],state.history[0]].every(item=>item.areaId===to.id));
 assert.equal(state.sessions[0].actualSeconds,60);assert.equal(state.history[0].minutes,1);
 assert(!normalizeArchive(state).defaults.simple.areas.some(a=>a.id===id));
});
test('destructive area deletion propagates session, task and measured history tombstones',()=>{
 const base=fixture(),local=structuredClone(base),id=local.sessions[0].areaId;
 deleteArea(local,id,{deleteRecords:true});
 const result=mergeSnapshots(base,local,base);
 assert.equal(result.conflicts.length,0);
 assert.deepEqual(result.merged.sessions,[]);assert.deepEqual(result.merged.tasks,[]);assert.deepEqual(result.merged.history,[]);
 const old=mergeSnapshots(null,result.merged,base);
 assert.equal(old.merged.history.length,0);assert.equal(old.merged.sessions.length,0);assert.equal(old.merged.tasks.length,0);
 assert.deepEqual(result.merged.syncDeleted.history,['s1']);
});
test('remote archives reject corrupt tasks, duplicate areas/history and invalid references',()=>{
 const invalid=[{tasks:{}},{tasks:[{id:'t'},{id:'t'}]},{history:[{sessionId:'s',minutes:1},{sessionId:'s',minutes:2}]},{syncDeleted:{history:'s'}}];
 for(const patch of invalid)assert.throws(()=>normalizeArchive({sessions:[],...patch}));
 const state=fixture();state.defaults.simple.areas[1].id=state.defaults.simple.areas[0].id;assert.throws(()=>normalizeArchive(state));
 const orphan=fixture();orphan.sessions[0].areaId='missing';orphan.sessions[0].area='Non esiste';assert.throws(()=>normalizeArchive(orphan),/area mancante/);
});
test('area deletion concurrent with a remote session addition asks an explicit choice',()=>{
 const base=fixture(),local=structuredClone(base),remote=structuredClone(base),areaId=base.sessions[0].areaId;
 deleteArea(local,areaId,{transferTo:local.defaults.simple.areas.find(a=>a.name==='Lavoro').id});
 remote.sessions.push({...remote.sessions[0],id:'new',start:'16:00',end:'16:45'});
 const original=JSON.stringify({base,local,remote});
 const pending=mergeSnapshots(base,local,remote);
 const conflict=pending.conflicts.find(c=>c.key==='areas:'+areaId+':exists');assert(conflict);
 const restored=mergeSnapshots(base,local,remote,{[conflict.key]:'restore'});
 assert.equal(restored.conflicts.length,0);assert.equal(normalizeArchive(restored.merged).sessions.length,2);
 const removed=mergeSnapshots(base,local,remote,{[conflict.key]:'delete'});
 assert.equal(removed.conflicts.length,0);assert.equal(normalizeArchive(removed.merged).sessions.length,1);assert(removed.merged.syncDeleted.sessions.includes('new'));
 assert.equal(JSON.stringify({base,local,remote}),original);
});
test('area data deletion clears cross-area task/session links without completing retained tasks',()=>{
 const state=fixture(),deletedId=state.sessions[0].areaId,retainedArea=state.defaults.simple.areas.find(a=>a.name==='Lavoro');
 state.sessions.push({...s,id:'retained',areaId:retainedArea.id,area:retainedArea.name,start:'16:00',end:'16:45',taskId:'t1',taskIds:['t1'],taskAllocations:{t1:30},pomodoroTaskIds:['t1']});
 state.tasks.push({id:'retained-task',title:'Da svolgere',areaId:retainedArea.id,area:retainedArea.name,autoSessionId:'s1',status:'todo'});
 deleteArea(state,deletedId,{deleteRecords:true});
 assert.equal(state.sessions[0].taskId,'');assert.deepEqual(state.sessions[0].taskIds,[]);assert.deepEqual(state.sessions[0].taskAllocations,{});assert.deepEqual(state.sessions[0].pomodoroTaskIds,[null]);
 assert.equal(state.tasks[0].autoSessionId,'');assert.equal(state.tasks[0].status,'todo');
});
