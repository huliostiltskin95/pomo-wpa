import test from "node:test";
import assert from "node:assert/strict";
import { FocusEndChime } from "../core/tempo-chime.js";

test("phase cues activate on a gesture, play distinct notes and suppress duplicates", async () => {
  const prior = globalThis.AudioContext;
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const notes = [];
  class Context {
    constructor() { this.state = "suspended"; this.currentTime = 1; this.destination = {}; }
    async resume() { this.state = "running"; }
    createOscillator() {
      const oscillator = {
        frequency: {value: 0}, type: "", connect() {}, disconnect() {},
        start() { notes.push(this.frequency.value); }, stop() {}, onended: null
      };
      return oscillator;
    }
    createGain() {
      return { gain: {setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){} };
    }
    async close() { this.state = "closed"; }
  }
  try {
    globalThis.AudioContext = Context;
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { audioSession: {type:"auto"} } });
    const chime = new FocusEndChime();
    assert.equal(chime.arm(), true);
    assert.equal(await chime.play("break"), true);
    assert.deepEqual(notes, [880, 659]);
    assert.equal(navigator.audioSession.type, "ambient");
    assert.equal(await chime.play("work"), false);
    chime.context.currentTime += 1;
    assert.equal(await chime.play("work"), true);
    assert.deepEqual(notes, [880, 659, 784, 1047]);
    chime.destroy();
    assert.equal(await chime.play("break"),true,"a fresh audio context must not inherit the old clock's cooldown");
    chime.destroy();
  } finally {
    if (prior === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = prior;
    if (priorNavigator) Object.defineProperty(globalThis, "navigator", priorNavigator);
    else delete globalThis.navigator;
  }
});
