import {findDailyBlocks,replaceDailyBlock} from './daily-plan.js';

export const isLedger=source=>/^\s*T:/im.test(source);
const row=/^\s*T:\s*(\d+(?:[.,]\d+)?)([hms]?)(?:\s*\/\s*(\d+(?:[.,]\d+)?)([hms]))?\s+@(.+?)\s*$/i;
const scale={h:3600,m:60,s:1};

function duration(seconds){
 const total=Math.round(seconds);
 for(const [unit,factor] of Object.entries(scale)){
  if(total%factor===0)return {value:total/factor,unit};
 }
}

export function updateLedger(markdown,totals){
 const blocks=findDailyBlocks(markdown,true),ledgers=blocks.filter(b=>isLedger(b.source));
 if(ledgers.length>1)throw Error('Riunisci i totali T: in un solo blocco TEMPVS.');
 if(blocks.length!==findDailyBlocks(markdown).length)throw Error('Chiudi il blocco TEMPVS prima di aggiornare il totale.');
 const block=ledgers[0];
 const remaining=new Map([...totals].map(([area,seconds])=>[area.toLowerCase(),{area,seconds}]));
 const seen=new Set(),lines=[];
 function format(area,seconds,target,unit){
  const done=duration(seconds);
  const left=done.value+(target&&done.unit===unit?'':done.unit);
  return 'T: '+left+(target?'/'+target+unit:'')+' @'+area;
 }
 for(const line of block?.source.split(/\r?\n/)||[]){
  if(!line.trim()){lines.push(line);continue;}
  const match=line.match(row);
  if(!match||(!match[2]&&!match[4]))throw Error('Usa T: 1h @Studio oppure T: 1/7h @Studio.');
  const [, , ,target,unit,area]=match,key=area.toLowerCase();
  if(seen.has(key))throw Error('Indica un solo totale per area.');
  seen.add(key);
  lines.push(format(area,remaining.get(key)?.seconds||0,target,unit));
  remaining.delete(key);
 }
 for(const {area,seconds} of remaining.values())lines.push(format(area,seconds));
 const source=lines.join('\n');
 if(block)return source===block.source.replace(/\r\n/g,'\n')?markdown:replaceDailyBlock(markdown,block,source);
 if(!lines.length)return markdown;
 // Reuse an empty block. Leave legacy estimates and daily plans intact.
 const empty=blocks.find(b=>!b.source.trim());
 if(empty&&findDailyBlocks(markdown).some(b=>b.start===empty.start))return replaceDailyBlock(markdown,empty,source);
 const nl=markdown.includes('\r\n')?'\r\n':'\n';
 return markdown+(markdown.endsWith(nl)?nl:nl+nl)+'```TEMPVS'+nl+lines.join(nl)+nl+'```'+nl;
}
