import {getPhase,sessionBounds} from './tempo-core.js';

export const isEstimateSource=source=>/^\s*@/m.test(source);
export function parseEstimate(source,areas){
 const rows=[];
 for(const [i,line] of source.split(/\r?\n/).entries()){
  if(!line.trim())continue;
  const m=line.trim().match(/^@(.+?)\s+(\d+)\s+-\s*(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
  if(!m)throw Error(`Riga ${i+1}: usa @Studio 20 -30m (numero di sessioni e durata lorda).`);
  const area=areas.find(a=>a.name.trim().toLocaleLowerCase()===m[1].trim().toLocaleLowerCase());
  if(!area)throw Error(`Riga ${i+1}: area sconosciuta: ${m[1]}.`);
  const count=Number(m[2]),minutes=Number(m[3].replace(',','.'))*(m[4].toLowerCase()==='h'?60:1);
  if(!Number.isSafeInteger(count)||count<1||count>100000||!Number.isInteger(minutes)||minutes<1||minutes>1439)throw Error(`Riga ${i+1}: indica 1–100000 sessioni da 1–1439 minuti lordi interi.`);
  rows.push({areaId:area.id,area:area.name,count,minutes});
 }
 if(!rows.length)throw Error('Inserisci almeno una stima.');
 return rows;
}
export function validateEstimates(value){
 if(value===undefined)return;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Stime delle note non valide.');
 for(const [id,n] of Object.entries(value)){
  if(!n||n.id!==id||typeof n.path!=='string'||!n.path||typeof n.title!=='string'||!Array.isArray(n.entries)||!n.entries.length||n.entries.some(e=>!e||typeof e.area!=='string'||!Number.isInteger(e.count)||e.count<1||e.count>100000||!Number.isInteger(e.minutes)||e.minutes<1||e.minutes>1439))throw Error('Stima della nota non valida.');
 }
}
export const estimatesOf=state=>Object.values(state.defaults?.simple?.noteEstimates||{});
export const matchesArea=(entry,session)=>entry.areaId&&session.areaId?entry.areaId===session.areaId:entry.area===(session.area||session.title);
export function recordNoteWork(session,seconds){
 if(!session.noteEstimateId||!(seconds>0))return;
 session.noteWork={...session.noteWork,[session.noteEstimateId]:(session.noteWork?.[session.noteEstimateId]||0)+seconds};
}
export function remainingFocus(session,now=new Date()){
 if(session.finished)return 0;
 const {start,end}=sessionBounds(session);let at=Math.max(+start,+now),total=0;
 while(at<+end){const p=getPhase(session,new Date(at)),until=Math.min(+p.end,+end);if(until<=at)break;if(p.kind==='work')total+=(until-at)/1000;at=until;}
 return total;
}
export function estimateProgress(note,state,{day,now=new Date()}={}){
 const records=new Map();
 for(const h of state.history||[])if(h.measured)records.set(h.sessionId,h);
 for(const s of state.sessions||[])records.set(s.id,s);
 const areas=[];
 for(const e of note.entries){
  let a=areas.find(a=>matchesArea(a,e));
  if(!a){a={areaId:e.areaId,area:e.area,estimated:0,done:0,planned:0,dayCapacity:0,durations:[]};areas.push(a);}
  a.estimated+=e.count*e.minutes*50;if(!a.durations.includes(e.minutes))a.durations.push(e.minutes);
 }
 for(const a of areas){
  for(const r of records.values())if(matchesArea(a,r))a.done+=r.noteWork?.[note.id]||0;
  a.remaining=Math.max(0,a.estimated-a.done);
  for(const s of state.sessions||[])if(matchesArea(a,s)&&(!day||s.date===day)){
   const focus=remainingFocus(s,now);a.dayCapacity+=focus;if(s.noteEstimateId===note.id)a.planned+=focus;
  }
  a.afterDay=Math.max(0,a.remaining-a.dayCapacity);
  a.days=a.dayCapacity>0?Math.ceil(a.remaining/a.dayCapacity):null;
 }
 const sum=k=>areas.reduce((n,a)=>n+a[k],0);
 return {areas,estimated:sum('estimated'),done:sum('done'),remaining:sum('remaining'),planned:sum('planned'),afterDay:sum('afterDay'),percent:areas.reduce((n,a)=>n+Math.min(a.done,a.estimated),0)/sum('estimated')*100};
}
export function estimateTime(seconds){
 const value=Math.max(0,Math.ceil(seconds)),h=Math.floor(value/3600),m=Math.floor(value%3600/60),s=value%60;
 return [h?`${h} h`:'',m?`${m} min`:'',s?`${s} s`:''].filter(Boolean).join(' ')||'0 min';
}
