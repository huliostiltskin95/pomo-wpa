import {creditedWork} from './daily-register.js';
import {Modal, Notice} from 'obsidian';
import {parseNoteEstimate,compactEstimateTime,estimatedSeconds,estimatesOf,matchesArea,estimateProgress,estimateTime,estimateResult,setEstimateCompleted} from '../core/tempo-estimates.js';
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
  const {file,block}=context,{entries,completed}=parseNoteEstimate(block.source,this.plugin.config.areas),old=this.find(file.path);
  const activity=completed!==undefined;
  if(old&&!old.archived&&Boolean(old.activity)===activity&&(!activity||old.completed===completed)&&JSON.stringify(old.entries)===JSON.stringify(entries))return;
  await this.plugin.change(()=>{
   const notes=this.plugin.config.noteEstimates??={};const preferred='note:'+encodeURIComponent(this.vault)+'/'+encodeURIComponent(file.path);
   const id=old?.id||(notes[preferred]?preferred+'/'+uid():preferred);
   const note=notes[id]={...old,id,vault:this.vault,path:file.path,title:file.basename,entries,archived:false,completed:old?.completed||false};
   if(activity){
    note.activity=true;
    if(note.completed!==completed){
     const live=completed?this.liveProgress(note,this.totals(false)):undefined;
     setEstimateCompleted(note,this.plugin.state,completed,live);
    }
   }else delete note.activity;
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
 planStudy(note,area,minutes){
  const modal=new Modal(this.plugin.app);
  modal.onOpen=()=>{
   modal.contentEl.createEl('h2',{text:'Assegna tempo di studio'});
   modal.contentEl.createEl('p',{text:note.title+' · '+area.name});
   const form=modal.contentEl.createEl('form',{cls:'tempvs-form'});
   const date=form.createEl('label',{text:'Giorno di studio'}).createEl('input',{attr:{type:'date',required:'',value:localDateString()}});
   const duration=form.createEl('label',{text:'Durata · minuti'}).createEl('input',{attr:{type:'number',required:'',min:'1',max:'1439',value:String(minutes)}});
   const error=form.createDiv({attr:{role:'alert'}});
   const save=form.createEl('button',{text:'Assegna tempo',cls:'mod-cta',attr:{type:'submit'}});
   form.onsubmit=async event=>{
    event.preventDefault();
    if(save.disabled)return;
    save.disabled=true;
    try{
     await this.plugin.assignTime({area:area.name,areaId:area.id,minutes:duration.valueAsNumber},date.value,{path:note.path,label:note.title});
     modal.close();
     new Notice('Tempo di studio assegnato al '+date.value+'.');
    }catch(e){error.textContent=e.message;}
    finally{save.disabled=false;}
   };
  };
  modal.onClose=()=>modal.contentEl.empty();
  modal.open();
 }
 totals(includePlannedIntervals=true){
  const cache=this.plugin.app.metadataCache;
  return creditedWork(this.plugin.state,(p,source)=>cache?.getFirstLinkpathDest?.(p,source)?.path,id=>this.plugin.dailyNotes?.[id]?.path,undefined,{includePlannedIntervals});
 }
 liveProgress(note,totals){
  return {estimated:estimatedSeconds(note),done:totals.get(note.path)||0};
 }
 progress(note,totals){
  return estimateProgress(note,this.plugin.state,{live:this.liveProgress(note,note.activity?totals.focus:totals.legacy)});
 }
 progressTotals(){
  return {legacy:this.totals(),focus:this.totals(false)};
 }
 render(parent,note,day=localDateString(),panel=false,totals=this.progressTotals()){
  const p=this.progress(note,totals),box=parent.createDiv({cls:'tempvs-estimate'});
  if(panel)action(box,note.title,()=>this.plugin.app.workspace.openLinkText(note.path,'',false));
  const names=[...new Set(note.entries.map(entry=>entry.area).filter(Boolean))];
  const time=note.activity?compactEstimateTime(p.done)+'/'+compactEstimateTime(p.estimated):
   'Tempo registrato '+estimateTime(p.done)+' su '+estimateTime(p.estimated);
  box.createEl('p',{text:(names.join(' / ')||'Tutte le aree')+' · '+time});
  box.createEl('strong',{text:estimateResult(note,p)});
  const actions=box.createDiv({cls:'tempvs-estimate-actions'});
  const choices=this.preferences.get(note.id)||{};
  const areas=this.plugin.config.areas.filter(area=>note.entries.some(entry=>matchesArea(entry,{area:area.name,areaId:area.id})));
  const area=areas.find(a=>a.id===choices.areaId)||areas[0];
  if(!note.completed&&area){
   action(actions,'Assegna tempo',()=>this.planStudy(note,area,choices.minutes||30));
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
  action(menu,note.completed?'Riapri attività':'Segna completata',()=>{
   if(note.activity)return this.plugin.daily.toggleActivity(note.path,!note.completed);
   return this.plugin.change(()=>{
    const current=this.plugin.config.noteEstimates[note.id];
    setEstimateCompleted(current,this.plugin.state,!current.completed,this.liveProgress(current,this.totals()));
   });
  });
  return box;
 }
 renderPanel(parent,day){
  const open=new Set([...parent.querySelectorAll('.tempvs-estimate-details[open]')].map(el=>el.dataset.noteId));
  const menus=new Set([...parent.querySelectorAll('.tempvs-estimate-menu[open]')].map(el=>el.closest('.tempvs-estimate-details').dataset.noteId));
  parent.empty();const notes=this.notes.filter(n=>!n.archived);
  const totals=this.progressTotals(),estimatedPaths=new Set(notes.map(n=>n.path));
  if(!notes.length&&!totals.legacy.size)return;
  parent.createEl('h4',{text:'Note e stime'});
  for(const [path,seconds] of totals.legacy)if(!estimatedPaths.has(path)){
   const row=parent.createDiv();
   action(row,path.split('/').pop().replace(/\.md$/i,''),()=>this.plugin.app.workspace.openLinkText(path,'',false));
   row.createSpan({text:' · '+estimateTime(seconds)});
  }
  for(const note of notes){
   const details=parent.createEl('details',{cls:'tempvs-estimate-details'});
   details.dataset.noteId=note.id;details.open=open.has(note.id);
   details.createEl('summary',{text:note.title+' · '+(note.completed?'completato':Math.floor(this.progress(note,totals).percent)+'%')});
   this.render(details,note,day,true,totals);
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
