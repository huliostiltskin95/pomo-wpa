// Stable identities with name mirrors for older PWA/Obsidian backups.
const key = name => name.trim().replace(/\s+/g,' ').toLocaleLowerCase();
const legacyId = name => 'area:' + encodeURIComponent(key(name));
export function normalizeAreaLinks(data, areas) {
  const names=new Set(), ids=new Set();
  const normalized=areas.map(area=>{
    const name=area.name.trim(), id=area.id ?? legacyId(name);
    if(!name || name.length>80 || names.has(key(name)) || typeof id!=='string' || !id || ids.has(id))
      throw Error('Aree con nomi o identificativi duplicati/non validi.');
    names.add(key(name));ids.add(id);return {...area,id,name};
  });
  const collections={sessions:data.sessions||[],tasks:data.tasks||[],history:data.history||[]};
  const linked={},sessionById=new Map((data.sessions||[]).map(s=>[s.id,s]));
  for(const [collection,items] of Object.entries(collections)){
    linked[collection]=items.map(item=>{
      let area=item.areaId?normalized.find(a=>a.id===item.areaId):null;
      // Older clients transfer by name; accept an explicit destination that still exists.
      if(item.areaId&&!area)area=normalized.find(a=>a.name===item.area);
      if(item.areaId&&!area)throw Error('Associazione area mancante: '+item.areaId+'. Ripristina o risolvi il conflitto tra le aree.');
      const name=item.area || (collection==='sessions'?item.title:collection==='history'?(sessionById.get(item.sessionId)?.area || (normalized.some(a=>a.name===item.title)?item.title:'')):'');
      if(!area && name){
        area=normalized.find(a=>key(a.name)===key(name));
        if(!area){area={id:legacyId(name),name:name.trim(),description:''};normalized.push(area);}
      }
      if(!area)return {...item};
      return {...item,areaId:area.id,area:area.name,
        ...(item.title===item.area && item.area!==area.name?{title:area.name}:{})};
    });
  }
  return {areas:normalized,...linked};
}
export function createArea(state, {id,name,description='',color}) {
  const areas=state.defaults.simple.areas;
  name=name.trim();
  if(!id||areas.some(a=>a.id===id)||!name||name.length>80||areas.some(a=>key(a.name)===key(name)))throw Error('Scegli un nome e un identificativo area unici.');
  const area={id,name,description,color};areas.push(area);return area;
}
const findArea=(state,id)=>{
  const area=state.defaults.simple.areas.find(a=>a.id===id);
  if(!area)throw Error('Area non trovata.');return area;
};
export function moveAreaRecords(state, fromId, toId, {collections=['sessions','tasks','history'],ids=null}={}) {
  const from=findArea(state,fromId),to=findArea(state,toId);
  for(const collection of collections)for(const item of state[collection]||[]){
    if((item.areaId===from.id || (!item.areaId&&item.area===from.name)) && (!ids||ids.includes(item.id||item.sessionId))){
      item.areaId=to.id;item.area=to.name;
      if(collection!=='tasks'&&item.title===from.name)item.title=to.name;
    }
  }
}
export function renameArea(state,id,name) {
  const area=findArea(state,id),before=area.name;name=name.trim();
  if(!name||name.length>80||state.defaults.simple.areas.some(a=>a.id!==id&&key(a.name)===key(name)))throw Error('Scegli un nome area valido e univoco.');
  area.name=name;
  for(const collection of ['sessions','tasks','history'])for(const item of state[collection]||[]){
    if(item.areaId===id || (!item.areaId&&item.area===before)){
      item.areaId=id;item.area=name;
      if(collection!=='tasks'&&item.title===before)item.title=name;
    }
  }
  if(state.appearance?.areaColors){
    const colors=state.appearance.areaColors;
    if(Object.prototype.hasOwnProperty.call(colors,before)){if(!Object.prototype.hasOwnProperty.call(colors,name))colors[name]=colors[before];if(name!==before)delete colors[before];}
  }
}
export function reorderArea(state,id,direction) {
  const areas=state.defaults.simple.areas,index=areas.findIndex(a=>a.id===id),next=index+direction;
  if(index<0||![-1,1].includes(direction)||next<0||next>=areas.length)throw Error('Spostamento area non valido.');
  [areas[index],areas[next]]=[areas[next],areas[index]];
}
export function deleteArea(state,id,{transferTo,deleteRecords=false}={}) {
  const area=findArea(state,id);
  if(state.defaults.simple.areas.length<2)throw Error('Deve rimanere almeno un’area.');
  if(transferTo&&transferTo!==id)moveAreaRecords(state,id,transferTo);
  else if(deleteRecords){
    state.syncDeleted??={tasks:[],sessions:[]};
    for(const collection of ['sessions','tasks','history']){
      const belongs=item=>item.areaId===id||(!item.areaId&&item.area===area.name);
      state.syncDeleted[collection]??=[];
      state.syncDeleted[collection]=[...new Set([...state.syncDeleted[collection],...(state[collection]||[]).filter(belongs).map(item=>collection==='history'?item.sessionId:item.id)])];
      state[collection]=(state[collection]||[]).filter(item=>!belongs(item));
    }
    const tasks=new Set(state.tasks.map(t=>t.id)),sessions=new Set(state.sessions.map(s=>s.id));
    for(const session of state.sessions){
      if(session.taskId&&!tasks.has(session.taskId))session.taskId='';
      if(Array.isArray(session.taskIds))session.taskIds=session.taskIds.filter(id=>tasks.has(id));
      if(session.taskAllocations)session.taskAllocations=Object.fromEntries(Object.entries(session.taskAllocations).filter(([id])=>tasks.has(id)));
      if(Array.isArray(session.pomodoroTaskIds))session.pomodoroTaskIds=session.pomodoroTaskIds.map(id=>tasks.has(id)?id:null);
    }
    for(const task of state.tasks)if(task.autoSessionId&&!sessions.has(task.autoSessionId))task.autoSessionId='';
  }else throw Error('Scegli se trasferire o eliminare gli elementi associati.');
  state.defaults.simple.areas=state.defaults.simple.areas.filter(a=>a.id!==id);
  if(state.appearance?.areaColors)delete state.appearance.areaColors[area.name];
}
