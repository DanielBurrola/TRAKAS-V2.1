/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  MonitorDialMode,
  DefibrillatorState,
  PacemakerState,
  ECGLead,
} from '../../types/medical';
import {
  Zap,
  Activity,
  Heart,
  Volume2,
  VolumeX,
  Printer,
  Grid3X3,
  Flame,
  Radio,
  Bell,
  BellOff,
  Sliders,
} from 'lucide-react';

interface ZollBezelProps {
  dialMode: MonitorDialMode;
  onDialChange: (mode: MonitorDialMode) => void;
  selectedLead: ECGLead;
  onCycleLead: () => void;
  gain: number;
  onCycleGain: () => void;
  defibState: DefibrillatorState;
  onSelectEnergyUp: () => void;
  onSelectEnergyDown: () => void;
  onCharge: () => void;
  onDeliverShock: () => void;
  onToggleSync: () => void;
  onAnalyze: () => void;
  pacerState: PacemakerState;
  onTogglePacer: () => void;
  onPacerRateChange: (delta: number) => void;
  onPacerCurrentChange: (delta: number) => void;
  onToggle4to1: () => void;
  isNibpMeasuring: boolean;
  onTriggerNibp: () => void;
  onToggle12Lead: () => void;
  is12LeadActive: boolean;
  onOpenStripSummary: () => void;
  isCPRActive: boolean;
  onToggleCPR: () => void;
  cprMetronomeEnabled: boolean;
  onToggleMetronome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isSilenced?: boolean;
  silenceRemaining?: number;
  onToggleSilence?: () => void;
  onOpenLimitsModal?: () => void;
}

export const ZollBezel: React.FC<ZollBezelProps> = ({
  dialMode,
  onDialChange,
  selectedLead,
  onCycleLead,
  gain,
  onCycleGain,
  defibState,
  onSelectEnergyUp,
  onSelectEnergyDown,
  onCharge,
  onDeliverShock,
  onToggleSync,
  onAnalyze,
  pacerState,
  onTogglePacer,
  onPacerRateChange,
  onPacerCurrentChange,
  onToggle4to1,
  isNibpMeasuring,
  onTriggerNibp,
  onToggle12Lead,
  is12LeadActive,
  onOpenStripSummary,
  isCPRActive,
  onToggleCPR,
  cprMetronomeEnabled,
  onToggleMetronome,
  isMuted,
  onToggleMute,
  isSilenced = false,
  silenceRemaining = 0,
  onToggleSilence,
  onOpenLimitsModal,
}) => {
  return (
    <div className="bg-[#171b1f] border-t-2 border-[#2b3138] p-2.5 shadow-inner text-neutral-200 select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        {/* SECTION 1: ROTARY MODE DIAL & MONITOR CONTROLS (Cols 1-4) */}
        <div className="lg:col-span-4 bg-[#111417] p-2.5 rounded-xl border border-[#23282f] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#23282f] gap-1 flex-wrap">
            <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase font-mono">
              SELECTOR TRAKAS-3000
            </span>
            <div className="flex items-center gap-1.5">
              {onToggleSilence && (
                <button
                  onClick={onToggleSilence}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    isSilenced
                      ? 'bg-amber-500 text-black border-amber-300 shadow-sm animate-pulse'
                      : 'bg-[#1e2329] hover:bg-[#282f37] text-neutral-300 border-neutral-700'
                  }`}
                  title={isSilenced ? 'Restablecer sonido de alarmas' : 'Pausar alarmas sonoras 120 segundos'}
                >
                  {isSilenced ? <BellOff className="w-3 h-3 text-black" /> : <Bell className="w-3 h-3 text-yellow-400" />}
                  <span>{isSilenced ? `${silenceRemaining}s` : 'SILENCIO'}</span>
                </button>
              )}
              {onOpenLimitsModal && (
                <button
                  onClick={onOpenLimitsModal}
                  className="p-1 rounded bg-[#1e2329] hover:bg-[#282f37] text-neutral-300 text-xs flex items-center gap-1 border border-neutral-700 cursor-pointer"
                  title="Configuración de límites de alarmas SpO2, EtCO2, TA y FC"
                >
                  <Sliders className="w-3 h-3 text-sky-400" />
                  <span className="text-[10px] font-mono hidden sm:inline">LÍMITES</span>
                </button>
              )}
              <button
                onClick={onToggleMute}
                className="p-1 rounded bg-[#1e2329] hover:bg-[#282f37] text-neutral-300 text-xs flex items-center gap-1 border border-neutral-700 cursor-pointer"
                title={isMuted ? 'Activar Sonido' : 'Silenciar'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span className="text-[10px] font-mono">{isMuted ? 'MUTED' : 'AUDIO'}</span>
              </button>
            </div>
          </div>

          {/* Rotary Dial Mode Switcher */}
          <div className="flex items-center justify-around py-2">
            {(['OFF', 'MONITOR', 'DEFIB', 'PACER'] as MonitorDialMode[]).map((mode) => {
              const isActive = dialMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onDialChange(mode)}
                  className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    isActive ? 'scale-105' : 'opacity-65 hover:opacity-90'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-lcd font-bold text-xs border-2 shadow-md ${
                      isActive
                        ? mode === 'DEFIB'
                          ? 'bg-rose-700 border-yellow-400 text-white shadow-rose-900/50 ring-2 ring-rose-500'
                          : mode === 'PACER'
                          ? 'bg-sky-700 border-sky-300 text-white shadow-sky-900/50 ring-2 ring-sky-500'
                          : 'bg-emerald-700 border-emerald-300 text-white shadow-emerald-900/50 ring-2 ring-emerald-500'
                        : 'bg-[#22272e] border-neutral-700 text-neutral-400'
                    }`}
                  >
                    {mode === 'OFF' ? '0' : mode[0]}
                  </div>
                  <span
                    className={`text-[9px] font-mono tracking-wider font-semibold ${
                      isActive ? 'text-white font-bold' : 'text-neutral-400'
                    }`}
                  >
                    {mode}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Monitor Softkeys */}
          <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-[#23282f]">
            <button
              onClick={onCycleLead}
              className="py-1 px-1 bg-[#1e2329] hover:bg-[#282f37] active:bg-[#161a1e] rounded-lg border border-neutral-700 text-center flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-[8px] text-neutral-400 font-mono block">DERIV.</span>
              <span className="text-xs font-bold font-mono text-emerald-400">{selectedLead}</span>
            </button>

            <button
              onClick={onCycleGain}
              className="py-1 px-1 bg-[#1e2329] hover:bg-[#282f37] active:bg-[#161a1e] rounded-lg border border-neutral-700 text-center flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-[8px] text-neutral-400 font-mono block">GANANCIA</span>
              <span className="text-xs font-bold font-mono text-emerald-400">{gain}x</span>
            </button>

            <button
              onClick={onTriggerNibp}
              disabled={isNibpMeasuring}
              className={`py-1 px-1 rounded-lg border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                isNibpMeasuring
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300 animate-pulse'
                  : 'bg-[#1e2329] hover:bg-[#282f37] active:bg-[#161a1e] border-neutral-700 text-neutral-200'
              }`}
            >
              <span className="text-[8px] text-neutral-400 font-mono block">PANI/NIBP</span>
              <span className="text-xs font-bold font-mono">{isNibpMeasuring ? 'MEDIDA...' : 'INICIAR'}</span>
            </button>

            <button
              onClick={onToggle12Lead}
              className={`py-1 px-1 rounded-lg border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                is12LeadActive
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-1 ring-emerald-400'
                  : 'bg-[#1e2329] hover:bg-[#282f37] active:bg-[#161a1e] border-neutral-700 text-neutral-200'
              }`}
            >
              <Grid3X3 className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-bold font-mono">12 DERIV</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: DEFIBRILLATOR 1-2-3 SEQUENCE (Cols 5-8) */}
        <div className="lg:col-span-5 bg-[#111417] p-2.5 rounded-xl border border-[#23282f] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#23282f]">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] font-bold tracking-wider text-yellow-400 uppercase font-mono">
                DESFIBRILADOR MANUAL BIFÁSICO (1-2-3)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleSync}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border transition-all cursor-pointer ${
                  defibState.isSyncMode
                    ? 'bg-yellow-400 text-black border-yellow-200 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                    : 'bg-[#1e2329] text-neutral-400 border-neutral-700 hover:text-white'
                }`}
              >
                SYNC {defibState.isSyncMode ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={onAnalyze}
                disabled={defibState.isAnalyzing}
                className="px-2 py-0.5 text-[9px] font-mono font-bold rounded border bg-blue-900/60 border-blue-600 hover:bg-blue-800 text-sky-200 cursor-pointer"
              >
                {defibState.isAnalyzing ? 'ANALIZANDO...' : 'ANALIZAR'}
              </button>
            </div>
          </div>

          {/* 1-2-3 Defib Steps */}
          <div className="grid grid-cols-3 gap-2 py-1.5">
            {/* 1. SELECT ENERGY */}
            <div className="bg-[#1b2026] p-1.5 rounded-lg border border-[#2b333c] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-neutral-400 font-mono">1. ENERGÍA</span>
                <span className="text-[8px] text-neutral-500 font-mono">JOULES</span>
              </div>
              <div className="my-0.5 text-center">
                <span className="text-xl sm:text-2xl font-lcd font-bold text-yellow-400 tabular-nums">
                  {defibState.selectedEnergy}
                </span>
                <span className="text-[10px] text-yellow-500/80 font-mono ml-0.5">J</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onSelectEnergyDown}
                  className="flex-1 py-0.5 rounded bg-[#242b33] hover:bg-[#303944] active:bg-[#1a1f25] text-xs font-bold text-white border border-neutral-700 cursor-pointer"
                >
                  -
                </button>
                <button
                  onClick={onSelectEnergyUp}
                  className="flex-1 py-0.5 rounded bg-[#242b33] hover:bg-[#303944] active:bg-[#1a1f25] text-xs font-bold text-white border border-neutral-700 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* 2. CHARGE */}
            <button
              onClick={onCharge}
              disabled={defibState.isCharging || defibState.isCharged}
              className={`p-1.5 rounded-lg border flex flex-col items-center justify-between transition-all relative overflow-hidden cursor-pointer ${
                defibState.isCharged
                  ? 'bg-yellow-400 text-black border-yellow-200 font-bold shadow-[0_0_15px_rgba(250,204,21,0.7)]'
                  : defibState.isCharging
                  ? 'bg-yellow-950/70 text-yellow-300 border-yellow-500 animate-pulse'
                  : 'bg-[#272b1d] hover:bg-[#373d27] active:bg-[#1c2014] border-yellow-700/60 text-yellow-400'
              }`}
            >
              <div className="w-full flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono">2. CARGAR</span>
                <Zap className="w-3 h-3" />
              </div>
              <div className="my-1 flex flex-col items-center">
                <span className="text-xs font-extrabold font-mono tracking-wider">
                  {defibState.isCharging
                    ? `${Math.round(defibState.chargeProgress)}%`
                    : defibState.isCharged
                    ? '¡LISTO!'
                    : 'CARGAR'}
                </span>
              </div>
              <span className="text-[8px] font-mono uppercase opacity-80">
                {defibState.isCharged ? 'LLENO' : 'PULSAR'}
              </span>
            </button>

            {/* 3. SHOCK BUTTON */}
            <button
              onClick={onDeliverShock}
              disabled={!defibState.isCharged}
              className={`p-1.5 rounded-lg border flex flex-col items-center justify-between transition-all relative cursor-pointer ${
                defibState.isCharged
                  ? 'bg-rose-600 hover:bg-rose-500 active:scale-95 text-white border-yellow-300 font-bold shadow-[0_0_25px_rgba(239,68,68,0.95)] animate-pulse ring-4 ring-rose-500'
                  : 'bg-[#221a1c] border-neutral-800 text-neutral-600 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="w-full flex items-center justify-between">
                <span className="text-[9px] font-bold font-mono">3. DESCARGA</span>
                <Flame className="w-3 h-3 text-yellow-300" />
              </div>
              <div className="my-1 text-center">
                <span className="text-sm font-lcd font-bold tracking-wider">
                  {defibState.isCharged ? '¡SHOCK!' : 'STANDBY'}
                </span>
              </div>
              <span className="text-[8px] font-mono uppercase tracking-tight text-white/90">
                {defibState.isCharged ? '¡DESPEJEN!' : 'REQUIERE CARGA'}
              </span>
            </button>
          </div>

          {/* Last Shock details footer */}
          <div className="text-[9px] font-mono text-neutral-400 flex items-center justify-between pt-1 border-t border-[#23282f]">
            <span>Descargas: <strong className="text-white">{defibState.totalShocksDelivered}</strong></span>
            <span>
              Última: {defibState.lastShockJoules ? `${defibState.lastShockJoules} J (${defibState.lastShockTime})` : 'Ninguna'}
            </span>
          </div>
        </div>

        {/* SECTION 3: TRANSCUTANEOUS PACEMAKER & TOOLS (Cols 9-12) */}
        <div className="lg:col-span-3 bg-[#111417] p-2.5 rounded-xl border border-[#23282f] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#23282f]">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] font-bold tracking-wider text-sky-400 uppercase font-mono">
                MARCAPASOS TRANSCUTÁNEO
              </span>
            </div>
            <button
              onClick={onTogglePacer}
              className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border transition-all cursor-pointer ${
                pacerState.isActive
                  ? 'bg-sky-500 text-black border-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                  : 'bg-[#1e2329] text-neutral-400 border-neutral-700 hover:text-white'
              }`}
            >
              {pacerState.isActive ? 'ACTIVO' : 'APAGADO'}
            </button>
          </div>

          {/* Rate and Output Controls with Fine & Fast Stepping */}
          <div className="grid grid-cols-2 gap-1.5 py-1">
            {/* PACER RATE (PPM) */}
            <div className="bg-[#172027] p-1.5 rounded-lg border border-[#23313d] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-neutral-400 font-mono">FREC. (PPM)</span>
                <span className="text-[8px] text-sky-400 font-mono">30-180</span>
              </div>
              <div className="text-center my-0.5">
                <span className="text-lg font-lcd font-bold text-sky-400 tabular-nums">{pacerState.rate}</span>
                <span className="text-[9px] text-sky-500 font-mono ml-0.5">ppm</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => onPacerRateChange(-5)}
                  disabled={!pacerState.isActive}
                  className="flex-1 py-0.5 rounded bg-[#202d38] hover:bg-[#2c3d4c] text-[10px] font-bold text-white border border-neutral-700 disabled:opacity-30 cursor-pointer"
                  title="-5 PPM"
                >
                  -5
                </button>
                <button
                  onClick={() => onPacerRateChange(-1)}
                  disabled={!pacerState.isActive}
                  className="flex-1 py-0.5 rounded bg-[#202d38] hover:bg-[#2c3d4c] text-[10px] font-bold text-white border border-neutral-700 disabled:opacity-30 cursor-pointer"
                  title="-1 PPM"
                >
                  -1
                </button>
                <button
                  onClick={() => onPacerRateChange(1)}
                  disabled={!pacerState.isActive}
                  className="flex-1 py-0.5 rounded bg-[#202d38] hover:bg-[#2c3d4c] text-[10px] font-bold text-white border border-neutral-700 disabled:opacity-30 cursor-pointer"
                  title="+1 PPM"
                >
                  +1
                </button>
                <button
                  onClick={() => onPacerRateChange(5)}
                  disabled={!pacerState.isActive}
                  className="flex-1 py-0.5 rounded bg-[#202d38] hover:bg-[#2c3d4c] text-[10px] font-bold text-white border border-neutral-700 disabled:opacity-30 cursor-pointer"
                  title="+5 PPM"
                >
                  +5
                </button>
              </div>
            </div>

            {/* PACER OUTPUT CURRENT (mA) */}
            <div className="bg-[#172027] p-1.5 rounded-lg border border-[#23313d] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-neutral-400 font-mono">SALIDA (mA)</span>
                <span className="text-[8px] text-amber-400 font-mono">0-140</span>
              </div>
              <div className="text-center my-0.5">
                <span className="text-lg font-lcd font-bold text-amber-400 tabular-nums">{pacerState.outputCurrent}</span>
                <span className="text-[9px] text-amber-500 font-mono ml-0.5">mA</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => onPacerCurrentChange(-5)}
                  disabled={!pacerState.isActive}
                  className="flex-1 py-0.5 rounded bg-[#202d38] hover:bg-[#2c3d4c] text-[10px] font-bold text-white border border-neutral-700 disabled:opacity-30 cursor-pointer"
                  title="-5 mA"
                >
                  -5
                </button>
                <button
                  onClick={() => onPacerCurrentChange(-1)}
                  disabled={!pacerState.isActive}
                  className="flex-1 py-0.5 rounded bg-[#202d38] hover:bg-[#2c3d4c] text-[10px] font-bold text-white border border-neutral-700 disabled:opacity-30 cursor-pointer"
                  title="-1 mA"
                >
                  -1
                </button>
                <button
                  onClick={() => onPacerCurrentChange(1)}
                  disabled={!pacerState.isActive}
                  className="flex-1 py-0.5 rounded bg-[#202d38] hover:bg-[#2c3d4c] text-[10px] font-bold text-white border border-neutral-700 disabled:opacity-30 cursor-pointer"
                  title="+1 mA"
                >
                  +1
                </button>
                <button
                  onClick={() => onPacerCurrentChange(5)}
                  disabled={!pacerState.isActive}
                  className="flex-1 py-0.5 rounded bg-[#202d38] hover:bg-[#2c3d4c] text-[10px] font-bold text-white border border-neutral-700 disabled:opacity-30 cursor-pointer"
                  title="+5 mA"
                >
                  +5
                </button>
              </div>
            </div>
          </div>

          {/* Capture Status Banner */}
          {pacerState.isActive && (
            <div className="text-center py-0.5">
              {pacerState.isCapturing ? (
                <span className="inline-block text-[8px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600">
                  ✓ CAPTURA ELÉCTRICA (QRS ancho post-espiga)
                </span>
              ) : (
                <span className="inline-block text-[8px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600 animate-pulse">
                  ⚡ ESPIGA VISIBLE · SIN CAPTURA (Umbral: {pacerState.captureThreshold} mA)
                </span>
              )}
            </div>
          )}

          {/* Quick Tools: 4:1 test, CPR metronome, Strip */}
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#23282f]">
            <button
              onClick={onToggle4to1}
              disabled={!pacerState.isActive}
              className="py-1 px-1 bg-[#1e2329] hover:bg-[#282f37] rounded-lg border border-neutral-700 text-[9px] font-mono text-center disabled:opacity-30 cursor-pointer"
              title="Pausa 4:1 para evaluar ritmo intrínseco"
            >
              4:1 TEST
            </button>

            <button
              onClick={onToggleMetronome}
              className={`py-1 px-1 rounded-lg border text-[9px] font-mono text-center flex items-center justify-center gap-1 transition-all cursor-pointer ${
                cprMetronomeEnabled
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                  : 'bg-[#1e2329] hover:bg-[#282f37] border-neutral-700 text-neutral-300'
              }`}
              title="Metrónomo AHA 110 lpm"
            >
              <Heart className="w-2.5 h-2.5 text-rose-400" />
              <span>110 CPM</span>
            </button>

            <button
              onClick={onOpenStripSummary}
              className="py-1 px-1 bg-[#1e2329] hover:bg-[#282f37] rounded-lg border border-neutral-700 text-[9px] font-mono text-neutral-300 flex items-center justify-center gap-1 cursor-pointer"
            >
              <Printer className="w-2.5 h-2.5" />
              <span>TIRA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
