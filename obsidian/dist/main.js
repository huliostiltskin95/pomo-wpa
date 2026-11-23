"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// obsidian/main.js
var main_exports = {};
__export(main_exports, {
  default: () => TempvsPlugin
});
module.exports = __toCommonJS(main_exports);

// obsidian/notes-integration.js
var wiki = /!?\[\[([^\]\n]+)\]\]/g;
var markdown = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
function noteLinks(description = "") {
  const found = [], seen = /* @__PURE__ */ new Set();
  const add = (target, label) => {
    target = String(target || "").trim();
    if (!target || /^(?:https?:|javascript:|data:|file:)/i.test(target)) return;
    if (target.startsWith("obsidian://open?")) {
      try {
        const url = new URL(target);
        target = url.searchParams.get("file") || "";
      } catch {
        return;
      }
    } else if (target.includes("://")) return;
    if (!target) return;
    const key2 = target.toLowerCase();
    if (seen.has(key2)) return;
    seen.add(key2);
    found.push({ path: target, label: String(label || target).trim() || target });
  };
  for (const m of String(description).matchAll(wiki)) {
    const [path, alias] = m[1].split("|");
    add(path, alias || path);
  }
  for (const m of String(description).matchAll(markdown)) add(m[2], m[1]);
  return found;
}
function appendNoteLink(description = "", path) {
  path = String(path || "").trim();
  if (!path || path.includes("]]") || path.includes("\n")) throw Error("Percorso nota non valido.");
  if (noteLinks(description).some((link) => link.path.toLowerCase() === path.toLowerCase())) return String(description);
  return String(description).trimEnd() + (String(description).trim() ? "\n" : "") + "- [[" + path + "]]";
}

// core/tempo-core.js
var DEFAULTS = Object.freeze({ workMinutes: 25, breakEnabled: true });
function localDateString(date = /* @__PURE__ */ new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function timeToMinutes(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
function dateTime(date, time2) {
  const [y, mo, d] = date.split("-").map(Number), [h, mi] = time2.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}
function formatTime(date) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(date);
}
function pauseMinutes(work) {
  return work / 5;
}
function normalizeSession(session) {
  if (!session || typeof session !== "object" || Array.isArray(session)) return session;
  return { ...session, breakEnabled: session.breakEnabled !== void 0 ? Boolean(session.breakEnabled) : true };
}
function validSession(session) {
  if (!session || typeof session.id !== "string" || !session.id.trim() || typeof session.title !== "string" || !session.title.trim() || typeof session.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(session.date) || !(session.cycleMinutes !== void 0 && session.workMinutes === session.cycleMinutes * 5 / 6) && (!Number.isInteger(session.workMinutes) || session.workMinutes < 1 || session.workMinutes > 240)) return false;
  if (session.cycleMinutes !== void 0 && (!Number.isInteger(session.cycleMinutes) || session.cycleMinutes < 1 || session.cycleMinutes > 1439 || session.cycleMinutes <= session.workMinutes || session.customBreakMinutes !== void 0)) return false;
  const [year, month, day] = session.date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  const start = timeToMinutes(session.start), end = timeToMinutes(session.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (session.customBreakMinutes !== void 0 && (!Number.isInteger(session.customBreakMinutes) || session.customBreakMinutes < 0 || session.customBreakMinutes > (sessionBounds(session).end - sessionBounds(session).start) / 6e4)) return false;
  return true;
}
function sessionBounds(session) {
  if (session.timerStartedAt && session.timerEndsAt) {
    const start2 = new Date(session.timerStartedAt), end2 = new Date(session.timerEndsAt);
    if (Number.isFinite(+start2) && Number.isFinite(+end2) && end2 > start2) return { start: start2, end: end2 };
  }
  const start = dateTime(session.date, session.start);
  const end = dateTime(session.date, session.end);
  if (timeToMinutes(session.end) <= timeToMinutes(session.start)) end.setDate(end.getDate() + 1);
  return { start, end };
}
function getSessionStatus(session, now = /* @__PURE__ */ new Date()) {
  const { start, end } = sessionBounds(session);
  if (now < start) return "upcoming";
  if (now >= end) return "finished";
  return "active";
}
function sortSessions(sessions) {
  return [...sessions].sort((a, b) => sessionBounds(a).start - sessionBounds(b).start);
}
function getActiveSession(sessions, now = /* @__PURE__ */ new Date()) {
  return sortSessions(sessions.filter((session) => getSessionStatus(session, now) === "active"))[0] || null;
}
function getNextSession(sessions, now = /* @__PURE__ */ new Date()) {
  return sortSessions(sessions.filter((session) => getSessionStatus(session, now) === "upcoming"))[0] || null;
}
function getPhase(session, now = /* @__PURE__ */ new Date()) {
  const { start, end } = sessionBounds(session);
  if (session.customBreakMinutes !== void 0) {
    const boundary = new Date(+end - session.customBreakMinutes * 6e4);
    const isBreak = session.customBreakMinutes > 0 && now >= boundary;
    const phaseStart2 = isBreak ? boundary : start, phaseEnd2 = isBreak ? end : boundary;
    return {
      kind: isBreak ? "break" : "work",
      label: isBreak ? "Pausa" : "Concentrazione",
      start: phaseStart2,
      end: phaseEnd2,
      remaining: Math.max(0, Math.ceil((phaseEnd2 - now) / 1e3)),
      progress: Math.min(100, Math.max(0, (now - phaseStart2) / Math.max(1, phaseEnd2 - phaseStart2) * 100)),
      sessionEnd: end,
      totalRemaining: Math.max(0, Math.ceil((end - now) / 1e3))
    };
  }
  const workMs = Math.round(session.registerMinutes ? (end - start) * 5 / 6 : session.workMinutes * 6e4);
  const elapsed = Math.max(0, now - start);
  const remainingSession = Math.max(0, end - now);
  if (!session.breakEnabled) {
    return {
      kind: "work",
      label: "Concentrazione",
      start,
      end,
      remaining: Math.max(0, Math.ceil(remainingSession / 1e3)),
      progress: Math.min(100, elapsed / Math.max(1, end - start) * 100),
      sessionEnd: end,
      totalRemaining: Math.ceil(remainingSession / 1e3)
    };
  }
  const breakMs = session.registerMinutes ? end - start - workMs : Math.round((session.cycleMinutes !== void 0 ? session.cycleMinutes - session.workMinutes : pauseMinutes(session.workMinutes)) * 6e4);
  const cycleMs = workMs + breakMs;
  const cycleIndex = Math.floor(elapsed / cycleMs);
  const within = elapsed % cycleMs;
  const isWork = within < workMs;
  const phaseDuration = isWork ? workMs : breakMs;
  const phaseElapsed = isWork ? within : within - workMs;
  const phaseStart = new Date(start.getTime() + cycleIndex * cycleMs + (isWork ? 0 : workMs));
  const theoreticalEnd = new Date(phaseStart.getTime() + phaseDuration);
  const phaseEnd = theoreticalEnd < end ? theoreticalEnd : end;
  return {
    kind: isWork ? "work" : "break",
    label: isWork ? "Concentrazione" : "Pausa",
    start: phaseStart,
    end: phaseEnd,
    remaining: Math.max(0, Math.ceil((phaseEnd - now) / 1e3)),
    progress: Math.min(100, Math.max(0, phaseElapsed / phaseDuration * 100)),
    sessionEnd: end,
    totalRemaining: Math.ceil(remainingSession / 1e3)
  };
}
function mmss(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60), remainder = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
function sessionsOverlap(a, b) {
  const aa = sessionBounds(a), bb = sessionBounds(b);
  return aa.start < bb.end && aa.end > bb.start;
}
function hasSessionOverlaps(sessions) {
  const sorted = sortSessions(sessions);
  let furthestEnd = -Infinity;
  for (const session of sorted) {
    const { start, end } = sessionBounds(session);
    if (start.getTime() < furthestEnd) return true;
    furthestEnd = Math.max(furthestEnd, end.getTime());
  }
  return false;
}
function getAmbientFocusMode(sessions, now = /* @__PURE__ */ new Date()) {
  const active = getActiveSession(sessions, now);
  if (active) {
    const phase = getPhase(active, now);
    if (phase.kind === "work") return "focus";
    if (phase.end.getTime() < sessionBounds(active).end.getTime()) return "waiting";
  }
  return getNextSession(sessions, now) ? "waiting" : "finished";
}

// core/tempo-estimates.js
var isEstimateSource = (source) => /^\s*@/m.test(source);
function parseEstimate(source, areas) {
  const rows = [];
  for (const [i, line] of source.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const total = line.trim().match(/^@(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
    if (total) {
      if (rows.length || source.split(/\r?\n/).filter((row2) => row2.trim()).length !== 1)
        throw Error("La durata totale @14h deve essere l\u2019unica riga del blocco TEMPVS.");
      const value = Number(total[1].replace(",", ".")) * (total[2].toLowerCase() === "h" ? 60 : 1);
      if (!Number.isSafeInteger(value) || value < 1 || value > 1e5)
        throw Error("Durata totale lorda non valida: usa @14h oppure @90m (minuti interi).");
      return [{ kind: "total", grossMinutes: value }];
    }
    const budget = line.trim().match(/^@(.+?)\s+(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
    if (budget) {
      const area2 = areas.find((a) => a.name.toLocaleLowerCase() === budget[1].trim().toLocaleLowerCase());
      if (!area2) throw Error("Area sconosciuta: " + budget[1]);
      const targetMinutes = Number(budget[2].replace(",", ".")) * (budget[3].toLowerCase() === "h" ? 60 : 1);
      if (!Number.isSafeInteger(targetMinutes) || targetMinutes < 1 || targetMinutes > 1e5) throw Error("Indica una durata tra 1 e 100000 minuti interi.");
      rows.push({ kind: "budget", area: area2.name, areaId: area2.id, targetMinutes });
      continue;
    }
    const m = line.trim().match(/^@(.+?)\s+(\d+)\s+-\s*(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
    if (!m) throw Error(`Riga ${i + 1}: usa @Studio 10h.`);
    const area = areas.find((a) => a.name.trim().toLocaleLowerCase() === m[1].trim().toLocaleLowerCase());
    if (!area) throw Error(`Riga ${i + 1}: area sconosciuta: ${m[1]}.`);
    const count = Number(m[2]), minutes = Number(m[3].replace(",", ".")) * (m[4].toLowerCase() === "h" ? 60 : 1);
    if (!Number.isSafeInteger(count) || count < 1 || count > 1e5 || !Number.isInteger(minutes) || minutes < 1 || minutes > 1439) throw Error(`Riga ${i + 1}: indica 1\u2013100000 sessioni da 1\u20131439 minuti lordi interi.`);
    rows.push({ areaId: area.id, area: area.name, count, minutes });
  }
  if (!rows.length) throw Error("Inserisci almeno una stima.");
  return rows;
}
function validateEstimates(value) {
  if (value === void 0) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Stime delle note non valide.");
  for (const [id, n] of Object.entries(value)) {
    if (n?.completion && (!Number.isFinite(n.completion.estimated) || n.completion.estimated <= 0 || !Number.isFinite(n.completion.done) || n.completion.done < 0)) throw Error("Consuntivo della nota non valido.");
    const total = n?.entries?.length === 1 && n.entries[0]?.kind === "total";
    const invalid = total ? !Number.isSafeInteger(n.entries[0].grossMinutes) || n.entries[0].grossMinutes < 1 || n.entries[0].grossMinutes > 1e5 : n?.entries?.some((e) => !e || e.kind === "total" || typeof e.area !== "string" || (e.kind === "budget" ? !Number.isSafeInteger(e.targetMinutes) || e.targetMinutes < 1 || e.targetMinutes > 1e5 : !Number.isInteger(e.count) || e.count < 1 || e.count > 1e5 || !Number.isInteger(e.minutes) || e.minutes < 1 || e.minutes > 1439));
    if (!n || n.id !== id || typeof n.path !== "string" || !n.path || typeof n.title !== "string" || !Array.isArray(n.entries) || !n.entries.length || invalid)
      throw Error("Stima della nota non valida.");
  }
}
var estimatesOf = (state) => Object.values(state.defaults?.simple?.noteEstimates || {});
var matchesArea = (entry, session) => entry.kind === "total" || (entry.areaId && session.areaId ? entry.areaId === session.areaId : entry.area === (session.area || session.title));
var normalizeTarget = (path) => String(path || "").split(/[#^]/)[0].replace(/\\/g, "/").replace(/\.md$/i, "").replace(/^\/+|\/+$/g, "").toLocaleLowerCase();
function isPrimaryLink(record, note, state) {
  const raw = record.linkedNotes?.[0]?.path;
  if (!raw) return false;
  const link = normalizeTarget(raw), full = normalizeTarget(note.path);
  if (link === full) return true;
  if (link.includes("/") || link !== full.split("/").at(-1)) return false;
  const matches = estimatesOf(state).filter((n) => n.vault === note.vault && normalizeTarget(n.path).split("/").at(-1) === link);
  return matches.length === 1 && matches[0].id === note.id;
}
function attributedFocus(record, note, state) {
  const existing = record.noteWork || {};
  const credited = Math.max(0, Number(existing[note.id]) || 0);
  const allocated = Object.values(existing).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const selected = isPrimaryLink(record, note, state) || !record.linkedNotes?.length && record.noteEstimateId === note.id;
  return credited + (selected ? Math.max(0, (record.actualSeconds ?? (record.measured ? (Number(record.minutes) || 0) * 60 : 0)) - allocated) : 0);
}
function measuredTotals(note, state) {
  const estimated = note.entries.reduce((sum, e) => sum + (e.targetMinutes ?? e.grossMinutes ?? e.count * e.minutes) * 60, 0);
  const records = /* @__PURE__ */ new Map();
  for (const history2 of state.history || []) if (history2.measured) records.set(history2.sessionId, history2);
  for (const session of state.sessions || []) records.set(session.id, session);
  let done = 0;
  for (const record of records.values()) {
    if (note.entries.some((entry) => matchesArea(entry, record))) done += attributedFocus(record, note, state);
  }
  return { estimated, done };
}
function estimateProgress(note, state) {
  const { estimated, done } = note.completed && note.completion ? note.completion : measuredTotals(note, state);
  return { estimated, done, remaining: Math.max(0, estimated - done), difference: done - estimated, percent: estimated ? 100 * done / estimated : 0 };
}
function setEstimateCompleted(note, state, completed) {
  if (note.completed === completed) return;
  if (completed) note.completion = measuredTotals(note, state);
  else delete note.completion;
  note.completed = completed;
}
function estimateResult(note, progress) {
  if (!note.completed) return "Restano " + estimateTime(progress.remaining) + " \xB7 " + Math.floor(progress.percent) + "%";
  if (progress.difference === 0) return "Completato \xB7 stima rispettata";
  return "Completato \xB7 " + estimateTime(Math.abs(progress.difference)) + (progress.difference < 0 ? " sotto la stima" : " oltre la stima");
}
function estimateTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds)), h = Math.floor(value / 3600), m = Math.floor(value % 3600 / 60), s = value % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : "", s ? `${s} s` : ""].filter(Boolean).join(" ") || "0 min";
}

// core/tempo-areas.js
var key = (name) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
var legacyId = (name) => "area:" + encodeURIComponent(key(name));
function normalizeAreaLinks(data, areas) {
  const names = /* @__PURE__ */ new Set(), ids = /* @__PURE__ */ new Set();
  const normalized = areas.map((area) => {
    const name = area.name.trim(), id = area.id ?? legacyId(name);
    if (!name || name.length > 80 || names.has(key(name)) || typeof id !== "string" || !id || ids.has(id))
      throw Error("Aree con nomi o identificativi duplicati/non validi.");
    names.add(key(name));
    ids.add(id);
    return { ...area, id, name };
  });
  const collections = { sessions: data.sessions || [], tasks: data.tasks || [], history: data.history || [] };
  const linked = {}, sessionById = new Map((data.sessions || []).map((s) => [s.id, s]));
  for (const [collection, items] of Object.entries(collections)) {
    linked[collection] = items.map((item) => {
      let area = item.areaId ? normalized.find((a) => a.id === item.areaId) : null;
      if (item.areaId && !area) area = normalized.find((a) => a.name === item.area);
      if (item.areaId && !area) throw Error("Associazione area mancante: " + item.areaId + ". Ripristina o risolvi il conflitto tra le aree.");
      const name = item.area || (collection === "sessions" ? item.title : collection === "history" ? sessionById.get(item.sessionId)?.area || (normalized.some((a) => a.name === item.title) ? item.title : "") : "");
      if (!area && name) {
        area = normalized.find((a) => key(a.name) === key(name));
        if (!area) {
          area = { id: legacyId(name), name: name.trim(), description: "" };
          normalized.push(area);
        }
      }
      if (!area) return { ...item };
      return {
        ...item,
        areaId: area.id,
        area: area.name,
        ...item.title === item.area && item.area !== area.name ? { title: area.name } : {}
      };
    });
  }
  return { areas: normalized, ...linked };
}

// core/tempo-simple.js
var DEFAULT_AREA_COLORS = Object.freeze({
  Studio: "#D65B56",
  Lavoro: "#29845C",
  Personale: "#D6A323"
});
function normalizeAreaColor(value, name = "") {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : DEFAULT_AREA_COLORS[name] || "#54769B";
}
function focusCycle(focusMinutes, breakEnabled = true) {
  if (!Number.isInteger(focusMinutes) || focusMinutes < 1 || focusMinutes > 240)
    throw Error("La concentrazione per ciclo deve durare da 1 a 240 minuti.");
  return { focusMinutes, breakMinutes: breakEnabled ? pauseMinutes(focusMinutes) : 0 };
}
function grossCycle(cycleMinutes) {
  if (!Number.isInteger(cycleMinutes) || cycleMinutes < 1 || cycleMinutes > 1439)
    throw Error("Il pomodoro lordo deve durare da 1 a 1439 minuti interi.");
  const focusMinutes = cycleMinutes * 5 / 6;
  return { focusMinutes, breakMinutes: cycleMinutes - focusMinutes };
}
function customPause(minutes, grossMinutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= grossMinutes)
    throw Error("La pausa deve essere un numero intero di minuti, da 0 a meno della durata lorda.");
  return minutes;
}
function manualSessionEnd(start, grossMinutes) {
  const startedAt = start instanceof Date ? start : new Date(start);
  const minutes = Number(grossMinutes);
  if (!Number.isFinite(+startedAt) || !Number.isInteger(minutes) || minutes < 1 || minutes > 1439)
    throw Error("La durata lorda deve essere compresa tra 1 e 1439 minuti.");
  return new Date(startedAt.getTime() + minutes * 6e4);
}
function normalizeArchive(data) {
  if (!data || !Array.isArray(data.sessions) || data.sessions.some((s) => !validSession(s)) || new Set(data.sessions.map((s) => s.id)).size !== data.sessions.length) throw Error("Archivio sessioni non valido.");
  if (data.sessions.some((s) => s.actualSeconds !== void 0 && (!Number.isFinite(s.actualSeconds) || s.actualSeconds < 0))) throw Error("Tempo registrato non valido.");
  if (data.defaults?.workMinutes !== void 0 && (!Number.isInteger(data.defaults.workMinutes) || data.defaults.workMinutes < 1 || data.defaults.workMinutes > 240)) throw Error("Durata del ciclo non valida.");
  if (data.sessions.some((s) => (s.timerStartedAt || s.timerEndsAt) && (!Number.isFinite(+new Date(s.timerStartedAt)) || !Number.isFinite(+new Date(s.timerEndsAt)) || new Date(s.timerEndsAt) <= new Date(s.timerStartedAt)))) throw Error("Orari timer non validi.");
  const config = data.defaults?.simple || {};
  validateEstimates(config.noteEstimates);
  for (const item of [...data.sessions, ...data.history || []]) if (item.noteWork !== void 0 && (!item.noteWork || typeof item.noteWork !== "object" || Array.isArray(item.noteWork) || Object.values(item.noteWork).some((v) => !Number.isFinite(v) || v < 0))) throw Error("Avanzamento note non valido.");
  if (config.areas && (!Array.isArray(config.areas) || !config.areas.length || config.areas.some((a) => !a || typeof a.name !== "string" || !a.name.trim() || typeof a.description !== "string"))) throw Error("Aree non valide.");
  if (config.windows && (!Array.isArray(config.windows) || config.windows.some((w) => !validSession({ ...w, id: "window", title: "window", workMinutes: 25 })))) throw Error("Fasce non valide.");
  if (data.history && (!Array.isArray(data.history) || data.history.some((h) => !h || typeof h.sessionId !== "string" || !h.sessionId.trim() || !Number.isFinite(h.minutes) || h.minutes < 0))) throw Error("Storico non valido.");
  if (data.tasks !== void 0 && (!Array.isArray(data.tasks) || data.tasks.some((t) => !t || typeof t.id !== "string" || !t.id || t.title !== void 0 && typeof t.title !== "string") || new Set(data.tasks.map((t) => t.id)).size !== data.tasks.length)) throw Error("Attivit\xE0 non valide.");
  if (data.history && new Set(data.history.map((h) => h.sessionId)).size !== data.history.length) throw Error("Storico duplicato.");
  if (data.syncDeleted !== void 0 && (!data.syncDeleted || ["tasks", "sessions", "history"].some((k) => data.syncDeleted[k] !== void 0 && (!Array.isArray(data.syncDeleted[k]) || data.syncDeleted[k].some((id) => typeof id !== "string" || !id))))) throw Error("Cancellazioni non valide.");
  const names = [.../* @__PURE__ */ new Set(["Studio", "Lavoro", "Personale", ...data.sessions.map((s) => s.area || s.title)])];
  const storedAreas = config.areas || names.map((name) => ({ name, description: "" }));
  const areas = storedAreas.map((area) => ({
    ...area,
    color: normalizeAreaColor(area.color ?? data.appearance?.areaColors?.[area.name], area.name)
  }));
  const linked = normalizeAreaLinks(data, areas);
  return { ...data, sessions: linked.sessions.map(normalizeSession), tasks: linked.tasks, history: linked.history, syncDeleted: { tasks: [], sessions: [], ...data.syncDeleted }, defaults: { ...data.defaults, workMinutes: data.defaults?.workMinutes || 25, breakEnabled: data.defaults?.breakEnabled !== false, simple: { ...config, areas: linked.areas.map((a) => ({ ...a, color: normalizeAreaColor(a.color, a.name) })), windows: config.windows || [] } } };
}
function planSessions(requests, windows, existing, defaults, now = /* @__PURE__ */ new Date(), id = () => crypto.randomUUID(), selectedDate = localDateString(now)) {
  if (!Array.isArray(requests) || !Array.isArray(windows) || !Array.isArray(existing)) throw Error("Richieste e fasce non valide.");
  if (!Number.isFinite(+now)) throw Error("Data attuale non valida.");
  const result = [];
  let remainder = 0;
  const cycleFor = (request) => request.cycleMinutes !== void 0 ? grossCycle(request.cycleMinutes).focusMinutes : focusCycle(request.focusMinutes ?? defaults.workMinutes, defaults.breakEnabled).focusMinutes;
  const cycleSettings = (request) => request.cycleMinutes !== void 0 ? { cycleMinutes: request.cycleMinutes, breakEnabled: true } : {};
  for (const request of requests) {
    if (!request || typeof request.area !== "string" || !request.area.trim() || !Number.isInteger(request.minutes) || request.minutes < 1 || request.minutes > 10080)
      throw Error("Indica area e durata lorda da 1 a 10080 minuti interi.");
    if (request.dayOffset !== void 0 && ![0, 1].includes(request.dayOffset))
      throw Error("Il giorno della sessione deve essere quello selezionato o il successivo.");
    if (request.start !== void 0 && !/^([01]\d|2[0-3]):[0-5]\d$/.test(request.start))
      throw Error("Orario fisso non valido: usa HH:MM.");
    cycleFor(request);
    if (request.cycleMinutes !== void 0) {
      if (request.focusMinutes !== void 0 || request.customBreakMinutes !== void 0) throw Error("Usa un solo tipo di ciclo: -minuti, ~focus oppure !pausa finale.");
      continue;
    }
    const pause = request.customBreakMinutes ?? defaults.customBreakMinutes;
    if (pause !== void 0) customPause(pause, request.minutes);
  }
  const applyPause = (request, sessions) => {
    if (request.cycleMinutes !== void 0) return;
    let pause = request.customBreakMinutes ?? defaults.customBreakMinutes;
    if (pause === void 0) return;
    for (const session of [...sessions].reverse()) {
      const gross = Math.round((sessionBounds(session).end - sessionBounds(session).start) / 6e4);
      session.customBreakMinutes = Math.min(pause, gross);
      session.breakEnabled = session.customBreakMinutes > 0;
      pause -= session.customBreakMinutes;
    }
  };
  for (const request of requests.filter((r) => r.start)) {
    if (request.minutes > 1440) throw Error("Una sessione con orario fisso pu\xF2 durare al massimo 24 ore.");
    const start = dateTime(selectedDate, request.start);
    if (request.dayOffset) start.setDate(start.getDate() + request.dayOffset);
    const end = new Date(+start + request.minutes * 6e4);
    const session = { id: id(), title: request.area, area: request.area, ...request.areaId ? { areaId: request.areaId } : {}, date: localDateString(start), start: request.start, end: formatTime(end), workMinutes: cycleFor(request), breakEnabled: defaults.breakEnabled !== false, ...cycleSettings(request), actualSeconds: 0 };
    if (!validSession(session)) throw Error("Data o orario non valido.");
    if (+start < +now) throw Error("L\u2019orario " + request.start + " \xE8 gi\xE0 passato nel giorno scelto. Cambia giorno o orario.");
    applyPause(request, [session]);
    result.push(session);
  }
  if (hasSessionOverlaps([...existing, ...result])) throw Error("Gli orari indicati si sovrappongono a un\u2019altra sessione.");
  for (const request of requests.filter((r) => !r.start)) {
    const first = result.length;
    let left = request.minutes;
    for (const window2 of [...windows].sort((a, b) => sessionBounds(a).start - sessionBounds(b).start)) {
      const bounds = sessionBounds(window2);
      let cursor = Math.max(+bounds.start, Math.ceil(+now / 6e4) * 6e4);
      const occupied = [...existing, ...result].map(sessionBounds).sort((a, b) => a.start - b.start);
      const gaps = [];
      for (const block of occupied) {
        if (+block.end <= cursor || +block.start >= +bounds.end) continue;
        if (+block.start > cursor) gaps.push([cursor, Math.min(+block.start, +bounds.end)]);
        cursor = Math.max(cursor, +block.end);
      }
      if (cursor < +bounds.end) gaps.push([cursor, +bounds.end]);
      for (const [start, end] of gaps) {
        const minutes = Math.min(left, Math.floor((end - start) / 6e4), 1439);
        if (minutes <= 0) continue;
        const finish = new Date(start + minutes * 6e4);
        result.push({ id: id(), title: request.area, area: request.area, ...request.areaId ? { areaId: request.areaId } : {}, date: localDateString(new Date(start)), start: formatTime(new Date(start)), end: formatTime(finish), workMinutes: cycleFor(request), breakEnabled: defaults.breakEnabled !== false, ...cycleSettings(request), actualSeconds: 0 });
        left -= minutes;
        if (!left) break;
      }
      if (!left) break;
    }
    if (!left) applyPause(request, result.slice(first));
    remainder += left;
  }
  if (hasSessionOverlaps([...existing, ...result])) throw Error("Le sessioni si sovrappongono.");
  return { sessions: result, remainder, unusedMinutes: requests.reduce((n, r) => n + (r.unusedMinutes || 0), 0) };
}
function parseQuick(text, areas) {
  return text.split("\n").flatMap((line, index) => {
    if (!line.trim()) return [];
    try {
      const input = line.trim();
      const range = input.match(/^(.+?)\s+\+\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*-\s*((?:[01]\d|2[0-3]):[0-5]\d)\s+-\s*(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
      if (range) {
        const area2 = areas.find((a) => a.name.trim().replace(/\s+/g, " ").toLocaleLowerCase() === range[1].trim().replace(/\s+/g, " ").toLocaleLowerCase());
        if (!area2) throw Error("Area sconosciuta: " + range[1].trim() + ".");
        const minutesOf2 = (time2) => {
          const [hours, minutes2] = time2.split(":").map(Number);
          return hours * 60 + minutes2;
        };
        const timeOf = (minutes2) => String(Math.floor(minutes2 % 1440 / 60)).padStart(2, "0") + ":" + String(minutes2 % 60).padStart(2, "0");
        const from = minutesOf2(range[2]), until = minutesOf2(range[3]);
        const total = (until - from + 1440) % 1440, value = Number(range[4].replace(",", ".")) * (range[5].toLowerCase() === "h" ? 60 : 1);
        const each = Math.round(value);
        if (Math.abs(value - each) > 1e-9) throw Error("La durata lorda deve corrispondere a minuti interi.");
        if (!total) throw Error("La fascia deve avere inizio e fine diversi.");
        if (!Number.isInteger(each) || each < 1 || each > 1439) throw Error("La durata lorda di una sessione deve essere da 1 a 1439 minuti.");
        const sessions = [];
        if (each > total) throw Error("La fascia \xE8 pi\xF9 breve di una sessione lorda da " + each + " minuti.");
        for (let consumed = 0; consumed + each <= total; consumed += each) {
          const at = from + consumed;
          sessions.push({ area: area2.name, ...area2.id ? { areaId: area2.id } : {}, minutes: each, cycleMinutes: each, rangeSession: true, start: timeOf(at), ...at >= 1440 ? { dayOffset: 1 } : {} });
        }
        if (total % each) sessions[sessions.length - 1].unusedMinutes = total % each;
        return sessions;
      }
      const match = input.match(/^(.+?)\s+@(\d+(?:[.,]\d+)?)\s*(h|min|m)(.*)$/i);
      if (!match) throw Error("Usa: Studio +14:00-16:00 -30m oppure Studio @2h +14:00 -60m.");
      const area = areas.find((a) => a.name.toLocaleLowerCase() === match[1].trim().toLocaleLowerCase());
      const minutes = Math.round(Number(match[2].replace(",", ".")) * (match[3].toLowerCase() === "h" ? 60 : 1));
      if (!area || minutes < 1 || minutes > 10080) throw Error("Controlla area e durata lorda (da 1 minuto a 168 ore).");
      let start, focusMinutes, customBreakMinutes, cycleMinutes;
      for (const token of match[4].trim().split(/\s+/).filter(Boolean)) {
        if (/^\+([01]\d|2[0-3]):[0-5]\d$/.test(token) && !start)
          start = token.slice(1);
        else if (/^~\d{1,3}m?$/i.test(token) && focusMinutes === void 0)
          focusMinutes = focusCycle(Number(token.slice(1).replace(/m$/i, ""))).focusMinutes;
        else if (/^-\d{1,3}m?$/i.test(token) && cycleMinutes === void 0) {
          cycleMinutes = Number(token.slice(1).replace(/m$/i, ""));
          grossCycle(cycleMinutes);
        } else if (/^!\d{1,4}m?$/i.test(token) && customBreakMinutes === void 0)
          customBreakMinutes = customPause(Number(token.slice(1).replace(/m$/i, "")), minutes);
        else throw Error("Opzione non valida: " + token + ". Usa +HH:MM, -60m (pomodoro lordo), ~40m (focus) o !5m (pausa finale).");
      }
      if (cycleMinutes !== void 0 && (focusMinutes !== void 0 || customBreakMinutes !== void 0))
        throw Error("Non combinare -minuti con ~focus o !pausa finale.");
      return [{ area: area.name, ...area.id ? { areaId: area.id } : {}, minutes, ...cycleMinutes !== void 0 ? { cycleMinutes } : {}, ...start ? { start } : {}, ...focusMinutes !== void 0 ? { focusMinutes } : {}, ...customBreakMinutes !== void 0 ? { customBreakMinutes } : {} }];
    } catch (error) {
      throw Error("Riga " + (index + 1) + ": " + error.message);
    }
  });
}
function measuredFocus(session, from, to) {
  if (to - from <= 0 || to - from > 15e3 || session.paused || session.finished) return 0;
  const bounds = sessionBounds(session);
  let cursor = Math.max(+from, +bounds.start), end = Math.min(+to, +bounds.end), total = 0;
  while (cursor < end) {
    const phase = getPhase(session, new Date(cursor));
    const next = Math.min(end, +phase.end);
    if (next <= cursor) break;
    if (phase.kind === "work") total += next - cursor;
    cursor = next;
  }
  return total / 1e3;
}

// obsidian/area-register.js
var quantity = "(\\d+(?:[.,]\\d+)?)([hms]?)";
var time = "((?:[01]\\d|2[0-3]):[0-5]\\d)";
var areaLine = new RegExp("^(.+?)\\s+@" + quantity + "$", "i");
var taskLine = new RegExp("^-\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s+@" + quantity + "\\s*=\\s*(\\d+)(?:\\s+\\+" + time + ")?$", "i");
var compactTask = /^-\s*((?:\[\[[^\[\]]+\]\]\s+)+)(\d+(?:[.,]\d+)?)([hms])(?:\s*=\s*(\d+))?(?:\s+\+((?:[01]\d|2[0-3]):[0-5]\d))?\s+@(.+?)$/i;
var possibleTask = new RegExp("^-?\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s*[@*]?\\s*" + quantity + "\\s*=?\\s+(\\d+)(?:\\s*\\+?\\s*" + time + ")?$", "i");
var possibleArea = new RegExp("^(.+?)\\s+[@*]?" + quantity + "$", "i");
var isAreaRegister = (source) => source?.split(/\r?\n/).some((line) => {
  const text = line.trim();
  return areaLine.test(text) || /^\s*-?\s*\[\[.*\]\]\s+[@*\d]/.test(text) || !/[+=]/.test(text) && !text.startsWith("@") && possibleArea.test(text);
});
function readableDuration(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = Math.round(seconds % 60);
  return [h && h + " h", m && m + " min", s && s + " s"].filter(Boolean).join(" ") || "0 min";
}
function secondsOf(value, unit) {
  const seconds = Math.round(Number(value.replace(",", ".")) * { s: 1, m: 60, h: 3600 }[(unit || "h").toLowerCase()] * 1e7) / 1e7;
  if (!Number.isSafeInteger(seconds) || seconds < 1) throw Error("Usa una durata positiva esprimibile in secondi interi.");
  return seconds;
}
function suggestion(line) {
  const task = line.match(possibleTask);
  if (task) return "- " + task[1] + " @" + task[2] + task[3] + " = " + task[4] + (task[5] ? " +" + task[5] : "");
  const incomplete = line.match(new RegExp("^-?\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s+[@*]?" + quantity + "$", "i"));
  if (incomplete) return "- " + incomplete[1] + " @" + incomplete[2] + incomplete[3] + " = 1";
  const area = line.match(possibleArea);
  return area ? area[1] + " @" + area[2] + area[3] : "- [[Nota]] @1h = 2 +14:00";
}
function parseAreaRegister(source, areas) {
  const budgets = [], slots = [];
  let budget;
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || /^date:\s*\d{4}-\d\d-\d\d$/i.test(line) || /^<!-- tempvs-block:[\w-]+ -->$/.test(line)) continue;
    try {
      const heading = line.match(areaLine);
      if (heading && !line.includes("[[")) {
        const area2 = areas.find((a) => a.name.toLowerCase() === heading[1].trim().toLowerCase());
        if (!area2) throw Error("Area sconosciuta. Aree disponibili: " + areas.map((a) => a.name).join(", "));
        budget = { area: area2.name, areaId: area2.id, seconds: secondsOf(heading[2], heading[3]), assigned: 0 };
        budgets.push(budget);
        continue;
      }
      if (/^[^-].*?\s+\+\s*\d\d:\d\d\s*-/.test(line)) {
        const links = line.match(/\[\[[^\[\]]+\]\]/g) || [];
        const range = line.replace(/\[\[[^\[\]]+\]\]/g, "").trim();
        for (const slot of parseQuick(range, areas)) slots.push({ ...slot, linkedNotes: noteLinks(links.join(" ")) });
        continue;
      }
      const compact = line.match(compactTask);
      if (!compact && line.startsWith("-") && line.includes("]]") && !/\]\]\s+[@*]/.test(line)) {
        throw Error("Indica la durata con unit\xE0 e l\u2019area sulla stessa riga, per esempio - [[Nota]] 30m +11:45 @Studio.");
      }
      if (!compact && (line.match(/\[\[/g) || []).length > 1) throw Error("Nel vecchio formato usa un solo wikilink per riga.");
      const task = compact || line.match(taskLine);
      if (!task) throw Error("Sintassi da correggere. Prova: " + suggestion(line));
      const area = compact ? areas.find((a) => a.name.toLowerCase() === compact[6].trim().toLowerCase()) : budget;
      if (compact && !area) throw Error("Area sconosciuta: " + compact[6]);
      if (!area) throw Error("Indica l\u2019area sulla riga, per esempio - [[Nota]] 30m @Studio.");
      const [, link, value, unit, countText] = task, linkedNotes = noteLinks(link);
      if (!linkedNotes.length) throw Error("Indica una nota tra parentesi quadre doppie.");
      const seconds = secondsOf(value, unit), count = Number(countText ?? 1);
      if (count < 1 || count > seconds || count > 86400) throw Error("Indica almeno un pomodoro, con almeno un secondo ciascuno (massimo 86400).");
      if (!compact) budget.assigned += seconds;
      const start = task[5];
      let offset = 0;
      for (let i = 0; i < count; i++) {
        const duration2 = Math.floor(seconds / count) + Number(i < seconds % count);
        slots.push({ area: compact ? area.name : area.area, areaId: compact ? area.id : area.areaId, minutes: duration2 / 60, linkedNotes, start: start || null, offset });
        offset += duration2;
      }
    } catch (error) {
      throw Error("Riga " + (index + 1) + ": " + error.message);
    }
  }
  return { budgets, slots };
}

// obsidian/daily-register.js
var clock = "(?:[01]\\d|2[0-3]):[0-5]\\d";
var header = new RegExp("^(.+?)\\s+@(\\d+(?:[.,]\\d+)?)\\s*([hm])(?:\\s+(" + clock + "))?\\s*=\\s*(\\d+)$", "i");
var assignment = new RegExp("^-\\s*(?:(" + clock + ")\\s*)?(\\[\\[[^\\]\\n]+\\]\\])?$");
var isRegister = (source) => isAreaRegister(source) || /^\s*[^\n]+\s+@[\d.,]+\s*[hm]\b[^\n]*=\s*\d+\s*$/im.test(source || "");
var minutesOf = (time2) => Number(time2.slice(0, 2)) * 60 + Number(time2.slice(3));
function parseRegister(source, areas) {
  const groups = [];
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || /^date:\s*\d{4}-\d\d-\d\d$/i.test(line) || /^<!-- tempvs-block:[\w-]+ -->$/.test(line)) continue;
    const fail2 = (message) => {
      throw Error("Riga " + (index + 1) + ": " + message);
    };
    const match = line.match(header);
    if (match) {
      const [, name, value, unit, start, countText] = match;
      const area = areas.find((a) => a.name.toLowerCase() === name.trim().toLowerCase());
      if (!area) fail2("Area sconosciuta: " + name);
      const minutes = Math.round(Number(value.replace(",", ".")) * (unit.toLowerCase() === "h" ? 60 : 1) * 1e8) / 1e8, count = Number(countText);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || count < 1 || count > minutes) fail2("Controlla durata e numero di sessioni: occorre almeno un minuto per sessione, entro 24 ore.");
      groups.push({ area, minutes, count, start, items: [] });
      continue;
    }
    const item = line.match(assignment), group = groups.at(-1);
    if (!item || !group) fail2("Usa Area @2h 14:00 = 4 oppure - [[Nota]].");
    if (group.items.length >= group.count) fail2("Le righe superano il numero di sessioni dichiarate.");
    const links = noteLinks(item[2]);
    if (item[2] && !links.length) fail2("Wikilink non valido.");
    group.items.push({ time: item[1], links });
  }
  return groups.flatMap(({ area, minutes, count, start, items }) => {
    let cursor = start ? minutesOf(start) : null;
    return Array.from({ length: count }, (_, i) => {
      const duration2 = Math.floor(minutes / count) + Number(i < minutes % count), item = items[i];
      if (item?.time) cursor = minutesOf(item.time) + (cursor >= 1440 ? 1440 : 0);
      const time2 = cursor === null ? null : String(Math.floor(cursor / 60) % 24).padStart(2, "0") + ":" + String(cursor % 60).padStart(2, "0");
      const slot = { area: area.name, areaId: area.id, minutes: duration2, start: time2, dayOffset: cursor >= 1440 ? 1 : 0, linkedNotes: item?.links || [] };
      if (cursor !== null) cursor += duration2;
      return slot;
    });
  });
}
function registerPlan({ source, date, blockId, state, id, planningKey: planningKey2 }) {
  const areas = state.defaults.simple.areas;
  const { slots, budgets } = isAreaRegister(source) ? parseAreaRegister(source, areas) : { slots: parseRegister(source, areas), budgets: [] };
  const sessions = [], records = [], claimed = /* @__PURE__ */ new Set();
  const previous = state.history.filter((h) => h.registerBlock === blockId);
  for (const [index, slot] of slots.entries()) {
    const day = /* @__PURE__ */ new Date(date + "T12:00:00");
    day.setDate(day.getDate() + (slot.dayOffset || 0));
    const start = slot.start ? new Date(+dateTime(localDateString(day), slot.start) + (slot.offset || 0) * 1e3) : null;
    const clock2 = (t) => [t.getHours(), t.getMinutes()].map((n) => String(n).padStart(2, "0")).join(":");
    const dayText = localDateString(start || day), startTime = start && clock2(start);
    const exact = (s) => s.date === dayText && +sessionBounds(s).start === +start && s.areaId === slot.areaId && sessionBounds(s).end - sessionBounds(s).start === Math.round(slot.minutes * 6e4);
    const match = slot.start && state.sessions.find((s) => !s.manualSuperseded && !s.dailyRetired && !claimed.has(s.id) && (!s.noteBlockId || s.noteBlockId === blockId) && exact(s));
    const old = previous.find((h) => h.slotIndex === index);
    const sessionId = match?.id || (old && !claimed.has(old.sessionId) ? old.sessionId : id());
    claimed.add(sessionId);
    const record = {
      sessionId,
      registerBlock: blockId,
      noteBlockId: blockId,
      slotIndex: index,
      date: dayText,
      registerDay: date,
      title: slot.area,
      area: slot.area,
      areaId: slot.areaId,
      start: startTime && start.getSeconds() ? startTime + ":" + String(start.getSeconds()).padStart(2, "0") : startTime,
      minutes: slot.minutes,
      measured: true,
      linkedNotes: slot.linkedNotes
    };
    records.push(record);
    if (slot.start) {
      const end = new Date(+start + Math.round(slot.minutes * 6e4));
      const precise = { timerStartedAt: start.toISOString(), timerEndsAt: end.toISOString() };
      const cycle = Number.isInteger(slot.minutes) && slot.minutes < 1440 ? { cycleMinutes: slot.minutes, workMinutes: slot.minutes * 5 / 6 } : { workMinutes: 25 };
      sessions.push({
        id: sessionId,
        title: slot.area,
        area: slot.area,
        areaId: slot.areaId,
        date: dayText,
        start: startTime,
        end: clock2(end),
        ...precise,
        ...cycle,
        breakEnabled: true,
        noteBlockId: blockId,
        linkedNotes: slot.linkedNotes,
        registerMinutes: slot.minutes
      });
    }
  }
  const other = state.sessions.filter((s) => !claimed.has(s.id) && s.noteBlockId !== blockId && !s.dailyRetired && !s.manualSuperseded);
  if (hasSessionOverlaps(sessions) || sessions.some((s) => other.some((t) => sessionsOverlap(s, t)))) throw Error("Gli orari si sovrappongono. Correggi gli intervalli indicati.");
  const removeIds = state.sessions.filter((s) => s.noteBlockId === blockId && !sessions.some((t) => t.id === s.id)).map((s) => s.id);
  return { source, date, blockId, planningKey: planningKey2, sessions, records, budgets, removeIds, retainedIds: [], unusedMinutes: slots.reduce((sum, slot) => sum + (slot.unusedMinutes || 0), 0) };
}
function applyRegister(state, plan) {
  const replaced = /* @__PURE__ */ new Set([...plan.removeIds, ...plan.records.map((r) => r.sessionId)]);
  const existing = new Map(state.sessions.map((s) => [s.id, s]));
  state.sessions = state.sessions.filter((s) => !replaced.has(s.id)).concat(plan.sessions.map((s) => ({ ...s, actualSeconds: existing.get(s.id)?.actualSeconds || 0 })));
  const obsolete = state.history.filter((h) => (h.registerBlock === plan.blockId || replaced.has(h.sessionId)) && !plan.records.some((r) => r.sessionId === h.sessionId)).map((h) => h.sessionId);
  state.history = state.history.filter((h) => h.registerBlock !== plan.blockId && !replaced.has(h.sessionId)).concat(plan.records);
  for (const [key2, removed, live] of [["history", obsolete, plan.records.map((r) => r.sessionId)], ["sessions", plan.removeIds, plan.sessions.map((s) => s.id)]]) {
    state.syncDeleted[key2] = [.../* @__PURE__ */ new Set([...state.syncDeleted[key2] || [], ...removed])].filter((id) => !live.includes(id));
  }
}
function creditedWork(state, resolve, bindingPath, byArea) {
  const totals = /* @__PURE__ */ new Map(), records = new Map(state.history.map((h) => [h.sessionId, h]));
  for (const s of state.sessions) if (!records.get(s.id)?.registerBlock) records.set(s.id, s);
  const estimates = state.defaults.simple.noteEstimates || {};
  const add = (path, seconds, source, area) => {
    if (!path || !(seconds > 0)) return;
    const target = path.split("#")[0], key2 = resolve(target, source) || target.replace(/\.md$/i, "") + ".md";
    if (byArea && area) {
      if (!byArea.has(key2)) byArea.set(key2, /* @__PURE__ */ new Map());
      const rows = byArea.get(key2);
      rows.set(area, (rows.get(area) || 0) + seconds);
    }
    totals.set(key2, (totals.get(key2) || 0) + seconds);
  };
  for (const r of records.values()) {
    if (r.dailyRetired || r.manualSuperseded) continue;
    const source = bindingPath(r.noteBlockId) || "";
    const linked = r.linkedNotes?.[0]?.path || estimates[r.noteEstimateId]?.path;
    if (r.registerBlock || r.noteBlockId && r.start && r.end) {
      add(linked, r.registerBlock ? r.minutes * 60 : (sessionBounds(r).end - sessionBounds(r).start) / 1e3, source, r.area);
    } else {
      let allocated = 0;
      for (const [id, seconds] of Object.entries(r.noteWork || {})) {
        allocated += seconds;
        add(estimates[id]?.path, seconds, source, r.area);
      }
      add(linked, (r.actualSeconds ?? (r.measured ? r.minutes * 60 : 0)) - allocated, source, r.area);
    }
  }
  return totals;
}

// obsidian/daily-plan.js
var blockPattern = /^\s*<!-- tempvs-block:([^\s>]+) -->\s*$/;
var rowPattern = /\s*<!-- tempvs-session:([^\s>]+)(?: day:([01]))? -->\s*$/;
var datePattern = /^\s*date:\s*(\d{4}-\d{2}-\d{2})\s*$/i;
function validDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return false;
  const d = /* @__PURE__ */ new Date(day + "T12:00:00");
  return Number.isFinite(+d) && localDateString(d) === day;
}
function blockIdentity(source) {
  const ids = source.split(/\r?\n/).map((line) => line.match(blockPattern)?.[1]).filter(Boolean);
  if (ids.length > 1) throw Error("Il blocco contiene pi\xF9 identificativi TEMPVS.");
  if (ids[0] && !/^[A-Za-z0-9-]{1,100}$/.test(ids[0])) throw Error("Identificativo del blocco TEMPVS non valido.");
  return ids[0] || null;
}
function explicitDay(source) {
  const dates = source.split(/\r?\n/).map((line) => line.match(datePattern)?.[1]).filter(Boolean);
  if (dates.length > 1) throw Error("Indica una sola data nel blocco TEMPVS.");
  if (dates[0] && !validDay(dates[0])) throw Error("Data TEMPVS non valida.");
  return dates[0] || null;
}
function resolveDailyDate(source, file, { format = "YYYY-MM-DD", moment: moment2, frontmatter } = {}) {
  const explicit = explicitDay(source);
  if (explicit) return explicit;
  if (validDay(file.basename)) return file.basename;
  const raw = frontmatter?.date;
  if (typeof raw === "string" && validDay(raw.slice(0, 10))) return raw.slice(0, 10);
  if (raw instanceof Date && Number.isFinite(+raw)) return localDateString(raw);
  if (moment2) {
    const parsed = moment2(file.basename, format, true);
    if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
  }
  throw Error("Data della daily note non riconosciuta. Aggiungi \xABdate: YYYY-MM-DD\xBB al blocco TEMPVS.");
}
function findDailyBlocks(markdown2, includeUnclosed = false) {
  const lines = markdown2.match(/[^\n]*\n|[^\n]+$/g) || [];
  let fence = null, offset = 0;
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r?\n$/, "");
    if (!fence) {
      const match = line.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/);
      if (match) {
        fence = { char: match[1][0], length: match[1].length, start: offset + lines[i].length, line: i, isTempvs: /^(tempvs|tempus)$/i.test(match[2].trim()) };
      }
    } else if (new RegExp("^ {0,3}" + fence.char + "{" + fence.length + ",}\\s*$").test(line)) {
      if (fence.isTempvs) blocks.push({ start: fence.start, end: offset, lineStart: fence.line, source: markdown2.slice(fence.start, offset).replace(/\r?\n$/, "") });
      fence = null;
    }
    offset += lines[i].length;
  }
  if (includeUnclosed && fence?.isTempvs) blocks.push({ start: fence.start, end: markdown2.length, lineStart: fence.line, source: markdown2.slice(fence.start) });
  return blocks;
}
function replaceDailyBlock(markdown2, block, source) {
  const newline = markdown2.includes("\r\n") ? "\r\n" : "\n";
  return markdown2.slice(0, block.start) + source.replace(/\r?\n/g, newline) + newline + markdown2.slice(block.end);
}
function parseDailySource(source, areas) {
  blockIdentity(source);
  explicitDay(source);
  const requests = [];
  const used = /* @__PURE__ */ new Set();
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (!line.trim() || blockPattern.test(line) || datePattern.test(line)) continue;
    try {
      const metadata = line.match(rowPattern), raw = metadata ? line.slice(0, metadata.index) : line;
      const linkedNotes = noteLinks(raw.match(/\[\[[^\]\n]+\]\]/g)?.join(" ") || "");
      const planning = raw.replace(/\[\[[^\]\n]+\]\]/g, "").trim();
      if (/\[\[|\]\]/.test(planning)) throw Error("Collegamento nota non valido: usa [[nota|titolo]].");
      const nextDay = /\s+\+1d\s*$/i.test(planning), input = planning.replace(/\s+\+1d\s*$/i, "");
      const rows = parseQuick(input, areas);
      const id = metadata ? decodeURIComponent(metadata[1]) : null;
      if (id && (used.has(id) || rows.length !== 1)) throw Error("Ogni identificativo deve riferirsi a una sola sessione, senza duplicati.");
      if (id) used.add(id);
      for (const row2 of rows) {
        if (!row2.start) throw Error("Indica una fascia +HH:MM-HH:MM oppure un inizio +HH:MM.");
        const dayOffset = (row2.dayOffset || 0) + Number(nextDay ? 1 : metadata?.[2] || 0);
        if (dayOffset > 1) throw Error("La sessione deve iniziare nella giornata della nota o in quella successiva.");
        requests.push({ ...row2, linkedNotes, sourceRow: index, ...id ? { sessionId: id } : {}, ...dayOffset ? { dayOffset } : {} });
      }
    } catch (error) {
      throw Error("Riga " + (index + 1) + ": " + error.message.replace(/^Riga 1: /, ""));
    }
  }
  return requests;
}
var dayAfter = (day) => {
  const d = /* @__PURE__ */ new Date(day + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return localDateString(d);
};
var planningKey = (session) => JSON.stringify([session.id, session.areaId, session.area, session.title, session.date, session.start, session.end, session.workMinutes, session.breakEnabled, session.customBreakMinutes, session.cycleMinutes, session.noteBlockId, session.linkedNotes, Boolean(session.finished), session.timerStartedAt, session.timerEndsAt, session.manualRecordedAt, Boolean(session.manualSuperseded), Boolean(session.dailyRetired)]);
var archivePlanningKey = (state) => JSON.stringify({ sessions: state.sessions.map(planningKey), defaults: state.defaults });
var isLocked = (session, now = /* @__PURE__ */ new Date()) => session.finished || session.actualSeconds > 0 || session.timerStartedAt || sessionBounds(session).start <= now;
function daySessions(state, date, blockId) {
  return state.sessions.filter((s) => !s.manualSuperseded && !s.dailyRetired && (s.date === date || blockId && s.noteBlockId === blockId)).sort((a, b) => sessionBounds(a).start - sessionBounds(b).start);
}
function serializeDailyPlan(sessions, date) {
  const groups = [];
  for (const s of [...sessions].sort((a, b) => sessionBounds(a).start - sessionBounds(b).start)) {
    if (s.date !== date && s.date !== dayAfter(date)) throw Error("Una sessione collegata \xE8 stata spostata fuori dalla giornata della nota.");
    const bounds = sessionBounds(s), gross = Math.round((bounds.end - bounds.start) / 6e4);
    const key2 = JSON.stringify([s.areaId, s.area || s.title, gross, s.workMinutes, s.breakEnabled, s.customBreakMinutes, s.cycleMinutes, s.linkedNotes || []]);
    const last = groups.at(-1);
    if (last && last.key === key2 && +last.until === +bounds.start && s.date === last.date && +bounds.end - last.from < 864e5) {
      last.end = s.end;
      last.until = bounds.end;
    } else groups.push({ key: key2, linkedNotes: s.linkedNotes || [], date: s.date, area: s.area || s.title, start: s.start, end: s.end, gross, from: +bounds.start, until: bounds.end });
  }
  return groups.map((g) => (g.gross === 1440 ? `${g.area} @1440m +${g.start}` : `${g.area} +${g.start}-${g.end} -${g.gross}m`) + g.linkedNotes.map((n) => " [[" + n.path + (n.label && n.label !== n.path ? "|" + n.label : "") + "]]").join("") + (g.date !== date ? " +1d" : "")).join("\n");
}
function rowChanges(source, previousSource, areas, owned, date) {
  if (previousSource === void 0) return { byRequest: /* @__PURE__ */ new Map(), changedRows: /* @__PURE__ */ new Set(), previousByRow: /* @__PURE__ */ new Map(), addedRows: /* @__PURE__ */ new Set() };
  const previous = parseDailySource(previousSource, areas), next = parseDailySource(source, areas);
  const group = (_text, requests) => [...new Set(requests.map((r) => r.sourceRow))].map((row2) => {
    const items = requests.filter((r) => r.sourceRow === row2);
    return { row: row2, text: JSON.stringify(items.map((r) => [r.areaId || r.area, r.minutes, r.start, r.dayOffset || 0, r.cycleMinutes ?? null, r.focusMinutes ?? null, r.customBreakMinutes ?? null])), requests: items };
  });
  const before = group(previousSource, previous), after = group(source, next), matched = /* @__PURE__ */ new Set(), remaining = [];
  for (const current of after) {
    const index = before.findIndex((old2, i) => !matched.has(i) && old2.text === current.text);
    if (index >= 0) matched.add(index);
    else remaining.push(current);
  }
  const old = before.filter((_, i) => !matched.has(i)), byRequest = /* @__PURE__ */ new Map(), changedRows = /* @__PURE__ */ new Set(), previousByRow = /* @__PURE__ */ new Map(), addedRows = new Set(remaining.map((r) => r.row));
  for (let i = 0; i < Math.min(old.length, remaining.length); i++) {
    changedRows.add(remaining[i].row);
    const ids = old[i].requests.map((r) => owned.find((s) => !s.manualSuperseded && !s.dailyRetired && s.date === (r.dayOffset ? dayAfter(date) : date) && s.start === r.start && (s.areaId ? s.areaId === r.areaId : s.area === r.area) && Math.round((sessionBounds(s).end - sessionBounds(s).start) / 6e4) === r.minutes)?.id);
    previousByRow.set(remaining[i].row, ids.filter(Boolean));
    remaining[i].requests.forEach((r, index) => {
      if (ids[index]) byRequest.set(r, ids[index]);
    });
  }
  const indexed = /* @__PURE__ */ new Map();
  for (const [request, id] of byRequest) indexed.set(request.sourceRow + ":" + next.filter((r) => r.sourceRow === request.sourceRow).indexOf(request), id);
  return { byRequest: indexed, changedRows, previousByRow, addedRows };
}
function recordedFocusSeconds(session, until = /* @__PURE__ */ new Date()) {
  const bounds = sessionBounds(session);
  let at = +bounds.start, total = 0, end = Math.min(+bounds.end, +until);
  while (at < end) {
    const phase = getPhase(session, new Date(at)), next = Math.min(end, +phase.end);
    if (next <= at) break;
    if (phase.kind === "work") total += (next - at) / 1e3;
    at = next;
  }
  return total;
}
function manualRecord(session, now) {
  const result = { ...session, actualSeconds: recordedFocusSeconds(session, now), actualSource: "manual", manualRecordedAt: now.toISOString() };
  result.finished = sessionBounds(session).end <= now;
  return result;
}
function originalRecord(session) {
  if (session.manualOriginal) return session.manualOriginal;
  const { manualOriginal, ...original } = session;
  return JSON.parse(JSON.stringify(original));
}
function correctNoteWork(previous, seconds) {
  const work = previous?.noteWork || {}, total = Object.values(work).reduce((n, s) => n + s, 0);
  if (total > 0) {
    const baseline = Math.max(previous.actualSeconds || 0, total);
    return Object.fromEntries(Object.entries(work).map(([id, s]) => [id, s * seconds / baseline]));
  }
  return previous?.noteEstimateId ? { [previous.noteEstimateId]: seconds } : {};
}
function prepareDailyPlan({ source, date, blockId, state, previousSource, protectedBlockIds, now = /* @__PURE__ */ new Date(), id = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) }) {
  if (!validDay(date)) throw Error("Data non valida.");
  const register = isRegister(source) || !source.split(/\r?\n/).some((line) => line.trim() && !datePattern.test(line) && !blockPattern.test(line)) && isRegister(previousSource);
  if (register) {
    blockIdentity(source);
    explicitDay(source);
    return { ...registerPlan({ source, date, blockId, state, id, planningKey: archivePlanningKey(state) }), previousSource, protectedBlockIds };
  }
  const areas = state.defaults.simple.areas, requests = parseDailySource(source, areas), owned = state.sessions.filter((s) => s.noteBlockId === blockId);
  const protectedBlocks = protectedBlockIds === void 0 ? null : new Set(protectedBlockIds);
  const foreign = (s) => s.noteBlockId && s.noteBlockId !== blockId && (protectedBlocks === null || protectedBlocks.has(s.noteBlockId));
  const changes = rowChanges(source, isRegister(previousSource) ? void 0 : previousSource, areas, owned, date), positions = /* @__PURE__ */ new Map();
  const candidates = [], claimed = /* @__PURE__ */ new Set(), correctionIds = [], correctedRows = /* @__PURE__ */ new Set();
  for (const request of requests) {
    const dateOf = request.dayOffset ? dayAfter(date) : date, start = dateTime(dateOf, request.start), elapsed = start <= now;
    const position = positions.get(request.sourceRow) || 0;
    positions.set(request.sourceRow, position + 1);
    let existing = request.sessionId ? state.sessions.find((s) => s.id === request.sessionId) : null;
    if (request.sessionId && !existing) {
      if (state.syncDeleted?.sessions?.includes(request.sessionId)) throw Error("La nota contiene una sessione eliminata dal plugin. Aggiorna prima il blocco dalle sessioni.");
      throw Error("Identificativo sessione non presente nel plugin. Rimuovi il commento identificativo per creare una nuova sessione.");
    }
    const exact = (s) => s.date === dateOf && s.start === request.start && (s.areaId ? s.areaId === request.areaId : s.area === request.area) && Math.round((sessionBounds(s).end - sessionBounds(s).start) / 6e4) === request.minutes;
    if (!existing && elapsed) {
      const matched = changes.byRequest.get(request.sourceRow + ":" + position);
      existing = owned.find((s) => s.id === matched && !claimed.has(s.id));
    }
    if (!existing) existing = state.sessions.find((s) => !claimed.has(s.id) && !s.manualSuperseded && !s.dailyRetired && !foreign(s) && exact(s));
    if (existing && foreign(existing)) throw Error("Una sessione appartiene gi\xE0 a un altro blocco TEMPVS.");
    if (existing && claimed.has(existing.id)) throw Error("La stessa sessione compare due volte nel blocco.");
    const legacy = existing?.linkedNotes === void 0 && state.defaults.simple.noteEstimates?.[existing?.noteEstimateId];
    if (legacy && !request.linkedNotes.length) request.linkedNotes = [{ path: legacy.path, label: legacy.title }];
    const samePause = existing && (!request.cycleMinutes || request.rangeSession || request.cycleMinutes === existing.cycleMinutes) && (request.focusMinutes === void 0 || request.focusMinutes === existing.workMinutes) && (request.customBreakMinutes === void 0 || request.customBreakMinutes === existing.customBreakMinutes);
    const correction = elapsed && (!existing || !exact(existing) || !samePause || changes.changedRows.has(request.sourceRow) || changes.addedRows.has(request.sourceRow));
    if (existing && isLocked(existing, now) && !correction && exact(existing) && samePause) {
      candidates.push({ ...existing, noteBlockId: blockId, linkedNotes: request.linkedNotes, noteEstimateId: void 0 });
      claimed.add(existing.id);
      continue;
    }
    const result = planSessions([request], [], [], state.defaults, new Date(Math.min(+now, +start)), () => existing?.id || id(), date);
    let session = result.sessions[0];
    if (existing) {
      session = { ...existing, ...session };
      if (request.cycleMinutes !== void 0) delete session.customBreakMinutes;
      if (request.focusMinutes !== void 0 || request.customBreakMinutes !== void 0) delete session.cycleMinutes;
      if (request.cycleMinutes === void 0 && request.focusMinutes === void 0 && request.customBreakMinutes === void 0) {
        for (const key2 of ["workMinutes", "breakEnabled", "cycleMinutes", "customBreakMinutes"]) if (existing[key2] !== void 0) session[key2] = existing[key2];
      }
      if (!exact(existing) || correction) {
        delete session.timerStartedAt;
        delete session.timerEndsAt;
      }
    }
    delete session.dailyRetired;
    session.noteBlockId = blockId;
    session.linkedNotes = request.linkedNotes;
    delete session.noteEstimateId;
    if (correction) {
      delete session.manualSuperseded;
      session = manualRecord(session, now);
      if (existing) session.manualOriginal = originalRecord(existing);
      correctionIds.push(session.id);
      correctedRows.add(request.sourceRow);
    }
    candidates.push(session);
    claimed.add(session.id);
  }
  if (hasSessionOverlaps(candidates)) throw Error("Le righe della nota si sovrappongono tra loro.");
  const intersects = (s) => candidates.some((c) => sessionsOverlap(s, c));
  const omitted = state.sessions.filter((s) => !claimed.has(s.id) && !foreign(s) && (s.noteBlockId === blockId || s.date === date || intersects(s)));
  const previousCorrected = new Set([...correctedRows].flatMap((row2) => changes.previousByRow.get(row2) || []));
  const superseded = omitted.filter((s) => isLocked(s, now) && (previousCorrected.has(s.id) || intersects(s) || s.manualSuperseded) && (!s.dailyRetired && !s.manualSuperseded || s.actualSeconds > 0 || Object.values(s.noteWork || {}).some((n) => n > 0)));
  const retainedIds = omitted.filter((s) => isLocked(s, now)).map((s) => s.id);
  const retireIds = omitted.filter((s) => (!s.dailyRetired || !s.finished || s.paused) && isLocked(s, now)).map((s) => s.id);
  const removed = omitted.filter((s) => !isLocked(s, now));
  const reconciled = new Set(omitted.map((s) => s.id));
  const other = state.sessions.filter((s) => !claimed.has(s.id) && !removed.some((r) => r.id === s.id) && !superseded.some((r) => r.id === s.id));
  const conflict = state.sessions.find((s) => !claimed.has(s.id) && !reconciled.has(s.id) && !s.dailyRetired && !s.manualSuperseded && intersects(s));
  if (conflict) throw Error("Un intervallo appartiene a un\u2019altra nota giornaliera collegata. Correggi anche quella nota.");
  normalizeArchive({ ...state, sessions: [...other, ...candidates] });
  return { date, blockId, sessions: candidates, correctionIds, supersededIds: superseded.map((s) => s.id), retainedIds, retireIds, removeIds: removed.map((s) => s.id), unusedMinutes: requests.reduce((n, r) => n + (r.unusedMinutes || 0), 0), planningKey: archivePlanningKey(state), recordedAt: now.toISOString(), source, previousSource, protectedBlockIds };
}
function applyDailyPlan(state, proposal) {
  if (proposal.records) {
    applyRegister(state, proposal);
    return;
  }
  const oldRecords = state.history.filter((h) => h.registerBlock === proposal.blockId);
  if (oldRecords.length) {
    state.history = state.history.filter((h) => h.registerBlock !== proposal.blockId);
    state.syncDeleted.history = [.../* @__PURE__ */ new Set([...state.syncDeleted.history || [], ...oldRecords.map((h) => h.sessionId)])];
  }
  const corrected = new Set(proposal.correctionIds || []), affected = /* @__PURE__ */ new Set([...proposal.sessions.map((s) => s.id), ...proposal.removeIds]), current = new Map(state.sessions.map((s) => [s.id, s]));
  state.sessions = state.sessions.filter((s) => !affected.has(s.id)).concat(proposal.sessions.map((s) => {
    const previous = current.get(s.id);
    if (corrected.has(s.id)) return { ...s, noteWork: correctNoteWork(previous || s, s.actualSeconds), ...previous ? { manualOriginal: originalRecord(previous), paused: previous.paused } : {} };
    return { ...s, ...previous ? { actualSeconds: previous.actualSeconds || 0, ...previous.noteWork ? { noteWork: previous.noteWork } : {}, paused: previous.paused } : {} };
  }));
  for (const session of state.sessions) if (proposal.retireIds?.includes(session.id)) {
    const { dailyOriginal, ...snapshot } = session;
    session.dailyOriginal = dailyOriginal || JSON.parse(JSON.stringify(snapshot));
    session.dailyRetired = true;
    session.finished = true;
    session.paused = false;
  }
  for (const session of state.sessions) if (proposal.supersededIds?.includes(session.id)) Object.assign(session, { manualOriginal: originalRecord(session), actualSeconds: 0, noteWork: {}, finished: true, manualSuperseded: true, manualRecordedAt: proposal.recordedAt, actualSource: "manual" });
  const historical = new Map(state.sessions.filter((s) => corrected.has(s.id) || proposal.supersededIds?.includes(s.id)).map((s) => [s.id, s]));
  state.history = state.history.map((h) => {
    const s = historical.get(h.sessionId);
    return s ? { ...h, title: s.title, date: s.date, area: s.area, areaId: s.areaId, minutes: s.actualSeconds / 60, measured: true, actualSource: "manual", noteWork: s.noteWork } : h;
  });
  state.syncDeleted.sessions = [.../* @__PURE__ */ new Set([...state.syncDeleted.sessions, ...proposal.removeIds])];
}

// obsidian/syntax.js
var tokens = /^\s*T:|(?<=\s)@[^\d\s][^\n]*$|<!--.*?(?:-->|$)|\[\[[^\]]*(?:\]\]|$)|^\s*date:(?=\s|$)|\b\d{4}-\d{2}-\d{2}\b|\+?\d{2}:\d{2}(?:-\d{2}:\d{2})?|=\s*\d+|\b\d+(?:[.,]\d+)?[hms]\b|[@~-]\d+(?:[.,]\d+)?[hms]?|^\s*-(?=\s|$)/gi;
function syntaxTokens(line) {
  const parts = [];
  const add = (from, to, kind) => {
    if (to > from) parts.push({ from, to, kind });
  };
  const heading = line.match(/^(\s*)(@?[^@+\-=\s\d][^@+\[\]=]*?)(?=\s+(?:[@+]|\d))/);
  let offset = 0;
  if (heading && !/^\s*(?:date|T):/i.test(line)) {
    offset = heading[0].length;
    add(heading[1].length, offset, "area");
  }
  for (const match of line.slice(offset).matchAll(tokens)) {
    const value = match[0], from = offset + match.index, end = from + value.length;
    if (value.startsWith("[[")) {
      const closed = value.endsWith("]]"), targetEnd = closed ? end - 2 : end;
      const alias = value.indexOf("|"), anchor = value.indexOf("#");
      const separator = alias < 0 ? targetEnd : from + alias;
      const section = anchor >= 0 && from + anchor < separator ? from + anchor : separator;
      add(from, from + 2, "punctuation");
      add(from + 2, section, "link");
      add(section, separator, "section");
      if (alias >= 0) {
        add(separator, separator + 1, "punctuation");
        add(separator + 1, targetEnd, "alias");
      }
      add(targetEnd, end, "punctuation");
    } else {
      let kind = "duration";
      if (/^@[^\d]/.test(value)) kind = "area";
      else if (value.trim().toUpperCase() === "T:") kind = "keyword";
      else if (value.startsWith("<!--")) kind = "comment";
      else if (value.includes(":")) kind = /date:/i.test(value) ? "keyword" : "time";
      else if (/^\d{4}-/.test(value)) kind = "date";
      else if (value.startsWith("=")) kind = "count";
      else if (value.trim() === "-") kind = "punctuation";
      add(from, end, kind);
    }
  }
  return parts;
}
function renderSyntaxLine(parent, line, areas) {
  let cursor = 0;
  for (const { from, to, kind } of syntaxTokens(line)) {
    parent.append(line.slice(cursor, from));
    const value = line.slice(from, to);
    const span = parent.createSpan({ text: value, cls: "tempvs-syntax-" + kind });
    if (kind === "area") {
      const area = areas.find((a) => a.name.toLowerCase() === value.replace(/^@/, "").toLowerCase());
      if (area) {
        span.addClass("tempvs-area-mark");
        span.style.setProperty("--tempvs-area-color", area.color);
      }
    }
    cursor = to;
  }
  parent.append(line.slice(cursor));
}

// obsidian/syntax-editor.js
function syntaxExtension() {
  const { Decoration, ViewPlugin } = require("@codemirror/view");
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.rebuild(view, true);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) this.rebuild(update.view, update.docChanged);
    }
    rebuild(view, documentChanged) {
      const doc = view.state.doc;
      if (documentChanged) this.blocks = findDailyBlocks(doc.toString(), true);
      const marks = [];
      for (const block of this.blocks) {
        for (const visible of view.visibleRanges) {
          const from = Math.max(block.start, visible.from), to = Math.min(block.end, visible.to);
          if (from >= to) continue;
          const first = doc.lineAt(from).number, last = doc.lineAt(to - 1).number;
          for (let n = first; n <= last; n++) {
            const line = doc.line(n);
            for (const token of syntaxTokens(line.text)) {
              const start = Math.max(from, line.from + token.from), end = Math.min(to, line.from + token.to);
              if (start < end) marks.push(Decoration.mark({ class: "tempvs-syntax-" + token.kind }).range(start, end));
            }
          }
        }
      }
      this.decorations = Decoration.set(marks, true);
    }
  }, { decorations: (instance) => instance.decorations });
}

// obsidian/note-picker.js
var import_obsidian = require("obsidian");
var fold = (text) => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
var safeLabel = (text) => String(text).replace(/[\r\n|\[\]]/g, " ").trim();
var SessionNotePicker = class extends import_obsidian.Modal {
  constructor(app, save) {
    super(app);
    this.save = save;
    this.activeFile = app.workspace.getActiveFile?.() || app.workspace.getMostRecentLeaf?.()?.view?.file;
  }
  onOpen() {
    this.contentEl.addClass("tempvs-picker");
    this.files = (this.app.vault?.getMarkdownFiles?.() || []).map((file) => {
      const meta = this.app.metadataCache?.getFileCache(file)?.frontmatter || {};
      const title = String(meta.title || file.basename);
      const aliases = [].concat(meta.aliases || meta.alias || []);
      return { file, title, search: fold([title, file.path, ...aliases].join(" ")) };
    });
    this.searchFiles();
  }
  choice(parent, title, action2, subtitle) {
    const button2 = parent.createEl("button", { attr: { type: "button" } });
    button2.createSpan({ text: title });
    if (subtitle) button2.createEl("small", { text: subtitle });
    button2.onclick = action2;
    return button2;
  }
  searchFiles() {
    const el = this.contentEl;
    el.empty();
    el.createEl("h3", { text: "Collega nota" });
    const input = el.createEl("input", { attr: { type: "search", "aria-label": "Cerca nota", placeholder: "Titolo, alias, nome file o [[wikilink]]" } });
    const results = el.createDiv({ cls: "tempvs-picker-results" });
    const render = () => {
      results.empty();
      const query = input.value.trim();
      if (query.startsWith("[[")) {
        this.choice(results, "Collega wikilink", () => this.commit(query), query);
        return;
      }
      const words = fold(query).split(/\s+/);
      const active = this.files.find((entry) => entry.file.path === this.activeFile?.path);
      if (!query && active) this.choice(results, "Usa la nota aperta", () => this.selectFile(active), active.title);
      const matches = this.files.filter((entry) => words.every((word) => entry.search.includes(word)));
      for (const entry of matches.slice(0, 50)) this.choice(results, entry.title, () => this.selectFile(entry), entry.file.path);
      if (!matches.length) results.createEl("p", { text: "Nessuna nota trovata." });
      if (matches.length > 50) results.createEl("small", { text: "Affina la ricerca per vedere altri risultati." });
    };
    input.oninput = render;
    input.onkeydown = (event) => {
      if (event.key === "Enter") results.querySelector("button")?.click();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        results.querySelector("button")?.focus();
      }
    };
    render();
    input.focus();
  }
  selectFile({ file, title }) {
    const path = file.path.replace(/\.md$/i, "");
    const link = (target, label) => this.commit("[[" + target + "|" + safeLabel(label) + "]]");
    const headings = this.app.metadataCache?.getFileCache(file)?.headings || [];
    if (!headings.length) return link(path, title);
    const el = this.contentEl;
    el.empty();
    el.createEl("h3", { text: title });
    this.choice(el, "Collega nota intera", () => link(path, title)).focus();
    const results = el.createDiv({ cls: "tempvs-picker-results" });
    for (const { heading, level } of headings) {
      this.choice(results, heading, () => link(path + "#" + heading, heading), "H" + level);
    }
    this.choice(el, "Torna alla ricerca", () => this.searchFiles());
  }
  async commit(value) {
    if (this.saving) return;
    this.saving = true;
    try {
      await this.save(value);
      this.close();
    } catch (error) {
      new import_obsidian.Notice(error.message);
    } finally {
      this.saving = false;
    }
  }
  onClose() {
    this.contentEl.empty();
    this.files = [];
  }
};

// obsidian/session-notes.js
function sessionNotes(session, estimates = []) {
  if (session.linkedNotes?.length) return session.linkedNotes;
  const legacy = estimates.find((n) => n.id === session.noteEstimateId);
  return legacy ? [{ path: legacy.path, label: legacy.title }] : [];
}
function updatedSessionNotes(session, input, { removePath, primaryPath, replacePrimary = false, estimates = [] } = {}) {
  const previous = sessionNotes(session, estimates);
  if (removePath !== void 0) return previous.filter((n) => n.path !== removePath);
  if (primaryPath !== void 0) {
    const primary = previous.find((note) => note.path === primaryPath);
    return primary ? [primary, ...previous.filter((note) => note !== primary)] : previous;
  }
  const text = input.trim();
  if (!text) return replacePrimary ? previous.slice(1) : previous;
  const links = noteLinks(text.startsWith("[[") ? text : "[[" + text + "]]");
  if (links.length !== 1 || /[\r\n]/.test(text) || text.startsWith("[[") && !/^\[\[[^\]\n]+\]\]$/.test(text)) throw Error("Scegli una sola nota: [[nota|titolo]].");
  if (replacePrimary) return [links[0], ...previous.slice(1).filter((note) => note.path !== links[0].path)];
  return previous.some((note) => note.path === links[0].path) ? previous : [...previous, links[0]];
}
function groupSessions(sessions, estimates = []) {
  const groups = [];
  for (const session of sessions) {
    const notes = sessionNotes(session, estimates);
    const key2 = JSON.stringify([session.areaId || session.area || session.title, session.noteBlockId || "", session.date, notes]);
    const last = groups.at(-1);
    if (last && last.key === key2 && +sessionBounds(last.sessions.at(-1)).end === +sessionBounds(session).start) last.sessions.push(session);
    else groups.push({ key: key2, notes, sessions: [session] });
  }
  return groups;
}

// obsidian/note-estimates.js
var import_obsidian2 = require("obsidian");
var uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
var action = (el, label, fn) => {
  const b = el.createEl("button", { text: label });
  b.onclick = () => Promise.resolve().then(fn).catch((e) => new import_obsidian2.Notice(e.message));
  return b;
};
var NoteEstimates = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.preferences = /* @__PURE__ */ new Map();
  }
  get notes() {
    return estimatesOf(this.plugin.state);
  }
  get vault() {
    return this.plugin.app.vault?.getName?.() || "";
  }
  find(path) {
    return this.notes.find((n) => n.path === path && n.vault === this.vault);
  }
  async sync(context) {
    const { file, block } = context, entries = parseEstimate(block.source, this.plugin.config.areas), old = this.find(file.path);
    if (old && !old.archived && JSON.stringify(old.entries) === JSON.stringify(entries)) return;
    await this.plugin.change(() => {
      var _a;
      const notes = (_a = this.plugin.config).noteEstimates ?? (_a.noteEstimates = {});
      const preferred = "note:" + encodeURIComponent(this.vault) + "/" + encodeURIComponent(file.path);
      const id = old?.id || (notes[preferred] ? preferred + "/" + uid() : preferred);
      notes[id] = { ...old, id, vault: this.vault, path: file.path, title: file.basename, entries, archived: false, completed: old?.completed || false };
    });
  }
  async archive(path) {
    const note = this.find(path);
    if (!note || note.archived) return;
    await this.plugin.change(() => {
      this.plugin.config.noteEstimates[note.id].archived = true;
    });
  }
  available(session) {
    return this.notes.filter((n) => !n.archived && !n.completed && n.entries.some((e) => matchesArea(e, session)));
  }
  async assign(sessionId, noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    await this.plugin.setSessionNote([sessionId], note ? "[[" + note.path + "|" + note.title + "]]" : "", { replacePrimary: true });
  }
  async assignDay(note, day) {
    const sessions = this.plugin.state.sessions.filter((s) => s.date === day && !s.linkedNotes?.length && !s.noteEstimateId && !s.finished && sessionBounds(s).start > /* @__PURE__ */ new Date() && note.entries.some((e) => matchesArea(e, s)));
    for (const s of sessions) await this.assign(s.id, note.id);
    new import_obsidian2.Notice(sessions.length ? `${sessions.length} sessioni collegate a ${note.title}.` : "Nessuna sessione futura libera.");
  }
  async start(note, entry) {
    if (entry.kind === "total") throw Error("La stima @14h non imposta un\u2019area: avvia una sessione dall\u2019agenda e collega la nota.");
    const plugin = this.plugin, now = /* @__PURE__ */ new Date(), end = manualSessionEnd(now, entry.minutes), cycle = grossCycle(entry.minutes);
    const session = { id: uid(), title: entry.area, area: entry.area, areaId: entry.areaId, date: localDateString(now), start: formatTime(now), end: formatTime(end), timerStartedAt: now.toISOString(), timerEndsAt: end.toISOString(), workMinutes: cycle.focusMinutes, cycleMinutes: entry.minutes, breakEnabled: true, actualSeconds: 0, linkedNotes: [{ path: note.path, label: note.title }] };
    if (plugin.state.sessions.some((s) => !s.finished && sessionBounds(s).start < end && sessionBounds(s).end > now)) throw Error("Questo intervallo \xE8 gi\xE0 occupato. Assegna la nota alla sessione in agenda.");
    await plugin.change(() => plugin.state.sessions.push(session));
  }
  totals() {
    const cache = this.plugin.app.metadataCache;
    return creditedWork(this.plugin.state, (p, source) => cache?.getFirstLinkpathDest?.(p, source)?.path, (id) => this.plugin.dailyNotes?.[id]?.path);
  }
  progress(note, totals) {
    const { estimated } = estimateProgress(note, this.plugin.state), done = totals.get(note.path) || 0;
    return { estimated, done, remaining: Math.max(0, estimated - done), difference: done - estimated, percent: 100 * done / estimated };
  }
  render(parent, note, day = localDateString(), panel = false, totals = this.totals()) {
    const p = this.progress(note, totals), box = parent.createDiv({ cls: "tempvs-estimate" });
    if (panel) action(box, note.title, () => this.plugin.app.workspace.openLinkText(note.path, "", false));
    const names = [...new Set(note.entries.map((entry) => entry.area).filter(Boolean))];
    box.createEl("p", { text: (names.join(" / ") || "Tutte le aree") + " \xB7 Tempo registrato " + estimateTime(p.done) + " su " + estimateTime(p.estimated) });
    box.createEl("strong", { text: estimateResult(note, p) });
    const actions = box.createDiv({ cls: "tempvs-estimate-actions" });
    const choices = this.preferences.get(note.id) || {};
    const areas = this.plugin.config.areas.filter((area2) => note.entries.some((entry) => matchesArea(entry, { area: area2.name, areaId: area2.id })));
    const area = areas.find((a) => a.id === choices.areaId) || areas[0];
    if (!note.completed && area) {
      action(actions, "Avvia " + area.name, () => {
        const selected = areas.find((a) => a.id === choices.areaId) || area;
        return this.start(note, { area: selected.name, areaId: selected.id, minutes: choices.minutes || 30 });
      });
    }
    const menu = actions.createEl("details", { cls: "tempvs-estimate-menu" });
    menu.createEl("summary", { text: "\u22EF", attr: { "aria-label": "Azioni studio" } });
    if (!note.completed) {
      if (areas.length > 1) {
        const select = menu.createEl("select", { attr: { "aria-label": "Area di avvio" } });
        for (const a of areas) select.createEl("option", { text: a.name, attr: { value: a.id } });
        select.value = area.id;
        select.onchange = () => {
          choices.areaId = select.value;
          this.preferences.set(note.id, choices);
          this.plugin.refresh(true);
        };
      }
      const label = menu.createEl("label", { text: "Durata sessione " });
      const input = label.createEl("input", { attr: { type: "number", min: 1, max: 1439, value: choices.minutes || 30 } });
      input.onchange = () => {
        const minutes = input.valueAsNumber;
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1439) {
          input.value = String(choices.minutes || 30);
          new import_obsidian2.Notice("Scegli da 1 a 1439 minuti.");
          return;
        }
        choices.minutes = minutes;
        this.preferences.set(note.id, choices);
      };
      action(menu, "Collega alle sessioni libere del giorno", () => this.assignDay(note, day));
    }
    action(menu, note.completed ? "Riapri attivit\xE0" : "Segna completata", () => this.plugin.change(() => {
      setEstimateCompleted(this.plugin.config.noteEstimates[note.id], this.plugin.state, !note.completed);
    }));
    return box;
  }
  renderPanel(parent, day) {
    const open = new Set([...parent.querySelectorAll(".tempvs-estimate-details[open]")].map((el) => el.dataset.noteId));
    const menus = new Set([...parent.querySelectorAll(".tempvs-estimate-menu[open]")].map((el) => el.closest(".tempvs-estimate-details").dataset.noteId));
    parent.empty();
    const notes = this.notes.filter((n) => !n.archived);
    const totals = this.totals(), estimatedPaths = new Set(notes.map((n) => n.path));
    if (!notes.length && !totals.size) return;
    parent.createEl("h4", { text: "Note e stime" });
    for (const [path, seconds] of totals) if (!estimatedPaths.has(path)) {
      const row2 = parent.createDiv();
      action(row2, path.split("/").pop().replace(/\.md$/i, ""), () => this.plugin.app.workspace.openLinkText(path, "", false));
      row2.createSpan({ text: " \xB7 " + estimateTime(seconds) });
    }
    for (const note of notes) {
      const details = parent.createEl("details", { cls: "tempvs-estimate-details" });
      details.dataset.noteId = note.id;
      details.open = open.has(note.id);
      details.createEl("summary", { text: note.title + " \xB7 " + (note.completed ? "completato" : Math.floor(this.progress(note, totals).percent) + "%") });
      this.render(details, note, day, true, totals);
      details.querySelector(".tempvs-estimate-menu").open = menus.has(note.id);
    }
  }
  selector(parent, session) {
    const notes = this.available(session), current = this.notes.find((n) => n.id === session.noteEstimateId);
    if (!notes.length && !current) return;
    if (current && !notes.includes(current)) notes.push(current);
    const select = parent.createEl("select", { cls: "tempvs-note-assignment", attr: { "aria-label": "Nota della sessione " + session.start } });
    select.createEl("option", { value: "", text: "Solo area \xB7 nessuna nota" });
    for (const n of notes) select.createEl("option", { value: n.id, text: n.title + (n.completed ? " (completata)" : "") });
    select.value = session.noteEstimateId || "";
    select.onchange = () => this.assign(session.id, select.value).catch((e) => new import_obsidian2.Notice(e.message));
  }
};

// obsidian/note-ledger.js
var isLedger = (source) => /^\s*T:/im.test(source);
var row = /^\s*T:\s*(\d+(?:[.,]\d+)?)([hms]?)(?:\s*\/\s*(\d+(?:[.,]\d+)?)([hms]))?\s+@(.+?)\s*$/i;
var scale = { h: 3600, m: 60, s: 1 };
function duration(seconds) {
  const total = Math.round(seconds);
  for (const [unit, factor] of Object.entries(scale)) {
    if (total % factor === 0) return { value: total / factor, unit };
  }
}
function updateLedger(markdown2, totals) {
  const blocks = findDailyBlocks(markdown2, true), ledgers = blocks.filter((b) => isLedger(b.source));
  if (ledgers.length > 1) throw Error("Riunisci i totali T: in un solo blocco TEMPVS.");
  if (blocks.length !== findDailyBlocks(markdown2).length) throw Error("Chiudi il blocco TEMPVS prima di aggiornare il totale.");
  const block = ledgers[0];
  const remaining = new Map([...totals].map(([area, seconds]) => [area.toLowerCase(), { area, seconds }]));
  const seen = /* @__PURE__ */ new Set(), lines = [];
  function format(area, seconds, target, unit, explicitUnit) {
    const done = duration(seconds);
    const left = done.value + (target && !explicitUnit && done.unit === unit ? "" : done.unit);
    return "T: " + left + (target ? "/" + target + unit : "") + " @" + area;
  }
  for (const line of block?.source.split(/\r?\n/) || []) {
    if (!line.trim()) {
      lines.push(line);
      continue;
    }
    const match = line.match(row);
    if (!match || !match[2] && !match[4]) throw Error("Usa T: 1h @Studio oppure T: 1/7h @Studio.");
    const [, , , target, unit, area] = match, key2 = area.toLowerCase();
    if (seen.has(key2)) throw Error("Indica un solo totale per area.");
    seen.add(key2);
    lines.push(format(area, remaining.get(key2)?.seconds || 0, target, unit, match[2] === unit));
    remaining.delete(key2);
  }
  for (const { area, seconds } of remaining.values()) lines.push(format(area, seconds));
  const source = lines.join("\n");
  if (block) return source === block.source.replace(/\r\n/g, "\n") ? markdown2 : replaceDailyBlock(markdown2, block, source);
  if (!lines.length) return markdown2;
  const empty = blocks.find((b) => !b.source.trim());
  if (empty && findDailyBlocks(markdown2).some((b) => b.start === empty.start)) return replaceDailyBlock(markdown2, empty, source);
  const nl = markdown2.includes("\r\n") ? "\r\n" : "\n";
  return markdown2 + (markdown2.endsWith(nl) ? nl : nl + nl) + "```TEMPVS" + nl + lines.join(nl) + nl + "```" + nl;
}

// obsidian/moved-links.js
function movedTarget(target, oldPath, newPath, sourcePath, resolve) {
  const match = /^([^#]+)(#.*)?$/.exec(target);
  if (!match) return target;
  const [, raw, fragment = ""] = match;
  let local = raw;
  if (/^\.{1,2}\//.test(raw) && sourcePath) {
    const parts = sourcePath.split("/").slice(0, -1);
    for (const part of raw.split("/")) {
      if (part === "..") parts.pop();
      else if (part && part !== ".") parts.push(part);
    }
    local = parts.join("/");
  }
  const path = local.replace(/^\//, "");
  const withoutMd = (value) => value.replace(/\.md$/i, "");
  let destination;
  if (withoutMd(path) === withoutMd(oldPath)) {
    destination = newPath;
  } else if (path.startsWith(oldPath + "/")) {
    destination = newPath + path.slice(oldPath.length);
  } else if (withoutMd(oldPath).endsWith("/" + withoutMd(path))) {
    const other = resolve?.(path, sourcePath);
    if (other && other.path !== newPath) return target;
    destination = newPath;
  } else {
    return target;
  }
  return (raw.startsWith("/") ? "/" : "") + (/\.md$/i.test(path) ? destination : withoutMd(destination)) + fragment;
}
function moveBlockLinks(source, move) {
  return source.replace(/\[\[([^\]|\n]+)(\|[^\]\n]*)?\]\]/g, (original, path, alias = "") => {
    const next = move(path.trim());
    return next === path.trim() ? original : "[[" + next + alias + "]]";
  });
}
function archivedLinkResolver(files, estimates, vaultName) {
  const key2 = (path) => path.replace(/^\//, "").replace(/\.md$/i, "");
  const basename = (path) => path.split("/").pop();
  const paths = new Set(files.map((file) => key2(file.path)));
  const candidates = /* @__PURE__ */ new Map();
  const add = (from, to) => {
    if (!candidates.has(from)) candidates.set(from, /* @__PURE__ */ new Set());
    candidates.get(from).add(to);
  };
  for (const file of files) add(basename(key2(file.path)), file.path);
  const archiveOnly = (path) => /^(?:archive|archivio)\//i.test(path);
  const prefix = "note:" + encodeURIComponent(vaultName) + "/";
  for (const note of estimates) {
    if (!archiveOnly(note.path) || !paths.has(key2(note.path)) || !note.id.startsWith(prefix)) continue;
    const encoded = note.id.slice(prefix.length);
    if (encoded.includes("/")) continue;
    let original;
    try {
      original = key2(decodeURIComponent(encoded));
    } catch {
      continue;
    }
    add(original, note.path);
    add(basename(original), note.path);
  }
  return (target) => {
    const [, raw, fragment = ""] = /^([^#]*)(#.*)?$/.exec(target);
    const path = key2(raw);
    if (!path || paths.has(path) || raw.includes(".") && !/\.md$/i.test(raw) && !candidates.has(basename(path))) return target;
    const matches = candidates.get(path) || candidates.get(basename(path));
    if (matches?.size !== 1) return target;
    const [destination] = matches;
    if (!archiveOnly(destination)) return target;
    return (/\.md$/i.test(raw) ? destination : key2(destination)) + fragment;
  };
}

// obsidian/daily-blocks.js
var import_obsidian3 = require("obsidian");
var uid2 = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
var plain = (source) => source.split(/\r?\n/).filter((line) => !/^\s*<!-- tempvs-block:/.test(line)).map((line) => line.replace(/\s*<!-- tempvs-session:[^>]+-->\s*$/, "")).join("\n");
function restoreRowIds(original, edited) {
  const rows = original.split(/\r?\n/).filter((line) => line.trim() && !/^\s*(?:date:|<!-- tempvs-block:)/i.test(line));
  const next = edited.split(/\r?\n/);
  const actual = next.filter((line) => line.trim() && !/^\s*date:/i.test(line));
  const used = /* @__PURE__ */ new Set();
  let at = 0;
  return next.map((line) => {
    if (!line.trim() || /^\s*date:/i.test(line)) return line;
    const same2 = rows.findIndex((row2, i) => !used.has(i) && plain(row2) === line);
    const index = same2 >= 0 ? same2 : actual.length === rows.length && !used.has(at) ? at : -1;
    at++;
    if (index < 0) return line;
    used.add(index);
    return line + (rows[index].match(/\s*<!-- tempvs-session:[^>]+-->\s*$/)?.[0] || "");
  }).join("\n");
}
var DailyBlocks = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.children = /* @__PURE__ */ new Set();
    this.chain = Promise.resolve();
    this.destroyed = false;
    this.applying = false;
    this.timers = /* @__PURE__ */ new Map();
    this.errors = /* @__PURE__ */ new Map();
    this.detached = /* @__PURE__ */ new Set();
    this.ledgerVersions = /* @__PURE__ */ new Map();
  }
  get bindings() {
    return this.plugin.dailyNotes;
  }
  start() {
    for (const language of ["TEMPVS", "tempvs", "TEMPUS", "tempus"]) this.plugin.registerMarkdownCodeBlockProcessor(language, (source, el, ctx) => ctx.addChild(new DailyBlock(el, this, ctx, source)));
    const vault = this.plugin.app.vault;
    if (this.plugin.app.workspace.on) this.plugin.registerEvent(this.plugin.app.workspace.on("editor-change", (_editor, view) => {
      if (view?.file?.extension === "md") this.schedule(view.file.path);
    }));
    if (vault?.on) {
      this.plugin.registerEvent(vault.on("modify", (file) => {
        if (file.extension === "md") this.schedule(file.path);
      }));
      this.plugin.registerEvent(vault.on("delete", (file) => {
        this.plugin.estimates?.archive(file.path).catch((e) => new import_obsidian3.Notice(e.message));
      }));
      this.plugin.registerEvent(vault.on("rename", (file, oldPath) => {
        const newPath = file.path;
        this.queue(() => this.moveReferences(oldPath, newPath)).catch((e) => new import_obsidian3.Notice("TEMPVS: " + e.message));
      }));
    }
    if (vault?.on) this.plugin.registerEvent(vault.on("create", (file) => {
      if (file.extension === "md") {
        this.schedule(file.path);
        this.queue(() => this.syncLedgers()).catch((error) => new import_obsidian3.Notice(error.message));
      }
    }));
    this.plugin.addCommand({ id: "unlink-daily-plan", name: "Scollega TEMPVS dalla nota attiva (conserva sessioni)", callback: () => {
      const file = this.plugin.app.workspace.getActiveFile();
      if (file) this.detach(file.path).catch((error) => new import_obsidian3.Notice("TEMPVS: " + error.message));
    } });
    this.plugin.addCommand({ id: "insert-daily-plan", name: "Inserisci blocco TEMPVS nella nota", editorCallback: (editor) => editor.replaceSelection("```TEMPVS\n\n```\n") });
    this.plugin.app.workspace.onLayoutReady?.(() => this.initialize().catch((error) => new import_obsidian3.Notice("TEMPVS: " + error.message)));
  }
  async moveReferences(oldPath, newPath) {
    const plugin = this.plugin, cache = plugin.app.metadataCache;
    const resolve = (path, source) => cache?.getFirstLinkpathDest?.(path, source);
    const move = (path, source = "") => movedTarget(path, oldPath, newPath, source, resolve);
    const relocated = (path) => path === oldPath || path.startsWith(oldPath + "/") ? newPath + path.slice(oldPath.length) : path;
    return this.rewriteReferences(move, relocated);
  }
  async rewriteReferences(move, relocated = (path) => path) {
    const plugin = this.plugin;
    const bindings = Object.entries(this.bindings);
    const affected = bindings.filter(([, b]) => typeof b.source === "string" && moveBlockLinks(b.source, (p) => move(p, b.path)) !== b.source);
    const notes = (plugin.estimates?.notes || []).filter((n) => n.vault === plugin.estimates.vault && relocated(n.path) !== n.path);
    const records = [...plugin.state.sessions, ...plugin.state.history || []];
    const sourceOf = (r) => this.bindings[r.noteBlockId]?.path || "";
    const changes = records.filter((r) => r.linkedNotes?.some((n) => move(n.path, sourceOf(r)) !== n.path));
    if (!affected.length && !notes.length && !changes.length && !bindings.some(([, b]) => relocated(b.path) !== b.path)) return;
    this.applying = true;
    try {
      await plugin.change(() => {
        for (const r of changes) for (const n of r.linkedNotes) {
          const path = move(n.path, sourceOf(r));
          if (n.path === n.label) n.label = path;
          n.path = path;
        }
        for (const n of notes) {
          n.path = relocated(n.path);
          n.title = n.path.split("/").pop().replace(/\.md$/i, "");
        }
        for (const [, b] of bindings) b.path = relocated(b.path);
      });
      for (const [id, b] of affected) {
        const context = await this.context(b.path);
        if (!context || context.kind) continue;
        const original = context.block.source, next = moveBlockLinks(original, (p) => move(p, b.path));
        if (original !== next) await this.writeSource(context.file, id, original, next, context.block.lineStart);
        if (b.source === original || moveBlockLinks(b.source, (p) => move(p, b.path)) === next) b.source = next;
        this.schedule(b.path);
      }
      if (affected.length) await plugin.persist();
    } finally {
      this.applying = false;
      this.refresh();
    }
  }
  queue(work) {
    const result = this.chain.catch(() => {
    }).then(() => {
      if (this.destroyed) throw Error("TEMPVS non \xE8 attivo.");
      return work();
    });
    this.chain = result;
    return result;
  }
  refresh(path) {
    for (const child of this.children) if (!path || child.ctx.sourcePath === path) child.refresh();
  }
  schedule(path) {
    if (this.destroyed || this.detached.has(path)) return;
    clearTimeout(this.timers.get(path));
    this.timers.set(path, setTimeout(() => {
      this.timers.delete(path);
      this.syncFile(path).catch((error) => {
        this.errors.set(path, error.message);
        this.plugin.refresh?.(true);
        this.refresh(path);
      });
    }, 350));
  }
  async syncLedgers(forcePath) {
    const { app, state } = this.plugin, vault = app.vault;
    if (!vault?.process) return;
    const totals = /* @__PURE__ */ new Map();
    creditedWork(state, (path, source) => app.metadataCache?.getFirstLinkpathDest?.(path, source)?.path, (id) => this.bindings[id]?.path, totals);
    const paths = forcePath ? [forcePath] : /* @__PURE__ */ new Set([...totals.keys(), ...this.ledgerVersions.keys()]);
    for (const path of paths) {
      const areas = totals.get(path) || /* @__PURE__ */ new Map(), version = JSON.stringify([...areas]);
      if (!forcePath && version === this.ledgerVersions.get(path)) continue;
      const file = vault.getAbstractFileByPath(path);
      if (file?.extension !== "md" || file.path !== path) {
        this.ledgerVersions.delete(path);
        continue;
      }
      try {
        const markdown2 = await this.readMarkdown(file);
        if (updateLedger(markdown2, areas) !== markdown2) {
          await vault.process(file, (current) => {
            if (current !== markdown2) throw Error("Modifica in corso: attendo il salvataggio della nota.");
            return updateLedger(current, areas);
          });
        }
        this.ledgerVersions.set(path, version);
      } catch (error) {
        this.errors.set(path, error.message);
        this.ledgerVersions.delete(path);
        this.refresh(path);
      }
    }
  }
  async initialize() {
    const files = this.plugin.app.vault.getMarkdownFiles();
    const estimates = this.plugin.estimates;
    const move = archivedLinkResolver(files, estimates?.notes || [], estimates?.vault || "");
    await this.queue(() => this.rewriteReferences(move));
    for (const file of files) {
      if (this.destroyed) return;
      try {
        await this.syncFile(file.path, { force: true });
      } catch (error) {
        this.errors.set(file.path, error.message);
      }
    }
    await this.archiveChanged();
  }
  async reconcilePlans() {
    const vault = this.plugin.app.vault;
    const files = vault?.getMarkdownFiles?.() || Object.values(this.bindings).map((b) => vault?.getAbstractFileByPath(b.path)).filter(Boolean);
    for (const file of files) {
      if (this.destroyed) return;
      try {
        const context = await this.context(file.path);
        if (context && !context.kind) await this.syncFile(file.path, { force: true });
      } catch (error) {
        this.errors.set(file.path, error.message);
      }
    }
    this.plugin.refresh?.(true);
    this.refresh();
  }
  protectedBlocks(id) {
    return Object.entries(this.bindings).filter(([other, b]) => other !== id && this.plugin.app.vault.getAbstractFileByPath(b.path)).map(([other]) => other);
  }
  selectDay(path, date) {
    if (this.plugin.app.workspace.getActiveFile?.()?.path !== path) return;
    for (const leaf of this.plugin.app.workspace.getLeavesOfType?.("tempvs-timer") || []) {
      if (leaf.view) {
        leaf.view.day = date;
        leaf.view.update?.(true);
      }
    }
  }
  bindingId(path) {
    return Object.keys(this.bindings).find((id) => this.bindings[id].path === path);
  }
  async readMarkdown(file) {
    for (const leaf of this.plugin.app.workspace.getLeavesOfType?.("markdown") || []) {
      const view = leaf.view;
      if (view?.file?.path === file.path && view.editor && view.getMode?.() !== "preview") return view.editor.getValue();
    }
    return this.plugin.app.vault.read(file);
  }
  async context(path, renderSource) {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!file || file.extension !== "md") throw Error("La nota Markdown non \xE8 pi\xF9 disponibile.");
    const markdown2 = await this.readMarkdown(file), blocks = findDailyBlocks(markdown2);
    const ledger = blocks.find((b) => isLedger(b.source));
    if (ledger && (blocks.length === 1 || isLedger(renderSource))) return { file, block: ledger, markdown: markdown2, kind: "ledger" };
    const plans = blocks.filter((b) => !isLedger(b.source));
    if (!plans.length) {
      const value = this.plugin.app.metadataCache?.getFileCache(file)?.frontmatter?.tempvs;
      if (typeof value === "string" && /^@?\d+(?:[.,]\d+)?[hm]$/i.test(value.trim())) return { file, kind: "estimate", block: { source: "@" + value.trim().replace(/^@/, "") } };
      return null;
    }
    if (plans.length !== 1) throw Error("Usa un solo blocco TEMPVS per nota giornaliera.");
    const block = plans[0];
    if (!block.source.trim() && this.plugin.estimates?.find(file.path)) return { file, block, markdown: markdown2, kind: "estimate-empty" };
    if (isEstimateSource(block.source)) return { file, block, markdown: markdown2, kind: "estimate" };
    const date = resolveDailyDate(block.source, file, {
      moment: import_obsidian3.moment,
      format: this.plugin.app.internalPlugins?.getPluginById("daily-notes")?.instance?.options?.format || "YYYY-MM-DD",
      frontmatter: this.plugin.app.metadataCache?.getFileCache(file)?.frontmatter
    });
    return { file, block, date, markdown: markdown2 };
  }
  async locate(child) {
    const context = await this.context(child.ctx.sourcePath, child.source);
    if (!context) throw Error("Blocco TEMPVS non trovato.");
    return context;
  }
  async syncEstimate(context, path) {
    this.applying = true;
    try {
      if (context?.kind === "estimate") await this.plugin.estimates?.sync(context);
      else await this.plugin.estimates?.archive(path);
    } finally {
      this.applying = false;
    }
  }
  syncFile(path, { force = false } = {}) {
    return this.queue(async () => {
      if (this.detached.has(path)) return;
      const context = await this.context(path);
      if (!context) {
        const id = this.bindingId(path);
        if (id && isRegister(this.bindings[id].source)) {
          this.applying = true;
          try {
            await this.plugin.change(() => {
              const removeIds = this.plugin.state.sessions.filter((s) => s.noteBlockId === id).map((s) => s.id);
              applyRegister(this.plugin.state, { blockId: id, sessions: [], records: [], removeIds });
              delete this.bindings[id];
            });
          } finally {
            this.applying = false;
          }
        }
        await this.syncEstimate(null, path);
        if (id) await this.syncLedgers();
        return;
      }
      if (context.kind === "ledger") {
        await this.syncEstimate(null, path);
        this.errors.delete(path);
        await this.syncLedgers(path);
        this.refresh(path);
        return;
      }
      if (context.kind === "estimate-empty") {
        await this.syncEstimate(null, path);
        this.errors.delete(path);
        this.refresh(path);
        return;
      }
      if (context.kind === "estimate") {
        await this.syncEstimate(context, path);
        this.errors.delete(path);
        this.refresh(path);
        return;
      }
      await this.syncEstimate(null, path);
      const blockId = this.bindingId(path) || blockIdentity(context.block.source) || uid2();
      this.validateBinding(blockId, path, context.date);
      const binding = this.bindings[blockId];
      if (!force && binding?.agendaVersion === 2 && binding.ratioVersion === 1 && binding.source === context.block.source) {
        this.errors.delete(path);
        this.selectDay(path, context.date);
        this.refresh(path);
        return;
      }
      const plan = prepareDailyPlan({ source: context.block.source, date: context.date, blockId, previousSource: binding?.source, protectedBlockIds: this.protectedBlocks(blockId), state: this.plugin.state });
      await this.commit({ ...context, ...plan, originalSource: context.block.source, keepSource: true });
      this.errors.delete(path);
      this.selectDay(path, context.date);
      this.plugin.refresh?.(true);
      this.refresh(path);
    });
  }
  validateBinding(id, path, date) {
    const bound = this.bindings[id];
    if (bound && (bound.path !== path || bound.date !== date)) throw Error("Questo blocco TEMPVS \xE8 gi\xE0 collegato a un\u2019altra nota o data. Non copiare i commenti identificativi.");
    if (Object.entries(this.bindings).some(([other, b]) => other !== id && b.date === date)) throw Error("Esiste gi\xE0 un blocco collegato a questa giornata. Usa il blocco originale.");
  }
  async preview(child, edited) {
    const context = await this.locate(child), id = this.bindingId(context.file.path) || blockIdentity(context.block.source) || uid2();
    this.validateBinding(id, context.file.path, context.date);
    if (edited !== void 0 && context.block.source !== child.source) throw Error("La nota \xE8 cambiata mentre modificavi le righe. Riapri il blocco prima di riprovare.");
    const source = edited === void 0 ? context.block.source : restoreRowIds(context.block.source, edited);
    const date = explicitDay(source) || context.date;
    if (date !== context.date) throw Error("Per cambiare giorno usa una daily note diversa.");
    const plan = prepareDailyPlan({ source, date, blockId: id, previousSource: this.bindings[id]?.source, protectedBlockIds: this.protectedBlocks(id), state: this.plugin.state });
    return { ...context, ...plan, originalSource: context.block.source };
  }
  async writeSource(file, id, original, replacement, lineStart) {
    if (this.destroyed) throw Error("TEMPVS non \xE8 attivo.");
    await this.plugin.app.vault.process(file, (current) => {
      for (const leaf of this.plugin.app.workspace.getLeavesOfType?.("markdown") || []) {
        if (leaf.view?.file?.path === file.path && leaf.view.editor && leaf.view.editor.getValue() !== current) throw Error("Modifica in corso: attendo il salvataggio della nota.");
      }
      const blocks = findDailyBlocks(current);
      let matches = blocks.filter((b) => blockIdentity(b.source) === id);
      if (!matches.length) matches = blocks.filter((b) => b.source === original && (lineStart === void 0 || b.lineStart === lineStart));
      if (matches.length !== 1 || matches[0].source !== original) throw Error("La nota \xE8 cambiata durante la preview. Prepara nuovamente le modifiche.");
      return replaceDailyBlock(current, matches[0], replacement);
    });
  }
  async commit(prepared) {
    if (archivePlanningKey(this.plugin.state) !== prepared.planningKey) throw Error("Le sessioni sono cambiate durante la preview. Prepara nuovamente le modifiche.");
    this.validateBinding(prepared.blockId, prepared.file.path, prepared.date);
    const newIds = prepared.sessions.filter((s) => !this.plugin.state.sessions.some((current) => current.id === s.id)).map((s) => s.id);
    const fresh = prepareDailyPlan({ source: prepared.source, date: prepared.date, blockId: prepared.blockId, previousSource: prepared.previousSource, protectedBlockIds: prepared.protectedBlockIds, state: this.plugin.state, id: () => newIds.shift() || uid2() });
    const body = prepared.keepSource || fresh.records ? plain(prepared.source) : serializeDailyPlan(fresh.sessions, prepared.date);
    const canonical = explicitDay(prepared.originalSource) && !explicitDay(body) ? "date: " + prepared.date + "\n" + body : body;
    const previousBinding = this.bindings[prepared.blockId];
    this.applying = true;
    const writesNote = !prepared.keepSource || canonical !== prepared.originalSource;
    try {
      if (writesNote) await this.writeSource(prepared.file, prepared.blockId, prepared.originalSource, canonical, prepared.block.lineStart);
      else {
        const current = await this.context(prepared.file.path);
        if (!current || current.block.source !== prepared.originalSource || current.date !== prepared.date) throw Error("La nota \xE8 cambiata durante la sincronizzazione.");
      }
      try {
        if (archivePlanningKey(this.plugin.state) !== fresh.planningKey) throw Error("Le sessioni sono cambiate durante il salvataggio. Prepara nuovamente le modifiche.");
        await this.plugin.change(() => {
          const available = fresh.sessions.filter((s) => !this.plugin.state.sessions.some((current) => current.id === s.id)).map((s) => s.id);
          const checked = prepareDailyPlan({ source: prepared.source, date: prepared.date, blockId: prepared.blockId, previousSource: prepared.previousSource, protectedBlockIds: prepared.protectedBlockIds, state: this.plugin.state, id: () => available.shift() || uid2() });
          applyDailyPlan(this.plugin.state, checked);
          this.plugin.state = normalizeArchive(this.plugin.state);
          this.bindings[prepared.blockId] = { path: prepared.file.path, date: prepared.date, source: canonical, ratioVersion: 1, agendaVersion: 2, hiddenSessionIds: checked.retainedIds, budgets: fresh.budgets, unusedMinutes: fresh.unusedMinutes };
        });
      } catch (error) {
        if (previousBinding) this.bindings[prepared.blockId] = previousBinding;
        else delete this.bindings[prepared.blockId];
        try {
          if (writesNote) await this.writeSource(prepared.file, prepared.blockId, canonical, prepared.originalSource);
        } catch {
          throw Error("Salvataggio sessioni fallito e nota modificata nel frattempo. Le righe restano nella nota: verifica e riprepara la preview. " + error.message);
        }
        throw error;
      }
    } finally {
      this.applying = false;
      this.refresh(prepared.file.path);
    }
    await this.syncLedgers();
    return canonical;
  }
  apply(prepared) {
    return this.queue(() => this.commit(prepared));
  }
  updateSessionNotes(blockId, updates) {
    return this.queue(async () => {
      const binding = this.bindings[blockId];
      if (!binding) throw Error("Nota giornaliera non collegata.");
      const context = await this.context(binding.path);
      if (!context || context.block.source !== binding.source) throw Error("La nota giornaliera sta cambiando: attendi la sincronizzazione e riprova.");
      if (isRegister(binding.source)) throw Error("Modifica il wikilink nella riga della nota quotidiana.");
      const sessions = daySessions(this.plugin.state, binding.date, blockId).filter((s) => !binding.hiddenSessionIds?.includes(s.id)).map((s) => updates.has(s.id) ? { ...s, linkedNotes: updates.get(s.id) } : s);
      const body = serializeDailyPlan(sessions, binding.date);
      const source = explicitDay(binding.source) ? "date: " + binding.date + "\n" + body : body;
      const plan = prepareDailyPlan({ source, date: binding.date, blockId, state: this.plugin.state, previousSource: binding.source, protectedBlockIds: this.protectedBlocks(blockId) });
      for (const session of plan.sessions) if (updates.has(session.id)) delete session.noteEstimateId;
      await this.commit({ ...context, ...plan, originalSource: context.block.source, keepSource: true });
    });
  }
  async includeDay(child) {
    const context = await this.locate(child), blockId = this.bindingId(context.file.path) || blockIdentity(context.block.source) || uid2();
    this.validateBinding(blockId, context.file.path, context.date);
    const source = serializeDailyPlan(daySessions(this.plugin.state, context.date, blockId), context.date, blockId);
    return { ...context, ...prepareDailyPlan({ source, date: context.date, blockId, protectedBlockIds: this.protectedBlocks(blockId), state: this.plugin.state }), originalSource: context.block.source };
  }
  detach(path) {
    return this.queue(async () => {
      this.detached.add(path);
      clearTimeout(this.timers.get(path));
      const previous = JSON.parse(JSON.stringify(this.bindings));
      const ids = new Set(Object.keys(this.bindings).filter((id) => this.bindings[id].path === path));
      this.applying = true;
      try {
        await this.plugin.change(() => {
          for (const id of ids) delete this.bindings[id];
          for (const session of this.plugin.state.sessions) if (ids.has(session.noteBlockId)) delete session.noteBlockId;
        });
      } catch (error) {
        this.plugin.dailyNotes = Object.assign(/* @__PURE__ */ Object.create(null), previous);
        throw error;
      } finally {
        this.applying = false;
        this.refresh(path);
      }
    });
  }
  archiveChanged() {
    if (this.applying || this.destroyed) return Promise.resolve();
    return this.queue(async () => {
      for (const [blockId, binding] of Object.entries(this.bindings)) {
        if (this.detached.has(binding.path)) continue;
        try {
          const context = await this.context(binding.path);
          if (!context) continue;
          if (context.kind === "estimate" || binding.agendaVersion !== 2 || binding.ratioVersion !== 1 || context.block.source !== binding.source) {
            this.schedule(binding.path);
            continue;
          }
          const sessions = daySessions(this.plugin.state, binding.date, blockId).filter((s) => !binding.hiddenSessionIds?.includes(s.id));
          if (isRegister(binding.source) || sessions.some((s) => s.registerMinutes)) continue;
          const body = serializeDailyPlan(sessions, binding.date);
          const source = explicitDay(binding.source) ? "date: " + binding.date + "\n" + body : body;
          if (source === binding.source) continue;
          const key2 = archivePlanningKey(this.plugin.state), previousSource = binding.source;
          this.applying = true;
          try {
            await this.writeSource(context.file, blockId, previousSource, source, context.block.lineStart);
            try {
              await this.plugin.change(() => {
                if (archivePlanningKey(this.plugin.state) !== key2) throw Error("Le sessioni sono cambiate durante il salvataggio della nota.");
                for (const session of this.plugin.state.sessions) if (sessions.some((s) => s.id === session.id)) session.noteBlockId = blockId;
                this.bindings[blockId] = { ...binding, source, unusedMinutes: 0 };
              });
            } catch (error) {
              this.bindings[blockId] = binding;
              await this.writeSource(context.file, blockId, source, previousSource, context.block.lineStart);
              throw error;
            }
          } finally {
            this.applying = false;
          }
          this.errors.delete(binding.path);
        } catch (error) {
          this.errors.set(binding.path, error.message);
        }
      }
      await this.syncLedgers();
      this.refresh();
    });
  }
  destroy() {
    this.destroyed = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    for (const child of this.children) child.disposed = true;
    this.children.clear();
  }
};
var DailyBlock = class extends import_obsidian3.MarkdownRenderChild {
  constructor(el, controller, ctx, source) {
    super(el);
    this.controller = controller;
    this.ctx = ctx;
    this.source = source;
    this.disposed = false;
  }
  onload() {
    this.controller.children.add(this);
    this.refresh();
    this.controller.schedule(this.ctx.sourcePath);
  }
  onunload() {
    this.disposed = true;
    this.controller.children.delete(this);
  }
  async refresh() {
    const version = this.version = (this.version || 0) + 1;
    try {
      const context = await this.controller.locate(this);
      if (this.disposed || version !== this.version) return;
      this.source = context.block.source;
      if (context.kind === "estimate" || context.kind === "estimate-empty") {
        const el2 = this.containerEl;
        const menuOpen = el2.querySelector(".tempvs-estimate-menu")?.open;
        el2.empty();
        el2.addClass("tempvs-daily");
        const error2 = this.controller.errors.get(this.ctx.sourcePath);
        if (error2) el2.createEl("p", { text: error2, cls: "tempvs-daily-error" });
        const note = this.controller.plugin.estimates?.find(this.ctx.sourcePath);
        if (note && !note.archived) {
          const box = this.controller.plugin.estimates.render(el2, note);
          if (menuOpen) box.querySelector(".tempvs-estimate-menu").open = true;
        }
        return;
      }
      const el = this.containerEl;
      el.empty();
      el.addClass("tempvs-daily");
      const code = el.createEl("pre").createEl("code");
      const lines = plain(this.source).split("\n");
      for (const [index, line] of lines.entries()) {
        if (index) code.append("\n");
        renderSyntaxLine(code, line, this.controller.plugin.config.areas);
      }
      const error = this.controller.errors.get(this.ctx.sourcePath);
      const binding = this.controller.bindings[this.controller.bindingId(this.ctx.sourcePath)];
      if (context.kind === "ledger") {
        if (error) el.createEl("small", { text: error });
        return;
      }
      if (isRegister(this.source)) {
        const rows = this.controller.plugin.state.history.filter((h) => h.registerBlock === this.controller.bindingId(this.ctx.sourcePath));
        el.createEl("small", { text: error || new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(rows.reduce((sum, h) => sum + h.minutes, 0)) + " min registrati, pause comprese", attr: { role: error ? "alert" : "status" } });
        return;
      }
      const manual = daySessions(this.controller.plugin.state, context.date, this.controller.bindingId(this.ctx.sourcePath)).filter((s) => s.noteBlockId === this.controller.bindingId(this.ctx.sourcePath));
      const actual = manual.reduce((n, s) => n + (sessionBounds(s).end - sessionBounds(s).start), 0) / 6e4;
      el.createEl("small", { text: error || (binding?.source === this.source ? "Intervalli sincronizzati" + (manual.length ? " \xB7 " + new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(actual) + " min registrati, pause comprese" : "") + (binding.unusedMinutes ? " \xB7 " + binding.unusedMinutes + " minuti finali liberi" : "") : "Aggiornamento automatico\u2026"), cls: error ? "tempvs-daily-error" : "tempvs-muted", attr: { role: error ? "alert" : "status" } });
    } catch (error) {
      if (this.disposed || version !== this.version) return;
      this.containerEl.empty();
      this.containerEl.createEl("p", { text: error.message, cls: "tempvs-daily-error" });
    }
  }
};

// obsidian/main.js
var import_obsidian5 = require("obsidian");

// core/tempo-merge.js
var absent = Symbol("missing");
var has = (obj, key2) => Object.prototype.hasOwnProperty.call(obj, key2);
var same = (a, b) => a === absent || b === absent ? a === b : JSON.stringify(a) === JSON.stringify(b);
var object = (v) => v !== null && v !== absent && typeof v === "object" && !Array.isArray(v);
var snapshotList = (state, collection) => Array.isArray(state?.[collection]) ? state[collection] : [];
var deleted = (state, collection) => new Set(Array.isArray(state?.syncDeleted?.[collection]) ? state.syncDeleted[collection].filter((v) => typeof v === "string" && v) : []);
var mapById = (entries, collection) => {
  const result = /* @__PURE__ */ new Map();
  for (const value of entries) {
    const id = collection === "history" ? value?.sessionId : value?.id;
    if (typeof id !== "string" || !id || result.has(id))
      throw Error("Archivio non valido: identificativi duplicati o assenti (" + collection + ").");
    result.set(id, value);
  }
  return result;
};
var choiceLabel = (section, id, field) => {
  const names = { tasks: "Attivit\xE0", sessions: "Sessione", history: "Storico", defaults: "Preferenze", appearance: "Aspetto" };
  const label = (names[section] || section) + (id ? " \xB7 " + id : "");
  return label + (field ? " \xB7 " + field : "");
};
function mergeSnapshots(base, local, remote, choices = {}) {
  if (!local || !remote) throw Error("Entrambi gli archivi sono necessari.");
  const conflicts = [];
  const chosen = (key2, section, label, left, right, options = null) => {
    const optionsList = options || [
      { value: "local", label: "Conserva questo dispositivo" },
      { value: "remote", label: "Conserva Dropbox" }
    ];
    const value = choices[key2];
    if (optionsList.some((option) => option.value === value)) return value;
    conflicts.push({
      key: key2,
      section,
      label,
      options: optionsList,
      localPreview: preview(left),
      remotePreview: preview(right)
    });
    return null;
  };
  function preview(value) {
    if (value === absent) return "Eliminato / non presente";
    if (value === null) return "Nessun valore";
    if (typeof value === "string") return value.slice(0, 160);
    if (Array.isArray(value)) return value.length + " elementi";
    if (object(value)) return String(value.title || value.date || "Dati modificati").slice(0, 160);
    return String(value);
  }
  const field = (baseValue, localValue, remoteValue, key2, section, label) => {
    if (same(localValue, remoteValue)) return localValue;
    if (baseValue === absent && (localValue === absent || remoteValue === absent))
      return localValue === absent ? remoteValue : localValue;
    if (baseValue !== absent) {
      if (same(localValue, baseValue)) return remoteValue;
      if (same(remoteValue, baseValue)) return localValue;
    }
    if (object(localValue) && object(remoteValue) && (baseValue === absent || object(baseValue))) {
      const output = {};
      const keys = /* @__PURE__ */ new Set([
        ...Object.keys(object(baseValue) ? baseValue : {}),
        ...Object.keys(localValue),
        ...Object.keys(remoteValue)
      ]);
      for (const property of keys) {
        const value = field(
          object(baseValue) && has(baseValue, property) ? baseValue[property] : absent,
          has(localValue, property) ? localValue[property] : absent,
          has(remoteValue, property) ? remoteValue[property] : absent,
          key2 + "." + property,
          section,
          label + " \xB7 " + property
        );
        if (value !== absent) output[property] = value;
      }
      return output;
    }
    const answer = chosen(key2, section, label, localValue, remoteValue);
    return answer === "remote" ? remoteValue : localValue;
  };
  const merged = {
    app: "Tempo Pomodoro",
    version: 5,
    defaults: field(
      base?.defaults ?? absent,
      local.defaults ?? absent,
      remote.defaults ?? absent,
      "defaults",
      "defaults",
      "Preferenze"
    ),
    appearance: field(
      base?.appearance ?? absent,
      local.appearance ?? absent,
      remote.appearance ?? absent,
      "appearance",
      "appearance",
      "Aspetto"
    )
  };
  const finalDeleted = { tasks: /* @__PURE__ */ new Set(), sessions: /* @__PURE__ */ new Set(), history: /* @__PURE__ */ new Set() };
  function collection(name) {
    const b = mapById(snapshotList(base, name), name);
    const l = mapById(snapshotList(local, name), name);
    const r = mapById(snapshotList(remote, name), name);
    const bDel = deleted(base, name), lDel = deleted(local, name), rDel = deleted(remote, name);
    const allIds = /* @__PURE__ */ new Set([
      ...b.keys(),
      ...l.keys(),
      ...r.keys(),
      ...bDel,
      ...lDel,
      ...rDel
    ]);
    const out = [];
    for (const id of allIds) {
      const bp = b.has(id), lp = l.has(id), rp = r.has(id);
      const bv = bp ? b.get(id) : absent, lv = lp ? l.get(id) : absent, rv = rp ? r.get(id) : absent;
      const label = choiceLabel(name, name === "history" ? id : (l.get(id) || r.get(id) || b.get(id))?.title || id, "");
      let result = absent;
      if (lp && rp) {
        if ((lDel.has(id) || rDel.has(id)) && !bp) {
          const key2 = name + ":" + id + ":delete";
          const answer = chosen(key2, name, label + " \xB7 eliminazione", lv, rv);
          result = answer === "remote" ? rv : lv;
        } else result = field(bv, lv, rv, name + ":" + id, name, label);
      } else if (lp || rp) {
        const present = lp ? lv : rv;
        const explicitDeletion = lp ? rDel.has(id) : lDel.has(id);
        const missingIsDeletion = name !== "history" && bp || explicitDeletion;
        if (!missingIsDeletion) result = present;
        else if (bp && same(present, bv) || name === "history" && explicitDeletion && !bp) result = absent;
        else {
          const key2 = name + ":" + id + ":exists";
          const answer = chosen(key2, name, label + " \xB7 modifica o eliminazione", lv, rv);
          result = answer === "remote" ? rv : lv;
        }
      }
      if (result !== absent) out.push(result);
      else if (bp || lDel.has(id) || rDel.has(id)) finalDeleted[name].add(id);
    }
    return out;
  }
  merged.tasks = collection("tasks");
  merged.sessions = collection("sessions");
  merged.history = collection("history");
  if (merged.defaults !== absent) merged.defaults = JSON.parse(JSON.stringify(merged.defaults));
  const areas = merged.defaults?.simple?.areas;
  if (Array.isArray(areas)) {
    const missing = /* @__PURE__ */ new Map();
    for (const name of ["sessions", "tasks", "history"]) for (const item of merged[name]) {
      if (item.areaId && !areas.some((a) => a.id === item.areaId || a.name === item.area)) missing.set(item.areaId, item.area);
    }
    for (const [id, name] of missing) {
      const source = [local, remote, base].flatMap((state) => state?.defaults?.simple?.areas || []).find((a) => a.id === id);
      if (!source) throw Error("Area associata non disponibile: " + name);
      const answer = chosen("areas:" + id + ":exists", "areas", "Area eliminata con elementi modificati \xB7 " + name, absent, source, [
        { value: "restore", label: "Ripristina l\u2019area e conserva gli elementi" },
        { value: "delete", label: "Elimina gli elementi collegati all\u2019area" }
      ]);
      if (answer === "restore") areas.push(source);
      else if (answer === "delete") for (const collection2 of ["sessions", "tasks", "history"]) {
        for (const item of merged[collection2]) if (item.areaId === id) finalDeleted[collection2].add(collection2 === "history" ? item.sessionId : item.id);
        merged[collection2] = merged[collection2].filter((item) => item.areaId !== id);
      }
    }
  }
  const active = new Map(merged.sessions.map((s) => [s.id, s]));
  const sorted = [...active.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
    const a = sorted[i], b = sorted[j];
    if (!active.has(a.id) || !active.has(b.id)) continue;
    if (!isOverlap(a, b)) continue;
    const key2 = "overlap:" + [a.id, b.id].sort().join(":");
    const decision = chosen(key2, "sessions", "Sessioni sovrapposte \xB7 " + a.date + " " + a.start + "\u2013" + a.end + " (" + a.title + ") / " + b.date + " " + b.start + "\u2013" + b.end + " (" + b.title + ")", a, b, [
      { value: a.id, label: "Conserva " + a.title + " \xB7 " + a.start + "\u2013" + a.end },
      { value: b.id, label: "Conserva " + b.title + " \xB7 " + b.start + "\u2013" + b.end }
    ]);
    if (decision) {
      const removed = decision === a.id ? b.id : a.id;
      active.delete(removed);
      finalDeleted.sessions.add(removed);
    }
  }
  merged.sessions = [...active.values()];
  const retainedSessionIds = new Set(merged.sessions.map((session) => session.id));
  merged.history = merged.history.filter((entry) => entry.measured || retainedSessionIds.has(entry.sessionId));
  const taskIds = new Set(merged.tasks.map((t) => t.id));
  const sessionIds = new Set(merged.sessions.map((s) => s.id));
  merged.sessions = merged.sessions.map((s) => {
    const taskIdsInSession = Array.isArray(s.taskIds) ? { taskIds: s.taskIds.filter((id) => taskIds.has(id)) } : {};
    return { ...s, ...taskIdsInSession, ...typeof s.taskId === "string" && !taskIds.has(s.taskId) ? { taskId: "" } : {} };
  });
  merged.tasks = merged.tasks.map((t) => t.autoSessionId && !sessionIds.has(t.autoSessionId) ? { ...t, autoSessionId: "" } : t);
  for (const t of merged.tasks) finalDeleted.tasks.delete(t.id);
  for (const s of merged.sessions) finalDeleted.sessions.delete(s.id);
  merged.syncDeleted = {
    tasks: [...finalDeleted.tasks].sort(),
    sessions: [...finalDeleted.sessions].sort(),
    ...finalDeleted.history.size ? { history: [...finalDeleted.history].sort() } : {}
  };
  return { merged, conflicts };
}
function isOverlap(a, b) {
  if (a.finished || b.finished) return false;
  const bounds = (session) => {
    if (session.timerStartedAt && session.timerEndsAt) return [+new Date(session.timerStartedAt), +new Date(session.timerEndsAt)];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date || "") || !/^\d\d:\d\d$/.test(session.start || "") || !/^\d\d:\d\d$/.test(session.end || "")) return null;
    const start = /* @__PURE__ */ new Date(session.date + "T" + session.start + ":00");
    const end = /* @__PURE__ */ new Date(session.date + "T" + session.end + ":00");
    if (end <= start) end.setDate(end.getDate() + 1);
    return [start.getTime(), end.getTime()];
  };
  const x = bounds(a), y = bounds(b);
  return Boolean(x && y && x[0] < y[1] && x[1] > y[0]);
}

// core/tempo-dropbox.js
var AUTH_KEY = "tempo-dropbox-auth-v1";
var META_KEY = "tempo-dropbox-sync-v1";
var BASE_KEY = "tempo-dropbox-common-base-v1";
var RECOVERY_KEY = "tempo-dropbox-recovery-v1";
var FILE = "/tempo-backup.json";
var API = "https://api.dropboxapi.com";
var CONTENT = "https://content.dropboxapi.com";
var bytesToBase64 = (url) => btoa(String.fromCharCode(...new Uint8Array(url))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
var randomCode = () => bytesToBase64(crypto.getRandomValues(new Uint8Array(48)));
async function shaChallenge(code) {
  return bytesToBase64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)));
}
async function fail(response) {
  if (response.ok) return response;
  let body = "";
  try {
    body = await response.text();
  } catch {
  }
  const error = new Error("Dropbox HTTP " + response.status + " " + body.slice(0, 250));
  error.status = response.status;
  const retryAfter = Number(response.headers?.get?.("Retry-After"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfter = retryAfter * 1e3;
  throw error;
}
function createDropboxSync({ getState, applyRemote, normalizeRemote, onStatus, resolveConflicts, platform = {} }) {
  const storage = platform.storage ?? globalThis.localStorage;
  const rawRequest = platform.request ?? fetch;
  let generation = 0, disposed = false;
  const assertCurrent = (epoch) => {
    if (disposed || epoch !== generation) throw Error("Operazione Dropbox annullata.");
  };
  const request = async (...args) => {
    const epoch = generation;
    assertCurrent(epoch);
    let response;
    try {
      response = await rawRequest(...args);
    } catch (error) {
      assertCurrent(epoch);
      error.retryable = true;
      throw error;
    }
    assertCurrent(epoch);
    const body = (method) => async () => {
      const value = await response[method]();
      assertCurrent(epoch);
      return value;
    };
    return { ok: response.ok, status: response.status, headers: response.headers, json: body("json"), text: body("text") };
  };
  const isOnline = platform.isOnline ?? (() => typeof navigator === "undefined" || navigator.onLine !== false);
  const transientStorage = platform.transientStorage ?? globalThis.sessionStorage;
  if (!storage || !transientStorage) throw new Error("Archivio locale Dropbox non disponibile.");
  const read = (k, fallback = {}) => {
    try {
      return JSON.parse(storage.getItem(k)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (k, v) => storage.setItem(k, JSON.stringify(v));
  const redirectUri = () => platform.redirectUri ? platform.redirectUri() : location.origin + location.pathname;
  const currentUrl = () => platform.currentUrl ? platform.currentUrl() : location.href;
  const navigate = (url) => platform.navigate ? platform.navigate(url) : location.assign(url);
  const clearCallback = () => platform.clearCallback ? platform.clearCallback() : history.replaceState({}, document.title, redirectUri() + location.hash);
  let auth = read(AUTH_KEY), meta = read(META_KEY, { rev: null, dirty: false, ready: false });
  let inFlight = null, delay = null, overridePending = false, retryCount = 0, eventsAttached = false, phase = "idle";
  const syncState = (data) => ({
    sessions: data?.sessions || [],
    tasks: data?.tasks || [],
    history: data?.history || [],
    defaults: data?.defaults || {},
    appearance: data?.appearance || {},
    syncDeleted: {
      tasks: data?.syncDeleted?.tasks || [],
      sessions: data?.syncDeleted?.sessions || [],
      ...data?.syncDeleted?.history?.length ? { history: data.syncDeleted.history } : {}
    }
  });
  const stateJSON = (data) => JSON.stringify(syncState(data));
  const current = () => JSON.parse(JSON.stringify(syncState(getState())));
  const baseline = () => read(BASE_KEY, null);
  const saveBase = (data) => write(BASE_KEY, syncState(data));
  const recovery = () => read(RECOVERY_KEY, null);
  const backupBeforeReplacement = (next) => {
    const local = current();
    if (stateJSON(local) !== stateJSON(next)) write(RECOVERY_KEY, {
      savedAt: (/* @__PURE__ */ new Date()).toISOString(),
      data: { app: "TEMPVS", version: 5, ...local }
    });
  };
  const status = (message, nextPhase = "idle") => {
    phase = nextPhase;
    return !disposed && onStatus(message, { connected: Boolean(auth.refreshToken), dirty: meta.dirty, ready: meta.ready, lastSyncedAt: meta.lastSyncedAt || null, recoveryAvailable: Boolean(recovery()), phase, busy: ["checking", "uploading", "downloading", "merging"].includes(phase) });
  };
  const storeMeta = () => write(META_KEY, meta);
  const storeAuth = () => write(AUTH_KEY, auth);
  const snapshot = (data = current()) => ({
    app: "Tempo Pomodoro",
    version: 5,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...syncState(data)
  });
  const queueSync = (wait = 2500) => {
    clearTimeout(delay);
    if (disposed || overridePending || !meta.ready || !auth.refreshToken) return;
    delay = setTimeout(() => {
      delay = null;
      sync().catch(() => {
      });
    }, wait);
  };
  const handleSyncError = (error) => {
    const retryable = error.retryable || error.status === 409 || error.status === 429 || error.status >= 500;
    if (retryable && !disposed && !overridePending && meta.ready && auth.refreshToken) {
      retryCount = Math.min(retryCount + 1, 6);
      const wait = Math.max(error.retryAfter || 0, Math.min(5e3 * 2 ** (retryCount - 1), 12e4));
      status(error.message + " \xB7 nuovo tentativo automatico fra " + Math.round(wait / 1e3) + " s", "error");
      queueSync(wait);
    } else status(error.message, "error");
  };
  const onConnectionResume = () => {
    if (!disposed && meta.ready && auth.refreshToken) queueSync(0);
  };
  const onVisibilityResume = () => {
    if (typeof document !== "undefined" && !document.hidden) onConnectionResume();
  };
  function changed() {
    if (disposed) return;
    meta.dirty = true;
    storeMeta();
    status("Modifiche locali in attesa di caricamento", "pending");
    retryCount = 0;
    queueSync();
  }
  async function connect(appKey) {
    appKey = (appKey || auth.appKey || "").trim();
    if (!/^[a-z0-9]{8,}$/i.test(appKey)) throw new Error("Inserisci una App key Dropbox valida.");
    if (!crypto?.subtle) throw new Error("Questo browser non supporta OAuth PKCE.");
    const verifier = randomCode(), nonce = randomCode();
    transientStorage.setItem("tempo-dropbox-pkce", JSON.stringify({ verifier, nonce, appKey }));
    const u = new URL("https://www.dropbox.com/oauth2/authorize");
    const params = { client_id: appKey, response_type: "code", token_access_type: "offline", code_challenge_method: "S256", code_challenge: await shaChallenge(verifier), state: nonce };
    if (!platform.manualAuthorization) params.redirect_uri = redirectUri();
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    await navigate(u.toString());
    return u.toString();
  }
  async function exchangeManualCode(code) {
    if (!platform.manualAuthorization) throw Error("Autenticazione manuale non configurata.");
    const stored = JSON.parse(transientStorage.getItem("tempo-dropbox-pkce") || "null");
    if (!stored?.verifier || !stored?.appKey) throw Error("Avvia prima il collegamento Dropbox.");
    code = String(code || "").trim();
    if (!code) throw Error("Incolla il codice autorizzazione di Dropbox.");
    const form = new URLSearchParams({ code, grant_type: "authorization_code", client_id: stored.appKey, code_verifier: stored.verifier });
    const res = await fail(await request(API + "/oauth2/token", { method: "POST", body: form }));
    const data = await res.json();
    if (!data.refresh_token || !data.access_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw Error("Credenziali OAuth Dropbox incomplete o non valide.");
    auth = { appKey: stored.appKey, refreshToken: data.refresh_token, accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1e3 - 6e4 };
    transientStorage.removeItem("tempo-dropbox-pkce");
    storeAuth();
    meta = { rev: null, dirty: meta.dirty, ready: false };
    storage.removeItem(BASE_KEY);
    storeMeta();
    status("Dropbox collegato. Scegli la prima sincronizzazione.");
  }
  async function callback() {
    if (platform.manualAuthorization) return false;
    const url = new URL(currentUrl()), code = url.searchParams.get("code"), error = url.searchParams.get("error");
    if (!code && !error) return false;
    const stored = JSON.parse(transientStorage.getItem("tempo-dropbox-pkce") || "null");
    if (!stored) throw new Error("Autorizzazione Dropbox scaduta. Riprova.");
    if (url.searchParams.get("state") !== stored.nonce) throw new Error("Controllo di sicurezza Dropbox non riuscito.");
    clearCallback();
    transientStorage.removeItem("tempo-dropbox-pkce");
    if (error) throw new Error("Autorizzazione Dropbox annullata.");
    const form = new URLSearchParams({ code, grant_type: "authorization_code", client_id: stored.appKey, code_verifier: stored.verifier, redirect_uri: redirectUri() });
    const res = await fail(await request(API + "/oauth2/token", { method: "POST", body: form }));
    const data = await res.json();
    if (!data.refresh_token || !data.access_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error("Credenziali OAuth Dropbox incomplete o non valide.");
    auth = { appKey: stored.appKey, refreshToken: data.refresh_token, accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1e3 - 6e4 };
    storeAuth();
    meta = { rev: null, dirty: meta.dirty, ready: false };
    storage.removeItem(BASE_KEY);
    storeMeta();
    status("Dropbox collegato. Scegli la prima sincronizzazione.");
    return true;
  }
  async function token() {
    if (!auth.refreshToken) throw new Error("Collega prima Dropbox.");
    if (auth.accessToken && Date.now() < auth.expiresAt) return auth.accessToken;
    const res = await fail(await request(API + "/oauth2/token", { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: auth.refreshToken, client_id: auth.appKey }) }));
    const data = await res.json();
    if (!data.access_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw Error("Risposta di rinnovo Dropbox non valida.");
    auth.accessToken = data.access_token;
    auth.expiresAt = Date.now() + data.expires_in * 1e3 - 6e4;
    storeAuth();
    return auth.accessToken;
  }
  async function metadata() {
    const response = await request(API + "/2/files/get_metadata", { method: "POST", headers: { "Authorization": "Bearer " + await token(), "Content-Type": "application/json" }, body: JSON.stringify({ path: FILE }) });
    if (response.status === 409) {
      const err = await response.json().catch(() => ({}));
      if (JSON.stringify(err).includes("not_found")) return null;
    }
    await fail(response);
    const data = await response.json();
    if (typeof data.rev !== "string" || !data.rev) throw Error("Metadati Dropbox non validi: revisione assente.");
    return data;
  }
  async function download() {
    const response = await fail(await request(CONTENT + "/2/files/download", { method: "POST", headers: { "Authorization": "Bearer " + await token(), "Dropbox-API-Arg": JSON.stringify({ path: FILE }) } }));
    const file = await response.json();
    if (!file || !Array.isArray(file.sessions) || file.tasks !== void 0 && !Array.isArray(file.tasks) || file.history !== void 0 && !Array.isArray(file.history)) throw new Error("Il backup Dropbox non \xE8 valido.");
    const info2 = JSON.parse(response.headers.get("Dropbox-API-Result") || "{}");
    if (typeof info2.rev !== "string" || !info2.rev) throw new Error("Revisione Dropbox assente.");
    return { file: normalizeRemote ? normalizeRemote(file) : syncState(file), rev: info2.rev };
  }
  async function upload(expectedRev, data = current()) {
    const mode = expectedRev ? { ".tag": "update", update: expectedRev } : "add";
    const response = await request(CONTENT + "/2/files/upload", { method: "POST", headers: {
      "Authorization": "Bearer " + await token(),
      "Dropbox-API-Arg": JSON.stringify({ path: FILE, mode, autorename: false, strict_conflict: true, mute: true }),
      "Content-Type": "application/octet-stream"
    }, body: JSON.stringify(snapshot(data)) });
    if (response.status === 409) {
      const error = new Error("Dropbox \xE8 cambiato durante la sincronizzazione. Riprova l'unione; nessun archivio locale \xE8 stato sostituito.");
      error.status = 409;
      throw error;
    }
    await fail(response);
    const info2 = await response.json();
    if (typeof info2.rev !== "string" || !info2.rev) throw new Error("Dropbox non ha restituito una revisione del backup.");
    return info2.rev;
  }
  function synced(data, rev) {
    if (disposed) return;
    saveBase(data);
    retryCount = 0;
    meta.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
    meta.rev = rev;
    meta.ready = true;
    meta.dirty = stateJSON(current()) !== stateJSON(data);
    storeMeta();
    status(
      meta.dirty ? "Altre modifiche locali da sincronizzare" : "Dropbox sincronizzato",
      meta.dirty ? "pending" : "idle"
    );
    if (meta.dirty) {
      queueSync();
    }
  }
  async function adopt(data, rev, original = current()) {
    const epoch = generation;
    if (stateJSON(current()) !== stateJSON(original))
      throw new Error("Dati locali cambiati durante il download. Riprova la sincronizzazione.");
    backupBeforeReplacement(data);
    await applyRemote(data);
    assertCurrent(epoch);
    synced(data, rev);
  }
  async function applyMerged(item, { manual = false } = {}) {
    if (overridePending && !manual) return false;
    const epoch = generation;
    const local = current(), base = baseline();
    let decisions = {}, result = mergeSnapshots(base, local, item.file, decisions);
    if (result.conflicts.length && !manual) {
      meta.dirty = true;
      storeMeta();
      status(result.conflicts.length + " conflitti da risolvere: usa \xABUnisci archivi\xBB.", "conflict");
      return false;
    }
    let rounds = 0;
    while (result.conflicts.length) {
      if (!resolveConflicts) throw new Error("Risoluzione dei conflitti non disponibile.");
      if (++rounds > 6) throw new Error("Troppi conflitti consecutivi: esporta un backup e riprova.");
      status("Scelta delle modifiche da conservare\u2026", "merging");
      const selected = await resolveConflicts(result.conflicts);
      assertCurrent(epoch);
      if (!selected) {
        status("Unione annullata: nessun dato sovrascritto.", "pending");
        return false;
      }
      decisions = { ...decisions, ...selected };
      result = mergeSnapshots(base, local, item.file, decisions);
    }
    const merged = normalizeRemote ? normalizeRemote(result.merged) : result.merged;
    if (stateJSON(current()) !== stateJSON(local))
      throw new Error("I dati locali sono cambiati durante la scelta. Riprova l'unione.");
    if (overridePending && !manual) return false;
    backupBeforeReplacement(merged);
    if (stateJSON(merged) === stateJSON(item.file)) {
      await adopt(merged, item.rev, local);
      status("Unione completata: dati Dropbox acquisiti.");
      return true;
    }
    status("Caricamento dell'archivio unificato su Dropbox\u2026", "uploading");
    const revision = await upload(item.rev, merged);
    if (stateJSON(current()) !== stateJSON(local)) {
      meta.ready = true;
      meta.dirty = true;
      storeMeta();
      status("Backup unificato caricato, ma i dati locali sono cambiati: nuova unione necessaria.", "pending");
      queueSync();
      return true;
    }
    await applyRemote(merged);
    assertCurrent(epoch);
    synced(merged, revision);
    status(meta.dirty ? "Unione salvata su Dropbox; nuove modifiche locali ancora da inviare." : "Archivi uniti e sincronizzati.", meta.dirty ? "pending" : "idle");
    return true;
  }
  async function firstSync(direction) {
    if (direction === "merge") return mergeNow();
    if (overridePending) throw Error("Un'altra operazione manuale \xE8 in corso.");
    overridePending = true;
    clearTimeout(delay);
    try {
      const epoch = generation;
      if (!auth.refreshToken) throw new Error("Collega prima Dropbox.");
      if (meta.ready) throw new Error("Sincronizzazione gi\xE0 inizializzata.");
      if (!isOnline()) throw new Error("Connessione assente.");
      status("Verifica del backup Dropbox in corso\u2026", "checking");
      const remote = await metadata();
      if (direction === "download") {
        if (!remote) throw new Error("Nessun backup presente su Dropbox.");
        status("Scaricamento del backup Dropbox\u2026", "downloading");
        const before = current();
        const item = await download();
        if (stateJSON(current()) !== stateJSON(before))
          throw new Error("I dati locali sono cambiati durante il download. Riprova.");
        backupBeforeReplacement(item.file);
        await applyRemote(item.file);
        assertCurrent(epoch);
        synced(item.file, item.rev);
        return;
      }
      if (direction === "upload") {
        if (remote) throw new Error("Dropbox contiene gi\xE0 un backup. Usa \xABUnisci gli archivi\xBB.");
        const local = current();
        status("Caricamento del primo backup Dropbox\u2026", "uploading");
        const rev = await upload(null, local);
        synced(local, rev);
        return;
      }
      throw new Error("Operazione iniziale non riconosciuta.");
    } catch (error) {
      status(error.message, "error");
      throw error;
    } finally {
      overridePending = false;
      if (!disposed && meta.dirty && meta.ready) queueSync();
    }
  }
  async function sync() {
    if (disposed || overridePending) return;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      if (!auth.refreshToken || !meta.ready) return;
      if (!isOnline()) {
        status("Offline: modifiche conservate in locale", "pending");
        return;
      }
      const base = baseline();
      if (base && stateJSON(current()) !== stateJSON(base) && !meta.dirty) {
        meta.dirty = true;
        storeMeta();
      }
      status("Verifica delle modifiche su Dropbox\u2026", "checking");
      const remote = await metadata();
      if (overridePending) return;
      if (!remote) {
        if (meta.rev) throw new Error("Backup remoto rimosso: evita una nuova copia senza conferma.");
        if (!meta.dirty) return;
        const local = current();
        const rev = await upload(null, local);
        synced(local, rev);
        return;
      }
      if (remote.rev === meta.rev && base) {
        if (!meta.dirty) {
          retryCount = 0;
          meta.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
          storeMeta();
          status("Dropbox sincronizzato");
          return;
        }
        status("Caricamento delle modifiche su Dropbox\u2026", "uploading");
        const local = current();
        const rev = await upload(meta.rev, local);
        synced(local, rev);
        return;
      }
      status("Confronto dell'archivio remoto e di quello locale\u2026", "downloading");
      const item = await download();
      if (overridePending) return;
      if (item.rev !== remote.rev)
        throw new Error("Dropbox \xE8 cambiato durante il download. Riprova.");
      if (base && !meta.dirty && stateJSON(current()) === stateJSON(base)) {
        await adopt(item.file, item.rev);
        status("Dati aggiornati da Dropbox.");
        return;
      }
      if (!base && !meta.dirty && stateJSON(current()) === stateJSON(item.file)) {
        synced(item.file, item.rev);
        return;
      }
      await applyMerged(item);
    })().catch((e) => {
      handleSyncError(e);
      throw e;
    }).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }
  async function mergeNow() {
    if (!auth.refreshToken) throw new Error("Collega prima Dropbox.");
    if (overridePending) throw new Error("Un'altra operazione manuale \xE8 in corso.");
    overridePending = true;
    clearTimeout(delay);
    try {
      if (inFlight) await inFlight.catch(() => {
      });
      if (!isOnline()) throw new Error("Connessione assente: unione rinviata.");
      status("Lettura della versione pi\xF9 recente su Dropbox\u2026", "checking");
      const remote = await metadata();
      if (!remote) {
        if (meta.rev) throw new Error("Il backup Dropbox \xE8 stato eliminato. Usa la sovrascrittura esplicita per ricrearlo.");
        const local = current(), rev = await upload(null, local);
        synced(local, rev);
        return;
      }
      const item = await download();
      if (item.rev !== remote.rev) throw new Error("Dropbox \xE8 cambiato durante il download: riprova.");
      await applyMerged(item, { manual: true });
    } catch (e) {
      status(e.message, "error");
      throw e;
    } finally {
      overridePending = false;
      if (!disposed && meta.dirty && meta.ready) {
        queueSync();
      }
    }
  }
  async function forceUpload() {
    if (!auth.refreshToken) throw new Error("Collega prima Dropbox.");
    if (overridePending) throw new Error("Un'altra operazione manuale \xE8 in corso.");
    overridePending = true;
    clearTimeout(delay);
    try {
      if (inFlight) await inFlight.catch(() => {
      });
      if (!isOnline()) throw new Error("Connessione assente.");
      status("Controllo della revisione Dropbox\u2026", "checking");
      const remote = await metadata(), local = current();
      status("Sovrascrittura esplicita del backup Dropbox\u2026", "uploading");
      const rev = await upload(remote?.rev || null, local);
      synced(local, rev);
      status(
        meta.dirty ? "Modifiche successive da inviare" : "Dropbox sovrascritto con i dati locali",
        meta.dirty ? "pending" : "idle"
      );
    } catch (e) {
      status(e.message, "error");
      throw e;
    } finally {
      overridePending = false;
      if (!disposed && meta.dirty && meta.ready) queueSync();
    }
  }
  async function forceDownload(allowDirty = false) {
    const epoch = generation;
    if (!auth.refreshToken || !meta.ready) throw new Error("Inizializza prima la sincronizzazione.");
    if (meta.dirty && !allowDirty) throw new Error("Modifiche locali da conservare: download bloccato.");
    if (overridePending) throw new Error("Un'altra operazione manuale \xE8 in corso.");
    overridePending = true;
    clearTimeout(delay);
    try {
      if (inFlight) await inFlight.catch(() => {
      });
      const before = current();
      const item = await download();
      if (stateJSON(current()) !== stateJSON(before))
        throw new Error("I dati locali sono cambiati durante il download. Riprova.");
      backupBeforeReplacement(item.file);
      await applyRemote(item.file);
      assertCurrent(epoch);
      synced(item.file, item.rev);
      status("Archivio Dropbox scaricato.");
    } finally {
      overridePending = false;
      if (!disposed && meta.dirty && meta.ready) queueSync();
    }
  }
  function disconnect() {
    ++generation;
    clearTimeout(delay);
    transientStorage.removeItem("tempo-dropbox-pkce");
    auth = {};
    meta = { rev: null, dirty: false, ready: false };
    retryCount = 0;
    storage.removeItem(AUTH_KEY);
    storage.removeItem(META_KEY);
    storage.removeItem(BASE_KEY);
    status("Dropbox scollegato. Dati locali conservati.");
  }
  function destroy() {
    disposed = true;
    ++generation;
    clearTimeout(delay);
    if (eventsAttached) {
      if (typeof window !== "undefined") window.removeEventListener("online", onConnectionResume);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibilityResume);
      eventsAttached = false;
    }
  }
  function info() {
    return { phase, connected: Boolean(auth.refreshToken), ready: meta.ready, dirty: meta.dirty, lastSyncedAt: meta.lastSyncedAt || null, recoveryAvailable: Boolean(recovery()) };
  }
  async function init() {
    if (!eventsAttached) {
      if (typeof window !== "undefined") window.addEventListener("online", onConnectionResume);
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibilityResume);
      eventsAttached = true;
    }
    await callback();
    status(auth.refreshToken ? meta.ready ? "Dropbox connesso" : "Dropbox collegato: inizializzazione necessaria" : "Dropbox non collegato");
    if (meta.ready) await sync().catch(() => {
    });
  }
  return { init, connect, exchangeManualCode, firstSync, sync, changed, mergeNow, forceUpload, forceDownload, disconnect, destroy, info, recovery };
}

// obsidian/cloud-adapter.js
var import_obsidian4 = require("obsidian");
async function dropboxRequest(url, options = {}) {
  const headers = { ...options.headers || {} };
  let body = options.body;
  if (body instanceof URLSearchParams) {
    body = body.toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const response = await (0, import_obsidian4.requestUrl)({
    url,
    method: options.method || "GET",
    headers,
    ...body === void 0 ? {} : { body },
    throw: false
  });
  return {
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    headers: { get(name) {
      const key2 = Object.keys(response.headers || {}).find((k) => k.toLowerCase() === name.toLowerCase());
      return key2 ? response.headers[key2] : null;
    } },
    text: async () => response.text,
    json: async () => JSON.parse(response.text)
  };
}
function createCloudStorage(initial = {}, onMutation = () => {
}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.has(k) ? map.get(k) : null,
    setItem(k, value) {
      map.set(k, String(value));
      onMutation();
    },
    removeItem(k) {
      map.delete(k);
      onMutation();
    },
    snapshot: () => Object.fromEntries(map)
  };
}
var TempvsConflictModal = class extends import_obsidian4.Modal {
  constructor(app, conflicts, finish) {
    super(app);
    this.conflicts = conflicts;
    this.finish = finish;
    this.setTitle("TEMPVS \xB7 Conflitti Dropbox");
  }
  onOpen() {
    const parent = this.contentEl;
    parent.empty();
    parent.createEl("p", { text: "Scegli per ogni elemento quale versione conservare. Nessuna modifica verr\xE0 applicata finch\xE9 non confermi." });
    const selects = [];
    for (const conflict of this.conflicts) {
      const row2 = parent.createDiv({ cls: "tempvs-conflict" });
      row2.createEl("strong", { text: conflict.label || conflict.key });
      row2.createEl("small", { text: "Dispositivo: " + String(conflict.localPreview ?? "\u2014").slice(0, 180) });
      row2.createEl("small", { text: "Dropbox: " + String(conflict.remotePreview ?? "\u2014").slice(0, 180) });
      const select = row2.createEl("select", { attr: { "aria-label": conflict.label || conflict.key } });
      select.createEl("option", { text: "Scegli una versione", attr: { value: "" } });
      for (const option of conflict.options || []) select.createEl("option", { text: option.label, attr: { value: option.value } });
      selects.push({ key: conflict.key, select });
    }
    const controls = parent.createDiv({ cls: "tempvs-controls" });
    const ok = controls.createEl("button", { text: "Conferma l'unione", cls: "mod-cta" });
    ok.addEventListener("click", () => {
      if (selects.some((item) => !item.select.value)) {
        new import_obsidian4.Notice("Seleziona una versione per ogni conflitto.");
        return;
      }
      this.complete(Object.fromEntries(selects.map((item) => [item.key, item.select.value])));
    });
    const cancel = controls.createEl("button", { text: "Annulla" });
    cancel.addEventListener("click", () => this.close());
  }
  complete(value) {
    this.finish?.(value);
    this.finish = null;
    this.close();
  }
  onClose() {
    if (this.finish) {
      this.finish(null);
      this.finish = null;
    }
    this.contentEl.empty();
  }
};
function chooseTempvsConflicts(app, conflicts) {
  return new Promise((resolve) => new TempvsConflictModal(app, conflicts, resolve).open());
}
function confirmTempvs(app, title, description) {
  return new Promise((resolve) => {
    class Confirmation extends import_obsidian4.Modal {
      onOpen() {
        this.setTitle(title);
        this.contentEl.createEl("p", { text: description });
        const actions = this.contentEl.createDiv({ cls: "tempvs-controls" });
        actions.createEl("button", { text: "Conferma", cls: "mod-warning" }).onclick = () => {
          this.done = true;
          resolve(true);
          this.close();
        };
        actions.createEl("button", { text: "Annulla" }).onclick = () => this.close();
      }
      onClose() {
        if (!this.done) resolve(false);
        this.contentEl.empty();
      }
    }
    new Confirmation(app).open();
  });
}

// core/tempo-audio.js
var TempoAmbientAudio = class _TempoAmbientAudio {
  constructor(onChange = () => {
  }) {
    this.onChange = onChange;
    this.context = null;
    this.master = null;
    this.nodes = [];
    this.crackleTimer = null;
    this.pendingCleanups = /* @__PURE__ */ new Map();
    this.playing = false;
    this.audible = false;
    this.kind = "off";
    this.volume = 0.25;
    this.generation = 0;
  }
  static createNoise(context, seconds = 4) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.playing && this.audible && this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.setTargetAtTime(this.volume, now, 0.05);
    }
  }
  async start(kind, volume = this.volume, audible = true) {
    if (!["white", "brown", "rain", "fire"].includes(kind)) return false;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    this.stop(0);
    this.setVolume(volume);
    const generation = this.generation;
    let resumeTimeout;
    try {
      try {
        if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = "ambient";
      } catch (_) {
      }
      if (!this.context || this.context.state === "closed") this.context = new Context();
      const context = this.context;
      context.onstatechange = () => {
        if (this.context === context) this.onChange(this.playing, this.kind);
      };
      const resumed = Promise.race([
        context.resume(),
        new Promise((_, reject) => {
          resumeTimeout = setTimeout(() => reject(new Error("Audio activation timed out")), 5e3);
        })
      ]);
      const master = context.createGain();
      this.audible = Boolean(audible);
      master.gain.value = this.audible ? this.volume : 0;
      master.connect(context.destination);
      this.master = master;
      this.kind = kind;
      const source = context.createBufferSource();
      source.buffer = _TempoAmbientAudio.createNoise(context);
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = kind === "white" ? 16e3 : kind === "brown" ? 220 : kind === "rain" ? 4200 : 950;
      source.connect(filter);
      filter.connect(master);
      source.start();
      this.nodes.push(source, filter, master);
      if (kind === "rain") {
        const oscillator = context.createOscillator();
        const depth = context.createGain();
        oscillator.frequency.value = 0.13;
        depth.gain.value = 1100;
        oscillator.connect(depth);
        depth.connect(filter.frequency);
        oscillator.start();
        this.nodes.push(oscillator, depth);
      }
      await resumed;
      if (this.generation !== generation || this.context !== context) return false;
      if (context.state !== "running") throw new Error("Audio context is not running");
      this.playing = true;
      this.onChange(true, kind);
      if (kind === "fire") {
        const generation2 = this.generation;
        const crackle = () => {
          if (!this.playing || !this.audible || this.generation !== generation2) return;
          const click = context.createBufferSource();
          const gain = context.createGain();
          const hp = context.createBiquadFilter();
          click.buffer = _TempoAmbientAudio.createNoise(context, 0.08);
          hp.type = "highpass";
          hp.frequency.value = 1800;
          const now = context.currentTime;
          gain.gain.setValueAtTime(1e-4, now);
          gain.gain.linearRampToValueAtTime(0.1, now + 8e-3);
          gain.gain.exponentialRampToValueAtTime(1e-4, now + 0.07);
          click.connect(hp);
          hp.connect(gain);
          gain.connect(master);
          click.start();
          click.stop(now + 0.08);
          click.onended = () => {
            click.disconnect();
            hp.disconnect();
            gain.disconnect();
          };
        };
        this.crackleTimer = setInterval(crackle, 650);
      }
      return true;
    } catch (error) {
      if (this.generation === generation) this.stop(0);
      return false;
    } finally {
      clearTimeout(resumeTimeout);
    }
  }
  /**
   * Keep user consent and sound selection armed while muting the graph.
   * Keep the context running so scheduled focus can resume without a new gesture.
   */
  setAudible(enabled, fadeSeconds = 0.9) {
    if (!this.playing || !this.context || !this.master) return;
    const audible = Boolean(enabled);
    if (this.audible === audible && (!audible || this.context.state === "running")) return;
    this.audible = audible;
    const generation = this.generation;
    const context = this.context;
    const master = this.master;
    const apply = () => {
      if (!this.playing || this.generation !== generation || this.master !== master) return;
      if (this.audible !== audible) return;
      const now = context.currentTime;
      const duration2 = Math.max(0, audible ? 0.35 : fadeSeconds);
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(audible ? this.volume : 0, now + duration2);
    };
    if (audible) void context.resume().then(apply).catch(() => {
      if (this.generation === generation) {
        this.audible = false;
        this.onChange(this.playing, this.kind);
      }
    });
    else apply();
  }
  stop(fadeSeconds = 0.9) {
    ++this.generation;
    this.playing = false;
    this.audible = false;
    this.kind = "off";
    if (this.crackleTimer !== null) clearInterval(this.crackleTimer);
    this.crackleTimer = null;
    const nodes = this.nodes;
    const master = this.master;
    this.nodes = [];
    this.master = null;
    const cleanup = () => {
      for (const node of nodes) {
        try {
          node.stop?.();
        } catch (_) {
        }
        try {
          node.disconnect?.();
        } catch (_) {
        }
      }
    };
    if (nodes.length && master && this.context && this.context.state === "running" && fadeSeconds > 0) {
      const now = this.context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + fadeSeconds);
      const timer = setTimeout(() => {
        cleanup();
        this.pendingCleanups.delete(timer);
      }, fadeSeconds * 1e3 + 80);
      this.pendingCleanups.set(timer, cleanup);
    } else cleanup();
    this.onChange(false, "off");
  }
  destroy() {
    this.stop(0);
    for (const [timer, cleanup] of this.pendingCleanups) {
      clearTimeout(timer);
      cleanup();
    }
    this.pendingCleanups.clear();
    if (this.context) this.context.close().catch(() => {
    });
    this.context = null;
  }
};

// core/tempo-chime.js
var FocusEndChime = class {
  constructor() {
    this.context = null;
    this.lastPlayed = -Infinity;
  }
  arm() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    try {
      try {
        if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = "ambient";
      } catch {
      }
      if (!this.context || this.context.state === "closed") {
        this.context = new Context();
        this.lastPlayed = -Infinity;
      }
      if (this.context.state !== "running") void this.context.resume().catch(() => {
      });
      return true;
    } catch {
      return false;
    }
  }
  async play(phase = "break") {
    if (!this.arm()) return false;
    const context = this.context;
    try {
      if (context.state !== "running") await context.resume();
      if (context !== this.context || context.state !== "running") return false;
      const now = context.currentTime;
      if (now - this.lastPlayed < 0.8) return false;
      this.lastPlayed = now;
      const notes = phase === "work" ? [[0, 784], [0.2, 1047]] : [[0, 880], [0.2, 659]];
      for (const [offset, frequency] of notes) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(1e-4, now + offset);
        envelope.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.022);
        envelope.gain.exponentialRampToValueAtTime(1e-4, now + offset + 0.4);
        oscillator.connect(envelope);
        envelope.connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.42);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
        };
      }
      return true;
    } catch {
      return false;
    }
  }
  destroy() {
    if (this.context) void this.context.close().catch(() => {
    });
    this.context = null;
  }
};

// obsidian/main.js
var VIEW_TYPE = "tempvs-timer";
var ZERO = () => normalizeArchive({ sessions: [] });
var uuid = () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + "-" + Math.random().toString(36).slice(2);
var button = (parent, label, action2) => {
  const el = parent.createEl("button", { text: label });
  el.addEventListener("click", () => Promise.resolve().then(action2).catch((e) => new import_obsidian5.Notice(e.message)));
  return el;
};
var today = () => localDateString();
var shiftDate = (value, change) => {
  const d = /* @__PURE__ */ new Date(value + "T12:00:00");
  if (Number.isNaN(d.getTime())) return today();
  d.setDate(d.getDate() + change);
  return localDateString(d);
};
var iconButton = (parent, icon, label, action2) => {
  const el = parent.createEl("button", { cls: "tempvs-icon-button", attr: { "aria-label": label, "title": label } });
  (0, import_obsidian5.setIcon)(el, icon);
  el.addEventListener("click", () => Promise.resolve().then(action2).catch((e) => new import_obsidian5.Notice(e.message)));
  return el;
};
var setPanel = (el, show) => {
  el.hidden = !show;
};
function renderCloudSettings(parent, plugin) {
  const more = parent;
  const cloud = more.createDiv({ cls: "tempvs-cloud tempvs-form" });
  const status = cloud.createEl("p", { cls: "tempvs-cloud-status", text: plugin.cloudMessage || "Non collegato" });
  status.setAttribute("role", "status");
  if (plugin.cloudInfo?.lastSyncedAt) cloud.createEl("p", { cls: "tempvs-muted", text: "Ultimo controllo Dropbox riuscito: " + new Date(plugin.cloudInfo.lastSyncedAt).toLocaleString("it-IT") });
  const key2 = cloud.createEl("input", { attr: { "aria-label": "Dropbox App key", placeholder: "App key Dropbox" } });
  const link = cloud.createEl("a", { text: "Apri autorizzazione Dropbox", href: "#", cls: "tempvs-cloud-link" });
  link.hidden = true;
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener noreferrer");
  button(cloud, "1. Autorizza su Dropbox", async () => {
    const url = await plugin.cloud.connect(key2.value);
    link.href = url;
    link.hidden = false;
    await plugin.persist();
    new import_obsidian5.Notice("Autorizza TEMPVS su Dropbox e copia il codice mostrato.");
  });
  const code = cloud.createEl("input", { attr: { "aria-label": "Codice autorizzazione Dropbox", placeholder: "Incolla il codice Dropbox", autocomplete: "off" } });
  button(cloud, "2. Completa collegamento", async () => {
    await plugin.cloud.exchangeManualCode(code.value);
    code.value = "";
    await plugin.persist();
    plugin.refresh(true);
  });
  const actions = cloud.createDiv({ cls: "tempvs-controls" });
  button(actions, "Sincronizza", () => plugin.cloudOperation("sync"));
  button(actions, "Unisci", () => plugin.cloudOperation("mergeNow"));
  button(actions, "Salva recupero nel vault", async () => {
    const copy = plugin.cloud.recovery();
    if (!copy?.data) throw Error("Nessuna copia di recupero disponibile.");
    const filename = "tempvs-recupero-" + Date.now() + ".json";
    await plugin.app.vault.create(filename, JSON.stringify(copy.data, null, 2));
    new import_obsidian5.Notice("Copia di recupero salvata nel vault: " + filename);
  });
  const initial = cloud.createDiv({ cls: "tempvs-controls" });
  button(initial, "Prima unione", () => plugin.cloudOperation("firstSync", "merge"));
  button(initial, "Scarica prima copia", async () => {
    if (await confirmTempvs(plugin.app, "Scaricare il backup Dropbox?", "Se il plugin contiene gi\xE0 sessioni locali, verr\xE0 creata una copia di recupero prima di sostituirle."))
      await plugin.cloudOperation("firstSync", "download");
  });
  button(initial, "Carica prima copia", () => plugin.cloudOperation("firstSync", "upload"));
  const dangerous = cloud.createDiv({ cls: "tempvs-controls" });
  button(dangerous, "Sovrascrivi Dropbox", async () => {
    if (await confirmTempvs(plugin.app, "Sovrascrivere Dropbox?", "L'archivio remoto verr\xE0 sostituito con quello locale. Usa Unisci per evitare perdite."))
      await plugin.cloudOperation("forceUpload");
  });
  button(dangerous, "Scollega", async () => {
    if (await confirmTempvs(plugin.app, "Scollegare Dropbox?", "Le sessioni locali resteranno salvate in Obsidian.")) {
      plugin.cloud.disconnect();
      await plugin.persist();
      plugin.refresh(true);
    }
  });
}
var TempvsView = class extends import_obsidian5.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.day = today();
    this.panel = null;
    this.creation = "start";
    this.panelId = "tempvs-" + uuid();
    this.planDay = null;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "TEMPVS";
  }
  getIcon() {
    return "timer";
  }
  async onOpen() {
    this.draw();
  }
  async onClose() {
  }
  draw() {
    const plugin = this.plugin;
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("tempvs-root");
    root.toggleClass("tempvs-wide", plugin.layout === "wide");
    const heading = root.createDiv({ cls: "tempvs-header" });
    const brand = heading.createDiv({ cls: "tempvs-brand" });
    brand.createEl("h3", { text: "TEMPVS" });
    const actions = heading.createDiv({ cls: "tempvs-heading-actions" });
    const cloud = iconButton(actions, "cloud", "Impostazioni Dropbox", () => plugin.openSettings());
    cloud.addClass("tempvs-cloud-indicator");
    iconButton(actions, "settings", "Impostazioni TEMPVS", () => plugin.openSettings());
    const timer = root.createDiv({ cls: "tempvs-timer" });
    timer.createDiv({ cls: "tempvs-phase" });
    const face = timer.createDiv({ cls: "tempvs-face" });
    face.createDiv({ cls: "tempvs-clock" });
    timer.createDiv({ cls: "tempvs-area" });
    const progress = face.createDiv({ cls: "tempvs-progress", attr: { role: "progressbar", "aria-label": "Avanzamento della fase", "aria-valuemin": "0", "aria-valuemax": "100" } });
    progress.createDiv({ cls: "tempvs-progress-fill" });
    timer.createDiv({ cls: "tempvs-timer-hint" });
    const controls = root.createDiv({ cls: "tempvs-controls tempvs-primary-controls" });
    const pauseButton = button(controls, "Pausa", () => plugin.togglePause());
    pauseButton.addClass("mod-cta", "tempvs-pause-button");
    const finishButton = button(controls, "Concludi", () => plugin.finish());
    finishButton.addClass("tempvs-finish-button");
    const sessionHeader = root.createDiv({ cls: "tempvs-section-heading" });
    sessionHeader.createEl("h4", { text: "La tua agenda" });
    const nav = sessionHeader.createDiv({ cls: "tempvs-date-nav" });
    iconButton(nav, "chevron-left", "Giorno precedente", () => {
      this.day = shiftDate(this.day, -1);
      this.update(true);
    });
    const dateLabel = nav.createEl("button", { cls: "tempvs-day-label", text: "Oggi", attr: { title: "Torna a oggi", "aria-label": "Data selezionata: oggi. Torna a oggi" } });
    dateLabel.onclick = () => {
      this.day = today();
      this.update(true);
    };
    iconButton(nav, "chevron-right", "Giorno successivo", () => {
      this.day = shiftDate(this.day, 1);
      this.update(true);
    });
    root.createDiv({ cls: "tempvs-daily-status", attr: { role: "status" } });
    root.createDiv({ cls: "tempvs-sessions" });
    root.createDiv({ cls: "tempvs-estimates" });
    const add = button(root, "+ Nuova sessione", () => this.togglePanel("create"));
    add.addClass("mod-cta", "tempvs-add-button");
    add.dataset.panel = "create";
    const quickActions = root.createDiv({ cls: "tempvs-shortcuts" });
    const planShortcut = iconButton(quickActions, "calendar-days", "Pianifica", () => {
      this.creation = "plan";
      this.togglePanel("create", true);
      this.showCreation();
    });
    planShortcut.createSpan({ text: "Pianifica" });
    planShortcut.dataset.panel = "create";
    const soundShortcut = iconButton(quickActions, "volume-2", "Suoni", () => this.togglePanel("sound"));
    soundShortcut.createSpan({ text: "Suoni" });
    soundShortcut.dataset.panel = "sound";
    const panels = root.createDiv({ cls: "tempvs-panels" });
    const create = panels.createDiv({ cls: "tempvs-panel tempvs-create-panel" });
    create.hidden = true;
    create.createEl("h4", { text: "Crea il tuo prossimo momento" });
    const method = create.createEl("select", { cls: "tempvs-method", attr: { "aria-label": "Metodo di inserimento" } });
    method.createEl("option", { text: "Avvia adesso", value: "start" });
    method.createEl("option", { text: "Pianificazione rapida", value: "plan" });
    method.value = this.creation;
    method.onchange = () => {
      this.creation = method.value;
      this.showCreation();
    };
    const startBox = create.createDiv({ cls: "tempvs-method-start" });
    const form = startBox.createEl("form", { cls: "tempvs-form" });
    const field = (parent, label) => parent.createEl("label", { cls: "tempvs-field", text: label });
    const area = field(form, "A cosa vuoi dedicarti?").createEl("select", { attr: { "aria-label": "Area" } });
    for (const a of plugin.config.areas) area.createEl("option", { text: a.name, attr: { value: a.name } });
    const gross = field(form, "Durata totale \xB7 minuti").createEl("input", { attr: { type: "number", min: "1", max: "1439", value: "30", "aria-label": "Durata totale in minuti", placeholder: "Minuti totali" } });
    gross.required = true;
    const presets = form.createDiv({ cls: "tempvs-presets", attr: { role: "group", "aria-label": "Durate rapide" } });
    const updatePresets = () => {
      for (const el of presets.children) el.setAttribute("aria-pressed", String(el.dataset.minutes === gross.value));
    };
    for (const value of [15, 30, 60]) {
      const preset = button(presets, value + " min", () => {
        gross.value = String(value);
        updatePresets();
      });
      preset.type = "button";
      preset.dataset.minutes = String(value);
    }
    gross.addEventListener("input", updatePresets);
    updatePresets();
    form.createEl("p", { cls: "tempvs-help", text: "La durata totale comprende focus e pause. Il timer segue l\u2019orario anche quando sospendi il conteggio del focus." });
    const advanced = form.createEl("details");
    advanced.createEl("summary", { text: "Focus e pause (avanzate)" });
    const focus = field(advanced, "Durata di ogni focus \xB7 minuti").createEl("input", { attr: { type: "number", min: "1", max: "240", value: String(plugin.state.defaults.workMinutes), "aria-label": "Minuti focus" } });
    focus.required = true;
    const pause = field(advanced, "Pausa finale \xB7 minuti (facoltativa)").createEl("input", { attr: { type: "number", min: "0", max: "1438", placeholder: "Pausa personalizzata (facoltativa)", "aria-label": "Minuti di pausa" } });
    form.createEl("button", { text: "Avvia", cls: "mod-cta", attr: { type: "submit" } });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.dataset.busy) return;
      form.dataset.busy = "true";
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      plugin.start(area.value, Number(gross.value), Number(focus.value), pause.value === "" ? void 0 : Number(pause.value)).then(() => this.togglePanel(null, true)).catch((err) => new import_obsidian5.Notice(err.message)).finally(() => {
        delete form.dataset.busy;
        submit.disabled = false;
      });
    });
    const planBox = create.createDiv({ cls: "tempvs-method-plan" });
    const plan = planBox.createEl("form", { cls: "tempvs-form" });
    const dateInput = field(plan, "Giorno").createEl("input", { attr: { type: "date", "aria-label": "Data", value: today() } });
    dateInput.required = true;
    const plannedArea = field(plan, "Area").createEl("select", { attr: { "aria-label": "Area da pianificare" } });
    for (const a of plugin.config.areas) plannedArea.createEl("option", { text: a.name, value: a.name });
    const planFields = plan.createDiv({ cls: "tempvs-plan-fields" });
    const startTime = field(planFields, "Ora di inizio").createEl("input", { attr: { type: "time", required: "", value: "09:00" } });
    const duration2 = field(planFields, "Durata \xB7 minuti").createEl("input", { attr: { type: "number", min: "1", max: "1439", value: "30", required: "" } });
    const cycleInput = field(plan, "Pomodoro lordo \xB7 minuti (facoltativo)").createEl("input", { attr: { type: "number", min: "1", max: "1439", placeholder: "Es. 60 \u2192 50 focus + 10 pausa", "aria-label": "Durata lorda del pomodoro" } });
    const cycleHint = plan.createEl("p", { cls: "tempvs-help", text: "Lascia vuoto per usare il focus predefinito. La durata totale della sessione comprende tutte le pause." });
    cycleInput.addEventListener("input", () => {
      try {
        const c = grossCycle(Number(cycleInput.value));
        cycleHint.textContent = `Ogni pomodoro: ${c.focusMinutes} min focus + ${c.breakMinutes} min pausa. L\u2019ultimo ciclo si ferma alla fine della sessione.`;
      } catch {
        cycleHint.textContent = cycleInput.value ? "Inserisci da 2 a 288 minuti interi." : "Lascia vuoto per usare il focus predefinito.";
      }
    });
    const batch = plan.createEl("details", { cls: "tempvs-batch" });
    batch.createEl("summary", { text: "Inserisci pi\xF9 sessioni con il testo" });
    batch.createEl("p", { cls: "tempvs-help", text: "Nuovo formato: Studio +14:00-16:00 -30m \u2192 quattro sessioni da 25 minuti di concentrazione + 5 di pausa. Il rapporto \xE8 sempre 5:1: -60m d\xE0 50 + 10. Si pu\xF2 oltrepassare mezzanotte. \xC8 ancora supportato Studio @2h +14:00 -60m: una sessione di due ore con cicli da 60 minuti lordi. Se compili questo campo, verranno usate queste righe." });
    const lines = field(batch, "Sessioni in formato rapido").createEl("textarea", { attr: { "aria-label": "Sessioni", placeholder: "Studio +14:00-16:00 -30m\nLavoro +18:00-19:30 -45m", rows: "3" } });
    const updatePlanMode = () => {
      const textMode = Boolean(lines.value.trim());
      for (const input of [plannedArea, startTime, duration2, cycleInput]) input.disabled = textMode;
    };
    lines.addEventListener("input", updatePlanMode);
    plan.createEl("button", { text: "Programma", cls: "mod-cta", attr: { type: "submit" } });
    plan.addEventListener("submit", (e) => {
      e.preventDefault();
      if (plan.dataset.busy) return;
      plan.dataset.busy = "true";
      const submit = plan.querySelector('[type="submit"]');
      submit.disabled = true;
      const text = lines.value.trim() || `${plannedArea.value} @${duration2.value}m +${startTime.value}${cycleInput.value ? " -" + cycleInput.value + "m" : ""}`;
      plugin.schedule(text, dateInput.value).then(() => {
        lines.value = "";
        updatePlanMode();
        this.day = dateInput.value;
        this.togglePanel(null, true);
        this.update(true);
      }).catch((err) => new import_obsidian5.Notice(err.message)).finally(() => {
        delete plan.dataset.busy;
        submit.disabled = false;
      });
    });
    const sounds = panels.createDiv({ cls: "tempvs-panel tempvs-sound-panel" });
    sounds.hidden = true;
    sounds.createEl("h4", { text: "Suoni di sottofondo" });
    sounds.createEl("p", { cls: "tempvs-help", text: "Attiva il sottofondo in anticipo: partir\xE0 alla concentrazione, anche come avviso. Resta silenzioso nelle pause. Tieni Obsidian aperto; dopo la riapertura, attivalo di nuovo." });
    const soundChoice = sounds.createEl("select", { cls: "tempvs-sound-choice", attr: { "aria-label": "Rumore ambientale" } });
    for (const [value, label] of [["white", "Rumore bianco"], ["brown", "Rumore marrone"], ["rain", "Pioggia"], ["fire", "Caminetto"]]) soundChoice.createEl("option", { value, text: label });
    soundChoice.value = plugin.audioKind;
    soundChoice.addEventListener("change", () => void plugin.selectAmbient(soundChoice.value).catch((e) => new import_obsidian5.Notice(e.message)));
    const soundVolume = sounds.createDiv({ cls: "tempvs-sound-volume" });
    soundVolume.createEl("label", { text: "Volume", attr: { for: "tempvs-volume" } });
    const slider = soundVolume.createEl("input", { cls: "tempvs-volume-slider", attr: { type: "range", id: "tempvs-volume", min: "0", max: "100", step: "1", "aria-label": "Volume audio" } });
    slider.value = String(plugin.audioVolume);
    slider.addEventListener("input", () => plugin.adjustAmbientVolume(Number(slider.value)));
    slider.addEventListener("change", () => void plugin.persist().catch((e) => new import_obsidian5.Notice(e.message)));
    const soundToggle = sounds.createEl("button", { cls: "tempvs-sound-toggle mod-cta", text: "Avvia suono" });
    soundToggle.addEventListener("click", () => void plugin.toggleAmbient().catch((e) => new import_obsidian5.Notice(e.message)));
    sounds.createDiv({ cls: "tempvs-sound-status", attr: { role: "status", "aria-live": "polite" } });
    const volumeValue = soundVolume.createEl("output", { text: slider.value + "%", "attr": { "aria-label": "Volume selezionato" } });
    slider.addEventListener("input", () => {
      volumeValue.textContent = slider.value + "%";
    });
    for (const [name, panel] of [["create", create], ["sound", sounds]]) {
      const header2 = panel.createDiv({ cls: "tempvs-panel-heading" });
      header2.appendChild(panel.querySelector("h4"));
      panel.prepend(header2);
      iconButton(header2, "x", "Chiudi pannello", () => {
        this.togglePanel(null, true);
        root.querySelector(`[data-panel="${name}"]`)?.focus();
      });
    }
    root.onkeydown = (e) => {
      if (e.key === "Escape" && this.panel) {
        const name = this.panel;
        this.togglePanel(null, true);
        root.querySelector(`[data-panel="${name}"]`)?.focus();
        e.stopPropagation();
      }
    };
    this.showCreation();
    this.applyPanel();
    this.update(true);
  }
  showCreation() {
    const root = this.containerEl.children[1];
    const start = root.querySelector(".tempvs-method-start");
    const plan = root.querySelector(".tempvs-method-plan");
    if (start) start.hidden = this.creation !== "start";
    if (plan) plan.hidden = this.creation !== "plan";
    const choice = root.querySelector(".tempvs-method");
    if (choice) choice.value = this.creation;
    if (this.creation === "plan" && this.planDay !== this.day) {
      root.querySelector('input[type="date"]').value = this.day;
      this.planDay = this.day;
    }
  }
  togglePanel(panel, force = false) {
    this.panel = force ? panel : this.panel === panel ? null : panel;
    this.showCreation();
    this.applyPanel();
    if (this.panel) {
      const el = this.containerEl.children[1].querySelector(".tempvs-" + this.panel + "-panel");
      el?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      el?.querySelector("select, input, button")?.focus({ preventScroll: true });
    }
  }
  applyPanel() {
    const root = this.containerEl.children[1];
    for (const name of ["create", "sound"]) {
      const el = root.querySelector(".tempvs-" + name + "-panel");
      if (el) {
        el.id = this.panelId + "-" + name;
        setPanel(el, this.panel === name);
      }
    }
    for (const trigger of root.querySelectorAll("[data-panel]")) {
      trigger.setAttribute("aria-controls", this.panelId + "-" + trigger.dataset.panel);
      trigger.setAttribute("aria-expanded", String(trigger.dataset.panel === this.panel));
      trigger.toggleClass("is-active", trigger.dataset.panel === this.panel);
    }
  }
  updateSoundControls() {
    const root = this.containerEl.children[1], plugin = this.plugin;
    if (!root?.hasClass("tempvs-root")) return;
    const active = plugin.active();
    const eligible = Boolean(active && !active.paused && getPhase(active).kind === "work");
    const toggle = root.querySelector(".tempvs-sound-toggle");
    if (toggle) {
      toggle.disabled = false;
      toggle.textContent = plugin.ambient.playing ? "Disattiva sottofondo" : eligible ? "Avvia suono" : "Attiva per le sessioni";
    }
    const status = root.querySelector(".tempvs-sound-status");
    if (status) status.textContent = plugin.ambient.playing ? plugin.ambient.audible ? "Suono attivo" : "Audio pronto \xB7 in attesa della concentrazione" : eligible ? "Pronto" : "Attiva ora per sentire il sottofondo all\u2019inizio delle sessioni";
  }
  renderSessionNotes(parent, notes, session, ids) {
    const resources = parent.createDiv({ cls: "tempvs-session-resources" });
    const source = this.plugin.dailyNotes?.[session.noteBlockId]?.path || "";
    let more;
    for (const [index, note] of notes.entries()) {
      if (index === 1) {
        more = resources.createEl("details");
        more.createEl("summary", { text: "Risorse (" + (notes.length - 1) + ")" });
      }
      const row2 = (more || resources).createDiv({ cls: "tempvs-session-note" });
      const label = note.label || note.path;
      const link = row2.createEl("a", { cls: "internal-link tempvs-session-resource", text: label, attr: { href: note.path, title: note.path } });
      link.addEventListener("click", (event) => {
        event.preventDefault();
        void this.plugin.app.workspace.openLinkText(note.path, source, event.metaKey || event.ctrlKey).catch((e) => new import_obsidian5.Notice(e.message));
      });
      if (index > 0) iconButton(row2, "arrow-up", "Rendi principale " + label, () => this.plugin.setSessionNote(ids, "", { primaryPath: note.path }));
      iconButton(row2, "x", "Scollega " + label, () => this.plugin.setSessionNote(ids, "", { removePath: note.path }));
    }
    button(resources, notes.length ? "Cambia nota" : "\uFF0B Collega nota", () => new SessionNotePicker(this.plugin.app, (value) => this.plugin.setSessionNote(ids, value)).open());
  }
  update(full = false) {
    const root = this.containerEl.children[1];
    if (!root?.hasClass("tempvs-root")) return;
    const plugin = this.plugin;
    const active = plugin.active();
    const phase = active ? getPhase(active) : null;
    const next = active ? null : getNextSession(plugin.state.sessions.filter((s) => !s.finished && !s.dailyRetired && !s.manualSuperseded));
    const upcoming = next ? getPhase(next, sessionBounds(next).start) : null;
    root.querySelector(".tempvs-timer").dataset.state = active?.paused ? "paused" : phase?.kind || "idle";
    root.querySelector(".tempvs-phase").textContent = active?.paused ? "Conteggio focus sospeso" : phase ? phase.label : next ? "Prossima sessione" : "Pronto per concentrarti";
    root.querySelector(".tempvs-clock").textContent = phase ? mmss(phase.remaining) : upcoming ? mmss(upcoming.remaining) : String(plugin.state.defaults.workMinutes).padStart(2, "0") + ":00";
    root.querySelector(".tempvs-area").textContent = active ? active.area || active.title : next ? next.area || next.title : "Scegli un\u2019area e inizia una sessione";
    const progress = root.querySelector(".tempvs-progress");
    const timer = root.querySelector(".tempvs-timer");
    const area = plugin.config.areas.find((a) => a.name === (active || next)?.area);
    timer.style.setProperty("--tempvs-area-color", area?.color || "var(--interactive-accent)");
    timer.dataset.style = plugin.timerStyle;
    timer.dataset.size = plugin.clockSize;
    timer.style.setProperty("--tempvs-progress-angle", (phase?.progress || 0) * 3.6 + "deg");
    progress.hidden = !phase || plugin.timerStyle === "digits";
    progress.setAttribute("aria-valuenow", String(Math.round(phase?.progress || 0)));
    progress.firstElementChild.style.width = (phase?.progress || 0) + "%";
    root.querySelector(".tempvs-timer-hint").textContent = phase ? "Fine sessione alle " + formatTime(phase.sessionEnd) + (active.paused ? " \xB7 L\u2019orario continua a scorrere" : "") : next ? "Inizio alle " + next.start + (next.date !== today() ? " \xB7 " + next.date : "") + " \xB7 fine alle " + next.end : "Il tuo prossimo passo: Nuova sessione";
    const pause = root.querySelector(".tempvs-pause-button");
    const finish = root.querySelector(".tempvs-finish-button");
    if (pause) {
      pause.disabled = !active;
      pause.textContent = active?.paused ? "Riprendi" : "Pausa";
    }
    if (pause) pause.title = "Sospende il conteggio del focus; gli orari della sessione continuano a scorrere.";
    if (finish) finish.disabled = !active;
    root.querySelector(".tempvs-primary-controls").hidden = !active;
    this.updateSoundControls();
    const cloud = root.querySelector(".tempvs-cloud-indicator");
    if (cloud) {
      const status = plugin.cloudMessage || "Dropbox non collegato";
      cloud.title = status;
      cloud.setAttribute("aria-label", status + " \u2014 Apri impostazioni");
      cloud.toggleClass("tempvs-cloud-error", /errore|error|fallit/i.test(status));
    }
    const dailyStatus = root.querySelector(".tempvs-daily-status");
    if (dailyStatus) {
      const path = plugin.app.workspace.getActiveFile?.()?.path;
      const error = plugin.daily?.errors.get(path);
      dailyStatus.textContent = error ? "TEMPVS: " + error : "";
      dailyStatus.hidden = !error;
      dailyStatus.toggleClass("tempvs-daily-error", Boolean(error));
    }
    if (!full) return;
    const dayLabel = root.querySelector(".tempvs-day-label");
    if (dayLabel) {
      dayLabel.textContent = this.day === today() ? "Oggi" : new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(/* @__PURE__ */ new Date(this.day + "T12:00:00"));
      dayLabel.setAttribute("aria-label", "Data selezionata: " + this.day + ". Torna a oggi");
    }
    const list = root.querySelector(".tempvs-sessions");
    list.empty();
    const now = /* @__PURE__ */ new Date();
    const registered = plugin.state.history.filter((h) => h.registerBlock && h.registerDay === this.day);
    const budgets = Object.values(plugin.dailyNotes || {}).find((b) => b.date === this.day)?.budgets || [];
    for (const b of budgets) {
      const difference = b.seconds - b.assigned;
      list.createEl("p", { text: b.area + " \xB7 " + readableDuration(b.assigned) + " su " + readableDuration(b.seconds) + (difference ? " \xB7 " + readableDuration(Math.abs(difference)) + (difference > 0 ? " disponibili" : " oltre il budget") : "") });
    }
    if (registered.length) {
      const table = list.createEl("table"), head = table.createEl("thead").createEl("tr"), body = table.createEl("tbody");
      for (const label of ["Area", "Orario", "Nota", "Durata"]) head.createEl("th", { text: label });
      for (const record of registered) {
        const row2 = body.createEl("tr");
        row2.createEl("td", { text: record.area });
        row2.createEl("td", { text: record.start || "\u2014" });
        const cell = row2.createEl("td"), note = record.linkedNotes[0];
        if (note) button(cell, note.label, () => plugin.app.workspace.openLinkText(note.path, plugin.dailyNotes[record.registerBlock]?.path || "", false));
        else cell.setText("\u2014");
        row2.createEl("td", { text: readableDuration(Math.round(record.minutes * 60)) });
      }
      const totals = /* @__PURE__ */ new Map();
      for (const r of registered) totals.set(r.area, (totals.get(r.area) || 0) + r.minutes);
      if (!budgets.length) list.createEl("small", { text: [...totals].map(([area2, min]) => area2 + " " + min + " min").join(" \xB7 ") });
    }
    const sessions = plugin.state.sessions.filter((s) => {
      if (s.registerMinutes) return false;
      if (s.dailyRetired || s.manualSuperseded) return false;
      return s.date === this.day || this.day === today() && sessionBounds(s).start <= now && sessionBounds(s).end > now;
    }).sort((a, b) => sessionBounds(a).start - sessionBounds(b).start);
    const expanded = this.expandedGroups ?? (this.expandedGroups = /* @__PURE__ */ new Set());
    for (const group of groupSessions(sessions, plugin.estimates?.notes || [])) {
      const first = group.sessions[0], last = group.sessions.at(-1), ids = group.sessions.map((s) => s.id);
      const item = list.createDiv({ cls: "tempvs-session tempvs-session-group" });
      const info = item.createDiv({ cls: "tempvs-session-info" });
      const heading = info.createDiv({ cls: "tempvs-session-heading" });
      heading.createEl("strong", { text: first.start + "\u2013" + last.end });
      const badge = heading.createSpan({ cls: "tempvs-area-mark", text: first.area || first.title });
      badge.style.setProperty("--tempvs-area-color", plugin.config.areas.find((a) => a.name === first.area)?.color || "var(--interactive-accent)");
      const current = group.sessions.find((s) => s.id === active?.id);
      item.toggleClass("is-current", Boolean(current));
      const done = group.sessions.filter((s) => s.finished || sessionBounds(s).end <= now).length;
      info.createEl("small", { cls: "tempvs-muted", text: `${ids.length} ${ids.length === 1 ? "sessione" : "sessioni"} \xB7 ${Math.round((sessionBounds(last).end - sessionBounds(first).start) / 6e4)} min \xB7 ${done} concluse` + (current ? " \xB7 " + (current.paused ? "Focus sospeso" : "In corso") : "") });
      this.renderSessionNotes(info, group.notes, first, ids);
      if (ids.length > 1) {
        const detail = info.createEl("details", { cls: "tempvs-session-cycles" });
        const key2 = ids.join("|");
        detail.open = expanded.has(key2);
        detail.addEventListener("toggle", () => {
          if (detail.open) expanded.add(key2);
          else expanded.delete(key2);
        });
        detail.createEl("summary", { text: "Singole sessioni" });
        for (const s of group.sessions) {
          const row2 = detail.createDiv({ cls: "tempvs-session-cycle" });
          row2.createEl("span", { text: s.start + "\u2013" + s.end + " \xB7 " + (s.finished || sessionBounds(s).end <= now ? "Conclusa" : s.id === active?.id ? "In corso" : "Programmata") + (s.cycleMinutes ? ` \xB7 ${s.workMinutes}/${s.cycleMinutes - s.workMinutes}` : "") });
          this.renderSessionNotes(row2, group.notes, s, [s.id]);
          if (!s.finished && sessionBounds(s).start > now) iconButton(row2, "trash-2", "Elimina sessione " + s.start, () => plugin.removeSession(s.id));
        }
      } else if (!first.finished && sessionBounds(first).start > now) {
        iconButton(item, "trash-2", "Elimina sessione " + (first.area || first.title), () => plugin.removeSession(first.id));
      }
    }
    if (!sessions.length && !registered.length && !budgets.length) {
      const empty = list.createDiv({ cls: "tempvs-empty" });
      (0, import_obsidian5.setIcon)(empty.createDiv({ cls: "tempvs-empty-icon" }), "calendar-check");
      empty.createEl("strong", { text: "Spazio per i tuoi progetti" });
      empty.createEl("p", { text: "Nessuna sessione in agenda. Avvia un focus o pianifica un momento per questa giornata." });
    }
    plugin.estimates?.renderPanel(root.querySelector(".tempvs-estimates"), this.day);
  }
};
var TempvsSettings = class extends import_obsidian5.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const el = this.containerEl;
    el.empty();
    el.createEl("h2", { text: "TEMPVS \u2014 Impostazioni" });
    new import_obsidian5.Setting(el).setName("Layout del timer").setDesc("Automatico, pannello laterale oppure scheda ampia su iPad e desktop.").addDropdown((d) => d.addOptions({ auto: "Automatico", side: "Pannello laterale", wide: "Scheda ampia" }).setValue(this.plugin.layout).onChange(async (v) => {
      this.plugin.layout = v;
      await this.plugin.persist();
      await this.plugin.openView(true);
    }));
    for (const [key2, label, choices] of [
      ["timerStyle", "Aspetto del timer", { digits: "Sole cifre", bar: "Cifre con barra", ring: "Cifre con anello" }],
      ["clockSize", "Dimensione delle cifre", { small: "Piccole", medium: "Medie", large: "Grandi" }]
    ]) {
      new import_obsidian5.Setting(el).setName(label).addDropdown((d) => d.addOptions(choices).setValue(this.plugin[key2]).onChange(async (value) => {
        this.plugin[key2] = value;
        this.plugin.refresh(true);
        await this.plugin.persist();
      }));
    }
    new import_obsidian5.Setting(el).setName("Minuti focus predefiniti").addText((t) => t.setValue(String(this.plugin.state.defaults.workMinutes)).onChange(async (v) => {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1 && n <= 240)
        await this.plugin.change(() => {
          this.plugin.state.defaults.workMinutes = n;
        });
    }));
    new import_obsidian5.Setting(el).setName("Pause automatiche").addToggle((t) => t.setValue(Boolean(this.plugin.state.defaults.breakEnabled)).onChange(async (v) => this.plugin.change(() => {
      this.plugin.state.defaults.breakEnabled = v;
    })));
    new import_obsidian5.Setting(el).setName("Avvisi sonori").setDesc("Segnale udibile ai cambi tra concentrazione e pausa, quando Obsidian \xE8 in primo piano.").addToggle((t) => t.setValue(this.plugin.chimeEnabled).onChange(async (value) => {
      this.plugin.chimeEnabled = value;
      if (value) this.plugin.chime.arm();
      await this.plugin.persist();
    }));
    new import_obsidian5.Setting(el).setName("Prova avviso").setDesc("Tocca per attivare e verificare l'audio su questo dispositivo.").addButton((b) => b.setButtonText("Riproduci").onClick(() => {
      void this.plugin.chime.play("break").then((ok) => {
        if (!ok) new import_obsidian5.Notice("Audio non disponibile: controlla il volume e riprova toccando Riproduci.");
      });
    }));
    el.createEl("h3", { text: "Aree" });
    el.createEl("p", { cls: "tempvs-muted", text: "Rinomina, riordina o elimina le aree senza perdere sessioni e statistiche. La descrizione Markdown resta associata all'area." });
    for (const [index, area] of this.plugin.config.areas.entries()) {
      const section = el.createDiv({ cls: "tempvs-area-config" });
      const heading = new import_obsidian5.Setting(section).setName(area.name);
      const nameInput = section.createEl("input", { attr: { type: "text", maxlength: "80", "aria-label": "Nuovo nome area " + area.name, value: area.name } });
      const colorInput = section.createEl("input", { attr: { type: "color", "aria-label": "Colore area " + area.name, value: area.color || "#54769b" } });
      const details = section.createEl("details");
      details.createEl("summary", { text: "Descrizione Markdown" });
      const description = details.createEl("textarea", { attr: { rows: "4", "aria-label": "Descrizione area " + area.name } });
      description.value = area.description || "";
      const resources = section.createEl("details");
      resources.createEl("summary", { text: "Risorse dell\u2019area" });
      for (const note of noteLinks(area.description)) button(resources, note.label, () => this.plugin.app.workspace.openLinkText(note.path, "", false));
      button(resources, "Collega nota aperta all\u2019area", async () => {
        await this.plugin.attachActiveNote(area.name);
        this.display();
      });
      heading.addButton((b) => b.setButtonText("Salva").onClick(async () => {
        try {
          const next = nameInput.value.trim();
          if (!next || next.length > 80 || this.plugin.config.areas.some((a) => a.name !== area.name && a.name.toLocaleLowerCase() === next.toLocaleLowerCase())) throw Error("Nome area non valido o gi\xE0 presente.");
          const previous = area.name;
          await this.plugin.change(() => {
            const stored = this.plugin.config.areas.find((a) => a.name === previous);
            if (!stored) throw Error("Area non disponibile.");
            stored.name = next;
            stored.color = colorInput.value;
            stored.description = description.value;
            if (next !== previous) this.plugin.remapArea(previous, next);
          });
          this.display();
          new import_obsidian5.Notice("Area aggiornata.");
        } catch (e) {
          new import_obsidian5.Notice(e.message);
        }
      }));
      heading.addButton((b) => b.setButtonText("\u2191").setTooltip("Sposta in alto").setDisabled(index === 0).onClick(async () => {
        try {
          await this.plugin.change(() => {
            const a = this.plugin.config.areas;
            [a[index - 1], a[index]] = [a[index], a[index - 1]];
          });
          this.display();
        } catch (e) {
          new import_obsidian5.Notice(e.message);
        }
      }));
      heading.addButton((b) => b.setButtonText("\u2193").setTooltip("Sposta in basso").setDisabled(index === this.plugin.config.areas.length - 1).onClick(async () => {
        try {
          await this.plugin.change(() => {
            const a = this.plugin.config.areas;
            [a[index], a[index + 1]] = [a[index + 1], a[index]];
          });
          this.display();
        } catch (e) {
          new import_obsidian5.Notice(e.message);
        }
      }));
      if (this.plugin.config.areas.length > 1) {
        const transfer = section.createEl("select", { attr: { "aria-label": "Sposta i dati di " + area.name + " nell'area" } });
        for (const other of this.plugin.config.areas.filter((a) => a.name !== area.name))
          transfer.createEl("option", { text: "Trasferisci in " + other.name, value: other.name });
        heading.addButton((b) => b.setButtonText("Elimina").onClick(async () => {
          const target = transfer.value;
          if (!await confirmTempvs(this.plugin.app, "Eliminare \xAB" + area.name + "\xBB?", "Le sessioni, le attivit\xE0 e lo storico verranno trasferiti nell'area \xAB" + target + "\xBB senza cancellare i tempi registrati.")) return;
          try {
            await this.plugin.change(() => {
              this.plugin.remapArea(area.name, target);
              this.plugin.config.areas = this.plugin.config.areas.filter((a) => a.name !== area.name);
            });
            this.display();
            new import_obsidian5.Notice("Area eliminata e dati trasferiti.");
          } catch (e) {
            new import_obsidian5.Notice(e.message);
          }
        }));
      }
    }
    const addArea = new import_obsidian5.Setting(el).setName("Nuova area");
    let addName = "";
    addArea.addText((t) => t.setPlaceholder("Nome della nuova area").onChange((v) => {
      addName = v;
    }));
    addArea.addButton((b) => b.setButtonText("Aggiungi").onClick(async () => {
      const name = addName.trim();
      if (!name || name.length > 80 || this.plugin.config.areas.some((a) => a.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return new import_obsidian5.Notice("Nome area non valido o gi\xE0 utilizzato.");
      try {
        await this.plugin.change(() => this.plugin.config.areas.push({ name, description: "", color: "#54769B" }));
        this.display();
        new import_obsidian5.Notice("Area aggiunta.");
      } catch (e) {
        new import_obsidian5.Notice(e.message);
      }
    }));
    el.createEl("h3", { text: "Dropbox" });
    renderCloudSettings(el, this.plugin);
    el.createEl("p", { cls: "tempvs-muted", text: "Lo storico delle sessioni rimane salvato per statistiche, backup e sincronizzazione, ma non \xE8 mostrato nel timer." });
  }
};
var TempvsPlugin = class extends import_obsidian5.Plugin {
  async onload() {
    try {
      const data = await this.loadData();
      if (data && !data.archive && !Array.isArray(data.sessions) && Object.keys(data).length)
        throw Error("Formato precedente non riconosciuto: nessun dato verr\xE0 sovrascritto.");
      this.state = normalizeArchive(data?.archive || (Array.isArray(data?.sessions) ? data : ZERO()));
      this.dailyNotes = Object.assign(/* @__PURE__ */ Object.create(null), data?.dailyNotes || {});
      this.cloudData = data?.cloudData && typeof data.cloudData === "object" ? data.cloudData : {};
      this.compact = typeof data?.ui?.compact === "boolean" ? data.ui.compact : import_obsidian5.Platform.isMobile;
      this.layout = ["auto", "side", "wide"].includes(data?.ui?.layout) ? data.ui.layout : "auto";
      this.timerStyle = ["digits", "ring"].includes(data?.ui?.timerStyle) ? data.ui.timerStyle : "bar";
      this.clockSize = ["small", "large"].includes(data?.ui?.clockSize) ? data.ui.clockSize : "medium";
      this.audioKind = ["white", "brown", "rain", "fire"].includes(data?.audio?.kind) ? data.audio.kind : "brown";
      const savedVolume = Number(data?.audio?.volume);
      this.audioVolume = data?.audio?.volume !== void 0 && Number.isFinite(savedVolume) ? Math.max(0, Math.min(100, Math.round(savedVolume))) : 25;
      this.chimeEnabled = data?.notifications?.sound !== false;
    } catch (error) {
      new import_obsidian5.Notice("TEMPVS: dati non validi, archivio lasciato intatto. " + error.message, 1e4);
      throw error;
    }
    this.ambient = new TempoAmbientAudio(() => this.refreshAudioControls());
    this.chime = new FocusEndChime();
    this.lastTick = Date.now();
    this.lastSave = Date.now();
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
    this.dirty = false;
    this.writeChain = Promise.resolve();
    this.cloudMessage = "Dropbox non collegato";
    this.cloudStorage = createCloudStorage(this.cloudData, () => {
      this.cloudDirty = true;
      clearTimeout(this.cloudSaveTimer);
      this.cloudSaveTimer = window.setTimeout(() => this.persist().catch((e) => new import_obsidian5.Notice("TEMPVS: errore nel salvataggio Dropbox: " + e.message)), 150);
    });
    this.cloud = createDropboxSync({
      getState: () => this.state,
      applyRemote: async (remote) => {
        this.record();
        const next = normalizeArchive(remote);
        const previous = this.state;
        this.state = next;
        try {
          await this.persist();
        } catch (error) {
          this.state = previous;
          throw error;
        }
        this.lastTick = Date.now();
        this.lastNoticeCheck = this.lastTick;
        this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastTick));
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.draw?.();
        this.syncAmbient();
        this.refresh(true);
        await this.daily?.reconcilePlans();
      },
      normalizeRemote: normalizeArchive,
      onStatus: (message, detail) => {
        this.cloudMessage = message;
        this.cloudInfo = detail;
        this.refresh(true);
      },
      resolveConflicts: (conflicts) => chooseTempvsConflicts(this.app, conflicts),
      platform: {
        storage: this.cloudStorage,
        transientStorage: this.cloudStorage,
        manualAuthorization: true,
        request: dropboxRequest,
        navigate: async (url) => {
          this.pendingAuthUrl = url;
          await this.persist();
        },
        isOnline: () => navigator.onLine !== false
      }
    });
    this.estimates = new NoteEstimates(this);
    this.registerEditorExtension?.(syntaxExtension());
    this.daily = new DailyBlocks(this);
    this.daily.start();
    this.registerView(VIEW_TYPE, (leaf) => new TempvsView(leaf, this));
    this.addSettingTab(new TempvsSettings(this.app, this));
    this.addCommand({ id: "open-tempvs", name: "Apri timer TEMPVS", callback: () => this.openView() });
    this.addCommand({ id: "pause-tempvs", name: "Pausa o riprendi TEMPVS", callback: () => this.togglePause().catch((e) => new import_obsidian5.Notice(e.message)) });
    this.addCommand({ id: "finish-tempvs", name: "Concludi sessione TEMPVS", callback: () => this.finish().catch((e) => new import_obsidian5.Notice(e.message)) });
    this.addCommand({ id: "link-current-note", name: "Collega nota attiva all'area della sessione", callback: async () => {
      const area = this.active()?.area;
      if (!area) {
        await this.openView();
        new import_obsidian5.Notice("Apri i dettagli TEMPVS e scegli l'area della nota.");
        return;
      }
      await this.attachActiveNote(area).catch((e) => new import_obsidian5.Notice(e.message));
    } });
    this.addCommand({ id: "toggle-compact-view", name: "Espandi o compatta il pannello TEMPVS", callback: () => this.setCompact(!this.compact) });
    this.addRibbonIcon("timer", "Apri TEMPVS", () => this.openView());
    if (!import_obsidian5.Platform.isMobile) {
      this.status = this.addStatusBarItem();
      this.status.addClass("tempvs-status");
      this.status.setAttribute("role", "button");
      this.status.setAttribute("tabindex", "0");
      this.status.addEventListener("click", () => this.openView());
      this.status.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.openView();
        }
      });
    }
    this.registerInterval(window.setInterval(() => this.tick(), 1e3));
    const armChime = () => {
      if (this.chimeEnabled) this.chime.arm();
    };
    this.registerDomEvent(document, "pointerdown", armChime);
    this.registerDomEvent(document, "touchstart", armChime);
    this.registerDomEvent(document, "keydown", armChime);
    this.registerDomEvent(document, "visibilitychange", () => {
      if (!document.hidden) {
        this.tick();
        this.syncAmbient();
        this.refresh(true);
      }
    });
    this.refresh(true);
    this.cloud.init().catch((error) => {
      this.cloudMessage = "Dropbox: " + error.message;
      this.refresh(true);
    });
  }
  get config() {
    return this.state.defaults.simple;
  }
  currentNoticePhase(now = /* @__PURE__ */ new Date()) {
    const active = getActiveSession(this.state.sessions.filter((s) => !s.finished), now);
    if (!active || active.paused) return null;
    const phase = getPhase(active, now);
    return { id: active.id, kind: phase.kind, start: +phase.start, area: active.area || active.title };
  }
  notifyPhaseTransition(nowMs = Date.now()) {
    const current = this.currentNoticePhase(new Date(nowMs));
    const previous = this.lastNotifiedPhase;
    const gap = nowMs - this.lastNoticeCheck;
    this.lastNotifiedPhase = current;
    this.lastNoticeCheck = nowMs;
    if (!current || !previous || current.id !== previous.id || current.kind === previous.kind || gap < 0 || gap > 8e3 || nowMs - current.start < 0 || nowMs - current.start > 8e3 || document.hidden) return;
    const message = current.kind === "break" ? "TEMPVS \xB7 Inizia la pausa \u2014 " + current.area : "TEMPVS \xB7 Riprende la concentrazione \u2014 " + current.area;
    new import_obsidian5.Notice(message, 6500);
    if (this.chimeEnabled) void this.chime.play(current.kind).catch((error) => console.warn("TEMPVS: avviso acustico non disponibile", error));
  }
  refreshAudioControls() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.updateSoundControls?.();
  }
  syncAmbient(now = /* @__PURE__ */ new Date()) {
    if (!this.ambient?.playing) return;
    const pending = this.state.sessions.filter((s) => !s.finished);
    const mode = getAmbientFocusMode(pending, now);
    const active = getActiveSession(pending, now);
    this.ambient.setAudible(mode === "focus" && !active?.paused);
    this.refreshAudioControls();
  }
  async toggleAmbient() {
    if (this.ambient.playing) {
      this.ambient.stop(0.9);
      return;
    }
    const active = this.active();
    const audible = Boolean(active && !active.paused && getPhase(active).kind === "work");
    const started = this.ambient.start(this.audioKind, this.audioVolume / 100, audible);
    if (!await started) new import_obsidian5.Notice("Impossibile avviare l'audio: verifica i permessi su Obsidian e iPadOS.");
    else this.syncAmbient();
  }
  async selectAmbient(kind) {
    if (!["white", "brown", "rain", "fire"].includes(kind)) return;
    this.audioKind = kind;
    const restarted = this.ambient.playing ? this.ambient.start(
      kind,
      this.audioVolume / 100,
      getAmbientFocusMode(this.state.sessions.filter((s) => !s.finished)) === "focus" && !this.active()?.paused
    ) : null;
    if (restarted && !await restarted) new import_obsidian5.Notice("Impossibile cambiare il rumore ambientale.");
    this.syncAmbient();
    await this.persist();
  }
  adjustAmbientVolume(value) {
    if (!Number.isFinite(value)) return;
    this.audioVolume = Math.max(0, Math.min(100, Math.round(value)));
    this.ambient.setVolume(this.audioVolume / 100);
  }
  active() {
    const session = getActiveSession(this.state.sessions.filter((s) => !s.finished));
    return session || null;
  }
  async openView(forceLayout = false) {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (forceLayout && leaf) {
      leaf.detach();
      leaf = null;
    }
    if (!leaf) {
      leaf = this.layout === "wide" ? this.app.workspace.getLeaf(true) : this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf(true);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
  openSettings() {
    this.app.setting?.open();
    this.app.setting?.openTabById(this.manifest.id);
  }
  refresh(full = false) {
    this.syncAmbient();
    const session = this.active();
    const phase = session ? getPhase(session) : null;
    if (this.status) {
      this.status.textContent = phase ? "TEMPVS \xB7 " + mmss(phase.remaining) + " \xB7 " + (session.area || session.title) : "TEMPVS \xB7 pronto";
      this.status.setAttribute("aria-label", "Apri TEMPVS");
    }
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.update?.(full);
    if (full) this.daily?.refresh();
  }
  record() {
    const now = Date.now();
    if (now <= this.lastTick) {
      this.lastTick = now;
      return;
    }
    for (const s of this.state.sessions) {
      const elapsed = measuredFocus(s, this.lastTick, now);
      if (elapsed > 0) {
        s.actualSeconds = (s.actualSeconds || 0) + elapsed;
        this.dirty = true;
      }
    }
    this.lastTick = now;
  }
  tick() {
    this.notifyPhaseTransition();
    this.record();
    const now = Date.now();
    if (this.dirty && now - this.lastSave >= 15e3) {
      this.persist().then(() => {
        this.cloud?.changed();
      }).catch((e) => new import_obsidian5.Notice("TEMPVS: salvataggio fallito: " + e.message));
      this.lastSave = now;
    }
    if (Math.floor(now / 15e3) !== Math.floor((now - 1e3) / 15e3)) this.daily?.refresh();
    this.refresh(Math.floor(now / 6e4) !== Math.floor((now - 1e3) / 6e4));
  }
  async persist() {
    const archive = JSON.parse(JSON.stringify(this.state));
    const cloudData = this.cloudStorage?.snapshot() || {};
    const audio = { kind: this.audioKind, volume: this.audioVolume };
    const notifications = { sound: this.chimeEnabled };
    const dailyNotes = JSON.parse(JSON.stringify(this.dailyNotes || {}));
    const write = this.writeChain.catch(() => {
    }).then(() => this.saveData({ archive, cloudData, ui: { compact: this.compact, layout: this.layout, timerStyle: this.timerStyle, clockSize: this.clockSize }, audio, notifications, dailyNotes }));
    this.writeChain = write;
    await write;
    if (JSON.stringify(this.state) === JSON.stringify(archive)) this.dirty = false;
    if (JSON.stringify(this.cloudStorage?.snapshot() || {}) === JSON.stringify(cloudData)) this.cloudDirty = false;
  }
  async change(mutator) {
    if (this.changing) throw Error("Salvataggio in corso. Attendi prima di riprovare.");
    this.changing = true;
    try {
      this.record();
      const previous = JSON.stringify(this.state);
      try {
        mutator();
        this.state = normalizeArchive(this.state);
        await this.persist();
      } catch (error) {
        this.state = JSON.parse(previous);
        this.refresh(true);
        throw error;
      }
      try {
        this.cloud?.changed();
        await this.persist();
      } catch (error) {
        new import_obsidian5.Notice("TEMPVS: dati salvati in locale; sincronizzazione da riprovare. " + error.message);
      }
      this.refresh(true);
    } finally {
      this.changing = false;
    }
    await this.daily?.archiveChanged();
  }
  setSessionNote(ids, input, options = {}) {
    const operation = (this.noteWrite || Promise.resolve()).then(() => this.applySessionNote(ids, input, options));
    this.noteWrite = operation.catch(() => {
    });
    return operation;
  }
  async applySessionNote(ids, input, options) {
    const updates = /* @__PURE__ */ new Map();
    for (const id of ids) {
      const session = this.state.sessions.find((s) => s.id === id);
      if (!session) throw Error("La sessione non \xE8 pi\xF9 disponibile.");
      const links = updatedSessionNotes(session, input, { ...options, replacePrimary: true, estimates: this.estimates?.notes || [] });
      updates.set(id, input.trim() ? links.slice(0, 1) : links);
    }
    const bindings = new Set(ids.map((id) => this.state.sessions.find((s) => s.id === id).noteBlockId).filter(Boolean));
    if (bindings.size) {
      if (bindings.size !== 1) throw Error("Modifica una giornata alla volta.");
      await this.daily.updateSessionNotes([...bindings][0], updates);
    } else await this.change(() => {
      for (const [id, notes] of updates) {
        const s = this.state.sessions.find((s2) => s2.id === id);
        s.linkedNotes = notes;
        delete s.noteEstimateId;
      }
    });
  }
  async setCompact(value) {
    this.compact = Boolean(value);
    await this.persist();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.draw?.();
  }
  async attachActiveNote(areaName) {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") throw Error("Apri prima una nota Markdown in Obsidian.");
    const area = this.config.areas.find((a) => a.name === areaName);
    if (!area) throw Error("Area TEMPVS non valida.");
    const updated = appendNoteLink(area.description, file.path);
    if (updated === area.description) {
      new import_obsidian5.Notice("Nota gi\xE0 collegata all'area.");
      return;
    }
    await this.change(() => {
      area.description = updated;
    });
    new import_obsidian5.Notice("Nota collegata all'area " + areaName + ".");
  }
  remapArea(from, to) {
    for (const session of this.state.sessions) {
      if (session.area === from) session.area = to;
      if (session.title === from) session.title = to;
    }
    for (const item of this.state.history || []) {
      if (item.area === from) item.area = to;
      if (item.title === from) item.title = to;
    }
    for (const task of this.state.tasks || []) if (task.area === from) task.area = to;
    if (this.state.appearance?.areaColors && Object.prototype.hasOwnProperty.call(this.state.appearance.areaColors, from)) {
      if (!Object.prototype.hasOwnProperty.call(this.state.appearance.areaColors, to))
        this.state.appearance.areaColors[to] = this.state.appearance.areaColors[from];
      delete this.state.appearance.areaColors[from];
    }
  }
  async start(area, gross, focus, pause) {
    if (!this.config.areas.some((a) => a.name === area)) throw Error("Area non valida.");
    if (!Number.isInteger(gross) || gross < 1 || gross > 1439) throw Error("Durata lorda non valida.");
    if (!Number.isInteger(focus) || focus < 1 || focus > 240) throw Error("Focus da 1 a 240 minuti.");
    if (pause !== void 0 && (!Number.isInteger(pause) || pause < 0 || pause >= gross)) throw Error("Pausa personalizzata non valida.");
    const start = /* @__PURE__ */ new Date(), end = manualSessionEnd(start, gross);
    const s = {
      id: uuid(),
      title: area,
      area,
      date: localDateString(start),
      start: formatTime(start),
      end: formatTime(end),
      timerStartedAt: start.toISOString(),
      timerEndsAt: end.toISOString(),
      workMinutes: focus,
      breakEnabled: pause === void 0 ? this.state.defaults.breakEnabled : pause > 0,
      actualSeconds: 0
    };
    if (pause !== void 0) s.customBreakMinutes = pause;
    if (hasSessionOverlaps([...this.state.sessions.filter((s2) => !s2.finished), s])) throw Error("Sessione sovrapposta a un'altra.");
    await this.change(() => this.state.sessions.push(s));
  }
  async schedule(text, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error("Data non valida.");
    const requests = parseQuick(text, this.config.areas);
    if (!requests.length) throw Error("Inserisci almeno una sessione.");
    if (requests.some((r) => !r.start)) throw Error("Per ora specifica +HH:MM per ogni sessione. Le fasce automatiche saranno aggiunte successivamente.");
    const result = planSessions(
      requests,
      [],
      this.state.sessions.filter((s) => !s.finished),
      this.state.defaults,
      /* @__PURE__ */ new Date(),
      uuid,
      date
    );
    if (result.remainder || !result.sessions?.length) throw Error("Programmazione incompleta.");
    await this.change(() => this.state.sessions.push(...result.sessions));
    new import_obsidian5.Notice("TEMPVS: " + result.sessions.length + " sessioni programmate.");
  }
  async togglePause() {
    const s = this.active();
    if (!s) throw Error("Nessuna sessione attiva.");
    await this.change(() => {
      s.paused = !s.paused;
    });
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
  }
  async finish() {
    const s = this.active();
    if (!s) throw Error("Nessuna sessione attiva.");
    await this.change(() => {
      s.finished = true;
      s.paused = false;
    });
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
  }
  async removeSession(id) {
    const s = this.state.sessions.find((s2) => s2.id === id);
    if (!s || s.finished || sessionBounds(s).start <= /* @__PURE__ */ new Date()) throw Error("Puoi eliminare solo sessioni future.");
    await this.change(() => {
      this.state.sessions = this.state.sessions.filter((item) => item.id !== id);
      this.state.syncDeleted.sessions.push(id);
    });
  }
  async cloudOperation(method, argument) {
    this.record();
    if (this.dirty) await this.persist();
    try {
      if (method === "firstSync") await this.cloud.firstSync(argument);
      else await this.cloud[method]();
      await this.persist();
      this.refresh(true);
    } catch (error) {
      await this.persist();
      this.refresh(true);
      throw error;
    }
  }
  async onunload() {
    this.daily?.destroy();
    await this.daily?.chain.catch(() => {
    });
    this.cloud?.destroy();
    this.chime?.destroy();
    this.ambient?.destroy();
    this.record();
    clearTimeout(this.cloudSaveTimer);
    if (this.dirty || this.cloudDirty) await this.persist().catch((e) => console.error("TEMPVS:", e));
    await this.writeChain.catch(() => {
    });
  }
};
