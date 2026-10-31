/**
 * Tempo Core: pure scheduling and Pomodoro calculations shared by the PWA and Obsidian.
 * No DOM, browser storage, notifications, or platform-specific APIs.
 */
export const DEFAULTS = Object.freeze({ workMinutes: 25, breakEnabled: true });
export function localDateString(date = new Date()) { const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; }
export function timeToMinutes(value) { const [h,m]=value.split(":").map(Number); return h*60+m; }
export function dateTime(date,time) { const [y,mo,d]=date.split("-").map(Number),[h,mi]=time.split(":").map(Number); return new Date(y,mo-1,d,h,mi,0,0); }
export function formatTime(date) { return new Intl.DateTimeFormat("it-IT",{hour:"2-digit",minute:"2-digit"}).format(date); }
export function formatDate(value) { const [y,m,d]=value.split("-").map(Number); return new Intl.DateTimeFormat("it-IT",{weekday:"short",day:"numeric",month:"short"}).format(new Date(y,m-1,d)); }
export function escapeHtml(value) { return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
export function clampInt(value,min,max,fallback) { const n=Number(value); return Number.isInteger(n)&&n>=min&&n<=max?n:fallback; }
export function pauseMinutes(work) { return Math.max(1,Math.round(work/5)); }
export function normalizeSession(s) { return {...s,breakEnabled:s.breakEnabled!==undefined?Boolean(s.breakEnabled):true}; }
export function validSession(s) { return Boolean(s&&typeof s.id==="string"&&typeof s.title==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&/^\d{2}:\d{2}$/.test(s.start)&&/^\d{2}:\d{2}$/.test(s.end)&&Number.isInteger(s.workMinutes)&&s.workMinutes>=1&&s.workMinutes<=240&&timeToMinutes(s.end)>timeToMinutes(s.start)); }
export function sessionBounds(s) { return {start:dateTime(s.date,s.start),end:dateTime(s.date,s.end)}; }
export function getSessionStatus(s,now=new Date()) { const {start,end}=sessionBounds(s); if(now<start)return "upcoming"; if(now>=end)return "finished"; return "active"; }
export function sortSessions(sessions) { return [...sessions].sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start); }
export function getActiveSession(sessions,now=new Date()) { return sortSessions(sessions.filter(s=>getSessionStatus(s,now)==="active"))[0]||null; }
export function getNextSession(sessions,now=new Date()) { return sortSessions(sessions.filter(s=>getSessionStatus(s,now)==="upcoming"))[0]||null; }
export function getPhase(s,now=new Date()) {
 const {start,end}=sessionBounds(s),workMs=s.workMinutes*60000,elapsed=Math.max(0,now-start),remainingSession=Math.max(0,end-now);
 if(!s.breakEnabled)return {kind:"work",label:"Concentrazione",start,end,remaining:Math.max(0,Math.ceil(remainingSession/1000)),progress:Math.min(100,elapsed/Math.max(1,end-start)*100),sessionEnd:end,totalRemaining:Math.ceil(remainingSession/1000)};
 const breakMs=pauseMinutes(s.workMinutes)*60000,cycleMs=workMs+breakMs,cycleIndex=Math.floor(elapsed/cycleMs),within=elapsed%cycleMs,isWork=within<workMs,phaseDuration=isWork?workMs:breakMs,phaseElapsed=isWork?within:within-workMs,phaseStart=new Date(start.getTime()+cycleIndex*cycleMs+(isWork?0:workMs)),theoreticalEnd=new Date(phaseStart.getTime()+phaseDuration),phaseEnd=theoreticalEnd<end?theoreticalEnd:end;
 return {kind:isWork?"work":"break",label:isWork?"Concentrazione":"Pausa",start:phaseStart,end:phaseEnd,remaining:Math.max(0,Math.ceil((phaseEnd-now)/1000)),progress:Math.min(100,Math.max(0,phaseElapsed/phaseDuration*100)),sessionEnd:end,totalRemaining:Math.ceil(remainingSession/1000)};
}
export function mmss(seconds) { const m=Math.floor(Math.max(0,seconds)/60),s=Math.max(0,seconds)%60; return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; }
export function sessionsOverlap(a,b) { if(a.date!==b.date)return false; const aa=sessionBounds(a),bb=sessionBounds(b); return aa.start<bb.end&&aa.end>bb.start; }
