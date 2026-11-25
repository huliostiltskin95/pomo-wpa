import {findDailyBlocks,replaceDailyBlock} from './daily-plan.js';
import {noteLinks} from './notes-integration.js';
import {parseQuick} from '../core/tempo-simple.js';

const language=/^tempvs-assegnazioni$/i;
const identity=/\s+<!-- tempvs-allocation:([\w-]+) -->\s*$/;

export function allocationBlock(markdown){
 const blocks=findDailyBlocks(markdown,true,language);
 if(blocks.length!==findDailyBlocks(markdown,false,language).length)
  throw Error('Chiudi il blocco TEMPVS delle assegnazioni.');
 if(blocks.length>1)throw Error('Usa un solo blocco di assegnazioni TEMPVS per nota.');
 return blocks[0];
}

export function readAllocations(block,file,date,areas){
 const entries=[];
 for(const [index,raw] of (block?.source||'').split(/\r?\n/).entries()){
  if(!raw.trim())continue;
  const marker=raw.match(identity);
  const links=/\[\[[^\]\n]+\]\]/g;
  const row=raw.replace(identity,'');
  const [note]=noteLinks(row.match(links)?.join(' '));
  try{
   const [request]=parseQuick(row.replace(links,'').trim(),areas);
   if(!request||request.start||request.minutes>1439)
    throw Error('Usa una durata da 1 a 1439 minuti senza orario.');
   entries.push({...request,id:marker?.[1]||file.path+':'+index,date,note,file,raw,index});
  }catch(error){throw Error('Assegnazione TEMPVS, riga '+(index+1)+': '+error.message);}
 }
 return entries;
}

export function mergeAllocationBlocks(markdown,file,date,areas){
 const legacy=allocationBlock(markdown);
 if(!legacy)return markdown;
 const entries=readAllocations(legacy,file,date,areas);
 if(entries.some(entry=>entry.focusMinutes!==undefined||entry.customBreakMinutes!==undefined))
  throw Error('Il blocco precedente contiene impostazioni di focus o pausa personalizzate.');
 const lines=markdown.match(/[^\n]*\n|[^\n]+$/g)||[];
 const afterClosing=markdown.indexOf('\n',legacy.end);
 const beforeOpening=lines.slice(0,legacy.lineStart).join('').length;
 const clean=markdown.slice(0,beforeOpening)+markdown.slice(afterClosing<0?markdown.length:afterClosing+1);
 return entries.reduce((result,{id,...entry})=>
  !id.includes(':')&&findDailyBlocks(result)[0]?.source.includes('<!-- tempvs-allocation:'+id+' -->')?
   result:appendUnifiedAllocation(result,{...entry,id:id.includes(':')?undefined:id}),clean);
}

export function unifiedAllocationRow({area,minutes,cycleMinutes,note,id,start},explicitArea=true){
 const wiki=note?'[['+note.path+(note.label&&note.label!==note.path?'|'+note.label:'')+']] ':'';
 return '- '+wiki+'@'+minutes+'m'+(start?' +'+start:'')+(cycleMinutes?' -'+cycleMinutes+'m':'')+
  (explicitArea?' @'+area:'')+(id?' <!-- tempvs-allocation:'+id+' -->':'');
}

export function appendUnifiedAllocation(markdown,allocation){
 const blocks=findDailyBlocks(markdown,true);
 if(blocks.length!==findDailyBlocks(markdown).length||blocks.length>1)
  throw Error('Usa un solo blocco TEMPVS chiuso nella nota giornaliera.');
 const block=blocks[0];
 const lines=block?.source.split(/\r?\n/)||[];
 const heading=line=>line.trim().match(/^([^\[+@=-][^\[+@=]*?)\s+@\d+(?:[.,]\d+)?[hms]?$/i)?.[1];
 const at=lines.findIndex(line=>heading(line)?.toLowerCase()===allocation.area.toLowerCase());
 let end=at+1;
 while(at>=0&&end<lines.length&&!heading(lines[end]))end++;
 lines.splice(at>=0?end:lines.length,0,unifiedAllocationRow(allocation,at<0));
 const source=lines.join('\n');
 if(block)return replaceDailyBlock(markdown,block,source);
 const nl=markdown.includes('\r\n')?'\r\n':'\n';
 const next=(markdown?markdown+(markdown.endsWith(nl)?nl:nl+nl):'')+'```TEMPVS'+nl+source+nl+'```'+nl;
 if(!findDailyBlocks(next).length)throw Error('Chiudi il blocco di codice aperto nella nota.');
 return next;
}
