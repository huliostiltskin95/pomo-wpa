import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArchive} from '../core/tempo-simple.js';
import {prepareDailyPlan,applyDailyPlan} from '../obsidian/daily-plan.js';
import {creditedWork,parseRegister} from '../obsidian/daily-register.js';

test('registro giornaliero: lordo, sessioni senza orario, correzioni e cancellazioni',()=>{
 let state=normalizeArchive({sessions:[]}),sequence=0,previousSource;
 const apply=source=>{
  const proposal=prepareDailyPlan({state,source,previousSource,date:'1995-01-01',blockId:'daily',id:()=>String(++sequence)});
  applyDailyPlan(state,proposal);state=normalizeArchive(state);previousSource=source;
 };
 const source='date: 1995-01-01\nStudio @2h 14:00 = 4\n- [[Aritmetica]]\n- [[Geometria|Geo]]\n- [[Fisica]]\nPersonale @1h = 1\n- [[Spesa]]';
 apply(source);const ids=state.history.map(h=>h.sessionId);
 apply(source);assert.deepEqual(state.history.map(h=>h.sessionId),ids);
 assert.deepEqual(state.history.map(h=>h.start),['14:00','14:30','15:00','15:30',null]);
 assert.equal(state.sessions.length,4);
 state.sessions[0].actualSeconds=1500;
 const totals=()=>Object.fromEntries(creditedWork(state,()=>null,()=>null));
 assert.deepEqual(totals(),{'Aritmetica.md':1800,'Geometria.md':1800,'Fisica.md':1800,'Spesa.md':3600});
 apply('Studio @8h = 1\n- [[Fisica|Ripasso]]');
 assert.deepEqual(totals(),{'Fisica.md':28800});assert.equal(state.sessions.length,0);
 apply('date: 1995-01-01');assert.deepEqual(totals(),{});assert.equal(state.history.length,0);
});

test('ripartizione esatta e orario per sessione',()=>{
 const areas=normalizeArchive({sessions:[]}).defaults.simple.areas;
 const rows=parseRegister('Studio @1h = 7\n-\n- 23:55 [[A]]',areas);
 assert.deepEqual(rows.map(r=>r.minutes),[9,9,9,9,8,8,8]);
 assert.equal(rows[0].start,null);assert.equal(rows[2].dayOffset,1);
 assert.throws(()=>parseRegister('Studio @1h = 1\n- [[A]]\n- [[B]]',areas));
});

import {parseAreaRegister} from '../obsidian/area-register.js';
import {getPhase,sessionBounds} from '../core/tempo-core.js';
test('budget e tempo svolto indipendenti, timer con precisione al secondo',()=>{
 const state=normalizeArchive({sessions:[]}),date='2026-11-23',blockId='budget';
 let next=0;
 const plan=source=>prepareDailyPlan({source,date,blockId,state,id:()=>String(++next)});
 const source='Studio @8\n- [[Matematica#Fibonacci|Fibonacci]] @1 = 2\n- [[Geografia#Vaticano|Vaticano]] @60m = 1\n- [[Greco]] @6h = 12\nPersonale @4h\n- [[Personale#Budapest|Budapest]] @1h = 2 +02:50';
 const result=plan(source);
 assert.deepEqual(result.budgets.map(b=>[b.seconds,b.assigned]),[[28800,28800],[14400,3600]]);
 applyDailyPlan(state,result);assert.equal(state.history.length,17);
 assert.deepEqual(state.sessions.map(s=>[s.start,s.end]),[['02:50','03:20'],['03:20','03:50']]);
 assert.equal(creditedWork(state,()=>null,()=>null).get('Personale.md'),3600);
 const short=plan('Studio @60\n- [[Greco]] @65s = 2 +23:59');
 applyDailyPlan(state,short);normalizeArchive(state);
 assert.equal(short.budgets[0].seconds,216000);
 const [first,second]=state.sessions.map(sessionBounds);
 assert.equal(second.start-first.start,33000);assert.equal(second.end-second.start,32000);
 assert.equal(getPhase(state.sessions[0],new Date(+first.start+30000)).kind,'break');
 assert.deepEqual(state.history.map(h=>Math.round(h.minutes*60)),[33,32]);
 assert.equal(getPhase(state.sessions[1],second.start).kind,'work');
 const areas=state.defaults.simple.areas;
 for(const bad of ['[[Greco]] 1h 2 02:50','- [[Greco]] @1h 2 +02:50']){
  assert.throws(()=>parseAreaRegister('Studio @8h\n'+bad,areas),/Prova: - \[\[Greco\]\] @1h = 2 \+02:50/);
 }
 assert.throws(()=>plan('Studio @8h\n- [[A]] [[B]] @1h = 2'),/un solo wikilink/);
 assert.equal(plan('Personale @4h').records.length,0);
});

test('riga autonoma con alias, durata e inizio facoltativo',()=>{
 const state=normalizeArchive({sessions:[]});
 const source='- [[lo-sviluppo-sociale-e-le-relazioni-di-gruppo|Lo sviluppo sociale e le relazioni di gruppo]] 30m = 1 +11:45 @Studio';
 const plan=prepareDailyPlan({state,source,date:'2026-11-23',blockId:'daily',id:()=>'one'});
 assert.deepEqual(plan.sessions.map(s=>[s.area,s.start,s.end]),[['Studio','11:45','12:15']]);
 assert.equal(plan.records[0].linkedNotes[0].label,'Lo sviluppo sociale e le relazioni di gruppo');
 assert.equal(parseAreaRegister(source.replace(' +11:45',''),state.defaults.simple.areas).slots[0].start,null);
});

test('short activities and ranges use the original planners',()=>{
 const state=normalizeArchive({sessions:[]});
 const plan=source=>{
  let id=0;
  return prepareDailyPlan({state,source,date:'2026-11-24',blockId:'daily',now:new Date('2026-11-24T08:00:00'),id:()=>String(++id)});
 };
 const short='Studio 1h x2 11:45 [[Platone#Repubblica|Repubblica]] [[Bibliografia]]';
 const old='- [[Platone#Repubblica|Repubblica]] [[Bibliografia]] 1h = 2 +11:45 @Studio';
 const range='Personale 23:30-01:00 30m [[A]]';
 const oldRange='Personale +23:30-01:00 -30m [[A]]';
 assert.deepEqual(plan(short+'\n'+range).records,plan(old+'\n'+oldRange).records);
 assert.deepEqual(plan(range).sessions,plan(oldRange).sessions);
 assert.deepEqual(plan('Studio 30m [[A]]').records,plan('- [[A]] 30m @Studio').records);
 assert.throws(()=>plan('Studio 1h x0 [[A]]'));
 assert.throws(()=>plan('Studio 1h 25:00 [[A]]'));
});

test('time-first daily syntax preserves scheduling, credits, highlighting and range write-back',async()=>{
 const {serializeDailyPlan,parseDailySource}=await import('../obsidian/daily-plan.js');
 const {syntaxTokens}=await import('../obsidian/syntax.js');
 const state=normalizeArchive({sessions:[]}),date='2026-11-24';
 state.defaults.simple.areas[0].name='Studio greco';
 const plan=source=>{
  let id=0;
  return prepareDailyPlan({state,source,date,blockId:'daily',now:new Date(date+'T08:00:00'),id:()=>String(++id)});
 };
 const link='[[Platone#Repubblica|Repubblica]] [[Bibliografia]]';
 const range='23:30-01:00 30m Studio greco '+link;
 const legacy='Studio greco 23:30-01:00 30m '+link;
 const rows=['11:45 1h x2 Studio greco '+link,'30m Studio greco [[Latino]]',range];
 assert.deepEqual(plan(rows.join('\n')).records,
   plan(['Studio greco 1h x2 11:45 '+link,'Studio greco 30m [[Latino]]',legacy].join('\n')).records);
 assert.deepEqual(plan(range).sessions,plan(legacy).sessions);
 const written=serializeDailyPlan(plan(range).sessions,date,range);
 assert.match(written,/^23:30-00:00 30m Studio greco/);
 assert.deepEqual(parseDailySource(written,state.defaults.simple.areas).map(x=>[x.start,x.dayOffset||0]),
   [['23:30',0],['00:00',1],['00:30',1]]);
 for(const row of rows){
  const area=syntaxTokens(row).find(token=>token.kind==='area');
  assert.equal(row.slice(area.from,area.to),'Studio greco');
 }
 assert.equal(plan('14:00-16:00 30m Studio greco').sessions.length,4);
 assert.throws(()=>plan('25:00 30m Studio greco [[A]]'));
});

test('budget rows receive optional starts without giving credit for planned work',()=>{
 const state=normalizeArchive({sessions:[]}),date='2099-11-25';
 let id=0;
 const plan=source=>prepareDailyPlan({state,source,date,blockId:'daily',id:()=>String(++id)});
 const base=['Studio @8h',...Array.from({length:4},(_,i)=>'- [[Prova '+(i+1)+']] @90m'),'Personale @8h'].join('\n');
 const pending=plan(base);
 assert.equal(pending.budgets[0].assigned,6*3600);
 assert.equal(pending.sessions.length,0);
 applyDailyPlan(state,pending);
 assert.equal(creditedWork(state,()=>null,()=>null).size,0);
 const times=['15:30','17:00','21:00','22:30'];
 const timed=base.replace(/@90m/g,()=>('@90m +'+times.shift()));
 const scheduled=plan(timed);
 assert.deepEqual(scheduled.sessions.map(s=>[s.start,s.end]),[
  ['15:30','17:00'],['17:00','18:30'],['21:00','22:30'],['22:30','00:00']
 ]);
 assert.deepEqual(scheduled.sessions.map(s=>s.id),pending.records.map(r=>r.sessionId));
 applyDailyPlan(state,scheduled);
 assert.equal(creditedWork(state,()=>null,()=>null).size,0);
 state.sessions[0].actualSeconds=120;
 assert.equal(creditedWork(state,()=>null,()=>null).get('Prova 1.md'),120);
 assert.throws(()=>plan(timed.replace('+17:00','+16:45')),/sovrappongono/);
});

test('gross budgets reserve no time on the daily note date',()=>{
 const date='2099-11-25';
 const state=normalizeArchive({sessions:[
  {id:'today',title:'Studio',area:'Studio',date:'2099-11-24',start:'10:00',end:'11:00',workMinutes:25,breakEnabled:true}
 ]});
 const source=['Studio = 8h',...['60m +10:00','90m','60m','90m','60m','60m','60m'].map(
  (duration,index)=>'- [[Nota '+index+'|Lettura '+index+']] @'+duration),'Personale = 8h'].join('\n');
 const plan=text=>prepareDailyPlan({state,source:text,date,blockId:'daily',now:new Date('2099-11-24T09:00')});
 const result=plan(source);
 assert.deepEqual(result.budgets.map(b=>[b.area,b.seconds,b.assigned]),[
  ['Studio',28800,28800],['Personale',28800,0]
 ]);
 assert.equal(result.records.length,7);
 assert.deepEqual(result.sessions.map(s=>[s.date,s.start,s.end]),[[date,'10:00','11:00']]);
 assert.deepEqual(plan(source.replace(/ = /g,' @')).budgets,result.budgets);
 assert.equal(plan('Personale = 8h').records.length,0);
 assert.throws(()=>plan(source.replace('@90m','@90m +10:30')),/sovrappongono/);
});

test('fasce distinte della stessa attività, budget, credito e modifica',()=>{
 const state=normalizeArchive({sessions:[]});
 let next=0;
 const plan=source=>prepareDailyPlan({state,source,date:'2026-11-28',blockId:'daily',id:()=>String(++next)});
 const row='- [[Santrock|Psicologia: p. 110-119]] @1h = 2 ';
 const times='10:00-10:30; 12:30-13:00';
 const result=plan('Studio = 8h\n'+row+times);
 assert.deepEqual(result.sessions.map(s=>[s.start,s.end]),[['10:00','10:30'],['12:30','13:00']]);
 assert.equal(result.budgets[0].assigned,3600);
 applyDailyPlan(state,result);
 assert.equal(creditedWork(state,()=>null,()=>'daily.md',null,{dailyOnly:true}).get('Santrock.md'),3600);
 const moved=plan(row+'23:40-00:00; 00:20-01:00 @Personale');
 assert.deepEqual(moved.sessions.map(s=>[s.date,s.area,s.registerMinutes]),[
  ['2026-11-28','Personale',20],['2026-11-29','Personale',40]]);
 assert.equal(plan(row+times).sessions.length,2);
 assert.throws(()=>plan(row+'10:00-11:00'),/numero di fasce/);
 assert.throws(()=>plan(row+'10:00-10:30; 12:30-12:40'),/somma/);
 assert.throws(()=>plan(row+'10:00-10:30; 10:20-10:50'),/sovrappongono/);
 assert.throws(()=>plan(row+'10:00-10:30; 25:00-25:30'),/HH:MM/);
});
