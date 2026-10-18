// Web Audio API & HTML5 Audio Dual Sound Generator for Vintage Lucky Draw
// Specially enhanced with iOS Safari / iPhone unlock support and HTML5 Audio fallback

export const isIosDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

// Generates a base64 Data URL for a valid PCM 16-bit mono WAV file
function createWavDataUrl(samples: Float32Array, sampleRate = 22050): string {
  const numSamples = samples.length;
  const byteRate = sampleRate * 2;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  // data chunk
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Write PCM 16-bit samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  // Convert buffer to binary string
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Generate notification chime WAV (Crystal Ding-Dong: 880Hz then 1320Hz)
function generateChimeWavUrl(): string {
  const sampleRate = 22050;
  const duration = 0.9;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Tone 1: 880Hz (first 0.3s)
    let val1 = 0;
    if (t < 0.45) {
      const env1 = Math.exp(-t * 9);
      val1 = Math.sin(2 * Math.PI * 880 * t) * 0.4 * env1;
    }
    // Tone 2: 1320Hz (from 0.15s to end)
    let val2 = 0;
    if (t >= 0.12) {
      const t2 = t - 0.12;
      const env2 = Math.exp(-t2 * 6);
      val2 = Math.sin(2 * Math.PI * 1320 * t2) * 0.5 * env2;
    }
    samples[i] = val1 + val2;
  }
  return createWavDataUrl(samples, sampleRate);
}

// Generate fanfare WAV
function generateFanfareWavUrl(): string {
  const sampleRate = 22050;
  const duration = 1.4;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  const notes = [
    { freq: 523.25, start: 0.0, dur: 0.2 },
    { freq: 659.25, start: 0.2, dur: 0.2 },
    { freq: 783.99, start: 0.4, dur: 0.3 },
    { freq: 1046.5, start: 0.7, dur: 0.7 },
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sum = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const nt = t - note.start;
        const env = Math.exp(-nt * 3.5);
        // Saw-like rich brass harmonic
        const s =
          Math.sin(2 * Math.PI * note.freq * nt) * 0.35 +
          Math.sin(4 * Math.PI * note.freq * nt) * 0.15;
        sum += s * env;
      }
    }
    samples[i] = sum;
  }
  return createWavDataUrl(samples, sampleRate);
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private hasUnlocked: boolean = false;
  private html5ChimeAudio: HTMLAudioElement | null = null;
  private html5FanfareAudio: HTMLAudioElement | null = null;

  constructor() {
    // Audio is mandatory and active for all users by default
    this.isMuted = false;
    try {
      localStorage.removeItem('lucky_draw_muted');
    } catch (e) {}

    if (typeof window !== 'undefined') {
      // Preload HTML5 Audio elements
      try {
        const chimeUrl = generateChimeWavUrl();
        this.html5ChimeAudio = new Audio(chimeUrl);
        this.html5ChimeAudio.preload = 'auto';

        const fanfareUrl = generateFanfareWavUrl();
        this.html5FanfareAudio = new Audio(fanfareUrl);
        this.html5FanfareAudio.preload = 'auto';
      } catch (err) {}

      // Persistent touch unlock listeners for iPhone Safari
      const handleUserGesture = () => {
        this.unlockContext();
      };

      ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'].forEach((eventName) => {
        window.addEventListener(eventName, handleUserGesture, { passive: true });
      });
    }
  }

  public getContext(): AudioContext | null {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch (e) {
      return null;
    }
  }

  // Active unlock method called on user tap
  public async unlockContext(): Promise<boolean> {
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Play 1-sample silent Web Audio buffer
      if (ctx) {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }

      // Prime HTML5 Audio on iOS Safari
      if (this.html5ChimeAudio) {
        this.html5ChimeAudio.volume = 0;
        this.html5ChimeAudio.play().then(() => {
          this.html5ChimeAudio?.pause();
          if (this.html5ChimeAudio) this.html5ChimeAudio.volume = 1;
        }).catch(() => {});
      }

      this.hasUnlocked = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  public isUnlocked(): boolean {
    return this.hasUnlocked && this.ctx !== null && this.ctx.state === 'running';
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('lucky_draw_muted', String(this.isMuted));
    } catch (e) {}
    return this.isMuted;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('lucky_draw_muted', String(this.isMuted));
    } catch (e) {}
  }

  // Play HTML5 Chime fallback (guaranteed on iPhone even when Web Audio is muted/suspended)
  private playHtml5Chime() {
    try {
      if (this.html5ChimeAudio) {
        this.html5ChimeAudio.currentTime = 0;
        this.html5ChimeAudio.volume = 1;
        this.html5ChimeAudio.play().catch(() => {});
      }
    } catch (e) {}
  }

  private playHtml5Fanfare() {
    try {
      if (this.html5FanfareAudio) {
        this.html5FanfareAudio.currentTime = 0;
        this.html5FanfareAudio.volume = 1;
        this.html5FanfareAudio.play().catch(() => {});
      }
    } catch (e) {}
  }

  // Crisp Notification Ding sound (Used whenever winner announcement arrives)
  public playNotificationDing() {
    if (this.isMuted) return;

    // Trigger HTML5 audio chime
    this.playHtml5Chime();

    // Trigger Web Audio API
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;

      // High bell ping 1 (880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.55);

      // High bell ping 2 (1320Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.9);
    } catch (e) {}
  }

  // Mechanical / roulette wheel tick during shuffle
  public playShuffleTick(pitchFactor: number = 1.0) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const baseFreq = 720 * pitchFactor;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (e) {}
  }

  // Crisp button click sound
  public playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch (e) {}
  }

  // Swift whoosh transition sound
  public playWhoosh() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {}
  }

  // Tension riser whoosh during final seconds of shuffle
  public playSuspenseRiser(durationSec = 1.6) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(960, now + durationSec);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.24, now + durationSec * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.linearRampToValueAtTime(3200, now + durationSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec);
    } catch (e) {}
  }

  // Dramatic drumroll leading to reveal
  public playDrumroll(durationSec = 2.0) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const step = 0.055;
      const count = Math.floor(durationSec / step);

      for (let i = 0; i < count; i++) {
        const time = now + i * step;
        const progress = i / count;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140 + Math.random() * 30, time);

        const vol = 0.05 + progress * 0.25;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.05);
      }
    } catch (e) {}
  }

  // Triumphant Winner Fanfare (Standard / Regular Prize)
  public playCelebrationFanfare() {
    if (this.isMuted) return;

    // Dual trigger HTML5 Audio fanfare
    this.playHtml5Fanfare();

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0, dur: 0.16 }, // C5
        { freq: 659.25, time: 0.15, dur: 0.16 }, // E5
        { freq: 783.99, time: 0.3, dur: 0.2 }, // G5
        { freq: 1046.5, time: 0.5, dur: 0.7 }, // C6
        { freq: 1318.51, time: 0.7, dur: 0.9 }, // E6
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.exponentialRampToValueAtTime(0.32, now + n.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });
    } catch (e) {}
  }

  // Grand Prize Golden Royal Brass Fanfare
  public playGrandPrizeFanfare() {
    if (this.isMuted) return;

    this.playHtml5Fanfare();

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const notes = [
        { freq: 392.0, time: 0, dur: 0.18 }, // G4
        { freq: 523.25, time: 0.18, dur: 0.18 }, // C5
        { freq: 659.25, time: 0.36, dur: 0.22 }, // E5
        { freq: 783.99, time: 0.56, dur: 0.35 }, // G5
        { freq: 1046.5, time: 0.92, dur: 1.25 }, // C6
        { freq: 1318.51, time: 1.15, dur: 1.4 }, // E6
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now + n.time);

        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.exponentialRampToValueAtTime(0.3, now + n.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });
    } catch (e) {}
  }

  // Countdown beep for countdown sequence (3, 2, 1, Launch!)
  public playCountdownBeep(isFinal: boolean = false) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isFinal ? 'sawtooth' : 'sine';
      const freq = isFinal ? 880 : 440; // A5 for GO!, A4 for count
      osc.frequency.setValueAtTime(freq, now);

      const dur = isFinal ? 0.6 : 0.25;
      const vol = isFinal ? 0.35 : 0.22;

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur + 0.05);
    } catch (e) {}
  }

  // Official Inauguration Ceremony Fanfare (Gimik Perasmian)
  public playInaugurationFanfare() {
    if (this.isMuted) return;

    this.playHtml5Fanfare();

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;

      const heraldNotes = [
        { freq: 349.23, time: 0, dur: 0.22 }, // F4
        { freq: 440.0, time: 0.22, dur: 0.22 }, // A4
        { freq: 523.25, time: 0.44, dur: 0.3 }, // C5
        { freq: 698.46, time: 0.74, dur: 0.55 }, // F5
        { freq: 880.0, time: 1.3, dur: 0.45 }, // A5
        { freq: 1046.5, time: 1.75, dur: 1.5 }, // C6
      ];

      heraldNotes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now + n.time);

        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.exponentialRampToValueAtTime(0.35, now + n.time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });

      const chimes = [
        { freq: 1396.91, delay: 0.8 },
        { freq: 1760.0, delay: 1.0 },
        { freq: 2093.0, delay: 1.2 },
        { freq: 2793.83, delay: 1.5 },
        { freq: 3135.96, delay: 1.8 },
      ];

      chimes.forEach((c) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(c.freq, now + c.delay);

        gain.gain.setValueAtTime(0.001, now + c.delay);
        gain.gain.exponentialRampToValueAtTime(0.15, now + c.delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + c.delay + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + c.delay);
        osc.stop(now + c.delay + 0.65);
      });
    } catch (e) {}
  }

  // Active drumroll state for stage
  private activeDrumrollGain: GainNode | null = null;
  private activeDrumrollSources: any[] = [];

  public stopDramaticStageDrumroll() {
    if (this.activeDrumrollGain) {
      try {
        const ctx = this.getContext();
        if (ctx) {
          const now = ctx.currentTime;
          this.activeDrumrollGain.gain.setValueAtTime(this.activeDrumrollGain.gain.value, now);
          this.activeDrumrollGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        }
      } catch (e) {}
    }
    this.activeDrumrollSources.forEach((node) => {
      try {
        node.stop?.();
        node.disconnect?.();
      } catch (e) {}
    });
    this.activeDrumrollSources = [];
    this.activeDrumrollGain = null;
  }

  // Dramatic Snare Drumroll with continuous granular rattle + bass thrum + crescendo
  public playDramaticStageDrumroll(durationSec = 6.8) {
    if (this.isMuted) return;
    this.stopDramaticStageDrumroll();

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      // Starts soft and builds into dramatic crescendo
      masterGain.gain.setValueAtTime(0.09, now);
      masterGain.gain.exponentialRampToValueAtTime(0.5, now + durationSec * 0.9);
      masterGain.gain.setValueAtTime(0.5, now + durationSec);
      masterGain.connect(ctx.destination);
      this.activeDrumrollGain = masterGain;

      // 1. Create white noise buffer for snare rattle
      const bufferSize = Math.floor(ctx.sampleRate * Math.min(durationSec + 0.5, 10));
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      // Bandpass filter centered at 1400Hz for crisp snare wire sizzle
      const snareFilter = ctx.createBiquadFilter();
      snareFilter.type = 'bandpass';
      snareFilter.frequency.setValueAtTime(1400, now);
      snareFilter.Q.setValueAtTime(1.8, now);

      // Tremolo modulation using an LFO for rapid alternating stick hits (~28 hits/sec)
      const lfo = ctx.createOscillator();
      lfo.type = 'triangle';
      lfo.frequency.setValueAtTime(26, now);
      lfo.frequency.linearRampToValueAtTime(34, now + durationSec);

      const snareGain = ctx.createGain();
      snareGain.gain.setValueAtTime(0.55, now);

      lfo.connect(snareGain.gain);
      noise.connect(snareFilter);
      snareFilter.connect(snareGain);
      snareGain.connect(masterGain);

      noise.start(now);
      noise.stop(now + durationSec);
      lfo.start(now);
      lfo.stop(now + durationSec);

      this.activeDrumrollSources.push(noise, lfo);

      // 2. Deep bass drum resonant body rumble
      const bassStep = 0.07;
      const bassCount = Math.floor(durationSec / bassStep);
      for (let i = 0; i < bassCount; i++) {
        const time = now + i * bassStep;
        const bassOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(125 + (i % 2 === 0 ? 15 : 0), time);
        bassOsc.frequency.exponentialRampToValueAtTime(70, time + 0.05);

        const progress = i / bassCount;
        const hitVol = 0.06 + progress * 0.24;
        bGain.gain.setValueAtTime(hitVol, time);
        bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.048);

        bassOsc.connect(bGain);
        bGain.connect(masterGain);

        bassOsc.start(time);
        bassOsc.stop(time + 0.05);
      }
    } catch (e) {}
  }

  // Suspense Heartbeat ("lub-dub" visceral sub-bass pulse)
  public playSuspenseHeartbeat(intensity = 1.0) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;

      // 1st thump ("lub")
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(68, now);
      osc1.frequency.exponentialRampToValueAtTime(38, now + 0.12);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.35 * intensity, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // 2nd thump ("dub" - 0.14s later, slightly higher and louder)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(82, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(42, now + 0.32);

      gain2.gain.setValueAtTime(0.001, now + 0.14);
      gain2.gain.linearRampToValueAtTime(0.42 * intensity, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.36);
    } catch (e) {}
  }

  // Resonant orchestral Cymbal Crash + Celebratory Victory Fanfare
  public playVictoryCymbalCrash() {
    if (this.isMuted) return;
    this.stopDramaticStageDrumroll();
    this.playHtml5Fanfare();

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;

      // 1. Synthesized Crash Cymbal (High-frequency white noise + multi-band shimmer)
      const duration = 2.8;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(4200, now);

      const bpFilter = ctx.createBiquadFilter();
      bpFilter.type = 'peaking';
      bpFilter.frequency.setValueAtTime(6500, now);
      bpFilter.Q.setValueAtTime(2.0, now);
      bpFilter.gain.setValueAtTime(6, now);

      const cymbalGain = ctx.createGain();
      cymbalGain.gain.setValueAtTime(0.65, now);
      cymbalGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noiseSource.connect(hpFilter);
      hpFilter.connect(bpFilter);
      bpFilter.connect(cymbalGain);
      cymbalGain.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);

      // 2. Metallic ring oscillators
      const metalFreqs = [205, 342, 584, 876];
      metalFreqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1800, now);

        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(filter);
        filter.connect(g);
        g.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.25);
      });

      // 3. Triumphant Brass Chord (Grand Prize Victory Stinger)
      const chord = [
        { freq: 261.63, dur: 1.8 }, // C4
        { freq: 329.63, dur: 1.8 }, // E4
        { freq: 392.00, dur: 2.2 }, // G4
        { freq: 523.25, dur: 2.6 }, // C5
        { freq: 659.25, dur: 2.6 }, // E5
        { freq: 1046.50, dur: 3.0 }, // C6
      ];

      chord.forEach((note) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.freq, now);

        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(1800, now);
        f.frequency.linearRampToValueAtTime(2600, now + 0.3);

        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.24, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + note.dur);

        osc.connect(f);
        f.connect(g);
        g.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + note.dur + 0.05);
      });
    } catch (e) {}
  }
}

export const sound = new SoundManager();
