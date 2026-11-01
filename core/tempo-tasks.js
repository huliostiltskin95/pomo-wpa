import { sessionBounds, timeToMinutes, pauseMinutes } from "./tempo-core.js";

export const TASK_AREAS = Object.freeze(["Personale", "Lavoro", "Studio"]);
export const TASK_PRIORITIES = Object.freeze(["alta", "media", "bassa", "nessuna"]);
export const TASK_STATUSES = Object.freeze(["todo", "in_progress", "done"]);

export function parseTaskTags(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const text = String(value).trim();
    if (!text) continue;
    const parts = text.split("/").map(part => part.trim());
    if (parts.some(part => !part || part.length > 60) || parts.length > 8) {
      throw new Error("Usa tag gerarchici come Studio/Greco, senza livelli vuoti (massimo 8).");
    }
    const path = parts.join("/");
    if (!seen.has(path.toLocaleLowerCase())) {
      result.push(path);
      seen.add(path.toLocaleLowerCase());
    }
  }
  if (result.length > 24) throw new Error("Sono consentiti al massimo 24 tag per attività.");
  return result;
}

export function normalizeTask(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const tags = parseTaskTags(value.tags);
    const task = {
      id: String(value.id || ""),
      title: String(value.title || "").trim(),
      area: value.area,
      priority: value.priority,
      description: String(value.description || ""),
      tags,
      estimateMinutes: value.estimateMinutes == null || value.estimateMinutes === "" ? null : Number(value.estimateMinutes),
      dueDate: typeof value.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.dueDate) ? value.dueDate : "",
      // Backward-compatible migration from the original completed boolean.
      status: value.status === undefined ? (value.completed === true ? "done" : "todo") : value.status,
      completed: (value.status === undefined ? value.completed === true : value.status === "done"),
      createdAt: typeof value.createdAt === "string" ? value.createdAt : ""
    };
    return validTask(task) ? task : null;
  } catch {
    return null;
  }
}

export function validTask(task) {
  return !!task && typeof task.id === "string" && task.id.length > 0 &&
    typeof task.title === "string" && task.title.length > 0 && task.title.length <= 120 &&
    TASK_AREAS.includes(task.area) && TASK_PRIORITIES.includes(task.priority) &&
    TASK_STATUSES.includes(task.status) && task.completed === (task.status === "done") &&
    typeof task.description === "string" && task.description.length <= 10000 &&
    Array.isArray(task.tags) && task.tags.length <= 24 &&
    (task.estimateMinutes === null || (Number.isInteger(task.estimateMinutes) && task.estimateMinutes >= 15 && task.estimateMinutes <= 600000));
}

export function estimatedMinutesFromHours(hours) {
  const number = Number(hours);
  if (hours === "" || hours === null || hours === undefined) return null;
  if (!Number.isFinite(number) || number < .25 || number > 10000) return NaN;
  const minutes = Math.round(number * 60);
  return minutes % 15 === 0 ? minutes : NaN;
}

export function hoursFromMinutes(minutes) {
  return (Number(minutes || 0) / 60).toLocaleString("it-IT", { maximumFractionDigits: 2 });
}

/** Focus time excludes pauses. No pause is added after the final focus minute. */
export function wallMinutesForFocus(focusMinutes, workMinutes, breakEnabled) {
  if (!Number.isInteger(focusMinutes) || focusMinutes < 1 ||
      !Number.isInteger(workMinutes) || workMinutes < 1 || workMinutes > 240) return NaN;
  if (!breakEnabled) return focusMinutes;
  return focusMinutes + Math.floor((focusMinutes - 1) / workMinutes) * pauseMinutes(workMinutes);
}

/** Actual focus minutes represented by an existing session's calendar interval. */
export function focusMinutesInSession(session) {
  const wallMinutes = timeToMinutes(session.end) - timeToMinutes(session.start);
  const work = Number(session.workMinutes);
  if (!Number.isInteger(wallMinutes) || wallMinutes <= 0 || !Number.isInteger(work) || work < 1) return 0;
  if (!session.breakEnabled) return wallMinutes;
  const pause = pauseMinutes(work);
  const cycle = work + pause;
  return Math.floor(wallMinutes / cycle) * work + Math.min(work, wallMinutes % cycle);
}

export function plannedFocusMinutes(taskId, sessions) {
  return sessions.filter(session => session.taskId === taskId)
    .reduce((sum, session) => sum + focusMinutesInSession(session), 0);
}

export function taskTagAncestors(tags) {
  const result = new Set();
  for (const tag of tags) {
    const parts = tag.split("/");
    for (let i = 1; i <= parts.length; i++) result.add(parts.slice(0, i).join("/"));
  }
  return [...result].sort((a, b) => a.localeCompare(b, "it"));
}

export function taskHasTag(task, ancestor) {
  return !ancestor || task.tags.some(tag => tag === ancestor || tag.startsWith(ancestor + "/"));
}

export function createTaskSession(task, { id, date, start, focusMinutes, grossMinutes, workMinutes, breakEnabled }) {
  // A gross duration is an exact calendar interval; breaks occur inside it.
  // focusMinutes remains supported for existing callers and plugins.
  const duration = grossMinutes === undefined ? wallMinutesForFocus(focusMinutes, workMinutes, breakEnabled) : grossMinutes;
  if (!Number.isInteger(duration) || duration < 1) throw new Error("Durata lorda non valida.");
  const startMinute = timeToMinutes(start);
  if (!Number.isFinite(duration) || !Number.isFinite(startMinute)) throw new Error("Data o durata non valida.");
  if (startMinute + duration >= 24 * 60) throw new Error("La sessione deve concludersi prima di mezzanotte.");
  const endMinute = startMinute + duration;
  const end = String(Math.floor(endMinute / 60)).padStart(2, "0") + ":" +
    String(endMinute % 60).padStart(2, "0");
  // Date validation is done by the existing validSession before committing.
  return { id, taskId: task.id, title: task.title, date, start, end, workMinutes, breakEnabled };
}

/**
 * Returns a persistent, non-destructive planning reminder. Session completion
 * NEVER modifies task.status: only explicit user actions may do so.
 * A future or currently active session suppresses the reminder.
 */
export function getTaskAttention(task, sessions, now = new Date()) {
  if (!task || task.status === "done") return null;
  const linked = sessions.filter(session => session.taskId === task.id);
  if (linked.some(session => sessionBounds(session).end > now)) return null;
  if (linked.length === 0) {
    return { kind: "unplanned", label: "Da pianificare", lastEnd: null };
  }
  const lastEnd = linked.reduce((last, session) => {
    const end = sessionBounds(session).end;
    return !last || end > last ? end : last;
  }, null);
  return { kind: "reschedule", label: "Da riprogrammare", lastEnd };
}

/** Calendar blocks elapsed, not guaranteed attention or actual work. */
export function elapsedScheduledFocusMinutes(taskId, sessions, now = new Date()) {
  return sessions.filter(session => session.taskId === taskId && sessionBounds(session).end <= now)
    .reduce((sum, session) => sum + focusMinutesInSession(session), 0);
}
