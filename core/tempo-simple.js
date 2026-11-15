import {validateEstimates} from './tempo-estimates.js';
import {normalizeAreaLinks} from './tempo-areas.js';
import {sessionBounds, localDateString, formatTime, validSession, hasSessionOverlaps, getPhase, normalizeSession, dateTime, pauseMinutes, durationLabel} from './tempo-core.js';

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
// Gross cycle length includes both focus and its following pause (exact 5:1; integer gross minutes give whole-second phases).
export function grossCycle(cycleMinutes) {
  if (!Number.isInteger(cycleMinutes) || cycleMinutes < 1 || cycleMinutes > 1439)
    throw Error('Il pomodoro lordo deve durare da 1 a 1439 minuti interi.');
  const focusMinutes=cycleMinutes*5/6;
  return {focusMinutes,breakMinutes:cycleMinutes-focusMinutes};
}
// A custom pause is a total budget inside the gross duration, never an extra cycle.
export function customPause(minutes, grossMinutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= grossMinutes)
    throw Error('La pausa deve essere un numero intero di minuti, da 0 a meno della durata lorda.');
  return minutes;
}
export function sessionPauseLabel(session) {
  if (session.customBreakMinutes !== undefined) {
    const gross = Math.round((sessionBounds(session).end-sessionBounds(session).start)/60000);
    return (gross-session.customBreakMinutes)+' min focus + '+session.customBreakMinutes+' min pausa finale · '+gross+' min lordi';
  }
  return durationLabel(session.workMinutes)+' focus'+(session.breakEnabled?' / '+durationLabel(session.cycleMinutes!==undefined?session.cycleMinutes-session.workMinutes:pauseMinutes(session.workMinutes))+' pausa automatica':' · senza pause');
}
/**
 * The manual timer reserves gross minutes from the exact instant the user starts it.
 * Automatic pauses fit inside this deadline, they never extend it.
 */
export function manualSessionEnd(start, grossMinutes) {
  const startedAt = start instanceof Date ? start : new Date(start);
  const minutes = Number(grossMinutes);
  if (!Number.isFinite(+startedAt) || !Number.isInteger(minutes) || minutes < 1 || minutes > 1439)
    throw Error('La durata lorda deve essere compresa tra 1 e 1439 minuti.');
  return new Date(startedAt.getTime() + minutes * 60000);
}
export function normalizeArchive(data) {
  if (!data || !Array.isArray(data.sessions) || data.sessions.some(s=>!validSession(s)) || new Set(data.sessions.map(s=>s.id)).size!==data.sessions.length) throw Error('Archivio sessioni non valido.');
  if(data.sessions.some(s=>s.actualSeconds!==undefined&&(!Number.isFinite(s.actualSeconds)||s.actualSeconds<0)))throw Error('Tempo registrato non valido.');
  if(data.defaults?.workMinutes!==undefined&&(!Number.isInteger(data.defaults.workMinutes)||data.defaults.workMinutes<1||data.defaults.workMinutes>240))throw Error('Durata del ciclo non valida.');
  if(data.sessions.some(s=>(s.timerStartedAt||s.timerEndsAt)&&(!Number.isFinite(+new Date(s.timerStartedAt))||!Number.isFinite(+new Date(s.timerEndsAt))||new Date(s.timerEndsAt)<=new Date(s.timerStartedAt))))throw Error('Orari timer non validi.');
  const config=data.defaults?.simple || {};
  validateEstimates(config.noteEstimates);
  for(const item of [...data.sessions,...(data.history||[])])if(item.noteWork!==undefined&&(!item.noteWork||typeof item.noteWork!=='object'||Array.isArray(item.noteWork)||Object.values(item.noteWork).some(v=>!Number.isFinite(v)||v<0)))throw Error('Avanzamento note non valido.');
  if(config.areas && (!Array.isArray(config.areas)||!config.areas.length||config.areas.some(a=>!a || typeof a.name!=='string'||!a.name.trim()||typeof a.description!=='string')))throw Error('Aree non valide.');
  if(config.windows && (!Array.isArray(config.windows)||config.windows.some(w=>!validSession({...w,id:'window',title:'window',workMinutes:25}))))throw Error('Fasce non valide.');
  if(data.history && (!Array.isArray(data.history)||data.history.some(h=>!h || typeof h.sessionId!=='string'||!h.sessionId.trim()||!Number.isFinite(h.minutes)||h.minutes<0)))throw Error('Storico non valido.');
  if(data.tasks!==undefined&&(!Array.isArray(data.tasks)||data.tasks.some(t=>!t||typeof t.id!=='string'||!t.id||(t.title!==undefined&&typeof t.title!=='string'))||new Set(data.tasks.map(t=>t.id)).size!==data.tasks.length))throw Error('Attività non valide.');
  if(data.history&&new Set(data.history.map(h=>h.sessionId)).size!==data.history.length)throw Error('Storico duplicato.');
  if(data.syncDeleted!==undefined&&(!data.syncDeleted||['tasks','sessions','history'].some(k=>data.syncDeleted[k]!==undefined&&(!Array.isArray(data.syncDeleted[k])||data.syncDeleted[k].some(id=>typeof id!=='string'||!id)))))throw Error('Cancellazioni non valide.');
  const names=[...new Set(['Studio','Lavoro','Personale',...data.sessions.map(s=>s.area||s.title)])];
  const storedAreas=config.areas||names.map(name=>({name,description:''}));
  const areas=storedAreas.map(area=>({
    ...area,
    color:normalizeAreaColor(area.color ?? data.appearance?.areaColors?.[area.name],area.name)
  }));
  const linked=normalizeAreaLinks(data,areas);
  return {...data,sessions:linked.sessions.map(normalizeSession),tasks:linked.tasks,history:linked.history,syncDeleted:{tasks:[],sessions:[],...data.syncDeleted},defaults:{...data.defaults,workMinutes:data.defaults?.workMinutes||25,breakEnabled:data.defaults?.breakEnabled!==false,simple:{...config,areas:linked.areas.map(a=>({...a,color:normalizeAreaColor(a.color,a.name)})),windows:config.windows||[]}}};
}
export function planSessions(requests, windows, existing, defaults, now=new Date(), id=()=>crypto.randomUUID(), selectedDate=localDateString(now)) {
  if(!Array.isArray(requests)||!Array.isArray(windows)||!Array.isArray(existing))throw Error('Richieste e fasce non valide.');
  if(!Number.isFinite(+now))throw Error('Data attuale non valida.');
  const result=[];let remainder=0;
  const cycleFor=request=>request.cycleMinutes!==undefined?grossCycle(request.cycleMinutes).focusMinutes:focusCycle(request.focusMinutes ?? defaults.workMinutes,defaults.breakEnabled).focusMinutes;
  const cycleSettings=request=>request.cycleMinutes!==undefined?{cycleMinutes:request.cycleMinutes,breakEnabled:true}:{};
  // Reject invalid focus overrides even when no window can accommodate the request.
  for(const request of requests){
    if(!request || typeof request.area!=='string' || !request.area.trim() ||
       !Number.isInteger(request.minutes) || request.minutes<1 || request.minutes>10080)
      throw Error('Indica area e durata lorda da 1 a 10080 minuti interi.');
    if(request.dayOffset!==undefined && ![0,1].includes(request.dayOffset))
      throw Error('Il giorno della sessione deve essere quello selezionato o il successivo.');
    if(request.start!==undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(request.start))
      throw Error('Orario fisso non valido: usa HH:MM.');
    cycleFor(request);
    if(request.cycleMinutes!==undefined){
      if(request.focusMinutes!==undefined||request.customBreakMinutes!==undefined)throw Error('Usa un solo tipo di ciclo: -minuti, ~focus oppure !pausa finale.');
      continue;
    }
    const pause=request.customBreakMinutes ?? defaults.customBreakMinutes;
    if(pause!==undefined)customPause(pause,request.minutes);
  }
  const applyPause=(request, sessions)=>{
    if(request.cycleMinutes!==undefined)return;
    let pause=request.customBreakMinutes ?? defaults.customBreakMinutes;
    if(pause===undefined)return;
    // Keep a single pause budget across fragments, starting at the end of the last one.
    for(const session of [...sessions].reverse()){
      const gross=Math.round((sessionBounds(session).end-sessionBounds(session).start)/60000);
      session.customBreakMinutes=Math.min(pause,gross);
      session.breakEnabled=session.customBreakMinutes>0;
      pause-=session.customBreakMinutes;
    }
  };
  // Reserve explicit times first so automatic rows cannot occupy them.
  for(const request of requests.filter(r=>r.start)){
    if(request.minutes>1440)throw Error('Una sessione con orario fisso può durare al massimo 24 ore.');
    const start=dateTime(selectedDate,request.start);
    if(request.dayOffset)start.setDate(start.getDate()+request.dayOffset);
    const end=new Date(+start+request.minutes*60000);
    const session={id:id(),title:request.area,area:request.area,...(request.areaId?{areaId:request.areaId}:{}),date:localDateString(start),start:request.start,end:formatTime(end),workMinutes:cycleFor(request),breakEnabled:defaults.breakEnabled!==false,...cycleSettings(request),actualSeconds:0};
    if(!validSession(session))throw Error('Data o orario non valido.');
    if(+start<+now)throw Error('L’orario '+request.start+' è già passato nel giorno scelto. Cambia giorno o orario.');
    applyPause(request,[session]);
    result.push(session);
  }
  if(hasSessionOverlaps([...existing,...result]))throw Error('Gli orari indicati si sovrappongono a un’altra sessione.');
  for(const request of requests.filter(r=>!r.start)){
    const first=result.length;
    let left=request.minutes;
    for(const window of [...windows].sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start)){
      const bounds=sessionBounds(window);let cursor=Math.max(+bounds.start,Math.ceil(+now/60000)*60000);
      const occupied=[...existing,...result].map(sessionBounds).sort((a,b)=>a.start-b.start);
      const gaps=[];
      for(const block of occupied){if(+block.end<=cursor||+block.start>=+bounds.end)continue;if(+block.start>cursor)gaps.push([cursor,Math.min(+block.start,+bounds.end)]);cursor=Math.max(cursor,+block.end);}
      if(cursor<+bounds.end)gaps.push([cursor,+bounds.end]);
      for(const [start,end] of gaps){const minutes=Math.min(left,Math.floor((end-start)/60000),1439);if(minutes<=0)continue;const finish=new Date(start+minutes*60000);result.push({id:id(),title:request.area,area:request.area,...(request.areaId?{areaId:request.areaId}:{}),date:localDateString(new Date(start)),start:formatTime(new Date(start)),end:formatTime(finish),workMinutes:cycleFor(request),breakEnabled:defaults.breakEnabled!==false,...cycleSettings(request),actualSeconds:0});left-=minutes;if(!left)break;}
      if(!left)break;
    }
    if(!left)applyPause(request,result.slice(first));
    remainder+=left;
  }
  if(hasSessionOverlaps([...existing,...result]))throw Error('Le sessioni si sovrappongono.');
  return {sessions:result,remainder,unusedMinutes:requests.reduce((n,r)=>n+(r.unusedMinutes||0),0)};
}
// The legacy form keeps "-60m" as the Pomodoro gross cycle.
// A fixed range uses "-30m" as the gross duration of each separate session.
export function parseQuick(text,areas) {
  return text.split('\n').flatMap((line,index)=>{
    if(!line.trim())return [];
    try{
    const input=line.trim();
    const range=input.match(/^(.+?)\s+\+\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*-\s*((?:[01]\d|2[0-3]):[0-5]\d)\s+-\s*(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
    if(range){
      const area=areas.find(a=>a.name.trim().replace(/\s+/g,' ').toLocaleLowerCase()===range[1].trim().replace(/\s+/g,' ').toLocaleLowerCase());
      if(!area)throw Error('Area sconosciuta: '+range[1].trim()+'.');
      const minutesOf=time=>{const [hours,minutes]=time.split(':').map(Number);return hours*60+minutes;};
      const timeOf=minutes=>String(Math.floor((minutes%1440)/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
      const from=minutesOf(range[2]),until=minutesOf(range[3]);
      const total=(until-from+1440)%1440,value=Number(range[4].replace(',','.'))*(range[5].toLowerCase()==='h'?60:1);
      const each=Math.round(value);
      if(Math.abs(value-each)>1e-9)throw Error('La durata lorda deve corrispondere a minuti interi.');
      if(!total)throw Error('La fascia deve avere inizio e fine diversi.');
      if(!Number.isInteger(each)||each<1||each>1439)throw Error('La durata lorda di una sessione deve essere da 1 a 1439 minuti.');
      const sessions=[];
      if(each>total)throw Error('La fascia è più breve di una sessione lorda da '+each+' minuti.');
      for(let consumed=0;consumed+each<=total;consumed+=each){
        const at=from+consumed;
        sessions.push({area:area.name,...(area.id?{areaId:area.id}:{}),minutes:each,cycleMinutes:each,rangeSession:true,start:timeOf(at),...(at>=1440?{dayOffset:1}:{})});
      }
      if(total%each)sessions[sessions.length-1].unusedMinutes=total%each;
      return sessions;
    }
    const match=input.match(/^(.+?)\s+@(\d+(?:[.,]\d+)?)\s*(h|min|m)(.*)$/i);
    if(!match)throw Error('Usa: Studio +14:00-16:00 -30m oppure Studio @2h +14:00 -60m.');
    const area=areas.find(a=>a.name.toLocaleLowerCase()===match[1].trim().toLocaleLowerCase());
    const minutes=Math.round(Number(match[2].replace(',','.'))*(match[3].toLowerCase()==='h'?60:1));
    if(!area || minutes<1 || minutes>10080)throw Error('Controlla area e durata lorda (da 1 minuto a 168 ore).');
    let start,focusMinutes,customBreakMinutes,cycleMinutes;
    for(const token of match[4].trim().split(/\s+/).filter(Boolean)) {
      if(/^\+([01]\d|2[0-3]):[0-5]\d$/.test(token) && !start)
        start=token.slice(1);
      else if(/^~\d{1,3}m?$/i.test(token) && focusMinutes===undefined)
        focusMinutes=focusCycle(Number(token.slice(1).replace(/m$/i,''))).focusMinutes;
      else if(/^-\d{1,3}m?$/i.test(token) && cycleMinutes===undefined){
        cycleMinutes=Number(token.slice(1).replace(/m$/i,''));
        grossCycle(cycleMinutes);
      }
      else if(/^!\d{1,4}m?$/i.test(token) && customBreakMinutes===undefined)
        customBreakMinutes=customPause(Number(token.slice(1).replace(/m$/i,'')),minutes);
      else throw Error('Opzione non valida: '+token+'. Usa +HH:MM, -60m (pomodoro lordo), ~40m (focus) o !5m (pausa finale).');
    }
    if(cycleMinutes!==undefined&&(focusMinutes!==undefined||customBreakMinutes!==undefined))
      throw Error('Non combinare -minuti con ~focus o !pausa finale.');
    return [{area:area.name,...(area.id?{areaId:area.id}:{}),minutes,...(cycleMinutes!==undefined?{cycleMinutes}:{}),...(start?{start}:{}),...(focusMinutes!==undefined?{focusMinutes}:{}),...(customBreakMinutes!==undefined?{customBreakMinutes}:{})}];
    }catch(error){throw Error('Riga '+(index+1)+': '+error.message);}
  });
}
// Only observable time counts. Long suspended/offline gaps never become completed work.
export function measuredFocus(session,from,to) {
  if(to-from<=0||to-from>15000||session.paused||session.finished)return 0;
  const bounds=sessionBounds(session);let cursor=Math.max(+from,+bounds.start),end=Math.min(+to,+bounds.end),total=0;
  while(cursor<end){const phase=getPhase(session,new Date(cursor));const next=Math.min(end,+phase.end);if(next<=cursor)break;if(phase.kind==='work')total+=next-cursor;cursor=next;}
  return total/1000;
}
