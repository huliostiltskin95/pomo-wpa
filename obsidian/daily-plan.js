import {parseQuick,planSessions,normalizeArchive} from '../core/tempo-simple.js';
import {localDateString,sessionBounds,formatTime,hasSessionOverlaps} from '../core/tempo-core.js';

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
    requests.push({...row,...(id?{sessionId:id}:{}),...(dayOffset?{dayOffset}:{})});
   }
  }catch(error){throw Error('Riga '+(index+1)+': '+error.message.replace(/^Riga 1: /,''));}
 }
 return requests;
}
const dayAfter=day=>{const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+1);return localDateString(d);};
export const planningKey=session=>JSON.stringify([session.id,session.areaId,session.area,session.title,session.date,session.start,session.end,session.workMinutes,session.breakEnabled,session.customBreakMinutes,session.cycleMinutes,session.noteBlockId,Boolean(session.finished),Boolean(session.timerStartedAt)]);
export const archivePlanningKey=state=>JSON.stringify({sessions:state.sessions.map(planningKey),defaults:state.defaults});
export const isLocked=(session,now=new Date())=>session.finished||session.actualSeconds>0||session.timerStartedAt||sessionBounds(session).start<=now;
export function daySessions(state,date,blockId){
 return state.sessions.filter(s=>s.date===date||(blockId&&s.noteBlockId===blockId)).sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start);
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
export function prepareDailyPlan({source,date,blockId,state,now=new Date(),id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}){
 if(!validDay(date))throw Error('Data non valida.');
 const requests=parseDailySource(source,state.defaults.simple.areas),owned=state.sessions.filter(s=>s.noteBlockId===blockId);
 const candidates=[],claimed=new Set();
 for(const request of requests){
  const dateOf=request.dayOffset?dayAfter(date):date;
  let existing=request.sessionId?state.sessions.find(s=>s.id===request.sessionId):null;
  if(request.sessionId&&!existing){
   if(state.syncDeleted?.sessions?.includes(request.sessionId))throw Error('La nota contiene una sessione eliminata dal plugin. Aggiorna prima il blocco dalle sessioni.');
   throw Error('Identificativo sessione non presente nel plugin. Rimuovi il commento identificativo per creare una nuova sessione.');
  }
  const exact=s=>s.date===dateOf&&s.start===request.start&&(s.areaId?s.areaId===request.areaId:s.area===request.area)&&Math.round((sessionBounds(s).end-sessionBounds(s).start)/60000)===request.minutes;
  if(!existing)existing=state.sessions.find(s=>!claimed.has(s.id)&&(!s.noteBlockId||s.noteBlockId===blockId)&&exact(s));
  if(existing?.noteBlockId&&existing.noteBlockId!==blockId)throw Error('Una sessione appartiene già a un altro blocco TEMPVS.');
  if(existing&&claimed.has(existing.id))throw Error('La stessa sessione compare due volte nel blocco.');
  if(existing&&isLocked(existing,now)){
   if(!exact(existing)||!request.rangeSession&&request.cycleMinutes!==undefined&&request.cycleMinutes!==existing.cycleMinutes||request.focusMinutes!==undefined&&request.focusMinutes!==existing.workMinutes||request.customBreakMinutes!==undefined&&request.customBreakMinutes!==existing.customBreakMinutes)
    throw Error('Le sessioni già avviate o concluse non possono essere riprogrammate dalla nota.');
   candidates.push({...existing,noteBlockId:blockId});claimed.add(existing.id);continue;
  }
  const result=planSessions([request],[],[],state.defaults,now,()=>existing?.id||id(),date);
  let session=result.sessions[0];
  if(existing){
   session={...existing,...session};
   if(request.cycleMinutes!==undefined)delete session.customBreakMinutes;
   if(request.focusMinutes!==undefined||request.customBreakMinutes!==undefined)delete session.cycleMinutes;
   // Only legacy rows without a pause modifier inherit existing settings.
   if(request.cycleMinutes===undefined&&request.focusMinutes===undefined&&request.customBreakMinutes===undefined){
    for(const key of ['workMinutes','breakEnabled','cycleMinutes','customBreakMinutes'])if(existing[key]!==undefined)session[key]=existing[key];
   }
  }
  session.noteBlockId=blockId;candidates.push(session);claimed.add(session.id);
 }
 const omitted=owned.filter(s=>!claimed.has(s.id));
 // Removing a historical row hides it from the planning field, never from the archive.
 const retainedIds=omitted.filter(s=>isLocked(s,now)).map(s=>s.id);
 const removed=omitted.filter(s=>!isLocked(s,now));
 const other=state.sessions.filter(s=>!claimed.has(s.id)&&!removed.some(r=>r.id===s.id));
 if(hasSessionOverlaps([...other,...candidates].filter(s=>!s.finished)))throw Error('Le righe si sovrappongono a una sessione della giornata.');
 normalizeArchive({...state,sessions:[...other,...candidates]});
 return {date,blockId,sessions:candidates,retainedIds,removeIds:removed.map(s=>s.id),unusedMinutes:requests.reduce((n,r)=>n+(r.unusedMinutes||0),0),planningKey:archivePlanningKey(state),source};
}
export function applyDailyPlan(state,proposal){
 const affected=new Set([...proposal.sessions.map(s=>s.id),...proposal.removeIds]);
 const current=new Map(state.sessions.map(s=>[s.id,s]));
 state.sessions=state.sessions.filter(s=>!affected.has(s.id)).concat(proposal.sessions.map(s=>({...s,...(current.has(s.id)?{actualSeconds:current.get(s.id).actualSeconds||0,...(current.get(s.id).noteWork?{noteWork:current.get(s.id).noteWork}:{}),paused:current.get(s.id).paused}:{} )})));
 state.syncDeleted.sessions=[...new Set([...state.syncDeleted.sessions,...proposal.removeIds])];
}

