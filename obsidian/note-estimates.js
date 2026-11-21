import {Notice} from 'obsidian';
import {parseEstimate,estimatesOf,matchesArea,estimateProgress,estimateTime,estimateResult,setEstimateCompleted} from '../core/tempo-estimates.js';
import {localDateString,sessionBounds,formatTime} from '../core/tempo-core.js';
import {grossCycle,manualSessionEnd} from '../core/tempo-simple.js';
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const action=(el,label,fn)=>{const b=el.createEl('button',{text:label});b.onclick=()=>Promise.resolve().then(fn).catch(e=>new Notice(e.message));return b;};
export class NoteEstimates {
 constructor(plugin){this.plugin=plugin;this.preferences=new Map();}
 get notes(){return estimatesOf(this.plugin.state);}
 get vault(){return this.plugin.app.vault?.getName?.()||'';}
 find(path){return this.notes.find(n=>n.path===path&&n.vault===this.vault);}
 async sync(context){
  const {file,block}=context,entries=parseEstimate(block.source,this.plugin.config.areas),old=this.find(file.path);
  if(old&&!old.archived&&JSON.stringify(old.entries)===JSON.stringify(entries))return;
  await this.plugin.change(()=>{
   const notes=this.plugin.config.noteEstimates??={};const preferred='note:'+encodeURIComponent(this.vault)+'/'+encodeURIComponent(file.path);
   const id=old?.id||(notes[preferred]?preferred+'/'+uid():preferred);
   notes[id]={...old,id,vault:this.vault,path:file.path,title:file.basename,entries,archived:false,completed:old?.completed||false};
  });
 }
 async archive(path){
  const note=this.find(path);if(!note||note.archived)return;
  await this.plugin.change(()=>{this.plugin.config.noteEstimates[note.id].archived=true;});
 }
 available(session){return this.notes.filter(n=>!n.archived&&!n.completed&&n.entries.some(e=>matchesArea(e,session)));}
 async assign(sessionId,noteId){
  const note=this.notes.find(n=>n.id===noteId);
  await this.plugin.setSessionNote([sessionId],note?'[['+note.path+'|'+note.title+']]':'',{replacePrimary:true});
 }
 async assignDay(note,day){
  const sessions=this.plugin.state.sessions.filter(s=>s.date===day&&!s.linkedNotes?.length&&!s.noteEstimateId&&!s.finished&&sessionBounds(s).start>new Date()&&note.entries.some(e=>matchesArea(e,s)));
  for(const s of sessions)await this.assign(s.id,note.id);
  new Notice(sessions.length?`${sessions.length} sessioni collegate a ${note.title}.`:'Nessuna sessione futura libera.');
 }
 async start(note,entry){
  if(entry.kind==='total')throw Error('La stima @14h non imposta un’area: avvia una sessione dall’agenda e collega la nota.');
  const plugin=this.plugin,now=new Date(),end=manualSessionEnd(now,entry.minutes),cycle=grossCycle(entry.minutes);
  const session={id:uid(),title:entry.area,area:entry.area,areaId:entry.areaId,date:localDateString(now),start:formatTime(now),end:formatTime(end),timerStartedAt:now.toISOString(),timerEndsAt:end.toISOString(),workMinutes:cycle.focusMinutes,cycleMinutes:entry.minutes,breakEnabled:true,actualSeconds:0,linkedNotes:[{path:note.path,label:note.title}]};
  if(plugin.state.sessions.some(s=>!s.finished&&sessionBounds(s).start<end&&sessionBounds(s).end>now))throw Error('Questo intervallo è già occupato. Assegna la nota alla sessione in agenda.');
  await plugin.change(()=>plugin.state.sessions.push(session));
 }
 render(parent,note,day=localDateString(),panel=false){
  const state=this.plugin.state,p=estimateProgress(note,state),box=parent.createDiv({cls:'tempvs-estimate'});
  if(panel)action(box,note.title,()=>this.plugin.app.workspace.openLinkText(note.path,'',false));
  const names=[...new Set(note.entries.map(entry=>entry.area).filter(Boolean))];
  box.createEl('p',{text:(names.join(' / ')||'Tutte le aree')+' · Tempo registrato '+estimateTime(p.done)+ ' su '+estimateTime(p.estimated)});
  box.createEl('strong',{text:estimateResult(note,p)});
  const actions=box.createDiv({cls:'tempvs-estimate-actions'});
  const choices=this.preferences.get(note.id)||{};
  const areas=this.plugin.config.areas.filter(area=>note.entries.some(entry=>matchesArea(entry,{area:area.name,areaId:area.id})));
  const area=areas.find(a=>a.id===choices.areaId)||areas[0];
  if(!note.completed&&area){
   action(actions,'Avvia '+area.name,()=>{
    const selected=areas.find(a=>a.id===choices.areaId)||area;
    return this.start(note,{area:selected.name,areaId:selected.id,minutes:choices.minutes||30});
   });
  }
  const menu=actions.createEl('details',{cls:'tempvs-estimate-menu'});
  menu.createEl('summary',{text:'⋯',attr:{'aria-label':'Azioni studio'}});
  if(!note.completed){
   if(areas.length>1){
    const select=menu.createEl('select',{attr:{'aria-label':'Area di avvio'}});
    for(const a of areas)select.createEl('option',{text:a.name,attr:{value:a.id}});
    select.value=area.id;
    select.onchange=()=>{choices.areaId=select.value;this.preferences.set(note.id,choices);this.plugin.refresh(true);};
   }
   const label=menu.createEl('label',{text:'Durata sessione '});
   const input=label.createEl('input',{attr:{type:'number',min:1,max:1439,value:choices.minutes||30}});
   input.onchange=()=>{
    const minutes=input.valueAsNumber;
    if(!Number.isInteger(minutes)||minutes<1||minutes>1439){input.value=String(choices.minutes||30);new Notice('Scegli da 1 a 1439 minuti.');return;}
    choices.minutes=minutes;this.preferences.set(note.id,choices);
   };
   action(menu,'Collega alle sessioni libere del giorno',()=>this.assignDay(note,day));
  }
  action(menu,note.completed?'Riapri attività':'Segna completata',()=>this.plugin.change(()=>{
   setEstimateCompleted(this.plugin.config.noteEstimates[note.id],this.plugin.state,!note.completed);
  }));
  return box;
 }
 renderPanel(parent,day){
  const open=new Set([...parent.querySelectorAll('.tempvs-estimate-details[open]')].map(el=>el.dataset.noteId));
  const menus=new Set([...parent.querySelectorAll('.tempvs-estimate-menu[open]')].map(el=>el.closest('.tempvs-estimate-details').dataset.noteId));
  parent.empty();const notes=this.notes.filter(n=>!n.archived);
  if(!notes.length)return;
  parent.createEl('h4',{text:'Note e stime'});
  for(const note of notes){
   const details=parent.createEl('details',{cls:'tempvs-estimate-details'});
   details.dataset.noteId=note.id;details.open=open.has(note.id);
   details.createEl('summary',{text:note.title+' · '+(note.completed?'completato':Math.floor(estimateProgress(note,this.plugin.state).percent)+'%')});
   this.render(details,note,day,true);
   details.querySelector('.tempvs-estimate-menu').open=menus.has(note.id);
  }
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
