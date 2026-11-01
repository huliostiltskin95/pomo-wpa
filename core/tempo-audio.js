/**
 * Tempo ambient sound engine. Local Web Audio synthesis, no network required.
 * Playback is started only by a user action; scheduling never bypasses browser
 * autoplay policies. A focus-phase boundary always fades playback to silence.
 */
export class TempoAmbientAudio {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.context = null;
    this.master = null;
    this.nodes = [];
    this.crackleTimer = null;
    this.cleanupTimer = null;
    this.playing = false;
    this.kind = "off";
    this.volume = .25;
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
    if (this.playing && this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .05);
    }
  }
  async start(kind, volume = this.volume) {
    if (!["white", "brown", "rain", "fire"].includes(kind)) return false;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    this.stop(0);
    this.setVolume(volume);
    try {
      if (!this.context || this.context.state === "closed") this.context = new Context();
      await this.context.resume();
      const context = this.context;
      const master = context.createGain();
      master.gain.value = this.volume;
      master.connect(context.destination);
      this.master = master;
      this.kind = kind;
      const source = context.createBufferSource();
      source.buffer = TempoAmbientAudio.createNoise(context);
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = kind === "white" ? 16000 : kind === "brown" ? 220 : kind === "rain" ? 4200 : 950;
      source.connect(filter);
      filter.connect(master);
      source.start();
      this.nodes.push(source, filter, master);
      if (kind === "rain") {
        const oscillator = context.createOscillator();
        const depth = context.createGain();
        oscillator.frequency.value = .13;
        depth.gain.value = 1100;
        oscillator.connect(depth);
        depth.connect(filter.frequency);
        oscillator.start();
        this.nodes.push(oscillator, depth);
      }
      this.playing = true;
      this.onChange(true, kind);
      if (kind === "fire") {
        const generation = this.generation;
        const crackle = () => {
          if (!this.playing || this.generation !== generation) return;
          const click = context.createBufferSource();
          const gain = context.createGain();
          const hp = context.createBiquadFilter();
          click.buffer = TempoAmbientAudio.createNoise(context, .08);
          hp.type = "highpass";
          hp.frequency.value = 1800;
          const now = context.currentTime;
          gain.gain.setValueAtTime(.0001, now);
          gain.gain.linearRampToValueAtTime(.10, now + .008);
          gain.gain.exponentialRampToValueAtTime(.0001, now + .07);
          click.connect(hp);
          hp.connect(gain);
          gain.connect(master);
          click.start();
          click.stop(now + .08);
          click.onended = () => { click.disconnect(); hp.disconnect(); gain.disconnect(); };
        };
        this.crackleTimer = setInterval(crackle, 650);
      }
      return true;
    } catch (error) {
      this.stop(0);
      return false;
    }
  }
  stop(fadeSeconds = .9) {
    ++this.generation;
    this.playing = false;
    this.kind = "off";
    if (this.crackleTimer !== null) clearInterval(this.crackleTimer);
    this.crackleTimer = null;
    if (this.cleanupTimer !== null) clearTimeout(this.cleanupTimer);
    this.cleanupTimer = null;
    const nodes = this.nodes;
    const master = this.master;
    this.nodes = [];
    this.master = null;
    const cleanup = () => {
      for (const node of nodes) {
        try { node.stop?.(); } catch (_) {}
        try { node.disconnect?.(); } catch (_) {}
      }
    };
    if (nodes.length && master && this.context && this.context.state === "running" && fadeSeconds > 0) {
      const now = this.context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + fadeSeconds);
      this.cleanupTimer = setTimeout(() => { cleanup(); this.cleanupTimer = null; }, fadeSeconds * 1000 + 80);
    } else cleanup();
    this.onChange(false, "off");
  }
  destroy() {
    this.stop(0);
    if (this.context) this.context.close().catch(() => {});
    this.context = null;
  }
}
