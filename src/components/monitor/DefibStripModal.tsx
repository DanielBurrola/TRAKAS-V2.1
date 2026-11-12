/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SimulationLogEvent, VitalSigns, CardiacRhythmType } from '../../types/medical';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';

interface DefibStripModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SimulationLogEvent[];
  currentRhythm: CardiacRhythmType;
  vitals: VitalSigns;
  totalShocks: number;
  scenarioTimeFormatted: string;
}

export const DefibStripModal: React.FC<DefibStripModalProps> = ({
  isOpen,
  onClose,
  logs,
  currentRhythm,
  vitals,
  totalShocks,
  scenarioTimeFormatted,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1b1e22] border border-neutral-700 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-neutral-100">
        {/* Modal Header */}
        <div className="p-4 bg-[#23272d] border-b border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base tracking-wide text-neutral-100 font-mono">
              TRAKAS-3000 CODE SUMMARY™ · REGISTRO CLÍNICO
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono rounded flex items-center gap-1.5 border border-neutral-600"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>IMPRIMIR / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Strip Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[#0f1113]">
          {/* Authentic Pink Thermal ECG Paper Strip Simulation */}
          <div className="ecg-paper-pink border border-rose-300 rounded-lg p-5 shadow-inner text-neutral-900 font-mono">
            <div className="flex items-center justify-between border-b-2 border-red-400/60 pb-3 mb-4">
              <div>
                <div className="font-extrabold text-base tracking-wider text-red-950">
                  TRAKAS-3000 MEDICAL SYSTEMS · RESCUE CCT
                </div>
                <div className="text-xs text-red-800">
                  DESFIBRILADOR / MONITOR BIFÁSICO MANUAL Y MARCAPASOS
                </div>
              </div>
              <div className="text-right text-xs text-red-900">
                <div>TIEMPO DE CÓDIGO: {scenarioTimeFormatted}</div>
                <div>FECHA: {new Date().toLocaleDateString()}</div>
                <div>IMPEDANCIA MEDIA: 72 OHMS</div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-red-100/70 p-3 rounded border border-red-300 mb-4 text-xs font-bold text-red-950">
              <div>RITMO ACTUAL: {currentRhythm}</div>
              <div>FC: {vitals.heartRate} lpm</div>
              <div>SpO2: {vitals.spO2}%</div>
              <div>DESCARGAS TOTALES: {totalShocks}</div>
            </div>

            {/* Chronological Interventions Log Table */}
            <div className="mt-3">
              <div className="text-xs font-extrabold text-red-950 uppercase border-b border-red-400 pb-1 mb-2">
                CRONOLOGÍA DE INTERVENCIONES Y EVENTOS REGISTRADOS
              </div>
              {logs.length === 0 ? (
                <div className="text-xs text-red-800/80 italic py-3 text-center">
                  Sin eventos registrados en la sesión actual.
                </div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between py-1 border-b border-red-200/80"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-900 min-w-16">[{log.time}]</span>
                        <span
                          className={`font-semibold px-1.5 py-0.2 rounded text-[11px] ${
                            log.type === 'SHOCK'
                              ? 'bg-red-600 text-white'
                              : log.type === 'DRUG'
                              ? 'bg-blue-600 text-white'
                              : log.type === 'AIRWAY'
                              ? 'bg-amber-600 text-white'
                              : 'bg-neutral-800 text-white'
                          }`}
                        >
                          {log.type}
                        </span>
                        <span className="text-red-950">{log.description}</span>
                      </div>
                      {log.details && <span className="text-[11px] text-red-800 italic">{log.details}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="mt-6 pt-3 border-t border-red-400/60 text-[10px] text-red-800 flex items-center justify-between">
              <span>DOCUMENTO DE ENTRENAMIENTO CLÍNICO SEGÚN GUIAS AHA / ERC</span>
              <span>CALIBRACIÓN ESTÁNDAR 25mm/s · 10mm/mV</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#23272d] border-t border-neutral-700 flex items-center justify-between text-xs text-neutral-400">
          <span>El resumen de eventos se sincroniza con el panel de evaluación del instructor.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded font-medium"
          >
            Cerrar Tira
          </button>
        </div>
      </div>
    </div>
  );
};
