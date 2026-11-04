import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchive,parseQuick,planSessions,measuredFocus} from '../core/tempo-simple.js';
import {mergeSnapshots} from '../core/tempo-merge.js';
const defaults={workMinutes:25,breakEnabled:true};
const w=(date,start,end)=>({date,start,end});
let i=0;const id=()=>String(++i);
const now=new Date('2026-11-01T00:00:00');
const session={...w('2026-11-06','09:00','10:00'),...defaults,id:'old',title:'Studio'};
test('splits across days and subtracts existing sessions',()=>{const out=planSessions([{area:'Studio',minutes:150}],[w('2026-11-06','09:00','11:00'),w('2026-11-07','15:00','17:00')],[session],defaults,now,id);assert.equal(out.remainder,0);assert.deepEqual(out.sessions.map(s=>[s.date,s.start,s.end]),[['2026-11-06','10:00','11:00'],['2026-11-07','15:00','16:30']]);});
test('overnight window and exact midnight are represented correctly',()=>{const out=planSessions([{area:'Studio',minutes:180}],[w('2026-11-06','21:00','00:00')],[],defaults,now,id);assert.equal(out.remainder,0);assert.equal(out.sessions[0].end,'00:00');assert.equal(out.sessions[0].date,'2026-11-06');});
test('insufficient capacity stays explicit and inputs are immutable',()=>{const windows=[w('2026-11-06','09:00','10:00')];const out=planSessions([{area:'Studio',minutes:180}],windows,[],defaults,now,id);assert.equal(out.remainder,120);assert.equal(windows.length,1);});
test('overlapping imported windows cannot double-book',()=>{const out=planSessions([{area:'Studio',minutes:180}],[w('2026-11-06','09:00','11:00'),w('2026-11-06','10:00','12:00')],[],defaults,now,id);assert.equal(out.remainder,0);assert.deepEqual(out.sessions.map(s=>[s.start,s.end]),[['09:00','11:00'],['11:00','12:00']]);});
test('quick entry supports decimal hours and validates area',()=>{assert.deepEqual(parseQuick('Studio @1,5h\nStudio @45m',[{name:'Studio'}]).map(x=>x.minutes),[90,45]);assert.throws(()=>parseQuick('Unknown @2h',[{name:'Studio'}]));});
test('migration preserves old sessions, tasks, history and metadata',()=>{const old={sessions:[session],tasks:[{id:'t'}],history:[{sessionId:'deleted',minutes:15}],defaults:{workMinutes:50}};const out=normalizeArchive(old);assert.deepEqual(out.sessions,old.sessions);assert.deepEqual(out.tasks,old.tasks);assert.deepEqual(out.history,old.history);assert.equal(out.defaults.workMinutes,50);assert.ok(out.defaults.simple.areas.find(a=>a.name==='Studio'));assert.throws(()=>normalizeArchive({sessions:[{id:'bad'}]}));});
test('observed focus excludes breaks, paused sessions and sleeping gaps',()=>{const from=new Date('2026-11-06T09:24:55'),to=new Date('2026-11-06T09:25:05');assert.equal(measuredFocus(session,from,to),5);assert.equal(measuredFocus({...session,paused:true},from,to),0);assert.equal(measuredFocus(session,from,new Date(+from+60000)),0);assert.equal(measuredFocus({...session,finished:true},from,to),0);});
test('Dropbox merge keeps measured history after deleting its session and area descriptions',()=>{const archive=normalizeArchive({sessions:[],history:[{sessionId:'deleted',minutes:15,measured:true}]});archive.defaults.simple.areas[0].description='[Nota](obsidian://open?vault=V)';const merged=mergeSnapshots(archive,archive,archive).merged;assert.equal(merged.history.length,1);assert.equal(merged.defaults.simple.areas[0].description,archive.defaults.simple.areas[0].description);});
test('immediate timer starts with exact second precision',()=>{const s={...session,timerStartedAt:'2026-11-06T09:00:53',timerEndsAt:'2026-11-06T09:30:53'};assert.equal(measuredFocus(s,new Date('2026-11-06T09:00:50'),new Date('2026-11-06T09:01:00')),7);});
test('finished sessions do not conflict with a newly started timer in cloud merge',()=>{const a=normalizeArchive({sessions:[{...session,finished:true},{...session,id:'new'}]});assert.equal(mergeSnapshots(a,a,a).conflicts.length,0);});

test('planned two gross hours include four automatic 25/5 cycles', async()=>{
  const {getPhase,sessionBounds}=await import('../core/tempo-core.js');
  const {sessions}=planSessions([{area:'Studio',minutes:120}],[w('2026-11-06','09:00','11:00')],[],defaults,now,id);
  assert.equal(sessions.length,1);
  const s=sessions[0],bounds=sessionBounds(s);let focus=0,rest=0;
  for(let t=+bounds.start;t<+bounds.end;t+=60000){
    if(getPhase(s,new Date(t)).kind==='work')focus++;else rest++;
  }
  assert.equal(focus,100);assert.equal(rest,20);
  assert.equal(s.end,'11:00');
  assert.equal(getPhase(s,new Date('2026-11-06T09:25:00')).kind,'break');
  assert.equal(getPhase(s,new Date('2026-11-06T09:30:00')).kind,'work');
});
test('planner preserves custom cycles and disabled automatic breaks', async()=>{
  const {getPhase}=await import('../core/tempo-core.js');
  for(const settings of [{workMinutes:50,breakEnabled:true},{workMinutes:25,breakEnabled:false}]){
    const {sessions:[s]}=planSessions([{area:'Studio',minutes:120}],[w('2026-11-06','09:00','11:00')],[],settings,now,id);
    assert.equal(s.workMinutes,settings.workMinutes);assert.equal(s.breakEnabled,settings.breakEnabled);
    assert.equal(s.end,'11:00');
    assert.equal(getPhase(s,new Date('2026-11-06T09:55:00')).kind,settings.breakEnabled?'break':'work');
    assert.equal(getPhase(s,new Date('2026-11-06T10:00:00')).kind,'work');
  }
});
test('every planned fragment retains automatic pause preferences',()=>{
  const {sessions}=planSessions([{area:'Studio',minutes:120}],[w('2026-11-06','09:00','10:00'),w('2026-11-07','15:00','16:00')],[],defaults,now,id);
  assert.equal(sessions.length,2);
  for(const s of sessions){assert.equal(s.breakEnabled,true);assert.equal(s.workMinutes,25);}
});
