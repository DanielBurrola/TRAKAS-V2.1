/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ActiveAlarm } from '../../types/medical';
import {
  Bell,
  BellOff,
  AlertTriangle,
  Sliders,
  AlertOctagon,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AlarmBannerProps {
  alarms: ActiveAlarm[];
  isSilenced: boolean;
  silenceRemaining: number;
  isMuted: boolean;
  onToggleSilence: () => void;
  onOpenLimitsModal: () => void;
}

export const AlarmBanner: React.FC<AlarmBannerProps> = ({
  alarms,
  isSilenced,
  silenceRemaining,
  isMuted,
  onToggleSilence,
  onOpenLimitsModal,
}) => {
  if (alarms.length === 0 && !isSilenced) {
    return null;
  }

  const hasHighPriority = alarms.some((a) => a.priority === 'HIGH');
  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`w-full px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b transition-all select-none z-20 ${
        alarms.length > 0
          ? hasHighPriority
            ? 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(225,29,72,0.45)]'
            : 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
          : 'bg-[#181d24] border-neutral-700 text-neutral-300'
      }`}
    >
      {/* Left: Active Alarm List & Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {hasHighPriority ? (
            <div className="w-5 h-5 rounded-full bg-rose-600 flex items-center justify-center animate-ping">
              <AlertOctagon className="w-3.5 h-3.5 text-white" />
            </div>
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
          )}

          <span className="text-[11px] font-bold font-mono tracking-wider uppercase">
            {alarms.length > 0
              ? hasHighPriority
                ? '¡ALARMA CLÍNICA CRÍTICA!'
                : 'ALERTA DE MONITOR'
              : 'ALARMAS SILENCIADAS'}
          </span>
        </div>

        {/* Alarm Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {alarms.map((alarm) => (
            <span
              key={alarm.id}
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                alarm.priority === 'HIGH'
                  ? 'bg-rose-600/90 text-white border-yellow-300 shadow-sm animate-pulse'
                  : 'bg-amber-600/90 text-black border-amber-200'
              }`}
              title={alarm.message}
            >
              <span>{alarm.title}</span>
              <span className="opacity-90 font-lcd">({alarm.value})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Right: Silence Button & Limits Setup */}
      <div className="flex items-center gap-2">
        {/* Silence Toggle Button */}
        <button
          onClick={onToggleSilence}
          className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
            isSilenced
              ? 'bg-amber-500 text-black border-amber-200 animate-pulse'
              : hasHighPriority
              ? 'bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white border-rose-400'
              : 'bg-[#222831] hover:bg-[#2c3440] text-neutral-200 border-neutral-600'
          }`}
          title={isSilenced ? 'Restablecer sonido de alarmas' : 'Pausar alarmas sonoras durante 2 minutos (120s)'}
        >
          {isSilenced ? (
            <>
              <BellOff className="w-3.5 h-3.5" />
              <span>SILENCIO: {formatSeconds(silenceRemaining)}</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 text-yellow-300" />
              <span>SILENCIAR (120s)</span>
            </>
          )}
        </button>

        {/* Audio Muted Indicator */}
        {isMuted && (
          <span className="px-2 py-0.5 rounded bg-black/60 border border-neutral-700 text-rose-300 font-mono text-[10px] flex items-center gap-1">
            <VolumeX className="w-3 h-3 text-rose-400" />
            <span>MUTE</span>
          </span>
        )}

        {/* Alarm Limits Modal Trigger */}
        <button
          onClick={onOpenLimitsModal}
          className="px-2 py-1 rounded-lg bg-[#1f252d] hover:bg-[#2b333e] text-neutral-300 border border-neutral-600 font-mono text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
          title="Ver o configurar los umbrales de alarma de SpO2, EtCO2, TA y FC"
        >
          <Sliders className="w-3 h-3 text-sky-400" />
          <span className="hidden sm:inline">LÍMITES</span>
        </button>
      </div>
    </div>
  );
};
