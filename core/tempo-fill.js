import { sessionDurationMinutes } from './tempo-core.js';
import { sessionArea, sessionTaskIds, grossMinutesForTask, allocatedGrossMinutes } from './tempo-tasks.js';

export const grossAssignedToTask = (taskId, sessions) => sessions.reduce(
  (sum, s) => sum + grossMinutesForTask(s, taskId), 0);

/** One complete focus period, plus its actual break, forms an assignable slot.
 * Shorter focus time at the session end remains unassigned.
 */
export function pomodoroSlots(session) {
  const duration = sessionDurationMinutes(session);
  const focus = Number(session?.workMinutes);
  if (!Number.isInteger(duration) || duration <= 0 || !Number.isInteger(focus) || focus < 1 || focus > 240)
    throw Error('Durata della sessione o del Pomodoro non valida.');
  const pause = session.breakEnabled === false ? 0 : Math.max(1, Math.round(focus / 5));
  const slots = [];
  let cursor = 0;
  while (cursor + focus <= duration) {
    const breakMinutes = Math.min(pause, duration - (cursor + focus));
    slots.push({ index: slots.length, startOffset: cursor, focusMinutes: focus,
      breakMinutes, minutes: focus + breakMinutes });
    cursor += focus + breakMinutes;
  }
  return { slots, unassignableMinutes: duration - cursor, duration };
}

/** Fair allocation in whole Pomodoros, capped by outstanding gross estimates. */
export function proposeSessionFill(session, tasks, sessions, options = {}) {
  if (!session) throw Error('Sessione inesistente.');
  const { slots, unassignableMinutes, duration } = pomodoroSlots(session);
  if (!slots.length) {
    const occupied = allocatedGrossMinutes(session);
    return { session, additions: [], slots, unassignableMinutes, capacity: duration, occupied,
      freeMinutes: duration - occupied };
  }
  const area = sessionArea(session, tasks);
  const selected = Array.isArray(options.taskIds) ? new Set(options.taskIds) : null;
  const candidates = tasks.map((task, index) => ({ task, index })).filter(({ task }) =>
    task.area === area && task.status !== 'done' &&
    (!selected ? (!task.inbox && Number.isFinite(task.estimateMinutes) && task.estimateMinutes > 0)
      : selected.has(task.id)) &&
    (!task.workDate || task.workDate <= session.date) &&
    (!task.dueDate || options.includeOverdue !== false || task.dueDate >= session.date)
  );
  const candidateIds = new Set(candidates.map(({ task }) => task.id));
  const standardGross = Number(session.workMinutes) + (session.breakEnabled === false
    ? 0 : Math.max(1, Math.round(Number(session.workMinutes) / 5)));
  const counts = new Map();
  let slotTaskIds;
  if (options.slotTaskIds !== undefined) {
    if (!Array.isArray(options.slotTaskIds) || options.slotTaskIds.length !== slots.length)
      throw Error('La personalizzazione non corrisponde ai Pomodori disponibili.');
    slotTaskIds = options.slotTaskIds.map(id => {
      if (id == null || id === '') return null;
      if (!candidateIds.has(id)) throw Error('Una task non è più assegnabile a questa sessione.');
      return id;
    });
  } else {
    const elsewhere = sessions.filter(s => s.id !== session.id);
    const capped = candidates.map(({ task, index }) => {
      const remaining = task.estimateMinutes == null ? Infinity :
        Math.max(0, task.estimateMinutes - grossAssignedToTask(task.id, elsewhere));
      return { task, index, limit: remaining === Infinity ? Infinity :
        Math.ceil(remaining / standardGross), count: 0 };
    }).filter(item => item.limit > 0);
    let remaining = slots.length;
    while (remaining > 0) {
      let assigned = false;
      for (const item of capped) {
        if (item.count >= item.limit || !remaining) continue;
        item.count++;
        remaining--;
        assigned = true;
      }
      if (!assigned) break;
    }
    // Group slots by task, putting the shortest residual estimates first.
    capped.sort((a, b) => a.limit - b.limit || a.index - b.index);
    slotTaskIds = capped.flatMap(item => Array(item.count).fill(item.task.id));
    while (slotTaskIds.length < slots.length) slotTaskIds.push(null);
  }
  const taskAllocations = {};
  for (let i = 0; i < slots.length; i++) {
    const id = slotTaskIds[i];
    if (!id) continue;
    taskAllocations[id] = (taskAllocations[id] || 0) + slots[i].minutes;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const taskIds = [...new Set(slotTaskIds.filter(Boolean))];
  const additions = taskIds.map(taskId => ({
    taskId, title: tasks.find(t => t.id === taskId)?.title || taskId,
    minutes: taskAllocations[taskId], pomodoros: counts.get(taskId)
  }));
  const occupied = Object.values(taskAllocations).reduce((sum, value) => sum + value, 0);
  const { taskId: legacyTaskId, ...baseSession } = session;
  return { session: { ...baseSession, taskIds, taskAllocations, pomodoroTaskIds: slotTaskIds },
    additions, slots, unassignableMinutes, capacity: duration, occupied,
    freeMinutes: duration - occupied };
}

/** Retain quotas and slot assignments only if the Pomodoro structure is unchanged. */
export function reconcileSessionAllocations(previous, next) {
  if (!previous?.taskAllocations) return next;
  const ids = sessionTaskIds(next);
  const oldIds = sessionTaskIds(previous);
  const sameIds = ids.length === oldIds.length && ids.every(id => oldIds.includes(id));
  const sameStructure = previous.workMinutes === next.workMinutes &&
    previous.breakEnabled === next.breakEnabled &&
    sessionDurationMinutes(previous) === sessionDurationMinutes(next);
  if (!sameIds || !sameStructure) return next;
  const total = Object.values(previous.taskAllocations).reduce((sum, n) => sum + Number(n || 0), 0);
  if (total > sessionDurationMinutes(next)) return next;
  return { ...next, taskAllocations: { ...previous.taskAllocations },
    ...(Array.isArray(previous.pomodoroTaskIds)
      ? { pomodoroTaskIds: [...previous.pomodoroTaskIds] } : {}) };
}
