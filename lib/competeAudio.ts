/**
 * lib/competeAudio.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-dependency Web Audio SFX Engine for Rookie Compete 1v1 battles.
 * Synthesizes crisp procedural sound effects instantly without downloading audio assets.
 */

class CompeteAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rookie_compete_audio_muted');
        this.muted = stored === 'true';
      } catch {}
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('rookie_compete_audio_muted', String(this.muted));
      } catch {}
    }
    return this.muted;
  }

  public setMuted(val: boolean) {
    this.muted = val;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('rookie_compete_audio_muted', String(this.muted));
      } catch {}
    }
  }

  /** Short tick for countdown numbers 3, 2, 1 and timer warning */
  public playTick() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  /** GO! chime at countdown zero */
  public playGo() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15); // C6

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  /** Match Found fanfare */
  public playMatchFound() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880]; // A major
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.07;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch {}
  }

  /** Tactile click on selecting an option */
  public playSelect() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  /** Triumphant chime for correct answer */
  public playCorrect() {
    if (this.muted) return;

    // Also attempt playing existing audio asset if available
    try {
      const audio = new Audio('/oncorrect.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {}

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + i * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.16, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.35);
      });
    } catch {}
  }

  /** Wrong answer low thud */
  public playWrong() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.22);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  }

  /** Victory celebration sound */
  public playVictory() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Fanfare sequence
      const melody = [
        { f: 523.25, d: 0.12 }, // C
        { f: 659.25, d: 0.12 }, // E
        { f: 783.99, d: 0.14 }, // G
        { f: 1046.5, d: 0.4 },  // C6
      ];

      let elapsed = 0;
      melody.forEach(item => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + elapsed;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.f, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + item.d);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + item.d);

        elapsed += item.d * 0.9;
      });
    } catch {}
  }
}

export const competeAudio = new CompeteAudioEngine();
