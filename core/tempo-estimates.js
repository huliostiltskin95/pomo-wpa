const activityStart=/^[ \t]*-[ \t]+\[([ x])\](?=[ \t]+@)/im;
export const isActivitySource=source=>activityStart.test(source);
export const isEstimateSource=source=>/^\s*@/m.test(source)||isActivitySource(source);

export function parseNoteEstimate(source,areas){
 const mark=activityStart.exec(source);
 if(!mark)return {entries:parseEstimate(source,areas)};
 const lines=source.trim().split(/\r?\n/);
 const activity=lines[0].replace(activityStart,'').trim();
 if(lines.length!==1||!activity.startsWith('@'))
  throw Error('Usa una sola riga per l’attività: - [ ] @Studio 2h.');
 const entries=parseEstimate(activity,areas);
 if(entries[0].kind!=='budget')throw Error('Indica area e stima di concentrazione: - [ ] @Studio 2h.');
 return {entries,completed:mark[1].toLowerCase()==='x'};
}

export const markActivity=(source,completed)=>source.replace(activityStart,mark=>mark.slice(0,-2)+(completed?'x':' ')+']');
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
  const budget=line.trim().match(/^@(.+?)\s+(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
  if(budget){
   const area=areas.find(a=>a.name.toLocaleLowerCase()===budget[1].trim().toLocaleLowerCase());
   if(!area)throw Error('Area sconosciuta: '+budget[1]);
   const targetMinutes=Number(budget[2].replace(',','.'))*(budget[3].toLowerCase()==='h'?60:1);
   if(!Number.isSafeInteger(targetMinutes)||targetMinutes<1||targetMinutes>100000)throw Error('Indica una durata tra 1 e 100000 minuti interi.');
   rows.push({kind:'budget',area:area.name,areaId:area.id,targetMinutes});
   continue;
  }
  const m=line.trim().match(/^@(.+?)\s+(\d+)\s+-\s*(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
  if(!m)throw Error(`Riga ${i+1}: usa @Studio 10h.`);
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
  if(n?.completion&&(!Number.isFinite(n.completion.estimated)||n.completion.estimated<=0||!Number.isFinite(n.completion.done)||n.completion.done<0))throw Error('Consuntivo della nota non valido.');
  const total=n?.entries?.length===1&&n.entries[0]?.kind==='total';
  const invalid=total?(!Number.isSafeInteger(n.entries[0].grossMinutes)||n.entries[0].grossMinutes<1||n.entries[0].grossMinutes>100000):
    n?.entries?.some(e=>!e||e.kind==='total'||typeof e.area!=='string'||(e.kind==='budget'?(!Number.isSafeInteger(e.targetMinutes)||e.targetMinutes<1||e.targetMinutes>100000):(!Number.isInteger(e.count)||e.count<1||e.count>100000||!Number.isInteger(e.minutes)||e.minutes<1||e.minutes>1439)));
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
 return credited+(selected?Math.max(0,(record.actualSeconds??(record.measured?(Number(record.minutes)||0)*60:0))-allocated):0);
}
export function recordNoteWork(session,seconds){
 if(!session.noteEstimateId||!(seconds>0))return;
 session.noteWork={...session.noteWork,[session.noteEstimateId]:(session.noteWork?.[session.noteEstimateId]||0)+seconds};
}
export const estimatedSeconds=note=>note.entries.reduce((sum,e)=>sum+(e.targetMinutes??e.grossMinutes??e.count*e.minutes)*60,0);
function measuredTotals(note,state){
 const records=new Map();
 for(const history of state.history||[])if(history.measured)records.set(history.sessionId,history);
 for(const session of state.sessions||[])records.set(session.id,session);
 let done=0;
 for(const record of records.values()){
  if(note.entries.some(entry=>matchesArea(entry,record)))done+=attributedFocus(record,note,state);
 }
 return {estimated:estimatedSeconds(note),done};
}

export function estimateProgress(note,state,{live}={}){
 const {estimated,done}=note.completed&&note.completion?note.completion:live??measuredTotals(note,state);
 return {estimated,done,remaining:Math.max(0,estimated-done),difference:done-estimated,percent:estimated?100*done/estimated:0};
}

export function setEstimateCompleted(note,state,completed,live){
 if(note.completed===completed)return;
 if(completed)note.completion=live??measuredTotals(note,state);
 else delete note.completion;
 note.completed=completed;
}

export function estimateResult(note,progress){
 if(!note.completed)return 'Restano '+estimateTime(progress.remaining)+' · '+Math.floor(progress.percent)+'%';
 if(progress.difference===0)return 'Completato · stima rispettata';
 return 'Completato · '+estimateTime(Math.abs(progress.difference))+(progress.difference<0?' sotto la stima':' oltre la stima');
}
export function estimateTime(seconds){
 const value=Math.max(0,Math.ceil(seconds)),h=Math.floor(value/3600),m=Math.floor(value%3600/60),s=value%60;
 return [h?`${h} h`:'',m?`${m} min`:'',s?`${s} s`:''].filter(Boolean).join(' ')||'0 min';
}

export function compactEstimateTime(seconds){
 return estimateTime(seconds).replaceAll(' min','m').replaceAll(' h','h').replaceAll(' s','s').replaceAll(' ','');
}
