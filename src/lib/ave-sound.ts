let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let verb: ConvolverNode | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // small synthetic room reverb
      verb = ctx.createConvolver();
      const len = ctx.sampleRate * 2.2;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
      verb.buffer = buf;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      verb.connect(wet).connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, at: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const c = ac();
  if (!c || !master || !verb) return;
  const s = c.currentTime + at;
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o2.type = "sine";
  o.frequency.value = freq;
  o2.frequency.value = freq * 2.01; // soft bell partial
  const g2 = c.createGain();
  g2.gain.value = 0.18;
  g.gain.setValueAtTime(0, s);
  g.gain.linearRampToValueAtTime(vol, s + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(master);
  g.connect(verb);
  o.start(s);
  o2.start(s);
  o.stop(s + dur + 0.05);
  o2.stop(s + dur + 0.05);
}

export const sound = {
  enabled: true,
  prime: () => void ac(),
  tap() { if (this.enabled) tone(1240, 0, 0.09, 0.05, "triangle"); },
  page() {
    if (!this.enabled) return;
    [523.25, 659.25].forEach((f, i) => tone(f, i * 0.07, 0.6, 0.08));
  },
  tick() { if (this.enabled) tone(1760, 0, 0.05, 0.035, "square"); },
  copy() {
    if (!this.enabled) return;
    tone(880, 0, 0.25, 0.07);
    tone(1318.5, 0.06, 0.35, 0.06);
  },
  done() {
    if (!this.enabled) return;
    // warm major-ninth bell arpeggio
    [392, 493.88, 587.33, 739.99, 880].forEach((f, i) => tone(f, i * 0.16, 2.4, 0.11));
  },
  fanfare() {
    if (!this.enabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.12, 1.8, 0.1));
    [261.63, 392].forEach((f) => tone(f, 0.5, 2.6, 0.08));
  },
};
