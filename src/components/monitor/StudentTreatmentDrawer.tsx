/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  SimSessionState,
  VascularAccessType,
  StudentProposedIntervention,
} from '../../types/medical';
import { medicalAudio } from '../../utils/audioSynthesizer';
import {
  Syringe,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Heart,
  Droplet,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Volume2,
} from 'lucide-react';

interface StudentTreatmentDrawerProps {
  sessionState: SimSessionState;
  onUpdateSession: (partial: Partial<SimSessionState>) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const StudentTreatmentDrawer: React.FC<StudentTreatmentDrawerProps> = ({
  sessionState,
  onUpdateSession,
  isOpen,
  onToggleOpen,
}) => {
  // 1. Acceso Vascular local & sync
  const currentAccess = sessionState.vascularAccess || 'NONE';

  // 2. Ciclo RCP (2 minutos)
  const [cprCycleSeconds, setCprCycleSeconds] = useState<number>(120);
  const [isCprRunning, setIsCprRunning] = useState<boolean>(sessionState.isCPRActive);
  const [isAnalysisPause, setIsAnalysisPause] = useState<boolean>(false);
  const [analysisSecondsRemaining, setAnalysisSecondsRemaining] = useState<number>(10);
  const [completedCprCycles, setCompletedCprCycles] = useState<number>(0);

  // 3. Epinefrina / Adrenalina Timer (3 a 5 min)
  const [epiIntervalMin, setEpiIntervalMin] = useState<number>(3); // 3, 4, 5 min
  const [epiSecondsRemaining, setEpiSecondsRemaining] = useState<number | null>(null);
  const [isEpiTimerRunning, setIsEpiTimerRunning] = useState<boolean>(false);
  const [totalEpiDoses, setTotalEpiDoses] = useState<number>(0);

  // 4. Antiarrítmico: Amiodarona vs Lidocaína
  const [antiarrhythmicType, setAntiarrhythmicType] = useState<'AMIODARONE' | 'LIDOCAINE'>(
    sessionState.selectedAntiarrhythmicType || 'AMIODARONE'
  );
  const [antiarrhythmicDoseCount, setAntiarrhythmicDoseCount] = useState<number>(0);
  const [antiIntervalMin, setAntiIntervalMin] = useState<number>(3);
  const [antiSecondsRemaining, setAntiSecondsRemaining] = useState<number | null>(null);
  const [isAntiTimerRunning, setIsAntiTimerRunning] = useState<boolean>(false);

  // 5. Saline Flush Animation
  const [flushActive, setFlushActive] = useState<boolean>(false);

  // Keep isCprRunning synced if sessionState.isCPRActive changes externally
  useEffect(() => {
    setIsCprRunning(sessionState.isCPRActive);
  }, [sessionState.isCPRActive]);

  // Keep antiarrhythmicType synced
  useEffect(() => {
    if (sessionState.selectedAntiarrhythmicType) {
      setAntiarrhythmicType(sessionState.selectedAntiarrhythmicType);
    }
  }, [sessionState.selectedAntiarrhythmicType]);

  // CPR Cycle Timer Interval
  useEffect(() => {
    let interval: number;
    if (isCprRunning && !isAnalysisPause && cprCycleSeconds > 0) {
      interval = window.setInterval(() => {
        setCprCycleSeconds((prev) => {
          // Pre-alert at 15s remaining (00:15)
          if (prev === 16) {
            medicalAudio.playPreAlertBeep();
          }
          if (prev <= 1) {
            // End of 2 min cycle: alert
            medicalAudio.playTimerEndAlert();
            setCompletedCprCycles((c) => c + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCprRunning, isAnalysisPause, cprCycleSeconds]);

  // Analysis Pause 10-second countdown
  useEffect(() => {
    let interval: number;
    if (isAnalysisPause && analysisSecondsRemaining > 0) {
      interval = window.setInterval(() => {
        setAnalysisSecondsRemaining((prev) => {
          if (prev <= 1) {
            medicalAudio.playBeep(440, 0.35, 'square');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAnalysisPause, analysisSecondsRemaining]);

  // Epinephrine countdown timer
  useEffect(() => {
    let interval: number;
    if (isEpiTimerRunning && epiSecondsRemaining !== null && epiSecondsRemaining > 0) {
      interval = window.setInterval(() => {
        setEpiSecondsRemaining((prev) => {
          if (prev !== null && prev <= 1) {
            medicalAudio.playTimerEndAlert();
            setIsEpiTimerRunning(false);
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isEpiTimerRunning, epiSecondsRemaining]);

  // Antiarrhythmic countdown timer
  useEffect(() => {
    let interval: number;
    if (isAntiTimerRunning && antiSecondsRemaining !== null && antiSecondsRemaining > 0) {
      interval = window.setInterval(() => {
        setAntiSecondsRemaining((prev) => {
          if (prev !== null && prev <= 1) {
            medicalAudio.playTimerEndAlert();
            setIsAntiTimerRunning(false);
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAntiTimerRunning, antiSecondsRemaining]);

  // Helper to propose intervention to facilitator
  const proposeIntervention = (
    type: StudentProposedIntervention['type'],
    title: string,
    details: string
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const newProposal: StudentProposedIntervention = {
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      details,
      timestamp,
      status: 'PENDING',
    };

    const currentProposals = sessionState.pendingStudentInterventions || [];
    const updatedProposals = [newProposal, ...currentProposals.slice(0, 15)];

    onUpdateSession({
      pendingStudentInterventions: updatedProposals,
      studentLastAction: {
        action: 'DRUG',
        timestamp,
        details: `${title}: ${details}`,
      },
      log: [
        {
          id: `log-stud-${Date.now()}`,
          time: timestamp,
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'STUDENT_ACTION',
          description: `Acción del Alumno: ${title}`,
          details,
        },
        ...sessionState.log,
      ],
    });
  };

  // 1. Acceso vascular handler
  const handleSelectAccess = (type: VascularAccessType) => {
    const names: Record<VascularAccessType, string> = {
      NONE: 'Sin Acceso Vascular',
      IV_PERIPHERAL: 'Vía I.V. Periférica (18G / 20G)',
      IO_HUMERAL: 'Acceso Intraóseo (I.O.) Cabeza Humeral',
      IO_TIBIAL: 'Acceso Intraóseo (I.O.) Tuberosidad Tibial',
    };
    onUpdateSession({ vascularAccess: type });
    proposeIntervention(
      'AIRWAY',
      `Acceso Vascular: ${names[type]}`,
      type === 'NONE' ? 'Vascular retirado o ausente' : `Establecida vía de infusión rápida: ${names[type]}`
    );
  };

  // 2. Start/Pause CPR
  const handleToggleCPR = () => {
    const nextState = !isCprRunning;
    setIsCprRunning(nextState);
    if (nextState && cprCycleSeconds === 0) {
      setCprCycleSeconds(120);
    }
    setIsAnalysisPause(false);

    onUpdateSession({
      isCPRActive: nextState,
      cprMetronomeEnabled: nextState ? sessionState.cprMetronomeEnabled : false,
    });

    proposeIntervention(
      'CPR_CYCLE',
      nextState ? 'Inicio de Compresiones Torácicas (RCP)' : 'Pausa de Compresiones Torácicas',
      nextState
        ? 'Compresiones a 100-120 cpm, profundidad 5-6 cm y reexpansión torácica completa'
        : 'Compresiones detenidas'
    );
  };

  // Pause for Rhythm Check (AHA Max 10s)
  const handlePauseForAnalysis = () => {
    setIsCprRunning(false);
    setIsAnalysisPause(true);
    setAnalysisSecondsRemaining(10);

    onUpdateSession({
      isCPRActive: false,
    });

    medicalAudio.playBeep(920, 0.15, 'sine');

    proposeIntervention(
      'CPR_CYCLE',
      'Pausa para Análisis de Ritmo y Pulsos (Máx 10 seg)',
      'Compresiones suspendidas momentáneamente para evaluar trazado electrocardiográfico y pulso carotídeo'
    );
  };

  // Resume CPR with new 2-minute cycle
  const handleResumeCPRAfterAnalysis = () => {
    setIsAnalysisPause(false);
    setIsCprRunning(true);
    setCprCycleSeconds(120);

    onUpdateSession({
      isCPRActive: true,
    });

    proposeIntervention(
      'CPR_CYCLE',
      'Reanudación de RCP (Ciclo 2 min)',
      'Reinicio inmediato de compresiones torácicas minimizando el tiempo fuera de pecho'
    );
  };

  // Reset CPR Cycle back to 02:00
  const handleResetCprTimer = () => {
    setCprCycleSeconds(120);
    setIsAnalysisPause(false);
  };

  // 3. Epinephrine administration
  const handleAdministerEpinephrine = () => {
    if (currentAccess === 'NONE') {
      alert('⚠️ Requiere establecer un Acceso Vascular (Vía I.V. o I.O.) para administrar fármacos en bolo.');
      return;
    }

    const nextCount = totalEpiDoses + 1;
    setTotalEpiDoses(nextCount);
    setEpiSecondsRemaining(epiIntervalMin * 60);
    setIsEpiTimerRunning(true);

    medicalAudio.playBeep(1200, 0.12, 'triangle');

    // Add to medication list
    const timestamp = new Date().toLocaleTimeString();
    const newMed = {
      id: `med-epi-${Date.now()}`,
      name: 'Epinefrina (Adrenalina)',
      dose: '1 mg Bolo I.V./I.O.',
      route: currentAccess,
      timestamp,
      notes: `Dosis #${nextCount} · Intervalo ${epiIntervalMin} min`,
    };

    onUpdateSession({
      medications: [newMed, ...sessionState.medications],
      timeSinceLastAdrenaline: 0,
    });

    proposeIntervention(
      'MEDICATION',
      `Epinefrina 1 mg I.V./I.O. (Dosis #${nextCount})`,
      `Bolo rápido seguido de lavado salino. Cronómetro rearmado a ${epiIntervalMin} min.`
    );
  };

  // 4. Antiarrhythmic administration (Amiodarone vs Lidocaine)
  const handleAdministerAntiarrhythmic = (doseNumber: 1 | 2) => {
    if (currentAccess === 'NONE') {
      alert('⚠️ Requiere establecer un Acceso Vascular (Vía I.V. o I.O.) para administrar antiarrítmicos.');
      return;
    }

    let drugTitle = '';
    let drugDose = '';

    if (antiarrhythmicType === 'AMIODARONE') {
      if (doseNumber === 1) {
        drugTitle = 'Amiodarona 1ª Dosis';
        drugDose = '300 mg Bolo I.V./I.O.';
      } else {
        drugTitle = 'Amiodarona 2ª Dosis';
        drugDose = '150 mg Bolo I.V./I.O.';
      }
    } else {
      // Lidocaine
      const weight = sessionState.customScenario?.patientWeightKg || 75;
      if (doseNumber === 1) {
        const mg = Math.round(weight * 1.25);
        drugTitle = 'Lidocaína 1ª Dosis (1-1.5 mg/kg)';
        drugDose = `${mg} mg (${weight} kg) I.V./I.O.`;
      } else {
        const mg = Math.round(weight * 0.65);
        drugTitle = 'Lidocaína 2ª Dosis (0.5-0.75 mg/kg)';
        drugDose = `${mg} mg (${weight} kg) I.V./I.O.`;
      }
    }

    setAntiarrhythmicDoseCount((prev) => prev + 1);
    setAntiSecondsRemaining(antiIntervalMin * 60);
    setIsAntiTimerRunning(true);

    medicalAudio.playBeep(1100, 0.12, 'sine');

    const timestamp = new Date().toLocaleTimeString();
    const newMed = {
      id: `med-anti-${Date.now()}`,
      name: antiarrhythmicType === 'AMIODARONE' ? 'Amiodarona' : 'Lidocaína',
      dose: drugDose,
      route: currentAccess,
      timestamp,
      notes: `${drugTitle} · Cronómetro ${antiIntervalMin} min`,
    };

    onUpdateSession({
      medications: [newMed, ...sessionState.medications],
    });

    proposeIntervention('MEDICATION', drugTitle, `${drugDose} administrado en bolo.`);
  };

  // 5. Saline Flush 20 cc
  const handleFlushSaline = () => {
    if (currentAccess === 'NONE') {
      alert('⚠️ Requiere establecer un Acceso Vascular para infundir bolo de lavado.');
      return;
    }

    setFlushActive(true);
    medicalAudio.playFlushSound();

    setTimeout(() => {
      setFlushActive(false);
    }, 1200);

    const timestamp = new Date().toLocaleTimeString();
    const newMed = {
      id: `med-flush-${Date.now()}`,
      name: 'Solución Salina 0.9%',
      dose: '20 ml Bolo + Elevación',
      route: currentAccess,
      timestamp,
      notes: 'Lavado post-bolo farmacológico',
    };

    onUpdateSession({
      medications: [newMed, ...sessionState.medications],
    });

    proposeIntervention(
      'FLUID_BOLUS',
      'Lavado con 20 cc Solución Fisiológica',
      'Bolo rápido de 20 ml para arrastre hacia la circulación central con elevación de la extremidad 10-20 segundos.'
    );
  };

  const formatMinSec = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      {/* Drawer Toggle Tab for Mobile / Tablets / Desktop Toggle */}
      <button
        onClick={onToggleOpen}
        className={`fixed top-1/2 -translate-y-1/2 z-40 px-2 py-3 rounded-l-xl font-mono text-xs font-bold transition-all shadow-xl flex flex-col items-center gap-1 border-y border-l cursor-pointer ${
          isOpen
            ? 'right-[360px] md:right-[380px] bg-neutral-900 text-amber-400 border-amber-500/60'
            : 'right-0 bg-amber-500 text-black border-amber-300 hover:bg-amber-400 animate-pulse'
        }`}
        title={isOpen ? 'Ocultar panel de intervenciones' : 'Abrir panel de intervenciones y fármacos ACLS'}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        <span className="text-[10px] [writing-mode:vertical-rl] tracking-wider uppercase font-extrabold">
          {isOpen ? 'CERRAR TX' : 'ACCIONES ACLS'}
        </span>
      </button>

      {/* Main Drawer Panel (Fixed Right-Side, non-intrusive collapsible layout) */}
      <aside
        className={`fixed top-0 right-0 h-full w-[360px] md:w-[380px] bg-[#111418] border-l-2 border-[#2b333d] shadow-2xl z-30 transition-transform duration-300 ease-in-out flex flex-col select-none overflow-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-[#181d24] p-3 border-b border-[#2b333d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Syringe className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                TRATAMIENTO ACLS & REANIMACIÓN
              </h2>
              <span className="text-[10px] text-neutral-400 font-mono">
                Sincronización instantánea con docente
              </span>
            </div>
          </div>
          <button
            onClick={onToggleOpen}
            className="p-1 rounded bg-[#222831] hover:bg-[#2e3744] text-neutral-400 hover:text-white border border-neutral-700 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs text-neutral-200">
          {/* SECTION 1: ACCESO VASCULAR */}
          <div className="bg-[#161a20] p-3 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-300 font-mono uppercase flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-rose-400" />
                ACCESO VASCULAR ACTIVO:
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  currentAccess === 'NONE'
                    ? 'bg-rose-950/70 text-rose-300 border-rose-800'
                    : 'bg-emerald-950/70 text-emerald-300 border-emerald-700'
                }`}
              >
                {currentAccess === 'NONE' ? 'SIN VÍA' : 'VÍA ACTIVA'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleSelectAccess('IV_PERIPHERAL')}
                className={`p-2 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  currentAccess === 'IV_PERIPHERAL'
                    ? 'bg-sky-950/90 border-sky-400 text-sky-200 font-bold ring-1 ring-sky-400'
                    : 'bg-[#1e242c] hover:bg-[#28303a] border-neutral-700 text-neutral-300'
                }`}
              >
                <div className="text-[11px] font-bold">VÍA I.V. PERIFÉRICA</div>
                <div className="text-[9px] text-neutral-400">18G o 20G en Fosa Antecubital</div>
              </button>

              <button
                onClick={() => handleSelectAccess('IO_HUMERAL')}
                className={`p-2 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  currentAccess === 'IO_HUMERAL'
                    ? 'bg-amber-950/90 border-amber-400 text-amber-200 font-bold ring-1 ring-amber-400'
                    : 'bg-[#1e242c] hover:bg-[#28303a] border-neutral-700 text-neutral-300'
                }`}
              >
                <div className="text-[11px] font-bold">INTRAÓSEO (I.O.) HUMERAL</div>
                <div className="text-[9px] text-neutral-400">Cabeza Humeral (Mayor Flujo)</div>
              </button>

              <button
                onClick={() => handleSelectAccess('IO_TIBIAL')}
                className={`p-2 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  currentAccess === 'IO_TIBIAL'
                    ? 'bg-amber-950/90 border-amber-400 text-amber-200 font-bold ring-1 ring-amber-400'
                    : 'bg-[#1e242c] hover:bg-[#28303a] border-neutral-700 text-neutral-300'
                }`}
              >
                <div className="text-[11px] font-bold">INTRAÓSEO (I.O.) TIBIAL</div>
                <div className="text-[9px] text-neutral-400">Tuberosidad Tibial Anterior</div>
              </button>

              <button
                onClick={() => handleSelectAccess('NONE')}
                className={`p-2 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                  currentAccess === 'NONE'
                    ? 'bg-neutral-800 border-neutral-600 text-neutral-300 font-bold'
                    : 'bg-[#1e242c] hover:bg-[#28303a] border-neutral-700 text-neutral-400'
                }`}
              >
                <div className="text-[11px] font-bold">RETIRAR ACCESO</div>
                <div className="text-[9px] text-neutral-500">Sin acceso permeable</div>
              </button>
            </div>
          </div>

          {/* SECTION 2: CICLO RCP AHA (2 MINUTOS) & PAUSA DE ANÁLISIS */}
          <div className="bg-[#161a20] p-3 rounded-xl border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
              <span className="text-[11px] font-bold text-neutral-300 font-mono uppercase flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                CICLO DE RCP (2 MINUTOS):
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Ciclos listos: <strong className="text-white">{completedCprCycles}</strong>
              </span>
            </div>

            {/* CPR Main Timer Display */}
            <div
              className={`p-2.5 rounded-xl border text-center transition-all ${
                isAnalysisPause
                  ? 'bg-rose-950/90 border-rose-500 text-rose-100 ring-2 ring-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                  : isCprRunning
                  ? cprCycleSeconds <= 15
                    ? 'bg-amber-950/90 border-amber-400 text-amber-200 animate-pulse'
                    : 'bg-[#1e242c] border-emerald-600/70 text-emerald-400'
                  : 'bg-[#1a1f26] border-neutral-700 text-neutral-400'
              }`}
            >
              {isAnalysisPause ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center justify-center gap-1 font-mono">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                    PAUSA PARA ANÁLISIS DE RITMO (MÁX 10s)
                  </div>
                  <div className="text-3xl font-lcd font-bold text-rose-400 my-1 tabular-nums">
                    00:{analysisSecondsRemaining < 10 ? `0${analysisSecondsRemaining}` : analysisSecondsRemaining}
                  </div>
                  <div className="text-[9px] font-mono text-rose-300/80">
                    Compresiones en pausa · Analice trazado EKG y palpe pulso carotídeo
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    {isCprRunning ? 'COMPRESIONES ACTIVAS' : 'RCP DETENIDA'}
                  </div>
                  <div className="text-3xl font-lcd font-bold text-white my-1 tabular-nums">
                    {formatMinSec(cprCycleSeconds)}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-400">
                    {cprCycleSeconds <= 15 && cprCycleSeconds > 0
                      ? '⚠️ ¡AVISO 15 SEG!: Preparar cambio de reanimador'
                      : cprCycleSeconds === 0
                      ? '⏱️ ¡00:00! Fin de ciclo: Pausar para evaluar ritmo'
                      : 'Frecuencia 100-120 cpm · Ventilación 30:2 o 1 c/6s'}
                  </div>
                </div>
              )}
            </div>

            {/* CPR Action Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleToggleCPR}
                className={`py-2 px-2 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  isCprRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                }`}
              >
                {isCprRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isCprRunning ? 'PAUSAR RCP' : 'INICIAR RCP'}</span>
              </button>

              <button
                onClick={handleResetCprTimer}
                className="py-2 px-2 bg-[#202731] hover:bg-[#2c3543] rounded-lg font-mono text-xs font-bold text-neutral-300 border border-neutral-700 flex items-center justify-center gap-1 cursor-pointer"
                title="Reiniciar reloj de 2 minutos"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>REINICIAR 2 MIN</span>
              </button>
            </div>

            {/* Dedicated AHA Analysis Pause Button */}
            {!isAnalysisPause ? (
              <button
                onClick={handlePauseForAnalysis}
                className="w-full py-2 px-3 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Activity className="w-4 h-4 text-rose-400" />
                <span>PAUSAR PARA ANÁLISIS DE RITMO (10s)</span>
              </button>
            ) : (
              <button
                onClick={handleResumeCPRAfterAnalysis}
                className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg animate-pulse"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>REANUDAR RCP INMEDIATO (2 MIN)</span>
              </button>
            )}
          </div>

          {/* SECTION 3: EPINEFRINA / ADRENALINA 1 MG */}
          <div className="bg-[#161a20] p-3 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-300 font-mono uppercase flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5 text-amber-400" />
                EPINEFRINA (ADRENALINA) 1 MG:
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Dosis: <strong className="text-amber-400">{totalEpiDoses}</strong>
              </span>
            </div>

            {/* Interval Selection (3, 4, 5 min) */}
            <div className="flex items-center justify-between text-[10px] font-mono bg-[#1c222b] p-1.5 rounded-lg border border-neutral-700/80">
              <span className="text-neutral-400">Alarma siguiente dosis:</span>
              <div className="flex items-center gap-1">
                {[3, 4, 5].map((m) => (
                  <button
                    key={`epi-int-${m}`}
                    onClick={() => setEpiIntervalMin(m)}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      epiIntervalMin === m
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-[#29323f] text-neutral-300 hover:bg-[#364252]'
                    }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            {/* Epinephrine Push Button & Active Timer */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdministerEpinephrine}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-mono text-xs font-bold border border-amber-300 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Syringe className="w-4 h-4 text-black" />
                <span>APLICAR EPINEFRINA 1 mg</span>
              </button>

              {epiSecondsRemaining !== null && (
                <div
                  className={`px-3 py-2 rounded-xl border text-center font-mono ${
                    epiSecondsRemaining === 0
                      ? 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse'
                      : 'bg-[#1e242c] border-neutral-700 text-amber-400'
                  }`}
                  title="Tiempo para la siguiente dosis de Epinefrina"
                >
                  <div className="text-[9px] text-neutral-400">PRÓXIMA</div>
                  <div className="text-sm font-lcd font-bold tabular-nums">
                    {formatMinSec(epiSecondsRemaining)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: ANTIARRÍTMICO (AMIODARONA VS LIDOCAÍNA) */}
          <div className="bg-[#161a20] p-3 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
              <span className="text-[11px] font-bold text-neutral-300 font-mono uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                ANTIARRÍTMICO DE RESCATE:
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Dosis: <strong className="text-cyan-400">{antiarrhythmicDoseCount}</strong>
              </span>
            </div>

            {/* Selector: Amiodarona vs Lidocaína */}
            <div className="grid grid-cols-2 gap-1 bg-[#1a2027] p-1 rounded-lg border border-neutral-700/80">
              <button
                onClick={() => {
                  setAntiarrhythmicType('AMIODARONE');
                  onUpdateSession({ selectedAntiarrhythmicType: 'AMIODARONE' });
                }}
                className={`py-1 text-center font-mono text-[11px] font-bold rounded cursor-pointer transition-all ${
                  antiarrhythmicType === 'AMIODARONE'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                AMIODARONA
              </button>
              <button
                onClick={() => {
                  setAntiarrhythmicType('LIDOCAINE');
                  onUpdateSession({ selectedAntiarrhythmicType: 'LIDOCAINE' });
                }}
                className={`py-1 text-center font-mono text-[11px] font-bold rounded cursor-pointer transition-all ${
                  antiarrhythmicType === 'LIDOCAINE'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                LIDOCAÍNA
              </button>
            </div>

            {/* Dose Buttons */}
            {antiarrhythmicType === 'AMIODARONE' ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleAdministerAntiarrhythmic(1)}
                    className="py-2 px-2 rounded-lg bg-[#202933] hover:bg-[#2c3846] text-cyan-300 border border-cyan-800/80 font-mono text-xs font-bold text-left cursor-pointer transition-all"
                  >
                    <div className="text-[10px] text-neutral-400">1ª DOSIS</div>
                    <div className="text-xs font-bold">300 mg BOLO</div>
                  </button>

                  <button
                    onClick={() => handleAdministerAntiarrhythmic(2)}
                    className="py-2 px-2 rounded-lg bg-[#202933] hover:bg-[#2c3846] text-cyan-300 border border-cyan-800/80 font-mono text-xs font-bold text-left cursor-pointer transition-all"
                  >
                    <div className="text-[10px] text-neutral-400">2ª / 3ª DOSIS</div>
                    <div className="text-xs font-bold">150 mg BOLO</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleAdministerAntiarrhythmic(1)}
                    className="py-2 px-2 rounded-lg bg-[#202933] hover:bg-[#2c3846] text-teal-300 border border-teal-800/80 font-mono text-xs font-bold text-left cursor-pointer transition-all"
                  >
                    <div className="text-[10px] text-neutral-400">1ª DOSIS (1-1.5 mg/kg)</div>
                    <div className="text-xs font-bold">100 mg BOLO</div>
                  </button>

                  <button
                    onClick={() => handleAdministerAntiarrhythmic(2)}
                    className="py-2 px-2 rounded-lg bg-[#202933] hover:bg-[#2c3846] text-teal-300 border border-teal-800/80 font-mono text-xs font-bold text-left cursor-pointer transition-all"
                  >
                    <div className="text-[10px] text-neutral-400">2ª / 3ª DOSIS (0.5-0.75)</div>
                    <div className="text-xs font-bold">50 mg BOLO</div>
                  </button>
                </div>
              </div>
            )}

            {/* Antiarrhythmic countdown timer */}
            {antiSecondsRemaining !== null && (
              <div
                className={`p-1.5 rounded-lg border text-center font-mono flex items-center justify-between text-xs ${
                  antiSecondsRemaining === 0
                    ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                    : 'bg-[#1c2229] border-neutral-700 text-cyan-300'
                }`}
              >
                <span className="text-[10px] text-neutral-400">Ventana siguiente dosis:</span>
                <span className="font-lcd font-bold text-sm tabular-nums">
                  {formatMinSec(antiSecondsRemaining)}
                </span>
              </div>
            )}
          </div>

          {/* SECTION 5: BOLO DE LAVADO SALINO (FLUSH 20 CC) */}
          <div className="bg-[#161a20] p-3 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-300 font-mono uppercase flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-blue-400" />
                LAVADO FISIOLÓGICO RÁPIDO:
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">Post-fármaco</span>
            </div>

            <button
              onClick={handleFlushSaline}
              className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                flushActive
                  ? 'bg-blue-500 text-black border-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-98'
                  : 'bg-[#1e2733] hover:bg-[#283546] text-blue-300 border-blue-900/80'
              }`}
            >
              <Droplet className={`w-4 h-4 ${flushActive ? 'animate-bounce' : 'text-blue-400'}`} />
              <span>{flushActive ? '¡INFUNDIENDO 20 cc + ELEVACIÓN!' : 'BOLO 20 cc SOLUCIÓN SALINA'}</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-[#14181f] border-t border-[#232a33] text-[10px] font-mono text-neutral-500 text-center">
          TRAKAS-3000 ACLS Suite · Las acciones notifican al instructor para evaluación ILCOR
        </div>
      </aside>
    </>
  );
};
