import {MarkdownRenderChild,Notice,moment} from 'obsidian';
import {normalizeArchive,sessionPauseLabel} from '../core/tempo-simple.js';
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
 constructor(plugin){this.plugin=plugin;this.children=new Set();this.chain=Promise.resolve();this.destroyed=false;this.applying=false;}
 get bindings(){return this.plugin.dailyNotes;}
 start(){
  for(const language of ['TEMPVS','tempvs'])this.plugin.registerMarkdownCodeBlockProcessor(language,(source,el,ctx)=>ctx.addChild(new DailyBlock(el,this,ctx,source)));
  const vault=this.plugin.app.vault;
  if(vault?.on){
   this.plugin.registerEvent(vault.on('modify',file=>{if(file.extension==='md'&&!this.applying)this.refresh(file.path);}));
   this.plugin.registerEvent(vault.on('rename',(file,oldPath)=>{
    let changed=false;for(const binding of Object.values(this.bindings))if(binding.path===oldPath||binding.path.startsWith(oldPath+'/')){binding.path=file.path+binding.path.slice(oldPath.length);changed=true;}
    if(changed)this.plugin.persist().catch(e=>new Notice('TEMPVS: '+e.message));this.refresh();
   }));
  }
  this.plugin.addCommand({id:'unlink-daily-plan',name:'Scollega TEMPVS dalla nota attiva (conserva sessioni)',callback:()=>{const file=this.plugin.app.workspace.getActiveFile();if(file)this.detach(file.path).catch(error=>new Notice('TEMPVS: '+error.message));}});
  this.plugin.addCommand({id:'insert-daily-plan',name:'Inserisci blocco TEMPVS nella nota',editorCallback:editor=>editor.replaceSelection('```TEMPVS\n\n```\n')});
  this.plugin.app.workspace.onLayoutReady?.(()=>this.archiveChanged().catch(error=>new Notice('TEMPVS: '+error.message)));
 }
 queue(work){const result=this.chain.catch(()=>{}).then(()=>{if(this.destroyed)throw Error('TEMPVS non è attivo.');return work();});this.chain=result;return result;}
 refresh(path){for(const child of this.children)if(!path||child.ctx.sourcePath===path)child.refresh();}
 async locate(child){
  const file=this.plugin.app.vault.getAbstractFileByPath(child.ctx.sourcePath);
  if(!file||file.extension!=='md')throw Error('La nota Markdown non è più disponibile.');
  const markdown=await this.plugin.app.vault.read(file),blocks=findDailyBlocks(markdown);
  let matches=child.blockId?blocks.filter(b=>blockIdentity(b.source)===child.blockId):[];
  if(!matches.length&&!child.blockId){
   const line=child.ctx.getSectionInfo(child.containerEl)?.lineStart;
   matches=blocks.filter(b=>b.lineStart===line&&b.source===child.source);
   if(!matches.length)matches=blocks.filter(b=>b.source===child.source);
  }
  if(matches.length!==1)throw Error('Blocco TEMPVS non identificabile: riapri la nota e mantieni un solo identificativo per blocco.');
  const block=matches[0];const date=resolveDailyDate(block.source,file,{
   moment,format:this.plugin.app.internalPlugins?.getPluginById('daily-notes')?.instance?.options?.format||'YYYY-MM-DD',
   frontmatter:this.plugin.app.metadataCache?.getFileCache(file)?.frontmatter
  });
  return {file,block,date,markdown};
 }
 validateBinding(id,path,date){
  const bound=this.bindings[id];
  if(bound&&(bound.path!==path||bound.date!==date))throw Error('Questo blocco TEMPVS è già collegato a un’altra nota o data. Non copiare i commenti identificativi.');
  if(Object.entries(this.bindings).some(([other,b])=>other!==id&&b.date===date))throw Error('Esiste già un blocco collegato a questa giornata. Usa il blocco originale.');
 }
 async preview(child,edited){
  const context=await this.locate(child),id=blockIdentity(context.block.source)||uid();
  this.validateBinding(id,context.file.path,context.date);
  if(edited!==undefined&&context.block.source!==child.source)throw Error('La nota è cambiata mentre modificavi le righe. Riapri il blocco prima di riprovare.');
  const source=edited===undefined?context.block.source:restoreRowIds(context.block.source,edited);
  const date=explicitDay(source)||context.date;
  if(date!==context.date)throw Error('Per cambiare giorno usa una daily note diversa.');
  const plan=prepareDailyPlan({source,date,blockId:id,state:this.plugin.state});
  return {...context,...plan,originalSource:context.block.source};
 }
 async writeSource(file,id,original,replacement,lineStart){
  if(this.destroyed)throw Error('TEMPVS non è attivo.');
  await this.plugin.app.vault.process(file,current=>{
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
  const fresh=prepareDailyPlan({source:prepared.source,date:prepared.date,blockId:prepared.blockId,state:this.plugin.state,id:()=>newIds.shift()||uid()});
  const canonical=serializeDailyPlan(fresh.sessions,prepared.date,prepared.blockId);
  const previousBinding=this.bindings[prepared.blockId];
  this.applying=true;
  try{
   await this.writeSource(prepared.file,prepared.blockId,prepared.originalSource,canonical,prepared.block.lineStart);
   try{
    if(archivePlanningKey(this.plugin.state)!==fresh.planningKey)throw Error('Le sessioni sono cambiate durante il salvataggio. Prepara nuovamente le modifiche.');
    await this.plugin.change(()=>{
     const available=fresh.sessions.filter(s=>!this.plugin.state.sessions.some(current=>current.id===s.id)).map(s=>s.id);
     const checked=prepareDailyPlan({source:prepared.source,date:prepared.date,blockId:prepared.blockId,state:this.plugin.state,id:()=>available.shift()||uid()});
     applyDailyPlan(this.plugin.state,checked);
     this.plugin.state=normalizeArchive(this.plugin.state);
     this.bindings[prepared.blockId]={path:prepared.file.path,date:prepared.date,source:canonical};
    });
   }catch(error){
    if(previousBinding)this.bindings[prepared.blockId]=previousBinding;else delete this.bindings[prepared.blockId];
    try{await this.writeSource(prepared.file,prepared.blockId,canonical,prepared.originalSource);}
    catch{throw Error('Salvataggio sessioni fallito e nota modificata nel frattempo. Le righe restano nella nota: verifica e riprepara la preview. '+error.message);}
    throw error;
   }
  }finally{this.applying=false;this.refresh(prepared.file.path);}
  return canonical;
 }
 apply(prepared){return this.queue(()=>this.commit(prepared));}
 async includeDay(child){
  const context=await this.locate(child),blockId=blockIdentity(context.block.source)||uid();
  this.validateBinding(blockId,context.file.path,context.date);
  const source=serializeDailyPlan(daySessions(this.plugin.state,context.date,blockId),context.date,blockId);
  return {...context,...prepareDailyPlan({source,date:context.date,blockId,state:this.plugin.state}),originalSource:context.block.source};
 }
 detach(path){return this.queue(async()=>{
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
    const file=this.plugin.app.vault.getAbstractFileByPath(binding.path);if(!file)continue;
    try{
     const markdown=await this.plugin.app.vault.read(file),blocks=findDailyBlocks(markdown).filter(b=>blockIdentity(b.source)===blockId);
     // Never replace a user's unfinished edit, including edits made while unloaded.
     if(blocks.length!==1||blocks[0].source!==binding.source)continue;
     const sessions=daySessions(this.plugin.state,binding.date,blockId);
     const source=serializeDailyPlan(sessions,binding.date,blockId);
     if(source===binding.source)continue;
     const prepared={file,block:blocks[0],...prepareDailyPlan({source,date:binding.date,blockId,state:this.plugin.state}),originalSource:binding.source};
     await this.commit(prepared);
    }catch(error){new Notice('TEMPVS: nota non aggiornata, dati del plugin conservati. '+error.message);}
   }
   this.refresh();
  });
 }
 destroy(){this.destroyed=true;for(const child of this.children)child.disposed=true;this.children.clear();}
}
class DailyBlock extends MarkdownRenderChild {
 constructor(el,controller,ctx,source){super(el);this.controller=controller;this.ctx=ctx;this.source=source.replace(/\r?\n$/,'');this.disposed=false;}
 onload(){this.controller.children.add(this);this.refresh();}
 onunload(){this.disposed=true;this.controller.children.delete(this);}
 async action(callback){
  if(this.busy)return;this.busy=true;
  try{await callback();}catch(error){this.message.textContent=error.message;this.message.setAttribute('role','alert');}
  finally{this.busy=false;}
 }
 async refresh(){
  if(this.disposed||this.busy||this.editing||this.proposal)return;
  const version=this.version=(this.version||0)+1;
  try{
   const context=await this.controller.locate(this);if(this.disposed||version!==this.version||this.busy||this.editing||this.proposal)return;
   this.source=context.block.source;this.blockId=blockIdentity(this.source);
   this.draw(context);
  }catch(error){if(this.disposed||this.editing||this.proposal)return;this.containerEl.empty();this.containerEl.createEl('p',{text:'TEMPVS: '+error.message,cls:'tempvs-daily-error'});}
 }
 draw(context){
  const el=this.containerEl;el.empty();el.addClass('tempvs-daily');
  el.createEl('h4',{text:'TEMPVS · '+context.date});
  this.message=el.createEl('p',{cls:'tempvs-help',attr:{role:'status'}});
  const binding=this.controller.bindings[this.blockId];
  this.message.textContent=binding&&binding.source!==this.source?'Testo modificato: prepara e conferma le modifiche prima di aggiornare le sessioni.':'Durate lorde, pause comprese. Le sessioni avviate e concluse sono protette.';
  const sessions=daySessions(this.controller.plugin.state,context.date,this.blockId);
  if(sessions.length){
   const table=el.createEl('table',{cls:'tempvs-daily-table'}),head=table.createEl('thead').createEl('tr');
   for(const text of ['Area','Orario','Sessione'])head.createEl('th',{text,attr:{scope:'col'}});
   const body=table.createEl('tbody');
   for(const session of sessions){
    const row=body.createEl('tr');row.createEl('td',{text:session.area||session.title});
    row.createEl('td',{text:session.start+'–'+session.end+(session.date!==context.date?' (+1 giorno)':'')});
    row.createEl('td',{text:(isLocked(session)?'Protetta · ':'')+sessionPauseLabel(session)});
   }
  }else el.createEl('p',{text:'Nessuna sessione salvata per questa giornata.',cls:'tempvs-muted'});
  this.editor=el.createEl('textarea',{cls:'tempvs-daily-editor',attr:{rows:'6','aria-label':'Pianificazione TEMPVS della nota',spellcheck:'false'}});
  this.editor.value=plain(this.source);this.editor.hidden=true;
  const controls=el.createDiv({cls:'tempvs-daily-actions'});
  const action=(text,callback)=>{const b=controls.createEl('button',{text,attr:{type:'button'}});b.onclick=()=>this.action(callback);return b;};
  action('Modifica righe',()=>{this.editing=true;this.editor.hidden=false;this.editor.focus();});
  this.editor.addEventListener('input',()=>{this.proposal=null;this.previewEl?.empty();this.message.textContent='Righe modificate: prepara nuovamente la preview.';});
  action('Prepara modifiche',async()=>{this.proposal=null;this.previewEl.empty();this.proposal=await this.controller.preview(this,this.editing?this.editor.value:undefined);this.showProposal();});
  action('Includi sessioni del giorno',async()=>{this.proposal=null;this.previewEl.empty();this.proposal=await this.controller.includeDay(this);this.showProposal();});
  action('Annulla',()=>{this.editing=false;this.proposal=null;this.busy=false;this.refresh();});
  this.previewEl=el.createDiv({cls:'tempvs-daily-preview'});
 }
 showProposal(){
  const plan=this.proposal,el=this.previewEl;el.empty();
  el.createEl('p',{text:plan.sessions.length+' sessioni · '+plan.removeIds.length+' da rimuovere.'+(plan.unusedMinutes?' '+plan.unusedMinutes+' minuti finali lasciati liberi: solo sessioni intere.':'')});
  for(const s of plan.sessions)el.createEl('p',{text:(s.area||s.title)+' · '+s.date+' · '+s.start+'–'+s.end+' · '+sessionPauseLabel(s)});
  const confirm=el.createEl('button',{text:'Applica alla nota e al plugin',cls:'mod-cta',attr:{type:'button'}});
  confirm.onclick=()=>this.action(async()=>{
   await this.controller.apply(plan);this.blockId=plan.blockId;this.editing=false;this.proposal=null;
   this.busy=false;await this.refresh();
  });
 }
}
