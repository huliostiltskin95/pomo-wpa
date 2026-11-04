// Three-way, non-destructive merge for TEMPVS Dropbox snapshots.
// No timestamps or last-writer-wins: unknown concurrent edits require a decision.
const absent = Symbol("missing");
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const same = (a, b) => a === absent || b === absent
  ? a === b : JSON.stringify(a) === JSON.stringify(b);
const object = v => v !== null && v !== absent && typeof v === "object" && !Array.isArray(v);
const snapshotList = (state, collection) => Array.isArray(state?.[collection]) ? state[collection] : [];
const deleted = (state, collection) =>
  new Set(Array.isArray(state?.syncDeleted?.[collection]) ?
    state.syncDeleted[collection].filter(v => typeof v === "string" && v) : []);
const mapById = (entries, collection) => {
  const result = new Map();
  for (const value of entries) {
    const id = collection === "history" ? value?.sessionId : value?.id;
    if (typeof id !== "string" || !id || result.has(id))
      throw Error("Archivio non valido: identificativi duplicati o assenti (" + collection + ").");
    result.set(id, value);
  }
  return result;
};
const choiceLabel = (section, id, field) => {
  const names = {tasks:"Attività",sessions:"Sessione",history:"Storico",defaults:"Preferenze",appearance:"Aspetto"};
  const label = (names[section] || section) + (id ? " · " + id : "");
  return label + (field ? " · " + field : "");
};

/**
 * @param {object|null} base Last known common snapshot (null for pre-migration devices).
 * @param {object} local Local device data.
 * @param {object} remote Dropbox data.
 * @param {object} choices Explicit choices keyed by conflict.key.
 * @returns {{merged: object, conflicts: object[]}}
 */
export function mergeSnapshots(base, local, remote, choices = {}) {
  if (!local || !remote) throw Error("Entrambi gli archivi sono necessari.");
  const conflicts = [];
  const chosen = (key, section, label, left, right, options = null) => {
    const optionsList = options || [
      {value:"local",label:"Conserva questo dispositivo"},
      {value:"remote",label:"Conserva Dropbox"}
    ];
    const value = choices[key];
    if (optionsList.some(option => option.value === value)) return value;
    conflicts.push({key,section,label,options:optionsList,
      localPreview:preview(left),remotePreview:preview(right)});
    return null;
  };
  function preview(value) {
    if (value === absent) return "Eliminato / non presente";
    if (value === null) return "Nessun valore";
    if (typeof value === "string") return value.slice(0,160);
    if (Array.isArray(value)) return value.length + " elementi";
    if (object(value)) return String(value.title || value.date || "Dati modificati").slice(0,160);
    return String(value);
  }
  const field = (baseValue,localValue,remoteValue, key,section,label) => {
    if (same(localValue,remoteValue)) return localValue;
    if (baseValue === absent && (localValue === absent || remoteValue === absent))
      return localValue === absent ? remoteValue : localValue;
    if (baseValue !== absent) {
      if (same(localValue,baseValue)) return remoteValue;
      if (same(remoteValue,baseValue)) return localValue;
    }
    // Merge independent object properties (tags, subtasks and arrays are atomic).
    if (object(localValue) && object(remoteValue) &&
        (baseValue === absent || object(baseValue))) {
      const output = {};
      const keys = new Set([
        ...Object.keys(object(baseValue)?baseValue:{}),
        ...Object.keys(localValue), ...Object.keys(remoteValue)
      ]);
      for (const property of keys) {
        const value = field(
          object(baseValue)&&has(baseValue,property)?baseValue[property]:absent,
          has(localValue,property)?localValue[property]:absent,
          has(remoteValue,property)?remoteValue[property]:absent,
          key+"."+property,section,label+" · "+property);
        if (value !== absent) output[property] = value;
      }
      return output;
    }
    const answer = chosen(key,section,label,localValue,remoteValue);
    return answer === "remote" ? remoteValue : localValue;
  };
  const merged = {
    app:"Tempo Pomodoro",version:5,
    defaults:field(base?.defaults??absent,local.defaults??absent,remote.defaults??absent,
      "defaults","defaults","Preferenze"),
    appearance:field(base?.appearance??absent,local.appearance??absent,remote.appearance??absent,
      "appearance","appearance","Aspetto")
  };
  const finalDeleted = {tasks:new Set(),sessions:new Set()};
  function collection(name) {
    const b=mapById(snapshotList(base,name),name);
    const l=mapById(snapshotList(local,name),name);
    const r=mapById(snapshotList(remote,name),name);
    const bDel=deleted(base,name),lDel=deleted(local,name),rDel=deleted(remote,name);
    const allIds=new Set([...b.keys(),...l.keys(),...r.keys(),
      ...(name==="history"?[]:[...bDel,...lDel,...rDel])]);
    const out=[];
    for (const id of allIds) {
      const bp=b.has(id),lp=l.has(id),rp=r.has(id);
      const bv=bp?b.get(id):absent,lv=lp?l.get(id):absent,rv=rp?r.get(id):absent;
      const label = choiceLabel(name, name==="history"?id:
        (l.get(id)||r.get(id)||b.get(id))?.title || id, "");
      let result=absent;
      if (lp && rp) {
        if ((lDel.has(id)||rDel.has(id)) && !bp) {
          const key=name+":"+id+":delete";
          const answer=chosen(key,name,label+" · eliminazione",lv,rv);
          result=answer==="remote"?rv:lv;
        } else result=field(bv,lv,rv,name+":"+id,name,label);
      } else if (lp || rp) {
        const present=lp?lv:rv;
        const missingIsDeletion = bp || (lp?rDel.has(id):lDel.has(id));
        if (!missingIsDeletion || name==="history") result=present;
        else if (bp && same(present,bv)) result=absent;
        else {
          const key=name+":"+id+":exists";
          const answer=chosen(key,name,label+" · modifica o eliminazione",lv,rv);
          result=answer==="remote"?rv:lv;
        }
      }
      if (result!==absent) out.push(result);
      else if(name!=="history" && (bp || lDel.has(id)||rDel.has(id)))finalDeleted[name].add(id);
    }
    return out;
  }
  merged.tasks=collection("tasks");
  merged.sessions=collection("sessions");
  merged.history=collection("history");

  // Different IDs can still collide on the calendar. Never accept overlapping sessions.
  const active = new Map(merged.sessions.map(s=>[s.id,s]));
  const sorted = [...active.values()].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  for (let i=0;i<sorted.length;i++) for(let j=i+1;j<sorted.length;j++){
    const a=sorted[i],b=sorted[j];
    if (!active.has(a.id)||!active.has(b.id)) continue;
    if (!isOverlap(a,b)) continue;
    const key="overlap:"+[a.id,b.id].sort().join(":");
    const decision=chosen(key,"sessions","Sessioni sovrapposte · "+
      a.date+" "+a.start+"–"+a.end+" ("+a.title+") / "+
      b.date+" "+b.start+"–"+b.end+" ("+b.title+")",a,b,[
        {value:a.id,label:"Conserva "+a.title+" · "+a.start+"–"+a.end},
        {value:b.id,label:"Conserva "+b.title+" · "+b.start+"–"+b.end}
      ]);
    if (decision) {
      const removed=decision===a.id?b.id:a.id;
      active.delete(removed);
      finalDeleted.sessions.add(removed);
    }
  }
  merged.sessions=[...active.values()];
  // Deleted sessions must not contribute to statistics, including on another device.
  const retainedSessionIds=new Set(merged.sessions.map(session=>session.id));
  merged.history=merged.history.filter(entry=>entry.measured || retainedSessionIds.has(entry.sessionId));
  const taskIds = new Set(merged.tasks.map(t=>t.id));
  const sessionIds = new Set(merged.sessions.map(s=>s.id));
  merged.sessions=merged.sessions.map(s=> {
    const taskIdsInSession=Array.isArray(s.taskIds)?{taskIds:s.taskIds.filter(id=>taskIds.has(id))}:{};
    return {...s,...taskIdsInSession,...(typeof s.taskId === "string" && !taskIds.has(s.taskId)?{taskId:""}:{})};
  });
  merged.tasks=merged.tasks.map(t =>
    t.autoSessionId && !sessionIds.has(t.autoSessionId)?{...t,autoSessionId:""}:t);
  for (const t of merged.tasks) finalDeleted.tasks.delete(t.id);
  for (const s of merged.sessions) finalDeleted.sessions.delete(s.id);
  merged.syncDeleted={
    tasks:[...finalDeleted.tasks].sort(),
    sessions:[...finalDeleted.sessions].sort()
  };
  return {merged,conflicts};
}
function isOverlap(a,b) {
  if(a.finished || b.finished)return false;
  const bounds = session => {
    if(session.timerStartedAt && session.timerEndsAt)return [+new Date(session.timerStartedAt),+new Date(session.timerEndsAt)];
    if(!/^\d{4}-\d{2}-\d{2}$/.test(session.date||"")||
       !/^\d\d:\d\d$/.test(session.start||"")||
       !/^\d\d:\d\d$/.test(session.end||""))return null;
    const start=new Date(session.date+"T"+session.start+":00");
    const end=new Date(session.date+"T"+session.end+":00");
    if(end<=start)end.setDate(end.getDate()+1);
    return [start.getTime(),end.getTime()];
  };
  const x=bounds(a),y=bounds(b);
  return Boolean(x&&y&&x[0]<y[1]&&x[1]>y[0]);
}
