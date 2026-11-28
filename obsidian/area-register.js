import {isReminder} from './plain-syntax.js';
import {expandDailyLine} from './plain-syntax.js';
import {parseQuick} from '../core/tempo-simple.js';
import {noteLinks} from './notes-integration.js';

const quantity='(\\d+(?:[.,]\\d+)?)([hms]?)';
const time='((?:[01]\\d|2[0-3]):[0-5]\\d)';
const areaLine=new RegExp('^([^-].*?)\\s+(@|=\\s*)'+quantity+'$','i');
export function matchBudgetHeading(line){
 const match=line.trim().match(areaLine);
 if(!match||match[1].includes('[[')||(match[2]!=='@'&&match[1].includes('@')))return null;
 const [,name,operator,value,unit]=match;
 return {name:name.trim(),value,unit,legacy:operator==='@'};
}
const taskLine=new RegExp('^-\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s+@'+quantity+'\\s*=\\s*(\\d+)(?:\\s+\\+'+time+')?$','i');
const timedTask=new RegExp('^-\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s+@'+quantity+'\\s*=\\s*(\\d+)\\s+(\\d[^@]*?)(?:\\s+@(.+))?$','i');
const clockRange=new RegExp('^'+time+'\\s*-\\s*'+time+'$');
const minuteOf=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));

function timedSlots(match,budget,areas,sourceRow){
 const [,link,value,unit,count,ranges,areaName]=match;
 const area=areaName?areas.find(a=>a.name.toLowerCase()===areaName.toLowerCase()):
  budget?{name:budget.area,id:budget.areaId}:areas[0];
 if(!area)throw Error('Indica un’area valida.');
 const linkedNotes=noteLinks(link);
 const parts=ranges.split(';');
 if(parts.length!==Number(count))throw Error('Il numero di fasce orarie deve corrispondere al numero di sessioni.');
 let afterMidnight=false;
 const slots=parts.map(part=>{
  const range=clockRange.exec(part.trim());
  if(!range||range[1]===range[2])throw Error('Usa fasce HH:MM-HH:MM con inizio e fine distinti.');
  const [,start,end]=range,delta=minuteOf(end)-minuteOf(start);
  const dayOffset=afterMidnight?1:0;
  if(delta<0)afterMidnight=true;
  return {area:area.name,areaId:area.id,linkedNotes,sourceRow,start,end,dayOffset,minutes:delta<0?1440+delta:delta};
 });
 if(slots.reduce((total,slot)=>total+slot.minutes*60,0)!==secondsOf(value,unit))
  throw Error('La somma delle fasce orarie deve corrispondere alla durata lorda della riga.');
 return slots;
}
const plannedTask=/^-\s*(?:(\[\[[^\]\[]+\]\])\s+)?@(\d+(?:[.,]\d+)?)([hms]?)(?:\s+\+((?:[01]\d|2[0-3]):[0-5]\d)(?::([0-5]\d(?:\.\d{1,3})?))?)?(?:\s+-(\d+)m)?(?:\s+~(\d+)m)?(?:\s+!(\d+)m)?(?:\s+(\+1d))?(?:\s+@(.+?))?$/i;
const compactTask=/^-\s*((?:\[\[[^\[\]]+\]\]\s+)+)(\d+(?:[.,]\d+)?)([hms])(?:\s*=\s*(\d+))?(?:\s+\+((?:[01]\d|2[0-3]):[0-5]\d))?\s+@(.+?)$/i;
const possibleTask=new RegExp('^-?\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s*[@*]?\\s*'+quantity+'\\s*=?\\s+(\\d+)(?:\\s*\\+?\\s*'+time+')?$','i');
const possibleArea=new RegExp('^(.+?)\\s+[@*]?'+quantity+'$','i');
export const isAreaRegister=source=>source?.split(/\r?\n/).some(line=>{
 const text=expandDailyLine(line.replace(/\s+<!-- tempvs-allocation:[\w-]+ -->\s*$/,'').trim());
 return matchBudgetHeading(text)||plannedTask.test(text)||/^\s*-?\s*\[\[.*\]\]\s+[@*\d]/.test(text)||
  (!/[+=]/.test(text)&&!text.startsWith('@')&&possibleArea.test(text));
});
export function readableDuration(seconds){
 const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=Math.round(seconds%60);
 return [h&&h+' h',m&&m+' min',s&&s+' s'].filter(Boolean).join(' ')||'0 min';
}
function secondsOf(value,unit){
 const seconds=Math.round(Number(value.replace(',','.'))*({s:1,m:60,h:3600}[(unit||'h').toLowerCase()])*1e7)/1e7;
 if(!Number.isSafeInteger(seconds)||seconds<1)throw Error('Usa una durata positiva esprimibile in secondi interi.');
 return seconds;
}
function suggestion(line){
 const task=line.match(possibleTask);
 if(task)return '- '+task[1]+' @'+task[2]+task[3]+' = '+task[4]+(task[5]?' +'+task[5]:'');
 const incomplete=line.match(new RegExp('^-?\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s+[@*]?'+quantity+'$','i'));
 if(incomplete)return '- '+incomplete[1]+' @'+incomplete[2]+incomplete[3]+' = 1';
 const area=line.match(possibleArea);
 return area?area[1]+' = '+area[2]+area[3]:'- [[Nota]] @1h = 2 +14:00';
}
export function parseAreaRegister(source,areas){
 const budgets=[],slots=[];let budget;
 for(const [index,raw] of source.split(/\r?\n/).entries()){
  const line=expandDailyLine(raw.replace(/\s+<!-- tempvs-allocation:[\w-]+ -->\s*$/,'').trim());
  if(isReminder(line)||!line||/^date:\s*\d{4}-\d\d-\d\d$/i.test(line)||/^<!-- tempvs-block:[\w-]+ -->$/.test(line))continue;
  try{
   const heading=matchBudgetHeading(line);
   if(heading){
    const area=areas.find(a=>a.name.toLowerCase()===heading.name.toLowerCase());
    if(!area)throw Error('Area sconosciuta. Aree disponibili: '+areas.map(a=>a.name).join(', '));
    budget={area:area.name,areaId:area.id,seconds:secondsOf(heading.value,heading.unit),assigned:0};
    if(budgets.some(item=>item.areaId===area.id))throw Error('Indica un solo budget per area e giorno.');
    budgets.push(budget);continue;
   }
   const timed=line.match(timedTask);
   if(timed){slots.push(...timedSlots(timed,budget,areas,index));continue;}
   const planned=line.match(plannedTask);
   if(planned){
    const [,link,value,unit,start,secondsPart,cycle,focus,pause,nextDay,explicitArea]=planned;
    const area=explicitArea?areas.find(item=>item.name.toLowerCase()===explicitArea.trim().toLowerCase()):budget;
    if(!area)throw Error('Indica un’area valida sopra l’assegnazione o sulla stessa riga.');
    const seconds=secondsOf(value,unit),minutes=seconds/60;
    if(focus&&(Number(focus)<1||Number(focus)>240)||pause&&Number(pause)>=minutes||cycle&&(focus||pause))throw Error('Controlla focus e pausa della sessione.');
    if(!Number.isInteger(minutes)||minutes>1440)throw Error('Usa una durata da 1 a 1439 minuti interi.');

    const linkedNotes=noteLinks(link);
    if(link&&!linkedNotes.length)throw Error('Wikilink non valido.');
    slots.push({area:area.name||area.area,areaId:area.id||area.areaId,minutes,linkedNotes,start:start||null,
     planned:true,sourceRow:index,offset:Number(secondsPart||0),dayOffset:nextDay?1:0,
     ...(focus?{focusMinutes:Number(focus)}:{}),...(pause?{customBreakMinutes:Number(pause)}:{}),...(cycle?{cycleMinutes:Number(cycle)}:{})});
    continue;
   }
   if(/^[^-].*?\s+\+\s*\d\d:\d\d\s*-/.test(line)){
    const links=line.match(/\[\[[^\[\]]+\]\]/g)||[];
    const range=line.replace(/\[\[[^\[\]]+\]\]/g,'').trim();
    for(const slot of parseQuick(range,areas))slots.push({...slot,sourceRow:index,linkedNotes:noteLinks(links.join(' '))});
    continue;
   }
   if(/^[^-].*?\s+@.*?\s+\+\d\d:\d\d/.test(line)){
    const links=line.match(/\[\[[^\[\]]+\]\]/g)||[];
    for(const slot of parseQuick(line.replace(/\[\[[^\[\]]+\]\]/g,'').trim(),areas))
     slots.push({...slot,linkedNotes:noteLinks(links.join(' ')),planned:true,sourceRow:index});
    continue;
   }
   const compact=line.match(compactTask);
   if(!compact&&line.startsWith('-')&&line.includes(']]')&&!/\]\]\s+[@*]/.test(line)){
    throw Error('Indica la durata con unità e l’area sulla stessa riga, per esempio 11:45 30m Studio [[Nota]].');
   }
   if(!compact&&(line.match(/\[\[/g)||[]).length>1)throw Error('Nel vecchio formato usa un solo wikilink per riga.');
   const task=compact||line.match(taskLine);
   if(!task)throw Error('Sintassi da correggere. Prova: '+suggestion(line));
   const area=compact?areas.find(a=>a.name.toLowerCase()===compact[6].trim().toLowerCase()):(budget||areas[0]);
   if(compact&&!area)throw Error('Area sconosciuta: '+compact[6]);
   if(!area)throw Error('Indica l’area sulla riga, per esempio 30m Studio [[Nota]].');
   const [,link,value,unit,countText]=task,linkedNotes=noteLinks(link);
   if(!linkedNotes.length)throw Error('Indica una nota tra parentesi quadre doppie.');
   const seconds=secondsOf(value,unit),count=Number(countText??1);
   if(count<1||count>seconds||count>86400)throw Error('Indica almeno un pomodoro, con almeno un secondo ciascuno (massimo 86400).');

   const start=task[5];
   let offset=0;
   for(let i=0;i<count;i++){
    const duration=Math.floor(seconds/count)+Number(i<seconds%count);
    slots.push({area:area.name||area.area,areaId:area.id||area.areaId,sourceRow:index,minutes:duration/60,linkedNotes,start:start||null,offset});
    offset+=duration;
   }
  }catch(error){throw Error('Riga '+(index+1)+': '+error.message);}
 }
 const byArea=new Map(budgets.map(item=>[item.areaId,item]));
 for(const slot of slots){
  const target=byArea.get(slot.areaId);
  if(target)target.assigned+=Math.round(slot.minutes*60);
 }
 return {budgets,slots};
}
