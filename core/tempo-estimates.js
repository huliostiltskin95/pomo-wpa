import {getPhase,sessionBounds} from './tempo-core.js';

export const isEstimateSource=source=>/^\s*@/m.test(source);
export function parseEstimate(source,areas){
 const rows=[];
 for(const [i,line] of source.split(/\r?\n/).entries()){
  if(!line.trim())continue;
  const total=line.trim().match(/^@(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
  if(total){
   if(rows.length||source.split(/\r?\n/).filter(row=>row.trim()).length!==1)
    throw Error('La durata totale @14h deve essere l’unica riga del blocco TEMPVS.');
   const value=Number(total[1].replace(',','.'))*(total[2].toLowerCase()==='h'?60:1);
   if(!Number.isSafeInteger(value)||value<1||value>100000)
    throw Error('Durata totale lorda non valida: usa @14h oppure @90m (minuti interi).');
   return [{kind:'total',grossMinutes:value}];
  }
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
  const total=n?.entries?.length===1&&n.entries[0]?.kind==='total';
  const invalid=total?(!Number.isSafeInteger(n.entries[0].grossMinutes)||n.entries[0].grossMinutes<1||n.entries[0].grossMinutes>100000):
    n?.entries?.some(e=>!e||e.kind==='total'||typeof e.area!=='string'||!Number.isInteger(e.count)||e.count<1||e.count>100000||!Number.isInteger(e.minutes)||e.minutes<1||e.minutes>1439);
  if(!n||n.id!==id||typeof n.path!=='string'||!n.path||typeof n.title!=='string'||!Array.isArray(n.entries)||!n.entries.length||invalid)
   throw Error('Stima della nota non valida.');
 }
}
export const estimatesOf=state=>Object.values(state.defaults?.simple?.noteEstimates||{});
export const matchesArea=(entry,session)=>entry.kind==='total'||(entry.areaId&&session.areaId?entry.areaId===session.areaId:entry.area===(session.area||session.title));
const normalizeTarget=path=>String(path||'').split(/[#^]/)[0].replace(/\\/g,'/').replace(/\.md$/i,'').replace(/^\/+|\/+$/g,'').toLocaleLowerCase();
function isPrimaryLink(record,note,state){
 const raw=record.linkedNotes?.[0]?.path;
 if(!raw)return false;
 const link=normalizeTarget(raw),full=normalizeTarget(note.path);
 if(link===full)return true;
 if(link.includes('/')||link!==full.split('/').at(-1))return false;
 // A bare wikilink is credited only when its basename is unambiguous in this vault.
 const matches=estimatesOf(state).filter(n=>n.vault===note.vault&&normalizeTarget(n.path).split('/').at(-1)===link);
 return matches.length===1&&matches[0].id===note.id;
}
function attributedFocus(record,note,state){
 const existing=record.noteWork||{};
 const credited=Math.max(0,Number(existing[note.id])||0);
 const allocated=Object.values(existing).reduce((sum,v)=>sum+(Number(v)||0),0);
 const selected=isPrimaryLink(record,note,state)||
   (!record.linkedNotes?.length&&record.noteEstimateId===note.id);
 // Preserve explicit historical allocations and credit only otherwise unallocated focus.
 return credited+(selected?Math.max(0,(Number(record.actualSeconds)||0)-allocated):0);
}
export function grossEquivalentSeconds(session,focusSeconds){
 if(!(focusSeconds>0))return 0;
 if(!session.date||!session.start||!session.end||!Number.isFinite(session.workMinutes))return focusSeconds*6/5;
 const {start,end}=sessionBounds(session);
 const gross=(end-start)/1000;
 let cursor=+start,work=0;
 while(cursor<+end){
  const phase=getPhase(session,new Date(cursor)),next=Math.min(+phase.end,+end);
  if(next<=cursor)break;
  if(phase.kind==='work')work+=(next-cursor)/1000;
  cursor=next;
 }
 return work>0?Math.min(gross,focusSeconds*gross/work):0;
}
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
 const total=note.entries.length===1&&note.entries[0].kind==='total';
 const areas=total?[{kind:'total',area:'Tutte le aree',estimated:note.entries[0].grossMinutes*60,done:0,planned:0,dayCapacity:0,durations:[30,60]}]:[];
 if(!total)for(const e of note.entries){
  let a=areas.find(a=>matchesArea(a,e));
  if(!a){a={areaId:e.areaId,area:e.area,estimated:0,done:0,planned:0,dayCapacity:0,durations:[]};areas.push(a);}
  a.estimated+=e.count*e.minutes*50;
  if(!a.durations.includes(e.minutes))a.durations.push(e.minutes);
 }
 for(const a of areas){
  for(const r of records.values())if(matchesArea(a,r)){
   const focus=attributedFocus(r,note,state);
   a.done+=total?grossEquivalentSeconds(r,focus):focus;
  }
  a.remaining=Math.max(0,a.estimated-a.done);
  for(const s of state.sessions||[])if(matchesArea(a,s)&&(!day||s.date===day)){
   const focus=remainingFocus(s,now),credit=total?grossEquivalentSeconds(s,focus):focus;
   a.dayCapacity+=credit;
   if(s.noteEstimateId===note.id||isPrimaryLink(s,note,state))a.planned+=credit;
  }
  a.afterDay=Math.max(0,a.remaining-a.dayCapacity);
  a.days=a.dayCapacity>0?Math.ceil(a.remaining/a.dayCapacity):null;
 }
 const sum=k=>areas.reduce((n,a)=>n+a[k],0);
 const estimated=sum('estimated');
 return {areas,unit:total?'gross':'net',estimated,done:sum('done'),remaining:sum('remaining'),planned:sum('planned'),afterDay:sum('afterDay'),
  percent:estimated?areas.reduce((n,a)=>n+Math.min(a.done,a.estimated),0)/estimated*100:0};
}
export function estimateTime(seconds){
 const value=Math.max(0,Math.ceil(seconds)),h=Math.floor(value/3600),m=Math.floor(value%3600/60),s=value%60;
 return [h?`${h} h`:'',m?`${m} min`:'',s?`${s} s`:''].filter(Boolean).join(' ')||'0 min';
}
