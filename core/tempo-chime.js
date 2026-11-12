// Short, locally synthesised phase-change cue: no files, downloads or network.
export class FocusEndChime {
  constructor() { this.context = null; this.lastPlayed = -Infinity; }

  arm() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    try {
      // Mix short alerts with other audio (music, recordings, dictation) on iOS.
      // Playback mode would interrupt external media even while the timer is idle.
      try { if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = "ambient"; } catch {}
      if (!this.context || this.context.state === "closed") {
        this.context = new Context();
        this.lastPlayed = -Infinity;
      }
      if (this.context.state !== "running") void this.context.resume().catch(() => {});
      return true;
    } catch { return false; }
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
      // Descending notes mark a break; ascending notes mark resumed focus.
      const notes = phase === "work" ? [[0, 784], [0.20, 1047]] : [[0, 880], [0.20, 659]];
      for (const [offset, frequency] of notes) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(0.0001, now + offset);
        envelope.gain.exponentialRampToValueAtTime(0.20, now + offset + 0.022);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.40);
        oscillator.connect(envelope);
        envelope.connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.42);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
      }
      return true;
    } catch { return false; }
  }

  destroy() {
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
