import ICAL from 'ical.js';
import {findDailyBlocks,replaceDailyBlock} from './daily-plan.js';
import {isLedger} from './note-ledger.js';
import {isEstimateSource} from '../core/tempo-estimates.js';

const pad=n=>String(n).padStart(2,'0');
const clock=d=>pad(d.getHours())+':'+pad(d.getMinutes());
const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
const safe=s=>String(s??'').replace(/[\r\n\t]+/g,' ').trim();
const row=/^Calendar · (Tutto il giorno|\d\d:\d\d–\d\d:\d\d) · (.*?) <!-- gcal:([\w-]+)(?: area:([^ ]+))? -->$/;
export function calendarRows(source=''){
 return source.split(/\r?\n/).flatMap(line=>{
  const m=row.exec(line);if(!m)return [];
  return [{line,time:m[1],title:m[2],key:m[3],area:m[4]||'',minutes:m[1].includes('–')?minutes(m[1].slice(6))-minutes(m[1].slice(0,5)):0}];
 });
}
export function calendarAddress(raw){
 const u=new URL(raw.trim());
 if(u.origin!=='https://calendar.google.com'||!/^\/calendar\/ical\/[^/]+\/(private-[\w-]+|public)\/basic\.ics$/.test(u.pathname)||u.username||u.password||u.search||u.hash)
  throw Error('Inserisci l’indirizzo iCal di Google Calendar.');
 return {url:u.href,calendar:u.pathname.split('/')[3]};
}
const encode=s=>btoa(Array.from(new TextEncoder().encode(s),c=>String.fromCharCode(c)).join('')).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
export function expandCalendar(ics,calendar,days){
 const component=new ICAL.Component(ICAL.parse(ics));
 if(component.name!=='vcalendar')throw Error('Risposta iCal non valida.');
 const windows=[...new Set(days)].sort().map(day=>{
  const start=new Date(day+'T00:00:00'),end=new Date(start);end.setDate(end.getDate()+1);
  return {day,start,end};
 });
 const result=new Map(windows.map(w=>[w.day,new Map()]));
 if(!windows.length)return result;
 const last=windows.at(-1).end;
 const events=component.getAllSubcomponents('vevent').map(c=>new ICAL.Event(c,{exceptions:[]}));
 const keyPrefix=encode(calendar)+'-';
 function add(event,identity,startTime,endTime){
  if(event.component.getFirstPropertyValue('status')==='CANCELLED')return;
  const start=startTime.toJSDate(),end=endTime.toJSDate();
  const key=keyPrefix+encode(JSON.stringify([event.uid,identity]));
  for(const w of windows){
   if(start>=w.end||end<w.start||(end<=w.start&&+end!==+start))continue;
   const from=new Date(Math.max(+start,+w.start)),until=new Date(Math.min(+end,+w.end));
   const time=startTime.isDate?'Tutto il giorno':clock(from)+'–'+(+until===+w.end?'24:00':clock(until));
   result.get(w.day).set(key,{key,time,title:safe(event.summary)||'Evento senza titolo'});
  }
 }
 const exceptions=events.filter(e=>e.isRecurrenceException());
 for(const e of exceptions)if(e.component.getFirstPropertyValue('status')!=='CANCELLED')add(e,e.recurrenceId.toString(),e.startDate,e.endDate);
 for(const e of events.filter(e=>!e.isRecurrenceException())){
  if(e.component.getFirstPropertyValue('status')==='CANCELLED')continue;
  if(!e.isRecurring()){add(e,'',e.startDate,e.endDate);continue;}
  const overrides=new Set(exceptions.filter(x=>x.uid===e.uid).map(x=>x.recurrenceId.toUnixTime()));
  const iterator=e.iterator();let t,n=0;
  while((t=iterator.next())&&t.toJSDate()<last){
   if(++n>250000)throw Error('La serie ricorrente supera il limite di importazione.');
   if(overrides.has(t.toUnixTime()))continue;
   const end=t.clone();end.addDuration(e.duration);add(e,t.toString(),t,end);
  }
 }
 return result;
}
function formatRow(e,area=''){
 return 'Calendar · '+e.time+' · '+e.title+' <!-- gcal:'+e.key+(area?' area:'+area:'')+' -->';
}
function seenMarker(calendar){
 return new RegExp('^<!-- tempvs-gcal-seen:'+encode(calendar)+' ([\\w,\\-]*) -->$','m');
}
export function reconcile(markdown,calendar,events,priorAreas=new Map(),removed=new Set()){
 const blocks=findDailyBlocks(markdown).filter(b=>!isLedger(b.source));
 if(blocks.length>1||findDailyBlocks(markdown,true).length!==findDailyBlocks(markdown).length)throw Error('Controlla i blocchi TEMPVS nella daily.');
 const block=blocks[0],source=block?.source||'',prefix=encode(calendar)+'-';
 if(block&&isEstimateSource(source))throw Error('La daily contiene un blocco di stima.');
 const marker=seenMarker(calendar);
 const old=markdown.match(marker),seen=new Set(old?.[1].split(',').filter(Boolean)||[]);
 const added=new Set(),lines=[];
 for(const line of source.split(/\r?\n/)){
  const m=row.exec(line);
  if(!m||!m[3].startsWith(prefix)){lines.push(line);continue;}
  const e=events.get(m[3]);
  if(e){lines.push(formatRow(e,m[4]));added.add(e.key);seen.add(e.key);}
  else seen.delete(m[3]);
 }
 for(const [key,e] of events)if(!added.has(key)&&!seen.has(key)&&!removed.has(key)){lines.push(formatRow(e,priorAreas.get(key)));seen.add(key);}
 const next=lines.join('\n').replace(/^\n(?=Calendar · )/,'');
 let out=markdown;
 if(next!==source)out=block?replaceDailyBlock(out,block,next):out+'\n\n```TEMPVS\n'+next+'\n```\n';
 const stamp='<!-- tempvs-gcal-seen:'+encode(calendar)+' '+[...seen].join(',')+' -->';
 if(!block&&next&&!findDailyBlocks(out).length)throw Error('Chiudi il blocco di codice aperto nella daily.');
 if(old)return out.replace(marker,stamp);
 return seen.size?out+(out.endsWith('\n')?'\n':'\n\n')+stamp+'\n':out;
}
export function changeRow(source,key,area){
 return source.split(/\r?\n/).flatMap(line=>{
  const m=row.exec(line);if(m?.[3]!==key)return [line];
  return area===null?[]:[formatRow({time:m[1],title:m[2],key},area)];
 }).join('\n');
}
export class CalendarImport {
 constructor(plugin,fetchText){this.plugin=plugin;this.fetchText=fetchText;}
 sync(){
  if(!this.running)this.running=this.run().finally(()=>{this.running=null;});
  return this.running;
 }
 async run(){
  const p=this.plugin;await p.daily.ready;
  const days=new Map();
  for(const file of p.app.vault.getMarkdownFiles()){
   const day=p.daily.panelDay(file);
   if(day&&day>=p.calendar.since&&p.daily.dailyLocation(day).file?.path===file.path)days.set(day,file);
  }
  if(!days.size)return;
  const failures=[];
  for(const raw of p.calendar.urls){
   try{
    const {url,calendar}=calendarAddress(raw);
    const events=expandCalendar(await this.fetchText(url),calendar,days.keys());
    const priorAreas=new Map(),removed=new Set();
    for(const file of days.values()){
     const text=await p.daily.readMarkdown(file);
     const rows=calendarRows(findDailyBlocks(text).find(b=>!isLedger(b.source))?.source);
     const present=new Set(rows.map(e=>e.key));
     for(const e of rows)if(e.area)priorAreas.set(e.key,e.area);
     for(const key of text.match(seenMarker(calendar))?.[1].split(',')||[])
      if(key&&!present.has(key))removed.add(key);
    }
    for(const [day,file] of days){
     if(p.daily.destroyed||!p.calendar.urls.includes(raw))break;
     await p.daily.queue(async()=>{
      if(p.daily.destroyed||p.app.vault.getAbstractFileByPath(file.path)!==file)return;
      const before=await p.daily.readMarkdown(file);
      const after=reconcile(before,calendar,events.get(day),priorAreas,removed);
      if(after!==before)await p.daily.replaceAllocationText(file,before,after);
     });
    }
   }catch{failures.push(calendarAddress(raw).calendar);}
  }
  if(failures.length)throw Error('Aggiornamento incompleto per '+failures.length+' calendari. Verifica i link e riprova dopo il salvataggio delle note.');
 }
}
