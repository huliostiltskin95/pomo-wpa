import test from "node:test";
import assert from "node:assert/strict";
import { TempoAmbientAudio } from "../core/tempo-audio.js";

class FakeParam {
  value = 0;
  cancelScheduledValues() {}
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  connect() { return this; }
  disconnect() {}
  start() {}
  stop() {}
}
class FakeAudioContext {
  state = "running";
  sampleRate = 100;
  currentTime = 0;
  destination = new FakeNode();
  createGain() { return new FakeNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(400) }; }
  createBufferSource() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); }
  async resume() { this.state = "running"; }
  async suspend() { this.state = "suspended"; }
  async close() { this.state = "closed"; }
}
test("one user-started audio graph survives a break and resumes automatically", async () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;
  const ambient = new TempoAmbientAudio();
  try {
    assert.equal(await ambient.start("white", .4), true);
    const context = ambient.context;
    const source = ambient.nodes[0];
    const master = ambient.master;
    assert.equal(ambient.playing, true);
    ambient.setAudible(false);
    assert.equal(ambient.playing, true);
    assert.equal(master.gain.value, 0);
    ambient.setVolume(.7);
    assert.equal(master.gain.value, 0);
    ambient.setAudible(true);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(ambient.playing, true);
    assert.equal(ambient.context, context);
    assert.equal(ambient.nodes[0], source);
    assert.equal(ambient.master.gain.value, .7);
    ambient.stop(0);
    assert.equal(ambient.playing, false);
  } finally {
    ambient.destroy();
    globalThis.AudioContext = original;
  }
});
