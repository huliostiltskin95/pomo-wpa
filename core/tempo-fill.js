import {sessionBounds,sessionDurationMinutes} from "./tempo-core.js";
import {sessionArea,sessionTaskIds,grossMinutesForTask,allocatedGrossMinutes} from "./tempo-tasks.js";

const order={alta:0,media:1,bassa:2,nessuna:3};
export const grossAssignedToTask=(taskId,sessions)=>sessions.reduce(
  (sum,s)=>sum+grossMinutesForTask(s,taskId),0);

/**
 * Pure, conservative allocation. The timer and session calendar interval never
 * change. All quotas are GROSS minutes (including the planned Pomodoro breaks).
 * Existing links/quotas are preserved; a legacy multi-task session is fully occupied.
 */
export function proposeSessionFill(session,tasks,sessions,options={}) {
  if(!session)throw Error("Sessione inesistente.");
  const mode=["priority","deadline","agenda"].includes(options.mode)?options.mode:"priority";
  const partial=options.partial!==false;
  const duration=sessionDurationMinutes(session);
  if(!Number.isFinite(duration)||duration<=0)throw Error("Durata sessione non valida.");
  const existing=allocatedGrossMinutes(session);
  if(existing>duration+0.01)throw Error("Le quote attuali superano la durata della sessione.");
  let available=Math.floor((duration-existing)/15)*15;
  const area=sessionArea(session,tasks);
  const candidates=tasks.map((task,index)=>({task,index})).filter(({task})=>
    task.area===area && !task.inbox && task.status!=="done" &&
    Number.isInteger(task.estimateMinutes) && task.estimateMinutes>=15 &&
    (!task.workDate || task.workDate<=session.date) &&
    (!task.dueDate || options.includeOverdue!==false || task.dueDate>=session.date)
  );
  const deadline=t=>t.dueDate||"9999-12-31";
  const priority=t=>order[t.priority]??3;
  candidates.sort((a,b)=>{
    if(mode==="agenda")return a.index-b.index;
    if(mode==="deadline")return deadline(a.task).localeCompare(deadline(b.task))||
      priority(a.task)-priority(b.task)||a.index-b.index;
    return priority(a.task)-priority(b.task)||deadline(a.task).localeCompare(deadline(b.task))||a.index-b.index;
  });
  const additions=[];
  for(const {task} of candidates){
    if(available<15)break;
    const residual=Math.floor((task.estimateMinutes-grossAssignedToTask(task.id,sessions))/15)*15;
    if(residual<15)continue;
    if(!partial && residual>available)continue;
    const minutes=partial?Math.min(residual,available):residual;
    if(minutes<15)continue;
    additions.push({taskId:task.id,title:task.title,minutes});
    available-=minutes;
  }
  const taskAllocations={};
  for(const id of sessionTaskIds(session))
    taskAllocations[id]=grossMinutesForTask(session,id);
  for(const item of additions)taskAllocations[item.taskId]=(taskAllocations[item.taskId]||0)+item.minutes;
  const taskIds=[...new Set([...sessionTaskIds(session),...additions.map(a=>a.taskId)])];
  return {session:{...session,taskIds,taskAllocations},additions,capacity:duration,
    occupied:duration-available-(available<15?(duration-existing)%15:0),
    freeMinutes:duration-Object.values(taskAllocations).reduce((a,b)=>a+b,0)};
}

/** For editing a session: retain previous quotas only when their fit is valid. */
export function reconcileSessionAllocations(previous,next) {
  if(!previous?.taskAllocations)return next;
  const ids=sessionTaskIds(next);
  const sameIds=ids.length===sessionTaskIds(previous).length &&
    ids.every(id=>sessionTaskIds(previous).includes(id));
  if(!sameIds)return next; // Manual checkbox changes revert to legacy equal-share mode.
  const total=Object.values(previous.taskAllocations).reduce((a,b)=>a+Number(b||0),0);
  if(total>sessionDurationMinutes(next))return next; // Changed duration: valid legacy fit.
  return {...next,taskAllocations:{...previous.taskAllocations}};
}
