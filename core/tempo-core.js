/**
 * Tempo Core
 * Pure scheduling and Pomodoro calculations shared by the PWA and Obsidian.
 * No DOM, browser storage, notifications, or platform-specific APIs.
 */
export const DEFAULTS = Object.freeze({ workMinutes: 25, breakEnabled: true });

export function localDateString(date = new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
export function timeToMinutes(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
export function dateTime(date, time) {
  const [y, mo, d] = date.split("-").map(Number), [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}
export function formatTime(date) { return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(date); }
export function formatDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
export function clampInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}
export function pauseMinutes(work) { return Math.max(1, Math.round(work / 5)); }
export function normalizeSession(session) {
  if (!session || typeof session !== "object" || Array.isArray(session)) return session;
  return { ...session, breakEnabled: session.breakEnabled !== undefined ? Boolean(session.breakEnabled) : true };
}
export function validSession(session) {
  if (!session || typeof session.id !== "string" || !session.id.trim() ||
      typeof session.title !== "string" || !session.title.trim() ||
      typeof session.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(session.date) ||
      !Number.isInteger(session.workMinutes) || session.workMinutes < 1 || session.workMinutes > 240) return false;
  const [year, month, day] = session.date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  const start = timeToMinutes(session.start), end = timeToMinutes(session.end);
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}
export function sessionBounds(session) { return { start: dateTime(session.date, session.start), end: dateTime(session.date, session.end) }; }
export function getSessionStatus(session, now = new Date()) {
  const { start, end } = sessionBounds(session);
  if (now < start) return "upcoming";
  if (now >= end) return "finished";
  return "active";
}
export function sortSessions(sessions) {
  return [...sessions].sort((a, b) => sessionBounds(a).start - sessionBounds(b).start);
}
export function getActiveSession(sessions, now = new Date()) {
  return sortSessions(sessions.filter(session => getSessionStatus(session, now) === "active"))[0] || null;
}
export function getNextSession(sessions, now = new Date()) {
  return sortSessions(sessions.filter(session => getSessionStatus(session, now) === "upcoming"))[0] || null;
}
export function getPhase(session, now = new Date()) {
  const { start, end } = sessionBounds(session);
  const workMs = session.workMinutes * 60000;
  const elapsed = Math.max(0, now - start);
  const remainingSession = Math.max(0, end - now);
  if (!session.breakEnabled) {
    return { kind: "work", label: "Concentrazione", start, end,
      remaining: Math.max(0, Math.ceil(remainingSession / 1000)),
      progress: Math.min(100, elapsed / Math.max(1, end - start) * 100),
      sessionEnd: end, totalRemaining: Math.ceil(remainingSession / 1000) };
  }
  const breakMs = pauseMinutes(session.workMinutes) * 60000;
  const cycleMs = workMs + breakMs;
  const cycleIndex = Math.floor(elapsed / cycleMs);
  const within = elapsed % cycleMs;
  const isWork = within < workMs;
  const phaseDuration = isWork ? workMs : breakMs;
  const phaseElapsed = isWork ? within : within - workMs;
  const phaseStart = new Date(start.getTime() + cycleIndex * cycleMs + (isWork ? 0 : workMs));
  const theoreticalEnd = new Date(phaseStart.getTime() + phaseDuration);
  const phaseEnd = theoreticalEnd < end ? theoreticalEnd : end;
  return { kind: isWork ? "work" : "break", label: isWork ? "Concentrazione" : "Pausa",
    start: phaseStart, end: phaseEnd, remaining: Math.max(0, Math.ceil((phaseEnd - now) / 1000)),
    progress: Math.min(100, Math.max(0, phaseElapsed / phaseDuration * 100)),
    sessionEnd: end, totalRemaining: Math.ceil(remainingSession / 1000) };
}
export function mmss(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60), remainder = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
export function sessionsOverlap(a, b) {
  if (a.date !== b.date) return false;
  const aa = sessionBounds(a), bb = sessionBounds(b);
  return aa.start < bb.end && aa.end > bb.start;
}
export function hasSessionOverlaps(sessions) {
  const sorted = [...sessions].sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  let currentDate = "", furthestEnd = -Infinity;
  for (const session of sorted) {
    if (session.date !== currentDate) { currentDate = session.date; furthestEnd = -Infinity; }
    const { start, end } = sessionBounds(session);
    if (start.getTime() < furthestEnd) return true;
    furthestEnd = Math.max(furthestEnd, end.getTime());
  }
  return false;
}
