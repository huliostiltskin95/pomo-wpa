import {isEstimateSource} from '../core/tempo-estimates.js';
import {MarkdownRenderChild,Notice,moment} from 'obsidian';
import {normalizeArchive} from '../core/tempo-simple.js';
import {sessionBounds} from '../core/tempo-core.js';
import {findDailyBlocks,blockIdentity,explicitDay,resolveDailyDate,replaceDailyBlock,prepareDailyPlan,applyDailyPlan,serializeDailyPlan,archivePlanningKey,daySessions,isLocked} from './daily-plan.js';

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
    this.plugin.estimates?.rename(file,oldPath).catch(e=>new Notice(e.message));
    let changed=false;for(const binding of Object.values(this.bindings))if(binding.path===oldPath||binding.path.startsWith(oldPath+'/')){binding.path=file.path+binding.path.slice(oldPath.length);changed=true;}
    if(changed)this.plugin.persist().catch(e=>new Notice('TEMPVS: '+e.message));this.refresh();
   }));
  }
  if(vault?.on)this.plugin.registerEvent(vault.on('create',file=>{if(file.extension==='md')this.schedule(file.path);}));
  this.plugin.addCommand({id:'unlink-daily-plan',name:'Scollega TEMPVS dalla nota attiva (conserva sessioni)',callback:()=>{const file=this.plugin.app.workspace.getActiveFile();if(file)this.detach(file.path).catch(error=>new Notice('TEMPVS: '+error.message));}});
  this.plugin.addCommand({id:'insert-daily-plan',name:'Inserisci blocco TEMPVS nella nota',editorCallback:editor=>editor.replaceSelection('```TEMPVS\n\n```\n')});
  this.plugin.app.workspace.onLayoutReady?.(()=>this.initialize().catch(error=>new Notice('TEMPVS: '+error.message)));
 }
 queue(work){const result=this.chain.catch(()=>{}).then(()=>{if(this.destroyed)throw Error('TEMPVS non è attivo.');return work();});this.chain=result;return result;}
 refresh(path){for(const child of this.children)if(!path||child.ctx.sourcePath===path)child.refresh();}
 schedule(path){
  if(this.destroyed||this.detached.has(path))return;
  clearTimeout(this.timers.get(path));
  this.timers.set(path,setTimeout(()=>{this.timers.delete(path);this.syncFile(path).catch(error=>{this.errors.set(path,error.message);this.plugin.refresh?.(true);this.refresh(path);});},350));
 }
 async initialize(){
  for(const file of this.plugin.app.vault.getMarkdownFiles()){
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
  if(!blocks.length)return null;
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
  if(!context){await this.syncEstimate(null,path);return;}
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
  const body=prepared.keepSource?plain(prepared.source):serializeDailyPlan(fresh.sessions,prepared.date);
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
    const el=this.containerEl;el.empty();el.addClass("tempvs-daily");el.createEl("pre").createEl("code",{text:this.source});
    const error=this.controller.errors.get(this.ctx.sourcePath);
    if(error)el.createEl("p",{text:error,cls:"tempvs-daily-error"});
    const note=this.controller.plugin.estimates?.find(this.ctx.sourcePath);
    if(note&&!note.archived)this.controller.plugin.estimates.render(el,note);
    return;
   }
   const el=this.containerEl;el.empty();el.addClass('tempvs-daily');
   el.createEl('pre').createEl('code',{text:plain(this.source)});
   const error=this.controller.errors.get(this.ctx.sourcePath);
   const binding=this.controller.bindings[this.controller.bindingId(this.ctx.sourcePath)];
   const manual=daySessions(this.controller.plugin.state,context.date,this.controller.bindingId(this.ctx.sourcePath)).filter(s=>s.actualSource==='manual');
   const actual=manual.reduce((n,s)=>n+(s.actualSeconds||0),0)/60;
   el.createEl('small',{text:error|| (binding?.source===this.source?'Intervalli sincronizzati'+(manual.length?' · '+new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(actual)+' min effettivi con correzioni manuali':'')+(binding.unusedMinutes?' · '+binding.unusedMinutes+' minuti finali liberi':''):'Aggiornamento automatico…'),cls:error?'tempvs-daily-error':'tempvs-muted',attr:{role:error?'alert':'status'}});
  }catch(error){if(this.disposed||version!==this.version)return;this.containerEl.empty();this.containerEl.createEl('p',{text:error.message,cls:'tempvs-daily-error'});}
 }
}
