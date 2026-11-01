import test from "node:test";
import assert from "node:assert/strict";
import { parseTaskTags, normalizeTask, estimatedMinutesFromHours, wallMinutesForFocus, focusMinutesInSession,
  plannedFocusMinutes, taskTagAncestors, taskHasTag, createTaskSession } from "../core/tempo-tasks.js";
import { validSession, hasSessionOverlaps, getPhase } from "../core/tempo-core.js";
const task = { id: "task-1", title: "Leggere il capitolo", area: "Studio", priority: "alta",
  description: "Appunti", tags: ["Storia/Grecia/Atene"], estimateMinutes: 120, completed: false };

test("task fields and hierarchical tags are normalized and validated", () => {
  assert.deepEqual(parseTaskTags(" Studio / Greco / Verbi, Studio/Greco/Verbi, Personale "), ["Studio/Greco/Verbi", "Personale"]);
  assert.throws(() => parseTaskTags("Studio//Greco"));
  assert.equal(normalizeTask(task).title, task.title);
  assert.equal(normalizeTask({ ...task, area: "Errata" }), null);
  assert.deepEqual(taskTagAncestors(task.tags), ["Storia", "Storia/Grecia", "Storia/Grecia/Atene"]);
  assert.equal(taskHasTag(task, "Storia/Grecia"), true);
  assert.equal(taskHasTag(task, "Storia/Roma"), false);
});
test("hours are interpreted as net focus time and pauses extend calendar time", () => {
  assert.equal(estimatedMinutesFromHours("1.5"), 90);
  assert.equal(estimatedMinutesFromHours("1.1"), NaN);
  assert.equal(wallMinutesForFocus(90, 25, true), 105);
  assert.equal(wallMinutesForFocus(90, 25, false), 90);
  const s = createTaskSession(task, { id: "s1", date: "2026-11-02", start: "09:00",
    focusMinutes: 90, workMinutes: 25, breakEnabled: true });
  assert.equal(s.end, "10:45");
  assert.equal(validSession(s), true);
  assert.equal(focusMinutesInSession(s), 90);
  assert.equal(plannedFocusMinutes(task.id, [s]), 90);
  assert.equal(getPhase(s, new Date(2026,10,2,9,25)).kind, "break");
  assert.throws(() => createTaskSession(task, { id: "s2", date: "2026-11-02",
    start: "23:00", focusMinutes: 120, workMinutes: 25, breakEnabled: true }));
});
test("existing sessions and linked task sessions share overlap protection", () => {
  const a = createTaskSession(task, { id: "s1", date: "2026-11-02", start: "09:00",
    focusMinutes: 60, workMinutes: 25, breakEnabled: true });
  const b = createTaskSession(task, { id: "s2", date: "2026-11-02", start: "10:00",
    focusMinutes: 60, workMinutes: 25, breakEnabled: true });
  assert.equal(hasSessionOverlaps([a, b]), true);
});
