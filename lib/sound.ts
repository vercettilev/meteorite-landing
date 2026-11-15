/*
  Sound, only when asked for. Off, nothing is made at all. On, a low bed opens out under the page at
  once, so the visitor hears that it is on, and holds there; the cut has its own sounds: the hair of
  light glows, the lid grinds off, the wet polish hisses as it crosses the face, and the mark lands
  on one deep note. Nothing is struck bright. Everything is voiced above 100 Hz, where the speaker of a laptop or a
  phone can play it. All of it is made in the browser; nothing is loaded. The browser allows sound
  only after a tap or click, so start() must come from one.
*/
type Beat = { seam: number; lift: number; polish: number; mark: number };

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /* The bed's filter, which opens when the sound is turned on. */
  private soft: BiquadFilterNode | null = null;
  private hiss: GainNode | null = null;
  private listeners = new Set<(on: boolean) => void>();
  private playing = false;
  private fresh = true;
  private last: Beat = { seam: 0, lift: 0, polish: 0, mark: 0 };
  private hissLevel = 0;
  private sleep = 0;

  isOn() {
    return this.playing;
  }

  /* Tells fn whenever the sound is turned on or off, and once now. */
  subscribe(fn: (on: boolean) => void) {
    this.listeners.add(fn);
    fn(this.playing);
    return () => {
      this.listeners.delete(fn);
    };
  }

  toggle() {
    if (this.playing) this.stop();
    else this.start();
  }

  start() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    window.clearTimeout(this.sleep);
    void ctx.resume();
    this.playing = true;
    this.fresh = true;
    /* The answer to the click: the bed comes up quickly, and its filter opens from a murmur to its full warmth. */
    const now = ctx.currentTime;
    this.master!.gain.setTargetAtTime(1, now, 0.35);
    this.soft!.frequency.cancelScheduledValues(now);
    this.soft!.frequency.setValueAtTime(180, now);
    this.soft!.frequency.exponentialRampToValueAtTime(1200, now + 1.4);
    this.listeners.forEach((fn) => fn(true));
  }

  stop() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.playing = false;
    this.master!.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    this.sleep = window.setTimeout(() => void ctx.suspend(), 1500);
    this.listeners.forEach((fn) => fn(false));
  }

  /* Called every frame with where the cut has got to. The first call after starting only takes its bearings. */
  scene(beat: Beat, dt: number) {
    if (!this.playing || !this.ctx || !this.hiss) return;
    const now = this.ctx.currentTime;
    if (!this.fresh) {
      if (beat.seam > 0.5 && this.last.seam <= 0.5) this.glow(now);
      if (beat.lift > 0.05 && this.last.lift <= 0.05) this.grind(now);
      if (beat.mark > 0.3 && this.last.mark <= 0.3) this.toll(now);
    }
    /* The polish is heard only while it moves. */
    const spread = Math.max(0, beat.polish - this.last.polish) / Math.max(dt, 0.001);
    this.hissLevel += (Math.min(spread * 0.2, 0.05) - this.hissLevel) * Math.min(1, dt * 6);
    this.hiss.gain.setTargetAtTime(this.hissLevel, now, 0.05);
    this.last = { seam: beat.seam, lift: beat.lift, polish: beat.polish, mark: beat.mark };
    this.fresh = false;
  }

  private build() {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    /*
      The bed: a low A with its fifth and its octaves, each sounded twice a hair apart so that it
      slowly beats, and a breath of air under it. Its weight lies between 110 and 440 Hz; the 55
      below is only for headphones.
    */
    const bed = ctx.createGain();
    bed.gain.value = 0.11;
    const soft = ctx.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 1200;
    bed.connect(soft).connect(master);
    const partials = [[55, 0.25], [110, 0.35], [165, 0.22], [220, 0.18], [330, 0.08], [440, 0.035]] as const;
    partials.forEach(([f, g], i) => {
      for (const side of [-1, 1]) {
        const o = ctx.createOscillator();
        o.frequency.value = f + side * (0.08 + 0.03 * i);
        const gain = ctx.createGain();
        gain.gain.value = g / 2;
        o.connect(gain).connect(bed);
        o.start();
      }
    });
    const airy = ctx.createBiquadFilter();
    airy.type = "bandpass";
    airy.frequency.value = 600;
    airy.Q.value = 0.5;
    const air = ctx.createGain();
    air.gain.value = 0.18;
    this.noise(ctx).connect(airy).connect(air).connect(bed);
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 0.09;
    breath.connect(depth).connect(air.gain);
    breath.start();

    /* The polish: a thin hiss of water and grit, held at nothing until it is needed. */
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 3200;
    band.Q.value = 0.7;
    const hiss = ctx.createGain();
    hiss.gain.value = 0;
    this.noise(ctx).connect(band).connect(hiss).connect(master);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) void ctx.suspend();
      else if (this.playing) void ctx.resume();
    });
    this.ctx = ctx;
    this.master = master;
    this.soft = soft;
    this.hiss = hiss;
  }

  /* Two seconds of noise, looping. */
  private noise(ctx: AudioContext) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.start();
    return source;
  }

  private tone(at: number, frequency: number, gain: number, attack: number, decay: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.value = frequency;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    o.connect(g).connect(this.master!);
    o.start(at);
    o.stop(at + attack + decay + 0.1);
  }

  /* The hair of light along the cut: nothing struck, a soft glow of sound that rises and fades. */
  private glow(at: number) {
    this.tone(at, 440, 0.03, 0.35, 2.2);
    this.tone(at, 659.3, 0.018, 0.45, 2);
    this.tone(at, 880, 0.008, 0.5, 1.6);
  }

  /* The lid coming away: a low grind that falls as it goes. */
  private grind(at: number) {
    const ctx = this.ctx!;
    const source = this.noise(ctx);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 2.5;
    band.frequency.setValueAtTime(420, at);
    band.frequency.exponentialRampToValueAtTime(90, at + 1.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.1, at + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    source.connect(band).connect(g).connect(this.master!);
    source.stop(at + 1.5);
  }

  /* The mark: one deep note, with the overtones of a bell, left to die away. The overtones carry it on a small speaker. */
  private toll(at: number) {
    this.tone(at, 110, 0.12, 0.02, 5);
    this.tone(at, 220, 0.08, 0.02, 3.2);
    this.tone(at, 327.8, 0.045, 0.02, 2.2);
    this.tone(at, 451, 0.024, 0.02, 1.4);
    this.tone(at, 663, 0.01, 0.02, 0.9);
  }
}

export const sound = new Sound();
