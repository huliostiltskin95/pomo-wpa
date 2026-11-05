import {sessionBounds, localDateString, formatTime, validSession, hasSessionOverlaps, getPhase, normalizeSession, dateTime, pauseMinutes} from './tempo-core.js';

// Color values are stored with areas and survive JSON backup and Dropbox merge.
export const DEFAULT_AREA_COLORS = Object.freeze({
  Studio: '#D65B56', Lavoro: '#29845C', Personale: '#D6A323'
});
export function normalizeAreaColor(value, name = '') {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toUpperCase() : (DEFAULT_AREA_COLORS[name] || '#54769B');
}
export function focusCycle(focusMinutes, breakEnabled = true) {
  if (!Number.isInteger(focusMinutes) || focusMinutes < 1 || focusMinutes > 240)
    throw Error('La concentrazione per ciclo deve durare da 1 a 240 minuti.');
  return {focusMinutes, breakMinutes: breakEnabled ? pauseMinutes(focusMinutes) : 0};
}
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
  const storedAreas=config.areas||names.map(name=>({name,description:''}));
  const areas=storedAreas.map(area=>({
    ...area,
    color:normalizeAreaColor(area.color ?? data.appearance?.areaColors?.[area.name],area.name)
  }));
  return {...data,sessions:data.sessions.map(normalizeSession),tasks:data.tasks||[],history:data.history||[],syncDeleted:data.syncDeleted||{tasks:[],sessions:[]},defaults:{...data.defaults,workMinutes:data.defaults?.workMinutes||25,breakEnabled:data.defaults?.breakEnabled!==false,simple:{...config,areas,windows:config.windows||[]}}};
}
export function planSessions(requests, windows, existing, defaults, now=new Date(), id=()=>crypto.randomUUID(), selectedDate=localDateString(now)) {
  const result=[];let remainder=0;
  const cycleFor=request=>focusCycle(request.focusMinutes ?? defaults.workMinutes,defaults.breakEnabled).focusMinutes;
  // Reject invalid focus overrides even when no window can accommodate the request.
  for(const request of requests)cycleFor(request);
  // Reserve explicit times first so automatic rows cannot occupy them.
  for(const request of requests.filter(r=>r.start)){
    if(request.minutes>1440)throw Error('Una sessione con orario fisso può durare al massimo 24 ore.');
    const start=dateTime(selectedDate,request.start),end=new Date(+start+request.minutes*60000);
    const session={id:id(),title:request.area,area:request.area,date:selectedDate,start:request.start,end:formatTime(end),workMinutes:cycleFor(request),breakEnabled:defaults.breakEnabled!==false,actualSeconds:0};
    if(!validSession(session))throw Error('Data o orario non valido.');
    if(+start<+now)throw Error('L’orario '+request.start+' è già passato nel giorno scelto. Cambia giorno o orario.');
    result.push(session);
  }
  if(hasSessionOverlaps([...existing,...result]))throw Error('Gli orari indicati si sovrappongono a un’altra sessione.');
  for(const request of requests.filter(r=>!r.start)){
    let left=request.minutes;
    for(const window of [...windows].sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start)){
      const bounds=sessionBounds(window);let cursor=Math.max(+bounds.start,Math.ceil(+now/60000)*60000);
      const occupied=[...existing,...result].map(sessionBounds).sort((a,b)=>a.start-b.start);
      const gaps=[];
      for(const block of occupied){if(+block.end<=cursor||+block.start>=+bounds.end)continue;if(+block.start>cursor)gaps.push([cursor,Math.min(+block.start,+bounds.end)]);cursor=Math.max(cursor,+block.end);}
      if(cursor<+bounds.end)gaps.push([cursor,+bounds.end]);
      for(const [start,end] of gaps){const minutes=Math.min(left,Math.floor((end-start)/60000),1439);if(minutes<=0)continue;const finish=new Date(start+minutes*60000);result.push({id:id(),title:request.area,area:request.area,date:localDateString(new Date(start)),start:formatTime(new Date(start)),end:formatTime(finish),workMinutes:cycleFor(request),breakEnabled:defaults.breakEnabled!==false,actualSeconds:0});left-=minutes;if(!left)break;}
      if(!left)break;
    }
    remainder+=left;
  }
  if(hasSessionOverlaps([...existing,...result]))throw Error('Le sessioni si sovrappongono.');
  return {sessions:result,remainder};
}
export function parseQuick(text,areas) {
  return text.trim().split('\n').filter(s=>s.trim()).map(line=>{
    const match=line.trim().match(/^(.+?)\s+@(\d+(?:[.,]\d+)?)\s*(h|min|m)(.*)$/i);
    if(!match)throw Error('Usa: Studio @2h +08:30 ~40m (orario e ciclo facoltativi).');
    const area=areas.find(a=>a.name.toLocaleLowerCase()===match[1].trim().toLocaleLowerCase());
    const minutes=Math.round(Number(match[2].replace(',','.'))*(match[3].toLowerCase()==='h'?60:1));
    if(!area || minutes<1 || minutes>10080)throw Error('Controlla area e durata lorda (da 1 minuto a 168 ore).');
    let start,focusMinutes;
    for(const token of match[4].trim().split(/\s+/).filter(Boolean)) {
      if(/^\+([01]\d|2[0-3]):[0-5]\d$/.test(token) && !start)
        start=token.slice(1);
      else if(/^~\d{1,3}m?$/i.test(token) && focusMinutes===undefined)
        focusMinutes=focusCycle(Number(token.slice(1).replace(/m$/i,''))).focusMinutes;
      else throw Error('Opzione non valida: '+token+'. Usa +HH:MM e/o ~40m.');
    }
    return {area:area.name,minutes,...(start?{start}:{}),...(focusMinutes!==undefined?{focusMinutes}:{})};
  });
}
// Only observable time counts. Long suspended/offline gaps never become completed work.
export function measuredFocus(session,from,to) {
  if(to-from<=0||to-from>15000||session.paused||session.finished)return 0;
  const bounds=sessionBounds(session);let cursor=Math.max(+from,+bounds.start),end=Math.min(+to,+bounds.end),total=0;
  while(cursor<end){const phase=getPhase(session,new Date(cursor));const next=Math.min(end,+phase.end);if(next<=cursor)break;if(phase.kind==='work')total+=next-cursor;cursor=next;}
  return total/1000;
}
