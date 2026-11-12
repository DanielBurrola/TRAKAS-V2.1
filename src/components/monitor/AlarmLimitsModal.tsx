/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlarmLimits, DEFAULT_ALARM_LIMITS } from '../../types/medical';
import { X, Sliders, RotateCcw, Check, Bell, ShieldAlert } from 'lucide-react';

interface AlarmLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLimits: AlarmLimits;
  onSaveLimits: (limits: AlarmLimits) => void;
}

export const AlarmLimitsModal: React.FC<AlarmLimitsModalProps> = ({
  isOpen,
  onClose,
  currentLimits,
  onSaveLimits,
}) => {
  const [limits, setLimits] = useState<AlarmLimits>({ ...currentLimits });

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setLimits({ ...DEFAULT_ALARM_LIMITS });
  };

  const handleApplyPreset = (preset: 'ICU' | 'PEDIATRIC' | 'TRAUMA') => {
    if (preset === 'ICU') {
      setLimits({
        spo2Low: 90,
        etco2Low: 30,
        etco2High: 45,
        systolicLow: 90,
        systolicHigh: 180,
        diastolicHigh: 110,
        mapLow: 65,
        hrLow: 50,
        hrHigh: 130,
      });
    } else if (preset === 'PEDIATRIC') {
      setLimits({
        spo2Low: 92,
        etco2Low: 32,
        etco2High: 45,
        systolicLow: 80,
        systolicHigh: 135,
        diastolicHigh: 85,
        mapLow: 55,
        hrLow: 75,
        hrHigh: 170,
      });
    } else if (preset === 'TRAUMA') {
      setLimits({
        spo2Low: 92,
        etco2Low: 32,
        etco2High: 45,
        systolicLow: 95,
        systolicHigh: 160,
        diastolicHigh: 100,
        mapLow: 70,
        hrLow: 55,
        hrHigh: 115,
      });
    }
  };

  const handleSave = () => {
    onSaveLimits(limits);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-[#12161c] border-2 border-neutral-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#181d24] border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>CONFIGURACIÓN DE LÍMITES DE ALARMAS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700">
                  IEC 60601-1-8
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Ajuste de umbrales sonoros y visuales para SpO2, EtCO2, Tensión Arterial y FC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets bar */}
        <div className="px-5 py-2.5 bg-[#151a21] border-b border-neutral-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-400 text-[11px]">Presintonías recomendadas:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleApplyPreset('ICU')}
              className="px-2.5 py-1 rounded bg-[#202731] hover:bg-[#2c3543] text-sky-300 border border-sky-800/60 text-[11px] cursor-pointer"
            >
              Adulto UCI/Urgencias
            </button>
            <button
              onClick={() => handleApplyPreset('PEDIATRIC')}
              className="px-2.5 py-1 rounded bg-[#202731] hover:bg-[#2c3543] text-amber-300 border border-amber-800/60 text-[11px] cursor-pointer"
            >
              Pediátrico
            </button>
            <button
              onClick={() => handleApplyPreset('TRAUMA')}
              className="px-2.5 py-1 rounded bg-[#202731] hover:bg-[#2c3543] text-emerald-300 border border-emerald-800/60 text-[11px] cursor-pointer"
            >
              Neuro/Trauma
            </button>
          </div>
        </div>

        {/* Limits Controls Form */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[460px]">
          {/* 1. SpO2 Hypoxemia Limit */}
          <div className="p-3 bg-[#171d24] rounded-xl border border-sky-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-sky-400">SATURACIÓN SpO2 (MÍNIMA)</span>
                <span className="text-[10px] text-neutral-400">Alarma sonora si cae por debajo</span>
              </div>
              <span className="text-lg font-lcd font-bold text-sky-300">
                &lt; {limits.spo2Low}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={75}
                max={96}
                step={1}
                value={limits.spo2Low}
                onChange={(e) => setLimits({ ...limits, spo2Low: Number(e.target.value) })}
                className="flex-1 accent-sky-400 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                {[88, 90, 92, 94].map((val) => (
                  <button
                    key={val}
                    onClick={() => setLimits({ ...limits, spo2Low: val })}
                    className={`px-2 py-0.5 rounded font-mono text-[10px] border cursor-pointer ${
                      limits.spo2Low === val
                        ? 'bg-sky-500 text-black font-bold border-sky-300'
                        : 'bg-[#212833] text-neutral-300 border-neutral-700'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Capnography EtCO2 Limits */}
          <div className="p-3 bg-[#171d24] rounded-xl border border-yellow-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-yellow-400">CAPNOGRAFÍA (EtCO2)</span>
              <span className="text-xs font-mono text-neutral-400">
                Límites: <strong className="text-yellow-300 font-lcd text-sm">{limits.etco2Low} - {limits.etco2High}</strong> mmHg
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#1e242d] p-2 rounded-lg border border-neutral-700/60">
                <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-neutral-400">
                  <span>Hipocapnia Mín:</span>
                  <span className="font-bold text-yellow-300 font-lcd text-sm">{limits.etco2Low} mmHg</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={35}
                  step={1}
                  value={limits.etco2Low}
                  onChange={(e) => setLimits({ ...limits, etco2Low: Number(e.target.value) })}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
              </div>

              <div className="bg-[#1e242d] p-2 rounded-lg border border-neutral-700/60">
                <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-neutral-400">
                  <span>Hipercapnia Máx:</span>
                  <span className="font-bold text-yellow-300 font-lcd text-sm">{limits.etco2High} mmHg</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={65}
                  step={1}
                  value={limits.etco2High}
                  onChange={(e) => setLimits({ ...limits, etco2High: Number(e.target.value) })}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 3. Blood Pressure (TA / NIBP) Limits */}
          <div className="p-3 bg-[#171d24] rounded-xl border border-neutral-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-neutral-200">TENSIÓN ARTERIAL (PANI / TA)</span>
              <span className="text-xs font-mono text-neutral-400">
                Hipotensión &lt; <strong className="text-rose-300 font-lcd text-sm">{limits.systolicLow}</strong> | HTA &gt; <strong className="text-amber-300 font-lcd text-sm">{limits.systolicHigh}</strong> mmHg
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="bg-[#1e242d] p-2 rounded-lg border border-neutral-700/60">
                <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-neutral-400">
                  <span>PAS Mín:</span>
                  <span className="font-bold text-rose-300 font-lcd">{limits.systolicLow}</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={110}
                  step={5}
                  value={limits.systolicLow}
                  onChange={(e) => setLimits({ ...limits, systolicLow: Number(e.target.value) })}
                  className="w-full accent-rose-400 cursor-pointer"
                />
              </div>

              <div className="bg-[#1e242d] p-2 rounded-lg border border-neutral-700/60">
                <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-neutral-400">
                  <span>PAM Mín:</span>
                  <span className="font-bold text-rose-300 font-lcd">{limits.mapLow}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={75}
                  step={1}
                  value={limits.mapLow}
                  onChange={(e) => setLimits({ ...limits, mapLow: Number(e.target.value) })}
                  className="w-full accent-rose-400 cursor-pointer"
                />
              </div>

              <div className="bg-[#1e242d] p-2 rounded-lg border border-neutral-700/60">
                <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-neutral-400">
                  <span>PAS Máx:</span>
                  <span className="font-bold text-amber-300 font-lcd">{limits.systolicHigh}</span>
                </div>
                <input
                  type="range"
                  min={140}
                  max={220}
                  step={5}
                  value={limits.systolicHigh}
                  onChange={(e) => setLimits({ ...limits, systolicHigh: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 4. Heart Rate (FC) Limits */}
          <div className="p-3 bg-[#171d24] rounded-xl border border-emerald-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-emerald-400">FRECUENCIA CARDÍACA (FC)</span>
              <span className="text-xs font-mono text-neutral-400">
                Bradicardia &lt; <strong className="text-emerald-300 font-lcd text-sm">{limits.hrLow}</strong> | Taquicardia &gt; <strong className="text-emerald-300 font-lcd text-sm">{limits.hrHigh}</strong> lpm
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#1e242d] p-2 rounded-lg border border-neutral-700/60">
                <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-neutral-400">
                  <span>FC Mínima:</span>
                  <span className="font-bold text-emerald-300 font-lcd text-sm">{limits.hrLow} lpm</span>
                </div>
                <input
                  type="range"
                  min={35}
                  max={70}
                  step={5}
                  value={limits.hrLow}
                  onChange={(e) => setLimits({ ...limits, hrLow: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="bg-[#1e242d] p-2 rounded-lg border border-neutral-700/60">
                <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-neutral-400">
                  <span>FC Máxima:</span>
                  <span className="font-bold text-emerald-300 font-lcd text-sm">{limits.hrHigh} lpm</span>
                </div>
                <input
                  type="range"
                  min={110}
                  max={180}
                  step={5}
                  value={limits.hrHigh}
                  onChange={(e) => setLimits({ ...limits, hrHigh: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-[#181d24] border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222831] hover:bg-[#2c3440] text-neutral-300 text-xs font-mono border border-neutral-700 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Fábrica</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#222831] hover:bg-[#2c3440] text-neutral-300 text-xs font-mono border border-neutral-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar Límites</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
