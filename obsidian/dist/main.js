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
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
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
var import_obsidian2 = require("obsidian");

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
function dateTime(date, time) {
  const [y, mo, d] = date.split("-").map(Number), [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}
function formatTime(date) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(date);
}
function pauseMinutes(work) {
  return Math.max(1, Math.round(work / 5));
}
function normalizeSession(session) {
  if (!session || typeof session !== "object" || Array.isArray(session)) return session;
  return { ...session, breakEnabled: session.breakEnabled !== void 0 ? Boolean(session.breakEnabled) : true };
}
function validSession(session) {
  if (!session || typeof session.id !== "string" || !session.id.trim() || typeof session.title !== "string" || !session.title.trim() || typeof session.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(session.date) || !Number.isInteger(session.workMinutes) || session.workMinutes < 1 || session.workMinutes > 240) return false;
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
  const workMs = session.workMinutes * 6e4;
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
  const breakMs = pauseMinutes(session.workMinutes) * 6e4;
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
  if (config.areas && (!Array.isArray(config.areas) || config.areas.some((a) => !a || typeof a.name !== "string" || !a.name.trim() || typeof a.description !== "string"))) throw Error("Aree non valide.");
  if (config.windows && (!Array.isArray(config.windows) || config.windows.some((w) => !validSession({ ...w, id: "window", title: "window", workMinutes: 25 })))) throw Error("Fasce non valide.");
  if (data.history && (!Array.isArray(data.history) || data.history.some((h) => !h || typeof h.sessionId !== "string" || !Number.isFinite(h.minutes) || h.minutes < 0))) throw Error("Storico non valido.");
  const names = [.../* @__PURE__ */ new Set(["Studio", "Lavoro", "Personale", ...data.sessions.map((s) => s.area || s.title)])];
  const storedAreas = config.areas || names.map((name) => ({ name, description: "" }));
  const areas = storedAreas.map((area) => ({
    ...area,
    color: normalizeAreaColor(area.color ?? data.appearance?.areaColors?.[area.name], area.name)
  }));
  return { ...data, sessions: data.sessions.map(normalizeSession), tasks: data.tasks || [], history: data.history || [], syncDeleted: data.syncDeleted || { tasks: [], sessions: [] }, defaults: { ...data.defaults, workMinutes: data.defaults?.workMinutes || 25, breakEnabled: data.defaults?.breakEnabled !== false, simple: { ...config, areas, windows: config.windows || [] } } };
}
function planSessions(requests, windows, existing, defaults, now = /* @__PURE__ */ new Date(), id = () => crypto.randomUUID(), selectedDate = localDateString(now)) {
  const result = [];
  let remainder = 0;
  const cycleFor = (request) => focusCycle(request.focusMinutes ?? defaults.workMinutes, defaults.breakEnabled).focusMinutes;
  for (const request of requests) {
    cycleFor(request);
    const pause = request.customBreakMinutes ?? defaults.customBreakMinutes;
    if (pause !== void 0) customPause(pause, request.minutes);
  }
  const applyPause = (request, sessions) => {
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
    const start = dateTime(selectedDate, request.start), end = new Date(+start + request.minutes * 6e4);
    const session = { id: id(), title: request.area, area: request.area, date: selectedDate, start: request.start, end: formatTime(end), workMinutes: cycleFor(request), breakEnabled: defaults.breakEnabled !== false, actualSeconds: 0 };
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
        result.push({ id: id(), title: request.area, area: request.area, date: localDateString(new Date(start)), start: formatTime(new Date(start)), end: formatTime(finish), workMinutes: cycleFor(request), breakEnabled: defaults.breakEnabled !== false, actualSeconds: 0 });
        left -= minutes;
        if (!left) break;
      }
      if (!left) break;
    }
    if (!left) applyPause(request, result.slice(first));
    remainder += left;
  }
  if (hasSessionOverlaps([...existing, ...result])) throw Error("Le sessioni si sovrappongono.");
  return { sessions: result, remainder };
}
function parseQuick(text, areas) {
  return text.trim().split("\n").filter((s) => s.trim()).map((line) => {
    const match = line.trim().match(/^(.+?)\s+@(\d+(?:[.,]\d+)?)\s*(h|min|m)(.*)$/i);
    if (!match) throw Error("Usa: Studio @2h +08:30 ~40m (orario e ciclo facoltativi).");
    const area = areas.find((a) => a.name.toLocaleLowerCase() === match[1].trim().toLocaleLowerCase());
    const minutes = Math.round(Number(match[2].replace(",", ".")) * (match[3].toLowerCase() === "h" ? 60 : 1));
    if (!area || minutes < 1 || minutes > 10080) throw Error("Controlla area e durata lorda (da 1 minuto a 168 ore).");
    let start, focusMinutes, customBreakMinutes;
    for (const token of match[4].trim().split(/\s+/).filter(Boolean)) {
      if (/^\+([01]\d|2[0-3]):[0-5]\d$/.test(token) && !start)
        start = token.slice(1);
      else if (/^~\d{1,3}m?$/i.test(token) && focusMinutes === void 0)
        focusMinutes = focusCycle(Number(token.slice(1).replace(/m$/i, ""))).focusMinutes;
      else if (/^!\d{1,4}m?$/i.test(token) && customBreakMinutes === void 0)
        customBreakMinutes = customPause(Number(token.slice(1).replace(/m$/i, "")), minutes);
      else throw Error("Opzione non valida: " + token + ". Usa +HH:MM, ~40m e/o !5m per la pausa personalizzata.");
    }
    return { area: area.name, minutes, ...start ? { start } : {}, ...focusMinutes !== void 0 ? { focusMinutes } : {}, ...customBreakMinutes !== void 0 ? { customBreakMinutes } : {} };
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

// core/tempo-merge.js
var absent = Symbol("missing");
var has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
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
  const chosen = (key, section, label, left, right, options = null) => {
    const optionsList = options || [
      { value: "local", label: "Conserva questo dispositivo" },
      { value: "remote", label: "Conserva Dropbox" }
    ];
    const value = choices[key];
    if (optionsList.some((option) => option.value === value)) return value;
    conflicts.push({
      key,
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
  const field = (baseValue, localValue, remoteValue, key, section, label) => {
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
          key + "." + property,
          section,
          label + " \xB7 " + property
        );
        if (value !== absent) output[property] = value;
      }
      return output;
    }
    const answer = chosen(key, section, label, localValue, remoteValue);
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
  const finalDeleted = { tasks: /* @__PURE__ */ new Set(), sessions: /* @__PURE__ */ new Set() };
  function collection(name) {
    const b = mapById(snapshotList(base, name), name);
    const l = mapById(snapshotList(local, name), name);
    const r = mapById(snapshotList(remote, name), name);
    const bDel = deleted(base, name), lDel = deleted(local, name), rDel = deleted(remote, name);
    const allIds = /* @__PURE__ */ new Set([
      ...b.keys(),
      ...l.keys(),
      ...r.keys(),
      ...name === "history" ? [] : [...bDel, ...lDel, ...rDel]
    ]);
    const out = [];
    for (const id of allIds) {
      const bp = b.has(id), lp = l.has(id), rp = r.has(id);
      const bv = bp ? b.get(id) : absent, lv = lp ? l.get(id) : absent, rv = rp ? r.get(id) : absent;
      const label = choiceLabel(name, name === "history" ? id : (l.get(id) || r.get(id) || b.get(id))?.title || id, "");
      let result = absent;
      if (lp && rp) {
        if ((lDel.has(id) || rDel.has(id)) && !bp) {
          const key = name + ":" + id + ":delete";
          const answer = chosen(key, name, label + " \xB7 eliminazione", lv, rv);
          result = answer === "remote" ? rv : lv;
        } else result = field(bv, lv, rv, name + ":" + id, name, label);
      } else if (lp || rp) {
        const present = lp ? lv : rv;
        const missingIsDeletion = bp || (lp ? rDel.has(id) : lDel.has(id));
        if (!missingIsDeletion || name === "history") result = present;
        else if (bp && same(present, bv)) result = absent;
        else {
          const key = name + ":" + id + ":exists";
          const answer = chosen(key, name, label + " \xB7 modifica o eliminazione", lv, rv);
          result = answer === "remote" ? rv : lv;
        }
      }
      if (result !== absent) out.push(result);
      else if (name !== "history" && (bp || lDel.has(id) || rDel.has(id))) finalDeleted[name].add(id);
    }
    return out;
  }
  merged.tasks = collection("tasks");
  merged.sessions = collection("sessions");
  merged.history = collection("history");
  const active = new Map(merged.sessions.map((s) => [s.id, s]));
  const sorted = [...active.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
    const a = sorted[i], b = sorted[j];
    if (!active.has(a.id) || !active.has(b.id)) continue;
    if (!isOverlap(a, b)) continue;
    const key = "overlap:" + [a.id, b.id].sort().join(":");
    const decision = chosen(key, "sessions", "Sessioni sovrapposte \xB7 " + a.date + " " + a.start + "\u2013" + a.end + " (" + a.title + ") / " + b.date + " " + b.start + "\u2013" + b.end + " (" + b.title + ")", a, b, [
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
    sessions: [...finalDeleted.sessions].sort()
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
  throw error;
}
function createDropboxSync({ getState, applyRemote, normalizeRemote, onStatus, resolveConflicts, platform = {} }) {
  const storage = platform.storage ?? globalThis.localStorage;
  const request = platform.request ?? fetch;
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
  let inFlight = null, delay = null, overridePending = false;
  const syncState = (data) => ({
    sessions: data?.sessions || [],
    tasks: data?.tasks || [],
    history: data?.history || [],
    defaults: data?.defaults || {},
    appearance: data?.appearance || {},
    syncDeleted: {
      tasks: data?.syncDeleted?.tasks || [],
      sessions: data?.syncDeleted?.sessions || []
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
  const status = (message, phase = "idle") => onStatus(message, { connected: Boolean(auth.refreshToken), dirty: meta.dirty, ready: meta.ready, phase, busy: ["checking", "uploading", "downloading", "merging"].includes(phase) });
  const storeMeta = () => write(META_KEY, meta);
  const storeAuth = () => write(AUTH_KEY, auth);
  const snapshot = (data = current()) => ({
    app: "Tempo Pomodoro",
    version: 5,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...syncState(data)
  });
  function changed() {
    meta.dirty = true;
    storeMeta();
    status("Modifiche locali in attesa di caricamento", "pending");
    clearTimeout(delay);
    if (meta.ready && auth.refreshToken) delay = setTimeout(() => {
      sync().catch((e) => status(e.message));
    }, 2500);
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
    if (!data.refresh_token) throw Error("Dropbox non ha restituito un refresh token.");
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
    if (!data.refresh_token) throw new Error("Dropbox non ha restituito un refresh token.");
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
    return response.json();
  }
  async function download() {
    const response = await fail(await request(CONTENT + "/2/files/download", { method: "POST", headers: { "Authorization": "Bearer " + await token(), "Dropbox-API-Arg": JSON.stringify({ path: FILE }) } }));
    const file = await response.json();
    if (!file || !Array.isArray(file.sessions) || !Array.isArray(file.tasks) || !Array.isArray(file.history)) throw new Error("Il backup Dropbox non \xE8 valido.");
    const info2 = JSON.parse(response.headers.get("Dropbox-API-Result") || "{}");
    if (!info2.rev) throw new Error("Revisione Dropbox assente.");
    return { file: normalizeRemote ? normalizeRemote(file) : syncState(file), rev: info2.rev };
  }
  async function upload(expectedRev, data = current()) {
    const mode = expectedRev ? { ".tag": "update", update: expectedRev } : "add";
    const response = await request(CONTENT + "/2/files/upload", { method: "POST", headers: {
      "Authorization": "Bearer " + await token(),
      "Dropbox-API-Arg": JSON.stringify({ path: FILE, mode, autorename: false, strict_conflict: true, mute: true }),
      "Content-Type": "application/octet-stream"
    }, body: JSON.stringify(snapshot(data)) });
    if (response.status === 409) throw new Error("Dropbox \xE8 cambiato durante la sincronizzazione. Riprova l'unione; nessun archivio locale \xE8 stato sostituito.");
    await fail(response);
    const info2 = await response.json();
    if (!info2.rev) throw new Error("Dropbox non ha restituito una revisione del backup.");
    return info2.rev;
  }
  function synced(data, rev) {
    saveBase(data);
    meta.rev = rev;
    meta.ready = true;
    meta.dirty = stateJSON(current()) !== stateJSON(data);
    storeMeta();
    status(
      meta.dirty ? "Altre modifiche locali da sincronizzare" : "Dropbox sincronizzato",
      meta.dirty ? "pending" : "idle"
    );
    if (meta.dirty) {
      clearTimeout(delay);
      delay = setTimeout(() => sync().catch((e) => status(e.message, "error")), 2500);
    }
  }
  async function adopt(data, rev, original = current()) {
    if (stateJSON(current()) !== stateJSON(original))
      throw new Error("Dati locali cambiati durante il download. Riprova la sincronizzazione.");
    backupBeforeReplacement(data);
    await applyRemote(data);
    synced(data, rev);
  }
  async function applyMerged(item, { manual = false } = {}) {
    if (overridePending && !manual) return false;
    const local = current(), base = baseline();
    let decisions = {}, result = mergeSnapshots(base, local, item.file, decisions);
    if (result.conflicts.length && !manual) {
      meta.dirty = true;
      storeMeta();
      status(result.conflicts.length + " conflitti da risolvere: usa \xABUnisci e sincronizza\xBB.", "error");
      return false;
    }
    let rounds = 0;
    while (result.conflicts.length) {
      if (!resolveConflicts) throw new Error("Risoluzione dei conflitti non disponibile.");
      if (++rounds > 6) throw new Error("Troppi conflitti consecutivi: esporta un backup e riprova.");
      status("Scelta delle modifiche da conservare\u2026", "merging");
      const selected = await resolveConflicts(result.conflicts);
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
      return true;
    }
    await applyRemote(merged);
    synced(merged, revision);
    status(meta.dirty ? "Unione salvata su Dropbox; nuove modifiche locali ancora da inviare." : "Archivi uniti e sincronizzati.", meta.dirty ? "pending" : "idle");
    return true;
  }
  async function firstSync(direction) {
    if (!auth.refreshToken) throw new Error("Collega prima Dropbox.");
    if (meta.ready) throw new Error("Sincronizzazione gi\xE0 inizializzata.");
    if (!isOnline()) throw new Error("Connessione assente.");
    if (direction === "merge") return mergeNow();
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
  }
  async function sync() {
    if (overridePending) return;
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
      status(e.message, "error");
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
      if (meta.dirty && meta.ready) {
        clearTimeout(delay);
        delay = setTimeout(() => sync().catch((e) => status(e.message, "error")), 2500);
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
    }
  }
  async function forceDownload(allowDirty = false) {
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
      synced(item.file, item.rev);
      status("Archivio Dropbox scaricato.");
    } finally {
      overridePending = false;
    }
  }
  function disconnect() {
    clearTimeout(delay);
    auth = {};
    meta = { rev: null, dirty: false, ready: false };
    storage.removeItem(AUTH_KEY);
    storage.removeItem(META_KEY);
    storage.removeItem(BASE_KEY);
    status("Dropbox scollegato. Dati locali conservati.");
  }
  function info() {
    return { connected: Boolean(auth.refreshToken), ready: meta.ready, dirty: meta.dirty };
  }
  async function init() {
    await callback();
    status(auth.refreshToken ? meta.ready ? "Dropbox connesso" : "Dropbox collegato: inizializzazione necessaria" : "Dropbox non collegato");
    if (meta.ready) await sync().catch(() => {
    });
  }
  return { init, connect, exchangeManualCode, firstSync, sync, changed, mergeNow, forceUpload, forceDownload, disconnect, info, recovery };
}

// obsidian/cloud-adapter.js
var import_obsidian = require("obsidian");
async function dropboxRequest(url, options = {}) {
  const headers = { ...options.headers || {} };
  let body = options.body;
  if (body instanceof URLSearchParams) {
    body = body.toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const response = await (0, import_obsidian.requestUrl)({
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
      const key = Object.keys(response.headers || {}).find((k) => k.toLowerCase() === name.toLowerCase());
      return key ? response.headers[key] : null;
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
var TempvsConflictModal = class extends import_obsidian.Modal {
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
      const row = parent.createDiv({ cls: "tempvs-conflict" });
      row.createEl("strong", { text: conflict.label || conflict.key });
      row.createEl("small", { text: "Dispositivo: " + String(conflict.localPreview ?? "\u2014").slice(0, 180) });
      row.createEl("small", { text: "Dropbox: " + String(conflict.remotePreview ?? "\u2014").slice(0, 180) });
      const select = row.createEl("select", { attr: { "aria-label": conflict.label || conflict.key } });
      select.createEl("option", { text: "Scegli una versione", attr: { value: "" } });
      for (const option of conflict.options || []) select.createEl("option", { text: option.label, attr: { value: option.value } });
      selects.push({ key: conflict.key, select });
    }
    const controls = parent.createDiv({ cls: "tempvs-controls" });
    const ok = controls.createEl("button", { text: "Conferma l'unione", cls: "mod-cta" });
    ok.addEventListener("click", () => {
      if (selects.some((item) => !item.select.value)) {
        new import_obsidian.Notice("Seleziona una versione per ogni conflitto.");
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
    class Confirmation extends import_obsidian.Modal {
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
    const key = target.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ path: target, label: String(label || target).trim() || target });
  };
  for (const m of String(description).matchAll(wiki)) {
    const [path, alias] = m[1].split("|");
    add(path?.split("#")[0], alias || path);
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
        if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = "playback";
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
      const duration = Math.max(0, audible ? 0.35 : fadeSeconds);
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(audible ? this.volume : 0, now + duration);
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

// obsidian/main.js
var VIEW_TYPE = "tempvs-timer";
var ZERO = () => normalizeArchive({ sessions: [] });
var uuid = () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + "-" + Math.random().toString(36).slice(2);
var button = (parent, label, action) => {
  const el = parent.createEl("button", { text: label });
  el.addEventListener("click", () => Promise.resolve().then(action).catch((e) => new import_obsidian2.Notice(e.message)));
  return el;
};
var today = () => localDateString();
var shiftDate = (value, change) => {
  const d = /* @__PURE__ */ new Date(value + "T12:00:00");
  if (Number.isNaN(d.getTime())) return today();
  d.setDate(d.getDate() + change);
  return localDateString(d);
};
var iconButton = (parent, icon, label, action) => {
  const el = parent.createEl("button", { cls: "tempvs-icon-button", attr: { "aria-label": label, "title": label } });
  (0, import_obsidian2.setIcon)(el, icon);
  el.addEventListener("click", () => Promise.resolve().then(action).catch((e) => new import_obsidian2.Notice(e.message)));
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
  const key = cloud.createEl("input", { attr: { "aria-label": "Dropbox App key", placeholder: "App key Dropbox" } });
  const link = cloud.createEl("a", { text: "Apri autorizzazione Dropbox", href: "#", cls: "tempvs-cloud-link" });
  link.hidden = true;
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener noreferrer");
  button(cloud, "1. Autorizza su Dropbox", async () => {
    const url = await plugin.cloud.connect(key.value);
    link.href = url;
    link.hidden = false;
    await plugin.persist();
    new import_obsidian2.Notice("Autorizza TEMPVS su Dropbox e copia il codice mostrato.");
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
var TempvsView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.day = today();
    this.panel = null;
    this.creation = "start";
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
    heading.createEl("h3", { text: "TEMPVS" });
    const actions = heading.createDiv({ cls: "tempvs-heading-actions" });
    const cloud = iconButton(actions, "cloud", "Impostazioni Dropbox", () => plugin.openSettings());
    cloud.addClass("tempvs-cloud-indicator");
    iconButton(actions, "settings", "Impostazioni TEMPVS", () => plugin.openSettings());
    const timer = root.createDiv({ cls: "tempvs-timer" });
    timer.createDiv({ cls: "tempvs-phase" });
    timer.createDiv({ cls: "tempvs-clock" });
    timer.createDiv({ cls: "tempvs-area" });
    const controls = root.createDiv({ cls: "tempvs-controls tempvs-primary-controls" });
    const pauseButton = button(controls, "Pausa", () => plugin.togglePause());
    pauseButton.addClass("mod-cta", "tempvs-pause-button");
    const finishButton = button(controls, "Concludi", () => plugin.finish());
    finishButton.addClass("tempvs-finish-button");
    const sessionHeader = root.createDiv({ cls: "tempvs-section-heading" });
    sessionHeader.createEl("h4", { text: "Prossime sessioni" });
    const nav = sessionHeader.createDiv({ cls: "tempvs-date-nav" });
    iconButton(nav, "chevron-left", "Giorno precedente", () => {
      this.day = shiftDate(this.day, -1);
      this.update(true);
    });
    const dateLabel = nav.createEl("button", { cls: "tempvs-day-label", text: "Oggi" });
    dateLabel.onclick = () => {
      this.day = today();
      this.update(true);
    };
    iconButton(nav, "chevron-right", "Giorno successivo", () => {
      this.day = shiftDate(this.day, 1);
      this.update(true);
    });
    root.createDiv({ cls: "tempvs-sessions" });
    const add = button(root, "+ Nuova sessione", () => this.togglePanel("create"));
    add.addClass("mod-cta", "tempvs-add-button");
    const quickActions = root.createDiv({ cls: "tempvs-shortcuts" });
    const planShortcut = iconButton(quickActions, "calendar-days", "Pianifica", () => {
      this.creation = "plan";
      this.togglePanel("create", true);
      this.showCreation();
    });
    planShortcut.createSpan({ text: "Pianifica" });
    const soundShortcut = iconButton(quickActions, "volume-2", "Suoni", () => this.togglePanel("sound"));
    soundShortcut.createSpan({ text: "Suoni" });
    const noteShortcut = iconButton(quickActions, "book-open", "Risorse Obsidian", () => this.togglePanel("notes"));
    noteShortcut.createSpan({ text: "Risorse" });
    const panels = root.createDiv({ cls: "tempvs-panels" });
    const create = panels.createDiv({ cls: "tempvs-panel tempvs-create-panel" });
    create.hidden = true;
    create.createEl("h4", { text: "Nuova sessione" });
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
    const area = form.createEl("select", { attr: { "aria-label": "Area" } });
    for (const a of plugin.config.areas) area.createEl("option", { text: a.name, attr: { value: a.name } });
    const gross = form.createEl("input", { attr: { type: "number", min: "1", max: "1439", value: "30", "aria-label": "Durata lorda in minuti", placeholder: "Minuti lordi" } });
    gross.required = true;
    const advanced = form.createEl("details");
    advanced.createEl("summary", { text: "Focus e pause (avanzate)" });
    const focus = advanced.createEl("input", { attr: { type: "number", min: "1", max: "240", value: String(plugin.state.defaults.workMinutes), "aria-label": "Minuti focus" } });
    focus.required = true;
    const pause = advanced.createEl("input", { attr: { type: "number", min: "0", max: "1438", placeholder: "Pausa personalizzata (facoltativa)", "aria-label": "Minuti di pausa" } });
    form.createEl("button", { text: "Avvia", cls: "mod-cta", attr: { type: "submit" } });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      plugin.start(area.value, Number(gross.value), Number(focus.value), pause.value === "" ? void 0 : Number(pause.value)).then(() => this.togglePanel(null, true)).catch((err) => new import_obsidian2.Notice(err.message));
    });
    const planBox = create.createDiv({ cls: "tempvs-method-plan" });
    const plan = planBox.createEl("form", { cls: "tempvs-form" });
    const dateInput = plan.createEl("input", { attr: { type: "date", "aria-label": "Data", value: today() } });
    const lines = plan.createEl("textarea", { attr: { "aria-label": "Sessioni", placeholder: "Studio @1,5h +16:00\nLavoro @45m +18:00 !5m", rows: "3" } });
    plan.createEl("button", { text: "Programma", cls: "mod-cta", attr: { type: "submit" } });
    plan.addEventListener("submit", (e) => {
      e.preventDefault();
      plugin.schedule(lines.value, dateInput.value).then(() => {
        lines.value = "";
        this.day = dateInput.value;
        this.togglePanel(null, true);
      }).catch((err) => new import_obsidian2.Notice(err.message));
    });
    const sounds = panels.createDiv({ cls: "tempvs-panel tempvs-sound-panel" });
    sounds.hidden = true;
    sounds.createEl("h4", { text: "Suoni di sottofondo" });
    sounds.createEl("p", { cls: "tempvs-help", text: "Il suono parte con un tocco durante il focus, si silenzia nelle pause e termina con una dissolvenza." });
    const soundChoice = sounds.createEl("select", { cls: "tempvs-sound-choice", attr: { "aria-label": "Rumore ambientale" } });
    for (const [value, label] of [["white", "Rumore bianco"], ["brown", "Rumore marrone"], ["rain", "Pioggia"], ["fire", "Caminetto"]]) soundChoice.createEl("option", { value, text: label });
    soundChoice.value = plugin.audioKind;
    soundChoice.addEventListener("change", () => void plugin.selectAmbient(soundChoice.value).catch((e) => new import_obsidian2.Notice(e.message)));
    const soundVolume = sounds.createDiv({ cls: "tempvs-sound-volume" });
    soundVolume.createEl("label", { text: "Volume", attr: { for: "tempvs-volume" } });
    const slider = soundVolume.createEl("input", { cls: "tempvs-volume-slider", attr: { type: "range", id: "tempvs-volume", min: "0", max: "100", step: "1", "aria-label": "Volume audio" } });
    slider.value = String(plugin.audioVolume);
    slider.addEventListener("input", () => plugin.adjustAmbientVolume(Number(slider.value)));
    slider.addEventListener("change", () => void plugin.persist().catch((e) => new import_obsidian2.Notice(e.message)));
    const soundToggle = sounds.createEl("button", { cls: "tempvs-sound-toggle mod-cta", text: "Avvia suono" });
    soundToggle.addEventListener("click", () => void plugin.toggleAmbient().catch((e) => new import_obsidian2.Notice(e.message)));
    sounds.createDiv({ cls: "tempvs-sound-status", attr: { role: "status", "aria-live": "polite" } });
    const notes = panels.createDiv({ cls: "tempvs-panel tempvs-notes-panel" });
    notes.hidden = true;
    notes.createEl("h4", { text: "Risorse Obsidian" });
    const noteArea = notes.createEl("select", { cls: "tempvs-note-area", attr: { "aria-label": "Area delle note" } });
    const initialArea = plugin.active()?.area || plugin.config.areas[0]?.name;
    for (const a of plugin.config.areas) noteArea.createEl("option", { text: a.name, attr: { value: a.name } });
    if (initialArea) noteArea.value = initialArea;
    noteArea.onchange = () => this.renderNotes();
    button(notes, "Collega nota attiva all'area", async () => {
      await plugin.attachActiveNote(noteArea.value);
      this.renderNotes();
    });
    notes.createDiv({ cls: "tempvs-note-links" });
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
  }
  togglePanel(panel, force = false) {
    this.panel = force ? panel : this.panel === panel ? null : panel;
    this.applyPanel();
  }
  applyPanel() {
    const root = this.containerEl.children[1];
    for (const name of ["create", "sound", "notes"]) {
      const el = root.querySelector(".tempvs-" + name + "-panel");
      if (el) setPanel(el, this.panel === name);
    }
  }
  updateSoundControls() {
    const root = this.containerEl.children[1], plugin = this.plugin;
    if (!root?.hasClass("tempvs-root")) return;
    const active = plugin.active();
    const eligible = Boolean(active && !active.paused && getPhase(active).kind === "work");
    const toggle = root.querySelector(".tempvs-sound-toggle");
    if (toggle) {
      toggle.disabled = !plugin.ambient.playing && !eligible;
      toggle.textContent = plugin.ambient.playing ? "Ferma suono" : "Avvia suono";
    }
    const status = root.querySelector(".tempvs-sound-status");
    if (status) status.textContent = plugin.ambient.playing ? plugin.ambient.audible ? "Suono attivo" : "In attesa della concentrazione" : eligible ? "Pronto" : "Disponibile durante la concentrazione";
  }
  renderNotes() {
    const root = this.containerEl.children[1];
    const area = root.querySelector(".tempvs-note-area")?.value;
    const list = root.querySelector(".tempvs-note-links");
    if (!list) return;
    list.empty();
    const description = this.plugin.config.areas.find((a) => a.name === area)?.description || "";
    const links = noteLinks(description);
    if (!links.length) {
      list.createEl("p", { text: "Nessuna nota collegata." });
      return;
    }
    for (const link of links) button(list, link.label, () => this.plugin.app.workspace.openLinkText(link.path, "", false));
  }
  update(full = false) {
    const root = this.containerEl.children[1];
    if (!root?.hasClass("tempvs-root")) return;
    const plugin = this.plugin;
    const active = plugin.active();
    const phase = active ? getPhase(active) : null;
    root.querySelector(".tempvs-phase").textContent = phase ? phase.label : "Nessuna sessione attiva";
    root.querySelector(".tempvs-clock").textContent = phase ? mmss(phase.remaining) : "--:--";
    root.querySelector(".tempvs-area").textContent = active ? active.area || active.title : "";
    const pause = root.querySelector(".tempvs-pause-button");
    const finish = root.querySelector(".tempvs-finish-button");
    if (pause) {
      pause.disabled = !active;
      pause.textContent = active?.paused ? "Riprendi" : "Pausa";
    }
    if (finish) finish.disabled = !active;
    this.updateSoundControls();
    const cloud = root.querySelector(".tempvs-cloud-indicator");
    if (cloud) {
      const status = plugin.cloudMessage || "Dropbox non collegato";
      cloud.title = status;
      cloud.setAttribute("aria-label", status + " \u2014 Apri impostazioni");
      cloud.toggleClass("tempvs-cloud-error", /errore|error|fallit/i.test(status));
    }
    if (!full) return;
    const dayLabel = root.querySelector(".tempvs-day-label");
    if (dayLabel) dayLabel.textContent = this.day === today() ? "Oggi" : this.day.split("-").reverse().join("/");
    const list = root.querySelector(".tempvs-sessions");
    list.empty();
    const now = /* @__PURE__ */ new Date();
    const sessions = plugin.state.sessions.filter((s) => {
      if (s.finished || sessionBounds(s).end <= now) return false;
      return s.date === this.day || this.day === today() && sessionBounds(s).start <= now && sessionBounds(s).end > now;
    }).sort((a, b) => sessionBounds(a).start - sessionBounds(b).start);
    for (const s of sessions) {
      const item = list.createDiv({ cls: "tempvs-session" });
      const info = item.createDiv({ cls: "tempvs-session-info" });
      info.createEl("strong", { text: s.start + "\u2013" + s.end });
      info.createSpan({ text: s.area || s.title });
      if (sessionBounds(s).start > now)
        iconButton(item, "trash-2", "Elimina sessione " + (s.area || s.title), () => plugin.removeSession(s.id));
    }
    if (!sessions.length) list.createEl("p", { cls: "tempvs-muted", text: "Nessuna sessione prevista per questa data." });
    if (this.panel === "notes") this.renderNotes();
  }
};
var TempvsSettings = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const el = this.containerEl;
    el.empty();
    el.createEl("h2", { text: "TEMPVS \u2014 Impostazioni" });
    new import_obsidian2.Setting(el).setName("Layout del timer").setDesc("Automatico, pannello laterale oppure scheda ampia su iPad e desktop.").addDropdown((d) => d.addOptions({ auto: "Automatico", side: "Pannello laterale", wide: "Scheda ampia" }).setValue(this.plugin.layout).onChange(async (v) => {
      this.plugin.layout = v;
      await this.plugin.persist();
      await this.plugin.openView(true);
    }));
    new import_obsidian2.Setting(el).setName("Minuti focus predefiniti").addText((t) => t.setValue(String(this.plugin.state.defaults.workMinutes)).onChange(async (v) => {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1 && n <= 240)
        await this.plugin.change(() => {
          this.plugin.state.defaults.workMinutes = n;
        });
    }));
    new import_obsidian2.Setting(el).setName("Pause automatiche").addToggle((t) => t.setValue(Boolean(this.plugin.state.defaults.breakEnabled)).onChange(async (v) => this.plugin.change(() => {
      this.plugin.state.defaults.breakEnabled = v;
    })));
    el.createEl("h3", { text: "Dropbox" });
    renderCloudSettings(el, this.plugin);
    el.createEl("p", { cls: "tempvs-muted", text: "Lo storico delle sessioni rimane salvato per statistiche, backup e sincronizzazione, ma non \xE8 mostrato nel timer." });
  }
};
var TempvsPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    try {
      const data = await this.loadData();
      if (data && !data.archive && !Array.isArray(data.sessions) && Object.keys(data).length)
        throw Error("Formato precedente non riconosciuto: nessun dato verr\xE0 sovrascritto.");
      this.state = normalizeArchive(data?.archive || (Array.isArray(data?.sessions) ? data : ZERO()));
      this.cloudData = data?.cloudData && typeof data.cloudData === "object" ? data.cloudData : {};
      this.compact = typeof data?.ui?.compact === "boolean" ? data.ui.compact : import_obsidian2.Platform.isMobile;
      this.layout = ["auto", "side", "wide"].includes(data?.ui?.layout) ? data.ui.layout : "auto";
      this.audioKind = ["white", "brown", "rain", "fire"].includes(data?.audio?.kind) ? data.audio.kind : "brown";
      const savedVolume = Number(data?.audio?.volume);
      this.audioVolume = data?.audio?.volume !== void 0 && Number.isFinite(savedVolume) ? Math.max(0, Math.min(100, Math.round(savedVolume))) : 25;
    } catch (error) {
      new import_obsidian2.Notice("TEMPVS: dati non validi, archivio lasciato intatto. " + error.message, 1e4);
      throw error;
    }
    this.ambient = new TempoAmbientAudio(() => this.refreshAudioControls());
    this.lastTick = Date.now();
    this.lastSave = Date.now();
    this.dirty = false;
    this.writeChain = Promise.resolve();
    this.cloudMessage = "Dropbox non collegato";
    this.cloudStorage = createCloudStorage(this.cloudData, () => {
      this.cloudDirty = true;
      clearTimeout(this.cloudSaveTimer);
      this.cloudSaveTimer = window.setTimeout(() => this.persist().catch((e) => new import_obsidian2.Notice("TEMPVS: errore nel salvataggio Dropbox: " + e.message)), 150);
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
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.draw?.();
        this.syncAmbient();
        this.refresh(true);
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
    this.registerView(VIEW_TYPE, (leaf) => new TempvsView(leaf, this));
    this.addSettingTab(new TempvsSettings(this.app, this));
    this.addCommand({ id: "open-tempvs", name: "Apri timer TEMPVS", callback: () => this.openView() });
    this.addCommand({ id: "pause-tempvs", name: "Pausa o riprendi TEMPVS", callback: () => this.togglePause().catch((e) => new import_obsidian2.Notice(e.message)) });
    this.addCommand({ id: "finish-tempvs", name: "Concludi sessione TEMPVS", callback: () => this.finish().catch((e) => new import_obsidian2.Notice(e.message)) });
    this.addCommand({ id: "link-current-note", name: "Collega nota attiva all'area della sessione", callback: async () => {
      const area = this.active()?.area;
      if (!area) {
        await this.openView();
        new import_obsidian2.Notice("Apri i dettagli TEMPVS e scegli l'area della nota.");
        return;
      }
      await this.attachActiveNote(area).catch((e) => new import_obsidian2.Notice(e.message));
    } });
    this.addCommand({ id: "toggle-compact-view", name: "Espandi o compatta il pannello TEMPVS", callback: () => this.setCompact(!this.compact) });
    this.addRibbonIcon("timer", "Apri TEMPVS", () => this.openView());
    if (!import_obsidian2.Platform.isMobile) {
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
  refreshAudioControls() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.updateSoundControls?.();
  }
  syncAmbient(now = /* @__PURE__ */ new Date()) {
    if (!this.ambient?.playing) return;
    const pending = this.state.sessions.filter((s) => !s.finished);
    const mode = getAmbientFocusMode(pending, now);
    if (mode === "finished") {
      this.ambient.stop(0.9);
      return;
    }
    const active = getActiveSession(pending, now);
    this.ambient.setAudible(mode === "focus" && !active?.paused);
  }
  async toggleAmbient() {
    if (this.ambient.playing) {
      this.ambient.stop(0.9);
      return;
    }
    const active = this.active();
    if (!active || active.paused || getPhase(active).kind !== "work") {
      new import_obsidian2.Notice("Avvia il suono durante una sessione di concentrazione non in pausa.");
      return;
    }
    const started = this.ambient.start(this.audioKind, this.audioVolume / 100, true);
    if (!await started) new import_obsidian2.Notice("Impossibile avviare l'audio: verifica i permessi su Obsidian e iPadOS.");
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
    if (restarted && !await restarted) new import_obsidian2.Notice("Impossibile cambiare il rumore ambientale.");
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
    this.record();
    const now = Date.now();
    if (this.dirty && now - this.lastSave >= 15e3) {
      this.persist().then(() => {
        this.cloud?.changed();
      }).catch((e) => new import_obsidian2.Notice("TEMPVS: salvataggio fallito: " + e.message));
      this.lastSave = now;
    }
    this.refresh(Math.floor(now / 6e4) !== Math.floor((now - 1e3) / 6e4));
  }
  async persist() {
    const archive = JSON.parse(JSON.stringify(this.state));
    const cloudData = this.cloudStorage?.snapshot() || {};
    const audio = { kind: this.audioKind, volume: this.audioVolume };
    const write = this.writeChain.catch(() => {
    }).then(() => this.saveData({ archive, cloudData, ui: { compact: this.compact, layout: this.layout }, audio }));
    this.writeChain = write;
    await write;
    if (JSON.stringify(this.state) === JSON.stringify(archive)) this.dirty = false;
    if (JSON.stringify(this.cloudStorage?.snapshot() || {}) === JSON.stringify(cloudData)) this.cloudDirty = false;
  }
  async change(mutator) {
    this.record();
    const previous = JSON.stringify(this.state);
    try {
      mutator();
      await this.persist();
      this.cloud?.changed();
      await this.persist();
      this.refresh(true);
    } catch (error) {
      this.state = JSON.parse(previous);
      this.refresh(true);
      throw error;
    }
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
      new import_obsidian2.Notice("Nota gi\xE0 collegata all'area.");
      return;
    }
    await this.change(() => {
      area.description = updated;
    });
    new import_obsidian2.Notice("Nota collegata all'area " + areaName + ".");
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
      { ...this.state.defaults, breakEnabled: true },
      /* @__PURE__ */ new Date(),
      uuid,
      date
    );
    if (result.remainder || !result.sessions?.length) throw Error("Programmazione incompleta.");
    await this.change(() => this.state.sessions.push(...result.sessions));
    new import_obsidian2.Notice("TEMPVS: " + result.sessions.length + " sessioni programmate.");
  }
  async togglePause() {
    const s = this.active();
    if (!s) throw Error("Nessuna sessione attiva.");
    await this.change(() => {
      s.paused = !s.paused;
    });
  }
  async finish() {
    const s = this.active();
    if (!s) throw Error("Nessuna sessione attiva.");
    await this.change(() => {
      s.finished = true;
      s.paused = false;
    });
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
    this.ambient?.destroy();
    this.record();
    clearTimeout(this.cloudSaveTimer);
    if (this.dirty || this.cloudDirty) await this.persist().catch((e) => console.error("TEMPVS:", e));
    await this.writeChain.catch(() => {
    });
  }
};
