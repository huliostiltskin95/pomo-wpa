import {sessionBounds, localDateString, formatTime, validSession, hasSessionOverlaps, getPhase, normalizeSession} from './tempo-core.js';
export function normalizeArchive(data) {
  if (!data || !Array.isArray(data.sessions) || data.sessions.some(s=>!validSession(s)) || new Set(data.sessions.map(s=>s.id)).size!==data.sessions.length) throw Error('Archivio sessioni non valido.');
  if(data.sessions.some(s=>s.actualSeconds!==undefined&&(!Number.isFinite(s.actualSeconds)||s.actualSeconds<0)))throw Error('Tempo registrato non valido.');
  if(data.defaults?.workMinutes!==undefined&&(!Number.isInteger(data.defaults.workMinutes)||data.defaults.workMinutes<1||data.defaults.workMinutes>240))throw Error('Durata del ciclo non valida.');
  if(data.sessions.some(s=>(s.timerStartedAt||s.timerEndsAt)&&(!Number.isFinite(+new Date(s.timerStartedAt))||!Number.isFinite(+new Date(s.timerEndsAt))||new Date(s.timerEndsAt)<=new Date(s.timerStartedAt))))throw Error('Orari timer non validi.');
  const config=data.defaults?.simple || {};
  if(config.areas && (!Array.isArray(config.areas)||config.areas.some(a=>!a || typeof a.name!=='string'||!a.name.trim()||typeof a.description!=='string')))throw Error('Aree non valide.');
  if(config.windows && (!Array.isArray(config.windows)||config.windows.some(w=>!validSession({...w,id:'window',title:'window',workMinutes:25}))))throw Error('Fasce non valide.');
  if(data.history && (!Array.isArray(data.history)||data.history.some(h=>!h || typeof h.sessionId!=='string'||!Number.isFinite(h.minutes)||h.minutes<0)))throw Error('Storico non valido.');
  const names=[...new Set(['Studio','Lavoro','Personale',...data.sessions.map(s=>s.area||s.title)])];
  return {...data,sessions:data.sessions.map(normalizeSession),tasks:data.tasks||[],history:data.history||[],syncDeleted:data.syncDeleted||{tasks:[],sessions:[]},defaults:{...data.defaults,workMinutes:data.defaults?.workMinutes||25,breakEnabled:data.defaults?.breakEnabled!==false,simple:{...config,areas:config.areas||names.map(name=>({name,description:''})),windows:config.windows||[]}}};
}
export function planSessions(requests, windows, existing, defaults, now=new Date(), id=()=>crypto.randomUUID()) {
  const result=[];let remainder=0;
  for(const request of requests){
    let left=request.minutes;
    for(const window of [...windows].sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start)){
      const bounds=sessionBounds(window);let cursor=Math.max(+bounds.start,Math.ceil(+now/60000)*60000);
      const occupied=[...existing,...result].map(sessionBounds).sort((a,b)=>a.start-b.start);
      const gaps=[];
      for(const block of occupied){if(+block.end<=cursor||+block.start>=+bounds.end)continue;if(+block.start>cursor)gaps.push([cursor,Math.min(+block.start,+bounds.end)]);cursor=Math.max(cursor,+block.end);}
      if(cursor<+bounds.end)gaps.push([cursor,+bounds.end]);
      for(const [start,end] of gaps){const minutes=Math.min(left,Math.floor((end-start)/60000),1439);if(minutes<=0)continue;const finish=new Date(start+minutes*60000);result.push({id:id(),title:request.area,area:request.area,date:localDateString(new Date(start)),start:formatTime(new Date(start)),end:formatTime(finish),workMinutes:defaults.workMinutes,breakEnabled:defaults.breakEnabled,actualSeconds:0});left-=minutes;if(!left)break;}
      if(!left)break;
    }
    remainder+=left;
  }
  if(hasSessionOverlaps([...existing,...result]))throw Error('Le sessioni si sovrappongono.');
  return {sessions:result,remainder};
}
export function parseQuick(text,areas) {
  return text.trim().split('\n').filter(s=>s.trim()).map(line=>{
    const match=line.trim().match(/^(.+?)\s+@(\d+(?:[.,]\d+)?)\s*(h|min|m)$/i);
    if(!match)throw Error('Usa una riga per sessione: Studio @2h oppure Lavoro @45m.');
    const area=areas.find(a=>a.name.toLocaleLowerCase()===match[1].trim().toLocaleLowerCase());
    const minutes=Math.round(Number(match[2].replace(',','.'))*(match[3].toLowerCase()==='h'?60:1));
    if(!area || minutes<1 || minutes>10080)throw Error('Controlla area e durata (da 1 minuto a 168 ore).');
    return {area:area.name,minutes};
  });
}
// Only observable time counts. Long suspended/offline gaps never become completed work.
export function measuredFocus(session,from,to) {
  if(to-from<=0||to-from>15000||session.paused||session.finished)return 0;
  const bounds=sessionBounds(session);let cursor=Math.max(+from,+bounds.start),end=Math.min(+to,+bounds.end),total=0;
  while(cursor<end){const phase=getPhase(session,new Date(cursor));const next=Math.min(end,+phase.end);if(next<=cursor)break;if(phase.kind==='work')total+=next-cursor;cursor=next;}
  return total/1000;
}
