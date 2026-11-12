import {escapeHtml as esc, dateTime, formatTime} from './core/tempo-core.js';
import {parseQuick, focusCycle, customPause, grossCycle} from './core/tempo-simple.js';

// Fields are converted to the same requests used by the existing scheduler.
export function rowRequest(row, areas, defaultFocus) {
  if (!areas.some(a=>a.name===row.area)) throw Error('Scegli un’area disponibile.');
  const minutes=Number(row.minutes);
  if (!Number.isInteger(minutes)||minutes<1||minutes>10080) throw Error('Indica da 1 a 10080 minuti lordi interi.');
  if (!['windows','fixed'].includes(row.placement)) throw Error('Scegli come collocare la sessione.');
  if (row.placement==='fixed' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start)) throw Error('Indica l’orario di inizio.');
  if (row.placement==='fixed' && minutes>1440) throw Error('Con orario fisso la durata massima è 24 ore.');
  const request={area:row.area,minutes,...(row.placement==='fixed'?{start:row.start}:{})};
  if(row.mode==='auto') request.focusMinutes=focusCycle(Number(row.focus||defaultFocus)).focusMinutes;
  else if(row.mode==='cycle'){grossCycle(Number(row.cycle));request.cycleMinutes=Number(row.cycle);}
  else if(row.mode==='custom') {
    if(String(row.pause).trim()==='')throw Error('Indica i minuti di pausa finale.');
    request.customBreakMinutes=customPause(Number(row.pause),minutes);
  } else if(row.mode==='none')request.customBreakMinutes=0;
  else throw Error('Scegli la modalità di pausa.');
  return request;
}
export function requestSummary(request, date) {
  let text;
  if(request.customBreakMinutes!==undefined)text=(request.minutes-request.customBreakMinutes)+' min focus + '+request.customBreakMinutes+' min pausa';
  else {
    // Calculate the truncated final cycle too, exactly as the timer does.
    const c=request.cycleMinutes!==undefined?grossCycle(request.cycleMinutes):focusCycle(request.focusMinutes);
    const work=c.focusMinutes,rest=c.breakMinutes,cycle=work+rest;
    const focus=Math.floor(request.minutes/cycle)*work+Math.min(request.minutes%cycle,work);
    text=request.start?focus+' min focus + '+(request.minutes-focus)+' min pause · cicli '+work+'/'+rest:'Cicli '+work+'/'+rest+' · '+request.minutes+' min lordi, pause comprese';
  }
  if(request.start){
    const start=dateTime(date,request.start),end=new Date(+start+request.minutes*60000);
    if(!Number.isFinite(+start))throw Error('Scegli il giorno.');
    text+=' · fine '+formatTime(end)+(end.getDate()!==start.getDate()?' (+1 giorno)':'');
  }else text+=' · nelle fasce disponibili';
  return text;
}
export function createPlannerTable({document,areas,defaults,checkPlan,invalidate,onError}) {
  const $=id=>document.getElementById(id),body=$('planner-rows');
  let sequence=0;
  function newRow(request) {
    const id=++sequence;
    const row=document.createElement('tr');row.dataset.row=String(id);
    const mode=request?.cycleMinutes!==undefined?'cycle':request?.customBreakMinutes===0?'none':request?.customBreakMinutes!==undefined?'custom':request?'auto':defaults().breakEnabled?'auto':'none';
    const field=(name,label,html)=>'<td data-label="'+label+'">'+html+'</td>';
    const select=(name,label,options)=>'<select data-field="'+name+'" aria-label="'+label+' sessione '+id+'">'+options+'</select>';
    row.innerHTML=field('area','Area',select('area','Area',areas().map(a=>'<option>'+esc(a.name)+'</option>').join('')))
      +field('minutes','Durata lorda (min)','<input data-field="minutes" aria-label="Minuti lordi sessione '+id+'" type="number" min="1" max="10080" step="1" required value="45">')
      +field('start','Inizio',select('placement','Collocazione','<option value="windows">Nelle fasce</option><option value="fixed">Orario fisso</option>')+'<input data-field="start" aria-label="Orario di inizio sessione '+id+'" type="time" hidden disabled>')
      +field('mode','Pausa',select('mode','Modalità pausa','<option value="auto">Automatica</option><option value="cycle">Pomodoro lordo</option><option value="custom">Personalizzata</option><option value="none">Nessuna</option>')+'<details class="cycle-details"><summary>Ciclo</summary><label>Focus per ciclo (min)<input data-field="focus" type="number" min="1" max="240" placeholder="Predefinito"></label></details><input data-field="cycle" aria-label="Pomodoro lordo sessione '+id+'" type="number" min="2" max="288" value="60" hidden disabled>')
      +field('pause','Minuti pausa','<input data-field="pause" aria-label="Minuti pausa finale sessione '+id+'" type="number" min="0" max="10079" step="1" value="5" hidden disabled><span data-pause-label></span>')
      +field('summary','Riepilogo','<output class="row-summary" aria-live="polite"></output>')
      +'<td class="row-actions"><button type="button" data-remove aria-label="Elimina sessione '+id+'">×</button></td>';
    const set=(name,value)=>row.querySelector('[data-field="'+name+'"]').value=value;
    set('mode',mode);
    if(request?.cycleMinutes!==undefined)set('cycle',request.cycleMinutes);
    if(request){set('area',request.area);set('minutes',request.minutes);set('placement',request.start?'fixed':'windows');set('start',request.start||'');set('focus',request.focusMinutes||'');if(mode==='custom')set('pause',request.customBreakMinutes);}
    body.append(row);return row;
  }
  function values(row){return Object.fromEntries([...row.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,el.value]));}
  function requests(){
    if(!body.children.length)throw Error('Aggiungi almeno una sessione.');
    return [...body.children].map((row,i)=>{try{return rowRequest(values(row),areas(),$('quick-focus').value);}catch(e){throw Error('Riga '+(i+1)+': '+e.message);}});
  }
  function refresh(){
    invalidate();let invalid=false;
    for(const row of body.children){
      const v=values(row),get=name=>row.querySelector('[data-field="'+name+'"]');
      get('start').hidden=get('start').disabled=v.placement!=='fixed';get('start').required=v.placement==='fixed';
      get('cycle').hidden=get('cycle').disabled=v.mode!=='cycle';get('cycle').required=v.mode==='cycle';
      get('pause').hidden=get('pause').disabled=v.mode!=='custom';get('pause').required=v.mode==='custom';
      row.querySelector('.cycle-details').hidden=v.mode!=='auto';get('focus').disabled=v.mode!=='auto';
      row.querySelector('[data-pause-label]').textContent=v.mode==='auto'?'Automatici':v.mode==='none'?'—':'';
      const output=row.querySelector('output');
      try{output.textContent=requestSummary(rowRequest(v,areas(),$('quick-focus').value),$('quick-date').value);output.classList.remove('field-error');}
      catch(e){output.textContent=e.message;output.classList.add('field-error');invalid=true;}
    }
    const status=$('planner-status');status.textContent='';
    if(!invalid){try{const plan=checkPlan(requests());if(plan.remainder)status.textContent='Mancano '+plan.remainder+' minuti nelle fasce disponibili.';}catch(e){status.textContent=e.message;}}
    $('prepare-plan').disabled=invalid||!body.children.length;
  }
  body.addEventListener('input',refresh);
  body.addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(button){button.closest('tr').remove();refresh();}});
  $('planner-add').onclick=()=>{const row=newRow();refresh();row.querySelector('select').focus();};
  $('planner-import').onclick=()=>{
    try{
      const imported=parseQuick($('quick').value,areas());if(!imported.length)throw Error('Incolla almeno una sessione.');
      // Parse every line before changing the table: an error never imports half a batch.
      imported.forEach(newRow);$('quick').value='';refresh();
    }catch(e){onError(e.message);}
  };
  for(const id of ['quick-date','quick-focus'])$(id).addEventListener('input',refresh);
  newRow();refresh();
  return {requests,refresh,reset(){body.replaceChildren();newRow();refresh();},syncAreas(){
    for(const row of body.children){const select=row.querySelector('[data-field="area"]'),old=select.value;select.innerHTML=areas().map(a=>'<option>'+esc(a.name)+'</option>').join('');if(areas().some(a=>a.name===old))select.value=old;else{const missing=document.createElement('option');missing.value=old;missing.textContent=old+' (non disponibile)';select.append(missing);select.value=old;}}
    refresh();
  }};
}
