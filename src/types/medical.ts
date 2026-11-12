/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CardiacRhythmType =
  | 'NSR' // Ritmo Sinusal Normal
  | 'SINUS_BRADY' // Bradicardia Sinusal Severa
  | 'SINUS_TACHY' // Taquicardia Sinusal
  | 'AFIB_RVR' // Fibrilación Auricular con RVR
  | 'SVT' // Taquicardia Supraventricular Paroxística
  | 'VF_COARSE' // Fibrilación Ventricular Gruesa (Shockable)
  | 'VF_FINE' // Fibrilación Ventricular Fina (Shockable)
  | 'VT_PULSELESS' // Taquicardia Ventricular Sin Pulso (Shockable)
  | 'VT_WITH_PULSE' // Taquicardia Ventricular Monomórfica con Pulso
  | 'TORSADES' // Torsades de Pointes / TV Polimórfica (Shockable)
  | 'ASYSTOLE' // Asistolia Ventricular (Non-shockable)
  | 'PEA' // Actividad Eléctrica Sin Pulso (Non-shockable)
  | 'ROSC' // Retorno de Circulación Espontánea
  | 'AV_BLOCK_3RD' // Bloqueo Auriculoventricular Completo (3er Grado)
  | 'STEMI_ANTERIOR' // IAMCEST Anterior (V1-V4)
  | 'STEMI_INFERIOR' // IAMCEST Inferior (II, III, aVF)
  | 'ISCHEMIA'; // Isquemia subendocárdica / Depresión ST

export type ECGLead =
  | 'I'
  | 'II'
  | 'III'
  | 'aVR'
  | 'aVL'
  | 'aVF'
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'PADDLES';

export type MonitorDialMode = 'OFF' | 'MONITOR' | 'DEFIB' | 'PACER';

export interface VitalSigns {
  heartRate: number; // lpm
  spO2: number; // %
  respRate: number; // rpm
  etCO2: number; // mmHg (PETCO2)
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  meanArterialPressure: number; // mmHg
  temperature: number; // °C
  perfusionIndex: number; // 0.1 - 20%
  glucose: number; // mg/dL (glucemia capilar)
  gcs?: number; // Escala de Coma de Glasgow (3 - 15)
}

export interface StudentProposedIntervention {
  id: string;
  type: 'DEFIB_SHOCK' | 'CARDIOVERSION_SYNC' | 'MEDICATION' | 'PACER_ACTIVATION' | 'AIRWAY' | 'CPR_CYCLE' | 'FLUID_BOLUS';
  title: string;
  details: string;
  timestamp: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  proposedRhythm?: CardiacRhythmType;
  proposedVitals?: Partial<VitalSigns>;
}

export interface DefibrillatorState {
  selectedEnergy: number; // Joules (5 a 360J)
  isCharging: boolean;
  chargeProgress: number; // 0 - 100%
  isCharged: boolean;
  isSyncMode: boolean; // Synchronized Cardioversion
  interfaceMode: 'PADDLES' | 'PATCHES'; // Palas rígidas vs Parches manos libres
  isAnalyzing: boolean; // AED rhythm analysis
  analysisResult: 'NONE' | 'SHOCK_ADVISED' | 'NO_SHOCK_ADVISED';
  totalShocksDelivered: number;
  lastShockJoules: number | null;
  lastShockTime: string | null;
}

export interface PacemakerState {
  isActive: boolean;
  rate: number; // ppm (30 - 180)
  outputCurrent: number; // mA (0 - 140)
  captureThreshold: number; // mA threshold for electrical capture (e.g. 60 mA)
  isCapturing: boolean;
  isFourToOne: boolean; // 4:1 diagnostic test button
}

export type AirwayType =
  | 'SPONTANEOUS' // Ventilación Espontánea / Ambiente
  | 'NASAL_CANNULA' // Cánula Nasal 2-4 L/min
  | 'NON_REBREATHER' // Mascarilla con Reservorio 15 L/min
  | 'OPA' // Cánula Orofaríngea (Guedel)
  | 'SUPRAGLOTTIC' // i-gel / Mascarilla Laríngea
  | 'ETT'; // Tubo Endotraqueal con balón

export type VascularAccessType = 'NONE' | 'IV_PERIPHERAL' | 'IO_HUMERAL' | 'IO_TIBIAL';

export interface AdministeredMedication {
  id: string;
  name: string;
  dose: string;
  route: string;
  timestamp: string;
  notes?: string;
}

export interface SampleHistory {
  signosSintomas: string;
  alergias: string;
  medicamentos: string;
  patologiasPrevias: string;
  lunchUltimaIngesta: string;
  eventosDesencadenantes: string;
}

export interface XabcdeAssessment {
  exsanguinatingHemorrhage: string; // X: Hemorragias masivas exanguinantes
  airway: string; // A: Vía aérea, patencia, columna cervical, secreciones
  breathing: string; // B: Ventilación, auscultación 4 campos, FR, SpO2, EtCO2
  circulation: string; // C: Pulsos centrales/periféricos, llenado capilar, PA, PAM, piel, accesos
  disability: string; // D: Glasgow (E, V, M), pupilas (mm, simetría, fotorreactividad), glucemia
  exposure: string; // E: Exposición, temperatura central, prevención hipotermia, estigmas
}

export interface ReversibleCauseItem {
  name: string;
  present: boolean;
  clinicalSigns: string;
  intervention: string;
}

export interface ScenarioReversibleCauses {
  hList: ReversibleCauseItem[]; // 5 Hs: Hipovolemia, Hipoxia, H+ (Acidosis), Hipo/Hiperpotasemia, Hipotermia
  tList: ReversibleCauseItem[]; // 5 Ts: Neumotórax a tensión, Taponamiento, Tóxicos, TEP, Trombosis coronaria
}

export interface EvaluationItem {
  id: string;
  category: 'Seguridad' | 'Evaluación' | 'RCP' | 'Desfibrilación' | 'Farmacología' | 'Vía Aérea' | 'Post-Paro';
  description: string;
  done: boolean;
  points: number;
}

export interface ClinicalScenario {
  id: string;
  title: string;
  category: 'AHA_ACLS' | 'PALS' | 'TRAUMA' | 'CARDIOLOGY';
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  summary: string;
  chiefComplaint: string;
  sample: SampleHistory;
  xabcde: XabcdeAssessment;
  reversibleCauses: ScenarioReversibleCauses;
  patientAge: number;
  patientGender: 'Masculino' | 'Femenino';
  patientWeightKg: number;
  initialRhythm: CardiacRhythmType;
  initialVitals: VitalSigns;
  suggestedAction: string;
  criticalPoints: string[];
  ilcorChecklist: EvaluationItem[];
  capnographyPattern: 'NORMAL' | 'OBSTRUCTIVE_SHARK_FIN' | 'LOW_CARDIAC_OUTPUT' | 'CPR_PASSIVE' | 'ROSC_SURGE';
  physiologicalNotes: string;
}

export interface SimulationLogEvent {
  id: string;
  time: string;
  elapsedSeconds: number;
  type:
    | 'SHOCK'
    | 'CHARGE'
    | 'DRUG'
    | 'AIRWAY'
    | 'PACER'
    | 'RHYTHM_CHANGE'
    | 'CPR_START'
    | 'CPR_STOP'
    | 'NIBP'
    | 'PROJECTION'
    | 'VITAL_CHANGE'
    | 'INTERVENTION'
    | 'COMPLICATION'
    | 'VALSALVA'
    | 'STUDENT_ACTION';
  description: string;
  details?: string;
}

export interface StudentActionLog {
  action: 'SHOCK' | 'CHARGE' | 'PACER_ON' | 'PACER_OFF' | 'PACER_RATE' | 'PACER_MA' | 'SYNC_TOGGLE' | 'DIAL_CHANGE' | 'DRUG';
  timestamp: string;
  details: string;
}

export interface AlarmLimits {
  spo2Low: number; // default 90% (AHA/ERC hypoxemia threshold)
  etco2Low: number; // default 30 mmHg (hypocapnia/shock)
  etco2High: number; // default 45 mmHg (hypercapnia/hypoventilation)
  systolicLow: number; // default 90 mmHg (hypotension)
  systolicHigh: number; // default 180 mmHg (hypertension crisis)
  diastolicHigh: number; // default 110 mmHg
  mapLow: number; // default 65 mmHg (organ hypoperfusion)
  hrLow: number; // default 50 bpm (bradycardia)
  hrHigh: number; // default 130 bpm (tachycardia)
}

export interface ActiveAlarm {
  id: string;
  parameter: 'SPO2' | 'ETCO2' | 'BP' | 'HR' | 'RHYTHM';
  priority: 'HIGH' | 'MEDIUM';
  title: string;
  message: string;
  value: string;
}

export const DEFAULT_ALARM_LIMITS: AlarmLimits = {
  spo2Low: 90,
  etco2Low: 30,
  etco2High: 45,
  systolicLow: 90,
  systolicHigh: 180,
  diastolicHigh: 110,
  mapLow: 65,
  hrLow: 50,
  hrHigh: 130,
};

export interface SimSessionState {
  roomId: string;
  dialMode: MonitorDialMode;
  currentRhythm: CardiacRhythmType;
  selectedLead: ECGLead;
  gain: number; // 0.5, 1, 1.5, 2, 3
  vitals: VitalSigns;
  defib: DefibrillatorState;
  pacer: PacemakerState;
  airway: AirwayType;
  vascularAccess: VascularAccessType;
  medications: AdministeredMedication[];
  isCPRActive: boolean;
  cprMetronomeEnabled: boolean;
  isNibpMeasuring: boolean;
  activeScenarioId: string;
  isProjectedToStudent: boolean; // El docente proyecta la ficha clínica completa al monitor del alumno
  customScenario?: ClinicalScenario; // Escenario clínico personalizado o modificado por el docente en tiempo real
  customNotes: string;
  debriefNotes?: string; // Notas pedagógicas del instructor para el debriefing
  simulationMode?: 'AUTO' | 'MANUAL'; // Modo Automático ILCOR 2025 vs Modo Manual
  complicationActive?: string | null; // Complicación estocástica activa
  visibleSections?: { sample: boolean; xabcde: boolean; causes: boolean; vitals: boolean };
  teamRole?: string; // Rol de Crisis Resource Management (CRM)
  log: SimulationLogEvent[];
  scenarioElapsedSeconds: number;
  timeSinceLastAdrenaline: number | null; // segundos desde última adrenalina
  isMuted: boolean;
  evaluations: EvaluationItem[];
  is12LeadProjected?: boolean; // Proyección forzada de las 12 derivaciones diagnósticas al monitor
  studentLastAction?: StudentActionLog;
  alarmLimits?: AlarmLimits;
  isAlarmSilenced?: boolean;
  cprQualityMode?: 'NORMAL' | 'INEFFECTIVE' | 'ROSC_SURGE';
  airwayManagementMode?: 'BVM' | 'ADVANCED_ETT' | 'ESOPHAGEAL_INTUBATION' | 'BRONCHOSPASM' | 'SPONTANEOUS';
  cprCycleSeconds?: number;
  cprIsRhythmCheckPause?: boolean;
  cprPauseSeconds?: number;
  pendingStudentInterventions?: StudentProposedIntervention[];
  isScreenLockedByInstructor?: boolean;
  studentProjectionMode?: 'MONITOR' | 'CASE_SUMMARY' | 'SAMPLER' | 'TWELVE_LEAD' | 'LOCKED';
  selectedAntiarrhythmicType?: 'AMIODARONE' | 'LIDOCAINE';
  customSavedScenarios?: ClinicalScenario[];
}
