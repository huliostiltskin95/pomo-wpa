// Short, locally synthesised focus-end cue. No external files or network.
export class FocusEndChime {
  constructor() { this.context = null; this.lastPlayed = 0; }
  arm() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    try {
      if (!this.context || this.context.state === 'closed') this.context = new Context();
      if (this.context.state !== 'running') void this.context.resume().catch(() => {});
      return true;
    } catch { return false; }
  }
  play() {
    if (!this.arm() || this.context.state !== 'running') return false;
    const context = this.context, now = context.currentTime;
    if (now - this.lastPlayed < 0.8) return false;
    this.lastPlayed = now;
    // Two gentle notes, each with a short decay, kept below normal media volume.
    for (const [offset,frequency] of [[0,660],[0.19,880]]) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      envelope.gain.setValueAtTime(0.0001,now+offset);
      envelope.gain.exponentialRampToValueAtTime(0.12,now+offset+0.018);
      envelope.gain.exponentialRampToValueAtTime(0.0001,now+offset+0.34);
      oscillator.connect(envelope);
      envelope.connect(context.destination);
      oscillator.start(now+offset);
      oscillator.stop(now+offset+0.36);
      oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};
    }
    return true;
  }
  destroy() {
    if (this.context) void this.context.close().catch(()=>{});
    this.context=null;
  }
}
