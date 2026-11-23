import {movedTarget,moveBlockLinks,archivedLinkResolver} from './moved-links.js';
import {isEstimateSource} from '../core/tempo-estimates.js';
import {MarkdownRenderChild,Notice,moment} from 'obsidian';
import {normalizeArchive} from '../core/tempo-simple.js';
import {sessionBounds} from '../core/tempo-core.js';
import {isRegister,applyRegister,findDailyBlocks,blockIdentity,explicitDay,resolveDailyDate,replaceDailyBlock,prepareDailyPlan,applyDailyPlan,serializeDailyPlan,archivePlanningKey,daySessions,isLocked} from './daily-plan.js';

const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const plain=source=>source.split(/\r?\n/).filter(line=>!/^\s*<!-- tempvs-block:/.test(line)).map(line=>line.replace(/\s*<!-- tempvs-session:[^>]+-->\s*$/,'')).join('\n');
// Restore row identities behind the editor, so the visible form stays ordinary text.
export function restoreRowIds(original,edited){
 const rows=original.split(/\r?\n/).filter(line=>line.trim()&&!/^\s*(?:date:|<!-- tempvs-block:)/i.test(line));
 const next=edited.split(/\r?\n/);const actual=next.filter(line=>line.trim()&&!/^\s*date:/i.test(line));
 const used=new Set();let at=0;
 return next.map(line=>{
  if(!line.trim()||/^\s*date:/i.test(line))return line;
  const same=rows.findIndex((row,i)=>!used.has(i)&&plain(row)===line);
  const index=same>=0?same:actual.length===rows.length&&!used.has(at)?at:-1;at++;
  if(index<0)return line;used.add(index);
  return line+(rows[index].match(/\s*<!-- tempvs-session:[^>]+-->\s*$/)?.[0]||'');
 }).join('\n');
}
export class DailyBlocks {
 constructor(plugin){this.plugin=plugin;this.children=new Set();this.chain=Promise.resolve();this.destroyed=false;this.applying=false;this.timers=new Map();this.errors=new Map();this.detached=new Set();}
 get bindings(){return this.plugin.dailyNotes;}
 start(){
  for(const language of ['TEMPVS','tempvs','TEMPUS','tempus'])this.plugin.registerMarkdownCodeBlockProcessor(language,(source,el,ctx)=>ctx.addChild(new DailyBlock(el,this,ctx,source)));
  const vault=this.plugin.app.vault;
  if(this.plugin.app.workspace.on)this.plugin.registerEvent(this.plugin.app.workspace.on('editor-change',(_editor,view)=>{if(view?.file?.extension==='md')this.schedule(view.file.path);}));
  if(vault?.on){
   this.plugin.registerEvent(vault.on('modify',file=>{if(file.extension==='md')this.schedule(file.path);}));
   this.plugin.registerEvent(vault.on('delete',file=>{this.plugin.estimates?.archive(file.path).catch(e=>new Notice(e.message));}));
   this.plugin.registerEvent(vault.on('rename',(file,oldPath)=>{
    const newPath=file.path;
    this.queue(()=>this.moveReferences(oldPath,newPath)).catch(e=>new Notice('TEMPVS: '+e.message));
   }));
  }
  if(vault?.on)this.plugin.registerEvent(vault.on('create',file=>{if(file.extension==='md')this.schedule(file.path);}));
  this.plugin.addCommand({id:'unlink-daily-plan',name:'Scollega TEMPVS dalla nota attiva (conserva sessioni)',callback:()=>{const file=this.plugin.app.workspace.getActiveFile();if(file)this.detach(file.path).catch(error=>new Notice('TEMPVS: '+error.message));}});
  this.plugin.addCommand({id:'insert-daily-plan',name:'Inserisci blocco TEMPVS nella nota',editorCallback:editor=>editor.replaceSelection('```TEMPVS\n\n```\n')});
  this.plugin.app.workspace.onLayoutReady?.(()=>this.initialize().catch(error=>new Notice('TEMPVS: '+error.message)));
 }
 async moveReferences(oldPath,newPath){
  const plugin=this.plugin,cache=plugin.app.metadataCache;
  const resolve=(path,source)=>cache?.getFirstLinkpathDest?.(path,source);
  const move=(path,source='')=>movedTarget(path,oldPath,newPath,source,resolve);
  const relocated=path=>path===oldPath||path.startsWith(oldPath+'/')?newPath+path.slice(oldPath.length):path;
  return this.rewriteReferences(move,relocated);
 }
 async rewriteReferences(move,relocated=path=>path){
  const plugin=this.plugin;
  const bindings=Object.entries(this.bindings);
  const affected=bindings.filter(([,b])=>typeof b.source==='string'&&moveBlockLinks(b.source,p=>move(p,b.path))!==b.source);
  const notes=(plugin.estimates?.notes||[]).filter(n=>n.vault===plugin.estimates.vault&&relocated(n.path)!==n.path);
  const records=[...plugin.state.sessions,...(plugin.state.history||[])];
  const sourceOf=r=>this.bindings[r.noteBlockId]?.path||'';
  const changes=records.filter(r=>r.linkedNotes?.some(n=>move(n.path,sourceOf(r))!==n.path));
  if(!affected.length&&!notes.length&&!changes.length&&!bindings.some(([,b])=>relocated(b.path)!==b.path))return;
  this.applying=true;
  try{
   await plugin.change(()=>{
    for(const r of changes)for(const n of r.linkedNotes){
     const path=move(n.path,sourceOf(r));
     if(n.path===n.label)n.label=path;
     n.path=path;
    }
    for(const n of notes){n.path=relocated(n.path);n.title=n.path.split('/').pop().replace(/\.md$/i,'');}
    for(const [,b] of bindings)b.path=relocated(b.path);
   });
   for(const [id,b] of affected){
    const context=await this.context(b.path);
    if(!context||context.kind)continue;
    const original=context.block.source,next=moveBlockLinks(original,p=>move(p,b.path));
    if(original!==next)await this.writeSource(context.file,id,original,next,context.block.lineStart);
    if(b.source===original||moveBlockLinks(b.source,p=>move(p,b.path))===next)b.source=next;
    this.schedule(b.path);
   }
   if(affected.length)await plugin.persist();
  }finally{this.applying=false;this.refresh();}
 }
 queue(work){const result=this.chain.catch(()=>{}).then(()=>{if(this.destroyed)throw Error('TEMPVS non è attivo.');return work();});this.chain=result;return result;}
 refresh(path){for(const child of this.children)if(!path||child.ctx.sourcePath===path)child.refresh();}
 schedule(path){
  if(this.destroyed||this.detached.has(path))return;
  clearTimeout(this.timers.get(path));
  this.timers.set(path,setTimeout(()=>{this.timers.delete(path);this.syncFile(path).catch(error=>{this.errors.set(path,error.message);this.plugin.refresh?.(true);this.refresh(path);});},350));
 }
 async initialize(){
  const files=this.plugin.app.vault.getMarkdownFiles();
  const estimates=this.plugin.estimates;
  const move=archivedLinkResolver(files,estimates?.notes||[],estimates?.vault||'');
  await this.queue(()=>this.rewriteReferences(move));
  for(const file of files){
   if(this.destroyed)return;
   try{await this.syncFile(file.path,{force:true});}catch(error){this.errors.set(file.path,error.message);}
  }
  await this.archiveChanged();
 }
 async reconcilePlans(){
  const vault=this.plugin.app.vault;
  const files=vault?.getMarkdownFiles?.()||Object.values(this.bindings).map(b=>vault?.getAbstractFileByPath(b.path)).filter(Boolean);
  for(const file of files){
   if(this.destroyed)return;
   try{const context=await this.context(file.path);if(context&&!context.kind)await this.syncFile(file.path,{force:true});}
   catch(error){this.errors.set(file.path,error.message);}
  }
  this.plugin.refresh?.(true);this.refresh();
 }
 protectedBlocks(id){return Object.entries(this.bindings).filter(([other,b])=>other!==id&&this.plugin.app.vault.getAbstractFileByPath(b.path)).map(([other])=>other);}
 selectDay(path,date){
  if(this.plugin.app.workspace.getActiveFile?.()?.path!==path)return;
  for(const leaf of this.plugin.app.workspace.getLeavesOfType?.('tempvs-timer')||[]){if(leaf.view){leaf.view.day=date;leaf.view.update?.(true);}}
 }
 bindingId(path){return Object.keys(this.bindings).find(id=>this.bindings[id].path===path);}
 async readMarkdown(file){
  for(const leaf of this.plugin.app.workspace.getLeavesOfType?.('markdown')||[]){
   const view=leaf.view;
   if(view?.file?.path===file.path&&view.editor&&view.getMode?.()!=='preview')return view.editor.getValue();
  }
  return this.plugin.app.vault.read(file);
 }
 async context(path){
  const file=this.plugin.app.vault.getAbstractFileByPath(path);
  if(!file||file.extension!=='md')throw Error('La nota Markdown non è più disponibile.');
  const markdown=await this.readMarkdown(file),blocks=findDailyBlocks(markdown);
  if(!blocks.length){
   const value=this.plugin.app.metadataCache?.getFileCache(file)?.frontmatter?.tempvs;
   if(typeof value==='string'&&/^@?\d+(?:[.,]\d+)?[hm]$/i.test(value.trim()))return {file,kind:'estimate',block:{source:'@'+value.trim().replace(/^@/,'')}};
   return null;
  }
  if(blocks.length!==1)throw Error('Usa un solo blocco TEMPVS per nota giornaliera.');
  const block=blocks[0];
  if(!block.source.trim()&&this.plugin.estimates?.find(file.path))return {file,block,markdown,kind:"estimate-empty"};
  if(isEstimateSource(block.source))return {file,block,markdown,kind:"estimate"};
  const date=resolveDailyDate(block.source,file,{
   moment,format:this.plugin.app.internalPlugins?.getPluginById('daily-notes')?.instance?.options?.format||'YYYY-MM-DD',
   frontmatter:this.plugin.app.metadataCache?.getFileCache(file)?.frontmatter
  });
  return {file,block,date,markdown};
 }
 async locate(child){
  const context=await this.context(child.ctx.sourcePath);
  if(!context)throw Error('Blocco TEMPVS non trovato.');
  return context;
 }
 async syncEstimate(context,path){
  this.applying=true;
  try{if(context?.kind==='estimate')await this.plugin.estimates?.sync(context);else await this.plugin.estimates?.archive(path);}
  finally{this.applying=false;}
 }
 syncFile(path,{force=false}={}){return this.queue(async()=>{
  if(this.detached.has(path))return;
  const context=await this.context(path);
  if(!context){
   const id=this.bindingId(path);
   if(id&&isRegister(this.bindings[id].source)){
    this.applying=true;
    try{await this.plugin.change(()=>{
     const removeIds=this.plugin.state.sessions.filter(s=>s.noteBlockId===id).map(s=>s.id);
     applyRegister(this.plugin.state,{blockId:id,sessions:[],records:[],removeIds});
     delete this.bindings[id];
    });}finally{this.applying=false;}
   }
   await this.syncEstimate(null,path);return;
  }
  if(context.kind==="estimate-empty"){await this.syncEstimate(null,path);this.errors.delete(path);this.refresh(path);return;}
  if(context.kind==="estimate"){await this.syncEstimate(context,path);this.errors.delete(path);this.refresh(path);return;}
  await this.syncEstimate(null,path);
  const blockId=this.bindingId(path)||blockIdentity(context.block.source)||uid();
  this.validateBinding(blockId,path,context.date);
  const binding=this.bindings[blockId];
  if(!force&&binding?.agendaVersion===2&&binding.ratioVersion===1&&binding.source===context.block.source){this.errors.delete(path);this.selectDay(path,context.date);this.refresh(path);return;}
  const plan=prepareDailyPlan({source:context.block.source,date:context.date,blockId,previousSource:binding?.source,protectedBlockIds:this.protectedBlocks(blockId),state:this.plugin.state});
  await this.commit({...context,...plan,originalSource:context.block.source,keepSource:true});
  this.errors.delete(path);
  this.selectDay(path,context.date);
  this.plugin.refresh?.(true);this.refresh(path);
 });}
 validateBinding(id,path,date){
  const bound=this.bindings[id];
  if(bound&&(bound.path!==path||bound.date!==date))throw Error('Questo blocco TEMPVS è già collegato a un’altra nota o data. Non copiare i commenti identificativi.');
  if(Object.entries(this.bindings).some(([other,b])=>other!==id&&b.date===date))throw Error('Esiste già un blocco collegato a questa giornata. Usa il blocco originale.');
 }
 async preview(child,edited){
  const context=await this.locate(child),id=this.bindingId(context.file.path)||blockIdentity(context.block.source)||uid();
  this.validateBinding(id,context.file.path,context.date);
  if(edited!==undefined&&context.block.source!==child.source)throw Error('La nota è cambiata mentre modificavi le righe. Riapri il blocco prima di riprovare.');
  const source=edited===undefined?context.block.source:restoreRowIds(context.block.source,edited);
  const date=explicitDay(source)||context.date;
  if(date!==context.date)throw Error('Per cambiare giorno usa una daily note diversa.');
  const plan=prepareDailyPlan({source,date,blockId:id,previousSource:this.bindings[id]?.source,protectedBlockIds:this.protectedBlocks(id),state:this.plugin.state});
  return {...context,...plan,originalSource:context.block.source};
 }
 async writeSource(file,id,original,replacement,lineStart){
  if(this.destroyed)throw Error('TEMPVS non è attivo.');
  await this.plugin.app.vault.process(file,current=>{
   for(const leaf of this.plugin.app.workspace.getLeavesOfType?.('markdown')||[]){
    if(leaf.view?.file?.path===file.path&&leaf.view.editor&&leaf.view.editor.getValue()!==current)throw Error('Modifica in corso: attendo il salvataggio della nota.');
   }
   const blocks=findDailyBlocks(current);
   let matches=blocks.filter(b=>blockIdentity(b.source)===id);
   if(!matches.length)matches=blocks.filter(b=>b.source===original&&(lineStart===undefined||b.lineStart===lineStart));
   if(matches.length!==1||matches[0].source!==original)throw Error('La nota è cambiata durante la preview. Prepara nuovamente le modifiche.');
   return replaceDailyBlock(current,matches[0],replacement);
  });
 }
 async commit(prepared){
  if(archivePlanningKey(this.plugin.state)!==prepared.planningKey)throw Error('Le sessioni sono cambiate durante la preview. Prepara nuovamente le modifiche.');
  this.validateBinding(prepared.blockId,prepared.file.path,prepared.date);
  const newIds=prepared.sessions.filter(s=>!this.plugin.state.sessions.some(current=>current.id===s.id)).map(s=>s.id);
  const fresh=prepareDailyPlan({source:prepared.source,date:prepared.date,blockId:prepared.blockId,previousSource:prepared.previousSource,protectedBlockIds:prepared.protectedBlockIds,state:this.plugin.state,id:()=>newIds.shift()||uid()});
  const body=prepared.keepSource||fresh.records?plain(prepared.source):serializeDailyPlan(fresh.sessions,prepared.date);
  const canonical=explicitDay(prepared.originalSource)&&!explicitDay(body)?'date: '+prepared.date+'\n'+body:body;
  const previousBinding=this.bindings[prepared.blockId];
  this.applying=true;
  const writesNote=!prepared.keepSource||canonical!==prepared.originalSource;
  try{
   if(writesNote)await this.writeSource(prepared.file,prepared.blockId,prepared.originalSource,canonical,prepared.block.lineStart);
   else {
    const current=await this.context(prepared.file.path);
    if(!current||current.block.source!==prepared.originalSource||current.date!==prepared.date)throw Error('La nota è cambiata durante la sincronizzazione.');
   }
   try{
    if(archivePlanningKey(this.plugin.state)!==fresh.planningKey)throw Error('Le sessioni sono cambiate durante il salvataggio. Prepara nuovamente le modifiche.');
    await this.plugin.change(()=>{
     const available=fresh.sessions.filter(s=>!this.plugin.state.sessions.some(current=>current.id===s.id)).map(s=>s.id);
     const checked=prepareDailyPlan({source:prepared.source,date:prepared.date,blockId:prepared.blockId,previousSource:prepared.previousSource,protectedBlockIds:prepared.protectedBlockIds,state:this.plugin.state,id:()=>available.shift()||uid()});
     applyDailyPlan(this.plugin.state,checked);
     this.plugin.state=normalizeArchive(this.plugin.state);
     this.bindings[prepared.blockId]={path:prepared.file.path,date:prepared.date,source:canonical,ratioVersion:1,agendaVersion:2,hiddenSessionIds:checked.retainedIds,unusedMinutes:fresh.unusedMinutes};
    });
   }catch(error){
    if(previousBinding)this.bindings[prepared.blockId]=previousBinding;else delete this.bindings[prepared.blockId];
    try{if(writesNote)await this.writeSource(prepared.file,prepared.blockId,canonical,prepared.originalSource);}
    catch{throw Error('Salvataggio sessioni fallito e nota modificata nel frattempo. Le righe restano nella nota: verifica e riprepara la preview. '+error.message);}
    throw error;
   }
  }finally{this.applying=false;this.refresh(prepared.file.path);}
  return canonical;
 }
 apply(prepared){return this.queue(()=>this.commit(prepared));}
 updateSessionNotes(blockId,updates){return this.queue(async()=>{
  const binding=this.bindings[blockId];if(!binding)throw Error('Nota giornaliera non collegata.');
  const context=await this.context(binding.path);
  if(!context||context.block.source!==binding.source)throw Error('La nota giornaliera sta cambiando: attendi la sincronizzazione e riprova.');
  if(isRegister(binding.source))throw Error("Modifica il wikilink nella riga della nota quotidiana.");
  const sessions=daySessions(this.plugin.state,binding.date,blockId).filter(s=>!binding.hiddenSessionIds?.includes(s.id)).map(s=>updates.has(s.id)?{...s,linkedNotes:updates.get(s.id)}:s);
  const body=serializeDailyPlan(sessions,binding.date);
  const source=explicitDay(binding.source)?'date: '+binding.date+'\n'+body:body;
  const plan=prepareDailyPlan({source,date:binding.date,blockId,state:this.plugin.state,previousSource:binding.source,protectedBlockIds:this.protectedBlocks(blockId)});
  for(const session of plan.sessions)if(updates.has(session.id))delete session.noteEstimateId;
  await this.commit({...context,...plan,originalSource:context.block.source,keepSource:true});
 });}
 async includeDay(child){
  const context=await this.locate(child),blockId=this.bindingId(context.file.path)||blockIdentity(context.block.source)||uid();
  this.validateBinding(blockId,context.file.path,context.date);
  const source=serializeDailyPlan(daySessions(this.plugin.state,context.date,blockId),context.date,blockId);
  return {...context,...prepareDailyPlan({source,date:context.date,blockId,protectedBlockIds:this.protectedBlocks(blockId),state:this.plugin.state}),originalSource:context.block.source};
 }
 detach(path){return this.queue(async()=>{
  this.detached.add(path);clearTimeout(this.timers.get(path));
  const previous=JSON.parse(JSON.stringify(this.bindings));
  const ids=new Set(Object.keys(this.bindings).filter(id=>this.bindings[id].path===path));
  this.applying=true;
  try{await this.plugin.change(()=>{
   for(const id of ids)delete this.bindings[id];
   for(const session of this.plugin.state.sessions)if(ids.has(session.noteBlockId))delete session.noteBlockId;
  });}catch(error){this.plugin.dailyNotes=Object.assign(Object.create(null),previous);throw error;}
  finally{this.applying=false;this.refresh(path);}
 });}
 archiveChanged(){
  if(this.applying||this.destroyed)return Promise.resolve();
  return this.queue(async()=>{
   for(const [blockId,binding] of Object.entries(this.bindings)){
    if(this.detached.has(binding.path))continue;
    try{
     const context=await this.context(binding.path);if(!context)continue;
     // Edits in the note win. Never replace incomplete or unsaved user input.
     if(context.kind==="estimate"||binding.agendaVersion!==2||binding.ratioVersion!==1||context.block.source!==binding.source){this.schedule(binding.path);continue;}
     const sessions=daySessions(this.plugin.state,binding.date,blockId).filter(s=>!binding.hiddenSessionIds?.includes(s.id));
     if(isRegister(binding.source)||sessions.some(s=>s.registerMinutes))continue;
     const body=serializeDailyPlan(sessions,binding.date);
     const source=explicitDay(binding.source)?'date: '+binding.date+'\n'+body:body;
     if(source===binding.source)continue;
     const key=archivePlanningKey(this.plugin.state),previousSource=binding.source;
     this.applying=true;
     try{
      await this.writeSource(context.file,blockId,previousSource,source,context.block.lineStart);
      try{
       await this.plugin.change(()=>{
        if(archivePlanningKey(this.plugin.state)!==key)throw Error('Le sessioni sono cambiate durante il salvataggio della nota.');
        for(const session of this.plugin.state.sessions)if(sessions.some(s=>s.id===session.id))session.noteBlockId=blockId;
        this.bindings[blockId]={...binding,source,unusedMinutes:0};
       });
      }catch(error){
       this.bindings[blockId]=binding;
       await this.writeSource(context.file,blockId,source,previousSource,context.block.lineStart);
       throw error;
      }
     }finally{this.applying=false;}
     this.errors.delete(binding.path);
    }catch(error){this.errors.set(binding.path,error.message);}
   }
   this.refresh();
  });
 }

 destroy(){this.destroyed=true;for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();for(const child of this.children)child.disposed=true;this.children.clear();}
}
class DailyBlock extends MarkdownRenderChild {
 constructor(el,controller,ctx,source){super(el);this.controller=controller;this.ctx=ctx;this.source=source;this.disposed=false;}
 onload(){this.controller.children.add(this);this.refresh();this.controller.schedule(this.ctx.sourcePath);}
 onunload(){this.disposed=true;this.controller.children.delete(this);}
 async refresh(){
  const version=this.version=(this.version||0)+1;
  try{
   const context=await this.controller.locate(this);if(this.disposed||version!==this.version)return;
   this.source=context.block.source;
   if(context.kind==="estimate"||context.kind==="estimate-empty"){
    const el=this.containerEl;
    const menuOpen=el.querySelector('.tempvs-estimate-menu')?.open;
    el.empty();el.addClass("tempvs-daily");
    const error=this.controller.errors.get(this.ctx.sourcePath);
    if(error)el.createEl("p",{text:error,cls:"tempvs-daily-error"});
    const note=this.controller.plugin.estimates?.find(this.ctx.sourcePath);
    if(note&&!note.archived){
     const box=this.controller.plugin.estimates.render(el,note);
     if(menuOpen)box.querySelector('.tempvs-estimate-menu').open=true;
    }
    return;
   }
   const el=this.containerEl;el.empty();el.addClass('tempvs-daily');
   const code=el.createEl('pre').createEl('code');
   const lines=plain(this.source).split('\n');
   for(const [index,line] of lines.entries()){
    if(index)code.append('\n');
    const span=code.createSpan({text:line});
    const name=line.trim().split(/\s+(?=[+@])/)[0].toLocaleLowerCase();
    const area=this.controller.plugin.config.areas.find(a=>a.name.toLocaleLowerCase()===name);
    if(area){span.addClass('tempvs-area-mark');span.style.setProperty('--tempvs-area-color',area.color);}
   }
   const error=this.controller.errors.get(this.ctx.sourcePath);
   const binding=this.controller.bindings[this.controller.bindingId(this.ctx.sourcePath)];
   if(isRegister(this.source)){
    const rows=this.controller.plugin.state.history.filter(h=>h.registerBlock===this.controller.bindingId(this.ctx.sourcePath));
    el.createEl('small',{text:error||rows.reduce((sum,h)=>sum+h.minutes,0)+' min registrati, pause comprese',attr:{role:error?'alert':'status'}});
    return;
   }
   const manual=daySessions(this.controller.plugin.state,context.date,this.controller.bindingId(this.ctx.sourcePath)).filter(s=>s.noteBlockId===this.controller.bindingId(this.ctx.sourcePath));
   const actual=manual.reduce((n,s)=>n+(sessionBounds(s).end-sessionBounds(s).start),0)/60000;
   el.createEl('small',{text:error|| (binding?.source===this.source?'Intervalli sincronizzati'+(manual.length?' · '+new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(actual)+' min registrati, pause comprese':'')+(binding.unusedMinutes?' · '+binding.unusedMinutes+' minuti finali liberi':''):'Aggiornamento automatico…'),cls:error?'tempvs-daily-error':'tempvs-muted',attr:{role:error?'alert':'status'}});
  }catch(error){if(this.disposed||version!==this.version)return;this.containerEl.empty();this.containerEl.createEl('p',{text:error.message,cls:'tempvs-daily-error'});}
 }
}
