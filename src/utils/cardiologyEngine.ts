/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CardiacRhythmType, ECGLead } from '../types/medical';

export interface WaveformSample {
  ecgVoltage: number; // in mV (standard clinical scale: -0.5 to +2.5 mV)
  isRWavePeak: boolean;
  plethVoltage: number; // normalized 0 to 1 with dicrotic notch
  co2Voltage: number; // in mmHg (0 to 50 mmHg) with alveolar plateau
  hasPacerSpike: boolean;
}

export class CardiologyEngine {
  private sampleRate = 250; // 250 Hz standard clinical acquisition rate
  private beatTime = 0; // current time inside the ventricular beat cycle in seconds [0, currentRR]
  private currentRR = 0.8; // current RR interval in seconds
  private atrialBeatTime = 0; // independent atrial beat time for AV dissociation (3rd degree block)
  private respPhase = 0; // respiratory cycle phase [0, 1)
  private torsadesCycle = 0; // envelope cycle for polymorphic VT twisting
  private baselineNoise = 0;
  private respirationDrift = 0; // subtle isoelectric baseline wander (0.15 Hz)
  private afibNextRR = 0.45; // chaotic beat interval for AFib

  /**
   * Resets all internal engine state, phase counters, and noise to factory zero.
   * Ensures instant restart without freezing or audio/animation hangs.
   */
  public resetEngine() {
    this.beatTime = 0;
    this.currentRR = 0.8;
    this.atrialBeatTime = 0;
    this.respPhase = 0;
    this.torsadesCycle = 0;
    this.baselineNoise = 0;
    this.respirationDrift = 0;
    this.afibNextRR = 0.45;
  }

  /**
   * Evaluates a Gaussian wave packet: a * exp(-((t - mu)^2) / (2 * sigma^2))
   */
  private gaussianTime(t: number, mu: number, sigma: number, amp: number): number {
    const diff = t - mu;
    return amp * Math.exp(-(diff * diff) / (2 * sigma * sigma));
  }

  /**
   * Generates a random RR interval for AFib around the mean heart rate (irregularly irregular)
   */
  private getRandomAfibRR(meanHR: number): number {
    const meanRR = 60 / Math.max(50, Math.min(200, meanHR));
    // Normal / Gaussian perturbation +/- 35% around mean
    const rand = (Math.random() + Math.random() + Math.random() - 1.5) * 0.45;
    return Math.max(0.28, Math.min(0.95, meanRR * (1.0 + rand)));
  }

  /**
   * Evaluates medical 12-Lead ECG voltage purely and statelessly at a given cardiac phase point.
   * Incorporates anatomically accurate Einthoven limb leads (I, II, III), Goldberger augmented
   * leads (aVR, aVL, aVF), and Wilson precordial leads (V1-V6) with realistic R-wave progression
   * and reciprocal ST-T changes.
   */
  public getECGVoltageForLead(
    lead: ECGLead,
    beatSec: number,
    rhythm: CardiacRhythmType,
    hr: number = 75,
    isPacerCapturing: boolean = false,
    atrialBeatSec: number = 0,
    elapsedSec: number = 0
  ): number {
    // 1. ASYSTOLE: Isoelectric flatline (< 0.03 mV) with subtle electrical noise and respiratory drift
    if (rhythm === 'ASYSTOLE') {
      const t = elapsedSec > 0 ? elapsedSec : Date.now() / 1000;
      const noise = (Math.sin(t * 18.4) + Math.cos(t * 31.7)) * 0.018 + (Math.random() - 0.5) * 0.012;
      return noise;
    }

    // 2. VENTRICULAR FIBRILLATION (COARSE & FINE)
    if (rhythm === 'VF_COARSE' || rhythm === 'VF_FINE') {
      const isFine = rhythm === 'VF_FINE';
      const ampMult = isFine ? 0.18 : 0.95;
      const t = elapsedSec > 0 ? elapsedSec : Date.now() / 1000;
      // Precordial proximity modulation (V2-V4 have higher amplitude than limb leads in VF)
      const leadProx = (lead === 'V2' || lead === 'V3' || lead === 'V4') ? 1.25 : (lead === 'aVR' ? 0.8 : 1.0);
      const wave =
        Math.sin(t * 22.8) * 0.55 +
        Math.cos(t * 17.2 + Math.sin(t * 7.5)) * 0.42 +
        Math.sin(t * 33.6 + 0.8) * 0.24 +
        Math.cos(t * 11.4) * 0.18;
      return wave * ampMult * leadProx;
    }

    // 3. TORSADES DE POINTES (Polymorphic VT with twisting amplitude envelope)
    if (rhythm === 'TORSADES') {
      const t = elapsedSec > 0 ? elapsedSec : Date.now() / 1000;
      const twistEnvelope = Math.sin(t * 0.38 * Math.PI * 2); // Axis twisting ~0.38 Hz
      const baseWave =
        Math.sin(beatSec * 28.5) * 1.55 +
        Math.cos(beatSec * 57.0 + 0.3) * 0.45;
      const leadSign = (lead === 'aVR' || lead === 'V1') ? -1 : 1;
      return baseWave * twistEnvelope * leadSign;
    }

    // 4. MONOMORPHIC VENTRICULAR TACHYCARDIA (VT)
    if (rhythm === 'VT_PULSELESS' || rhythm === 'VT_WITH_PULSE') {
      const t = beatSec;
      const vtCycle = 60 / Math.max(120, hr);
      const tInCycle = t % vtCycle;
      let vtWave = 0;

      // Broad bizarre notched QRS (>140ms duration)
      if (tInCycle < 0.18) {
        const qrsNorm = tInCycle / 0.18;
        vtWave = this.gaussianTime(qrsNorm, 0.45, 0.18, 2.35) - this.gaussianTime(qrsNorm, 0.20, 0.08, 0.4);
      } else if (tInCycle < vtCycle) {
        // Discordant large secondary T wave
        const tNorm = (tInCycle - 0.18) / (vtCycle - 0.18);
        vtWave = -this.gaussianTime(tNorm, 0.45, 0.18, 0.95);
      }

      // Precordial concordance and lead vector
      if (lead === 'aVR' || lead === 'V1') {
        return -vtWave * 0.95;
      }
      if (lead === 'V2' || lead === 'V3' || lead === 'V4') {
        return vtWave * 1.35;
      }
      return vtWave * 1.05;
    }

    // 5. TRANSCUTANEOUS PACEMAKER WITH CAPTURE (Paced Ventricular Rhythm)
    if (isPacerCapturing) {
      const t = beatSec;
      if (t < 0.015) {
        return 2.5; // Sharp pacing needle artifact spike (+2.5 mV)
      } else if (t >= 0.015 && t < 0.22) {
        // Broad LBBB-type ventricular depolarization (>160ms)
        const qrsT = (t - 0.015) / 0.205;
        const lbbb = -this.gaussianTime(qrsT, 0.42, 0.18, 2.25);
        if (lead === 'aVR' || lead === 'V1' || lead === 'V2') {
          return lbbb * 1.15; // Deep QS pattern in right precordials
        } else if (lead === 'I' || lead === 'aVL' || lead === 'V5' || lead === 'V6') {
          return -lbbb * 1.0; // Upright broad notched R in lateral leads
        }
        return lbbb;
      } else if (t >= 0.22 && t < 0.45) {
        // Discordant repolarization T wave
        const tNorm = (t - 0.22) / 0.23;
        const discT = this.gaussianTime(tNorm, 0.45, 0.18, 0.80);
        return (lead === 'aVR' || lead === 'V1' || lead === 'V2') ? discT : -discT * 0.75;
      }
      return 0;
    }

    // 6. 3RD DEGREE COMPLETE AV BLOCK (True AV Dissociation)
    if (rhythm === 'AV_BLOCK_3RD') {
      const at = atrialBeatSec;
      // Independent Atrial P waves marching through at ~76 bpm
      const pLeadMult = lead === 'aVR' ? -0.85 : (lead === 'II' || lead === 'V1' ? 1.0 : 0.7);
      const pWave = this.gaussianTime(at, 0.065, 0.022, 0.24 * pLeadMult);

      // Ventricular escape rhythm at ~34 bpm (wide LBBB-like escape complex)
      const t = beatSec;
      let qrsAndT = 0;
      if (t >= 0.10 && t < 0.32) {
        const qrsNorm = (t - 0.10) / 0.22;
        const escapeQRS = this.gaussianTime(qrsNorm, 0.46, 0.16, 2.05);
        qrsAndT = (lead === 'aVR' || lead === 'V1') ? -escapeQRS : escapeQRS;
      } else if (t >= 0.32 && t < 0.60) {
        const tNorm = (t - 0.32) / 0.28;
        const escapeT = -this.gaussianTime(tNorm, 0.46, 0.17, 0.58);
        qrsAndT = (lead === 'aVR' || lead === 'V1') ? -escapeT : escapeT;
      }
      return pWave + qrsAndT;
    }

    // 7. CLINICAL 12-LEAD ELECTROPHYSIOLOGICAL MORPHOLOGY
    // (NSR, SINUS BRADY, SINUS TACHY, AFIB RVR, SVT, STEMI ANTERIOR, STEMI INFERIOR, ISCHEMIA, PEA, ROSC)
    // Parameterized in absolute time: P-wave (0-90ms), PR-segment (90-160ms), QRS (160-245ms = 85ms), ST (245-320ms), T (320-470ms).
    const t = beatSec;

    // QT interval scaling based on Bazett's formula: QTc ~ 400ms -> QT = 0.40 * sqrt(RR)
    const rrSec = hr > 0 ? 60 / hr : 0.8;
    const qtScale = Math.min(1.2, Math.max(0.75, Math.sqrt(rrSec / 0.8)));

    // --- A. P WAVE SYNTHESIS ---
    let pAmp = 0.22;
    let pIsBiphasic = false;

    if (rhythm === 'AFIB_RVR') {
      // Irregular fibrillatory f-waves (400-600/min) without distinct P waves
      const nowT = elapsedSec > 0 ? elapsedSec : Date.now() / 1000;
      pAmp = Math.sin(nowT * 42.0) * 0.045 + Math.cos(nowT * 29.5) * 0.038 + Math.sin(nowT * 58.2) * 0.025;
    } else if (rhythm === 'SVT') {
      pAmp = 0; // Buried or retrograde into QRS
    } else {
      // Lead-specific P wave vector:
      if (lead === 'aVR') {
        pAmp = -0.18; // strictly inverted in aVR
      } else if (lead === 'V1') {
        pIsBiphasic = true; // classic biphasic (+/-) P wave in V1
      } else if (lead === 'II' || lead === 'aVF') {
        pAmp = 0.25; // tallest in lead II (+60°) and aVF
      } else if (lead === 'III') {
        pAmp = 0.12;
      } else if (lead === 'I' || lead === 'aVL' || lead === 'V5' || lead === 'V6') {
        pAmp = 0.18;
      } else {
        pAmp = 0.16;
      }
    }

    let pComponent = 0;
    if (rhythm === 'AFIB_RVR') {
      pComponent = pAmp;
    } else if (pIsBiphasic) {
      // Biphasic in V1: positive initial deflection (right atrium) + negative terminal (left atrium)
      pComponent = this.gaussianTime(t, 0.055, 0.015, 0.14) - this.gaussianTime(t, 0.085, 0.014, 0.12);
    } else {
      pComponent = this.gaussianTime(t, 0.065, 0.022, pAmp);
    }

    // --- B. QRS COMPLEX WITH PRECORDIAL PROGRESSION & ANATOMICAL AXIS ---
    // Total duration: ~85 ms (crisp, narrow supraventricular complex)
    let qAmp = -0.12;
    let rAmp = 2.40;
    let sAmp = -0.48;

    switch (lead) {
      case 'I': // High lateral (0°): modest R (~1.3 mV), small s
        qAmp = -0.08;
        rAmp = 1.35;
        sAmp = -0.20;
        break;

      case 'II': // Standard monitoring lead (+60°): dominant tall R (~2.45 mV)
        qAmp = -0.14;
        rAmp = 2.45;
        sAmp = -0.52;
        break;

      case 'III': // Inferior (+120°): III = II - I
        qAmp = -0.18;
        rAmp = 1.15;
        sAmp = -0.48;
        break;

      case 'aVR': // Inverted vector (-150° looking from right shoulder)
        // Classic medical rule: Under normal sinus rhythm, aVR is COMPLETELY NEGATIVE (rS or QS)
        qAmp = 0.08; // small initial r
        rAmp = -1.85; // deep negative QS
        sAmp = 0.05;
        break;

      case 'aVL': // High lateral (-30°)
        qAmp = -0.10;
        rAmp = 0.95;
        sAmp = -0.18;
        break;

      case 'aVF': // Inferior (+90°)
        qAmp = -0.12;
        rAmp = 1.85;
        sAmp = -0.38;
        break;

      case 'V1': // Septal/RV (4th ICS right sternal): Classic rS pattern (small r, deep S)
        qAmp = 0;
        rAmp = 0.28; // Small initial septal r wave
        sAmp = -1.75; // Deep negative S wave
        break;

      case 'V2': // Septal (4th ICS left sternal): rS pattern (slightly taller r, deep S)
        qAmp = 0;
        rAmp = 0.58;
        sAmp = -1.95;
        break;

      case 'V3': // Transition zone: Equidiphasic RS complex
        qAmp = -0.05;
        rAmp = 1.20;
        sAmp = -1.25;
        break;

      case 'V4': // Anterior/Apex: Dominant tall R wave
        qAmp = -0.10;
        rAmp = 2.05;
        sAmp = -0.38;
        break;

      case 'V5': // Anterolateral: Tall R wave with small septal q
        qAmp = -0.16;
        rAmp = 2.35;
        sAmp = -0.18;
        break;

      case 'V6': // Lateral: Classic qR pattern (distinct septal q, tall R, no S)
        qAmp = -0.22;
        rAmp = 1.72;
        sAmp = 0;
        break;

      case 'PADDLES':
      default:
        qAmp = -0.12;
        rAmp = 2.25;
        sAmp = -0.46;
        break;
    }

    // Absolute timing positions: Q at 0.178s, R at 0.200s, S at 0.222s
    const qComponent = this.gaussianTime(t, 0.178, 0.007, qAmp);
    const rComponent = this.gaussianTime(t, 0.200, 0.010, rAmp);
    const sComponent = this.gaussianTime(t, 0.222, 0.011, sAmp);

    // --- C. ST SEGMENT & T WAVE (WITH RECIPROCAL ISCHEMIA/INFARCTION) ---
    let stOffset = 0;
    let tAmp = 0.44;

    // Normal baseline T wave polarity:
    if (lead === 'aVR') {
      tAmp = -0.32; // Inverted in aVR
    } else if (lead === 'V1') {
      tAmp = -0.12; // Frequently flat or slightly inverted in V1
    } else if (lead === 'III') {
      tAmp = 0.15;
    } else if (lead === 'V4' || lead === 'V5') {
      tAmp = 0.55; // Tallest in V4-V5
    }

    // Pathological Ischemia / Infarction Modulations:
    if (rhythm === 'STEMI_ANTERIOR') {
      // Anterior wall infarction (LAD occlusion):
      // V1, V2, V3, V4: Massive convex ST elevation ("Tombstone" / Lápida) +0.8 to +1.5 mV
      if (lead === 'V1' || lead === 'V2' || lead === 'V3' || lead === 'V4') {
        stOffset = 1.35;
        tAmp = 1.05; // Fused hyperacute T wave
      } else if (lead === 'II' || lead === 'III' || lead === 'aVF') {
        // RECIPROCAL ST DEPRESSION in inferior leads
        stOffset = -0.48;
        tAmp = -0.28;
      } else if (lead === 'I' || lead === 'aVL') {
        stOffset = 0.18; // Mild high lateral involvement
      }
    } else if (rhythm === 'STEMI_INFERIOR') {
      // Inferior wall infarction (RCA/Cx occlusion):
      // II, III, aVF: Marked convex ST elevation, Lead III > Lead II
      if (lead === 'II' || lead === 'III' || lead === 'aVF') {
        const infBoost = lead === 'III' ? 1.25 : 1.05;
        stOffset = 1.15 * infBoost;
        tAmp = 0.88 * infBoost;
      } else if (lead === 'I' || lead === 'aVL') {
        // RECIPROCAL ST DEPRESSION in high lateral leads
        stOffset = -0.52;
        tAmp = -0.32;
      } else if (lead === 'aVR') {
        stOffset = -0.25;
      }
    } else if (rhythm === 'ISCHEMIA') {
      // Subendocardial ischemia:
      // Horizontal or downsloping ST depression (-0.35 mV) and symmetrical deep T wave inversions
      if (lead === 'V4' || lead === 'V5' || lead === 'V6' || lead === 'II' || lead === 'I') {
        stOffset = -0.38;
        tAmp = -0.45;
      }
    }

    // ST segment plateau between S end and T onset (t ~ 0.235s to 0.320s)
    let stComponent = 0;
    const stStart = 0.235;
    const stEnd = 0.235 + 0.085 * qtScale;
    if (t >= stStart && t < stEnd) {
      stComponent = stOffset;
    }

    // Repolarization T Wave (asymmetrical physiological dome: t ~ 0.320s to 0.480s)
    let tComponent = 0;
    const tCenter = 0.235 + 0.150 * qtScale;
    const tSigma = (t - tCenter < 0 ? 0.048 : 0.038) * qtScale;
    if (t >= stStart && t < 0.235 + 0.280 * qtScale) {
      tComponent = this.gaussianTime(t, tCenter, tSigma, tAmp) + stOffset * 0.45;
    }

    return pComponent + qComponent + rComponent + sComponent + stComponent + tComponent;
  }

  /**
   * Generates a single continuous multi-parameter sample point for the live oscilloscope monitor sweep.
   */
  public getNextSample(
    rhythm: CardiacRhythmType,
    lead: ECGLead,
    gain: number = 1.0,
    hr: number = 75,
    rr: number = 14,
    etCO2Target: number = 38,
    spO2: number = 98,
    isPacerActive: boolean = false,
    pacerRate: number = 70,
    pacerCurrent: number = 0,
    captureThreshold: number = 65,
    isCPRActive: boolean = false,
    systolicBP: number = 120,
    diastolicBP: number = 80,
    capnoPattern: 'NORMAL' | 'OBSTRUCTIVE_SHARK_FIN' | 'LOW_CARDIAC_OUTPUT' | 'CPR_PASSIVE' | 'ROSC_SURGE' = 'NORMAL',
    cprQualityMode: 'NORMAL' | 'INEFFECTIVE' | 'ROSC_SURGE' = 'NORMAL',
    airwayManagementMode: 'BVM' | 'ADVANCED_ETT' | 'ESOPHAGEAL_INTUBATION' | 'BRONCHOSPASM' | 'SPONTANEOUS' = 'SPONTANEOUS'
  ): WaveformSample {
    const dt = 1 / this.sampleRate;

    // Check if pacemaker is currently capturing
    const isPacerCapturing = isPacerActive && pacerCurrent >= captureThreshold;
    const effectiveHR = isPacerCapturing ? pacerRate : hr;

    // Set targeted RR interval
    if (rhythm === 'AFIB_RVR') {
      // AFib uses stochastic irregular RR intervals
      this.currentRR = this.afibNextRR;
    } else {
      this.currentRR = effectiveHR > 0 ? 60 / effectiveHR : 1.0;
    }

    // Advance Ventricular cardiac beat time
    this.beatTime += dt;
    let isRPeak = false;

    // R-wave detection window for auditory QRS beep & sync blip (R peak is around 0.198 - 0.205s)
    if (this.beatTime >= 0.195 && this.beatTime <= 0.205) {
      if (
        rhythm !== 'ASYSTOLE' &&
        rhythm !== 'VF_COARSE' &&
        rhythm !== 'VF_FINE'
      ) {
        isRPeak = true;
      }
    }

    if (this.beatTime >= this.currentRR) {
      this.beatTime = 0;
      if (rhythm === 'AFIB_RVR') {
        this.afibNextRR = this.getRandomAfibRR(effectiveHR);
      }
    }

    // Advance independent Atrial beat time (for 3rd degree AV block dissociation)
    const atrialHR = 76;
    const atrialRR = 60 / atrialHR;
    this.atrialBeatTime += dt;
    if (this.atrialBeatTime >= atrialRR) {
      this.atrialBeatTime = 0;
    }

    // Ventilation Rate determination:
    // If CPR + Advanced Airway (ETT/i-gel): 1 ventilation every 6s = 10 rpm fixed
    // If CPR + Basic BVM: 30:2 cycle (~6-8 ventilations/min equivalent)
    let effectiveRR = rr;
    if (isCPRActive) {
      if (airwayManagementMode === 'ADVANCED_ETT') {
        effectiveRR = 10;
      } else {
        effectiveRR = 8; // 30:2 ratio ventilations
      }
    } else if (airwayManagementMode === 'ADVANCED_ETT' && effectiveRR <= 0) {
      effectiveRR = 10;
    }

    // Advance Respiratory phase (for Capnography & subtle baseline wander)
    const respCycleDuration = effectiveRR > 0 ? 60 / effectiveRR : 4.0;
    this.respPhase += dt / respCycleDuration;
    if (this.respPhase >= 1.0) {
      this.respPhase -= 1.0;
    }

    // Torsades de Pointes envelope cycle (~0.35 Hz twist)
    this.torsadesCycle += dt * 0.35;

    // Subtle breathing baseline wander (0.15 Hz) & micro-noise
    this.baselineNoise = (Math.random() - 0.5) * 0.015;
    this.respirationDrift = Math.sin(this.respPhase * Math.PI * 2) * 0.022;

    // 1. Compute exact anatomical ECG voltage for the selected lead
    let ecgRaw = this.getECGVoltageForLead(
      lead,
      this.beatTime,
      rhythm,
      effectiveHR,
      isPacerCapturing,
      this.atrialBeatTime,
      Date.now() / 1000
    );

    let hasSpike = false;
    // Pacemaker needle spike if pacer is searching (active but not captured)
    if (isPacerActive && !isPacerCapturing) {
      if (this.beatTime < 0.015) {
        ecgRaw += 2.4;
        hasSpike = true;
      }
    }

    // CPR Compressions motion artifact on ECG if active
    if (isCPRActive) {
      const cprT = Date.now() / 1000;
      // High-amplitude mechanical chest compression waveform (~110 cpm = ~1.83 Hz)
      const cprPhase = (cprT * 1.83) % 1.0;
      const compressionSpike = cprPhase < 0.22
        ? Math.sin((cprPhase / 0.22) * Math.PI) * 1.30
        : -Math.sin(((cprPhase - 0.22) / 0.78) * Math.PI) * 0.50;
      const harmonicNoise = Math.sin(cprT * 23.5) * 0.18 + (Math.random() - 0.5) * 0.12;
      ecgRaw += (compressionSpike + harmonicNoise);
    }

    const finalEcg = ecgRaw * gain + this.respirationDrift + this.baselineNoise;

    // 2. PHOTOPLETHYSMOGRAM (SpO2 PLETH CURVE)
    let pleth = 0;
    const isPerfusionLost =
      rhythm === 'VF_COARSE' ||
      rhythm === 'VF_FINE' ||
      rhythm === 'VT_PULSELESS' ||
      rhythm === 'ASYSTOLE' ||
      rhythm === 'PEA';

    if (isPerfusionLost && !isPacerCapturing) {
      // In cardiac arrest: flatline without pulse, or rhythmic compression wave from CPR
      if (isCPRActive) {
        const cprT = Date.now() / 1000;
        const cprPhase = (cprT * 1.8) % 1.0;
        // Compression-generated peripheral pulse wave (~0.28 amplitude)
        pleth = cprPhase < 0.35
          ? Math.sin((cprPhase / 0.35) * Math.PI) * 0.32
          : Math.max(0.02, 0.32 * Math.exp(-(cprPhase - 0.35) * 5.0));
      } else {
        pleth = 0.01; // Isoelectric flatline (pulseless)
      }
    } else {
      // Physiological arterial pulse wave:
      // Modulated by SpO2, systolic BP, and pulse pressure (systolic - diastolic)
      const p = this.currentRR > 0 ? this.beatTime / this.currentRR : 0;
      const pulsePressure = Math.max(10, systolicBP - diastolicBP);
      const bpScale = Math.min(1.4, Math.max(0.2, (systolicBP / 120) * (pulsePressure / 40)));
      const spo2Factor = Math.pow(Math.max(0.1, spO2 / 100), 1.6);
      const perfusionScale = bpScale * spo2Factor;

      // Dicrotic notch prominence diminishes in shock / severe hypotension
      const dicroticDepth = Math.max(0.04, Math.min(0.22, (pulsePressure / 50) * 0.18));

      if (p < 0.18) {
        // Fast systolic upstroke
        pleth = Math.sin((p / 0.18) * (Math.PI / 2)) * perfusionScale;
      } else if (p >= 0.18 && p < 0.34) {
        // Early systolic descent towards incisura dícrota
        const dNorm = (p - 0.18) / 0.16;
        pleth = (1.0 - dNorm * 0.45) * perfusionScale;
      } else if (p >= 0.34 && p < 0.48) {
        // Dicrotic notch bounce (cierre de válvula aórtica)
        const notchNorm = (p - 0.34) / 0.14;
        const bounce = Math.sin(notchNorm * Math.PI) * dicroticDepth;
        pleth = (0.55 + bounce) * perfusionScale;
      } else {
        // Diastolic runoff exponential decay
        const decayNorm = (p - 0.48) / 0.52;
        pleth = (0.55 * Math.exp(-decayNorm * 2.9)) * perfusionScale;
      }
    }

    // 3. CAPNOGRAPHY (EtCO2 CURVE)
    let co2 = 0;
    const rP = this.respPhase;

    // A. Malposition / Esophageal Intubation: Tracheal gas is not exhaled (Flatline 0-2 mmHg)
    if (airwayManagementMode === 'ESOPHAGEAL_INTUBATION') {
      // Flatline with negligible noise
      co2 = Math.max(0, (Math.random() - 0.4) * 0.9);
    } else if (isPerfusionLost && !isPacerCapturing) {
      if (isCPRActive) {
        // CPR Capnography:
        // Dependent on CPR Quality mode:
        // - INEFFECTIVE: EtCO2 < 10 mmHg (fatigue, inadequate depth/rate)
        // - NORMAL: EtCO2 18-24 mmHg (AHA guideline high quality CPR)
        // - ROSC_SURGE: EtCO2 surges to 40-50 mmHg (pathognomonic of spontaneous circulation!)
        let baseline = 20;
        let rippleAmp = 4.8;
        if (cprQualityMode === 'INEFFECTIVE') {
          baseline = 6.5;
          rippleAmp = 1.8;
        } else if (cprQualityMode === 'ROSC_SURGE') {
          baseline = 45.0;
          rippleAmp = 5.5;
        } else {
          baseline = Math.max(16, Math.min(26, etCO2Target > 12 ? etCO2Target : 20));
        }

        const cprT = Date.now() / 1000;
        const cprOscillation = (Math.sin(cprT * 11.3) * 0.5 + 0.5) * rippleAmp;
        const ventilationEnvelope = Math.sin(rP * Math.PI);
        co2 = Math.max(0, (baseline * 0.72 + cprOscillation) * (0.6 + 0.4 * ventilationEnvelope));
      } else {
        // Apnea without compressions in cardiac arrest: minimal alveolar diffusion (< 5 mmHg)
        co2 = Math.max(0, 3.5 * Math.sin(rP * Math.PI));
      }
    } else {
      // Genuine 4-Phase Capnogram:
      // Phase I: Inspiration (CO2 = 0)
      // Phase II: Expiratory upstroke (dead space wash out)
      // Phase III: Alveolar plateau
      // Phase IV: Inspiratory downstroke
      const isSharkFin = capnoPattern === 'OBSTRUCTIVE_SHARK_FIN' || airwayManagementMode === 'BRONCHOSPASM';

      if (isSharkFin) {
        // Bronchospasm / Asthma / COPD: "Aleta de tiburón"
        // Sluggish Phase II, continuous upward sloping Phase III without flat plateau
        if (rP < 0.18) {
          const upNorm = rP / 0.18;
          co2 = etCO2Target * 0.55 * Math.pow(upNorm, 1.8);
        } else if (rP >= 0.18 && rP < 0.60) {
          const slopeNorm = (rP - 0.18) / 0.42;
          co2 = etCO2Target * (0.55 + 0.45 * Math.pow(slopeNorm, 1.2));
        } else if (rP >= 0.60 && rP < 0.68) {
          const downNorm = (rP - 0.60) / 0.08;
          co2 = etCO2Target * (1.0 - downNorm);
        } else {
          co2 = 0;
        }
      } else {
        // Standard Clinical / Cardiac Capnogram
        const plateauSlope = spO2 < 90 ? 0.18 : 0.08;
        if (rP < 0.08) {
          const upstrokeNorm = rP / 0.08;
          co2 = etCO2Target * Math.sin(upstrokeNorm * (Math.PI / 2));
        } else if (rP >= 0.08 && rP < 0.52) {
          const plateauProgress = (rP - 0.08) / 0.44;
          co2 = etCO2Target * ((1.0 - plateauSlope) + plateauSlope * plateauProgress);
        } else if (rP >= 0.52 && rP < 0.58) {
          const downProgress = (rP - 0.52) / 0.06;
          co2 = etCO2Target * (1.0 - downProgress);
        } else {
          co2 = 0;
        }
      }
    }

    return {
      ecgVoltage: finalEcg,
      isRWavePeak: isRPeak,
      plethVoltage: Math.max(0, Math.min(1.0, pleth)),
      co2Voltage: Math.max(0, co2),
      hasPacerSpike: hasSpike,
    };
  }

  /**
   * Evaluates rhythm shockability based on AHA / ERC guidelines
   */
  public isRhythmShockable(rhythm: CardiacRhythmType): boolean {
    return (
      rhythm === 'VF_COARSE' ||
      rhythm === 'VF_FINE' ||
      rhythm === 'VT_PULSELESS' ||
      rhythm === 'TORSADES'
    );
  }
}

export const cardiologyEngine = new CardiologyEngine();
