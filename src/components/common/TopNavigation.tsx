/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { QrCode, Monitor, Sliders, Split, FileText, Home, RotateCcw } from 'lucide-react';

interface TopNavigationProps {
  currentView: 'portal' | 'student' | 'instructor' | 'split';
  onChangeView: (view: 'portal' | 'student' | 'instructor' | 'split') => void;
  onOpenQrModal: () => void;
  onOpenSampleModal: () => void;
  onMasterReset: () => void;
  roomId: string;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentView,
  onChangeView,
  onOpenQrModal,
  onOpenSampleModal,
  onMasterReset,
  roomId,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  return (
    <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3 bg-[#0d1014] border-b border-neutral-800 select-none text-neutral-100">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onChangeView('portal')}
          className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer group"
          title="Volver a la Pantalla Inicial de Selección de Rol"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] group-hover:scale-125 transition-transform" />
          <span className="font-mono">TRAKAS-3000</span>
          <span className="text-neutral-500 font-normal text-xs hidden sm:inline">Monitor Desfibrilador</span>
        </button>
      </div>

      {/* Zone 2: 4–5 clean single-line navigation buttons/links */}
      <nav className="flex items-center gap-1.5 sm:gap-3 text-xs font-medium text-neutral-300 overflow-x-auto">
        <button
          onClick={() => onChangeView('portal')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
            currentView === 'portal'
              ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
              : 'hover:text-white text-neutral-400'
          }`}
          title="Pantalla de Selección"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Inicio</span>
        </button>

        <button
          onClick={() => onChangeView('student')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
            currentView === 'student'
              ? 'bg-emerald-950 text-emerald-400 font-bold border border-emerald-700/80'
              : 'hover:text-white text-neutral-300'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Monitor Alumno</span>
        </button>

        <button
          onClick={() => onChangeView('instructor')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
            currentView === 'instructor'
              ? 'bg-amber-950 text-amber-400 font-bold border border-amber-700/80'
              : 'hover:text-white text-neutral-300'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Facilitador</span>
        </button>

        <button
          onClick={() => onChangeView('split')}
          className={`hidden md:flex px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 items-center gap-1.5 cursor-pointer ${
            currentView === 'split'
              ? 'bg-neutral-800 text-sky-400 font-bold border border-neutral-700'
              : 'hover:text-white text-neutral-300'
          }`}
        >
          <Split className="w-3.5 h-3.5" />
          <span>Vista Dividida</span>
        </button>

        <button
          onClick={onOpenSampleModal}
          className="px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 hover:text-white text-neutral-300 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Caso & SAMPLE</span>
          <span className="sm:hidden">SAMPLE</span>
        </button>
      </nav>

      {/* Zone 3: Master Reset + Primary Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {showConfirmReset ? (
          <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-600 px-2 py-1 rounded-lg animate-pulse">
            <span className="text-[11px] font-bold text-rose-300">¿Borrar todo y reiniciar?</span>
            <button
              onClick={() => {
                onMasterReset();
                setShowConfirmReset(false);
              }}
              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded transition-colors cursor-pointer"
            >
              Sí, Reiniciar
            </button>
            <button
              onClick={() => setShowConfirmReset(false)}
              className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] rounded transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmReset(true)}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Borrar todos los datos, silenciar audio y reiniciar la simulación a su estado inicial de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Reiniciar Todo</span>
            <span className="sm:hidden">Reset</span>
          </button>
        )}

        <button
          onClick={onOpenQrModal}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Acceso QR Alumnos</span>
          <span className="sm:hidden">QR #{roomId.slice(0, 4)}</span>
        </button>
      </div>
    </header>
  );
};
