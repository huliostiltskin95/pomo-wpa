import {flexibleAllocation} from './plain-syntax.js';
import {matchBudgetHeading} from './area-register.js';
import {allocationBlock,appendUnifiedAllocation,mergeAllocationBlocks,readAllocations} from './daily-allocations.js';
import {DailyPlannerModal} from './daily-planner-modal.js';
import {creditedWork} from './daily-register.js';
import {isLedger,updateLedger} from './note-ledger.js';
import {renderSyntaxLine} from './syntax.js';
import {movedTarget,moveBlockLinks,archivedLinkResolver} from './moved-links.js';
import {isEstimateSource,isActivitySource,markActivity} from '../core/tempo-estimates.js';
import {MarkdownRenderChild,Notice,moment} from 'obsidian';
import {normalizeArchive} from '../core/tempo-simple.js';
import {sessionBounds} from '../core/tempo-core.js';
import {isRegister,applyRegister,findDailyBlocks,blockIdentity,explicitDay,resolveDailyDate,replaceDailyBlock,prepareDailyPlan,applyDailyPlan,serializeDailyPlan,archivePlanningKey,daySessions,isLocked} from './daily-plan.js';

function newDailyPlanIds(plan, state) {
  const existing = new Set(state.sessions.map((session) => session.id));
  if (plan.records) {
    // A register row can already have a history ID without a timed session.
    for (const record of state.history) existing.add(record.sessionId);
    return plan.records.map((record) => record.sessionId).filter((id) => !existing.has(id));
  }
  return plan.sessions.map((session) => session.id).filter((id) => !existing.has(id));
}

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
 constructor(plugin){this.plugin=plugin;this.children=new Set();this.chain=Promise.resolve();this.destroyed=false;this.applying=false;this.timers=new Map();this.errors=new Map();this.detached=new Set();this.ledgerVersions=new Map();this.allocationsByDay=new Map();}
 get bindings(){return this.plugin.dailyNotes;}
 start(){
  for(const language of ['TEMPVS','tempvs','TEMPUS','tempus'])this.plugin.registerMarkdownCodeBlockProcessor(language,(source,el,ctx)=>ctx.addChild(new DailyBlock(el,this,ctx,source)));
  this.plugin.registerMarkdownCodeBlockProcessor('tempvs-assegnazioni',(source,el)=>{
   el.createEl('strong',{text:'TEMPVS · Da programmare'});
   el.createEl('pre').createEl('code',{text:source.replace(/\s+<!-- tempvs-allocation:[\w-]+ -->/g,'')});
  });
  const vault=this.plugin.app.vault;
  if(this.plugin.app.workspace.on)this.plugin.registerEvent(this.plugin.app.workspace.on('editor-change',(_editor,view)=>{if(view?.file?.extension==='md')this.schedule(view.file.path);}));
  if(this.plugin.app.workspace.on)this.plugin.registerEvent(this.plugin.app.workspace.on('file-open',file=>{
   const date=this.panelDay(file);
   if(date)this.selectDay(file.path,date);
   else for(const {view} of this.plugin.app.workspace.getLeavesOfType?.('tempvs-timer')||[]){
    if(file&&view)view.dailyContext=null;
   }
   if(file?.extension==='md'&&!date)this.schedule(file.path);
  }));
  if(vault?.on){
   this.plugin.registerEvent(vault.on('modify',file=>{if(file.extension==='md')this.schedule(file.path);}));
   this.plugin.registerEvent(vault.on('delete',file=>{
    for(const [day,entries] of this.allocationsByDay)if(entries.some(entry=>entry.file.path===file.path))this.allocationsByDay.delete(day);
    this.plugin.refresh?.(true);
   }));
   this.plugin.registerEvent(vault.on('delete',file=>{this.plugin.estimates?.archive(file.path).catch(e=>new Notice(e.message));}));
   this.plugin.registerEvent(vault.on('rename',(file,oldPath)=>{
    const newPath=file.path;
    this.queue(()=>this.moveReferences(oldPath,newPath)).catch(e=>new Notice('TEMPVS: '+e.message));
   }));
  }
  if(vault?.on)this.plugin.registerEvent(vault.on('create',file=>{if(file.extension==='md'){this.schedule(file.path);this.queue(()=>this.syncLedgers()).catch(error=>new Notice(error.message));}}));
  this.plugin.addCommand({id:'unlink-daily-plan',name:'Scollega TEMPVS dalla nota attiva (conserva sessioni)',callback:()=>{const file=this.plugin.app.workspace.getActiveFile();if(file)this.detach(file.path).catch(error=>new Notice('TEMPVS: '+error.message));}});
  this.plugin.addCommand({id:'plan-daily-note',name:'Pianifica la giornata',callback:async()=>{
   try{new DailyPlannerModal(this,await this.plannerTarget()).open();}
   catch(error){new Notice(error.message);}
  }});
  this.plugin.addCommand({id:'insert-daily-plan',name:'Inserisci blocco TEMPVS nella nota',editorCallback:editor=>editor.replaceSelection('```TEMPVS\n\n```\n')});
  this.plugin.app.workspace.onLayoutReady?.(()=>this.initialize().catch(error=>new Notice('TEMPVS: '+error.message)));
 }
 dailyLocation(date){
  const {workspace,vault,internalPlugins}=this.plugin.app;
  const active=workspace.getActiveFile?.();
  const binding=Object.values(this.bindings).find(entry=>entry.date===date);
  const settings=internalPlugins?.getPluginById('daily-notes')?.instance?.options||{};
  const format=settings.format||'YYYY-MM-DD';
  const name=moment?.(date,'YYYY-MM-DD',true)?.format?.(format)||date;
  const path=[settings.folder,name+'.md'].filter(Boolean).join('/').replace(/^\/+|\/+(?=\/)/g,'');
  const activeMatches=active?.extension==='md'&&(active.basename===date||active.basename===name.split('/').at(-1));
  const cached=this.allocationsByDay.get(date)?.[0]?.file;
  const file=(binding&&vault?.getAbstractFileByPath(binding.path))||
   (activeMatches?active:null)||vault?.getAbstractFileByPath(path)||(cached&&vault?.getAbstractFileByPath(cached.path));
  return {file:file?.extension==='md'?file:null,path,settings};
 }
 async loadAllocations(date,file=this.dailyLocation(date).file){
  if(!file){
   if(this.allocationsByDay.delete(date))this.plugin.refresh?.(true);
   return;
  }
  const markdown=await this.readMarkdown(file);
  this.cacheAllocations(date,file,markdown);
 }
 cacheAllocations(date,file,markdown){
  const entries=readAllocations(allocationBlock(markdown),file,date,this.plugin.state.defaults.simple.areas);
  const previous=this.allocationsByDay.get(date)||[];
  if(!entries.length)this.allocationsByDay.delete(date);
  else this.allocationsByDay.set(date,entries);
  if(JSON.stringify(previous.map(({file,...entry})=>entry))!==JSON.stringify(entries.map(({file,...entry})=>entry)))
   this.plugin.refresh?.(true);
 }
 async writeAllocation(allocation){
  const file=await this.queue(async()=>{
   const {vault}=this.plugin.app;
   let markdown;
   let {file,path,settings}=this.dailyLocation(allocation.date);
   if(!file){
    const folders=path.split('/').slice(0,-1);
    for(let i=1;i<=folders.length;i++){
     const folder=folders.slice(0,i).join('/');
     if(!vault.getAbstractFileByPath(folder))await vault.createFolder(folder);
    }
    const template=settings.template&&(
     this.plugin.app.metadataCache?.getFirstLinkpathDest?.(settings.template,'')||
     vault.getAbstractFileByPath(settings.template)
    );
    const initial=template?.extension==='md'?await vault.read(template):'';
    const day=moment?.(allocation.date,'YYYY-MM-DD',true);
    const title=path.split('/').at(-1).slice(0,-3);
    const body=initial.replace(/{{title}}/gi,()=>title)
     .replace(/{{date(?::([^}]+))?}}/gi,(_all,format)=>day?.format?.(format||'YYYY-MM-DD')||allocation.date)
     .replace(/{{time(?::([^}]+))?}}/gi,(all,format)=>moment?.()?.format?.(format||'HH:mm')||all);
    markdown=appendUnifiedAllocation(body,allocation);
    this.validateAllocationSource(markdown,allocation.date,path);
    file=await vault.create(path,markdown);
   }else{
    const before=await this.readMarkdown(file);
    if(!allocation.id||!findDailyBlocks(before)[0]?.source.includes('<!-- tempvs-allocation:'+allocation.id+' -->')){
     markdown=appendUnifiedAllocation(before,allocation);
     this.validateAllocationSource(markdown,allocation.date,file.path);
     await this.replaceAllocationText(file,before,markdown);
    }
   }
   return file;
  });
  try{await this.syncFile(file.path);}
  catch(error){this.schedule(file.path);new Notice('Assegnazione salvata. Sincronizzazione TEMPVS: '+error.message);}
 }
 validateAllocationSource(markdown,date,path){
  const block=findDailyBlocks(markdown)[0];
  const blockId=this.bindingId(path)||blockIdentity(block.source)||uid();
  this.validateBinding(blockId,path,date);
  prepareDailyPlan({source:block.source,date,blockId,state:this.plugin.state,previousSource:this.bindings[blockId]?.source,
   protectedBlockIds:this.protectedBlocks(blockId)});
 }
 updateUnifiedAllocation(entry,start){
  return this.queue(async()=>{
   const context=await this.context(entry.file.path);
   const blockId=this.bindingId(entry.file.path);
   const lines=context?.block.source.split(/\r?\n/);
   if(context?.date!==entry.date||!blockId||lines?.[entry.index]!==entry.raw)
    throw Error('L’assegnazione è cambiata. Riapri la giornata e riprova.');
   if(start && flexibleAllocation(entry.raw))lines[entry.index]=entry.raw.trimEnd()+' '+start;
   else if(start)lines[entry.index]=entry.raw.replace(/^(\s*-\s*(?:\[\[[^\]\[]+\]\]\s+)?@\d+(?:[.,]\d+)?[hms]?)(?=\s|$)/i,'$1 +'+start);
   else lines.splice(entry.index,1);
   const source=lines.join('\n');
   const plan=prepareDailyPlan({source,date:entry.date,blockId,state:this.plugin.state,previousSource:context.block.source,
    protectedBlockIds:this.protectedBlocks(blockId)});
   await this.commit({...context,...plan,originalSource:context.block.source,preserveSource:true});
   this.plugin.refresh?.(true);
  });
 }
 async replaceAllocationText(file,before,after){
  const {vault,workspace}=this.plugin.app;
  await vault.process(file,current=>{
   if(current!==before||(workspace.getLeavesOfType?.('markdown')||[]).some(({view})=>
    view?.file?.path===file.path&&view.getMode?.()!=='preview'&&view.editor&&view.editor.getValue()!==current))
    throw Error('La nota sta cambiando. Attendi il salvataggio e riprova.');
   return after;
  });
 }
 async consumeAllocation(entry,commit){
  await this.queue(async()=>{
   const {file,date,index,raw}=entry;
   const before=await this.readMarkdown(file),block=allocationBlock(before);
   const lines=block?.source.split(/\r?\n/);
   if(lines?.[index]!==raw)throw Error('L’assegnazione è cambiata. Riapri la giornata e riprova.');
   lines.splice(index,1);
   const after=replaceDailyBlock(before,block,lines.join('\n'));
   await this.replaceAllocationText(file,before,after);
   this.applying=true;
   try{if(commit)await commit();}
   catch(error){
    await this.replaceAllocationText(file,after,before);
    throw error;
   }finally{this.applying=false;}
   this.cacheAllocations(date,file,after);
  });
  if(commit)await this.archiveChanged();
 }
 async migrateAllocationBlock(file){
  const before=await this.readMarkdown(file);
  if(!/tempvs-assegnazioni/i.test(before)||!allocationBlock(before))return;
  const context=await this.context(file.path);
  const date=context?.date||this.panelDay(file);
  if(!date||context?.kind)return;
  const after=mergeAllocationBlocks(before,file,date,this.plugin.state.defaults.simple.areas);
  if(before===after)return;
  if(findDailyBlocks(after).length)this.validateAllocationSource(after,date,file.path);
  await this.replaceAllocationText(file,before,after);
 }
 async migrateAllocations(){
  for(const entry of this.plugin.allocations||[]){
   try{
    await this.writeAllocation(entry);
    await this.plugin.change(()=>{
     this.plugin.allocations=this.plugin.allocations.filter(item=>item.id!==entry.id);
    });
   }catch(error){new Notice('TEMPVS: assegnazione del '+entry.date+' ancora da trasferire. '+error.message);}
  }
 }
 async plannerTarget(){
  const {workspace,vault,internalPlugins}=this.plugin.app;
  const settings=internalPlugins?.getPluginById('daily-notes')?.instance?.options||{};
  const format=settings.format||'YYYY-MM-DD';
  const active=workspace.getActiveFile?.();
  if(active?.extension==='md'){
   if(this.bindingId(active.path)||moment(active.basename,format,true).isValid()||/^\d{4}-\d\d-\d\d$/.test(active.basename))return active;
   const context=await this.context(active.path).catch(()=>null);
   if(context?.date)return active;
  }
  const today=moment();
  const binding=Object.values(this.bindings).find(b=>b.date===today.format('YYYY-MM-DD'));
  const path=binding?.path||[settings.folder,today.format(format)+'.md'].filter(Boolean).join('/').replace(/^\/+|\/+(?=\/)/g,'');
  const file=vault.getAbstractFileByPath(path);
  if(file?.extension==='md')return file;
  throw Error('Apri la nota quotidiana da pianificare e richiama il comando.');
 }
 async appendPlannerRow(file,row){
  if(!row.trim()||/[\r\n]/.test(row))throw Error('Inserisci una sola attività.');
  await this.queue(async()=>{
   const {vault,workspace,metadataCache,internalPlugins}=this.plugin.app;
   const context=await this.context(file.path);
   if(context?.kind)throw Error('Questa nota contiene una stima o un totale. Apri la nota quotidiana.');
   const markdown=context?.markdown??await this.readMarkdown(file);
   if(findDailyBlocks(markdown,true).length!==findDailyBlocks(markdown).length)throw Error('Chiudi il blocco TEMPVS prima di aggiungere una riga.');
   const original=context?.block.source||'';
   const source=original+(original&&!original.endsWith('\n')?'\n':'')+row;
   const date=context?.date||resolveDailyDate('',file,{moment,format:internalPlugins?.getPluginById('daily-notes')?.instance?.options?.format||'YYYY-MM-DD',frontmatter:metadataCache?.getFileCache(file)?.frontmatter});
   const id=this.bindingId(file.path)||blockIdentity(original)||uid();
   this.validateBinding(id,file.path,date);
   prepareDailyPlan({source,date,blockId:id,state:this.plugin.state,previousSource:this.bindings[id]?.source,protectedBlockIds:this.protectedBlocks(id)});
   const nl=markdown.includes('\r\n')?'\r\n':'\n';
   const next=context?replaceDailyBlock(markdown,context.block,source):markdown+(markdown&&!markdown.endsWith(nl)?nl:'')+nl+'```TEMPVS'+nl+row+nl+'```'+nl;
   if(!findDailyBlocks(next).some(b=>b.source.replace(/\r\n/g,'\n')===source.replace(/\r\n/g,'\n')))throw Error('Chiudi il blocco di codice aperto nella nota.');
   await vault.process(file,current=>{
    if(current!==markdown||(workspace.getLeavesOfType?.('markdown')||[]).some(({view})=>view?.file?.path===file.path&&view.getMode?.()!=='preview'&&view.editor&&view.editor.getValue()!==current))throw Error('La nota sta cambiando. Attendi il salvataggio e riprova.');
    return next;
   });
   this.detached.delete(file.path);
  });
  // The row is already durable. A sync failure must not invite a duplicate submission.
  try{await this.syncFile(file.path);}
  catch(error){this.schedule(file.path);new Notice('Riga salvata. Sincronizzazione TEMPVS: '+error.message);}
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
  const allocations=(plugin.allocations||[]).map(entry=>{
   if(!entry.note)return entry;
   const path=move(entry.note.path);
   return path===entry.note.path?entry:{...entry,note:{...entry.note,path}};
  });
  const allocationsChanged=allocations.some((entry,index)=>entry!==plugin.allocations[index]);
  if(!allocationsChanged&&!affected.length&&!notes.length&&!changes.length&&!bindings.some(([,b])=>relocated(b.path)!==b.path))return;
  this.applying=true;
  try{
   await plugin.change(()=>{
    if(allocationsChanged)plugin.allocations=allocations;
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
 async syncLedgers(forcePath){
  const {app,state}=this.plugin,vault=app.vault;
  if(!vault?.process)return;
  const totals=new Map();
  creditedWork(state,(path,source)=>app.metadataCache?.getFirstLinkpathDest?.(path,source)?.path,id=>this.bindings[id]?.path,totals);
  const paths=forcePath?[forcePath]:new Set([...totals.keys(),...this.ledgerVersions.keys()]);
  for(const path of paths){
   const areas=totals.get(path)||new Map(),version=JSON.stringify([...areas]);
   if(!forcePath&&version===this.ledgerVersions.get(path))continue;
   const file=vault.getAbstractFileByPath(path);
   if(file?.extension!=='md'||file.path!==path){this.ledgerVersions.delete(path);continue;}
   try{
    const markdown=await this.readMarkdown(file);
    if(updateLedger(markdown,areas)!==markdown){
     await vault.process(file,current=>{
      if(current!==markdown)throw Error('Modifica in corso: attendo il salvataggio della nota.');
      return updateLedger(current,areas);
     });
    }
    this.ledgerVersions.set(path,version);
   }catch(error){this.errors.set(path,error.message);this.ledgerVersions.delete(path);this.refresh(path);}
  }
 }
 async initialize(){
  const files=this.plugin.app.vault.getMarkdownFiles();
  const estimates=this.plugin.estimates;
  const move=archivedLinkResolver(files,estimates?.notes||[],estimates?.vault||'');
  await this.queue(()=>this.rewriteReferences(move));
  for(const file of files){
   if(this.destroyed)return;
   try{await this.migrateAllocationBlock(file);}
   catch(error){new Notice('TEMPVS: blocco precedente conservato in '+file.path+'. '+error.message);}
   try{await this.syncFile(file.path,{force:true});}catch(error){this.errors.set(file.path,error.message);}
  }
  await this.migrateAllocations();
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
 panelDay(file=this.plugin.app.workspace.getActiveFile?.()){
  if(file?.extension!=='md')return null;
  const bound=this.bindings[this.bindingId(file.path)];
  if(bound)return bound.date;
  try{
   return resolveDailyDate('',file,{
    moment:moment||globalThis.moment,
    format:this.plugin.app.internalPlugins?.getPluginById('daily-notes')?.instance?.options?.format||'YYYY-MM-DD',
    frontmatter:this.plugin.app.metadataCache?.getFileCache(file)?.frontmatter
   });
  }catch{return null;}
 }
 selectDay(path,date){
  if(this.plugin.app.workspace.getActiveFile?.()?.path!==path)return;
  for(const {view} of this.plugin.app.workspace.getLeavesOfType?.('tempvs-timer')||[]){
   if(view?.dailyContext===path+':'+date)continue;
   if(view?.selectDay){view.dailyContext=path+':'+date;view.selectDay(date);}
  }
 }
 bindingId(path){return Object.keys(this.bindings).find(id=>this.bindings[id].path===path);}
 async readMarkdown(file){
  for(const leaf of this.plugin.app.workspace.getLeavesOfType?.('markdown')||[]){
   const view=leaf.view;
   if(view?.file?.path===file.path&&view.editor&&view.getMode?.()!=='preview')return view.editor.getValue();
  }
  return this.plugin.app.vault.read(file);
 }
 async context(path,renderSource){
  const file=this.plugin.app.vault.getAbstractFileByPath(path);
  if(!file||file.extension!=='md')throw Error('La nota Markdown non è più disponibile.');
  const markdown=await this.readMarkdown(file),blocks=findDailyBlocks(markdown);
  const ledger=blocks.find(b=>isLedger(b.source));
  if(ledger&&(blocks.length===1||isLedger(renderSource)))return {file,block:ledger,markdown,kind:'ledger'};
  const plans=blocks.filter(b=>!isLedger(b.source));
  if(!plans.length){
   const value=this.plugin.app.metadataCache?.getFileCache(file)?.frontmatter?.tempvs;
   if(typeof value==='string'&&/^@?\d+(?:[.,]\d+)?[hm]$/i.test(value.trim()))return {file,kind:'estimate',block:{source:'@'+value.trim().replace(/^@/,'')}};
   return null;
  }
  if(plans.length!==1)throw Error('Usa un solo blocco TEMPVS per nota giornaliera.');
  const block=plans[0];
  if(!block.source.trim()&&this.plugin.estimates?.find(file.path))return {file,block,markdown,kind:"estimate-empty"};
  if(isEstimateSource(block.source.split(/\r?\n/).filter(line=>!flexibleAllocation(line)).join('\n')))return {file,block,markdown,kind:"estimate"};
  const date=resolveDailyDate(block.source,file,{
   moment,format:this.plugin.app.internalPlugins?.getPluginById('daily-notes')?.instance?.options?.format||'YYYY-MM-DD',
   frontmatter:this.plugin.app.metadataCache?.getFileCache(file)?.frontmatter
  });
  return {file,block,date,markdown};
 }
 async locate(child){
  const context=await this.context(child.ctx.sourcePath,child.source);
  if(!context)throw Error('Blocco TEMPVS non trovato.');
  return context;
 }
 toggleActivity(path,completed){
  return this.queue(async()=>{
   const context=await this.context(path);
   if(context?.kind!=='estimate'||!isActivitySource(context.block.source))throw Error('Il blocco attività TEMPVS è cambiato.');
   const {file,block}=context,source=markActivity(block.source,completed);
   const changed=source!==block.source;
   if(changed)await this.writeSource(file,undefined,block.source,source,block.lineStart);
   try{await this.syncEstimate({...context,block:{...block,source}},path);}
   catch(error){
    if(changed)await this.writeSource(file,undefined,source,block.source,block.lineStart);
    throw error;
   }
   this.errors.delete(path);this.refresh(path);
  });
 }
 async syncEstimate(context,path){
  this.applying=true;
  try{if(context?.kind==='estimate')await this.plugin.estimates?.sync(context);else await this.plugin.estimates?.archive(path);}
  finally{this.applying=false;}
 }
 syncFile(path,{force=false}={}){return this.queue(async()=>{
  if(this.detached.has(path))return;
  const context=await this.context(path);
  const file=context?.file||this.plugin.app.vault.getAbstractFileByPath(path);
  const date=context?.date||this.panelDay(file);
  if(date&&file){
   const target=this.dailyLocation(date).file;
   if(context?.date||!target||target.path===file.path)await this.loadAllocations(date,file);
  }
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
   await this.syncEstimate(null,path);if(id)await this.syncLedgers();return;
  }
  if(context.kind==='ledger'){
   await this.syncEstimate(null,path);
   this.errors.delete(path);await this.syncLedgers(path);this.refresh(path);return;
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
   let matches=id?blocks.filter(b=>blockIdentity(b.source)===id):[];
   if(!matches.length)matches=blocks.filter(b=>b.source===original&&(lineStart===undefined||b.lineStart===lineStart));
   if(matches.length!==1||matches[0].source!==original)throw Error('La nota è cambiata durante la preview. Prepara nuovamente le modifiche.');
   return replaceDailyBlock(current,matches[0],replacement);
  });
 }
 async commit(prepared){
  if(archivePlanningKey(this.plugin.state)!==prepared.planningKey)throw Error('Le sessioni sono cambiate durante la preview. Prepara nuovamente le modifiche.');
  this.validateBinding(prepared.blockId,prepared.file.path,prepared.date);
  const newIds=newDailyPlanIds(prepared, this.plugin.state);
  const fresh=prepareDailyPlan({source:prepared.source,date:prepared.date,blockId:prepared.blockId,previousSource:prepared.previousSource,protectedBlockIds:prepared.protectedBlockIds,state:this.plugin.state,id:()=>newIds.shift()||uid()});
  const body=prepared.keepSource||prepared.preserveSource||fresh.records?plain(prepared.source):serializeDailyPlan(fresh.sessions,prepared.date,prepared.source);
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
     const available=newDailyPlanIds(fresh, this.plugin.state);
     const checked=prepareDailyPlan({source:prepared.source,date:prepared.date,blockId:prepared.blockId,previousSource:prepared.previousSource,protectedBlockIds:prepared.protectedBlockIds,state:this.plugin.state,id:()=>available.shift()||uid()});
     applyDailyPlan(this.plugin.state,checked);
     this.plugin.state=normalizeArchive(this.plugin.state);
     this.bindings[prepared.blockId]={path:prepared.file.path,date:prepared.date,source:canonical,ratioVersion:1,agendaVersion:2,hiddenSessionIds:checked.retainedIds,budgets:fresh.budgets,unusedMinutes:fresh.unusedMinutes};
    });
   }catch(error){
    if(previousBinding)this.bindings[prepared.blockId]=previousBinding;else delete this.bindings[prepared.blockId];
    try{if(writesNote)await this.writeSource(prepared.file,prepared.blockId,canonical,prepared.originalSource);}
    catch{throw Error('Salvataggio sessioni fallito e nota modificata nel frattempo. Le righe restano nella nota: verifica e riprepara la preview. '+error.message);}
    throw error;
   }
  }finally{this.applying=false;this.refresh(prepared.file.path);}
  await this.syncLedgers();
  return canonical;
 }
 apply(prepared){return this.queue(()=>this.commit(prepared));}
 updateSessionNotes(blockId,updates){return this.queue(async()=>{
  const binding=this.bindings[blockId];if(!binding)throw Error('Nota giornaliera non collegata.');
  const context=await this.context(binding.path);
  if(!context||context.block.source!==binding.source)throw Error('La nota giornaliera sta cambiando: attendi la sincronizzazione e riprova.');
  if(isRegister(binding.source))throw Error("Modifica il wikilink nella riga della nota quotidiana.");
  const sessions=daySessions(this.plugin.state,binding.date,blockId).filter(s=>!binding.hiddenSessionIds?.includes(s.id)).map(s=>updates.has(s.id)?{...s,linkedNotes:updates.get(s.id)}:s);
  const body=serializeDailyPlan(sessions,binding.date,binding.source);
  const source=explicitDay(binding.source)?'date: '+binding.date+'\n'+body:body;
  const plan=prepareDailyPlan({source,date:binding.date,blockId,state:this.plugin.state,previousSource:binding.source,protectedBlockIds:this.protectedBlocks(blockId)});
  for(const session of plan.sessions)if(updates.has(session.id))delete session.noteEstimateId;
  await this.commit({...context,...plan,originalSource:context.block.source,keepSource:true});
 });}
 async includeDay(child){
  const context=await this.locate(child),blockId=this.bindingId(context.file.path)||blockIdentity(context.block.source)||uid();
  this.validateBinding(blockId,context.file.path,context.date);
  const source=serializeDailyPlan(daySessions(this.plugin.state,context.date,blockId),context.date,context.block.source);
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
     const body=serializeDailyPlan(sessions,binding.date,binding.source);
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
   await this.syncLedgers();
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
    renderSyntaxLine(code,line,this.controller.plugin.config.areas,(target,newLeaf)=>
     this.controller.plugin.app.workspace.openLinkText(target,this.ctx.sourcePath,newLeaf).catch(e=>new Notice(e.message)));
   }
   const error=this.controller.errors.get(this.ctx.sourcePath);
   const binding=this.controller.bindings[this.controller.bindingId(this.ctx.sourcePath)];
   if(context.kind==="ledger"){if(error)el.createEl("small",{text:error});return;}
   if(isRegister(this.source)){
    const rows=this.controller.plugin.state.history.filter(h=>h.registerBlock===this.controller.bindingId(this.ctx.sourcePath));
    el.createEl('small',{text:error||new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(rows.reduce((sum,h)=>sum+h.minutes,0))+' min registrati, pause comprese',attr:{role:error?'alert':'status'}});
    const legacy=lines.map(matchBudgetHeading).find(heading=>heading?.legacy);
    if(legacy&&!error)el.createEl('small',{cls:'tempvs-muted',text:'Per il budget usa '+legacy.name+' = '+legacy.value+legacy.unit+'.'});
    return;
   }
   const manual=daySessions(this.controller.plugin.state,context.date,this.controller.bindingId(this.ctx.sourcePath)).filter(s=>s.noteBlockId===this.controller.bindingId(this.ctx.sourcePath));
   const actual=manual.reduce((n,s)=>n+(sessionBounds(s).end-sessionBounds(s).start),0)/60000;
   el.createEl('small',{text:error|| (binding?.source===this.source?'Intervalli sincronizzati'+(manual.length?' · '+new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(actual)+' min registrati, pause comprese':'')+(binding.unusedMinutes?' · '+binding.unusedMinutes+' minuti finali liberi':''):'Aggiornamento automatico…'),cls:error?'tempvs-daily-error':'tempvs-muted',attr:{role:error?'alert':'status'}});
  }catch(error){if(this.disposed||version!==this.version)return;this.containerEl.empty();this.containerEl.createEl('p',{text:error.message,cls:'tempvs-daily-error'});}
 }
}
