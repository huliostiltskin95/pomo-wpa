import {estimatesOf,estimateProgress,estimateTime,matchesArea} from './core/tempo-estimates.js';
import {sessionBounds} from './core/tempo-core.js';
export function renderNoteEstimates({document,state,day,commit}){
 const list=document.getElementById('session-list');if(!list)return;
 let root=document.getElementById('note-estimates');
 if(!root){root=document.createElement('section');root.id='note-estimates';list.after(root);}
 const open=new Set([...root.querySelectorAll('details[open]')].map(el=>el.dataset.noteId));root.replaceChildren();
 const notes=estimatesOf(state).filter(n=>!n.archived);
 const add=(parent,tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;parent.append(el);return el;};
 const button=(parent,text,fn)=>{const el=add(parent,'button',text);el.type='button';el.onclick=fn;return el;};
 if(notes.length)add(root,'h3','Note e stime');
 for(const note of notes){
  const p=estimateProgress(note,state,{day}),box=add(root,'details');box.dataset.noteId=note.id;box.open=open.has(note.id);
  add(box,'summary',`${note.title} · ${Math.round(p.percent)}%${note.completed?' · completata':''}`);
  add(box,'p',`Lavoro registrato: ${estimateTime(p.done)} / ${estimateTime(p.estimated)}. Restano ${estimateTime(p.remaining)} netti (${estimateTime(p.remaining*6/5)} lordi).`);
  const link=add(box,'a','Apri nota in Obsidian');link.href='obsidian://open?'+new URLSearchParams({vault:note.vault||'',file:note.path});
  for(const a of p.areas)add(box,'p',`${a.area}: ${a.durations.map(m=>`${Math.ceil(a.remaining/(m*50))} sessioni equivalenti da ${m} min`).join(' oppure ')}. `+(a.dayCapacity?`Dedicando tutti gli slot ancora disponibili del ${day} a questa nota, resterebbero ${estimateTime(a.afterDay)} netti.`:'Nessuno slot disponibile in questo giorno per la proiezione.'));
  add(box,'p',`Già assegnati nel giorno: ${estimateTime(p.planned)} di lavoro previsto. Le stime si modificano nel blocco della nota.`);
  if(!note.completed)button(box,'Assegna alle sessioni libere del giorno',()=>commit(()=>{for(const s of state.sessions)if(s.date===day&&!s.noteEstimateId&&!s.finished&&sessionBounds(s).start>new Date()&&note.entries.some(e=>matchesArea(e,s)))s.noteEstimateId=note.id;}));
  button(box,note.completed?'Riapri attività':'Segna completata',()=>commit(()=>{state.defaults.simple.noteEstimates[note.id].completed=!note.completed;}));
 }
 for(const item of list.querySelectorAll('[data-delete]')){
  const s=state.sessions.find(s=>s.id===item.dataset.delete);if(!s||s.finished||sessionBounds(s).end<=new Date())continue;
  const eligible=notes.filter(n=>(!n.completed||n.id===s.noteEstimateId)&&n.entries.some(e=>matchesArea(e,s)));
  if(!eligible.length)continue;
  const select=add(item.closest('.session-item').querySelector('span'),'select');select.setAttribute('aria-label','Nota della sessione '+s.start);select.style.maxWidth='100%';
  add(select,'option','Solo area · nessuna nota').value='';for(const n of eligible)add(select,'option',n.title).value=n.id;select.value=s.noteEstimateId||'';
  select.onchange=()=>commit(()=>{if(select.value)s.noteEstimateId=select.value;else delete s.noteEstimateId;});
 }
}
