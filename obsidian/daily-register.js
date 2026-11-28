import {isReminder} from './plain-syntax.js';
import {grossCycle} from '../core/tempo-simple.js';
import {noteLinks} from './notes-integration.js';
import {dateTime,localDateString,sessionBounds,hasSessionOverlaps,sessionsOverlap} from '../core/tempo-core.js';
import {isAreaRegister,parseAreaRegister} from './area-register.js';

const clock='(?:[01]\\d|2[0-3]):[0-5]\\d';
const header=new RegExp('^(.+?)\\s+@(\\d+(?:[.,]\\d+)?)\\s*([hm])(?:\\s+('+clock+'))?\\s*=\\s*(\\d+)$','i');
const assignment=new RegExp('^-\\s*(?:('+clock+')\\s*)?(\\[\\[[^\\]\\n]+\\]\\])?$');
export const isRegister=source=>isAreaRegister(source)||/^\s*[^\n]+\s+@[\d.,]+\s*[hm]\b[^\n]*=\s*\d+\s*$/im.test(source||'');
const minutesOf=time=>Number(time.slice(0,2))*60+Number(time.slice(3));

export function parseRegister(source,areas){
 const groups=[];
 for(const [index,raw] of source.split(/\r?\n/).entries()){
  const line=raw.trim();
  if(isReminder(line)||!line||/^date:\s*\d{4}-\d\d-\d\d$/i.test(line)||/^<!-- tempvs-block:[\w-]+ -->$/.test(line))continue;
  const fail=message=>{throw Error('Riga '+(index+1)+': '+message);};
  const match=line.match(header);
  if(match){
   const [,name,value,unit,start,countText]=match;
   const area=areas.find(a=>a.name.toLowerCase()===name.trim().toLowerCase());
   if(!area)fail('Area sconosciuta: '+name);
   const minutes=Math.round(Number(value.replace(',','.'))*(unit.toLowerCase()==='h'?60:1)*1e8)/1e8,count=Number(countText);
   if(!Number.isInteger(minutes)||minutes<1||minutes>1440||count<1||count>minutes)fail('Controlla durata e numero di sessioni: occorre almeno un minuto per sessione, entro 24 ore.');
   groups.push({area,minutes,count,start,items:[]});continue;
  }
  const item=line.match(assignment),group=groups.at(-1);
  if(!item||!group)fail('Usa Area @2h 14:00 = 4 oppure - [[Nota]].');
  if(group.items.length>=group.count)fail('Le righe superano il numero di sessioni dichiarate.');
  const links=noteLinks(item[2]);
  if(item[2]&&!links.length)fail('Wikilink non valido.');
  group.items.push({time:item[1],links});
 }
 return groups.flatMap(({area,minutes,count,start,items})=>{
  let cursor=start?minutesOf(start):null;
  return Array.from({length:count},(_,i)=>{
   const duration=Math.floor(minutes/count)+Number(i<minutes%count),item=items[i];
   if(item?.time)cursor=minutesOf(item.time)+(cursor>=1440?1440:0);
   const time=cursor===null?null:String(Math.floor(cursor/60)%24).padStart(2,'0')+':'+String(cursor%60).padStart(2,'0');
   const slot={area:area.name,areaId:area.id,minutes:duration,start:time,dayOffset:cursor>=1440?1:0,linkedNotes:item?.links||[]};
   if(cursor!==null)cursor+=duration;
   return slot;
  });
 });
}

export function registerPlan({source,date,blockId,state,id,planningKey}){
 const areas=state.defaults.simple.areas;
 const {slots,budgets}=isAreaRegister(source)?parseAreaRegister(source,areas):{slots:parseRegister(source,areas),budgets:[]};
 const sessions=[],records=[],claimed=new Set();
 const previous=state.history.filter(h=>h.registerBlock===blockId);
 for(const [index,slot] of slots.entries()){
  const day=new Date(date+'T12:00:00');day.setDate(day.getDate()+(slot.dayOffset||0));
  const start=slot.start?new Date(+dateTime(localDateString(day),slot.start)+(slot.offset||0)*1000):null;
  const clock=t=>[t.getHours(),t.getMinutes()].map(n=>String(n).padStart(2,'0')).join(':');
  const dayText=localDateString(start||day),startTime=start&&clock(start);
  const exact=s=>s.date===dayText&&+sessionBounds(s).start===+start&&s.areaId===slot.areaId&&
   (sessionBounds(s).end-sessionBounds(s).start)===Math.round(slot.minutes*60000);
  const match=slot.start&&state.sessions.find(s=>!s.manualSuperseded&&!s.dailyRetired&&!claimed.has(s.id)&&
   (!s.noteBlockId||s.noteBlockId===blockId)&&exact(s));
  const sameNote=h=>h.area===slot.area&&(h.linkedNotes?.[0]?.path||'')===(slot.linkedNotes?.[0]?.path||'');
  const old=slot.planned?
   previous.find(h=>h.planned&&h.slotIndex===index&&!claimed.has(h.sessionId)&&sameNote(h))||
   previous.find(h=>h.planned&&!claimed.has(h.sessionId)&&sameNote(h)):
   previous.find(h=>h.slotIndex===index&&!h.planned);
  const sessionId=match?.id||(old&&!claimed.has(old.sessionId)?old.sessionId:id());
  claimed.add(sessionId);
  const record={sessionId,registerBlock:blockId,noteBlockId:blockId,slotIndex:index,date:dayText,registerDay:date,
   title:slot.area,area:slot.area,areaId:slot.areaId,start:startTime&&start.getSeconds()?startTime+':'+String(start.getSeconds()).padStart(2,'0'):startTime,minutes:slot.minutes,measured:!slot.planned,linkedNotes:slot.linkedNotes,...(slot.planned?{planned:true,sourceRow:slot.sourceRow}:{})};
  records.push(record);
  const chosenCycle=slot.cycleMinutes!==undefined?grossCycle(slot.cycleMinutes):null;
  if(slot.start){
   const end=new Date(+start+Math.round(slot.minutes*60000));
   const precise={timerStartedAt:start.toISOString(),timerEndsAt:end.toISOString()};
   const cycle=Number.isInteger(slot.minutes)&&slot.minutes<1440?{cycleMinutes:slot.minutes,workMinutes:slot.minutes*5/6}:{workMinutes:25};
   const plannedCycle=slot.planned?(chosenCycle?
    {cycleMinutes:slot.cycleMinutes,workMinutes:chosenCycle.focusMinutes,breakEnabled:true}:
    {workMinutes:slot.focusMinutes??state.defaults.workMinutes,breakEnabled:state.defaults.breakEnabled,
     ...(slot.customBreakMinutes!==undefined?{customBreakMinutes:slot.customBreakMinutes}:{})}):null;
   sessions.push({id:sessionId,title:slot.area,area:slot.area,areaId:slot.areaId,date:dayText,start:startTime,end:clock(end),
    ...precise,breakEnabled:true,noteBlockId:blockId,linkedNotes:slot.linkedNotes,...(plannedCycle?{...plannedCycle,registerPlanned:true}:{...cycle,registerMinutes:slot.minutes})});
  }
 }
 const other=state.sessions.filter(s=>!claimed.has(s.id)&&s.noteBlockId!==blockId&&!s.dailyRetired&&!s.manualSuperseded);
 if(hasSessionOverlaps(sessions)||sessions.some(s=>other.some(t=>sessionsOverlap(s,t))))throw Error('Gli orari si sovrappongono. Correggi gli intervalli indicati.');
 const removeIds=state.sessions.filter(s=>s.noteBlockId===blockId&&!sessions.some(t=>t.id===s.id)).map(s=>s.id);
 return {source,date,blockId,planningKey,sessions,records,budgets,removeIds,retainedIds:[],unusedMinutes:slots.reduce((sum,slot)=>sum+(slot.unusedMinutes||0),0)};
}

export function applyRegister(state,plan){
 const replaced=new Set([...plan.removeIds,...plan.records.map(r=>r.sessionId)]);
 const existing=new Map(state.sessions.map(s=>[s.id,s]));
 state.sessions=state.sessions.filter(s=>!replaced.has(s.id)).concat(plan.sessions.map(s=>{
  const old=existing.get(s.id);
  const sameTime=old?.timerStartedAt===s.timerStartedAt&&old?.timerEndsAt===s.timerEndsAt;
  return {...s,actualSeconds:old?.actualSeconds||0,
   ...(s.registerPlanned&&sameTime?{finished:old.finished,paused:old.paused,noteWork:old.noteWork}: {})};
 }));
 const obsolete=state.history.filter(h=>(h.registerBlock===plan.blockId||replaced.has(h.sessionId))&&!plan.records.some(r=>r.sessionId===h.sessionId)).map(h=>h.sessionId);
 state.history=state.history.filter(h=>h.registerBlock!==plan.blockId&&!replaced.has(h.sessionId)).concat(plan.records);
 for(const [key,removed,live] of [['history',obsolete,plan.records.map(r=>r.sessionId)],['sessions',plan.removeIds,plan.sessions.map(s=>s.id)]]){
  state.syncDeleted[key]=[...new Set([...(state.syncDeleted[key]||[]),...removed])].filter(id=>!live.includes(id));
 }
}

// Build both views from one row per session. History also holds slots without a clock.
export function creditedWork(state,resolve,bindingPath,byArea,{includePlannedIntervals=true}={}){
 const totals=new Map(),records=new Map(state.history.map(h=>[h.sessionId,h]));
 for(const s of state.sessions)if(!records.get(s.id)?.registerBlock||records.get(s.id)?.planned)records.set(s.id,s);
 const estimates=state.defaults.simple.noteEstimates||{};
 const add=(path,seconds,source,area)=>{
  if(!path||!(seconds>0))return;
  const target=path.split('#')[0],key=resolve(target,source)||target.replace(/\.md$/i,'')+'.md';
  if(byArea&&area){
   if(!byArea.has(key))byArea.set(key,new Map());
   const rows=byArea.get(key);rows.set(area,(rows.get(area)||0)+seconds);
  }
  totals.set(key,(totals.get(key)||0)+seconds);
 };
 for(const r of records.values()){
  if(r.planned||r.dailyRetired||r.manualSuperseded)continue;
  const source=bindingPath(r.noteBlockId)||'';
  const linked=r.linkedNotes?.[0]?.path||estimates[r.noteEstimateId]?.path;
  if(r.registerBlock||includePlannedIntervals&&!r.registerPlanned&&r.noteBlockId&&r.start&&r.end){
   add(linked,r.registerBlock?r.minutes*60:(sessionBounds(r).end-sessionBounds(r).start)/1000,source,r.area);
  }else{
   let allocated=0;
   for(const [id,seconds] of Object.entries(r.noteWork||{})){allocated+=seconds;add(estimates[id]?.path,seconds,source,r.area);}
   add(linked,(r.actualSeconds??(r.measured?r.minutes*60:0))-allocated,source,r.area);
  }
 }
 return totals;
}
