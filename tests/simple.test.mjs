import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchive,parseQuick,planSessions,measuredFocus,normalizeAreaColor,focusCycle,manualSessionEnd} from '../core/tempo-simple.js';
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

test('explicit quick times accept the requested three lines and need no availability windows',()=>{
 const requests=parseQuick('Lavoro @1,5h +08:30\nStudio @1h +13:45\nStudio @2h +17:30',[{name:'Studio'},{name:'Lavoro'}]);
 const {sessions,remainder}=planSessions(requests,[],[],defaults,now,id,'2026-11-06');
 assert.equal(remainder,0);
 assert.deepEqual(sessions.map(s=>[s.title,s.date,s.start,s.end]),[['Lavoro','2026-11-06','08:30','10:00'],['Studio','2026-11-06','13:45','14:45'],['Studio','2026-11-06','17:30','19:30']]);
 for(const s of sessions){assert.equal(s.breakEnabled,true);assert.equal(s.workMinutes,25);}
});
test('automatic rows reserve explicit slots first regardless of input order',()=>{
 const requests=parseQuick('Studio @1h\nLavoro @1h +09:00',[{name:'Studio'},{name:'Lavoro'}]);
 const {sessions,remainder}=planSessions(requests,[w('2026-11-06','09:00','11:00')],[],defaults,now,id,'2026-11-06');
 assert.equal(remainder,0);assert.equal(sessions.find(s=>s.title==='Studio').start,'10:00');
});
test('explicit slots reject collisions, past dates and invalid clock syntax',()=>{
 const areas=[{name:'Studio'}];
 for(const time of ['24:00','12:60','8:30','08:30 garbage'])assert.throws(()=>parseQuick('Studio @1h +'+time,areas));
 const request=parseQuick('Studio @1h +09:00',areas);
 assert.throws(()=>planSessions(request,[],[session],defaults,now,id,'2026-11-06'),/sovrappongono/);
 assert.throws(()=>planSessions([...request,...request],[],[],defaults,now,id,'2026-11-06'),/sovrappongono/);
 assert.throws(()=>planSessions(request,[],[],defaults,new Date('2026-11-06T10:00:00'),id,'2026-11-06'),/passato/);
});
test('explicit sessions cross midnight and retain disabled breaks',()=>{
 const requests=parseQuick('Studio @2h +23:30',[{name:'Studio'}]);
 const {sessions:[s]}=planSessions(requests,[],[],{workMinutes:50,breakEnabled:false},now,id,'2026-11-06');
 assert.equal(s.end,'01:30');assert.equal(s.date,'2026-11-06');assert.equal(s.breakEnabled,false);assert.equal(s.workMinutes,50);
 assert.throws(()=>planSessions([{area:'Studio',minutes:1500,start:'09:00'}],[],[],defaults,now,id,'2026-11-06'),/24 ore/);
});

test('migration restores legacy appearance colors and supplies safe defaults',()=>{
 const migrated=normalizeArchive({
   sessions:[],
   appearance:{areaColors:{Studio:'#123abc'}},
   defaults:{simple:{areas:[{name:'Studio',description:'[Nota](obsidian://open?vault=V)'},{name:'Personale',description:''}],windows:[]}}
 });
 assert.equal(migrated.defaults.simple.areas[0].color,'#123ABC');
 assert.equal(migrated.defaults.simple.areas[1].color,'#D6A323');
 assert.equal(migrated.defaults.simple.areas[0].description,'[Nota](obsidian://open?vault=V)');
 assert.equal(normalizeAreaColor('red','Altro'),'#54769B');
 assert.equal(normalizeArchive(migrated).defaults.simple.areas[0].color,'#123ABC');
});
test('focus durations generate proportionate rounded automatic pauses',()=>{
 assert.deepEqual(focusCycle(15),{focusMinutes:15,breakMinutes:3});
 assert.deepEqual(focusCycle(40),{focusMinutes:40,breakMinutes:8});
 assert.deepEqual(focusCycle(50),{focusMinutes:50,breakMinutes:10});
 assert.deepEqual(focusCycle(90),{focusMinutes:90,breakMinutes:18});
 assert.deepEqual(focusCycle(40,false),{focusMinutes:40,breakMinutes:0});
 for(const minutes of [0,-1,241,10.5,NaN])assert.throws(()=>focusCycle(minutes));
});
test('quick entry keeps gross duration and supports per-row focus overrides',async()=>{
 const requests=parseQuick('Studio @2h +09:00 ~40m\nLavoro @1,5h ~50m +14:00\nStudio @1h +17:30',[{name:'Studio'},{name:'Lavoro'}]);
 assert.deepEqual(requests.map(r=>r.focusMinutes),[40,50,undefined]);
 const {sessions,remainder}=planSessions(requests,[],[],{workMinutes:30,breakEnabled:true},now,id,'2026-11-06');
 assert.equal(remainder,0);
 assert.deepEqual(sessions.map(s=>[s.start,s.end,s.workMinutes]),[['09:00','11:00',40],['14:00','15:30',50],['17:30','18:30',30]]);
 const {getPhase}=await import('../core/tempo-core.js');
 assert.equal(getPhase(sessions[0],new Date('2026-11-06T09:39:59')).kind,'work');
 assert.equal(getPhase(sessions[0],new Date('2026-11-06T09:40:00')).kind,'break');
 assert.equal(getPhase(sessions[0],new Date('2026-11-06T09:48:00')).kind,'work');
 assert.equal(getPhase(sessions[1],new Date('2026-11-06T14:50:00')).kind,'break');
});
test('automatic placement uses individual cycle and disable-breaks preference',()=>{
 const req=parseQuick('Studio @1h ~15m',[{name:'Studio'}]);
 const out=planSessions(req,[w('2026-11-06','09:00','10:00')],[],{workMinutes:25,breakEnabled:false},now,id);
 assert.equal(out.sessions.length,1);
 assert.equal(out.sessions[0].workMinutes,15);
 assert.equal(out.sessions[0].breakEnabled,false);
 assert.equal(out.sessions[0].end,'10:00');
});
test('invalid or duplicate focus modifiers do not create sessions',()=>{
 const areas=[{name:'Studio'}];
 for(const suffix of ['~0m','~241m','~12.5m','~40m ~50m','~40m +24:00','+08:00 +09:00'])
   assert.throws(()=>parseQuick('Studio @1h '+suffix,areas));
 assert.throws(()=>planSessions([{area:'Studio',minutes:60,focusMinutes:999}],[],[],defaults,now,id,'2026-11-06'));
});

test('manual timer end uses gross minutes and exact start seconds',()=>{
 const start=new Date('2026-11-05T23:45:33+01:00');
 assert.equal(manualSessionEnd(start,30).toISOString(),'2026-11-05T23:15:33.000Z');
 assert.equal(manualSessionEnd(start,90)-start,90*60000);
 assert.equal(+start,+new Date('2026-11-05T23:45:33+01:00'));
 for(const value of [0,-1,1440,1.5,NaN,undefined])assert.throws(()=>manualSessionEnd(start,value));
 assert.throws(()=>manualSessionEnd('not-a-date',30));
});

test('custom pause uses exactly 40 focus + 5 rest within 45 gross minutes',async()=>{
 const {getPhase,sessionBounds}=await import('../core/tempo-core.js');
 const requests=parseQuick('Studio @45m +09:00 !5m',[{name:'Studio'}]);
 const {sessions:[s]}=planSessions(requests,[],[],defaults,now,id,'2026-11-06');
 assert.equal(s.end,'09:45');
 const bounds=sessionBounds(s);let focus=0,rest=0;
 for(let t=+bounds.start;t<+bounds.end;t+=60000)getPhase(s,new Date(t)).kind==='work'?focus++:rest++;
 assert.equal(focus,40);assert.equal(rest,5);
 assert.equal(measuredFocus(s,new Date('2026-11-06T09:39:55'),new Date('2026-11-06T09:40:05')),5);
 assert.equal(normalizeArchive(JSON.parse(JSON.stringify({sessions:[s]}))).sessions[0].customBreakMinutes,5);
 const archive=normalizeArchive({sessions:[s]});
 assert.equal(mergeSnapshots(archive,archive,archive).merged.sessions[0].customBreakMinutes,5);
});
test('custom pause validates duration, supports zero and overrides disabled auto pauses',async()=>{
 const {getPhase}=await import('../core/tempo-core.js');
 for(const value of ['!45m','!46m','!-1m','!2.5m','!5m !3m'])assert.throws(()=>parseQuick('Studio @45m '+value,[{name:'Studio'}]));
 assert.throws(()=>planSessions([{area:'Studio',minutes:5}],[],[],{...defaults,customBreakMinutes:5},now,id));
 const {sessions:[s]}=planSessions([{area:'Studio',minutes:45,start:'09:00',customBreakMinutes:0}],[],[],{...defaults,customBreakMinutes:5},now,id,'2026-11-06');
 assert.equal(getPhase(s,new Date('2026-11-06T09:44:59')).kind,'work');
 assert.throws(()=>normalizeArchive({sessions:[{...s,customBreakMinutes:46}]}));
 const {sessions:[rest]}=planSessions([{area:'Studio',minutes:45,start:'09:00'}],[],[],{...defaults,breakEnabled:false,customBreakMinutes:5},now,id,'2026-11-06');
 assert.equal(getPhase(rest,new Date('2026-11-06T09:40:00')).kind,'break');
});
test('custom pause budget stays unique across days and midnight',async()=>{
 const {getPhase,sessionBounds}=await import('../core/tempo-core.js');
 const {sessions}=planSessions([{area:'Studio',minutes:45,customBreakMinutes:5}],[w('2026-11-06','23:18','00:00'),w('2026-11-07','09:00','09:03')],[],defaults,now,id);
 assert.deepEqual(sessions.map(s=>s.customBreakMinutes),[2,3]);
 let focus=0,rest=0;
 for(const s of sessions){const b=sessionBounds(s);for(let t=+b.start;t<+b.end;t+=60000)getPhase(s,new Date(t)).kind==='work'?focus++:rest++;}
 assert.equal(focus,40);assert.equal(rest,5);
 assert.equal(normalizeArchive({sessions}).sessions.length,2);
});
test('immediate custom pause retains exact seconds and never extends the deadline',async()=>{
 const {getPhase}=await import('../core/tempo-core.js');
 const s={...session,customBreakMinutes:5,timerStartedAt:'2026-11-06T09:00:53',timerEndsAt:'2026-11-06T09:45:53'};
 assert.equal(getPhase(s,new Date('2026-11-06T09:40:52')).kind,'work');
 assert.equal(getPhase(s,new Date('2026-11-06T09:40:53')).kind,'break');
 assert.equal(getPhase(s,new Date('2026-11-06T09:45:53')).remaining,0);
});
