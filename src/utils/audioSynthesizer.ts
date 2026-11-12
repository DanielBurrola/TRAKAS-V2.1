/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class MedicalAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private metronomeInterval: number | null = null;
  private chargeOscillator: OscillatorNode | null = null;
  private chargeGain: GainNode | null = null;

  private alarmInterval: number | null = null;
  private isAlarmActive: boolean = false;
  private currentAlarmPriority: 'HIGH' | 'MEDIUM' | null = null;
  private silenceTimer: number | null = null;
  private silenceRemaining: number = 0;
  private silenceInterval: number | null = null;
  private onSilenceTick?: (remainingSec: number) => void;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.chargeOscillator) {
      this.stopChargeTone();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Returns remaining seconds of alarm silence (0 if not silenced)
   */
  public getSilenceRemaining(): number {
    return this.silenceRemaining;
  }

  public isSilenced(): boolean {
    return this.silenceRemaining > 0;
  }

  /**
   * Set callback for alarm silence countdown timer tick
   */
  public setSilenceCallback(cb?: (remainingSec: number) => void) {
    this.onSilenceTick = cb;
  }

  /**
   * Silence active audio alarms for standard medical duration (default 120s = 2 min)
   */
  public silenceAlarms(durationSec: number = 120) {
    if (this.silenceInterval) {
      clearInterval(this.silenceInterval);
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceRemaining = durationSec;
    if (this.onSilenceTick) {
      this.onSilenceTick(this.silenceRemaining);
    }

    this.silenceInterval = window.setInterval(() => {
      this.silenceRemaining = Math.max(0, this.silenceRemaining - 1);
      if (this.onSilenceTick) {
        this.onSilenceTick(this.silenceRemaining);
      }
      if (this.silenceRemaining <= 0) {
        if (this.silenceInterval) {
          clearInterval(this.silenceInterval);
          this.silenceInterval = null;
        }
      }
    }, 1000);

    this.silenceTimer = window.setTimeout(() => {
      this.silenceRemaining = 0;
      if (this.onSilenceTick) {
        this.onSilenceTick(0);
      }
      if (this.silenceInterval) {
        clearInterval(this.silenceInterval);
        this.silenceInterval = null;
      }
    }, durationSec * 1000);
  }

  /**
   * Cancel alarm silence immediately and re-arm audio
   */
  public cancelSilence() {
    this.silenceRemaining = 0;
    if (this.silenceInterval) {
      clearInterval(this.silenceInterval);
      this.silenceInterval = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.onSilenceTick) {
      this.onSilenceTick(0);
    }
  }

  /**
   * Starts or updates active repeating clinical monitor alarm
   * IEC 60601-1-8 standard:
   * - HIGH priority: 10-pulse / 5-pulse repeated melodic pattern every 3.5s
   * - MEDIUM priority: 3-pulse sequence every 7s
   */
  public updateAlarmStatus(hasActiveAlarm: boolean, priority: 'HIGH' | 'MEDIUM' = 'HIGH') {
    if (!hasActiveAlarm) {
      this.stopAlarmSound();
      return;
    }

    this.isAlarmActive = true;
    this.currentAlarmPriority = priority;

    if (!this.alarmInterval) {
      // Play immediately once if not silenced
      this.playAlarmBurst(priority);

      // Repeat interval: 3.5s for high priority, 6.0s for medium priority
      const intervalMs = priority === 'HIGH' ? 3600 : 6200;
      this.alarmInterval = window.setInterval(() => {
        if (this.isAlarmActive && !this.isSilenced() && !this.isMuted) {
          this.playAlarmBurst(this.currentAlarmPriority || 'HIGH');
        }
      }, intervalMs);
    }
  }

  public stopAlarmSound() {
    this.isAlarmActive = false;
    this.currentAlarmPriority = null;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  /**
   * Plays a single melodic burst according to IEC 60601-1-8 medical alarm standard
   */
  private playAlarmBurst(priority: 'HIGH' | 'MEDIUM') {
    if (this.isMuted || this.isSilenced()) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      if (priority === 'HIGH') {
        // High priority alarm: 5-pulse melodic sequence: C5 (988Hz), C5, C5, G4 (784Hz), C5 (988Hz)
        const highNotes = [
          { f: 988, delay: 0.0 },
          { f: 988, delay: 0.12 },
          { f: 988, delay: 0.24 },
          { f: 784, delay: 0.42 },
          { f: 988, delay: 0.56 },
        ];

        highNotes.forEach(({ f, delay }) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + delay);

          gain.gain.setValueAtTime(0.001, now + delay);
          gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.095);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + delay);
          osc.stop(now + delay + 0.1);
        });
      } else {
        // Medium priority alarm: 3-pulse sequence: 880Hz, 880Hz, 660Hz
        const medNotes = [
          { f: 880, delay: 0.0 },
          { f: 880, delay: 0.18 },
          { f: 660, delay: 0.36 },
        ];

        medNotes.forEach(({ f, delay }) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + delay);

          gain.gain.setValueAtTime(0.001, now + delay);
          gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + delay);
          osc.stop(now + delay + 0.13);
        });
      }
    } catch {}
  }

  /**
   * Plays a physiological QRS acoustic blip.
   * Pitch is frequency-modulated by the SpO2 percentage (higher pitch = better oxygenation).
   * If SpO2 < 90%, plays lower pitched warning tones.
   */
  public playQRS(spO2: number = 98) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Physiological frequency scale:
      // SpO2 < 90%: noticeable pitch drop (desaturation alert)
      // 70% SpO2 = 380 Hz
      // 90% SpO2 = 580 Hz
      // 100% SpO2 = 880 Hz
      const clampedSpo2 = Math.max(60, Math.min(100, spO2));
      let freq: number;
      if (clampedSpo2 < 90) {
        // Hypoxemic drop: steep pitch plunge
        freq = 320 + ((clampedSpo2 - 60) / 30) * 260; // 320 Hz to 580 Hz
      } else {
        freq = 580 + ((clampedSpo2 - 90) / 10) * 300; // 580 Hz to 880 Hz
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = clampedSpo2 < 90 ? 'triangle' : 'sine'; // slightly more buzzy triangle when desaturating
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(clampedSpo2 < 90 ? 0.22 : 0.16, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Pacing spike audible click
   */
  public playPacingClick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  /**
   * Defibrillator capacitor charging sound: rising tone from 400Hz to 1250Hz over duration
   */
  public startChargeTone(durationSec: number = 3.5) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      this.stopChargeTone();

      const now = this.ctx.currentTime;
      this.chargeOscillator = this.ctx.createOscillator();
      this.chargeGain = this.ctx.createGain();

      this.chargeOscillator.type = 'sawtooth';
      this.chargeOscillator.frequency.setValueAtTime(420, now);
      this.chargeOscillator.frequency.exponentialRampToValueAtTime(1300, now + durationSec);

      this.chargeGain.gain.setValueAtTime(0.01, now);
      this.chargeGain.gain.linearRampToValueAtTime(0.12, now + 0.2);

      this.chargeOscillator.connect(this.chargeGain);
      this.chargeGain.connect(this.ctx.destination);

      this.chargeOscillator.start(now);
    } catch {}
  }

  public stopChargeTone() {
    try {
      if (this.chargeOscillator) {
        this.chargeOscillator.stop();
        this.chargeOscillator.disconnect();
        this.chargeOscillator = null;
      }
      if (this.chargeGain) {
        this.chargeGain.disconnect();
        this.chargeGain = null;
      }
    } catch {}
  }

  /**
   * Continuous or repeating tone when defibrillator is fully charged and ready to shock
   */
  public playDefibReadyBeep() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1480, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  /**
   * Defibrillator shock discharge audio (capacitor discharge thump / energy release)
   */
  public playShockDischarge() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Heavy low frequency boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      // Noise burst for the electrical arc zap
      const bufferSize = this.ctx.sampleRate * 0.12;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      whiteNoise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      whiteNoise.start(now);
    } catch {}
  }

  /**
   * Synchronized Cardioversion flag sync chirp
   */
  public playSyncMarkerChirp() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {}
  }

  /**
   * AHA/ERC CPR Metronome at 110 bpm (rhythm 100-120 bpm)
   */
  public toggleCPRMetronome(enable: boolean, onTick?: () => void) {
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
      this.metronomeInterval = null;
    }

    if (!enable) return;

    const bpm = 110;
    const intervalMs = (60 / bpm) * 1000; // ~545ms

    const tick = () => {
      if (!this.isMuted) {
        try {
          this.initContext();
          if (this.ctx) {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1050, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
          }
        } catch {}
      }
      if (onTick) onTick();
    };

    tick();
    this.metronomeInterval = window.setInterval(tick, intervalMs);
  }

  /**
   * Medical Critical Alarm Tone (IEC 60601-1-8 high priority sequence)
   */
  public playHighPriorityAlarm() {
    this.playAlarmBurst('HIGH');
  }

  /**
   * NIBP inflation/deflation gentle pump sound
   */
  public playNibpPump() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.4);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  /**
   * Play clean beep tone
   */
  public playBeep(freq: number = 880, duration: number = 0.1, type: OscillatorType = 'sine') {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {}
  }

  /**
   * 15-second pre-alert warning for CPR compressor rotation (triple beep)
   */
  public playPreAlertBeep() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [0.0, 0.14, 0.28].forEach((offset) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(980, now + offset);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.22, now + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    } catch {}
  }

  /**
   * Distinct two-tone completion chime when CPR 2-minute cycle or Drug timer reaches 00:00
   */
  public playTimerEndAlert() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [
        { f: 1250, t: 0.0, d: 0.18 },
        { f: 880, t: 0.22, d: 0.35 },
      ];
      notes.forEach(({ f, t, d }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.001, now + t);
        gain.gain.linearRampToValueAtTime(0.25, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + d + 0.02);
      });
    } catch {}
  }

  /**
   * Saline Flush 20 cc whoosh acoustic feedback
   */
  public playFlushSound() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Filtered noise swoosh
      const bufferSize = this.ctx.sampleRate * 0.28;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.28);
      filter.Q.setValueAtTime(2.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.29);
    } catch {}
  }

  /**
   * Stop all active tones, metronome and reset sound state
   */
  public silence() {
    this.dispose();
  }

  public dispose() {
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
      this.metronomeInterval = null;
    }
    this.stopChargeTone();
    this.stopAlarmSound();
    this.cancelSilence();
  }
}

export const medicalAudio = new MedicalAudioEngine();
