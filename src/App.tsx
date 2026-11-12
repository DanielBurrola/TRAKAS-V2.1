/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SimSessionState, ClinicalScenario } from './types/medical';
import { CLINICAL_SCENARIOS, INITIAL_EVALUATION_CHECKLIST, RHYTHM_DEFINITIONS } from './data/clinicalScenarios';
import { simSync } from './utils/syncManager';
import { medicalAudio } from './utils/audioSynthesizer';
import { cardiologyEngine } from './utils/cardiologyEngine';
import { TopNavigation } from './components/common/TopNavigation';
import { RoleSelectionScreen } from './components/common/RoleSelectionScreen';
import { StudentMonitor } from './components/monitor/StudentMonitor';
import { InstructorPanel } from './components/instructor/InstructorPanel';
import { SampleHistoryModal } from './components/instructor/SampleHistoryModal';
import { QrAccessModal } from './components/common/QrAccessModal';

export default function App() {
  // Parse query params for room and role
  const getInitialParams = () => {
    if (typeof window === 'undefined') return { room: 'TRAKAS-3000', role: 'portal' as const };
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room') || 'TRAKAS-3000';
    const roleParam = params.get('role');
    let role: 'portal' | 'student' | 'instructor' | 'split' = 'portal';
    if (roleParam === 'student') role = 'student';
    else if (roleParam === 'instructor') role = 'instructor';
    else if (roleParam === 'split') role = 'split';
    return { room, role };
  };

  const initialParams = getInitialParams();
  const [roomId] = useState<string>(initialParams.room);
  const [currentView, setCurrentView] = useState<'portal' | 'student' | 'instructor' | 'split'>(initialParams.role);

  // Modals state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [activeModalScenario, setActiveModalScenario] = useState<ClinicalScenario>(CLINICAL_SCENARIOS[0]);

  // Main Simulation Session State
  const defaultScenario = CLINICAL_SCENARIOS[0];
  const [sessionState, setSessionState] = useState<SimSessionState>(() => {
    // Try to load saved state from localStorage
    const saved = simSync.loadSavedState();
    if (saved && saved.roomId === initialParams.room) {
      return saved;
    }
    return {
      roomId: initialParams.room,
      dialMode: 'DEFIB',
      currentRhythm: defaultScenario.initialRhythm,
      selectedLead: 'II',
      gain: 1.0,
      vitals: { ...defaultScenario.initialVitals },
      defib: {
        selectedEnergy: 150,
        isCharging: false,
        chargeProgress: 0,
        isCharged: false,
        isSyncMode: false,
        interfaceMode: 'PATCHES',
        isAnalyzing: false,
        analysisResult: 'NONE',
        totalShocksDelivered: 0,
        lastShockJoules: null,
        lastShockTime: null,
      },
      pacer: {
        isActive: false,
        rate: 70,
        outputCurrent: 0,
        captureThreshold: 65,
        isCapturing: false,
        isFourToOne: false,
      },
      airway: 'SPONTANEOUS',
      vascularAccess: 'NONE',
      medications: [],
      isCPRActive: false,
      cprMetronomeEnabled: false,
      isNibpMeasuring: false,
      activeScenarioId: defaultScenario.id,
      customNotes: '',
      log: [
        {
          id: `log-init-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: 0,
          type: 'RHYTHM_CHANGE',
          description: `Inicio del caso clínico: ${defaultScenario.title}`,
          details: `Monitor TRAKAS-3000 listo · Ritmo inicial: ${defaultScenario.initialRhythm}`,
        },
      ],
      scenarioElapsedSeconds: 0,
      timeSinceLastAdrenaline: null,
      isMuted: false,
      isProjectedToStudent: false,
      cprQualityMode: 'NORMAL',
      airwayManagementMode: 'BVM',
      pendingStudentInterventions: [],
      isScreenLockedByInstructor: false,
      studentProjectionMode: 'MONITOR',
      selectedAntiarrhythmicType: 'AMIODARONE',
      evaluations: defaultScenario.ilcorChecklist.map((i) => ({ ...i, done: false })),
    };
  });

  const sessionStateRef = useRef(sessionState);
  sessionStateRef.current = sessionState;

  // Initialize multi-device network room synchronization
  useEffect(() => {
    simSync.initRoom(roomId, currentView);
  }, [roomId, currentView]);

  // Real-time synchronization subscription (BroadcastChannel + LocalStorage + Network)
  useEffect(() => {
    const unsubscribe = simSync.subscribe((msg) => {
      if (msg.type === 'STATE_UPDATE') {
        setSessionState((prev) => ({ ...prev, ...msg.state }));
      } else if (msg.type === 'FULL_STATE_SNAPSHOT') {
        if (currentView === 'student') {
          setSessionState(msg.state);
        }
      } else if (msg.type === 'REQUEST_INITIAL_STATE') {
        if (currentView === 'instructor' || currentView === 'split') {
          simSync.broadcast({
            type: 'FULL_STATE_SNAPSHOT',
            state: sessionStateRef.current,
          });
        }
      } else if (msg.type === 'TRIGGER_DRUG') {
        handleAdministerDrug(msg.drugName, msg.dose, 'IV/IO', false);
      } else if (msg.type === 'RESET_SCENARIO') {
        handleResetScenario(msg.scenarioId, false);
      } else if (msg.type === 'MASTER_RESET') {
        handleMasterReset(false);
      } else if (msg.type === 'PROJECT_12_LEAD') {
        setSessionState((prev) => ({ ...prev, is12LeadProjected: msg.open }));
      } else if (msg.type === 'PROJECT_SAMPLE') {
        setSessionState((prev) => ({ ...prev, isProjectedToStudent: msg.open }));
        if (msg.open) {
          setIsSampleModalOpen(true);
        }
      }
    });

    return () => unsubscribe();
  }, [currentView]);

  // Save session state to localStorage
  useEffect(() => {
    simSync.saveStateLocally(sessionState);
  }, [sessionState]);

  // Scenario elapsed timer and adrenaline timer
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSessionState((prev) => ({
        ...prev,
        scenarioElapsedSeconds: prev.scenarioElapsedSeconds + 1,
        timeSinceLastAdrenaline:
          prev.timeSinceLastAdrenaline !== null
            ? prev.timeSinceLastAdrenaline + 1
            : null,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const updateSession = (partial: Partial<SimSessionState>, shouldBroadcast = true) => {
    setSessionState((prev) => {
      const updated = { ...prev, ...partial };
      if (shouldBroadcast) {
        simSync.broadcast({ type: 'STATE_UPDATE', state: partial });
      }
      return updated;
    });
  };

  const handleAdministerDrug = (
    drugName: string,
    dose: string,
    route: string,
    broadcast = true
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const newMed = {
      id: `med-${Date.now()}`,
      name: drugName,
      dose,
      route,
      timestamp,
    };

    let newTimeSinceAdrenaline = sessionState.timeSinceLastAdrenaline;
    if (drugName.toLowerCase().includes('adrenalina') || drugName.toLowerCase().includes('epinefrina')) {
      newTimeSinceAdrenaline = 0;
    }

    if (drugName.toLowerCase().includes('adenosina')) {
      updateSession({ currentRhythm: 'ASYSTOLE' }, true);
      setTimeout(() => {
        updateSession({ currentRhythm: 'NSR', vitals: { ...sessionStateRef.current.vitals, heartRate: 75 } }, true);
      }, 4000);
    }

    const newLogs = [
      {
        id: `drug-${Date.now()}`,
        time: timestamp,
        elapsedSeconds: sessionState.scenarioElapsedSeconds,
        type: 'DRUG' as const,
        description: `Fármaco administrado: ${drugName} ${dose} (${route})`,
      },
      ...sessionState.log,
    ];

    updateSession(
      {
        medications: [newMed, ...sessionState.medications],
        timeSinceLastAdrenaline: newTimeSinceAdrenaline,
        log: newLogs,
      },
      broadcast
    );
  };

  const handleResetScenario = (scenarioId: string, broadcast = true) => {
    let customList: ClinicalScenario[] = [];
    try {
      const saved = localStorage.getItem('trakas_custom_scenarios');
      if (saved) customList = JSON.parse(saved);
    } catch {}
    const allScenarios = [...CLINICAL_SCENARIOS, ...customList];
    const targetScenario = allScenarios.find((s) => s.id === scenarioId) || CLINICAL_SCENARIOS[0];
    const def = RHYTHM_DEFINITIONS[targetScenario.initialRhythm] || RHYTHM_DEFINITIONS['NSR'];

    const resetState: Partial<SimSessionState> = {
      activeScenarioId: targetScenario.id,
      customScenario: customList.find((c) => c.id === targetScenario.id),
      currentRhythm: targetScenario.initialRhythm,
      vitals: { ...targetScenario.initialVitals },
      airway: 'SPONTANEOUS',
      vascularAccess: 'NONE',
      medications: [],
      isCPRActive: false,
      scenarioElapsedSeconds: 0,
      timeSinceLastAdrenaline: null,
      evaluations: targetScenario.ilcorChecklist.map((i) => ({ ...i, done: false })),
      log: [
        {
          id: `log-reset-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: 0,
          type: 'RHYTHM_CHANGE',
          description: `Escenario activado: ${targetScenario.title}`,
          details: `Ritmo inicial: ${def.name}`,
        },
      ],
    };

    updateSession(resetState, broadcast);
  };

  const handleMasterReset = (broadcast = true) => {
    // 1. Instantly silence and dispose all active audio, metronomes, and tones
    medicalAudio.silence();

    // 2. Reset cardiology engine internal phase and cycle counters to clean 0
    cardiologyEngine.resetEngine();

    // 3. Clear localStorage saved session state
    simSync.clearSavedState();

    // 4. Default clean state corresponding to initial scenario (CLINICAL_SCENARIOS[0])
    const defaultScenario = CLINICAL_SCENARIOS[0];
    const cleanState: SimSessionState = {
      roomId,
      dialMode: 'DEFIB',
      currentRhythm: defaultScenario.initialRhythm,
      selectedLead: 'II',
      gain: 1.0,
      vitals: { ...defaultScenario.initialVitals },
      defib: {
        selectedEnergy: 150,
        isCharging: false,
        chargeProgress: 0,
        isCharged: false,
        isSyncMode: false,
        interfaceMode: 'PATCHES',
        isAnalyzing: false,
        analysisResult: 'NONE',
        totalShocksDelivered: 0,
        lastShockJoules: null,
        lastShockTime: null,
      },
      pacer: {
        isActive: false,
        rate: 70,
        outputCurrent: 0,
        captureThreshold: 65,
        isCapturing: false,
        isFourToOne: false,
      },
      airway: 'SPONTANEOUS',
      vascularAccess: 'NONE',
      medications: [],
      isCPRActive: false,
      cprMetronomeEnabled: false,
      isNibpMeasuring: false,
      activeScenarioId: defaultScenario.id,
      customScenario: undefined,
      customNotes: '',
      log: [
        {
          id: `log-master-reset-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: 0,
          type: 'RHYTHM_CHANGE',
          description: 'REINICIO TOTAL DEL SISTEMA (RESET FÁBRICA)',
          details: `Monitor TRAKAS-3000 restablecido · Escenario: ${defaultScenario.title}`,
        },
      ],
      scenarioElapsedSeconds: 0,
      timeSinceLastAdrenaline: null,
      isMuted: false,
      isProjectedToStudent: false,
      cprQualityMode: 'NORMAL',
      airwayManagementMode: 'BVM',
      pendingStudentInterventions: [],
      isScreenLockedByInstructor: false,
      studentProjectionMode: 'MONITOR',
      selectedAntiarrhythmicType: 'AMIODARONE',
      evaluations: defaultScenario.ilcorChecklist.map((i) => ({ ...i, done: false })),
    };

    setSessionState(cleanState);
    setActiveModalScenario(defaultScenario);

    if (broadcast) {
      simSync.broadcast({ type: 'MASTER_RESET' });
    }
  };

  const handleUpdateScenario = (updated: ClinicalScenario) => {
    setActiveModalScenario(updated);
    updateSession({
      customScenario: updated,
      log: [
        {
          id: `edit-scen-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          elapsedSeconds: sessionState.scenarioElapsedSeconds,
          type: 'PROJECTION',
          description: `Facilitador personalizó la ficha del paciente (${updated.patientAge} años, ${updated.patientGender})`,
        },
        ...sessionState.log,
      ],
    });
  };

  const getActiveScenario = (): ClinicalScenario => {
    if (sessionState.customScenario && sessionState.customScenario.id === sessionState.activeScenarioId) {
      return sessionState.customScenario;
    }
    let customList: ClinicalScenario[] = [];
    try {
      const saved = localStorage.getItem('trakas_custom_scenarios');
      if (saved) customList = JSON.parse(saved);
    } catch {}
    const all = [...CLINICAL_SCENARIOS, ...customList];
    return all.find((s) => s.id === sessionState.activeScenarioId) || CLINICAL_SCENARIOS[0];
  };

  const currentScenario = getActiveScenario();

  return (
    <div className="min-h-screen bg-[#090b0e] text-neutral-100 flex flex-col font-sans">
      {/* If in Portal Mode: Render Welcome Role Choice Screen */}
      {currentView === 'portal' ? (
        <RoleSelectionScreen
          onSelectRole={(role) => setCurrentView(role)}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          roomId={roomId}
        />
      ) : (
        <>
          {/* Top Navigation Bar with TRAKAS-3000 Brand and View Controls */}
          <TopNavigation
            currentView={currentView}
            onChangeView={setCurrentView}
            onOpenQrModal={() => setIsQrModalOpen(true)}
            onOpenSampleModal={() => {
              setActiveModalScenario(currentScenario);
              setIsSampleModalOpen(true);
            }}
            onMasterReset={handleMasterReset}
            roomId={roomId}
          />

          {/* Main Simulation Stage */}
          <main className="flex-1 p-2 sm:p-4 max-w-[1720px] w-full mx-auto flex flex-col gap-4">
            {/* VIEW 1: STUDENT MONITOR (TRAKAS-3000 FULL SCREEN) */}
            {currentView === 'student' && (
              <div className="flex-1 flex flex-col">
                <StudentMonitor
                  sessionState={sessionState}
                  onUpdateSession={updateSession}
                  onOpenSampleModal={() => {
                    setActiveModalScenario(currentScenario);
                    setIsSampleModalOpen(true);
                  }}
                />
              </div>
            )}

            {/* VIEW 2: FACILITATOR / INSTRUCTOR PANEL (FULL SCREEN) */}
            {currentView === 'instructor' && (
              <div className="flex-1 flex flex-col">
                <InstructorPanel
                  sessionState={sessionState}
                  onUpdateSession={updateSession}
                  onOpenSampleModal={(scenario) => {
                    setActiveModalScenario(scenario);
                    setIsSampleModalOpen(true);
                  }}
                  onAdministerDrug={handleAdministerDrug}
                  onResetScenario={handleResetScenario}
                  onMasterReset={handleMasterReset}
                  onOpenQrModal={() => setIsQrModalOpen(true)}
                />
              </div>
            )}

            {/* VIEW 3: SPLIT VIEW (DUAL MONITOR & CONSOLE) */}
            {currentView === 'split' && (
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                <div className="xl:col-span-7 flex flex-col">
                  <StudentMonitor
                    sessionState={sessionState}
                    onUpdateSession={updateSession}
                    onOpenSampleModal={() => {
                      setActiveModalScenario(currentScenario);
                      setIsSampleModalOpen(true);
                    }}
                  />
                </div>

                <div className="xl:col-span-5 flex flex-col">
                  <InstructorPanel
                    sessionState={sessionState}
                    onUpdateSession={updateSession}
                    onOpenSampleModal={(scenario) => {
                      setActiveModalScenario(scenario);
                      setIsSampleModalOpen(true);
                    }}
                    onAdministerDrug={handleAdministerDrug}
                    onResetScenario={handleResetScenario}
                    onMasterReset={handleMasterReset}
                    onOpenQrModal={() => setIsQrModalOpen(true)}
                  />
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* SAMPLE History & Case Details Modal */}
      <SampleHistoryModal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        scenario={activeModalScenario}
        isProjected={sessionState.isProjectedToStudent}
        onToggleProjection={() => {
          const next = !sessionState.isProjectedToStudent;
          updateSession({
            isProjectedToStudent: next,
            log: [
              {
                id: `proj-${Date.now()}`,
                time: new Date().toLocaleTimeString(),
                elapsedSeconds: sessionState.scenarioElapsedSeconds,
                type: 'PROJECTION',
                description: next
                  ? 'Facilitador activó PROYECCIÓN del caso clínico al monitor del alumno'
                  : 'Facilitador desactivó la proyección del caso clínico',
              },
              ...sessionState.log,
            ],
          });
        }}
        onUpdateScenario={handleUpdateScenario}
        isInstructor={currentView === 'instructor' || currentView === 'split'}
      />

      {/* QR Code Instant Student Access Modal */}
      <QrAccessModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        roomId={roomId}
        onStudentJoin={(name, role) => {
          updateSession({
            log: [
              {
                id: `join-${Date.now()}`,
                time: new Date().toLocaleTimeString(),
                elapsedSeconds: sessionState.scenarioElapsedSeconds,
                type: 'RHYTHM_CHANGE',
                description: `Operador conectado: ${name} (${role})`,
              },
              ...sessionState.log,
            ],
          });
        }}
      />
    </div>
  );
}
