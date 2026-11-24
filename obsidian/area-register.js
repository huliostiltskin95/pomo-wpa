import {expandDailyLine} from './plain-syntax.js';
import {parseQuick} from '../core/tempo-simple.js';
import {noteLinks} from './notes-integration.js';

const quantity='(\\d+(?:[.,]\\d+)?)([hms]?)';
const time='((?:[01]\\d|2[0-3]):[0-5]\\d)';
const areaLine=new RegExp('^(.+?)\\s+@'+quantity+'$','i');
const taskLine=new RegExp('^-\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s+@'+quantity+'\\s*=\\s*(\\d+)(?:\\s+\\+'+time+')?$','i');
const compactTask=/^-\s*((?:\[\[[^\[\]]+\]\]\s+)+)(\d+(?:[.,]\d+)?)([hms])(?:\s*=\s*(\d+))?(?:\s+\+((?:[01]\d|2[0-3]):[0-5]\d))?\s+@(.+?)$/i;
const possibleTask=new RegExp('^-?\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s*[@*]?\\s*'+quantity+'\\s*=?\\s+(\\d+)(?:\\s*\\+?\\s*'+time+')?$','i');
const possibleArea=new RegExp('^(.+?)\\s+[@*]?'+quantity+'$','i');
export const isAreaRegister=source=>source?.split(/\r?\n/).some(line=>{
 const text=expandDailyLine(line.trim());
 return areaLine.test(text)||/^\s*-?\s*\[\[.*\]\]\s+[@*\d]/.test(text)||
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
 return area?area[1]+' @'+area[2]+area[3]:'- [[Nota]] @1h = 2 +14:00';
}
export function parseAreaRegister(source,areas){
 const budgets=[],slots=[];let budget;
 for(const [index,raw] of source.split(/\r?\n/).entries()){
  const line=expandDailyLine(raw.trim());
  if(!line||/^date:\s*\d{4}-\d\d-\d\d$/i.test(line)||/^<!-- tempvs-block:[\w-]+ -->$/.test(line))continue;
  try{
   const heading=line.match(areaLine);
   if(heading&&!line.includes('[[')){
    const area=areas.find(a=>a.name.toLowerCase()===heading[1].trim().toLowerCase());
    if(!area)throw Error('Area sconosciuta. Aree disponibili: '+areas.map(a=>a.name).join(', '));
    budget={area:area.name,areaId:area.id,seconds:secondsOf(heading[2],heading[3]),assigned:0};
    budgets.push(budget);continue;
   }
   if(/^[^-].*?\s+\+\s*\d\d:\d\d\s*-/.test(line)){
    const links=line.match(/\[\[[^\[\]]+\]\]/g)||[];
    const range=line.replace(/\[\[[^\[\]]+\]\]/g,'').trim();
    for(const slot of parseQuick(range,areas))slots.push({...slot,linkedNotes:noteLinks(links.join(' '))});
    continue;
   }
   const compact=line.match(compactTask);
   if(!compact&&line.startsWith('-')&&line.includes(']]')&&!/\]\]\s+[@*]/.test(line)){
    throw Error('Indica la durata con unità e l’area sulla stessa riga, per esempio Studio 30m 11:45 [[Nota]].');
   }
   if(!compact&&(line.match(/\[\[/g)||[]).length>1)throw Error('Nel vecchio formato usa un solo wikilink per riga.');
   const task=compact||line.match(taskLine);
   if(!task)throw Error('Sintassi da correggere. Prova: '+suggestion(line));
   const area=compact?areas.find(a=>a.name.toLowerCase()===compact[6].trim().toLowerCase()):budget;
   if(compact&&!area)throw Error('Area sconosciuta: '+compact[6]);
   if(!area)throw Error('Indica l’area sulla riga, per esempio Studio 30m [[Nota]].');
   const [,link,value,unit,countText]=task,linkedNotes=noteLinks(link);
   if(!linkedNotes.length)throw Error('Indica una nota tra parentesi quadre doppie.');
   const seconds=secondsOf(value,unit),count=Number(countText??1);
   if(count<1||count>seconds||count>86400)throw Error('Indica almeno un pomodoro, con almeno un secondo ciascuno (massimo 86400).');
   if(!compact)budget.assigned+=seconds;
   const start=task[5];
   let offset=0;
   for(let i=0;i<count;i++){
    const duration=Math.floor(seconds/count)+Number(i<seconds%count);
    slots.push({area:compact?area.name:area.area,areaId:compact?area.id:area.areaId,minutes:duration/60,linkedNotes,start:start||null,offset});
    offset+=duration;
   }
  }catch(error){throw Error('Riga '+(index+1)+': '+error.message);}
 }
 return {budgets,slots};
}
