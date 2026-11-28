import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarRows,calendarAddress,changeRow,expandCalendar,reconcile,CalendarImport} from '../obsidian/google-calendar.js';
import {findDailyBlocks,parseDailySource} from '../obsidian/daily-plan.js';

const calendar='school%40example.org';
const url='https://calendar.google.com/calendar/ical/'+calendar+'/private-012345/basic.ics';
const day='2026-11-28',next='2026-11-29';
const event=(props)=>['BEGIN:VEVENT',...props,'END:VEVENT'].join('\r\n');
const feed=(...events)=>['BEGIN:VCALENDAR','VERSION:2.0',...events,'END:VCALENDAR'].join('\r\n');
const appointment=event(['UID:1','DTSTART:20261128T110000','DTEND:20261128T120000','SUMMARY:Consiglio']);
const source=text=>findDailyBlocks(text)[0]?.source;
test('daily edits survive refresh, deletion and restart',()=>{
 const a=expandCalendar(feed(appointment),calendar,[day]).get(day);
 const first=reconcile('Appunti  \n',calendar,a);
 assert.ok(first.startsWith('Appunti  \n'));
 const [e]=calendarRows(source(first));
 assert.equal(e.title,'Consiglio');assert.equal(e.minutes,60);
 assert.deepEqual(parseDailySource(source(first),[]),[]);
 const assigned=first.replace(e.line,changeRow(e.line,e.key,'lavoro'));
 assert.equal(reconcile(assigned,calendar,a),assigned);
 const latest=expandCalendar(feed(appointment.replace('Consiglio','Riunione')),calendar,[day]).get(day);
 const updated=reconcile(assigned,calendar,latest);
 assert.equal(calendarRows(source(updated))[0].area,'lavoro');
 const deleted=updated.replace(calendarRows(source(updated))[0].line,'');
 assert.equal(reconcile(deleted,calendar,latest),deleted);
 assert.equal(calendarRows(source(reconcile(first,calendar,new Map()))).length,0);
});
test('recurrences, detached changes, skipped dates, all-day and overnight events',()=>{
 const days=[day,next,'2026-11-30'];
 const recurring=event(['UID:r','DTSTART:20261127T180000','DTEND:20261127T190000','RRULE:FREQ=DAILY;COUNT=4','EXDATE:20261129T180000','SUMMARY:Lezione']);
 const moved=event(['UID:r','RECURRENCE-ID:20261128T180000','DTSTART:20261129T160000','DTEND:20261129T170000','SUMMARY:Recupero']);
 const all=event(['UID:2','DTSTART;VALUE=DATE:20261128','DTEND;VALUE=DATE:20261130','SUMMARY:Festa']);
 const night=event(['UID:3','DTSTART:20261128T233000','DTEND:20261129T003000','SUMMARY:Viaggio']);
 const result=expandCalendar(feed(recurring,moved,all,night),calendar,days);
 assert.deepEqual([...result.get(day).values()].map(e=>e.time),['Tutto il giorno','23:30–24:00']);
 assert.deepEqual([...result.get(next).values()].map(e=>e.time),['16:00–17:00','Tutto il giorno','00:00–00:30']);
 assert.equal(result.get(days[2]).size,1);
});
test('imports only selected feeds into existing eligible daily notes, including after a move',async()=>{
 let body=feed(appointment);
 const files=[day,next,'2026-11-27','Progetto'].map(name=>({path:name+'.md',name,text:''}));
 const p={calendar:{since:day,urls:[url]},app:{vault:{getMarkdownFiles:()=>files,getAbstractFileByPath:path=>files.find(f=>f.path===path)}},
  daily:{queue:fn=>fn(),panelDay:f=>f.name==='Progetto'?null:f.name,dailyLocation:d=>({file:files.find(f=>f.name===d)}),
   readMarkdown:f=>f.text,replaceAllocationText:(f,old,after)=>{assert.equal(f.text,old);f.text=after;}}};
 const importer=new CalendarImport(p,async requested=>{assert.equal(requested,url);return body;});
 await importer.sync();
 assert.ok(files[0].text);assert.ok(files.slice(1).every(f=>!f.text));
 const row=calendarRows(source(files[0].text))[0];
 files[0].text=files[0].text.replace(row.line,changeRow(row.line,row.key,'studio'));
 body=feed(appointment.replaceAll('20261128','20261129'));await importer.sync();
 assert.equal(calendarRows(source(files[1].text))[0].area,'studio');
 files[1].text=files[1].text.replace(calendarRows(source(files[1].text))[0].line,'');
 body=feed(appointment);await importer.sync();
 assert.equal(calendarRows(source(files[0].text)).length,0);
 assert.throws(()=>calendarAddress('https://example.com/basic.ics'));
});
