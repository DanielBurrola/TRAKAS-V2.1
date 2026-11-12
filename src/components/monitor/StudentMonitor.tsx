/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SimSessionState, ActiveAlarm, DEFAULT_ALARM_LIMITS, AlarmLimits } from '../../types/medical';
import { ECGCanvas } from './ECGCanvas';
import { VitalTile } from './VitalTile';
import { ZollBezel } from './ZollBezel';
import { DefibStripModal } from './DefibStripModal';
import { AlarmBanner } from './AlarmBanner';
import { AlarmLimitsModal } from './AlarmLimitsModal';
import { StudentTreatmentDrawer } from './StudentTreatmentDrawer';
import { medicalAudio } from '../../utils/audioSynthesizer';
import { cardiologyEngine } from '../../utils/cardiologyEngine';
import { BatteryCharging, Radio, FileText, Sliders, Lock, AlertOctagon, User, BookOpen, Stethoscope, Syringe } from 'lucide-react';
import { CLINICAL_SCENARIOS } from '../../data/clinicalScenarios';

interface StudentMonitorProps {
  sessionState: SimSessionState;
  onUpdateSession: (partial: Partial<SimSessionState>) => void;
  onOpenSampleModal?: () => void;
}

export const StudentMonitor: React.FC<StudentMonitorProps> = ({
  sessionState,
  onUpdateSession,
  onOpenSampleModal,
}) => {
  const [isStripModalOpen, setIsStripModalOpen] = useState(false);
  const [is12LeadActive, setIs12LeadActive] = useState(false);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [silenceRemaining, setSilenceRemaining] = useState<number>(() => medicalAudio.getSilenceRemaining());
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [isTreatmentDrawerOpen, setIsTreatmentDrawerOpen] = useState<boolean>(false);

  const isTwelveLeadActive = is12LeadActive || !!sessionState.is12LeadProjected;

  // Subscribe to audio alarm silence countdown ticks
  React.useEffect(() => {
    medicalAudio.setSilenceCallback((remaining) => {
      setSilenceRemaining(remaining);
    });
    return () => {
      medicalAudio.setSilenceCallback(undefined);
    };
  }, []);

  // Auto-open SAMPLE modal when instructor projects it
  const prevProjectedRef = React.useRef(sessionState.isProjectedToStudent);
  React.useEffect(() => {
    if (!prevProjectedRef.current && sessionState.isProjectedToStudent && onOpenSampleModal) {
      onOpenSampleModal();
    }
    prevProjectedRef.current = sessionState.isProjectedToStudent;
  }, [sessionState.isProjectedToStudent, onOpenSampleModal]);

  // Auto-close open modals when simulation is reset to initial state
  React.useEffect(() => {
    if (sessionState.scenarioElapsedSeconds === 0 && sessionState.defib.totalShocksDelivered === 0) {
      setIs12LeadActive(false);
      setIsStripModalOpen(false);
      setFeedbackBanner(null);
    }
  }, [sessionState.scenarioElapsedSeconds, sessionState.defib.totalShocksDelivered]);

  const { vitals, defib, pacer, currentRhythm, selectedLead, gain, dialMode } = sessionState;

  const currentScenario =
    sessionState.customScenario && sessionState.customScenario.id === sessionState.activeScenarioId
      ? sessionState.customScenario
      : CLINICAL_SCENARIOS.find((s) => s.id === sessionState.activeScenarioId) || CLINICAL_SCENARIOS[0];

  // Format scenario elapsed time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Lead cycling: I -> II -> III -> aVR -> aVL -> aVF -> V1...V6 -> PADDLES
  const handleCycleLead = () => {
    const leads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'PADDLES'] as const;
    const currentIdx = leads.indexOf(selectedLead as (typeof leads)[number]);
    const nextLead = leads[(currentIdx + 1) % leads.length];
    onUpdateSession({
      selectedLead: nextLead,
      studentLastAction: {
        action: 'DIAL_CHANGE',
        timestamp: new Date().toLocaleTimeString(),
        details: `Cambio de derivación a ${nextLead}`,
      },
    });
  };

  // Gain cycling: 0.5 -> 1 -> 1.5 -> 2 -> 3
  const handleCycleGain = () => {
    const gains = [0.5, 1.0, 1.5, 2.0, 3.0];
    const currentIdx = gains.indexOf(gain);
    const nextGain = gains[(currentIdx + 1) % gains.length];
    onUpdateSession({ gain: nextGain });
  };

  // Energy Selection: 5 to 360 Joules
  const energyLevels = [5, 10, 20, 30, 50, 70, 100, 120, 150, 200, 300, 360];
  const handleSelectEnergyUp = () => {
    const currentIdx = energyLevels.indexOf(defib.selectedEnergy);
    if (currentIdx < energyLevels.length - 1) {
      const nextEnergy = energyLevels[currentIdx + 1];
      onUpdateSession({
        defib: { ...defib, selectedEnergy: nextEnergy },
      });
    }
  };

  const handleSelectEnergyDown = () => {
    const currentIdx = energyLevels.indexOf(defib.selectedEnergy);
    if (currentIdx > 0) {
      const nextEnergy = energyLevels[currentIdx - 1];
      onUpdateSession({
        defib: { ...defib, selectedEnergy: nextEnergy },
      });
    }
  };

  // Interface mode: Palas vs Parches
  const handleInterfaceModeChange = (mode: 'PADDLES' | 'PATCHES') => {
    onUpdateSession({
      defib: { ...defib, interfaceMode: mode },
      selectedLead: mode === 'PADDLES' ? 'PADDLES' : 'II',
      studentLastAction: {
        action: 'DIAL_CHANGE',
        timestamp: new Date().toLocaleTimeString(),
        details: `Interfaz cambiada a: ${mode === 'PADDLES' ? 'PALAS RÍGIDAS' : 'PARCHES MULTIFUNCIÓN'}`,
      },
    });
  };

  // Defibrillator Step 2: CHARGE
  const handleCharge = () => {
    if (dialMode !== 'DEFIB' && dialMode !== 'MONITOR') {
      onUpdateSession({ dialMode: 'DEFIB' });
    }

    onUpdateSession({
      defib: { ...defib, isCharging: true, chargeProgress: 0, isCharged: false, analysisResult: 'NONE' },
      studentLastAction: {
        action: 'CHARGE',
        timestamp: new Date().toLocaleTimeString(),
        details: `Cargando condensador a ${defib.selectedEnergy} Joules`,
      },
    });

    medicalAudio.startChargeTone(2.8);

    let progress = 0;
    const interval = window.setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(interval);
        medicalAudio.stopChargeTone();
        medicalAudio.playDefibReadyBeep();
        onUpdateSession({
          defib: {
            ...sessionState.defib,
            isCharging: false,
            chargeProgress: 100,
            isCharged: true,
          },
          studentLastAction: {
            action: 'CHARGE',
            timestamp: new Date().toLocaleTimeString(),
            details: `¡Condensador cargado a ${sessionState.defib.selectedEnergy} J - Listo para descarga!`,
          },
        });
      } else {
        onUpdateSession({
          defib: {
            ...sessionState.defib,
            chargeProgress: progress,
          },
        });
      }
    }, 450);
  };

  // Defibrillator Step 3: SHOCK / CARDIOVERSION DISCHARGE
  const handleDeliverShock = () => {
    if (!defib.isCharged) return;

    medicalAudio.playShockDischarge();

    const timestamp = new Date().toLocaleTimeString();
    const shockJoules = defib.selectedEnergy;
    const isSync = defib.isSyncMode;

    let postShockRhythm = currentRhythm;
    let message = '';

    if (isSync) {
      // Synchronized Cardioversion
      if (currentRhythm === 'VT_WITH_PULSE' || currentRhythm === 'SVT' || currentRhythm === 'AFIB_RVR') {
        postShockRhythm = 'NSR';
        message = `¡CARDIOVERSIÓN SINCRONIZADA EXITOSA A ${shockJoules}J!`;
        onUpdateSession({
          vitals: {
            ...vitals,
            heartRate: 76,
            spO2: 98,
            etCO2: 38,
            systolicBP: 120,
            diastolicBP: 80,
            meanArterialPressure: 93,
          },
        });
      } else {
        message = `Cardioversión sincronizada entregada a ${shockJoules}J.`;
      }
    } else {
      // Unsynchronized Defibrillation
      const wasShockable = cardiologyEngine.isRhythmShockable(currentRhythm);
      if (wasShockable) {
        if (currentRhythm === 'VF_COARSE' || currentRhythm === 'VF_FINE') {
          postShockRhythm = 'PEA'; // Termination of VF into PEA (AHA guideline)
          message = `¡DESFIBRILACIÓN ADMINISTRADA DE ${shockJoules}J! Continuar RCP 2 minutos.`;
        } else if (currentRhythm === 'VT_PULSELESS' || currentRhythm === 'TORSADES') {
          postShockRhythm = 'ROSC';
          message = `¡DESFIBRILACIÓN EXITOSA DE ${shockJoules}J! Retorno de circulación espontánea.`;
        }
      } else {
        message = `Descarga no sincronizada entregada a ${shockJoules}J.`;
      }
    }

    setFeedbackBanner(message);
    setTimeout(() => setFeedbackBanner(null), 5000);

    onUpdateSession({
      currentRhythm: postShockRhythm,
      defib: {
        ...defib,
        isCharged: false,
        chargeProgress: 0,
        analysisResult: 'NONE',
        totalShocksDelivered: defib.totalShocksDelivered + 1,
        lastShockJoules: shockJoules,
        lastShockTime: timestamp,
      },
      studentLastAction: {
        action: 'SHOCK',
        timestamp,
        details: isSync
          ? `Cardioversión sincronizada a ${shockJoules} J entregada (${currentRhythm} -> ${postShockRhythm})`
          : `Desfibrilación manual a ${shockJoules} J entregada (${currentRhythm} -> ${postShockRhythm})`,
      },
      log: [
        {
          id: `shock-${Date.now()}`,
          time: timestamp,
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'SHOCK',
          description: isSync
            ? `Cardioversión sincronizada TRAKAS-3000: ${shockJoules} Joules`
            : `Descarga de desfibrilación TRAKAS-3000: ${shockJoules} Joules`,
          details: `Ritmo previo: ${currentRhythm} · Post: ${postShockRhythm} · Interfaz: ${defib.interfaceMode}`,
        },
        ...sessionState.log,
      ],
    });
  };

  // Synchronized Cardioversion Mode Toggle
  const handleToggleSync = () => {
    const nextSync = !defib.isSyncMode;
    onUpdateSession({
      defib: { ...defib, isSyncMode: nextSync },
      studentLastAction: {
        action: 'SYNC_TOGGLE',
        timestamp: new Date().toLocaleTimeString(),
        details: nextSync ? 'Modo SYNC activado (marcas sobre onda R)' : 'Modo SYNC desactivado',
      },
    });
  };

  // AED Advisory rhythm analysis
  const handleAnalyze = () => {
    onUpdateSession({
      defib: { ...defib, isAnalyzing: true, analysisResult: 'NONE' },
    });

    setTimeout(() => {
      const isShockable = cardiologyEngine.isRhythmShockable(currentRhythm);
      onUpdateSession({
        defib: {
          ...sessionState.defib,
          isAnalyzing: false,
          analysisResult: isShockable ? 'SHOCK_ADVISED' : 'NO_SHOCK_ADVISED',
        },
      });
      if (isShockable) {
        medicalAudio.playDefibReadyBeep();
      }
      // Auto-clear prompt after 5 seconds so it does not stay permanently
      setTimeout(() => {
        onUpdateSession({
          defib: {
            ...sessionState.defib,
            analysisResult: 'NONE',
          },
        });
      }, 5000);
    }, 3000);
  };

  // Transcutaneous Pacemaker
  const handleTogglePacer = () => {
    const nextActive = !pacer.isActive;
    onUpdateSession({
      pacer: { ...pacer, isActive: nextActive },
      dialMode: nextActive ? 'PACER' : dialMode,
      studentLastAction: {
        action: nextActive ? 'PACER_ON' : 'PACER_OFF',
        timestamp: new Date().toLocaleTimeString(),
        details: `Marcapasos ${nextActive ? 'ENCENDIDO' : 'APAGADO'} a ${pacer.rate} PPM / ${pacer.outputCurrent} mA`,
      },
      log: [
        {
          id: `pacer-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'PACER',
          description: `Marcapasos TRAKAS-3000 ${nextActive ? 'ACTIVADO' : 'DESACTIVADO'}`,
          details: `Frecuencia: ${pacer.rate} PPM · Corriente: ${pacer.outputCurrent} mA`,
        },
        ...sessionState.log,
      ],
    });
  };

  const handlePacerRateChange = (delta: number) => {
    const newRate = Math.max(30, Math.min(180, pacer.rate + delta));
    onUpdateSession({
      pacer: { ...pacer, rate: newRate },
      studentLastAction: {
        action: 'PACER_RATE',
        timestamp: new Date().toLocaleTimeString(),
        details: `Frecuencia de marcapasos ajustada a ${newRate} PPM`,
      },
    });
  };

  const handlePacerCurrentChange = (delta: number) => {
    const newCurrent = Math.max(0, Math.min(140, pacer.outputCurrent + delta));
    const isNowCaptured = newCurrent >= pacer.captureThreshold;

    let updatedVitals = { ...vitals };
    if (isNowCaptured && pacer.isActive) {
      updatedVitals.heartRate = pacer.rate;
      updatedVitals.spO2 = 96;
      updatedVitals.systolicBP = 110;
      updatedVitals.diastolicBP = 68;
      updatedVitals.meanArterialPressure = 82;
    }

    onUpdateSession({
      pacer: { ...pacer, outputCurrent: newCurrent, isCapturing: isNowCaptured },
      vitals: updatedVitals,
      studentLastAction: {
        action: 'PACER_MA',
        timestamp: new Date().toLocaleTimeString(),
        details: `Corriente de marcapasos: ${newCurrent} mA ${isNowCaptured ? '(CAPTURA ALCANZADA)' : '(SIN CAPTURA)'}`,
      },
    });
  };

  const handleToggle4to1 = () => {
    onUpdateSession({
      pacer: { ...pacer, isFourToOne: !pacer.isFourToOne },
    });
  };

  // NIBP Measurement
  const handleTriggerNibp = () => {
    if (sessionState.isNibpMeasuring) return;
    medicalAudio.playNibpPump();
    onUpdateSession({ isNibpMeasuring: true });

    setTimeout(() => {
      onUpdateSession({
        isNibpMeasuring: false,
        log: [
          {
            id: `nibp-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            elapsedSeconds: sessionState.scenarioElapsedSeconds,
            type: 'NIBP',
            description: `Presión Arterial PANI: ${vitals.systolicBP}/${vitals.diastolicBP} mmHg (PAM: ${vitals.meanArterialPressure})`,
          },
          ...sessionState.log,
        ],
      });
    }, 4000);
  };

  const limits = sessionState.alarmLimits || DEFAULT_ALARM_LIMITS;

  const isArrest =
    currentRhythm === 'VF_COARSE' ||
    currentRhythm === 'VF_FINE' ||
    currentRhythm === 'VT_PULSELESS' ||
    currentRhythm === 'ASYSTOLE' ||
    currentRhythm === 'PEA';

  const displayedEtCO2 = isArrest
    ? sessionState.isCPRActive
      ? 18
      : Math.min(vitals.etCO2, 8)
    : vitals.etCO2;

  // 1. SpO2 Hypoxemia Alarm (Prompt requirement: SpO2 < 90%)
  const isSpO2Alarming = vitals.spO2 > 0 && vitals.spO2 < limits.spo2Low;
  const isSpO2Critical = isSpO2Alarming && vitals.spO2 < 85;

  // 2. PETCO2 / EtCO2 Alarm
  const isEtCO2LowAlarming = !isArrest && displayedEtCO2 > 0 && displayedEtCO2 < limits.etco2Low;
  const isEtCO2HighAlarming = !isArrest && displayedEtCO2 > limits.etco2High;
  const isEtCO2Alarming = isEtCO2LowAlarming || isEtCO2HighAlarming;

  // 3. TA / Blood Pressure (PANI / NIBP) Alarm
  const isHypotension =
    vitals.systolicBP > 0 &&
    (vitals.systolicBP < limits.systolicLow || (vitals.meanArterialPressure > 0 && vitals.meanArterialPressure < limits.mapLow));
  const isSevereShock = isHypotension && (vitals.systolicBP < 75 || vitals.meanArterialPressure < 55);
  const isHypertensionCrisis = vitals.systolicBP > limits.systolicHigh || vitals.diastolicBP > limits.diastolicHigh;
  const isBpAlarming = isHypotension || isHypertensionCrisis;

  // 4. Arrhythmia & Heart Rate Alarm
  const isBradycardia = !isArrest && vitals.heartRate > 0 && vitals.heartRate < limits.hrLow;
  const isTachycardia = !isArrest && vitals.heartRate > limits.hrHigh;
  const isHeartRateAlarming = isArrest || isBradycardia || isTachycardia;

  // Build structured active alarms list
  const activeAlarms: ActiveAlarm[] = [];

  if (isArrest) {
    activeAlarms.push({
      id: 'alarm-arrest',
      parameter: 'RHYTHM',
      priority: 'HIGH',
      title: 'PARO CARDÍACO',
      message: `Ritmo de paro: ${currentRhythm}`,
      value: currentRhythm,
    });
  }

  if (isSpO2Alarming) {
    activeAlarms.push({
      id: 'alarm-spo2',
      parameter: 'SPO2',
      priority: isSpO2Critical ? 'HIGH' : 'HIGH',
      title: isSpO2Critical ? 'HIPOXEMIA SEVERA' : 'DESATURACIÓN SpO2 < 90%',
      message: `Saturación de O2 al ${vitals.spO2}% (Límite crítico < ${limits.spo2Low}%)`,
      value: `${vitals.spO2}%`,
    });
  }

  if (isSevereShock) {
    activeAlarms.push({
      id: 'alarm-shock',
      parameter: 'BP',
      priority: 'HIGH',
      title: 'SHOCK / HIPOTENSIÓN SEVERA',
      message: `Presión arterial crítica ${vitals.systolicBP}/${vitals.diastolicBP} mmHg (PAM ${vitals.meanArterialPressure} mmHg)`,
      value: `${vitals.systolicBP}/${vitals.diastolicBP}`,
    });
  } else if (isHypotension) {
    activeAlarms.push({
      id: 'alarm-bp-low',
      parameter: 'BP',
      priority: 'HIGH',
      title: 'HIPOTENSIÓN ARTERIAL',
      message: `PAS ${vitals.systolicBP} mmHg (< ${limits.systolicLow}) / PAM ${vitals.meanArterialPressure} mmHg`,
      value: `${vitals.systolicBP}/${vitals.diastolicBP}`,
    });
  } else if (isHypertensionCrisis) {
    activeAlarms.push({
      id: 'alarm-bp-high',
      parameter: 'BP',
      priority: 'MEDIUM',
      title: 'CRISIS HIPERTENSIVA',
      message: `PA ${vitals.systolicBP}/${vitals.diastolicBP} mmHg (> ${limits.systolicHigh}/${limits.diastolicHigh})`,
      value: `${vitals.systolicBP}/${vitals.diastolicBP}`,
    });
  }

  if (isEtCO2LowAlarming) {
    activeAlarms.push({
      id: 'alarm-etco2-low',
      parameter: 'ETCO2',
      priority: displayedEtCO2 < 15 ? 'HIGH' : 'MEDIUM',
      title: displayedEtCO2 < 15 ? 'PETCO2 CRÍTICA / APNEA' : 'PETCO2 BAJA (HIPOCAPNIA)',
      message: `EtCO2 ${displayedEtCO2} mmHg (Límite < ${limits.etco2Low} mmHg) - Hipoperfusión / Hipocapnia`,
      value: `${displayedEtCO2} mmHg`,
    });
  } else if (isEtCO2HighAlarming) {
    activeAlarms.push({
      id: 'alarm-etco2-high',
      parameter: 'ETCO2',
      priority: 'MEDIUM',
      title: 'PETCO2 ELEVADA (HIPERCAPNIA)',
      message: `EtCO2 ${displayedEtCO2} mmHg (Límite > ${limits.etco2High} mmHg) - Hipoventilación`,
      value: `${displayedEtCO2} mmHg`,
    });
  }

  if (isBradycardia) {
    activeAlarms.push({
      id: 'alarm-brady',
      parameter: 'HR',
      priority: 'HIGH',
      title: 'BRADICARDIA SEVERA',
      message: `Frecuencia cardíaca ${vitals.heartRate} lpm (< ${limits.hrLow} lpm)`,
      value: `${vitals.heartRate} lpm`,
    });
  } else if (isTachycardia) {
    activeAlarms.push({
      id: 'alarm-tachy',
      parameter: 'HR',
      priority: 'MEDIUM',
      title: 'TAQUICARDIA SEVERA',
      message: `Frecuencia cardíaca ${vitals.heartRate} lpm (> ${limits.hrHigh} lpm)`,
      value: `${vitals.heartRate} lpm`,
    });
  }

  // Synchronize continuous audible alarm sound with active alarms
  React.useEffect(() => {
    const hasAlarm = activeAlarms.length > 0;
    const highestPriority = activeAlarms.some((a) => a.priority === 'HIGH') ? 'HIGH' : 'MEDIUM';
    medicalAudio.updateAlarmStatus(hasAlarm, highestPriority);

    return () => {
      medicalAudio.stopAlarmSound();
    };
  }, [
    activeAlarms.length,
    isSpO2Alarming,
    isEtCO2Alarming,
    isBpAlarming,
    isHeartRateAlarming,
    sessionState.isMuted,
  ]);

  const handleToggleSilence = () => {
    if (medicalAudio.isSilenced()) {
      medicalAudio.cancelSilence();
      setSilenceRemaining(0);
    } else {
      medicalAudio.silenceAlarms(120);
      setSilenceRemaining(120);
    }
  };

  const handleSaveLimits = (newLimits: AlarmLimits) => {
    onUpdateSession({
      alarmLimits: newLimits,
      log: [
        {
          id: `limits-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'INTERVENTION',
          description: `Límites de alarma actualizados: SpO2 < ${newLimits.spo2Low}%, EtCO2 ${newLimits.etco2Low}-${newLimits.etco2High}, PAS ${newLimits.systolicLow}-${newLimits.systolicHigh}`,
        },
        ...sessionState.log,
      ],
    });
  };

  return (
    <div className="w-full flex flex-col bg-[#111418] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2b3138] text-neutral-100 select-none">
      {/* 1. TOP HARDWARE INTERFACE: PADDLES VS PATCHES SELECTOR */}
      <div className="px-4 py-2 bg-[#171c22] border-b border-[#2b3138] flex flex-wrap items-center justify-between text-xs font-sans text-neutral-300">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
            CONMUTADOR DE INTERFAZ:
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={defib.interfaceMode === 'PADDLES'}
              onChange={() => handleInterfaceModeChange('PADDLES')}
              className="accent-emerald-500 cursor-pointer"
            />
            <span className={defib.interfaceMode === 'PADDLES' ? 'text-white font-bold' : 'text-neutral-400'}>
              PALAS RÍGIDAS
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={defib.interfaceMode === 'PATCHES'}
              onChange={() => handleInterfaceModeChange('PATCHES')}
              className="accent-emerald-500 cursor-pointer"
            />
            <span className={defib.interfaceMode === 'PATCHES' ? 'text-white font-bold' : 'text-neutral-400'}>
              PARCHES MULTI-FUNCIÓN
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          {sessionState.isProjectedToStudent && onOpenSampleModal && (
            <button
              onClick={onOpenSampleModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-950/90 hover:bg-amber-900 border border-amber-500 text-amber-300 font-mono text-[11px] font-bold animate-pulse cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all"
              title="El facilitador ha proyectado la ficha clínica del caso (SAMPLE, XABCDE, 5Hs y 5Ts)"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>CASO CLÍNICO PROYECTADO (SAMPLE / XABCDE)</span>
            </button>
          )}

          <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-400">
            <span className="text-white font-bold font-mono tracking-wider">TRAKAS-3000 Plus</span>
            <span>·</span>
            <span>TIEMPO: <strong className="text-white font-lcd">{formatTime(sessionState.scenarioElapsedSeconds)}</strong></span>
            <span>·</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <BatteryCharging className="w-3.5 h-3.5" />
              AC 100%
            </span>
          </div>
        </div>
      </div>

      {/* Visual Alarm Banner (IEC 60601-1-8 standard with Silence 120s timer) */}
      <AlarmBanner
        alarms={activeAlarms}
        isSilenced={silenceRemaining > 0}
        silenceRemaining={silenceRemaining}
        isMuted={sessionState.isMuted}
        onToggleSilence={handleToggleSilence}
        onOpenLimitsModal={() => setIsLimitsModalOpen(true)}
      />

      {/* Dynamic Feedback Banner */}
      {feedbackBanner && (
        <div className="bg-emerald-950/90 border-b border-emerald-500 text-emerald-200 px-4 py-2 text-xs font-bold text-center animate-pulse">
          {feedbackBanner}
        </div>
      )}

      {/* 2. MAIN CLINICAL MONITOR STAGE (CANVAS + VITALS SIDEBAR) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b-2 border-[#2b3138] flex-1 min-h-[360px]">
        {/* Left Stage: 60fps Oscilloscope Canvas (Cols 1-9) */}
        <div className="lg:col-span-9 relative bg-[#020603] min-h-[340px] md:min-h-[380px] lg:min-h-[420px] border-r border-[#2b3138] flex flex-col">
          <ECGCanvas
            rhythm={currentRhythm}
            lead={selectedLead}
            gain={gain}
            heartRate={vitals.heartRate}
            respRate={vitals.respRate}
            etCO2={vitals.etCO2}
            spO2={vitals.spO2}
            systolicBP={vitals.systolicBP}
            diastolicBP={vitals.diastolicBP}
            capnoPattern={currentScenario.capnographyPattern}
            cprQualityMode={sessionState.cprQualityMode || 'NORMAL'}
            airwayManagementMode={sessionState.airwayManagementMode || 'SPONTANEOUS'}
            defibState={defib}
            pacerState={pacer}
            isCPRActive={sessionState.isCPRActive}
            isTwelveLeadMode={isTwelveLeadActive}
            onCloseTwelveLead={() => {
              setIs12LeadActive(false);
              onUpdateSession({ is12LeadProjected: false });
            }}
          />

          {/* FACILITATOR SCREEN LOCK OVERLAY */}
          {sessionState.isScreenLockedByInstructor && (
            <div className="absolute inset-0 bg-[#090b0ee6] backdrop-blur-md z-20 p-6 flex flex-col justify-center items-center text-center animate-in fade-in duration-300">
              {sessionState.studentProjectionMode === 'CASE_SUMMARY' ? (
                <div className="max-w-2xl bg-[#13181f] border-2 border-amber-500/80 rounded-2xl p-6 text-left shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-700">
                    <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-sm">
                      <BookOpen className="w-5 h-5" />
                      <span>CASO CLÍNICO PROYECTADO POR EL DOCENTE</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
                      {currentScenario.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{currentScenario.title}</h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      Paciente: {currentScenario.patientAge} años · Género: {currentScenario.patientGender} · Peso: {currentScenario.patientWeightKg} kg
                    </p>
                  </div>

                  <div className="bg-[#1a212b] p-3 rounded-xl border border-neutral-700/80">
                    <span className="text-[11px] font-bold text-amber-300 font-mono uppercase block mb-1">
                      MOTIVO DE CONSULTA / EVALUACIÓN INICIAL:
                    </span>
                    <p className="text-sm text-neutral-200 leading-relaxed font-sans">
                      {currentScenario.chiefComplaint}
                    </p>
                  </div>

                  <div className="bg-[#1a212b] p-3 rounded-xl border border-neutral-700/80">
                    <span className="text-[11px] font-bold text-neutral-400 font-mono uppercase block mb-1">
                      RESUMEN CLÍNICO:
                    </span>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {currentScenario.summary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-500">
                    <span>Pantalla en modo proyección guiada</span>
                    <span className="text-amber-400 font-bold">El facilitador retomará el monitor al iniciar simulación</span>
                  </div>
                </div>
              ) : sessionState.studentProjectionMode === 'SAMPLER' ? (
                <div className="max-w-2xl bg-[#13181f] border-2 border-sky-500/80 rounded-2xl p-6 text-left shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-700">
                    <div className="flex items-center gap-2 text-sky-400 font-mono font-bold text-sm">
                      <Stethoscope className="w-5 h-5" />
                      <span>HISTORIA SAMPLE & EVALUACIÓN XABCDE</span>
                    </div>
                    <span className="text-xs font-mono text-neutral-400">{currentScenario.title}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#1a212b] p-2.5 rounded-lg border border-neutral-700/80">
                      <span className="font-bold text-sky-300 block mb-1">Signos y Síntomas (S):</span>
                      <p className="text-neutral-300 text-[11px]">{currentScenario.sample.signosSintomas || 'Sin datos'}</p>
                    </div>
                    <div className="bg-[#1a212b] p-2.5 rounded-lg border border-neutral-700/80">
                      <span className="font-bold text-sky-300 block mb-1">Alergias (A):</span>
                      <p className="text-neutral-300 text-[11px]">{currentScenario.sample.alergias || 'Sin alergias conocidas'}</p>
                    </div>
                    <div className="bg-[#1a212b] p-2.5 rounded-lg border border-neutral-700/80">
                      <span className="font-bold text-sky-300 block mb-1">Medicamentos (M):</span>
                      <p className="text-neutral-300 text-[11px]">{currentScenario.sample.medicamentos || 'Ninguno'}</p>
                    </div>
                    <div className="bg-[#1a212b] p-2.5 rounded-lg border border-neutral-700/80">
                      <span className="font-bold text-sky-300 block mb-1">Patologías Previas (P):</span>
                      <p className="text-neutral-300 text-[11px]">{currentScenario.sample.patologiasPrevias || 'Sin antecedentes'}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 text-center text-xs font-mono text-neutral-400">
                    Atienda a las indicaciones del facilitador antes de continuar la reanimación.
                  </div>
                </div>
              ) : (
                <div className="max-w-md bg-[#13181f] border-2 border-amber-500/70 rounded-2xl p-6 shadow-2xl space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider">
                    PANTALLA BLOQUEADA POR EL FACILITADOR
                  </h3>
                  <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                    El facilitador ha pausado la interacción para debriefing clínico, explicación pedagógica o ajuste de escenario.
                  </p>
                  {sessionState.debriefNotes && (
                    <div className="bg-[#1c232e] p-3 rounded-xl border border-neutral-700 text-left">
                      <span className="text-[10px] font-bold text-amber-400 font-mono uppercase block mb-1">
                        NOTAS DEL DOCENTE:
                      </span>
                      <p className="text-xs text-neutral-200">{sessionState.debriefNotes}</p>
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-neutral-500 block pt-1">
                    La pantalla se reanudará automáticamente cuando el instructor lo decida.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Stage: High-Contrast Telemetry Tiles (Cols 10-12) */}
        <div className="lg:col-span-3 bg-[#0d0f12] p-2.5 flex flex-col justify-between gap-2 border-t lg:border-t-0 border-[#2b3138]">
          <VitalTile
            label="FC / HR"
            subLabel="PULSO"
            value={vitals.heartRate > 0 ? vitals.heartRate : '--'}
            unit="lpm"
            colorClass="emerald"
            secondaryLabel="LÍMITES"
            secondaryValue={`${limits.hrLow}-${limits.hrHigh}`}
            isAlarming={isHeartRateAlarming}
            alarmMessage={isArrest ? '¡PARO!' : isBradycardia ? '¡BRADI!' : isTachycardia ? '¡TAQUI!' : undefined}
            alarmPriority={isArrest || isBradycardia ? 'HIGH' : 'MEDIUM'}
            onClick={handleCycleLead}
          />

          <VitalTile
            label="SpO2"
            subLabel="PLETISMO"
            value={
              isArrest
                ? sessionState.isCPRActive ? 'RCP' : '--'
                : vitals.spO2 > 0 ? vitals.spO2 : '--'
            }
            unit="%"
            colorClass="sky"
            secondaryLabel="PI"
            secondaryValue={isArrest ? (sessionState.isCPRActive ? '0.8%' : '0.1%') : `${vitals.perfusionIndex}%`}
            isAlarming={isSpO2Alarming}
            alarmMessage={isSpO2Critical ? '<85% CRÍTICA' : '<90% DESAT.'}
            alarmPriority="HIGH"
            onClick={() => setIsLimitsModalOpen(true)}
          />

          <VitalTile
            label="EtCO2"
            subLabel="CAPNO"
            value={displayedEtCO2 > 0 ? displayedEtCO2 : '--'}
            unit="mmHg"
            colorClass="amber"
            secondaryLabel="FR / RR"
            secondaryValue={isArrest ? (sessionState.isCPRActive ? '10/min' : '0 rpm') : `${vitals.respRate} rpm`}
            isAlarming={isEtCO2Alarming}
            alarmMessage={
              isEtCO2LowAlarming
                ? displayedEtCO2 < 15 ? '¡APNEA!' : '¡HIPOCAPNIA!'
                : isEtCO2HighAlarming ? '¡HIPERCAPNIA!' : undefined
            }
            alarmPriority={displayedEtCO2 < 15 ? 'HIGH' : 'MEDIUM'}
            onClick={() => setIsLimitsModalOpen(true)}
          />

          <VitalTile
            label="PANI / NIBP"
            subLabel="NO INVASIVA"
            value={
              vitals.systolicBP > 0
                ? `${vitals.systolicBP}/${vitals.diastolicBP}`
                : '--/--'
            }
            unit="mmHg"
            colorClass="slate"
            secondaryLabel="PAM"
            secondaryValue={vitals.meanArterialPressure > 0 ? `(${vitals.meanArterialPressure})` : '--'}
            statusBadge={sessionState.isNibpMeasuring ? 'MEDIDA...' : 'AUTO'}
            isAlarming={isBpAlarming}
            alarmMessage={
              isSevereShock
                ? '¡SHOCK!'
                : isHypotension
                ? '¡HIPOTENSIÓN!'
                : isHypertensionCrisis
                ? '¡CRISIS HTA!'
                : undefined
            }
            alarmPriority={isHypotension ? 'HIGH' : 'MEDIUM'}
            onClick={handleTriggerNibp}
          />

          {/* Temperature and Capillary Glucose Twin Tiles */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="px-2.5 py-1.5 bg-neutral-900/80 border border-neutral-800 rounded-lg flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>TEMP</span>
              <span className="font-lcd text-sm font-bold text-neutral-200">
                {vitals.temperature.toFixed(1)}°C
              </span>
            </div>
            <div className="px-2.5 py-1.5 bg-neutral-900/80 border border-neutral-800 rounded-lg flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>GLUC</span>
              <span className="font-lcd text-sm font-bold text-amber-300">
                {vitals.glucose ?? 110} <span className="text-[9px] font-mono text-neutral-500">mg</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PHYSICAL ZOLL HARDWARE BEZEL CONTROLS */}
      <ZollBezel
        dialMode={dialMode}
        onDialChange={(mode) => {
          onUpdateSession({
            dialMode: mode,
            studentLastAction: {
              action: 'DIAL_CHANGE',
              timestamp: new Date().toLocaleTimeString(),
              details: `Dial girado a: ${mode}`,
            },
          });
        }}
        selectedLead={selectedLead}
        onCycleLead={handleCycleLead}
        gain={gain}
        onCycleGain={handleCycleGain}
        defibState={defib}
        onSelectEnergyUp={handleSelectEnergyUp}
        onSelectEnergyDown={handleSelectEnergyDown}
        onCharge={handleCharge}
        onDeliverShock={handleDeliverShock}
        onToggleSync={handleToggleSync}
        onAnalyze={handleAnalyze}
        pacerState={pacer}
        onTogglePacer={handleTogglePacer}
        onPacerRateChange={handlePacerRateChange}
        onPacerCurrentChange={handlePacerCurrentChange}
        onToggle4to1={handleToggle4to1}
        isNibpMeasuring={sessionState.isNibpMeasuring}
        onTriggerNibp={handleTriggerNibp}
        onToggle12Lead={() => {
          const next = !isTwelveLeadActive;
          setIs12LeadActive(next);
          onUpdateSession({ is12LeadProjected: next });
        }}
        is12LeadActive={isTwelveLeadActive}
        onOpenStripSummary={() => setIsStripModalOpen(true)}
        isCPRActive={sessionState.isCPRActive}
        onToggleCPR={() => onUpdateSession({ isCPRActive: !sessionState.isCPRActive })}
        cprMetronomeEnabled={sessionState.cprMetronomeEnabled}
        onToggleMetronome={() => {
          const next = !sessionState.cprMetronomeEnabled;
          onUpdateSession({ cprMetronomeEnabled: next });
          medicalAudio.toggleCPRMetronome(next);
        }}
        isMuted={sessionState.isMuted}
        onToggleMute={() => {
          const nextMute = !sessionState.isMuted;
          onUpdateSession({ isMuted: nextMute });
          medicalAudio.setMuted(nextMute);
        }}
        isSilenced={silenceRemaining > 0}
        silenceRemaining={silenceRemaining}
        onToggleSilence={handleToggleSilence}
        onOpenLimitsModal={() => setIsLimitsModalOpen(true)}
      />

      {/* Alarm Limits Configuration Modal */}
      <AlarmLimitsModal
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
        currentLimits={limits}
        onSaveLimits={handleSaveLimits}
      />

      {/* Defibrillator Thermal Print Strip Modal */}
      <DefibStripModal
        isOpen={isStripModalOpen}
        onClose={() => setIsStripModalOpen(false)}
        logs={sessionState.log}
        currentRhythm={currentRhythm}
        vitals={vitals}
        totalShocks={defib.totalShocksDelivered}
        scenarioTimeFormatted={formatTime(sessionState.scenarioElapsedSeconds)}
      />

      {/* Right-Side Collapsible ACLS Treatment Drawer (Fármacos, Acceso Vascular, RCP) */}
      <StudentTreatmentDrawer
        sessionState={sessionState}
        onUpdateSession={onUpdateSession}
        isOpen={isTreatmentDrawerOpen}
        onToggleOpen={() => setIsTreatmentDrawerOpen(!isTreatmentDrawerOpen)}
      />
    </div>
  );
};
