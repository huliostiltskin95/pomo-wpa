import test from "node:test";
import assert from "node:assert/strict";
import { getPhase, hasSessionOverlaps, pauseMinutes, validSession, mmss } from "../core/tempo-core.js";

const session = (id, start, end, date = "2026-10-31") => ({
  id, title: id, date, start, end, workMinutes: 25, breakEnabled: true
});

test("validates real calendar dates and 24-hour times", () => {
  assert.equal(validSession(session("ok", "09:00", "10:00")), true);
  assert.equal(validSession(session("bad-date", "09:00", "10:00", "2026-02-30")), false);
  assert.equal(validSession(session("bad-time", "25:00", "26:00")), false);
  assert.equal(validSession(session("zero", "09:00", "09:00")), false);
});

test("detects nested and adjacent session overlaps correctly", () => {
  assert.equal(hasSessionOverlaps([session("a", "09:00", "12:00"), session("b", "09:30", "10:00"), session("c", "11:00", "11:30")]), true);
  assert.equal(hasSessionOverlaps([session("a", "09:00", "10:00"), session("b", "10:00", "11:00")]), false);
  assert.equal(hasSessionOverlaps([session("a", "09:00", "10:00"), session("b", "10:00", "11:00", "2026-11-01")]), false);
});

test("computes the expected work/break ratio", () => {
  assert.equal(pauseMinutes(25), 5);
  assert.equal(pauseMinutes(10), 2);
  assert.equal(pauseMinutes(1), 1);
});

test("calculates a Pomodoro phase from absolute time", () => {
  const s = session("timer", "09:00", "10:00");
  const work = getPhase(s, new Date(2026, 9, 31, 9, 10, 0));
  const pause = getPhase(s, new Date(2026, 9, 31, 9, 26, 0));
  assert.equal(work.kind, "work");
  assert.equal(work.remaining, 15 * 60);
  assert.equal(pause.kind, "break");
  assert.equal(pause.remaining, 4 * 60);
});

test("formats timer values without negative or fractional seconds", () => {
  assert.equal(mmss(65.9), "01:05");
  assert.equal(mmss(-1), "00:00");
});
