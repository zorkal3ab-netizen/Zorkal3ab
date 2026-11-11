/**
 * Web Audio API Sound Synthesizer for ZORK CRAFT
 * Clean UI feedback sounds with persistent mute/unmute state
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zork_sound_muted');
      this.isMuted = saved === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('zork_sound_muted', String(this.isMuted));
    }
    if (!this.isMuted) {
      this.playClick();
    }
    return this.isMuted;
  }

  public toggle(): boolean {
    return !this.toggleMute();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getEnabled(): boolean {
    return !this.isMuted;
  }

  public playCategory() {
    this.playClick();
  }

  public playClick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  public playError() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(174.61, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  public playNotification() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  /**
   * Authentic Creeper Hiss (0.98s) followed by deep explosion Boom & blast rumble (0.55s)
   */
  public playCreeperExplosion() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. Creeper Fuse Ignition & Rising Hiss (0 to 0.98s)
      const bufferSize = Math.floor(ctx.sampleRate * 0.98);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.exponentialRampToValueAtTime(3600, now + 0.98);
      filter.Q.setValueAtTime(3.2, now);

      const hissGain = ctx.createGain();
      hissGain.gain.setValueAtTime(0.02, now);
      hissGain.gain.exponentialRampToValueAtTime(0.28, now + 0.92);
      hissGain.gain.setValueAtTime(0.001, now + 0.98);

      whiteNoise.connect(filter);
      filter.connect(hissGain);
      hissGain.connect(ctx.destination);
      whiteNoise.start(now);
      whiteNoise.stop(now + 0.98);

      // 2. Explosion Boom at 0.98s (Phase C Explosion)
      const boomTime = now + 0.98;
      const boomOsc = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boomOsc.type = 'triangle';
      boomOsc.frequency.setValueAtTime(160, boomTime);
      boomOsc.frequency.exponentialRampToValueAtTime(20, boomTime + 0.45);

      boomGain.gain.setValueAtTime(0.38, boomTime);
      boomGain.gain.exponentialRampToValueAtTime(0.001, boomTime + 0.45);

      boomOsc.connect(boomGain);
      boomGain.connect(ctx.destination);
      boomOsc.start(boomTime);
      boomOsc.stop(boomTime + 0.45);

      // 3. Explosion blast noise rumble & debris crackle
      const blastBufferSize = Math.floor(ctx.sampleRate * 0.5);
      const blastNoiseBuffer = ctx.createBuffer(1, blastBufferSize, ctx.sampleRate);
      const blastData = blastNoiseBuffer.getChannelData(0);
      for (let i = 0; i < blastBufferSize; i++) {
        blastData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (blastBufferSize * 0.25));
      }
      const blastSource = ctx.createBufferSource();
      blastSource.buffer = blastNoiseBuffer;

      const blastFilter = ctx.createBiquadFilter();
      blastFilter.type = 'lowpass';
      blastFilter.frequency.setValueAtTime(1200, boomTime);
      blastFilter.frequency.exponentialRampToValueAtTime(120, boomTime + 0.5);

      const blastGain = ctx.createGain();
      blastGain.gain.setValueAtTime(0.3, boomTime);
      blastGain.gain.exponentialRampToValueAtTime(0.001, boomTime + 0.5);

      blastSource.connect(blastFilter);
      blastFilter.connect(blastGain);
      blastGain.connect(ctx.destination);
      blastSource.start(boomTime);
      blastSource.stop(boomTime + 0.5);
    } catch {}
  }

  /**
   * Enderman Jumpscare Screech / Distorted Screaming Glissando
   */
  public playEndermanScream() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Two detuned sawtooth oscillators with pitch vibrato
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      // Pitch jumps and falls violently
      osc1.frequency.setValueAtTime(420, now);
      osc1.frequency.exponentialRampToValueAtTime(950, now + 0.15);
      osc1.frequency.exponentialRampToValueAtTime(300, now + 0.85);

      osc2.frequency.setValueAtTime(435, now);
      osc2.frequency.exponentialRampToValueAtTime(985, now + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(280, now + 0.85);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.28, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
    } catch {}
  }

  /**
   * Minecraft-accurate Enderman Teleportation Sound
   * Phase 1 (Emergence): Deep eerie portal hum with pitch resonance
   * Phase 2 (Teleport & Dissolve): Dimensional whoosh with frequency sweep and purple particle crackle
   */
  public playEndermanTeleport() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // 1. Emergence chord & eerie harmonic hum
      const humOsc = ctx.createOscillator();
      const humGain = ctx.createGain();
      humOsc.type = 'sawtooth';
      humOsc.frequency.setValueAtTime(160, now);
      humOsc.frequency.exponentialRampToValueAtTime(320, now + 0.4);
      humOsc.frequency.setValueAtTime(320, now + 1.0);
      humGain.gain.setValueAtTime(0.04, now);
      humGain.gain.exponentialRampToValueAtTime(0.12, now + 0.3);
      humGain.gain.setValueAtTime(0.12, now + 1.0);
      humGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      const humFilter = ctx.createBiquadFilter();
      humFilter.type = 'lowpass';
      humFilter.frequency.setValueAtTime(600, now);
      humFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.4);

      humOsc.connect(humFilter);
      humFilter.connect(humGain);
      humGain.connect(ctx.destination);
      humOsc.start(now);
      humOsc.stop(now + 1.45);

      // 2. Teleport warp whoosh at 1.08s (when frame 06 starts digital breakdown)
      const warpTime = now + 1.08;
      const warpOsc = ctx.createOscillator();
      const warpGain = ctx.createGain();
      warpOsc.type = 'sine';
      warpOsc.frequency.setValueAtTime(800, warpTime);
      warpOsc.frequency.exponentialRampToValueAtTime(80, warpTime + 0.35);

      warpGain.gain.setValueAtTime(0.22, warpTime);
      warpGain.gain.exponentialRampToValueAtTime(0.001, warpTime + 0.35);

      warpOsc.connect(warpGain);
      warpGain.connect(ctx.destination);
      warpOsc.start(warpTime);
      warpOsc.stop(warpTime + 0.35);

      // 3. Purple particle noise crackle
      const bufferSize = Math.floor(ctx.sampleRate * 0.35);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2400, warpTime);
      noiseFilter.frequency.exponentialRampToValueAtTime(600, warpTime + 0.35);
      noiseFilter.Q.setValueAtTime(4.0, warpTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, warpTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, warpTime + 0.35);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(warpTime);
      noiseSource.stop(warpTime + 0.35);
    } catch {}
  }
}

export const soundManager = new SoundManager();
