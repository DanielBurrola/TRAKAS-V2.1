/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  SimSessionState,
  CardiacRhythmType,
  AirwayType,
  VascularAccessType,
  VitalSigns,
  ClinicalScenario,
  SimulationLogEvent,
  EvaluationItem,
} from '../../types/medical';
import { CLINICAL_SCENARIOS, RHYTHM_DEFINITIONS } from '../../data/clinicalScenarios';
import {
  Shield,
  Activity,
  Heart,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Wind,
  Droplet,
  Pill,
  Clock,
  Timer,
  FileText,
  Radio,
  Sparkles,
  RotateCcw,
  Tv,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Save,
  X,
  User,
  Check,
  AlertCircle,
  FileCode,
  Flame,
  Lock,
  Unlock,
  CheckCheck,
  XCircle,
  BookOpen,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import { InstructorLiveHUD } from './InstructorLiveHUD';

interface InstructorPanelProps {
  sessionState: SimSessionState;
  onUpdateSession: (partial: Partial<SimSessionState>) => void;
  onOpenSampleModal: (scenario: ClinicalScenario) => void;
  onAdministerDrug: (drugName: string, dose: string, route: string) => void;
  onResetScenario: (scenarioId: string) => void;
  onMasterReset: () => void;
  onOpenQrModal?: () => void;
}

export const InstructorPanel: React.FC<InstructorPanelProps> = ({
  sessionState,
  onUpdateSession,
  onOpenSampleModal,
  onAdministerDrug,
  onResetScenario,
  onMasterReset,
  onOpenQrModal,
}) => {
  const [activeTab, setActiveTab] = useState<
    'presets' | 'fine-tune' | 'scenarios' | 'interventions' | 'sampler' | 'debriefing'
  >('presets');

  // 2-minute CPR countdown timer with audio warning
  const [twoMinCPRTimer, setTwoMinCPRTimer] = useState<number>(120);
  const [isCPRTimerRunning, setIsCPRTimerRunning] = useState<boolean>(false);
  const [cprAlarmActive, setCprAlarmActive] = useState<boolean>(false);

  // Custom Scenarios in LocalStorage
  const [customScenarios, setCustomScenarios] = useState<ClinicalScenario[]>(() => {
    try {
      const saved = localStorage.getItem('trakas_custom_scenarios');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCreatingScenario, setIsCreatingScenario] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Partial<ClinicalScenario> | null>(null);

  // Debriefing filtering & state
  const [debriefFilter, setDebriefFilter] = useState<string>('ALL');
  const [refreshAnimation, setRefreshAnimation] = useState(false);
  const [debriefNotesText, setDebriefNotesText] = useState(sessionState.debriefNotes || '');

  // Active scenario (uses customScenario if modified by instructor or active ID)
  const allAvailableScenarios = [...CLINICAL_SCENARIOS, ...customScenarios];
  const currentScenario =
    sessionState.customScenario && sessionState.customScenario.id === sessionState.activeScenarioId
      ? sessionState.customScenario
      : allAvailableScenarios.find((s) => s.id === sessionState.activeScenarioId) || CLINICAL_SCENARIOS[0];

  // 2-minute CPR countdown timer
  useEffect(() => {
    let interval: number;
    if (isCPRTimerRunning && twoMinCPRTimer > 0) {
      interval = window.setInterval(() => {
        setTwoMinCPRTimer((prev) => {
          if (prev <= 1) {
            setCprAlarmActive(true);
            setTimeout(() => setCprAlarmActive(false), 5000);
            return 120; // Auto-cycle 2 min
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCPRTimerRunning, twoMinCPRTimer]);

  // Synchronize debrief notes
  useEffect(() => {
    setDebriefNotesText(sessionState.debriefNotes || '');
  }, [sessionState.debriefNotes]);

  // Save custom scenarios to LocalStorage
  const handleSaveCustomScenario = (scenario: ClinicalScenario) => {
    const updated = [...customScenarios.filter((s) => s.id !== scenario.id), scenario];
    setCustomScenarios(updated);
    try {
      localStorage.setItem('trakas_custom_scenarios', JSON.stringify(updated));
    } catch {}
    setIsCreatingScenario(false);
    setEditingScenario(null);
  };

  const handleDeleteCustomScenario = (id: string) => {
    const updated = customScenarios.filter((s) => s.id !== id);
    setCustomScenarios(updated);
    try {
      localStorage.setItem('trakas_custom_scenarios', JSON.stringify(updated));
    } catch {}
  };

  // Set Rhythm Preset
  const handleSetPreset = (rhythm: CardiacRhythmType) => {
    const def = RHYTHM_DEFINITIONS[rhythm];
    const newVitals: VitalSigns = {
      ...sessionState.vitals,
      heartRate: def.defaultHR,
      spO2: def.defaultSpO2,
      etCO2: def.defaultEtCO2,
      respRate: def.defaultRR,
      systolicBP: def.defaultBP[0],
      diastolicBP: def.defaultBP[1],
      meanArterialPressure: Math.round((def.defaultBP[0] + 2 * def.defaultBP[1]) / 3),
      gcs: rhythm === 'VF_COARSE' || rhythm === 'VF_FINE' || rhythm === 'ASYSTOLE' || rhythm === 'PEA' || rhythm === 'VT_PULSELESS' ? 3 : sessionState.vitals.gcs || 15,
    };

    onUpdateSession({
      currentRhythm: rhythm,
      vitals: newVitals,
      log: [
        {
          id: `log-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'RHYTHM_CHANGE',
          description: `Instructor fijó condición: ${def.name}`,
          details: `FC: ${def.defaultHR} lpm · PA: ${def.defaultBP[0]}/${def.defaultBP[1]} mmHg (PAM: ${newVitals.meanArterialPressure})`,
        },
        ...sessionState.log,
      ],
    });
  };

  // Visual indicator for facilitator of active parameter being adjusted
  const [lastModifiedParam, setLastModifiedParam] = useState<string | null>(null);

  // Quick reset of vital signs to active scenario defaults
  const handleResetVitalsOnly = () => {
    onUpdateSession({
      vitals: { ...currentScenario.initialVitals },
      currentRhythm: currentScenario.initialRhythm,
      log: [
        {
          id: `reset-vitals-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'VITAL_CHANGE',
          description: `Instructor restableció constantes vitales a los valores iniciales de: ${currentScenario.title}`,
        },
        ...sessionState.log,
      ],
    });
    setLastModifiedParam(`Restablecido a valores basales (${currentScenario.title})`);
    setTimeout(() => setLastModifiedParam(null), 3000);
  };

  // Student Proposed Interventions Decision (Accept or Reject)
  const handleDecideStudentIntervention = (
    proposalId: string,
    decision: 'ACCEPTED' | 'REJECTED'
  ) => {
    const list = sessionState.pendingStudentInterventions || [];
    const item = list.find((p) => p.id === proposalId);
    if (!item) return;

    const updatedList = list.map((p) =>
      p.id === proposalId ? { ...p, status: decision } : p
    );

    let patch: Partial<SimSessionState> = {
      pendingStudentInterventions: updatedList,
    };

    const timestamp = new Date().toLocaleTimeString();

    if (decision === 'ACCEPTED') {
      // Favorable response based on action type
      if (item.type === 'DEFIB_SHOCK') {
        const isShockable =
          sessionState.currentRhythm === 'VF_COARSE' ||
          sessionState.currentRhythm === 'VF_FINE' ||
          sessionState.currentRhythm === 'VT_PULSELESS' ||
          sessionState.currentRhythm === 'TORSADES';
        if (isShockable) {
          patch.currentRhythm = 'PEA';
          patch.vitals = {
            ...sessionState.vitals,
            heartRate: 58,
            etCO2: 18,
            systolicBP: 0,
            diastolicBP: 0,
            meanArterialPressure: 0,
          };
        }
      } else if (item.type === 'MEDICATION') {
        if (item.title.toLowerCase().includes('epinefrina')) {
          patch.vitals = {
            ...sessionState.vitals,
            etCO2: Math.min(30, sessionState.vitals.etCO2 + 4),
          };
        }
      } else if (item.type === 'PACER_ACTIVATION') {
        patch.pacer = { ...sessionState.pacer, isCapturing: true };
        patch.vitals = {
          ...sessionState.vitals,
          heartRate: sessionState.pacer.rate,
          systolicBP: 110,
          diastolicBP: 68,
          meanArterialPressure: 82,
        };
      }

      patch.log = [
        {
          id: `dec-${Date.now()}`,
          time: timestamp,
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'INTERVENTION',
          description: `Instructor ACEPTÓ intervención del alumno: ${item.title} (Cambio clínico favorable)`,
        },
        ...sessionState.log,
      ];
    } else {
      patch.log = [
        {
          id: `dec-${Date.now()}`,
          time: timestamp,
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'COMPLICATION',
          description: `Instructor RECHAZÓ / Sin respuesta favorable: ${item.title} (Persiste condición crítica o complicación)`,
        },
        ...sessionState.log,
      ];
    }

    onUpdateSession(patch);
    setLastModifiedParam(`Intervención ${decision === 'ACCEPTED' ? 'Aceptada (Favorable)' : 'Rechazada (Adversa)'}`);
    setTimeout(() => setLastModifiedParam(null), 3000);
  };

  const adjustSystolicBP = (amount: number) => {
    const newSys = Math.max(0, Math.min(260, sessionState.vitals.systolicBP + amount));
    const newMap = Math.round((newSys + 2 * sessionState.vitals.diastolicBP) / 3);
    const updated: VitalSigns = {
      ...sessionState.vitals,
      systolicBP: newSys,
      meanArterialPressure: newMap,
    };
    onUpdateSession({
      vitals: updated,
      log: [
        {
          id: `bp-sys-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'VITAL_CHANGE',
          description: `Ajuste PAS (${amount > 0 ? '+' : ''}${amount} mmHg): ${newSys}/${sessionState.vitals.diastolicBP} mmHg (PAM: ${newMap})`,
        },
        ...sessionState.log,
      ],
    });
    setLastModifiedParam(`PAS: ${newSys} mmHg (${amount > 0 ? '+' : ''}${amount})`);
    setTimeout(() => setLastModifiedParam(null), 3000);
  };

  const adjustDiastolicBP = (amount: number) => {
    const newDia = Math.max(0, Math.min(180, sessionState.vitals.diastolicBP + amount));
    const newMap = Math.round((sessionState.vitals.systolicBP + 2 * newDia) / 3);
    const updated: VitalSigns = {
      ...sessionState.vitals,
      diastolicBP: newDia,
      meanArterialPressure: newMap,
    };
    onUpdateSession({
      vitals: updated,
      log: [
        {
          id: `bp-dia-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'VITAL_CHANGE',
          description: `Ajuste PAD (${amount > 0 ? '+' : ''}${amount} mmHg): ${sessionState.vitals.systolicBP}/${newDia} mmHg (PAM: ${newMap})`,
        },
        ...sessionState.log,
      ],
    });
    setLastModifiedParam(`PAD: ${newDia} mmHg (${amount > 0 ? '+' : ''}${amount})`);
    setTimeout(() => setLastModifiedParam(null), 3000);
  };

  const adjustVital = (metric: 'hr' | 'spo2' | 'etco2' | 'rr' | 'temp' | 'gcs' | 'gluc', amount: number) => {
    const updated = { ...sessionState.vitals };
    let label = '';
    let valStr = '';

    if (metric === 'hr') {
      updated.heartRate = Math.max(0, Math.min(250, updated.heartRate + amount));
      label = 'Frecuencia Cardíaca';
      valStr = `${updated.heartRate} lpm`;
    } else if (metric === 'spo2') {
      updated.spO2 = Math.max(0, Math.min(100, updated.spO2 + amount));
      label = 'Saturación SpO2';
      valStr = `${updated.spO2}%`;
    } else if (metric === 'etco2') {
      updated.etCO2 = Math.max(0, Math.min(80, updated.etCO2 + amount));
      label = 'Capnografía EtCO2';
      valStr = `${updated.etCO2} mmHg`;
    } else if (metric === 'rr') {
      updated.respRate = Math.max(0, Math.min(60, updated.respRate + amount));
      label = 'Frec. Respiratoria';
      valStr = `${updated.respRate} rpm`;
    } else if (metric === 'temp') {
      updated.temperature = Math.max(28, Math.min(42, Number((updated.temperature + amount).toFixed(1))));
      label = 'Temperatura';
      valStr = `${updated.temperature}°C`;
    } else if (metric === 'gcs') {
      updated.gcs = Math.max(3, Math.min(15, (updated.gcs || 15) + amount));
      label = 'Glasgow GCS';
      valStr = `${updated.gcs}/15`;
    } else if (metric === 'gluc') {
      updated.glucose = Math.max(10, Math.min(600, (updated.glucose ?? 110) + amount));
      label = 'Glucemia';
      valStr = `${updated.glucose} mg/dL`;
    }

    onUpdateSession({ vitals: updated });
    setLastModifiedParam(`${label}: ${valStr} (${amount > 0 ? '+' : ''}${amount})`);
    setTimeout(() => setLastModifiedParam(null), 3000);
  };

  // Patient Clinical Evolution: Fast Controls
  const evolvePatient = (direction: 'IMPROVE' | 'WORSEN' | 'ROSC' | 'PEA' | 'ASYSTOLE' | 'INSTABILITY') => {
    let targetRhythm: CardiacRhythmType = 'NSR';
    let newVitals: VitalSigns = { ...sessionState.vitals };
    let logDescription = '';

    if (direction === 'IMPROVE' || direction === 'ROSC') {
      targetRhythm = 'ROSC';
      newVitals = {
        heartRate: 82,
        spO2: 98,
        etCO2: 44,
        respRate: 16,
        systolicBP: 122,
        diastolicBP: 78,
        meanArterialPressure: 93,
        temperature: 36.6,
        perfusionIndex: 3.5,
        glucose: 125,
        gcs: 9,
      };
      logDescription = 'Evolución positiva: Retorno de Circulación Espontánea (ROSC). Normalización hemodinámica.';
    } else if (direction === 'WORSEN') {
      targetRhythm = 'VF_COARSE';
      newVitals = {
        heartRate: 0,
        spO2: 0,
        etCO2: 12,
        respRate: 0,
        systolicBP: 0,
        diastolicBP: 0,
        meanArterialPressure: 0,
        temperature: 35.8,
        perfusionIndex: 0.1,
        glucose: 110,
        gcs: 3,
      };
      logDescription = 'Colapso hemodinámico: Paciente cae en Fibrilación Ventricular (FV Gruesa).';
    } else if (direction === 'ASYSTOLE') {
      targetRhythm = 'ASYSTOLE';
      newVitals = {
        heartRate: 0,
        spO2: 0,
        etCO2: 6,
        respRate: 0,
        systolicBP: 0,
        diastolicBP: 0,
        meanArterialPressure: 0,
        temperature: 35.5,
        perfusionIndex: 0.1,
        glucose: 110,
        gcs: 3,
      };
      logDescription = 'Deterioro crítico: Paciente cae en Asistolia ventricular completa.';
    } else if (direction === 'PEA') {
      targetRhythm = 'PEA';
      newVitals = {
        heartRate: 64,
        spO2: 0,
        etCO2: 14,
        respRate: 0,
        systolicBP: 0,
        diastolicBP: 0,
        meanArterialPressure: 0,
        temperature: 35.8,
        perfusionIndex: 0.1,
        glucose: 110,
        gcs: 3,
      };
      logDescription = 'Evolución a AESP: Actividad Eléctrica Sin Pulso palpable.';
    } else if (direction === 'INSTABILITY') {
      targetRhythm = sessionState.currentRhythm;
      newVitals = {
        ...sessionState.vitals,
        systolicBP: Math.max(50, sessionState.vitals.systolicBP - 35),
        diastolicBP: Math.max(30, sessionState.vitals.diastolicBP - 20),
        spO2: Math.max(82, sessionState.vitals.spO2 - 8),
        etCO2: Math.max(22, sessionState.vitals.etCO2 - 6),
      };
      newVitals.meanArterialPressure = Math.round((newVitals.systolicBP + 2 * newVitals.diastolicBP) / 3);
      logDescription = `Inestabilidad aguda inducida: Hipotensión (PA ${newVitals.systolicBP}/${newVitals.diastolicBP}) y caída de SpO2 a ${newVitals.spO2}%.`;
    }

    onUpdateSession({
      currentRhythm: targetRhythm,
      vitals: newVitals,
      log: [
        {
          id: `evolve-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'RHYTHM_CHANGE',
          description: logDescription,
          details: `Ritmo: ${targetRhythm} · FC: ${newVitals.heartRate} · PA: ${newVitals.systolicBP}/${newVitals.diastolicBP} mmHg`,
        },
        ...sessionState.log,
      ],
    });
  };

  // Stochastic complications
  const triggerComplication = (comp: 'TUBE_DISLODGED' | 'IV_INFILTRATED' | 'RESCUER_FATIGUE' | 'RESOLVE') => {
    if (comp === 'RESOLVE') {
      onUpdateSession({
        complicationActive: null,
        log: [
          {
            id: `comp-res-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            elapsedSeconds: sessionState.scenarioElapsedSeconds,
            type: 'COMPLICATION',
            description: 'Complicación resuelta satisfactoriamente por el equipo.',
          },
          ...sessionState.log,
        ],
      });
      return;
    }

    let title = '';
    let details = '';
    if (comp === 'TUBE_DISLODGED') {
      title = '¡COMPLICACIÓN! Desplazamiento accidental del Tubo Endotraqueal (Extubación)';
      details = 'Capnografía cae a 4 mmHg, SpO2 comienza a descender rápidamente.';
      onUpdateSession({
        complicationActive: comp,
        vitals: { ...sessionState.vitals, etCO2: 4, spO2: Math.max(75, sessionState.vitals.spO2 - 12) },
      });
    } else if (comp === 'IV_INFILTRATED') {
      title = '¡COMPLICACIÓN! Vía Venosa Periférica Infiltrada / Extravasada';
      details = 'Los fármacos administrados no alcanzarán circulación central hasta recanalizar o colocar acceso intraóseo (IO).';
      onUpdateSession({ complicationActive: comp });
    } else if (comp === 'RESCUER_FATIGUE') {
      title = '¡COMPLICACIÓN! Fatiga severa del compresor torácico';
      details = 'Profundidad de compresiones < 4 cm, frecuencia decae a 85 cpm, EtCO2 desciende a 9 mmHg.';
      onUpdateSession({
        complicationActive: comp,
        vitals: { ...sessionState.vitals, etCO2: 9 },
      });
    }

    onUpdateSession({
      log: [
        {
          id: `comp-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'COMPLICATION',
          description: title,
          details,
        },
        ...sessionState.log,
      ],
    });
  };

  // Maniobra de Valsalva Modificada
  const handleValsalvaManeuver = () => {
    let targetRhythm = sessionState.currentRhythm;
    let description = 'Ejecución de Maniobra de Valsalva Modificada (espiración forzada 15s + elevación pasiva de piernas 15s).';

    if (sessionState.currentRhythm === 'SVT') {
      targetRhythm = 'NSR';
      const updatedVitals: VitalSigns = {
        ...sessionState.vitals,
        heartRate: 78,
        systolicBP: 120,
        diastolicBP: 80,
        meanArterialPressure: 93,
      };
      description += ' ¡Éxito! Conversión inmediata de TPSV a Ritmo Sinusal Normal.';
      onUpdateSession({
        currentRhythm: targetRhythm,
        vitals: updatedVitals,
      });
    }

    onUpdateSession({
      log: [
        {
          id: `valsalva-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'VALSALVA',
          description,
        },
        ...sessionState.log,
      ],
    });
  };

  // Checklist toggle
  const handleChecklistToggle = (itemId: string) => {
    const updated = sessionState.evaluations.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    onUpdateSession({ evaluations: updated });
  };

  const calculateScore = () => {
    const totalPoints = sessionState.evaluations.reduce((sum, item) => sum + item.points, 0);
    const earnedPoints = sessionState.evaluations
      .filter((item) => item.done)
      .reduce((sum, item) => sum + item.points, 0);
    return totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Refresh debriefing list
  const handleRefreshDebrief = () => {
    setRefreshAnimation(true);
    setTimeout(() => setRefreshAnimation(false), 500);
  };

  // Export Reports
  const handleExportJSON = () => {
    const reportData = {
      app: 'TRAKAS-3000 Plus Simulator',
      exportTimestamp: new Date().toISOString(),
      roomId: sessionState.roomId,
      scenario: currentScenario.title,
      patient: {
        age: currentScenario.patientAge,
        gender: currentScenario.patientGender,
        weightKg: currentScenario.patientWeightKg,
      },
      finalVitals: sessionState.vitals,
      finalRhythm: sessionState.currentRhythm,
      totalShocks: sessionState.defib.totalShocksDelivered,
      scenarioElapsedSeconds: sessionState.scenarioElapsedSeconds,
      evaluationScorePercent: calculateScore(),
      instructorNotes: debriefNotesText,
      evaluationRubric: sessionState.evaluations,
      eventLog: sessionState.log,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-simulacion-${sessionState.roomId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    const lines = [
      '========================================================================',
      '           REPORTE CLÍNICO DE SIMULACIÓN Y DEBRIEFING',
      '                        TRAKAS-3000 PLUS',
      '            Normativa Internacional ILCOR / AHA 2025',
      '========================================================================',
      `Fecha y Hora: ${new Date().toLocaleString()}`,
      `Sala de Simulación: #${sessionState.roomId}`,
      `Escenario Clínico: ${currentScenario.title}`,
      `Paciente: ${currentScenario.patientAge} años | Género: ${currentScenario.patientGender} | Peso: ${currentScenario.patientWeightKg} kg`,
      `Tiempo Total del Escenario: ${formatTimer(sessionState.scenarioElapsedSeconds)}`,
      `Puntaje de Adherencia ILCOR 2025: ${calculateScore()} %`,
      '',
      '--- CONSTANTES VITALES FINALES ---',
      `Ritmo: ${sessionState.currentRhythm} (${RHYTHM_DEFINITIONS[sessionState.currentRhythm]?.name || ''})`,
      `FC: ${sessionState.vitals.heartRate} lpm | PA: ${sessionState.vitals.systolicBP}/${sessionState.vitals.diastolicBP} mmHg (PAM: ${sessionState.vitals.meanArterialPressure})`,
      `SpO2: ${sessionState.vitals.spO2}% | EtCO2: ${sessionState.vitals.etCO2} mmHg | FR: ${sessionState.vitals.respRate} rpm`,
      `Temperatura: ${sessionState.vitals.temperature}°C | Glasgow (GCS): ${sessionState.vitals.gcs || 15}/15`,
      `Vía Aérea: ${sessionState.airway} | Acceso: ${sessionState.vascularAccess}`,
      `Total de Choques Eléctricos: ${sessionState.defib.totalShocksDelivered}`,
      '',
      '--- LÍNEA DE TIEMPO CRONOLÓGICA (DEBRIEFING LOG) ---',
      ...sessionState.log.map((l) => `[${formatTimer(l.elapsedSeconds)}] (${l.time}) [${l.type}] ${l.description} ${l.details ? `-> ${l.details}` : ''}`),
      '',
      '--- NOTAS PEDAGÓGICAS DEL INSTRUCTOR ---',
      debriefNotesText || 'Sin observaciones adicionales registradas.',
      '========================================================================',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-debriefing-${sessionState.roomId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLog = sessionState.log.filter((event) => {
    if (debriefFilter === 'ALL') return true;
    if (debriefFilter === 'SHOCK') return event.type === 'SHOCK' || event.type === 'CHARGE';
    if (debriefFilter === 'DRUG') return event.type === 'DRUG';
    if (debriefFilter === 'AIRWAY') return event.type === 'AIRWAY';
    if (debriefFilter === 'RHYTHM') return event.type === 'RHYTHM_CHANGE';
    if (debriefFilter === 'COMPLICATION') return event.type === 'COMPLICATION';
    return true;
  });

  return (
    <div className="w-full flex flex-col bg-[#111418] rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-900/40 text-neutral-100 select-none">
      {/* 1. Header Bar: Mode Selector & Fast Clinical Controls */}
      <header className="px-4 py-3 bg-[#171b21] border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>CONSOLA DEL FACILITADOR</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  TRAKAS-3000
                </span>
              </h2>

              {/* Mode Selector (Auto ILCOR vs Manual) */}
              <div className="flex items-center bg-black/50 border border-neutral-700 rounded-lg p-0.5 text-[10px] font-mono">
                <button
                  onClick={() => onUpdateSession({ simulationMode: 'AUTO' })}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    sessionState.simulationMode !== 'MANUAL'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Modo Automático: Farmacocinética y respuestas fisiológicas basadas en guías ILCOR 2025"
                >
                  AUTO ILCOR
                </button>
                <button
                  onClick={() => onUpdateSession({ simulationMode: 'MANUAL' })}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    sessionState.simulationMode === 'MANUAL'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Modo Manual: Control total e independiente del facilitador"
                >
                  MANUAL
                </button>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400">
              Caso Activo: <strong className="text-amber-300">{currentScenario.title}</strong>
            </p>
          </div>
        </div>

        {/* Rapid Evolution Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-black/40 border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => evolvePatient('ROSC')}
              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              title="Inducir Retorno de Circulación Espontánea (ROSC)"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>ROSC</span>
            </button>
            <button
              onClick={() => evolvePatient('WORSEN')}
              className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              title="Deteriorar súbitamente a Fibrilación Ventricular (FV)"
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>FV Paro</span>
            </button>
            <button
              onClick={() => evolvePatient('INSTABILITY')}
              className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              title="Inducir Inestabilidad Hemodinámica"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Inestabilidad</span>
            </button>
            <button
              onClick={() => {
                const next = !sessionState.isCPRActive;
                onUpdateSession({
                  isCPRActive: next,
                  log: [
                    {
                      id: `cpr-hdr-${Date.now()}`,
                      time: new Date().toLocaleTimeString(),
                      elapsedSeconds: sessionState.scenarioElapsedSeconds,
                      type: next ? 'CPR_START' : 'CPR_STOP',
                      description: next
                        ? 'Facilitador activó COMPRESIONES TORÁCICAS (RCP) · Artefacto en ECG y elevación de EtCO2 a 18 mmHg'
                        : 'Facilitador detuvo compresiones torácicas · Pausa para análisis de ritmo',
                    },
                    ...sessionState.log,
                  ],
                });
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all border ${
                sessionState.isCPRActive
                  ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.8)] animate-pulse'
                  : 'bg-rose-950/60 hover:bg-rose-900 border-rose-800 text-rose-300'
              }`}
              title="Activar o detener compresiones torácicas de RCP"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>{sessionState.isCPRActive ? 'RCP ACTIVA' : 'RCP'}</span>
            </button>
          </div>

          {/* Complications Selector */}
          <select
            value={sessionState.complicationActive || ''}
            onChange={(e) => triggerComplication((e.target.value || 'RESOLVE') as unknown as 'TUBE_DISLODGED')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono border focus:outline-none cursor-pointer ${
              sessionState.complicationActive
                ? 'bg-rose-950 text-rose-200 border-rose-500 animate-pulse'
                : 'bg-[#191f26] text-neutral-300 border-neutral-700'
            }`}
          >
            <option value="">Complicación: Ninguna</option>
            <option value="TUBE_DISLODGED">⚠️ Desplazamiento Tubo TET</option>
            <option value="IV_INFILTRATED">⚠️ Vía Venosa Infiltrada</option>
            <option value="RESCUER_FATIGUE">⚠️ Fatiga de Reanimador</option>
            <option value="RESOLVE">✅ Resolver Complicación</option>
          </select>

          {/* Projection & Screen Lock Controls */}
          <div className="flex items-center gap-1.5 bg-[#141920] p-1 rounded-xl border border-neutral-700">
            <select
              value={sessionState.isScreenLockedByInstructor ? (sessionState.studentProjectionMode || 'LOCKED') : 'UNLOCKED'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'UNLOCKED') {
                  onUpdateSession({
                    isScreenLockedByInstructor: false,
                    studentProjectionMode: 'MONITOR',
                    isProjectedToStudent: false,
                  });
                } else {
                  onUpdateSession({
                    isScreenLockedByInstructor: true,
                    studentProjectionMode: val as 'CASE_SUMMARY' | 'SAMPLER' | 'LOCKED',
                    isProjectedToStudent: val === 'SAMPLER',
                  });
                }
              }}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border focus:outline-none cursor-pointer ${
                sessionState.isScreenLockedByInstructor
                  ? 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse'
                  : 'bg-[#1b222c] text-neutral-300 border-neutral-700'
              }`}
            >
              <option value="UNLOCKED">🟢 Pantalla Alumno: Monitor Libre</option>
              <option value="CASE_SUMMARY">🔒 Proyectar Resumen de Caso (Bloqueada)</option>
              <option value="SAMPLER">🔒 Proyectar SAMPLER / XABCDE (Bloqueada)</option>
              <option value="LOCKED">🔒 Bloquear Pantalla (Atención / Debriefing)</option>
            </select>
          </div>

          {/* Quick Reset Vitals button */}
          <button
            onClick={handleResetVitalsOnly}
            className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border border-sky-800 bg-[#16202c] hover:bg-[#202e3f] text-sky-300 transition-all cursor-pointer shadow-sm"
            title="Restablecer FC, SpO2, EtCO2, TA y Glucosa a los valores iniciales del escenario activo"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>RESET CONSTANTES</span>
          </button>

          {/* Master Factory Reset Button */}
          <button
            onClick={() => {
              if (window.confirm('¿Está seguro de BORRAR TODO y reiniciar la consola de simulación a estado inicial de fábrica?')) {
                onMasterReset();
              }
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border border-rose-900/80 bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Borrar todos los registros, silenciar audio, limpiar estado local y reiniciar de fábrica sin bloqueos"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>REINICIAR TODO</span>
          </button>
        </div>
      </header>

      {/* 2. Compact Timers Strip (Adrenaline 3-5min & CPR 2min with Alert) */}
      <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between text-xs font-mono transition-colors ${
        cprAlarmActive
          ? 'bg-rose-950 border-rose-600 text-white animate-pulse'
          : 'bg-[#15191f] border-neutral-800 text-neutral-300'
      }`}>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Adrenaline 3-5 min timer */}
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-neutral-400 text-[11px]">Reloj Adrenalina (3-5 min):</span>
            <span
              className={`font-bold ${
                sessionState.timeSinceLastAdrenaline !== null && sessionState.timeSinceLastAdrenaline >= 180
                  ? 'text-rose-400 animate-pulse font-lcd'
                  : 'text-amber-300 font-lcd'
              }`}
            >
              {sessionState.timeSinceLastAdrenaline !== null
                ? formatTimer(sessionState.timeSinceLastAdrenaline)
                : 'NO ADMINISTRADA'}
            </span>
          </div>

          <span className="text-neutral-700 hidden sm:inline">|</span>

          {/* CPR 2-min cycle */}
          <div className="flex items-center gap-2">
            <Timer className={`w-3.5 h-3.5 ${cprAlarmActive ? 'text-white' : 'text-emerald-400'}`} />
            <span className="text-neutral-400 text-[11px]">Ciclo RCP 2 min:</span>
            <span className={`font-bold font-lcd ${cprAlarmActive ? 'text-white font-extrabold text-sm' : 'text-emerald-300'}`}>
              {formatTimer(twoMinCPRTimer)}
            </span>
            <button
              onClick={() => setIsCPRTimerRunning(!isCPRTimerRunning)}
              className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 cursor-pointer"
            >
              {isCPRTimerRunning ? 'Pausa' : 'Iniciar'}
            </button>
            <button
              onClick={() => {
                setTwoMinCPRTimer(120);
                setCprAlarmActive(false);
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 cursor-pointer"
            >
              Reset
            </button>
            {cprAlarmActive && (
              <span className="text-rose-300 text-[10px] font-bold animate-ping">
                ¡CAMBIO DE COMPRESOR Y CHEQUEO DE RITMO!
              </span>
            )}
          </div>
        </div>

        {/* Student Dial status */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span>Monitor Alumno:</span>
          <span className="font-bold text-white uppercase bg-black/40 px-2 py-0.5 rounded border border-neutral-700">
            {sessionState.dialMode}
          </span>
          <span>·</span>
          <span>Deriv: <strong className="text-emerald-400 font-mono">{sessionState.selectedLead}</strong></span>
        </div>
      </div>

      {/* 2.5 LIVE TELEMETRY OSCILLOSCOPE HUD & DART SIM STYLE STRIP */}
      <InstructorLiveHUD
        sessionState={sessionState}
        currentScenario={currentScenario}
        onUpdateSession={onUpdateSession}
        onOpenQrModal={onOpenQrModal}
        onOpenSampleModal={() => onOpenSampleModal(currentScenario)}
        onEvolvePatient={evolvePatient}
      />

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-neutral-800 bg-[#14181e] px-4 gap-1 text-xs overflow-x-auto">
        {[
          { id: 'presets', label: '1. Arritmias & Presets', icon: Heart },
          { id: 'fine-tune', label: '2. Monitor Virtual & TA (+/-)', icon: Sliders },
          { id: 'scenarios', label: '3. Casos & Constructor', icon: FileCode },
          { id: 'interventions', label: '4. Fármacos & Vía Aérea', icon: Pill },
          { id: 'sampler', label: '5. SAMPLER & 5H/5T', icon: FileText },
          { id: 'debriefing', label: `6. Debriefing (${sessionState.log.length})`, icon: Activity },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as unknown as 'presets')}
            className={`py-2.5 px-3.5 text-center font-medium rounded-t-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === id
                ? 'bg-[#0f1216] text-amber-400 font-bold border-t-2 border-amber-500'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 4. Tab Stage Content */}
      <div className="p-4 sm:p-5 overflow-y-auto max-h-[520px] bg-[#0f1216] space-y-4">
        {/* ========================================================
            TAB 1: RHYTHM PRESETS (ORGANIZADO EN LAS 5 CATEGORÍAS CLÍNICAS)
        ======================================================== */}
        {activeTab === 'presets' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Presintonías Clínicas Clave (5 Categorías Fundamentales):
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Selecciona cualquier ritmo para actualizar instantáneamente el ECG, constantes vitales y capnografía.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-400">Ritmo Activo:</span>
                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50">
                  {RHYTHM_DEFINITIONS[sessionState.currentRhythm]?.name || sessionState.currentRhythm}
                </span>
              </div>
            </div>

            {/* Category Groups */}
            {[
              {
                id: 'cat-vf-vt',
                title: '⚡ 1. T.V. SIN PULSO / F.V. (Paro Cardíaco Desfibrilable)',
                badge: 'DESFIBRILABLE',
                badgeStyle: 'bg-rose-950 text-rose-300 border-rose-700',
                rhythms: ['VF_COARSE', 'VF_FINE', 'VT_PULSELESS', 'TORSADES'] as CardiacRhythmType[],
              },
              {
                id: 'cat-asystole-pea',
                title: '🛑 2. ASISTOLIA / A.E.S.P. (Paro Cardíaco No Desfibrilable)',
                badge: 'NO DESFIBRILABLE',
                badgeStyle: 'bg-neutral-800 text-neutral-200 border-neutral-600',
                rhythms: ['ASYSTOLE', 'PEA'] as CardiacRhythmType[],
              },
              {
                id: 'cat-tachy',
                title: '⚡ 3. TAQUIARRITMIAS (Taquicardias con Pulso)',
                badge: 'CON PULSO',
                badgeStyle: 'bg-amber-950 text-amber-300 border-amber-700',
                rhythms: ['VT_WITH_PULSE', 'SVT', 'AFIB_RVR', 'SINUS_TACHY'] as CardiacRhythmType[],
              },
              {
                id: 'cat-brady',
                title: '🐢 4. BRADIARRITMIAS (Bloqueos y Bradicardias)',
                badge: 'MARCAPASOS',
                badgeStyle: 'bg-sky-950 text-sky-300 border-sky-700',
                rhythms: ['SINUS_BRADY', 'AV_BLOCK_3RD'] as CardiacRhythmType[],
              },
              {
                id: 'cat-rosc',
                title: '✨ 5. ROSC (Retorno de Circulación Espontánea)',
                badge: 'PERFUSIÓN RESTAURADA',
                badgeStyle: 'bg-emerald-950 text-emerald-300 border-emerald-700',
                rhythms: ['ROSC', 'NSR'] as CardiacRhythmType[],
              },
            ].map((cat) => (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-200 tracking-wide flex items-center gap-2">
                    <span>{cat.title}</span>
                  </h4>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${cat.badgeStyle}`}>
                    {cat.badge}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {cat.rhythms.map((rhythmKey) => {
                    const rhythmDef = RHYTHM_DEFINITIONS[rhythmKey];
                    if (!rhythmDef) return null;
                    const isActive = sessionState.currentRhythm === rhythmKey;

                    return (
                      <button
                        key={rhythmKey}
                        onClick={() => handleSetPreset(rhythmKey)}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? 'bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-500/60'
                            : 'bg-[#15191f] hover:bg-[#1e232c] border-neutral-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-white text-xs truncate">{rhythmDef.name}</span>
                            {isActive && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">
                            {rhythmDef.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mt-2.5 pt-2 border-t border-neutral-800/80">
                          <span>FC: <strong className="text-white">{rhythmDef.defaultHR}</strong></span>
                          <span>PA: <strong className="text-white">{rhythmDef.defaultBP[0]}/{rhythmDef.defaultBP[1]}</strong></span>
                          <span>SpO2: <strong className="text-white">{rhythmDef.defaultSpO2}%</strong></span>
                          <span>EtCO2: <strong className="text-white">{rhythmDef.defaultEtCO2}</strong></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================
            TAB 2: VIRTUAL MONITOR & INDEPENDENT BP ADJUST (+/- 1, 5, 10)
        ======================================================== */}
        {activeTab === 'fine-tune' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Regulación Fisiológica de Constantes Vitales (Ajuste Independiente):
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">
                Respuesta en tiempo real sincronizada con monitor del alumno
              </span>
            </div>

            {/* Visual Indicator of Active Parameter Being Modified */}
            {lastModifiedParam && (
              <div className="bg-amber-950/90 border-2 border-amber-500 text-amber-200 px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-between shadow-lg animate-pulse">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span>PARÁMETRO MODIFICADO (SINCRONIZADO AL INSTANTE):</span>
                </span>
                <strong className="text-white text-sm font-lcd tracking-wide">{lastModifiedParam}</strong>
              </div>
            )}

            {/* HIGHLIGHT: PRESIÓN ARTERIAL SISTÓLICA Y DIASTÓLICA INDEPENDIENTES CON +/- 1, 5, 10 */}
            <div className="bg-[#141920] p-4 border border-amber-900/60 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    TENSIÓN ARTERIAL NO INVASIVA (PANI) INDEPENDIENTE
                  </span>
                </div>
                <div className="text-xs font-mono text-neutral-300">
                  Lectura Actual:{' '}
                  <strong className="text-amber-400 text-base font-lcd font-bold">
                    {sessionState.vitals.systolicBP} / {sessionState.vitals.diastolicBP} mmHg
                  </strong>{' '}
                  <span className="text-neutral-500">(PAM {sessionState.vitals.meanArterialPressure} mmHg · Pulso {sessionState.vitals.systolicBP - sessionState.vitals.diastolicBP})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Control PAS (Sistólica) */}
                <div className="bg-[#1a2029] p-3.5 border border-neutral-700/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300 font-mono">PRESIÓN SISTÓLICA (PAS)</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold font-lcd text-amber-300 tabular-nums">
                        {sessionState.vitals.systolicBP}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono">mmHg</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[-10, -5, -1, 1, 5, 10].map((amt) => (
                      <button
                        key={`sys-${amt}`}
                        onClick={() => adjustSystolicBP(amt)}
                        className={`flex-1 py-1 px-1.5 text-xs font-bold font-mono rounded-lg border transition-all cursor-pointer ${
                          amt < 0
                            ? 'bg-[#222934] hover:bg-[#2e3746] text-rose-300 border-rose-900/60'
                            : 'bg-[#222934] hover:bg-[#2e3746] text-emerald-300 border-emerald-900/60'
                        }`}
                      >
                        {amt > 0 ? `+${amt}` : amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Control PAD (Diastólica) */}
                <div className="bg-[#1a2029] p-3.5 border border-neutral-700/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300 font-mono">PRESIÓN DIASTÓLICA (PAD)</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold font-lcd text-sky-300 tabular-nums">
                        {sessionState.vitals.diastolicBP}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono">mmHg</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[-10, -5, -1, 1, 5, 10].map((amt) => (
                      <button
                        key={`dia-${amt}`}
                        onClick={() => adjustDiastolicBP(amt)}
                        className={`flex-1 py-1 px-1.5 text-xs font-bold font-mono rounded-lg border transition-all cursor-pointer ${
                          amt < 0
                            ? 'bg-[#222934] hover:bg-[#2e3746] text-rose-300 border-rose-900/60'
                            : 'bg-[#222934] hover:bg-[#2e3746] text-emerald-300 border-emerald-900/60'
                        }`}
                      >
                        {amt > 0 ? `+${amt}` : amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Other physiological parameters (With +/- 1 and fast stepping) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* HR (Frecuencia Cardíaca) */}
              <div className="bg-[#161a20] p-3.5 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">FRECUENCIA CARDÍACA (FC)</span>
                  <span className="text-xl font-bold font-lcd text-emerald-400">{sessionState.vitals.heartRate} lpm</span>
                </div>
                <div className="flex items-center gap-1">
                  {[-10, -5, -1, 1, 5, 10].map((amt) => (
                    <button
                      key={`hr-${amt}`}
                      onClick={() => adjustVital('hr', amt)}
                      className={`flex-1 py-1 text-xs font-bold font-mono rounded border cursor-pointer ${
                        amt < 0
                          ? 'bg-[#20252e] hover:bg-[#2c333e] text-rose-300 border-rose-900/60'
                          : 'bg-[#20252e] hover:bg-[#2c333e] text-emerald-300 border-emerald-900/60'
                      }`}
                    >
                      {amt > 0 ? `+${amt}` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* SpO2 (Saturación) */}
              <div className="bg-[#161a20] p-3.5 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">SATURACIÓN (SpO2)</span>
                  <span className="text-xl font-bold font-lcd text-sky-400">{sessionState.vitals.spO2}%</span>
                </div>
                <div className="flex items-center gap-1">
                  {[-10, -5, -1, 1, 5, 10].map((amt) => (
                    <button
                      key={`spo2-${amt}`}
                      onClick={() => adjustVital('spo2', amt)}
                      className={`flex-1 py-1 text-xs font-bold font-mono rounded border cursor-pointer ${
                        amt < 0
                          ? 'bg-[#20252e] hover:bg-[#2c333e] text-rose-300 border-rose-900/60'
                          : 'bg-[#20252e] hover:bg-[#2c333e] text-sky-300 border-sky-900/60'
                      }`}
                    >
                      {amt > 0 ? `+${amt}` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* EtCO2 (Capnografía) */}
              <div className="bg-[#161a20] p-3.5 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">CAPNOGRAFÍA (EtCO2)</span>
                  <span className="text-xl font-bold font-lcd text-yellow-400">{sessionState.vitals.etCO2} mmHg</span>
                </div>
                <div className="flex items-center gap-1">
                  {[-10, -5, -1, 1, 5, 10].map((amt) => (
                    <button
                      key={`etco2-${amt}`}
                      onClick={() => adjustVital('etco2', amt)}
                      className={`flex-1 py-1 text-xs font-bold font-mono rounded border cursor-pointer ${
                        amt < 0
                          ? 'bg-[#20252e] hover:bg-[#2c333e] text-rose-300 border-rose-900/60'
                          : 'bg-[#20252e] hover:bg-[#2c333e] text-yellow-300 border-yellow-900/60'
                      }`}
                    >
                      {amt > 0 ? `+${amt}` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* RR (Frecuencia Respiratoria) */}
              <div className="bg-[#161a20] p-3.5 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">FREC. RESPIRATORIA (FR)</span>
                  <span className="text-xl font-bold font-lcd text-neutral-200">{sessionState.vitals.respRate} rpm</span>
                </div>
                <div className="flex items-center gap-1">
                  {[-10, -5, -1, 1, 5, 10].map((amt) => (
                    <button
                      key={`rr-${amt}`}
                      onClick={() => adjustVital('rr', amt)}
                      className={`flex-1 py-1 text-xs font-bold font-mono rounded border cursor-pointer ${
                        amt < 0
                          ? 'bg-[#20252e] hover:bg-[#2c333e] text-rose-300 border-rose-900/60'
                          : 'bg-[#20252e] hover:bg-[#2c333e] text-neutral-200 border-neutral-700'
                      }`}
                    >
                      {amt > 0 ? `+${amt}` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div className="bg-[#161a20] p-3.5 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">TEMPERATURA CENTRAL</span>
                  <span className="text-xl font-bold font-lcd text-neutral-200">{sessionState.vitals.temperature}°C</span>
                </div>
                <div className="flex items-center gap-1">
                  {[-1.0, -0.5, -0.1, 0.1, 0.5, 1.0].map((amt) => (
                    <button
                      key={`temp-${amt}`}
                      onClick={() => adjustVital('temp', amt)}
                      className={`flex-1 py-1 text-xs font-bold font-mono rounded border cursor-pointer ${
                        amt < 0
                          ? 'bg-[#20252e] hover:bg-[#2c333e] text-rose-300 border-rose-900/60'
                          : 'bg-[#20252e] hover:bg-[#2c333e] text-neutral-200 border-neutral-700'
                      }`}
                    >
                      {amt > 0 ? `+${amt}` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glucose (Glucemia Capilar) */}
              <div className="bg-[#161a20] p-3.5 border border-neutral-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">GLUCEMIA CAPILAR</span>
                  <span className="text-xl font-bold font-lcd text-amber-400">{sessionState.vitals.glucose ?? 110} mg/dL</span>
                </div>
                <div className="flex items-center gap-1">
                  {[-50, -10, -1, 1, 10, 50].map((amt) => (
                    <button
                      key={`gluc-${amt}`}
                      onClick={() => adjustVital('gluc', amt)}
                      className={`flex-1 py-1 text-xs font-bold font-mono rounded border cursor-pointer ${
                        amt < 0
                          ? 'bg-[#20252e] hover:bg-[#2c333e] text-rose-300 border-rose-900/60'
                          : 'bg-[#20252e] hover:bg-[#2c333e] text-amber-300 border-amber-900/60'
                      }`}
                    >
                      {amt > 0 ? `+${amt}` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glasgow GCS */}
              <div className="bg-[#161a20] p-3.5 border border-neutral-800 rounded-xl space-y-2 sm:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">ESCALA DE COMA DE GLASGOW (GCS)</span>
                  <span className="text-xl font-bold font-lcd text-neutral-200">{sessionState.vitals.gcs || 15}/15</span>
                </div>
                <div className="flex items-center gap-1">
                  {[-3, -1, 1, 3].map((amt) => (
                    <button
                      key={`gcs-${amt}`}
                      onClick={() => adjustVital('gcs', amt)}
                      className="flex-1 py-1 bg-[#20252e] hover:bg-[#2c333e] text-xs font-bold font-mono rounded border border-neutral-700 cursor-pointer"
                    >
                      {amt > 0 ? `+${amt}` : amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: SCENARIOS & PERSISTENT BUILDER (LOCALSTORAGE)
        ======================================================== */}
        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Biblioteca Oficial & Casos Personalizados del Instructor:
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Crea, edita y guarda tus propios escenarios con persistencia en LocalStorage.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingScenario({
                    id: `custom-scen-${Date.now()}`,
                    title: 'Nuevo Caso Clínico Personalizado',
                    category: 'AHA_ACLS',
                    difficulty: 'Intermedio',
                    summary: '',
                    chiefComplaint: '',
                    patientAge: 50,
                    patientGender: 'Masculino',
                    patientWeightKg: 75,
                    initialRhythm: 'VF_COARSE',
                    initialVitals: {
                      heartRate: 0,
                      spO2: 0,
                      respRate: 0,
                      etCO2: 12,
                      systolicBP: 0,
                      diastolicBP: 0,
                      meanArterialPressure: 0,
                      temperature: 36.5,
                      perfusionIndex: 0.1,
                      glucose: 110,
                      gcs: 3,
                    },
                    capnographyPattern: 'NORMAL',
                    physiologicalNotes: '',
                    sample: {
                      signosSintomas: '',
                      alergias: 'Ninguna conocida',
                      medicamentos: '',
                      patologiasPrevias: '',
                      lunchUltimaIngesta: '',
                      eventosDesencadenantes: '',
                    },
                    xabcde: {
                      exsanguinatingHemorrhage: 'X: Sin hemorragias masivas.',
                      airway: 'A: Vía aérea...',
                      breathing: 'B: Ventilación...',
                      circulation: 'C: Circulación...',
                      disability: 'D: Neurológico...',
                      exposure: 'E: Exposición...',
                    },
                    reversibleCauses: {
                      hList: [
                        { name: 'Hipovolemia', present: false, clinicalSigns: '', intervention: '' },
                        { name: 'Hipoxia', present: false, clinicalSigns: '', intervention: '' },
                        { name: 'Hidrogeniones', present: false, clinicalSigns: '', intervention: '' },
                        { name: 'Hipo/Hiperpotasemia', present: false, clinicalSigns: '', intervention: '' },
                        { name: 'Hipotermia', present: false, clinicalSigns: '', intervention: '' },
                      ],
                      tList: [
                        { name: 'Neumotórax a Tensión', present: false, clinicalSigns: '', intervention: '' },
                        { name: 'Taponamiento', present: false, clinicalSigns: '', intervention: '' },
                        { name: 'Tóxicos', present: false, clinicalSigns: '', intervention: '' },
                        { name: 'Trombosis Pulmonar', present: false, clinicalSigns: '', intervention: '' },
                        { name: 'Trombosis Coronaria', present: false, clinicalSigns: '', intervention: '' },
                      ],
                    },
                    suggestedAction: '',
                    criticalPoints: [],
                    ilcorChecklist: [
                      { id: `chk-${Date.now()}-1`, category: 'Evaluación', description: 'Evaluación primaria inicial', done: false, points: 25 },
                      { id: `chk-${Date.now()}-2`, category: 'RCP', description: 'Inicio oportuno de maniobras', done: false, points: 25 },
                    ],
                  });
                  setIsCreatingScenario(true);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Caso</span>
              </button>
            </div>

            {/* Custom Scenario Form Modal / Drawer */}
            {isCreatingScenario && editingScenario && (
              <div className="bg-[#161a22] p-4 border border-amber-600/60 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-700">
                  <h4 className="font-bold text-sm text-amber-400 font-mono">CONSTRUCTOR DE CASO CLÍNICO</h4>
                  <button
                    onClick={() => {
                      setIsCreatingScenario(false);
                      setEditingScenario(null);
                    }}
                    className="p-1 text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="text-neutral-400 block mb-1">Título del Escenario</label>
                    <input
                      type="text"
                      value={editingScenario.title || ''}
                      onChange={(e) => setEditingScenario({ ...editingScenario, title: e.target.value })}
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Categoría</label>
                    <select
                      value={editingScenario.category || 'AHA_ACLS'}
                      onChange={(e) => setEditingScenario({ ...editingScenario, category: e.target.value as unknown as 'AHA_ACLS' })}
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="AHA_ACLS">AHA ACLS</option>
                      <option value="PALS">PALS Pediátrico</option>
                      <option value="TRAUMA">Trauma / ATLS</option>
                      <option value="CARDIOLOGY">Cardiología General</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Ritmo Inicial</label>
                    <select
                      value={editingScenario.initialRhythm || 'VF_COARSE'}
                      onChange={(e) => setEditingScenario({ ...editingScenario, initialRhythm: e.target.value as CardiacRhythmType })}
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      {Object.keys(RHYTHM_DEFINITIONS).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-neutral-400 block mb-1">Edad (Años)</label>
                    <input
                      type="number"
                      value={editingScenario.patientAge || 50}
                      onChange={(e) => setEditingScenario({ ...editingScenario, patientAge: Number(e.target.value) })}
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Género</label>
                    <select
                      value={editingScenario.patientGender || 'Masculino'}
                      onChange={(e) => setEditingScenario({ ...editingScenario, patientGender: e.target.value as 'Masculino' | 'Femenino' })}
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">FC Inicial</label>
                    <input
                      type="number"
                      value={editingScenario.initialVitals?.heartRate || 0}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          initialVitals: { ...editingScenario.initialVitals!, heartRate: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">PA Inicial (PAS/PAD)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="PAS"
                        value={editingScenario.initialVitals?.systolicBP || 0}
                        onChange={(e) =>
                          setEditingScenario({
                            ...editingScenario,
                            initialVitals: { ...editingScenario.initialVitals!, systolicBP: Number(e.target.value) },
                          })
                        }
                        className="w-1/2 bg-[#101216] border border-neutral-700 rounded px-1.5 py-1 text-white"
                      />
                      <input
                        type="number"
                        placeholder="PAD"
                        value={editingScenario.initialVitals?.diastolicBP || 0}
                        onChange={(e) =>
                          setEditingScenario({
                            ...editingScenario,
                            initialVitals: { ...editingScenario.initialVitals!, diastolicBP: Number(e.target.value) },
                          })
                        }
                        className="w-1/2 bg-[#101216] border border-neutral-700 rounded px-1.5 py-1 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-neutral-400 block mb-1">SpO2 (%)</label>
                    <input
                      type="number"
                      value={editingScenario.initialVitals?.spO2 || 0}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          initialVitals: { ...editingScenario.initialVitals!, spO2: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">EtCO2 (mmHg)</label>
                    <input
                      type="number"
                      value={editingScenario.initialVitals?.etCO2 || 0}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          initialVitals: { ...editingScenario.initialVitals!, etCO2: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">FR (rpm)</label>
                    <input
                      type="number"
                      value={editingScenario.initialVitals?.respRate || 0}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          initialVitals: { ...editingScenario.initialVitals!, respRate: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Glucosa (mg/dL)</label>
                    <input
                      type="number"
                      value={editingScenario.initialVitals?.glucose ?? 110}
                      onChange={(e) =>
                        setEditingScenario({
                          ...editingScenario,
                          initialVitals: { ...editingScenario.initialVitals!, glucose: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-[#101216] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1 text-xs">Resumen Clínico para el Alumno</label>
                  <textarea
                    rows={2}
                    value={editingScenario.summary || ''}
                    onChange={(e) => setEditingScenario({ ...editingScenario, summary: e.target.value })}
                    className="w-full bg-[#101216] border border-neutral-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsCreatingScenario(false);
                      setEditingScenario(null);
                    }}
                    className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleSaveCustomScenario(editingScenario as ClinicalScenario)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Caso en LocalStorage</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Scenarios Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allAvailableScenarios.map((scen) => {
                const isCustom = customScenarios.some((c) => c.id === scen.id);
                const isActive = sessionState.activeScenarioId === scen.id;
                return (
                  <div
                    key={scen.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isActive
                        ? 'bg-[#181e26] border-amber-500 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-[#15191f] border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-white">{scen.title}</span>
                        {isCustom && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 shrink-0">
                            PERSONALIZADO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono mt-1">
                        <span>{scen.patientAge} años ({scen.patientGender})</span>
                        <span>·</span>
                        <span>Ritmo Inicial: <strong className="text-amber-400">{scen.initialRhythm}</strong></span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2">
                        {scen.summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onResetScenario(scen.id)}
                          className={`px-3 py-1 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 text-black'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                          }`}
                        >
                          {isActive ? 'CARGADO ACTIVO' : 'CARGAR CASO'}
                        </button>
                        <button
                          onClick={() => onOpenSampleModal(scen)}
                          className="px-2.5 py-1 text-xs font-mono text-sky-400 hover:text-white bg-sky-950/60 rounded-lg border border-sky-800/80 cursor-pointer"
                        >
                          Ver SAMPLE
                        </button>
                      </div>

                      {isCustom && (
                        <button
                          onClick={() => handleDeleteCustomScenario(scen.id)}
                          className="p-1 text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 rounded cursor-pointer"
                          title="Eliminar de LocalStorage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: INTERVENTIONS & DRUGS (ILCOR 2025)
        ======================================================== */}
        {activeTab === 'interventions' && (
          <div className="space-y-4">
            {/* Airway & Vascular access strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Airway */}
              <div className="bg-[#161a20] p-4 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-xs font-bold text-neutral-300 font-mono flex items-center gap-2">
                  <Wind className="w-4 h-4 text-sky-400" />
                  <span>MANEJO DE VÍA AÉREA</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'SPONTANEOUS', label: 'Ambiente / Espontánea' },
                    { id: 'NASAL_CANNULA', label: 'Cánula Nasal 3L' },
                    { id: 'NON_REBREATHER', label: 'Mascarilla Reservorio 15L' },
                    { id: 'SUPRAGLOTTIC', label: 'i-gel / Mascarilla Laríngea' },
                    { id: 'ETT', label: 'Tubo Endotraqueal (IOT)' },
                  ].map((air) => (
                    <button
                      key={air.id}
                      onClick={() => {
                        onUpdateSession({
                          airway: air.id as AirwayType,
                          log: [
                            {
                              id: `airway-${Date.now()}`,
                              time: new Date().toLocaleTimeString(),
                              elapsedSeconds: sessionState.scenarioElapsedSeconds,
                              type: 'AIRWAY',
                              description: `Vía aérea cambiada a: ${air.label}`,
                            },
                            ...sessionState.log,
                          ],
                        });
                      }}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        sessionState.airway === air.id
                          ? 'bg-sky-950/80 border-sky-500 text-sky-200 font-bold'
                          : 'bg-[#101216] border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {air.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vascular Access */}
              <div className="bg-[#161a20] p-4 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-xs font-bold text-neutral-300 font-mono flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-emerald-400" />
                  <span>ACCESOS VASCULARES</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'NONE', label: 'Sin acceso' },
                    { id: 'IV_PERIPHERAL', label: 'Vía Venosa IV 18G' },
                    { id: 'IO_HUMERAL', label: 'Intraósea Humeral (IO)' },
                    { id: 'IO_TIBIAL', label: 'Intraósea Tibial (IO)' },
                  ].map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => {
                        onUpdateSession({
                          vascularAccess: acc.id as VascularAccessType,
                          log: [
                            {
                              id: `acc-${Date.now()}`,
                              time: new Date().toLocaleTimeString(),
                              elapsedSeconds: sessionState.scenarioElapsedSeconds,
                              type: 'INTERVENTION',
                              description: `Acceso vascular establecido: ${acc.label}`,
                            },
                            ...sessionState.log,
                          ],
                        });
                      }}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        sessionState.vascularAccess === acc.id
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold'
                          : 'bg-[#101216] border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>

                {/* Valsalva Button */}
                <div className="pt-2">
                  <button
                    onClick={handleValsalvaManeuver}
                    className="w-full py-2 bg-purple-950/70 hover:bg-purple-900 border border-purple-700 text-purple-200 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    <span>Ejecutar Maniobra de Valsalva Modificada (TPSV)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Farmacología ILCOR 2025 Exacta */}
            <div className="bg-[#161a20] p-4 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 font-mono flex items-center gap-2">
                  <Pill className="w-4 h-4 text-amber-400" />
                  <span>FARMACOLOGÍA CLÍNICA ILCOR / AHA 2025</span>
                </span>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Dosis con bolo y lavado salino de 20 mL
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { name: 'Epinefrina (Adrenalina)', dose: '1 mg', route: 'IV/IO', isAdrenaline: true },
                  { name: 'Amiodarona', dose: '300 mg bolo', route: 'IV/IO' },
                  { name: 'Amiodarona (2ª dosis)', dose: '150 mg bolo', route: 'IV/IO' },
                  { name: 'Lidocaína', dose: '100 mg (1.5 mg/kg)', route: 'IV/IO' },
                  { name: 'Adenosina (1ª dosis)', dose: '6 mg bolo rápido', route: 'IV antecubital' },
                  { name: 'Adenosina (2ª dosis)', dose: '12 mg bolo rápido', route: 'IV antecubital' },
                  { name: 'Atropina', dose: '1 mg bolo', route: 'IV/IO' },
                  { name: 'Sulfato de Magnesio', dose: '2 g en 100 mL', route: 'IV (Torsades)' },
                  { name: 'Bicarbonato de Sodio', dose: '50 mEq (1 mEq/kg)', route: 'IV/IO' },
                  { name: 'Suero Salino 0.9%', dose: '500 mL bolo', route: 'IV rápido' },
                  { name: 'Naloxona', dose: '0.4 - 2 mg', route: 'IV/IN/IM' },
                  { name: 'Glucosa 50%', dose: '25 g (50 mL)', route: 'IV lenta' },
                ].map((drug) => (
                  <button
                    key={`${drug.name}-${drug.dose}`}
                    onClick={() => {
                      onAdministerDrug(drug.name, drug.dose, drug.route);
                      if (drug.isAdrenaline) {
                        onUpdateSession({ timeSinceLastAdrenaline: 0 });
                        // In Auto Mode: pharmacokinetics response after 30s
                        if (sessionState.simulationMode !== 'MANUAL' && sessionState.vitals.systolicBP === 0) {
                          setTimeout(() => {
                            onUpdateSession({
                              vitals: {
                                ...sessionState.vitals,
                                etCO2: Math.min(26, sessionState.vitals.etCO2 + 4),
                              },
                            });
                          }, 25000);
                        }
                      }
                    }}
                    className="p-2.5 bg-[#101216] hover:bg-[#1a1f26] active:scale-[0.98] border border-neutral-800 hover:border-amber-600 rounded-xl text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-xs text-white truncate">{drug.name}</div>
                    <div className="text-[11px] text-amber-400 font-mono mt-0.5">{drug.dose}</div>
                    <div className="text-[9px] text-neutral-500 font-mono">{drug.route}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* CAPNOGRAFÍA REALISTA, VÍA AÉREA Y CALIDAD DE REANIMACIÓN */}
            <div className="bg-[#14181f] p-4 border border-yellow-900/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-bold text-yellow-300 font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-400" />
                  <span>CALIDAD DE RCP & DINÁMICA DE CAPNOGRAFÍA EN PARO</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  Modifica la onda y valor de EtCO2 según la técnica
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CPR Quality Mode */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-neutral-300 font-mono">
                    CALIDAD DE COMPRESIONES TORÁCICAS:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'NORMAL', label: 'RCP Normal', sub: '18-24 mmHg', color: 'emerald' },
                      { id: 'INEFFECTIVE', label: 'RCP Inefectiva', sub: '< 10 mmHg', color: 'rose' },
                      { id: 'ROSC_SURGE', label: 'Salto ROSC', sub: '> 40 mmHg', color: 'amber' },
                    ].map((mode) => {
                      const isSel = (sessionState.cprQualityMode || 'NORMAL') === mode.id;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => {
                            onUpdateSession({
                              cprQualityMode: mode.id as 'NORMAL' | 'INEFFECTIVE' | 'ROSC_SURGE',
                              log: [
                                {
                                  id: `cpr-q-${Date.now()}`,
                                  time: new Date().toLocaleTimeString(),
                                  elapsedSeconds: sessionState.scenarioElapsedSeconds,
                                  type: 'INTERVENTION',
                                  description: `Facilitador fijó calidad de RCP: ${mode.label} (${mode.sub})`,
                                },
                                ...sessionState.log,
                              ],
                            });
                          }}
                          className={`p-2 rounded-lg border text-center font-mono transition-all cursor-pointer ${
                            isSel
                              ? 'bg-yellow-950/80 border-yellow-400 text-yellow-200 font-bold shadow'
                              : 'bg-[#181d24] border-neutral-700 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-bold">{mode.label}</div>
                          <div className="text-[9px] opacity-75">{mode.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Airway Management & Malposition */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-neutral-300 font-mono">
                    MANEJO AVANZADO / ERROR DE VÍA AÉREA:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'BVM', label: 'Bolsa BVM (30:2)', sub: 'Básica con pausas' },
                      { id: 'ADVANCED_ETT', label: 'Tubo TET / i-gel (10 rpm)', sub: 'Asincrónica cada 6s' },
                      { id: 'ESOPHAGEAL_INTUBATION', label: '⚠️ Intubación Esofágica', sub: 'Curva plana 0 mmHg' },
                      { id: 'BRONCHOSPASM', label: 'Broncoespasmo', sub: 'Aleta de tiburón' },
                    ].map((air) => {
                      const isSel = (sessionState.airwayManagementMode || 'SPONTANEOUS') === air.id;
                      return (
                        <button
                          key={air.id}
                          onClick={() => {
                            onUpdateSession({
                              airwayManagementMode: air.id as 'BVM' | 'ADVANCED_ETT' | 'ESOPHAGEAL_INTUBATION' | 'BRONCHOSPASM' | 'SPONTANEOUS',
                              log: [
                                {
                                  id: `airway-mode-${Date.now()}`,
                                  time: new Date().toLocaleTimeString(),
                                  elapsedSeconds: sessionState.scenarioElapsedSeconds,
                                  type: 'AIRWAY',
                                  description: `Facilitador configuró Vía Aérea: ${air.label}`,
                                },
                                ...sessionState.log,
                              ],
                            });
                          }}
                          className={`p-1.5 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                            isSel
                              ? air.id === 'ESOPHAGEAL_INTUBATION'
                                ? 'bg-rose-950/90 border-rose-500 text-rose-200 font-bold ring-1 ring-rose-500'
                                : 'bg-sky-950/90 border-sky-400 text-sky-200 font-bold ring-1 ring-sky-400'
                              : 'bg-[#181d24] border-neutral-700 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="text-[11px] font-bold">{air.label}</div>
                          <div className="text-[8px] opacity-75">{air.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* PROPUESTAS E INTERVENCIONES DEL ALUMNO (ACEPTAR / RECHAZAR CON CAMBIO FAVORABLE O ADVERSO) */}
            <div className="bg-[#14181f] p-4 border border-sky-900/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-bold text-sky-300 font-mono flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-sky-400" />
                  <span>PROPUESTAS E INTERVENCIONES EN TIEMPO REAL DEL ALUMNO</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  Total registradas: <strong className="text-white">{(sessionState.pendingStudentInterventions || []).length}</strong>
                </span>
              </div>

              {(sessionState.pendingStudentInterventions || []).length === 0 ? (
                <div className="p-4 text-center text-xs font-mono text-neutral-500 bg-[#101216] rounded-lg border border-neutral-800">
                  Sin propuestas recientes. Cuando el alumno aplique descargas, fármacos, lavado o marcapasos en su monitor, aparecerán aquí para tu aprobación pedagógica.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(sessionState.pendingStudentInterventions || []).map((prop) => (
                    <div
                      key={prop.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                        prop.status === 'ACCEPTED'
                          ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                          : prop.status === 'REJECTED'
                          ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                          : 'bg-[#181d25] border-amber-600/70 text-neutral-200 shadow-md ring-1 ring-amber-500/30'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              prop.status === 'ACCEPTED'
                                ? 'bg-emerald-500 text-black'
                                : prop.status === 'REJECTED'
                                ? 'bg-rose-500 text-white'
                                : 'bg-amber-500 text-black animate-pulse'
                            }`}
                          >
                            {prop.status === 'PENDING' ? '⏳ PENDIENTE DECISIÓN' : prop.status === 'ACCEPTED' ? '✓ ACEPTADA' : '✗ RECHAZADA'}
                          </span>
                          <span className="font-bold text-xs text-white">{prop.title}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">({prop.timestamp})</span>
                        </div>
                        <p className="text-xs text-neutral-300 font-sans">{prop.details}</p>
                      </div>

                      {prop.status === 'PENDING' ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleDecideStudentIntervention(prop.id, 'ACCEPTED')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow"
                            title="Aceptar intervención y generar respuesta favorable en signos y ritmo"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Aceptar (+ Favorable)</span>
                          </button>
                          <button
                            onClick={() => handleDecideStudentIntervention(prop.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-mono text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border border-rose-700"
                            title="Rechazar intervención / Simular complicación o persistencia del cuadro crítico"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Rechazar (Adverso)</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono font-bold shrink-0 opacity-80">
                          {prop.status === 'ACCEPTED' ? 'Respuesta Favorable Aplicada' : 'Sin Respuesta / Adverso'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: SAMPLER / XABCDE / 5H & 5T WITH VISIBILITY SWITCHES
        ======================================================== */}
        {activeTab === 'sampler' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Historial Clínico Estructurado (SAMPLER / XABCDE / 5H y 5T)
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Usa los interruptores de visibilidad para permitir o restringir la visualización al alumno.
                </p>
              </div>
              <button
                onClick={() => onOpenSampleModal(currentScenario)}
                className="px-3 py-1.5 bg-sky-950 hover:bg-sky-900 border border-sky-700 text-sky-200 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Editar Ficha Completa</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SAMPLE Card */}
              <div className="bg-[#161a20] p-4 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-400 font-mono uppercase">FORMATO SAMPLER</span>
                  <span className="text-[10px] text-neutral-500 font-mono">Anamnesis</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">S - SIGNOS Y SÍNTOMAS:</strong>
                    <p className="text-neutral-200">{currentScenario.sample.signosSintomas}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">A - ALERGIAS:</strong>
                    <p className="text-neutral-200">{currentScenario.sample.alergias}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">M - MEDICAMENTOS HABITUALES:</strong>
                    <p className="text-neutral-200">{currentScenario.sample.medicamentos}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">P - PATOLOGÍAS PREVIAS:</strong>
                    <p className="text-neutral-200">{currentScenario.sample.patologiasPrevias}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">L - LUNCH / ÚLTIMA INGESTA:</strong>
                    <p className="text-neutral-200">{currentScenario.sample.lunchUltimaIngesta}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">E - EVENTOS DESENCADENANTES:</strong>
                    <p className="text-neutral-200">{currentScenario.sample.eventosDesencadenantes}</p>
                  </div>
                </div>
              </div>

              {/* XABCDE Card */}
              <div className="bg-[#161a20] p-4 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-400 font-mono uppercase">VALORACIÓN PRIMARIA XABCDE</span>
                  <span className="text-[10px] text-neutral-500 font-mono">Trauma & Reanimación</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">X - EXANGUINANTE:</strong>
                    <p className="text-neutral-200">{currentScenario.xabcde.exsanguinatingHemorrhage}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">A - VÍA AÉREA:</strong>
                    <p className="text-neutral-200">{currentScenario.xabcde.airway}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">B - VENTILACIÓN:</strong>
                    <p className="text-neutral-200">{currentScenario.xabcde.breathing}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">C - CIRCULACIÓN:</strong>
                    <p className="text-neutral-200">{currentScenario.xabcde.circulation}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">D - DÉFICIT NEUROLÓGICO:</strong>
                    <p className="text-neutral-200">{currentScenario.xabcde.disability}</p>
                  </div>
                  <div>
                    <strong className="text-neutral-400 block font-mono text-[10px]">E - EXPOSICIÓN:</strong>
                    <p className="text-neutral-200">{currentScenario.xabcde.exposure}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: CHRONOLOGICAL DEBRIEFING, ANALYTICS & EXPORT
        ======================================================== */}
        {activeTab === 'debriefing' && (
          <div className="space-y-4">
            {/* Action Bar: Refresh, Filter, Export */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-neutral-800 gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshDebrief}
                  className="px-3 py-1.5 bg-[#20252e] hover:bg-[#2c333e] text-neutral-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border border-neutral-700 cursor-pointer shadow-sm transition-all"
                  title="Refrescar lista en tiempo real"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${refreshAnimation ? 'animate-spin' : ''}`} />
                  <span>ACTUALIZAR LISTA</span>
                </button>

                {/* Filter tags */}
                <div className="flex items-center gap-1 bg-[#101216] border border-neutral-800 p-0.5 rounded-lg text-[10px] font-mono">
                  {['ALL', 'SHOCK', 'DRUG', 'AIRWAY', 'RHYTHM', 'COMPLICATION'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setDebriefFilter(f)}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        debriefFilter === f ? 'bg-amber-600 text-black font-bold' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportText}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold rounded-lg border border-neutral-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Exportar informe de simulación en formato texto TXT para expediente"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Exportar TXT</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold rounded-lg border border-neutral-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Exportar todos los datos en formato JSON estructurado"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exportar JSON</span>
                </button>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#161a20] p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-mono">TIEMPO TRANSCURRIDO</span>
                <span className="text-xl font-bold font-lcd text-amber-400 mt-0.5 block">
                  {formatTimer(sessionState.scenarioElapsedSeconds)}
                </span>
              </div>
              <div className="bg-[#161a20] p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-mono">TOTAL DESCARGAS</span>
                <span className="text-xl font-bold font-lcd text-rose-400 mt-0.5 block">
                  {sessionState.defib.totalShocksDelivered} choques
                </span>
              </div>
              <div className="bg-[#161a20] p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-mono">EVENTOS REGISTRADOS</span>
                <span className="text-xl font-bold font-lcd text-sky-400 mt-0.5 block">
                  {sessionState.log.length} acciones
                </span>
              </div>
              <div className="bg-[#161a20] p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-mono">ADHERENCIA ILCOR 2025</span>
                <span className="text-xl font-bold font-lcd text-emerald-400 mt-0.5 block">
                  {calculateScore()} %
                </span>
              </div>
            </div>

            {/* Split: Chronological Timeline on Left, Notes on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Chronological Event Timeline */}
              <div className="lg:col-span-7 bg-[#14181e] p-3.5 rounded-xl border border-neutral-800 space-y-2 max-h-[320px] overflow-y-auto">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider block mb-2">
                  LÍNEA DE TIEMPO AUTOMÁTICA DE ACCIONES Y FARMACOLOGÍA:
                </span>

                {filteredLog.length === 0 ? (
                  <div className="text-neutral-500 text-xs py-8 text-center">
                    No hay eventos registrados bajo el filtro seleccionado.
                  </div>
                ) : (
                  filteredLog.map((event) => (
                    <div
                      key={event.id}
                      className="p-2.5 bg-[#101216] border border-neutral-800/80 rounded-lg flex items-start gap-2.5 text-xs transition-colors hover:border-neutral-700"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-black/60 font-mono text-[10px] text-amber-400 font-bold shrink-0 border border-neutral-800">
                        {formatTimer(event.elapsedSeconds)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                              event.type === 'SHOCK'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : event.type === 'DRUG'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : event.type === 'AIRWAY'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : event.type === 'RHYTHM_CHANGE'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {event.type}
                          </span>
                          <span className="text-white font-bold">{event.description}</span>
                        </div>
                        {event.details && (
                          <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">{event.details}</div>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500 shrink-0">{event.time}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Right: Instructor Pedagogy Notes & Checklist Summary */}
              <div className="lg:col-span-5 bg-[#14181e] p-3.5 rounded-xl border border-neutral-800 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider block mb-1">
                    NOTAS PEDAGÓGICAS DEL INSTRUCTOR (DEBRIEFING):
                  </span>
                  <p className="text-[11px] text-neutral-400 mb-2">
                    Escribe observaciones sobre liderazgo, comunicación en bucle cerrado (CRM) y técnica.
                  </p>
                  <textarea
                    rows={5}
                    value={debriefNotesText}
                    onChange={(e) => {
                      setDebriefNotesText(e.target.value);
                      onUpdateSession({ debriefNotes: e.target.value });
                    }}
                    placeholder="Ejemplo: Excelente reconocimiento de la FV. Se recomienda acortar el tiempo entre carga y descarga a menos de 5 segundos..."
                    className="w-full bg-[#101216] border border-neutral-700 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                {/* Checklist Adherence Summary */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-800 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                    <span>Adherencia ILCOR 2025:</span>
                    <strong className="text-emerald-400">{calculateScore()}% completado</strong>
                  </div>
                  <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${calculateScore()}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
