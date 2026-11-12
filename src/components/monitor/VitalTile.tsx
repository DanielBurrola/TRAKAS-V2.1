/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface VitalTileProps {
  label: string;
  subLabel?: string;
  value: string | number;
  unit: string;
  colorClass: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
  secondaryValue?: string;
  secondaryLabel?: string;
  statusBadge?: string;
  isAlarming?: boolean;
  alarmMessage?: string;
  alarmPriority?: 'HIGH' | 'MEDIUM';
  pulseIcon?: boolean;
  onClick?: () => void;
}

export const VitalTile: React.FC<VitalTileProps> = ({
  label,
  subLabel,
  value,
  unit,
  colorClass,
  secondaryValue,
  secondaryLabel,
  statusBadge,
  isAlarming,
  alarmMessage,
  alarmPriority = 'HIGH',
  pulseIcon,
  onClick,
}) => {
  const colorMap = {
    emerald: {
      text: 'text-emerald-400',
      border: 'border-emerald-700/50',
      bg: 'bg-emerald-950/25',
      highlight: 'text-emerald-300',
    },
    sky: {
      text: 'text-sky-400',
      border: 'border-sky-700/50',
      bg: 'bg-sky-950/25',
      highlight: 'text-sky-300',
    },
    amber: {
      text: 'text-amber-400',
      border: 'border-amber-700/50',
      bg: 'bg-amber-950/25',
      highlight: 'text-amber-300',
    },
    rose: {
      text: 'text-rose-400',
      border: 'border-rose-700/50',
      bg: 'bg-rose-950/25',
      highlight: 'text-rose-300',
    },
    slate: {
      text: 'text-neutral-100',
      border: 'border-neutral-700/60',
      bg: 'bg-neutral-900/70',
      highlight: 'text-white',
    },
  };

  const currentTheme = colorMap[colorClass];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-150 select-none ${
        currentTheme.bg
      } ${currentTheme.border} ${
        isAlarming
          ? alarmPriority === 'HIGH'
            ? 'animate-pulse border-rose-500 bg-rose-950/80 shadow-[0_0_24px_rgba(239,68,68,0.7)] ring-2 ring-rose-500'
            : 'animate-pulse border-amber-500 bg-amber-950/70 shadow-[0_0_18px_rgba(245,158,11,0.6)] ring-2 ring-amber-500'
          : ''
      } ${onClick ? 'cursor-pointer hover:brightness-110 active:scale-[0.99]' : ''}`}
    >
      {/* Header Label and Units */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${currentTheme.text}`}>
            {label}
          </span>
          {subLabel && <span className="text-[10px] text-neutral-400 font-mono">({subLabel})</span>}
          {pulseIcon && (
            <span className="text-emerald-400 text-xs animate-ping">●</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {statusBadge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
              {statusBadge}
            </span>
          )}
          {isAlarming && (
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded animate-bounce shadow-sm ${
                alarmPriority === 'HIGH'
                  ? 'bg-rose-600 text-white border border-yellow-300'
                  : 'bg-amber-500 text-black border border-amber-200'
              }`}
            >
              {alarmMessage || '¡ALERTA!'}
            </span>
          )}
          <span className="text-[10px] font-mono text-neutral-400">{unit}</span>
        </div>
      </div>

      {/* Main Big Numerals */}
      <div className="my-0.5 flex items-baseline justify-between">
        <div
          className={`text-3xl sm:text-4xl font-extrabold font-lcd tracking-tight tabular-nums ${
            isAlarming
              ? alarmPriority === 'HIGH'
                ? 'text-rose-200 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                : 'text-amber-200 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]'
              : currentTheme.highlight
          }`}
        >
          {value}
        </div>

        {secondaryValue && (
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block font-mono">{secondaryLabel}</span>
            <span className="text-base font-lcd font-bold text-neutral-200 tabular-nums">
              {secondaryValue}
            </span>
          </div>
        )}
      </div>

      {/* Footer subtle scale or interactive cue */}
      <div className="text-[9px] font-mono text-neutral-500 flex items-center justify-between pt-0.5 border-t border-white/5">
        <span>{onClick ? 'Tocar para medir' : 'Auto'}</span>
        {isAlarming ? (
          <span
            className={`font-bold uppercase tracking-wider ${
              alarmPriority === 'HIGH' ? 'text-rose-400' : 'text-amber-400'
            }`}
          >
            {alarmMessage ? `¡${alarmMessage}!` : '¡ALERTA!'}
          </span>
        ) : (
          <span className="text-neutral-500 uppercase">OK</span>
        )}
      </div>
    </div>
  );
};
