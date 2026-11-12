/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { CardiacRhythmType, ECGLead, DefibrillatorState, PacemakerState } from '../../types/medical';
import { cardiologyEngine, WaveformSample } from '../../utils/cardiologyEngine';
import { medicalAudio } from '../../utils/audioSynthesizer';

interface ECGCanvasProps {
  rhythm: CardiacRhythmType;
  lead: ECGLead;
  gain: number;
  heartRate: number;
  respRate: number;
  etCO2: number;
  spO2: number;
  defibState: DefibrillatorState;
  pacerState: PacemakerState;
  isCPRActive: boolean;
  isTwelveLeadMode: boolean;
  systolicBP?: number;
  diastolicBP?: number;
  capnoPattern?: 'NORMAL' | 'OBSTRUCTIVE_SHARK_FIN' | 'LOW_CARDIAC_OUTPUT' | 'CPR_PASSIVE' | 'ROSC_SURGE';
  cprQualityMode?: 'NORMAL' | 'INEFFECTIVE' | 'ROSC_SURGE';
  airwayManagementMode?: 'BVM' | 'ADVANCED_ETT' | 'ESOPHAGEAL_INTUBATION' | 'BRONCHOSPASM' | 'SPONTANEOUS';
  onCloseTwelveLead?: () => void;
  onRWaveDetected?: () => void;
}

export const ECGCanvas: React.FC<ECGCanvasProps> = ({
  rhythm,
  lead,
  gain,
  heartRate,
  respRate,
  etCO2,
  spO2,
  defibState,
  pacerState,
  isCPRActive,
  isTwelveLeadMode,
  systolicBP = 120,
  diastolicBP = 80,
  capnoPattern = 'NORMAL',
  cprQualityMode = 'NORMAL',
  airwayManagementMode = 'SPONTANEOUS',
  onCloseTwelveLead,
  onRWaveDetected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sweep animation state
  const animFrameRef = useRef<number | null>(null);
  const sweepXRef = useRef<number>(0);
  const syncMarkersRef = useRef<{ x: number; y: number }[]>([]);

  // QRS audio throttle
  const lastQrsAudioTime = useRef<number>(0);

  // State for visual R-wave sync blip
  const [isRBlip, setIsRBlip] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const updateCanvasSize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Initial background fill
    const drawGrid = (width: number, height: number) => {
      ctx.fillStyle = '#020603';
      ctx.fillRect(0, 0, width, height);

      // Medical ECG millimeter grid (5mm major, 1mm minor)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.07)';
      const stepMinor = 12;
      for (let x = 0; x < width; x += stepMinor) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += stepMinor) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.16)';
      const stepMajor = stepMinor * 5;
      for (let x = 0; x < width; x += stepMajor) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += stepMajor) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    let prevEcgY = 0;
    let prevPlethY = 0;
    let prevCo2Y = 0;
    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const elapsed = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 800;
      const height = rect?.height || 500;

      // 3 Waveform channel baseline heights with physiological vertical headroom
      const ecgBaseline = height * 0.34;
      const plethBaseline = height * 0.68;
      const co2Baseline = height * 0.94;

      // Speed of sweep: standard medical speed (approx 120 pixels per second)
      const sweepSpeed = 135;
      const dx = sweepSpeed * Math.min(elapsed, 0.05);
      const prevX = sweepXRef.current;
      sweepXRef.current += dx;

      if (sweepXRef.current >= width) {
        sweepXRef.current = 0;
        syncMarkersRef.current = [];
      }

      const currX = sweepXRef.current;
      const eraseWidth = 24;

      // Erase ahead bar (classic medical monitor sweep gap)
      ctx.save();
      ctx.fillStyle = '#020603';
      ctx.fillRect(currX, 0, eraseWidth, height);

      // Redraw grid on erased portion
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.07)';
      const stepMinor = 12;
      const startGridX = Math.floor(currX / stepMinor) * stepMinor;
      for (let x = startGridX; x <= currX + eraseWidth; x += stepMinor) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += stepMinor) {
        ctx.beginPath();
        ctx.moveTo(currX, y);
        ctx.lineTo(currX + eraseWidth, y);
        ctx.stroke();
      }

      // Channel baseline dividers on erased portion
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(currX, height * 0.52);
      ctx.lineTo(currX + eraseWidth, height * 0.52);
      ctx.moveTo(currX, height * 0.77);
      ctx.lineTo(currX + eraseWidth, height * 0.77);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const isArrestRhythm =
        rhythm === 'VF_COARSE' ||
        rhythm === 'VF_FINE' ||
        rhythm === 'VT_PULSELESS' ||
        rhythm === 'ASYSTOLE' ||
        rhythm === 'PEA';

      const effectiveEtCO2 = isArrestRhythm
        ? isCPRActive
          ? 18
          : Math.min(etCO2, 8)
        : etCO2;

      // Sample Cardiology engine (Gaussian physiological morphology)
      const sample: WaveformSample = cardiologyEngine.getNextSample(
        rhythm,
        lead,
        gain,
        heartRate,
        respRate,
        effectiveEtCO2,
        spO2,
        pacerState.isActive,
        pacerState.rate,
        pacerState.outputCurrent,
        pacerState.captureThreshold,
        isCPRActive,
        systolicBP,
        diastolicBP,
        capnoPattern,
        cprQualityMode,
        airwayManagementMode
      );

      // Handle QRS acoustic audio & visual R wave blip
      if (sample.isRWavePeak) {
        const nowMs = performance.now();
        if (nowMs - lastQrsAudioTime.current > 240) {
          lastQrsAudioTime.current = nowMs;
          medicalAudio.playQRS(spO2);
          setIsRBlip(true);
          setTimeout(() => setIsRBlip(false), 90);
          if (onRWaveDetected) onRWaveDetected();

          // If SYNC mode is on, register sync marker
          if (defibState.isSyncMode) {
            medicalAudio.playSyncMarkerChirp();
            syncMarkersRef.current.push({ x: currX, y: ecgBaseline - 52 });
          }
        }
      }

      // Handle pacer spike sound
      if (sample.hasPacerSpike) {
        medicalAudio.playPacingClick();
      }

      // Calculate Target Y coordinates (calibrated for zero clipping)
      // Standard ECG scale: 1 mV = 30px at 1.0x gain
      const ecgScale = 30 * gain;
      const currEcgY = ecgBaseline - sample.ecgVoltage * ecgScale;

      // Pleth curve (cyan): 42px height scaled by perfusion
      const plethScale = 42;
      const currPlethY = plethBaseline - sample.plethVoltage * plethScale;

      // EtCO2 curve (yellow): 0 to 50 mmHg -> 0 to 52px height
      const co2Scale = Math.min(1.25, (height * 0.15) / 50);
      const currCo2Y = co2Baseline - sample.co2Voltage * co2Scale;

      if (prevX > 0 && currX > prevX) {
        // 1. Draw ECG Trace (Green Phosphor)
        ctx.save();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(52, 211, 153, 0.65)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(prevX, prevEcgY || currEcgY);
        ctx.lineTo(currX, currEcgY);
        ctx.stroke();

        // If pacer spike on this sample, draw needle-sharp vertical tick
        if (sample.hasPacerSpike) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(currX, ecgBaseline + 20);
          ctx.lineTo(currX, ecgBaseline - 68);
          ctx.stroke();
        }
        ctx.restore();

        // 2. Draw Plethysmography (Cyan Trace)
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(prevX, prevPlethY || currPlethY);
        ctx.lineTo(currX, currPlethY);
        ctx.stroke();
        ctx.restore();

        // 3. Draw Capnography (Yellow / Amber Trace with subtle fill)
        ctx.save();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = 'rgba(250, 204, 21, 0.4)';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(prevX, prevCo2Y || currCo2Y);
        ctx.lineTo(currX, currCo2Y);
        ctx.stroke();

        // Subtle shaded area under capnogram
        ctx.fillStyle = 'rgba(250, 204, 21, 0.08)';
        ctx.beginPath();
        ctx.moveTo(prevX, co2Baseline);
        ctx.lineTo(prevX, prevCo2Y || currCo2Y);
        ctx.lineTo(currX, currCo2Y);
        ctx.lineTo(currX, co2Baseline);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Draw active SYNC downward arrow/diamond markers above R-waves
      if (defibState.isSyncMode && syncMarkersRef.current.length > 0) {
        ctx.save();
        syncMarkersRef.current.forEach((marker) => {
          if (marker.x > currX + eraseWidth || marker.x < currX - 10) {
            // Draw prominent amber diamond
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(marker.x, marker.y - 14);
            ctx.lineTo(marker.x + 4, marker.y - 8);
            ctx.lineTo(marker.x, marker.y - 2);
            ctx.lineTo(marker.x - 4, marker.y - 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Vertical indicator tick pointing to R peak
            ctx.beginPath();
            ctx.moveTo(marker.x, marker.y - 2);
            ctx.lineTo(marker.x, marker.y + 5);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = 'bold 8px monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('SYNC', marker.x - 10, marker.y - 16);
          }
        });
        ctx.restore();
      }

      prevEcgY = currEcgY;
      prevPlethY = currPlethY;
      prevCo2Y = currCo2Y;

      animFrameRef.current = requestAnimationFrame(render);
    };

    drawGrid(canvas.width, canvas.height);
    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [
    rhythm,
    lead,
    gain,
    heartRate,
    respRate,
    etCO2,
    spO2,
    defibState.isSyncMode,
    pacerState.isActive,
    pacerState.rate,
    pacerState.outputCurrent,
    pacerState.captureThreshold,
    isCPRActive,
    onRWaveDetected,
  ]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[320px] md:min-h-[360px] flex-1 bg-[#020603] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Screen CRT Scanline & Grain Texture */}
      <div className="absolute inset-0 crt-overlay pointer-events-none" />

      {/* Channel 1 Header: ECG Lead & Calibration */}
      <div className="absolute top-2 left-3 flex items-center gap-3 text-xs font-mono">
        <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
          DERIVACIÓN {lead}
        </span>
        <span className="text-emerald-500/80">
          {gain}x (10mm/mV)
        </span>
        <span className="text-neutral-500">25 mm/s</span>
        <span className="text-neutral-400">FILTRO DIAG: 0.05-150Hz</span>

        {/* Heart beat indicator blip */}
        <div
          className={`flex items-center gap-1 transition-transform duration-75 ${
            isRBlip ? 'scale-125 text-emerald-300 font-extrabold' : 'text-emerald-700 font-normal'
          }`}
        >
          <span className="text-sm">♥</span>
          <span className="text-[11px] font-lcd">{heartRate > 0 ? heartRate : '--'}</span>
        </div>

        {pacerState.isActive && (
          <span className="text-sky-400 font-bold bg-sky-950/80 px-2 py-0.5 rounded border border-sky-700/60 animate-pulse">
            MPAC: {pacerState.rate} PPM / {pacerState.outputCurrent} mA
            {pacerState.outputCurrent >= pacerState.captureThreshold ? ' [CAPTURA]' : ' [BUSCANDO]'}
          </span>
        )}

        {defibState.isSyncMode && (
          <span className="text-yellow-300 font-bold bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-600/70 animate-pulse">
            MODO SINCRONIZADO (SYNC) ACTIVO
          </span>
        )}

        {isCPRActive && (
          <span className="text-rose-400 font-bold bg-rose-950/90 px-2 py-0.5 rounded border border-rose-600 animate-pulse">
            RCP EN CURSO (110 CPM)
          </span>
        )}
      </div>

      {/* Calibration standard pulse (10mm = 1mV box) on the left of ECG channel */}
      <div className="absolute left-1.5 top-[34%] -translate-y-1/2 w-2 h-7 border-l-2 border-t-2 border-r-2 border-emerald-400/80 pointer-events-none" />

      {/* Channel 2 Header: SpO2 Pleth */}
      <div className="absolute top-[53.5%] left-3 flex items-center gap-2 text-[11px] font-mono text-sky-400/90">
        <span className="font-bold bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/50">
          PLETH SpO2
        </span>
        <span className="text-neutral-400 text-[10px]">AUTOGAIN · PI: 3.8%</span>
      </div>

      {/* Channel 3 Header: EtCO2 Capnography */}
      <div className="absolute top-[78.5%] left-3 flex items-center gap-2 text-[11px] font-mono text-yellow-400/90">
        <span className="font-bold bg-yellow-950/80 px-1.5 py-0.5 rounded border border-yellow-800/50">
          CO2 MICROSTREAM
        </span>
        <span className="text-neutral-400 text-[10px]">0-50 mmHg · FR: {respRate} rpm</span>
      </div>

      {/* Defibrillator Action Prompts (Top Prompt Bar - Realistic Zoll Style) */}
      {defibState.isCharging && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-amber-500/95 text-black px-4 py-1.5 rounded-lg shadow-xl font-bold flex items-center gap-3 border border-yellow-200 animate-pulse">
          <span className="text-xs font-mono tracking-wider">CARGANDO CONDENSADOR: {defibState.selectedEnergy} J</span>
          <div className="w-32 h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-black/40">
            <div
              className="h-full bg-yellow-300 transition-all duration-150"
              style={{ width: `${defibState.chargeProgress}%` }}
            />
          </div>
        </div>
      )}

      {defibState.isCharged && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-rose-600/95 text-white px-4 py-1.5 rounded-lg shadow-2xl font-bold text-center border-2 border-yellow-400 flex items-center gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
            <span className="text-xs sm:text-sm font-bold tracking-widest text-yellow-300">¡DESFIBRILADOR CARGADO!</span>
            <span className="text-xs font-mono font-bold bg-black/40 px-2 py-0.5 rounded text-white">{defibState.selectedEnergy} J</span>
          </div>
          <span className="text-[11px] text-rose-100 hidden md:inline">¡DESPEJEN! PRESIONE DESCARGA</span>
        </div>
      )}

      {defibState.isAnalyzing && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-sky-900/95 text-white px-4 py-1.5 rounded-lg shadow-xl font-bold text-center border border-sky-400 animate-pulse flex items-center gap-2">
          <span className="text-xs tracking-wider text-sky-200">ANALIZANDO RITMO... NO TOQUE AL PACIENTE</span>
        </div>
      )}

      {defibState.analysisResult === 'SHOCK_ADVISED' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-rose-600/95 text-white px-4 py-1.5 rounded-lg font-bold border-2 border-yellow-300 shadow-xl flex items-center gap-2 animate-bounce">
          <span className="text-xs sm:text-sm">¡DESCARGA ACONSEJADA! PRESIONE CARGAR</span>
        </div>
      )}

      {defibState.analysisResult === 'NO_SHOCK_ADVISED' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-emerald-800/95 text-white px-4 py-1.5 rounded-lg font-bold border border-emerald-400 shadow-xl flex items-center gap-2">
          <span className="text-xs sm:text-sm">NO SE ACONSEJA DESCARGA · REANUDAR RCP</span>
        </div>
      )}

      {/* CPR Feedback Dashboard (Zoll Real CPR Help / LifePak TrueCPR Style) */}
      {isCPRActive && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 bg-neutral-900/95 border-2 border-emerald-500 text-white px-3.5 py-1.5 rounded-xl shadow-2xl flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>REAL CPR HELP:</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
            <span>FREC: <strong className="text-white font-lcd text-xs sm:text-sm">110</strong> CPM</span>
            <span className="text-neutral-600">|</span>
            <span>PROF: <strong className="text-emerald-400 font-lcd text-xs sm:text-sm">5.4</strong> CM</span>
            <span className="text-neutral-600">|</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold text-[10px] animate-pulse">
              COMPRESIÓN ADECUADA
            </span>
          </div>
        </div>
      )}

      {/* 12-Lead Instantaneous Electrocardiographic Modal Overlay */}
      {isTwelveLeadMode && (
        <div className="absolute inset-0 bg-[#050b07]/98 backdrop-blur-md p-3 sm:p-4 overflow-y-auto z-20 flex flex-col border-2 border-emerald-500/70 shadow-2xl">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between pb-2 border-b border-emerald-900/80 gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold font-lcd text-base sm:text-xl tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                ELECTROCARDIOGRAMA DIAGNÓSTICO DE 12 DERIVACIONES
              </span>
              <span className="text-neutral-400 text-xs font-mono hidden md:inline">
                Estándar 25 mm/s · 10 mm/mV · Filtro 0.05-150 Hz
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-700/60 flex items-center gap-2">
                <span>FC: <strong>{heartRate}</strong> lpm</span>
                <span className="text-emerald-700">|</span>
                <span>PR: <strong>160</strong> ms</span>
                <span className="text-emerald-700">|</span>
                <span>QRS: <strong>{rhythm.includes('VT') || rhythm === 'AV_BLOCK_3RD' ? '150' : '88'}</strong> ms</span>
                <span className="text-emerald-700">|</span>
                <span>QT/QTc: <strong>390/425</strong> ms</span>
              </div>
              {onCloseTwelveLead && (
                <button
                  onClick={onCloseTwelveLead}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 text-white rounded-lg font-mono text-xs border border-neutral-600 cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Cerrar registro de 12 derivaciones y volver al osciloscopio en vivo"
                >
                  <span className="font-bold">VOLVER AL MONITOR</span>
                  <span className="text-neutral-400 text-sm">✕</span>
                </button>
              )}
            </div>
          </div>

          {/* 12 Leads Matrix: Standard 4 Columns x 3 Leads format */}
          {/* Col 1: I, II, III | Col 2: aVR, aVL, aVF | Col 3: V1, V2, V3 | Col 4: V4, V5, V6 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1 mt-2.5">
            {[
              { lead: 'I' as ECGLead, desc: 'Bipolar Lateral (0°)' },
              { lead: 'aVR' as ECGLead, desc: 'Unipolar Cavitario (-150° - Invertido)' },
              { lead: 'V1' as ECGLead, desc: 'Septal/VD (4° EIC Der - rS)' },
              { lead: 'V4' as ECGLead, desc: 'Anterior/Ápex (5° EIC LMC)' },

              { lead: 'II' as ECGLead, desc: 'Bipolar Inferior (+60° - Eje Mayor)' },
              { lead: 'aVL' as ECGLead, desc: 'Unipolar Lateral Alto (-30°)' },
              { lead: 'V2' as ECGLead, desc: 'Septal (4° EIC Izq - rS)' },
              { lead: 'V5' as ECGLead, desc: 'Anterolateral (5° EIC LAA)' },

              { lead: 'III' as ECGLead, desc: 'Bipolar Inferior (+120°)' },
              { lead: 'aVF' as ECGLead, desc: 'Unipolar Inferior (+90°)' },
              { lead: 'V3' as ECGLead, desc: 'Transición (Equidifásica RS)' },
              { lead: 'V6' as ECGLead, desc: 'Lateral (5° EIC LAM - qR)' },
            ].map(({ lead: l, desc }) => (
              <div
                key={l}
                className="bg-[#020704] border border-emerald-900/60 rounded-lg p-1.5 flex flex-col relative h-28 sm:h-32 shadow-inner overflow-hidden"
              >
                <div className="flex items-center justify-between z-10 px-1 pointer-events-none">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-black/60 px-1 rounded">
                    {l}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-600/90 truncate max-w-[120px] hidden sm:inline">
                    {desc}
                  </span>
                </div>
                <TwelveLeadMiniLead rhythm={rhythm} lead={l} hr={heartRate} />
              </div>
            ))}
          </div>

          {/* Long Continuous Lead II Rhythm Strip at Bottom (Tira de Ritmo Diagnóstica) */}
          <div className="mt-2.5 bg-[#020704] border border-emerald-800/80 rounded-lg p-2 h-20 sm:h-24 flex flex-col relative shrink-0 shadow-inner overflow-hidden">
            <div className="flex items-center justify-between z-10 px-1 pointer-events-none">
              <span className="text-xs font-mono font-bold text-emerald-300 bg-black/60 px-1.5 py-0.5 rounded border border-emerald-700/50">
                TIRA DE RITMO CONTINUO: DERIVACIÓN II (DII LARGO · 10 SEG)
              </span>
              <span className="text-[10px] font-mono text-emerald-500 hidden sm:inline">
                Ritmo: {rhythm} · Sensibilidad: 10 mm/mV · Papel 25 mm/s
              </span>
            </div>
            <div className="flex-1 w-full h-full relative">
              <TwelveLeadMiniLead rhythm={rhythm} lead="II" hr={heartRate} isLongStrip={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mini preview strip for each lead in 12-lead view with true medical ECG calibration & grid
const TwelveLeadMiniLead: React.FC<{
  rhythm: CardiacRhythmType;
  lead: ECGLead;
  hr: number;
  isLongStrip?: boolean;
}> = ({ rhythm, lead, hr, isLongStrip = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || (isLongStrip ? 900 : 220);
    const height = canvas.parentElement?.clientHeight || (isLongStrip ? 70 : 100);
    canvas.width = width;
    canvas.height = height;

    // Dark high-contrast medical monitor background
    ctx.fillStyle = '#020603';
    ctx.fillRect(0, 0, width, height);

    // 1mm minor and 5mm major medical grid
    const stepMinor = 8;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += stepMinor) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += stepMinor) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const stepMajor = stepMinor * 5;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += stepMajor) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += stepMajor) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const baseline = height / 2;
    const pxPerMv = 24; // 1 mV = 24 pixels (approx 10mm)

    // Draw universal 10 mm/mV Calibration Pulse on Left: [|--|]
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(4, baseline);
    ctx.lineTo(10, baseline);
    ctx.lineTo(10, baseline - pxPerMv);
    ctx.lineTo(18, baseline - pxPerMv);
    ctx.lineTo(18, baseline);
    ctx.lineTo(24, baseline);
    ctx.stroke();

    // Draw physiological waveform across the strip
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = isLongStrip ? 1.6 : 1.8;
    ctx.beginPath();

    const startX = 26;
    const effectiveWidth = width - startX;
    // Total duration represented across the lead window:
    // For standard mini-leads: ~2.5 seconds (approx 3 cardiac cycles at 75 bpm)
    // For long rhythm strip: ~8.0 seconds
    const totalDurationSec = isLongStrip ? 8.0 : 2.5;
    const cycleDuration = hr > 0 ? 60 / hr : 1.0;
    const atrialCycleDuration = 60 / 76;

    for (let i = 0; i < effectiveWidth; i++) {
      const x = startX + i;
      const t = (i / effectiveWidth) * totalDurationSec;
      const beatSec = t % cycleDuration;
      const atrialBeatSec = t % atrialCycleDuration;

      // Pure stateless calculation: NEVER mutates the live sweep engine!
      const voltage = cardiologyEngine.getECGVoltageForLead(
        lead,
        beatSec,
        rhythm,
        hr,
        false,
        atrialBeatSec,
        t
      );

      const y = baseline - voltage * pxPerMv;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }, [rhythm, lead, hr, isLongStrip]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};
