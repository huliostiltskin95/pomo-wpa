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

export function allocationRow({area,minutes,cycleMinutes,note,id}){
 return area+' @'+minutes+'m'+(cycleMinutes?' -'+cycleMinutes+'m':'')+
  (note?' [['+note.path+(note.label&&note.label!==note.path?'|'+note.label:'')+']]':'')+
  (id?' <!-- tempvs-allocation:'+id+' -->':'');
}

export function appendAllocation(markdown,row){
 const block=allocationBlock(markdown);
 if(block)return replaceDailyBlock(markdown,block,[block.source,row].filter(Boolean).join('\n'));
 const nl=markdown.includes('\r\n')?'\r\n':'\n';
 const next=(markdown?markdown+(markdown.endsWith(nl)?nl:nl+nl):'')+'```tempvs-assegnazioni'+nl+row+nl+'```'+nl;
 if(!allocationBlock(next))throw Error('Chiudi il blocco di codice aperto nella nota.');
 return next;
}
