import test from "node:test";
import assert from "node:assert/strict";
import { TempoAmbientAudio } from "../core/tempo-audio.js";

class FakeParam {
  value = 0;
  cancelScheduledValues() {}
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
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

for (const kind of ["white", "brown", "rain", "fire"]) {
  test(`${kind}: starts its source before waiting for browser activation`, async () => {
    const original = globalThis.AudioContext;
    let resolveResume, started = 0;
    class GestureContext extends FakeAudioContext {
      resume() { return new Promise(resolve => { resolveResume = resolve; }); }
      createBufferSource() { const node = super.createBufferSource(); node.start = () => { started++; }; return node; }
    }
    globalThis.AudioContext = GestureContext;
    const ambient = new TempoAmbientAudio();
    try {
      const result = ambient.start(kind);
      assert.equal(started, 1, "source must start synchronously inside the gesture");
      resolveResume();
      assert.equal(await result, true);
      assert.equal(ambient.playing, true);
    } finally { ambient.destroy(); globalThis.AudioContext = original; }
  });
}

test("a late activation cannot restart stopped audio or replace a newer sound", async () => {
  const original = globalThis.AudioContext;
  const resumes=[];
  class DeferredContext extends FakeAudioContext {
    resume() { return new Promise(resolve => resumes.push(resolve)); }
  }
  globalThis.AudioContext=DeferredContext;
  const ambient=new TempoAmbientAudio();
  try {
    const first=ambient.start("white");
    const second=ambient.start("rain");
    resumes[1]();
    assert.equal(await second,true);
    resumes[0]();
    assert.equal(await first,false);
    assert.equal(ambient.kind,"rain");
    const third=ambient.start("brown");
    ambient.stop(0);
    resumes[2]();
    assert.equal(await third,false);
    assert.equal(ambient.playing,false);
    assert.equal(ambient.nodes.length,0);
  } finally {ambient.destroy();globalThis.AudioContext=original;}
});

test("arming while idle and pausing never suspend the unlocked context", async () => {
  const original=globalThis.AudioContext;
  let suspends=0;
  class Context extends FakeAudioContext {async suspend(){suspends++;await super.suspend();}}
  globalThis.AudioContext=Context;
  const ambient=new TempoAmbientAudio();
  try {
    assert.equal(await ambient.start("white",.4,false),true);
    ambient.setAudible(true);
    await Promise.resolve();
    ambient.setAudible(false,0);
    await new Promise(resolve=>setTimeout(resolve,120));
    assert.equal(suspends,0);
    assert.equal(ambient.master.gain.value,0);
    ambient.setAudible(true);
    await Promise.resolve();
    assert.equal(ambient.master.gain.value,.4);
  } finally {ambient.destroy();globalThis.AudioContext=original;}
});
