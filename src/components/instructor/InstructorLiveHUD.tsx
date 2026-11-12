/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { SimSessionState, ClinicalScenario } from '../../types/medical';
import { cardiologyEngine, CardiologyEngine } from '../../utils/cardiologyEngine';
import { simSync, ActivePeer } from '../../utils/syncManager';
import {
  Activity,
  Tv,
  FileText,
  Sparkles,
  Flame,
  AlertTriangle,
  Radio,
  Zap,
  QrCode,
  Users,
  Eye,
  CheckCircle,
  Heart,
} from 'lucide-react';

interface InstructorLiveHUDProps {
  sessionState: SimSessionState;
  currentScenario: ClinicalScenario;
  onUpdateSession: (partial: Partial<SimSessionState>) => void;
  onOpenQrModal?: () => void;
  onOpenSampleModal?: () => void;
  onEvolvePatient: (direction: 'IMPROVE' | 'WORSEN' | 'ROSC' | 'PEA' | 'ASYSTOLE' | 'INSTABILITY') => void;
}

export const InstructorLiveHUD: React.FC<InstructorLiveHUDProps> = ({
  sessionState,
  currentScenario,
  onUpdateSession,
  onOpenQrModal,
  onOpenSampleModal,
  onEvolvePatient,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudEngineRef = useRef<CardiologyEngine>(new CardiologyEngine());
  const [activePeers, setActivePeers] = useState<ActivePeer[]>([]);

  const { vitals, defib, pacer, currentRhythm, selectedLead } = sessionState;

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

  // Active alarm evaluations
  const isSpO2Alarm = vitals.spO2 > 0 && vitals.spO2 < 90;
  const isEtCO2Alarm = !isArrest && displayedEtCO2 > 0 && (displayedEtCO2 < 30 || displayedEtCO2 > 45);
  const isBpAlarm =
    vitals.systolicBP > 0 &&
    (vitals.systolicBP < 90 || (vitals.meanArterialPressure > 0 && vitals.meanArterialPressure < 65) || vitals.systolicBP > 180);
  const isHrAlarm = !isArrest && vitals.heartRate > 0 && (vitals.heartRate < 50 || vitals.heartRate > 130);
  const hasAnyAlarm = isSpO2Alarm || isEtCO2Alarm || isBpAlarm || isHrAlarm || isArrest;

  // Track connected peers in real time
  useEffect(() => {
    const unsub = simSync.onPeersChange((peers) => {
      setActivePeers(peers);
    });
    return () => unsub();
  }, []);

  // 60 FPS live oscilloscope preview for the instructor (DART Sim Pro style)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let sweepX = 0;
    const sweepSpeed = 1.35; // px per tick
    const eraseBarWidth = 14;

    // Buffer previous points
    let prevEcgY = 0;
    let prevPlethY = 0;
    let prevCapnoY = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Vertical divisions:
      // Channel 1 (ECG): 0 to height * 0.46
      // Channel 2 (SpO2 Pleth): height * 0.46 to height * 0.73
      // Channel 3 (EtCO2 Capno): height * 0.73 to height
      const ecgMid = height * 0.23;
      const ecgScale = height * 0.17;

      const plethBottom = height * 0.70;
      const plethScale = height * 0.20;

      const capnoBottom = height * 0.96;
      const capnoScale = height * 0.20;

      // 1. Erase sweep ahead bar
      ctx.fillStyle = '#020704';
      ctx.fillRect(sweepX, 0, eraseBarWidth, height);

      // Subtle phosphor decay trail
      ctx.fillStyle = 'rgba(2, 7, 4, 0.08)';
      ctx.fillRect(0, 0, width, height);

      // 2. Generate sample from dedicated clinical cardiology engine instance
      const sample = hudEngineRef.current.getNextSample(
        currentRhythm,
        selectedLead || 'II',
        sessionState.gain || 1.0,
        vitals.heartRate,
        vitals.respRate,
        displayedEtCO2,
        vitals.spO2,
        pacer.isActive,
        pacer.rate,
        pacer.outputCurrent,
        pacer.captureThreshold,
        sessionState.isCPRActive,
        vitals.systolicBP,
        vitals.diastolicBP,
        currentScenario.capnographyPattern,
        sessionState.cprQualityMode,
        sessionState.airwayManagementMode
      );

      // Transform sample to canvas coordinates
      const currentEcgY = ecgMid - sample.ecgVoltage * ecgScale * sessionState.gain;
      const currentPlethY = plethBottom - sample.plethVoltage * plethScale;
      const currentCapnoY = capnoBottom - (sample.co2Voltage / 50) * capnoScale;

      const nextX = (sweepX + sweepSpeed) % width;

      // Avoid drawing wrap-around line
      if (nextX > sweepX) {
        // --- CHANNEL 1: ECG (Emerald Green) ---
        ctx.beginPath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.moveTo(sweepX, prevEcgY || ecgMid);
        ctx.lineTo(nextX, currentEcgY);
        ctx.stroke();

        // Pacer spike indicator
        if (sample.hasPacerSpike) {
          ctx.beginPath();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.moveTo(nextX, currentEcgY - 14);
          ctx.lineTo(nextX, currentEcgY + 14);
          ctx.stroke();
        }

        // --- CHANNEL 2: SpO2 PLETH (Cyan / Sky) ---
        if (vitals.spO2 > 0) {
          ctx.beginPath();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.2;
          ctx.moveTo(sweepX, prevPlethY || plethBottom);
          ctx.lineTo(nextX, currentPlethY);
          ctx.stroke();
        }

        // --- CHANNEL 3: EtCO2 CAPNO (Amber) ---
        if (vitals.etCO2 > 0) {
          ctx.beginPath();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.2;
          ctx.moveTo(sweepX, prevCapnoY || capnoBottom);
          ctx.lineTo(nextX, currentCapnoY);
          ctx.stroke();
        }
      }

      prevEcgY = currentEcgY;
      prevPlethY = currentPlethY;
      prevCapnoY = currentCapnoY;
      sweepX = nextX;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentRhythm, vitals, sessionState.gain, pacer, sessionState.isCPRActive, currentScenario.capnographyPattern]);

  const studentPeers = activePeers.filter((p) => p.role === 'student');

  return (
    <div className="bg-[#0b0e12] border-b border-neutral-800 p-3 flex flex-col gap-2.5">
      {/* 1. TOP STATUS BAR: Peer count + Quick Projections + Rapid Evolution */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Live Connection & Peer Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {studentPeers.length > 0
                ? `${studentPeers.length} Alumno${studentPeers.length > 1 ? 's' : ''} en línea`
                : '1 Monitor local conectado'}
            </span>
          </div>

          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-lg flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
              title="Abrir código QR para conectar alumnos con celular o tablet"
            >
              <QrCode className="w-3 h-3 text-amber-400" />
              <span>Conectar Alumnos</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-neutral-400">
            <span>Sala:</span>
            <strong className="text-amber-400">#{sessionState.roomId}</strong>
          </div>
        </div>

        {/* Right: Rapid Action Buttons (12-Lead Projection, SAMPLE Projection, ROSC, FV) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Toggle 12-Lead Diagnostic ECG Projection */}
          <button
            onClick={() => {
              const nextState = !sessionState.is12LeadProjected;
              onUpdateSession({
                is12LeadProjected: nextState,
                log: [
                  {
                    id: `proj12-${Date.now()}`,
                    time: new Date().toLocaleTimeString(),
                    elapsedSeconds: sessionState.scenarioElapsedSeconds,
                    type: 'PROJECTION',
                    description: nextState
                      ? 'Facilitador PROYECTÓ Electrocardiograma de 12 Derivaciones al monitor del alumno'
                      : 'Facilitador cerró proyección de 12 derivaciones',
                  },
                  ...sessionState.log,
                ],
              });
            }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
              sessionState.is12LeadProjected
                ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse'
                : 'bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border-emerald-800/80'
            }`}
            title="Proyectar o cerrar trazo de 12 derivaciones de diagnóstico médico en el monitor del alumno"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{sessionState.is12LeadProjected ? '12 DERIVACIONES EN PANTALLA' : 'PROYECTAR 12 DERIV.'}</span>
          </button>

          {/* Toggle SAMPLE History Projection */}
          <button
            onClick={() => {
              const nextState = !sessionState.isProjectedToStudent;
              onUpdateSession({
                isProjectedToStudent: nextState,
                log: [
                  {
                    id: `projsample-${Date.now()}`,
                    time: new Date().toLocaleTimeString(),
                    elapsedSeconds: sessionState.scenarioElapsedSeconds,
                    type: 'PROJECTION',
                    description: nextState
                      ? 'Facilitador PROYECTÓ ficha clínica SAMPLE/XABCDE al alumno'
                      : 'Facilitador retiró la ficha proyectada',
                  },
                  ...sessionState.log,
                ],
              });
            }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
              sessionState.isProjectedToStudent
                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.7)] animate-pulse'
                : 'bg-neutral-900 hover:bg-neutral-800 text-amber-300 border-amber-800/80'
            }`}
            title="Proyectar la historia clínica SAMPLE y evaluación XABCDE en el monitor del estudiante"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{sessionState.isProjectedToStudent ? 'FICHA SAMPLE PROYECTADA' : 'PROYECTAR SAMPLE'}</span>
          </button>

          {/* Quick ROSC */}
          <button
            onClick={() => onEvolvePatient('ROSC')}
            className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 font-mono text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
            title="Retorno de Circulación Espontánea (ROSC)"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>ROSC</span>
          </button>

          {/* Quick Sudden Deterioration */}
          <button
            onClick={() => onEvolvePatient('WORSEN')}
            className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 font-mono text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
            title="Deteriorar a FV y colapso circulatorio"
          >
            <Flame className="w-3 h-3 text-rose-400" />
            <span>FV Paro</span>
          </button>

          {/* Quick CPR Compression Toggle */}
          <button
            onClick={() => {
              const next = !sessionState.isCPRActive;
              onUpdateSession({
                isCPRActive: next,
                log: [
                  {
                    id: `hud-cpr-${Date.now()}`,
                    time: new Date().toLocaleTimeString(),
                    elapsedSeconds: sessionState.scenarioElapsedSeconds,
                    type: next ? 'CPR_START' : 'CPR_STOP',
                    description: next
                      ? 'RCP Iniciada: Artefacto de compresión torácica en ECG y elevación de PetCO2 a 18 mmHg'
                      : 'RCP Detenida: Pausa para análisis de ritmo',
                  },
                  ...sessionState.log,
                ],
              });
            }}
            className={`px-2 py-1 border font-mono text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
              sessionState.isCPRActive
                ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.8)] animate-pulse'
                : 'bg-neutral-900 hover:bg-neutral-800 text-rose-300 border-rose-800/80'
            }`}
            title="Activar o pausar compresiones de RCP (simula artefacto en ECG y elevación de PetCO2)"
          >
            <Heart className="w-3 h-3 text-rose-400" />
            <span>{sessionState.isCPRActive ? 'RCP ACTIVA' : 'RCP'}</span>
          </button>
        </div>
      </div>

      {/* 2. LIVE TELEMETRY OSCILLOSCOPE STRIP (DART SIM PRO STYLE) */}
      <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-[#020704] flex flex-col md:flex-row items-stretch">
        {/* Left: Mini Oscilloscope Waveform Canvas */}
        <div className="relative flex-1 h-28 bg-[#020704]">
          <canvas
            ref={canvasRef}
            width={720}
            height={112}
            className="w-full h-full block"
          />

          {/* Oscilloscope Lead Label Overlays */}
          <div className="absolute top-1 left-2 pointer-events-none flex items-center gap-2 font-mono text-[10px]">
            <span className="text-emerald-400 font-bold bg-black/60 px-1 py-0.5 rounded">
              II ({selectedLead}) · x{sessionState.gain}
            </span>
            <span className="text-neutral-500">|</span>
            <span className="text-sky-400 font-bold bg-black/60 px-1 py-0.5 rounded">
              PLETISMO SpO2
            </span>
            <span className="text-neutral-500">|</span>
            <span className="text-amber-400 font-bold bg-black/60 px-1 py-0.5 rounded">
              CAPNO EtCO2
            </span>
          </div>

          {/* Hardware Defibrillator Student Status Badge */}
          <div className="absolute bottom-1 left-2 pointer-events-none flex items-center gap-2 font-mono text-[10px]">
            <span className="bg-black/80 border border-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded font-bold">
              DIAL: <strong className="text-white">{sessionState.dialMode}</strong>
            </span>
            {defib.isCharging && (
              <span className="bg-amber-950 border border-amber-500 text-amber-300 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                CARGANDO {defib.selectedEnergy}J ({defib.chargeProgress}%)
              </span>
            )}
            {defib.isCharged && (
              <span className="bg-rose-950 border border-rose-500 text-white px-1.5 py-0.5 rounded font-bold animate-ping flex items-center gap-1">
                <Zap className="w-3 h-3 text-rose-400" />
                ¡CARGADO {defib.selectedEnergy}J LISTO!
              </span>
            )}
            {defib.isSyncMode && (
              <span className="bg-sky-950 border border-sky-500 text-sky-300 px-1.5 py-0.5 rounded font-bold">
                SYNC ON
              </span>
            )}
            {pacer.isActive && (
              <span className={`px-1.5 py-0.5 rounded font-bold border ${
                pacer.outputCurrent >= pacer.captureThreshold
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : 'bg-amber-950 text-amber-300 border-amber-600'
              }`}>
                PACER: {pacer.rate} PPM / {pacer.outputCurrent} mA {pacer.outputCurrent >= pacer.captureThreshold ? '(CAPTURA)' : '(SUB-UMBRAL)'}
              </span>
            )}
          </div>
        </div>

        {/* Right: Live Vitals HUD Numbers Strip */}
        <div className="w-full md:w-80 bg-[#0d1117] border-t md:border-t-0 md:border-l border-neutral-800 p-2 grid grid-cols-4 gap-1.5 font-mono text-center">
          {/* FC */}
          <div
            className={`p-1 rounded flex flex-col justify-center border transition-all ${
              isHrAlarm
                ? 'bg-rose-950/70 border-rose-500 shadow-sm animate-pulse'
                : 'bg-neutral-900/80 border-emerald-950/60'
            }`}
          >
            <span className={`text-[9px] font-bold ${isHrAlarm ? 'text-rose-400' : 'text-emerald-400'}`}>
              FC {isHrAlarm ? '⚠️' : ''}
            </span>
            <span
              className={`text-base font-lcd font-bold ${
                isHrAlarm ? 'text-rose-200' : 'text-emerald-400'
              }`}
            >
              {vitals.heartRate > 0 ? vitals.heartRate : '--'}
            </span>
            <span className="text-[8px] text-neutral-500">lpm</span>
          </div>

          {/* SpO2 */}
          <div
            className={`p-1 rounded flex flex-col justify-center border transition-all ${
              isSpO2Alarm
                ? 'bg-rose-950/80 border-rose-500 shadow-sm ring-1 ring-rose-500 animate-pulse'
                : 'bg-neutral-900/80 border-sky-950/60'
            }`}
          >
            <div className="flex items-center justify-center gap-0.5">
              <span className={`text-[9px] font-bold ${isSpO2Alarm ? 'text-rose-400' : 'text-sky-400'}`}>
                SpO2
              </span>
              {isSpO2Alarm && <span className="text-[8px] text-rose-300 font-bold">&lt;90%</span>}
            </div>
            <span
              className={`text-base font-lcd font-bold ${
                isSpO2Alarm ? 'text-rose-200' : 'text-sky-400'
              }`}
            >
              {isArrest
                ? sessionState.isCPRActive ? 'RCP' : '--'
                : vitals.spO2 > 0 ? `${vitals.spO2}%` : '--'}
            </span>
            <span className="text-[8px] text-neutral-500">
              {isSpO2Alarm ? '¡DESATURACIÓN!' : isArrest && sessionState.isCPRActive ? 'Compresión' : 'Pletism'}
            </span>
          </div>

          {/* EtCO2 */}
          <div
            className={`p-1 rounded flex flex-col justify-center border transition-all ${
              isEtCO2Alarm
                ? 'bg-amber-950/80 border-amber-500 shadow-sm animate-pulse'
                : 'bg-neutral-900/80 border-amber-950/60'
            }`}
          >
            <span className={`text-[9px] font-bold ${isEtCO2Alarm ? 'text-amber-300' : 'text-amber-400'}`}>
              EtCO2 {isEtCO2Alarm ? '⚠️' : ''}
            </span>
            <span
              className={`text-base font-lcd font-bold ${
                isEtCO2Alarm ? 'text-amber-200' : 'text-amber-400'
              }`}
            >
              {displayedEtCO2 > 0 ? displayedEtCO2 : '--'}
            </span>
            <span className="text-[8px] text-neutral-500">
              {sessionState.isCPRActive && isArrest ? 'RCP: 18 mmHg' : 'mmHg'}
            </span>
          </div>

          {/* TA / NIBP */}
          <div
            className={`p-1 rounded flex flex-col justify-center border transition-all ${
              isBpAlarm
                ? 'bg-rose-950/70 border-rose-500 shadow-sm animate-pulse'
                : 'bg-neutral-900/80 border-neutral-700/60'
            }`}
          >
            <span className={`text-[9px] font-bold ${isBpAlarm ? 'text-rose-400' : 'text-slate-300'}`}>
              PA {isBpAlarm ? '⚠️' : ''}
            </span>
            <span
              className={`text-xs font-lcd font-bold ${
                isBpAlarm ? 'text-rose-200' : 'text-white'
              }`}
            >
              {vitals.systolicBP > 0 ? `${vitals.systolicBP}/${vitals.diastolicBP}` : '--/--'}
            </span>
            <span className="text-[8px] text-neutral-400">
              PAM: {vitals.meanArterialPressure > 0 ? vitals.meanArterialPressure : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
