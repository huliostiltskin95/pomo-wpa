import {Notice} from 'obsidian';
import {parseEstimate,estimatesOf,matchesArea,estimateProgress,estimateTime} from '../core/tempo-estimates.js';
import {localDateString,sessionBounds,formatTime} from '../core/tempo-core.js';
import {grossCycle,manualSessionEnd} from '../core/tempo-simple.js';
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const action=(el,label,fn)=>{const b=el.createEl('button',{text:label});b.onclick=()=>Promise.resolve().then(fn).catch(e=>new Notice(e.message));return b;};
export class NoteEstimates {
 constructor(plugin){this.plugin=plugin;}
 get notes(){return estimatesOf(this.plugin.state);}
 get vault(){return this.plugin.app.vault?.getName?.()||'';}
 find(path){return this.notes.find(n=>n.path===path&&n.vault===this.vault);}
 async sync(context){
  const {file,block}=context,entries=parseEstimate(block.source,this.plugin.config.areas),old=this.find(file.path);
  if(old&&!old.archived&&JSON.stringify(old.entries)===JSON.stringify(entries))return;
  await this.plugin.change(()=>{
   const notes=this.plugin.config.noteEstimates??={};const id=old?.id||'note:'+encodeURIComponent(this.vault)+'/'+encodeURIComponent(file.path);
   notes[id]={...old,id,vault:this.vault,path:file.path,title:file.basename,entries,archived:false,completed:old?.completed||false};
  });
 }
 async archive(path){
  const note=this.find(path);if(!note||note.archived)return;
  await this.plugin.change(()=>{this.plugin.config.noteEstimates[note.id].archived=true;});
 }
 async rename(file,oldPath){
  const notes=this.notes.filter(n=>n.vault===this.vault&&(n.path===oldPath||n.path.startsWith(oldPath+'/')));
  if(!notes.length)return;
  await this.plugin.change(()=>{for(const note of notes){const n=this.plugin.config.noteEstimates[note.id];n.path=file.path+n.path.slice(oldPath.length);n.title=n.path.split('/').pop().replace(/\.md$/i,'');}});
 }
 available(session){return this.notes.filter(n=>!n.archived&&!n.completed&&n.entries.some(e=>matchesArea(e,session)));}
 async assign(sessionId,noteId){
  await this.plugin.change(()=>{
   const s=this.plugin.state.sessions.find(s=>s.id===sessionId),note=this.notes.find(n=>n.id===noteId);
   if(!s||s.finished||sessionBounds(s).end<=new Date())throw Error('Sessione non più disponibile.');
   if(noteId&&(!note||!this.available(s).some(n=>n.id===noteId)))throw Error('Nota non disponibile per questa area.');
   if(noteId)s.noteEstimateId=noteId;else delete s.noteEstimateId;
  });
 }
 async assignDay(note,day){
  let count=0;
  await this.plugin.change(()=>{for(const s of this.plugin.state.sessions){
   if(s.date===day&&!s.noteEstimateId&&!s.finished&&sessionBounds(s).start>new Date()&&note.entries.some(e=>matchesArea(e,s))){s.noteEstimateId=note.id;count++;}
  }});
  new Notice(count?`${count} sessioni assegnate a ${note.title}.`:'Nessuna sessione futura libera nelle aree della nota per questo giorno.');
 }
 async start(note,entry){
  const plugin=this.plugin,now=new Date(),end=manualSessionEnd(now,entry.minutes),cycle=grossCycle(entry.minutes);
  const session={id:uid(),title:entry.area,area:entry.area,areaId:entry.areaId,date:localDateString(now),start:formatTime(now),end:formatTime(end),timerStartedAt:now.toISOString(),timerEndsAt:end.toISOString(),workMinutes:cycle.focusMinutes,cycleMinutes:entry.minutes,breakEnabled:true,actualSeconds:0,noteEstimateId:note.id};
  if(plugin.state.sessions.some(s=>!s.finished&&sessionBounds(s).start<end&&sessionBounds(s).end>now))throw Error('Questo intervallo è già occupato. Assegna la nota alla sessione in agenda.');
  await plugin.change(()=>plugin.state.sessions.push(session));
 }
 render(parent,note,day=localDateString()){
  const p=estimateProgress(note,this.plugin.state,{day}),box=parent.createDiv({cls:'tempvs-estimate'});
  action(box,note.title,()=>this.plugin.app.workspace.openLinkText(note.path,'',false));
  box.createEl('p',{text:'Stima: '+note.entries.map(e=>`${e.count} × ${e.minutes} min (${e.area})`).join(' + ')+` · ${note.entries.reduce((n,e)=>n+e.count,0)} sessioni · ${estimateTime(p.estimated*6/5)} lordi.`});
  box.createEl('p',{text:`${note.completed?'Completata · ':''}${Math.round(p.percent)}% · Lavoro registrato: ${estimateTime(p.done)} / ${estimateTime(p.estimated)}`});
  box.createEl('progress',{attr:{max:'100',value:String(p.percent),'aria-label':'Avanzamento '+note.title}});
  box.createEl('p',{text:`Resta da lavorare: ${estimateTime(p.remaining)} netti · ${estimateTime(p.remaining*6/5)} lordi, pause comprese.`});
  for(const a of p.areas){
   box.createEl('p',{text:`${a.area}: ${estimateTime(a.remaining)} di lavoro residuo. Equivalenti: ${a.durations.map(m=>`${Math.ceil(a.remaining/(m*50))} sessioni da ${m} min`).join(' oppure ')}.`});
   box.createEl('small',{text:a.dayCapacity?`Se dedichi a questa nota tutte le sessioni ${a.area} ancora disponibili il ${day}: resterebbero ${estimateTime(a.afterDay)} netti (${estimateTime(a.afterDay*6/5)} lordi).`:`Il ${day} non ci sono sessioni ${a.area} disponibili per calcolare la proiezione.`});
  }
  box.createEl('p',{cls:'tempvs-muted',text:`Già assegnati nel giorno: ${estimateTime(p.planned)} di lavoro previsto. Il tempo previsto non aumenta l’avanzamento.`});
  if(!note.archived&&!note.completed){
   action(box,'Assegna alle sessioni libere del giorno',()=>this.assignDay(note,day));
   const seen=new Set();for(const e of note.entries){const key=(e.areaId||e.area)+':'+e.minutes;if(seen.has(key))continue;seen.add(key);action(box,`Avvia ${e.area} · ${e.minutes} min`,()=>this.start(note,e));}
  }
  action(box,note.completed?'Riapri attività':'Segna completata',()=>this.plugin.change(()=>{this.plugin.config.noteEstimates[note.id].completed=!note.completed;}));
  return box;
 }
 renderPanel(parent,day){
  const open=new Set([...parent.querySelectorAll('details[open]')].map(el=>el.dataset.noteId));
  parent.empty();const notes=this.notes.filter(n=>!n.archived);
  if(!notes.length)return;
  parent.createEl('h4',{text:'Note e stime'});
  for(const note of notes){const details=parent.createEl('details',{cls:'tempvs-estimate-details'});details.dataset.noteId=note.id;details.open=open.has(note.id);details.createEl('summary',{text:`${note.title} · ${Math.round(estimateProgress(note,this.plugin.state).percent)}%${note.completed?' · completata':''}`});this.render(details,note,day);}
 }
 selector(parent,session){
  const notes=this.available(session),current=this.notes.find(n=>n.id===session.noteEstimateId);
  if(!notes.length&&!current)return;
  if(current&&!notes.includes(current))notes.push(current);
  const select=parent.createEl('select',{cls:'tempvs-note-assignment',attr:{'aria-label':'Nota della sessione '+session.start}});
  select.createEl('option',{value:'',text:'Solo area · nessuna nota'});
  for(const n of notes)select.createEl('option',{value:n.id,text:n.title+(n.completed?' (completata)':'')});
  select.value=session.noteEstimateId||'';
  select.onchange=()=>this.assign(session.id,select.value).catch(e=>new Notice(e.message));
 }
}
