import {initRefinedUI,editSessionDetails,chooseSyncConflict,updatePlannerDay} from './ui-refine.js';
import {createTimerPip,timerColor} from './timer-pip.js';
import {createPlannerTable} from './planner-table.js';
import {localDateString,formatDate,formatTime,escapeHtml as esc,sessionBounds,getActiveSession,getNextSession,getPhase,mmss,hasSessionOverlaps} from './core/tempo-core.js';
import {normalizeArchive,planSessions,parseQuick,measuredFocus,customPause,sessionPauseLabel,focusCycle,normalizeAreaColor,manualSessionEnd} from './core/tempo-simple.js';
import {TempoAmbientAudio} from './core/tempo-audio.js';
import {createDropboxSync} from './core/tempo-dropbox.js';
const $=id=>document.getElementById(id),KEY='tempo-pomodoro-v2',COPY='tempo-before-simple-v1';
const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
let planner;
let state,cloud,proposal=null,lastTick=Date.now(),lastSave=Date.now(),activeId=null,audioArmed=false,measuredDirty=false,toastTimer;
function tell(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
try{const raw=localStorage.getItem(KEY)||localStorage.getItem('tempo-pomodoro-v1');state=normalizeArchive(raw?JSON.parse(raw):{sessions:[]});if(raw&&!localStorage.getItem(COPY))localStorage.setItem(COPY,raw);localStorage.setItem(KEY,JSON.stringify(state));}catch(e){document.querySelector('main').textContent='Impossibile aprire o salvare l’archivio. I dati originali non sono stati sostituiti. '+e.message;throw e;}
const config=()=>state.defaults.simple;
const areaFor=name=>config().areas.find(a=>a.name===name);
const colorFor=name=>normalizeAreaColor(areaFor(name)?.color,name);
function pauseLabel(minutes,enabled) {
  try {const c=focusCycle(Number(minutes),enabled);return enabled
    ? c.focusMinutes+' min focus + '+c.breakMinutes+' min pausa automatica (5:1). La durata lorda comprende le pause.'
    : c.focusMinutes+' min focus, pause automatiche disattivate.';}
  catch{return 'Scegli una durata di focus da 1 a 240 minuti.';}
}
function pauseSettings(prefix,gross) {
  return $(prefix+'-pause-mode').value==='custom'
    ? {customBreakMinutes:customPause(Number($(prefix+'-pause-minutes').value),gross)} : {};
}
function updatePausePreviews() {
  for(const prefix of ['instant']){
    const custom=$(prefix+'-pause-mode').value==='custom';
    $(prefix+'-pause-field').hidden=!custom;
    $(prefix+'-pause-minutes').disabled=!custom;
    $(prefix+'-focus').disabled=custom;
    let label=pauseLabel($(prefix+'-focus').value,state.defaults.breakEnabled);
    if(custom){
      try{
        const pause=pauseSettings(prefix,prefix==='instant'?Number($('instant-minutes').value):10081).customBreakMinutes;
        label=prefix==='instant'
          ? (Number($('instant-minutes').value)-pause)+' min focus + '+pause+' min pausa finale = '+$('instant-minutes').value+' min lordi.'
          : pause+' min di pausa finale per richiesta, sottratti dalla durata lorda. Nessun ciclo automatico.';
      }catch(e){label=e.message;}
    }
    $(prefix+'-pause-preview').textContent=label;
  }
}
function deadlineLabel(end, now = new Date()) {
  const date = localDateString(end),today = localDateString(now);
  if(date === today)return formatTime(end);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate()+1);
  const suffix = date === localDateString(tomorrow) ? 'domani' : formatDate(date);
  return formatTime(end)+' · '+suffix;
}
function updateManualEndPreview(now = new Date()) {
  const minutes=Number($('instant-minutes').value);
  try {
    const end=manualSessionEnd(now,minutes);
    $('instant-end-time').textContent=deadlineLabel(end,now);
    $('instant-end-note').textContent=minutes+' min lordi, pause comprese · inizio alle '+formatTime(now);
  } catch {
    $('instant-end-time').textContent='Durata non valida';
    $('instant-end-note').textContent='Indica una durata lorda da 1 a 1439 minuti.';
  }
}
function loadCycleDefaults() {
  $('instant-focus').value=$('quick-focus').value=state.defaults.workMinutes;
  updatePausePreviews();
}
function exitImmersive() {
  document.body.classList.remove('focus-immersive');
  $('focus-close').hidden=true;
  $('focus-open').hidden=!active();
  if(document.fullscreenElement && document.exitFullscreen)
    document.exitFullscreen().catch(()=>{});
}
function enterImmersive() {
  if(!active())return tell('Avvia o attendi una sessione prima di entrare in Focus.');
  document.body.classList.add('focus-immersive');
  $('focus-open').hidden=true;$('focus-close').hidden=false;
  if($('timer').requestFullscreen)
    $('timer').requestFullscreen().catch(()=>{}); // CSS fallback on iOS / unsupported browsers
}
const available=()=>state.sessions.filter(s=>!s.finished);
const active=()=>getActiveSession(available());
function commit(change){const previous=JSON.stringify(state);try{change();localStorage.setItem(KEY,JSON.stringify(state));proposal=null;$('proposal').hidden=true;cloud?.changed();render();planner?.syncAreas();return true;}catch(e){state=JSON.parse(previous);tell('Salvataggio non riuscito: '+e.message);return false;}}
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function backup(){download({app:'TEMPVS',version:6,exportedAt:new Date().toISOString(),...state},'tempvs-'+localDateString()+'.json');$('backup-status').textContent='Backup esportato alle '+formatTime(new Date());}
function options(select,chosen){const old=chosen||select.value;select.innerHTML=config().areas.map(a=>'<option>'+esc(a.name)+'</option>').join('');if(config().areas.some(a=>a.name===old))select.value=old;}
function inline(text){
  // Tokenize code and links before emphasis, so formatting never modifies href attributes.
  const tokens=[];let out=esc(text).replace(/`([^`]+)`/g,(_,s)=>{tokens.push('<code>'+s+'</code>');return '\u0000'+(tokens.length-1)+'\u0000';});
  out=out.replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|obsidian:\/\/|mailto:|logseq:\/\/|capacities:\/\/|ticktick:\/\/)[^\s]+?)\)/gi,(_,label,url)=>{tokens.push('<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>');return '\u0000'+(tokens.length-1)+'\u0000';});
  return out.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/~~(.+?)~~/g,'<del>$1</del>').replace(/\u0000(\d+)\u0000/g,(_,i)=>tokens[i]);
}
function markdown(text){let code=false;return String(text).split('\n').map((line,i)=>{if(line.startsWith('```')){code=!code;return code?'<pre><code>':'</code></pre>';}if(code)return esc(line)+'\n';const check=line.match(/^\s*[-*] \[([ xX])\] (.*)$/);if(check)return '<label class="check"><input type="checkbox" data-line="'+i+'" '+(check[1].toLowerCase()==='x'?'checked':'')+'><span>'+inline(check[2])+'</span></label>';const heading=line.match(/^(#{1,6}) (.*)$/);if(heading)return '<h'+heading[1].length+'>'+inline(heading[2])+'</h'+heading[1].length+'>';if(line.startsWith('> '))return '<blockquote>'+inline(line.slice(2))+'</blockquote>';return '<div>'+inline(line.replace(/^[-*] /,'• '))+(line?'':'<br>')+'</div>';}).join('')+(code?'</code></pre>':'');}
function renderResources(){const area=config().areas.find(a=>a.name===$('resource-area').value);$('resource-content').innerHTML=markdown(area?.description||'Nessuna indicazione. Aggiungi risorse e promemoria dalle impostazioni.');}
function render(){
  for(const id of ['instant-area','resource-area','edit-area'])options($(id));
  $('windows').innerHTML=[...config().windows].sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start).map(w=>'<div class="item"><span>'+esc(formatDate(w.date))+'<small>'+w.start+'–'+w.end+'</small></span><button data-remove-window="'+esc(w.id)+'" aria-label="Elimina fascia">×</button></div>').join('')||'<p class="muted">Nessuna fascia: aggiungi il primo giorno.</p>';
  const chosen=$('session-date').value;
  const startOfDay=new Date(chosen+'T00:00:00');
  const nextDay=new Date(startOfDay);
  nextDay.setDate(nextDay.getDate()+1);
  const list=state.sessions.filter(s=>{
    const bounds=sessionBounds(s);
    return Number.isFinite(+startOfDay) && +bounds.start<+nextDay && +bounds.end>+startOfDay;
  }).sort((a,b)=>sessionBounds(a).start-sessionBounds(b).start);
  updatePlannerDay(chosen,state.sessions,config().windows);
  $('session-list').innerHTML=list.map(s=>{const end=+sessionBounds(s).end,old=end<Date.now();const status=s.finished?'Conclusa':old?(s.actualSeconds>0?'Svolta':'Non registrata / saltata'):s.paused?'In pausa':+sessionBounds(s).start<=Date.now()?'In corso':'In programma';return '<div class="item session-item" style="--area-color:'+colorFor(s.area||s.title)+'"><span><strong>'+esc(s.title)+'</strong><small>'+s.start+'–'+s.end+' · '+status+' · '+sessionPauseLabel(s)+'</small></span><div class="row">'+(!old&&!s.finished?'<button data-edit-pause="'+esc(s.id)+'">Pausa</button><button data-move="'+esc(s.id)+'">Sposta</button>':'')+'<button data-delete="'+esc(s.id)+'">Elimina</button></div></div>';}).join('')||'<p class="muted">Nessuna sessione in questo giorno.</p>';
  const measured=new Map(state.history.filter(h=>h.measured).map(h=>[h.sessionId,h]));for(const s of state.sessions)if(s.actualSeconds>0)measured.set(s.id,{sessionId:s.id,title:s.title,date:s.date,minutes:s.actualSeconds/60,measured:true});
  const entries=[...measured.values()],total=entries.reduce((v,h)=>v+h.minutes,0),today=entries.filter(h=>h.date===localDateString()).reduce((v,h)=>v+h.minutes,0);
  $('metrics').innerHTML='<article><p>Concentrazione oggi</p><strong class="metric">'+Math.floor(today)+' min</strong></article><article><p>Totale registrato</p><strong class="metric">'+(total/60).toLocaleString('it-IT',{maximumFractionDigits:1})+' h</strong></article>';
  const legacy=state.history.filter(h=>!h.measured);
  $('history').innerHTML=[...entries,...legacy].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,100).map(h=>'<div class="item"><span>'+esc(h.title||'Sessione')+'<small>'+esc(h.date||'')+(h.measured?'':' · storico precedente, non verificato')+'</small></span><span>'+Math.floor(h.minutes)+' min</span></div>').join('')||'<p class="muted">Le sessioni svolte appariranno qui.</p>';
  $('old-backup').hidden=!localStorage.getItem(COPY);renderResources();renderTimer();
}
let audioRequest=0,audioPreviewUntil=0;
const ambient=new TempoAmbientAudio(()=>updateAudioStatus());
function focusAudio(){const s=active();return Boolean(s&&!s.paused&&getPhase(s).kind==='work');}
function updateAudioStatus(){
  $('sound-toggle').textContent=audioArmed?'Disattiva audio':'Attiva audio';
  $('sound-toggle').setAttribute('aria-pressed',String(audioArmed));
  $('sound-status').textContent=!audioArmed?'Scegli un suono e attiva l’audio. Prova suono riproduce 3 secondi.'
    :ambient.context?.state!=='running'?'Audio bloccato: tocca Riattiva audio.'
    :ambient.volume===0?'Volume a zero: alza il cursore.'
    :Date.now()<audioPreviewUntil?'Prova del suono in corso (3 secondi).'
    :focusAudio()?'Suono in riproduzione durante la concentrazione.'
    :active()?'Audio attivo, silenzioso durante la pausa.':'Audio pronto: partirà durante la prossima sessione.';
  $('sound-retry').hidden=!audioArmed||ambient.context?.state==='running';
}
function syncAudio(){
  if(ambient.playing)ambient.setAudible(focusAudio()||Date.now()<audioPreviewUntil);
  updateAudioStatus();
}
async function startAudio(preview=false){
  if($('sound').value==='off')return tell('Scegli un suono.');
  const request=++audioRequest;
  audioPreviewUntil=preview?Date.now()+3000:0;
  const started=await ambient.start($('sound').value,Number($('volume').value)/100,preview||focusAudio());
  if(request!==audioRequest)return;
  audioArmed=started;
  if(!started)tell('Audio non disponibile: riprova toccando Attiva audio.');
  syncAudio();
}
function stopAudio(){++audioRequest;audioPreviewUntil=0;audioArmed=false;ambient.stop(.9);updateAudioStatus();}
const timerPip=createTimerPip({button:$('pip-toggle'),notify:tell,
  togglePause:()=>$('pause').click(),
  snapshot:()=>({active:Boolean(active()),paused:Boolean(active()?.paused),
    title:$('active-title').textContent,phase:$('phase').textContent,clock:$('clock').textContent,
    end:active()?'Fine sessione '+$('deadline-time').textContent:'Nessuna sessione in corso',
    progress:Number($('phase-progress').value),color:$('timer').style.getPropertyValue('--area-color')||'#276c53'})});
function renderTimer(){
  const s=active(),phase=s?getPhase(s):null;
  $('timer').classList.toggle('timer-live',Boolean(s));
  if(!s&&document.body.classList.contains('focus-immersive'))exitImmersive();
  $('instant').hidden=Boolean(s);$('pause').hidden=!s;$('finish').hidden=!s;
  $('session-deadline').hidden=!s;
  if(s){
    const end=sessionBounds(s).end;
    $('deadline-time').textContent=deadlineLabel(end);
    $('deadline-detail').textContent=s.paused
      ? 'Orario invariato durante la sospensione · pause comprese'
      : 'Tempo lordo residuo '+mmss(Math.ceil(Math.max(0,end-Date.now())/1000))+' · pause comprese';
  }else updateManualEndPreview();
  $('focus-open').hidden=!s||document.body.classList.contains('focus-immersive');
  $('focus-close').hidden=!document.body.classList.contains('focus-immersive');
  $('timer').style.setProperty('--area-color',timerColor(colorFor(s?.area||s?.title||$('instant-area').value),phase,s?.paused));
  $('phase').textContent=s?(s.paused?'SESSIONE IN PAUSA':phase.label.toUpperCase()):'IL TUO TEMPO, CON CALMA';
  $('active-title').textContent=s?s.title:'Pronto quando vuoi';
  $('clock').textContent=s?mmss(phase.remaining):mmss(($('instant-pause-mode').value==='custom'?Math.max(0,Number($('instant-minutes').value)-Number($('instant-pause-minutes').value)):Number($('instant-focus').value||state.defaults.workMinutes))*60);
  $('phase-progress').value=phase?.progress||0;
  $('pause').textContent=s?.paused?'Riprendi':'Pausa';
  $('cycle-note').textContent=s
    ? sessionPauseLabel(s)+' · sessione fino alle '+s.end
    : 'Configura durata lorda e focus di ogni ciclo.';
  $('timer-note').textContent=s
    ? (s.paused?'Concentrazione sospesa. La programmazione termina alle '+s.end:phase.label+' fino alle '+formatTime(phase.end)+' · fine sessione '+s.end)
    : 'Scegli un’area e inizia.';
  const next=getNextSession(available());
  $('next').textContent=next?'Prossima: '+next.title+' · '+formatDate(next.date)+' alle '+next.start:'Nessun’altra sessione in programma.';
  if(s?.id!==activeId){activeId=s?.id||null;if(s){options($('resource-area'),s.area||s.title);renderResources();}}
  syncAudio();
  timerPip.update();
  document.title=s?$('clock').textContent+' · TEMPVS':'TEMPVS · Tempo per te';
}
function record(){const now=Date.now();for(const s of state.sessions){const seconds=measuredFocus(s,lastTick,now);if(seconds){s.actualSeconds=(s.actualSeconds||0)+seconds;measuredDirty=true;}}lastTick=now;}
function flush(){record();if(!measuredDirty)return;try{localStorage.setItem(KEY,JSON.stringify(state));measuredDirty=false;cloud?.changed();}catch(e){tell('Impossibile salvare il tempo registrato: '+e.message);}}
setInterval(()=>{record();renderTimer();if(Date.now()-lastSave>15000){flush();lastSave=Date.now();if(!document.hidden && (!$('stats').hidden || !$('sessions').hidden))render();}},1000);
$('instant').onsubmit=e=>{e.preventDefault();try{const start=new Date();const end=manualSessionEnd(start,Number($('instant-minutes').value));const s={id:uid(),timerStartedAt:start.toISOString(),timerEndsAt:end.toISOString(),title:$('instant-area').value,area:$('instant-area').value,date:localDateString(start),start:formatTime(start),end:formatTime(end),workMinutes:$('instant-pause-mode').value==='custom'?state.defaults.workMinutes:focusCycle(Number($('instant-focus').value),state.defaults.breakEnabled).focusMinutes,breakEnabled:state.defaults.breakEnabled,actualSeconds:0,...pauseSettings('instant',Number($('instant-minutes').value))};if(hasSessionOverlaps([...available(),s]))return tell('La durata si sovrappone a una sessione programmata. Riducila o sposta la sessione.');commit(()=>state.sessions.push(s));lastTick=Date.now();}catch(error){tell(error.message);}};
$('pause').onclick=()=>{record();const s=active();if(s)commit(()=>s.paused=!s.paused);};
$('finish').onclick=()=>{record();const s=active();if(s)commit(()=>{s.finished=true;s.paused=false;});};
$('window-form').onsubmit=e=>{e.preventDefault();const w={id:uid(),date:$('window-date').value,start:$('window-start').value,end:$('window-end').value};if(w.start===w.end)return tell('Indica due orari diversi.');if(config().windows.some(x=>{const a=sessionBounds(x),b=sessionBounds(w);return a.start<b.end&&a.end>b.start;}))return tell('Questa fascia si sovrappone a una disponibilità già inserita.');commit(()=>config().windows.push(w));};
$('windows').onclick=e=>{const b=e.target.closest('[data-remove-window]');if(b)commit(()=>config().windows=config().windows.filter(w=>w.id!==b.dataset.removeWindow));};
function tablePlan(requests){return planSessions(requests,config().windows,available(),{...state.defaults,breakEnabled:true,workMinutes:state.defaults.workMinutes},new Date(),uid,$('quick-date').value);}
$('quick-form').onsubmit=e=>{e.preventDefault();proposal=null;$('proposal').hidden=true;try{proposal=tablePlan(planner.requests());$('proposal-list').innerHTML=proposal.sessions.map(s=>'<p>'+esc(s.title)+' · '+formatDate(s.date)+' · '+s.start+'–'+s.end+' · '+sessionPauseLabel(s)+'</p>').join('')+'<p>'+ (proposal.remainder?'Mancano '+proposal.remainder+' minuti di disponibilità. Aggiungi altre fasce: non è stato salvato nulla.':'Tutto pronto: '+proposal.sessions.length+' sessioni.')+'</p>';$('confirm-plan').disabled=proposal.remainder>0||!proposal.sessions.length;$('proposal').hidden=false;}catch(err){tell(err.message);}};
$('confirm-plan').onclick=()=>{if(!proposal||proposal.remainder)return;const planned=proposal.sessions;if(planned.some(s=>+sessionBounds(s).start<Date.now())||hasSessionOverlaps([...available(),...planned]))return tell('Gli orari sono cambiati: prepara nuovamente il programma.');if(commit(()=>state.sessions.push(...planned))){planner.reset();$('quick').value='';tell('Sessioni programmate.');}};

$('cancel-plan').onclick=()=>{proposal=null;$('proposal').hidden=true;};
$('session-date').onchange=render;
$('session-list').onclick=async e=>{
  const edit=e.target.closest('[data-edit-pause]');
  if(edit){
    const s=state.sessions.find(s=>s.id===edit.dataset.editPause);
    if(!s || +sessionBounds(s).start<=Date.now() || s.actualSeconds>0)return tell('Puoi modificare la pausa solo prima dell’inizio della sessione.');
    const edited=await editSessionDetails(s,'pause');
    if(!edited)return;
    const value=edited.pause;
    try{
      const automatic=value.trim().toLowerCase()==='auto';
      if(!value.trim())throw Error('Indica i minuti di pausa oppure auto.');
      const minutes=automatic?undefined:customPause(Number(value),(sessionBounds(s).end-sessionBounds(s).start)/60000);
      commit(()=>{if(automatic){delete s.customBreakMinutes;s.breakEnabled=state.defaults.breakEnabled;}else{s.customBreakMinutes=minutes;s.breakEnabled=minutes>0;}});
    }catch(error){tell(error.message);}
    return;
  }
  const del=e.target.closest('[data-delete]'),move=e.target.closest('[data-move]');if(del){const s=state.sessions.find(s=>s.id===del.dataset.delete);if(!s||!confirm('Eliminare la sessione? Il tempo registrato resterà nello storico.'))return;record();commit(()=>{if(s.actualSeconds>0){state.history=state.history.filter(h=>h.sessionId!==s.id);state.history.push({sessionId:s.id,taskId:'',title:s.title,date:s.date,minutes:s.actualSeconds/60,measured:true});}state.sessions=state.sessions.filter(x=>x.id!==s.id);state.syncDeleted.sessions.push(s.id);});}if(move){const s=state.sessions.find(s=>s.id===move.dataset.move);const edited=await editSessionDetails(s,'move');if(!edited)return;const {date,start}=edited;try{const duration=+sessionBounds(s).end-sessionBounds(s).start;const d=new Date(date+'T'+start+':00'),end=new Date(+d+duration);const replacement={...s,date,start,end:formatTime(end),paused:false};delete replacement.timerStartedAt;delete replacement.timerEndsAt;normalizeArchive({sessions:[replacement]});if(+d<Date.now()||hasSessionOverlaps([...available().filter(x=>x.id!==s.id),replacement]))throw Error('Orario passato o sovrapposto.');if(s.actualSeconds>0)throw Error('La sessione ha già tempo registrato: concludila e crea una nuova sessione.');commit(()=>state.sessions=state.sessions.map(x=>x.id===s.id?replacement:x));}catch(err){tell(err.message);}}};
function loadAreaFields(){
  const area=areaFor($('edit-area').value);
  $('description').value=area?.description||'';
  $('area-color').value=colorFor($('edit-area').value).toLowerCase();
}
function openSettings(){
  $('work').value=state.defaults.workMinutes;$('breaks').checked=state.defaults.breakEnabled;
  options($('edit-area'));loadAreaFields();$('settings').showModal();
}
$('settings-open').onclick=openSettings;$('area-edit').onclick=openSettings;$('settings-close').onclick=()=>$('settings').close();
$('edit-area').onchange=loadAreaFields;
$('area-form').onsubmit=e=>{e.preventDefault();commit(()=>{const area=areaFor($('edit-area').value);area.description=$('description').value;area.color=normalizeAreaColor($('area-color').value,area.name);});tell('Area aggiornata.');};
$('new-area-form').onsubmit=e=>{e.preventDefault();const name=$('new-area').value.trim();if(!name||config().areas.some(a=>a.name.toLowerCase()===name.toLowerCase()))return tell('Scegli un nome diverso.');if(commit(()=>config().areas.push({name,description:'',color:normalizeAreaColor(undefined,name)}))){$('new-area').value='';options($('edit-area'),name);loadAreaFields();}};
$('preferences').onsubmit=e=>{e.preventDefault();
  const before=state.defaults.workMinutes,work=Number($('work').value);
  try{focusCycle(work);}catch(error){return tell(error.message);}
  if(commit(()=>{state.defaults.workMinutes=work;state.defaults.breakEnabled=$('breaks').checked;})){
    for(const id of ['instant-focus','quick-focus'])if(Number($(id).value)===before)$(id).value=work;
    updatePausePreviews();tell('Impostazioni salvate per le prossime sessioni.');
  }
};
$('resource-area').onchange=renderResources;$('resource-content').onchange=e=>{if(e.target.dataset.line===undefined)return;const area=config().areas.find(a=>a.name===$('resource-area').value),lines=area.description.split('\n');lines[Number(e.target.dataset.line)]=lines[Number(e.target.dataset.line)].replace(/\[([ xX])\]/,e.target.checked?'[x]':'[ ]');commit(()=>area.description=lines.join('\n'));};
$('sound-toggle').onclick=()=>audioArmed?stopAudio():startAudio();
$('sound-test').onclick=()=>startAudio(true);
$('sound-retry').onclick=()=>startAudio();
$('sound').onchange=()=>{if($('sound').value==='off')stopAudio();else void startAudio();};
$('volume').oninput=()=>{ambient.setVolume(Number($('volume').value)/100);updateAudioStatus();};
$('export').onclick=()=>{flush();backup();};$('old-backup').onclick=()=>download(JSON.parse(localStorage.getItem(COPY)),'tempvs-prima-della-semplificazione.json');
async function applyRemote(data){const next=normalizeArchive(data);localStorage.setItem('tempo-simple-recovery',JSON.stringify(state));localStorage.setItem(KEY,JSON.stringify(next));state=next;loadCycleDefaults();lastTick=Date.now();proposal=null;$('proposal').hidden=true;render();planner?.syncAreas();}
$('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;const next=normalizeArchive(JSON.parse(await file.text()));if(!confirm('Ripristinare questo backup sostituendo i dati attuali? Verrà scaricata una copia dei dati attuali.'))return;backup();await applyRemote(next);cloud?.changed();tell('Backup ripristinato.');}catch(e){tell('Ripristino annullato: '+e.message);}finally{$('import').value='';}};
for(const b of document.querySelectorAll('[data-page]'))b.onclick=()=>{for(const section of document.querySelectorAll('.page'))section.hidden=section.id!==b.dataset.page;for(const tab of document.querySelectorAll('[data-page]'))tab.removeAttribute('aria-current');b.setAttribute('aria-current','page');location.hash=b.dataset.page;render();};
$('session-date').value=$('window-date').value=$('quick-date').value=localDateString();
loadCycleDefaults();
planner=createPlannerTable({document,areas:()=>config().areas,defaults:()=>state.defaults,checkPlan:tablePlan,onError:tell,invalidate:()=>{proposal=null;$('proposal').hidden=true;}});
$('instant-focus').addEventListener('input',()=>{updatePausePreviews();if(!active())renderTimer();});
$('instant-minutes').addEventListener('input',()=>{updatePausePreviews();if(!active())updateManualEndPreview();});

for(const prefix of ['instant'])for(const field of ['pause-mode','pause-minutes'])
  $(prefix+'-'+field).addEventListener('input',()=>{updatePausePreviews();proposal=null;$('proposal').hidden=true;});
$('instant-area').addEventListener('change',renderTimer);
$('focus-open').onclick=enterImmersive;$('focus-close').onclick=exitImmersive;
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('focus-immersive'))exitImmersive();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('focus-immersive'))exitImmersive();});
render();
initRefinedUI();
render(); // Fill the day toolbar created by the progressive UI enhancement.
function cloudStatus(message,info){$('cloud-status').textContent=message;$('cloud-progress').hidden=!info.busy;$('cloud-setup').hidden=info.connected;$('cloud-actions').hidden=!info.connected;$('cloud-upload').hidden=info.ready;}
async function resolveConflicts(conflicts){const choices={};for(const c of conflicts){const chosen=await chooseSyncConflict(c);if(chosen===null)return null;choices[c.key]=chosen;}return choices;}
cloud=createDropboxSync({getState:()=>state,applyRemote,normalizeRemote:normalizeArchive,onStatus:cloudStatus,resolveConflicts});
const run=fn=>Promise.resolve().then(fn).catch(e=>tell(e.message));
$('cloud-connect').onclick=()=>run(()=>cloud.connect($('cloud-key').value));$('cloud-sync').onclick=()=>run(()=>cloud.sync());$('cloud-merge').onclick=()=>run(()=>cloud.mergeNow());$('cloud-upload').onclick=()=>run(()=>cloud.firstSync('upload'));
$('cloud-download').onclick=()=>{if(confirm('Sostituire i dati con Dropbox? Prima scarico una copia locale.')){backup();run(()=>cloud.info().ready?cloud.forceDownload(true):cloud.firstSync('download'));}};
$('cloud-disconnect').onclick=()=>{if(confirm('Scollegare Dropbox mantenendo i dati locali?'))cloud.disconnect();};
run(()=>cloud.init());
window.addEventListener('pagehide',()=>{flush();++audioRequest;audioPreviewUntil=0;audioArmed=false;ambient.stop(0);});document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();else{lastTick=Date.now();render();}});
if('serviceWorker' in navigator){let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloading){reloading=true;flush();location.reload();}});navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>tell('Modalità offline non disponibile al momento.'));}
const page=location.hash.slice(1);const tab=[...document.querySelectorAll('[data-page]')].find(b=>b.dataset.page===page);if(tab)tab.click();

