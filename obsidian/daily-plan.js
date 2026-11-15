import {parseQuick,planSessions,normalizeArchive} from '../core/tempo-simple.js';
import {localDateString,sessionBounds,dateTime,getPhase,sessionsOverlap} from '../core/tempo-core.js';

const blockPattern=/^\s*<!-- tempvs-block:([^\s>]+) -->\s*$/;
const rowPattern=/\s*<!-- tempvs-session:([^\s>]+)(?: day:([01]))? -->\s*$/;
const datePattern=/^\s*date:\s*(\d{4}-\d{2}-\d{2})\s*$/i;
export function validDay(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))return false;
 const d=new Date(day+'T12:00:00');return Number.isFinite(+d)&&localDateString(d)===day;
}
export function blockIdentity(source){
 const ids=source.split(/\r?\n/).map(line=>line.match(blockPattern)?.[1]).filter(Boolean);
 if(ids.length>1)throw Error('Il blocco contiene più identificativi TEMPVS.');
 if(ids[0]&&!/^[A-Za-z0-9-]{1,100}$/.test(ids[0]))throw Error('Identificativo del blocco TEMPVS non valido.');
 return ids[0]||null;
}
export function explicitDay(source){
 const dates=source.split(/\r?\n/).map(line=>line.match(datePattern)?.[1]).filter(Boolean);
 if(dates.length>1)throw Error('Indica una sola data nel blocco TEMPVS.');
 if(dates[0]&&!validDay(dates[0]))throw Error('Data TEMPVS non valida.');
 return dates[0]||null;
}
export function resolveDailyDate(source,file,{format='YYYY-MM-DD',moment,frontmatter}={}){
 const explicit=explicitDay(source);if(explicit)return explicit;
 if(validDay(file.basename))return file.basename;
 const raw=frontmatter?.date;
 if(typeof raw==='string'&&validDay(raw.slice(0,10)))return raw.slice(0,10);
 if(raw instanceof Date&&Number.isFinite(+raw))return localDateString(raw);
 if(moment){const parsed=moment(file.basename,format,true);if(parsed.isValid())return parsed.format('YYYY-MM-DD');}
 throw Error('Data della daily note non riconosciuta. Aggiungi «date: YYYY-MM-DD» al blocco TEMPVS.');
}
// Parse only top-level fences; never interpret an example inside another code fence.
export function findDailyBlocks(markdown){
 const lines=markdown.match(/[^\n]*\n|[^\n]+$/g)||[];let fence=null,offset=0;const blocks=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i].replace(/\r?\n$/,'');
  if(!fence){
   const match=line.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/);
   if(match){fence={char:match[1][0],length:match[1].length,start:offset+lines[i].length,line:i,isTempvs:/^(tempvs|tempus)$/i.test(match[2].trim())};}
  }else if(new RegExp('^ {0,3}'+fence.char+'{'+fence.length+',}\\s*$').test(line)){
   if(fence.isTempvs)blocks.push({start:fence.start,end:offset,lineStart:fence.line,source:markdown.slice(fence.start,offset).replace(/\r?\n$/,'')});
   fence=null;
  }
  offset+=lines[i].length;
 }
 return blocks;
}
export function replaceDailyBlock(markdown,block,source){
 const newline=markdown.includes('\r\n')?'\r\n':'\n';
 return markdown.slice(0,block.start)+source.replace(/\r?\n/g,newline)+newline+markdown.slice(block.end);
}
export function parseDailySource(source,areas){
 blockIdentity(source);explicitDay(source);
 const requests=[];const used=new Set();
 for(const [index,line] of source.split(/\r?\n/).entries()){
  if(!line.trim()||blockPattern.test(line)||datePattern.test(line))continue;
  try{
   const metadata=line.match(rowPattern),raw=metadata?line.slice(0,metadata.index):line;
   const nextDay=/\s+\+1d\s*$/i.test(raw),input=raw.replace(/\s+\+1d\s*$/i,'');
   const rows=parseQuick(input,areas);
   const id=metadata?decodeURIComponent(metadata[1]):null;
   if(id&&(used.has(id)||rows.length!==1))throw Error('Ogni identificativo deve riferirsi a una sola sessione, senza duplicati.');
   if(id)used.add(id);
   for(const row of rows){
    if(!row.start)throw Error('Indica una fascia +HH:MM-HH:MM oppure un inizio +HH:MM.');
    const dayOffset=(row.dayOffset||0)+Number(nextDay?1:metadata?.[2]||0);
    if(dayOffset>1)throw Error('La sessione deve iniziare nella giornata della nota o in quella successiva.');
    requests.push({...row,sourceRow:index,...(id?{sessionId:id}:{}),...(dayOffset?{dayOffset}:{})});
   }
  }catch(error){throw Error('Riga '+(index+1)+': '+error.message.replace(/^Riga 1: /,''));}
 }
 return requests;
}
const dayAfter=day=>{const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+1);return localDateString(d);};
export const planningKey=session=>JSON.stringify([session.id,session.areaId,session.area,session.title,session.date,session.start,session.end,session.workMinutes,session.breakEnabled,session.customBreakMinutes,session.cycleMinutes,session.noteBlockId,Boolean(session.finished),session.timerStartedAt,session.timerEndsAt,session.manualRecordedAt,Boolean(session.manualSuperseded)]);
export const archivePlanningKey=state=>JSON.stringify({sessions:state.sessions.map(planningKey),defaults:state.defaults});
export const isLocked=(session,now=new Date())=>session.finished||session.actualSeconds>0||session.timerStartedAt||sessionBounds(session).start<=now;
export function daySessions(state,date,blockId){
 return state.sessions.filter(s=>!s.manualSuperseded&&(s.date===date||(blockId&&s.noteBlockId===blockId))).sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start);
}
// Keep identifiers in plugin data, never in the user's planning field.
export function serializeDailyPlan(sessions,date){
 const groups=[];
 for(const s of [...sessions].sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start)){
  if(s.date!==date&&s.date!==dayAfter(date))throw Error('Una sessione collegata è stata spostata fuori dalla giornata della nota.');
  const bounds=sessionBounds(s),gross=Math.round((bounds.end-bounds.start)/60000);
  const key=JSON.stringify([s.areaId,s.area||s.title,gross,s.workMinutes,s.breakEnabled,s.customBreakMinutes,s.cycleMinutes]);
  const last=groups.at(-1);
  if(last&&last.key===key&&+last.until===+bounds.start&&s.date===last.date&&+bounds.end-last.from<86400000){last.end=s.end;last.until=bounds.end;}
  else groups.push({key,date:s.date,area:s.area||s.title,start:s.start,end:s.end,gross,from:+bounds.start,until:bounds.end});
 }
 return groups.map(g=>(g.gross===1440?`${g.area} @1440m +${g.start}`:`${g.area} +${g.start}-${g.end} -${g.gross}m`)+(g.date!==date?' +1d':'')).join('\n');
}
// Compare source rows before expanding ranges: correcting one range must update
// its original sessions, while removing a historical row still preserves history.
function rowChanges(source,previousSource,areas,owned,date){
 if(previousSource===undefined)return {byRequest:new Map(),changedRows:new Set(),previousByRow:new Map(),addedRows:new Set()};
 const previous=parseDailySource(previousSource,areas),next=parseDailySource(source,areas);
 const group=(_text,requests)=>[...new Set(requests.map(r=>r.sourceRow))].map(row=>{const items=requests.filter(r=>r.sourceRow===row);return {row,text:JSON.stringify(items.map(r=>[r.areaId||r.area,r.minutes,r.start,r.dayOffset||0,r.cycleMinutes??null,r.focusMinutes??null,r.customBreakMinutes??null])),requests:items};});
 const before=group(previousSource,previous),after=group(source,next),matched=new Set(),remaining=[];
 for(const current of after){const index=before.findIndex((old,i)=>!matched.has(i)&&old.text===current.text);if(index>=0)matched.add(index);else remaining.push(current);}
 const old=before.filter((_,i)=>!matched.has(i)),byRequest=new Map(),changedRows=new Set(),previousByRow=new Map(),addedRows=new Set(remaining.map(r=>r.row));
 // Pair edited rows in their original order; extra removed rows retain history.
 for(let i=0;i<Math.min(old.length,remaining.length);i++){
  changedRows.add(remaining[i].row);
  const ids=old[i].requests.map(r=>owned.find(s=>!s.manualSuperseded&&s.date===(r.dayOffset?dayAfter(date):date)&&s.start===r.start&&(s.areaId?s.areaId===r.areaId:s.area===r.area)&&Math.round((sessionBounds(s).end-sessionBounds(s).start)/60000)===r.minutes)?.id);
  previousByRow.set(remaining[i].row,ids.filter(Boolean));
  remaining[i].requests.forEach((r,index)=>{if(ids[index])byRequest.set(r,ids[index]);});
 }
 // Requests are parsed again by the caller; use source row and position as keys.
 const indexed=new Map();for(const [request,id] of byRequest)indexed.set(request.sourceRow+':'+next.filter(r=>r.sourceRow===request.sourceRow).indexOf(request),id);
 return {byRequest:indexed,changedRows,previousByRow,addedRows};
}
export function recordedFocusSeconds(session,until=new Date()){
 const bounds=sessionBounds(session);let at=+bounds.start,total=0,end=Math.min(+bounds.end,+until);
 while(at<end){const phase=getPhase(session,new Date(at)),next=Math.min(end,+phase.end);if(next<=at)break;if(phase.kind==='work')total+=(next-at)/1000;at=next;}
 return total;
}
function manualRecord(session,now){
 const result={...session,actualSeconds:recordedFocusSeconds(session,now),actualSource:'manual',manualRecordedAt:now.toISOString()};
 if(sessionBounds(session).end<=now)result.finished=true;
 return result;
}
function originalRecord(session){
 if(session.manualOriginal)return session.manualOriginal;
 const {manualOriginal,...original}=session;return JSON.parse(JSON.stringify(original));
}
function correctNoteWork(previous,seconds){
 const work=previous?.noteWork||{},total=Object.values(work).reduce((n,s)=>n+s,0);
 if(total>0){const baseline=Math.max(previous.actualSeconds||0,total);return Object.fromEntries(Object.entries(work).map(([id,s])=>[id,s*seconds/baseline]));}
 return previous?.noteEstimateId?{[previous.noteEstimateId]:seconds}:{};
}
export function prepareDailyPlan({source,date,blockId,state,previousSource,now=new Date(),id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}){
 if(!validDay(date))throw Error('Data non valida.');
 const areas=state.defaults.simple.areas,requests=parseDailySource(source,areas),owned=state.sessions.filter(s=>s.noteBlockId===blockId);
 const changes=rowChanges(source,previousSource,areas,owned,date),positions=new Map();
 const candidates=[],claimed=new Set(),correctionIds=[],correctedRows=new Set(),changedIntervals=new Set();
 for(const request of requests){
  const dateOf=request.dayOffset?dayAfter(date):date,start=dateTime(dateOf,request.start),elapsed=start<=now;
  const position=positions.get(request.sourceRow)||0;positions.set(request.sourceRow,position+1);
  let existing=request.sessionId?state.sessions.find(s=>s.id===request.sessionId):null;
  if(request.sessionId&&!existing){
   if(state.syncDeleted?.sessions?.includes(request.sessionId))throw Error('La nota contiene una sessione eliminata dal plugin. Aggiorna prima il blocco dalle sessioni.');
   throw Error('Identificativo sessione non presente nel plugin. Rimuovi il commento identificativo per creare una nuova sessione.');
  }
  const exact=s=>s.date===dateOf&&s.start===request.start&&(s.areaId?s.areaId===request.areaId:s.area===request.area)&&Math.round((sessionBounds(s).end-sessionBounds(s).start)/60000)===request.minutes;
  if(!existing&&elapsed){const matched=changes.byRequest.get(request.sourceRow+':'+position);existing=owned.find(s=>s.id===matched&&!claimed.has(s.id));}
  if(!existing)existing=state.sessions.find(s=>!claimed.has(s.id)&&!s.manualSuperseded&&(!s.noteBlockId||s.noteBlockId===blockId)&&exact(s));
  if(existing?.noteBlockId&&existing.noteBlockId!==blockId)throw Error('Una sessione appartiene già a un altro blocco TEMPVS.');
  if(existing&&claimed.has(existing.id))throw Error('La stessa sessione compare due volte nel blocco.');
  const samePause=existing&&(!request.cycleMinutes||request.rangeSession||request.cycleMinutes===existing.cycleMinutes)&&(request.focusMinutes===undefined||request.focusMinutes===existing.workMinutes)&&(request.customBreakMinutes===undefined||request.customBreakMinutes===existing.customBreakMinutes);
  const correction=elapsed&&(!existing||!exact(existing)||!samePause||changes.changedRows.has(request.sourceRow)||changes.addedRows.has(request.sourceRow));
  if(existing&&isLocked(existing,now)&&!correction&&exact(existing)&&samePause){candidates.push({...existing,noteBlockId:blockId});claimed.add(existing.id);continue;}
  // Retrospective reservations are allowed only here; future planning elsewhere
  // continues to reject past starts. The timer still uses the corrected bounds.
  const result=planSessions([request],[],[],state.defaults,new Date(Math.min(+now,+start)),()=>existing?.id||id(),date);
  let session=result.sessions[0];
  if(existing){
   session={...existing,...session};
   if(request.cycleMinutes!==undefined)delete session.customBreakMinutes;
   if(request.focusMinutes!==undefined||request.customBreakMinutes!==undefined)delete session.cycleMinutes;
   if(request.cycleMinutes===undefined&&request.focusMinutes===undefined&&request.customBreakMinutes===undefined){for(const key of ['workMinutes','breakEnabled','cycleMinutes','customBreakMinutes'])if(existing[key]!==undefined)session[key]=existing[key];}
   // Otherwise sessionBounds would continue reading the old immediate timer.
   if(!exact(existing)||correction){delete session.timerStartedAt;delete session.timerEndsAt;}
  }
  session.noteBlockId=blockId;
  if(!existing||!exact(existing)||correction)changedIntervals.add(session.id);
  if(correction){delete session.manualSuperseded;session=manualRecord(session,now);if(existing)session.manualOriginal=originalRecord(existing);correctionIds.push(session.id);correctedRows.add(request.sourceRow);}
  candidates.push(session);claimed.add(session.id);
 }
 const omitted=owned.filter(s=>!claimed.has(s.id));
 // A shortened corrected range no longer credits surplus old slots; retain their
 // original measurements for recovery instead of counting both old and new time.
 const previousCorrected=new Set([...correctedRows].flatMap(row=>changes.previousByRow.get(row)||[]));
 const superseded=omitted.filter(s=>isLocked(s,now)&&previousCorrected.has(s.id));
 const retainedIds=omitted.filter(s=>isLocked(s,now)).map(s=>s.id);
 const removed=omitted.filter(s=>!isLocked(s,now));
 const other=state.sessions.filter(s=>!claimed.has(s.id)&&!removed.some(r=>r.id===s.id)&&!superseded.some(r=>r.id===s.id));
 // Completed records must also be checked: their hours are manually declared work.
 const occupied=[...other,...candidates].filter(s=>!s.manualSuperseded&&(!s.finished||s.actualSource==='manual'||s.actualSeconds>0));
 for(const session of candidates)if(changedIntervals.has(session.id)&&occupied.some(s=>s.id!==session.id&&sessionsOverlap(session,s)))throw Error('Le righe si sovrappongono a una sessione della giornata.');
 normalizeArchive({...state,sessions:[...other,...candidates]});
 return {date,blockId,sessions:candidates,correctionIds,supersededIds:superseded.map(s=>s.id),retainedIds,removeIds:removed.map(s=>s.id),unusedMinutes:requests.reduce((n,r)=>n+(r.unusedMinutes||0),0),planningKey:archivePlanningKey(state),recordedAt:now.toISOString(),source,previousSource};
}
export function applyDailyPlan(state,proposal){
 const corrected=new Set(proposal.correctionIds||[]),affected=new Set([...proposal.sessions.map(s=>s.id),...proposal.removeIds]),current=new Map(state.sessions.map(s=>[s.id,s]));
 state.sessions=state.sessions.filter(s=>!affected.has(s.id)).concat(proposal.sessions.map(s=>{
  const previous=current.get(s.id);
  if(corrected.has(s.id))return {...s,noteWork:correctNoteWork(previous||s,s.actualSeconds),...(previous?{manualOriginal:originalRecord(previous),paused:previous.paused}:{})};
  return {...s,...(previous?{actualSeconds:previous.actualSeconds||0,...(previous.noteWork?{noteWork:previous.noteWork}:{}),paused:previous.paused}:{})};
 }));
 for(const session of state.sessions)if(proposal.supersededIds?.includes(session.id))Object.assign(session,{manualOriginal:originalRecord(session),actualSeconds:0,noteWork:{},finished:true,manualSuperseded:true,manualRecordedAt:proposal.recordedAt,actualSource:'manual'});
 const historical=new Map(state.sessions.filter(s=>corrected.has(s.id)||proposal.supersededIds?.includes(s.id)).map(s=>[s.id,s]));
 state.history=state.history.map(h=>{const s=historical.get(h.sessionId);return s?{...h,title:s.title,date:s.date,area:s.area,areaId:s.areaId,minutes:s.actualSeconds/60,measured:true,actualSource:'manual',noteWork:s.noteWork}:h;});
 state.syncDeleted.sessions=[...new Set([...state.syncDeleted.sessions,...proposal.removeIds])];
}
