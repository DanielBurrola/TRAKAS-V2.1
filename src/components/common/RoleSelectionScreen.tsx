/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Monitor,
  Shield,
  Split,
  QrCode,
  Activity,
  Zap,
  ArrowRight,
  Heart,
  Radio,
} from 'lucide-react';

interface RoleSelectionScreenProps {
  onSelectRole: (role: 'student' | 'instructor' | 'split') => void;
  onOpenQrModal: () => void;
  roomId: string;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  onSelectRole,
  onOpenQrModal,
  roomId,
}) => {
  return (
    <div className="min-h-screen bg-[#090b0e] text-neutral-100 flex flex-col justify-between p-4 sm:p-8 select-none relative overflow-hidden">
      {/* Background Subtle ECG Grid and Lighting Accent */}
      <div className="absolute inset-0 ecg-grid-dark opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <div className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <Activity className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-mono flex items-center gap-2">
              <span>TRAKAS-3000</span>
              <span className="text-[10px] font-sans font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded uppercase">
                Edición Médica 2025
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Simulador Clínico Profesional de Monitor Desfibrilador y Marcapasos Transcutáneo
            </p>
          </div>
        </div>

        <button
          onClick={onOpenQrModal}
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#14181e] hover:bg-[#1c222b] border border-neutral-700 text-xs font-mono text-neutral-300 transition-colors cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>SALA #{roomId}</span>
        </button>
      </div>

      {/* Main Choice Section */}
      <div className="relative z-10 max-w-5xl w-full mx-auto my-auto py-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Selecciona tu Rol en la Simulación
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Ingresa como estudiante para operar el monitor desfibrilador en tiempo real o como instructor para dirigir el escenario y la evolución del paciente.
          </p>
        </div>

        {/* The Two Main Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: ALUMNO (Monitor Clínico TRAKAS-3000) */}
          <div
            onClick={() => onSelectRole('student')}
            className="group relative bg-[#12151b] hover:bg-[#161b23] border-2 border-neutral-800 hover:border-emerald-500 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                <Monitor className="w-7 h-7" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Pantalla del Alumno
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  MONITOR TRAKAS-3000
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-6">
                Interfaz de telemetría médica en vivo con osciloscopio de 3 canales (ECG 12 derivaciones, pletismografía SpO2 y capnografía EtCO2), conmutador de palas/parches, desfibrilador manual de 5 a 360J, cardioversión SYNC y marcapasos transcutáneo táctil.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-neutral-300 mb-6 bg-[#0a0d11] p-3 rounded-xl border border-neutral-800/80">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Desfibrilador 1-2-3</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-400" />
                  <span>Marcapasos ppm/mA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>Modo SYNC Rombos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tira de Eventos</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectRole('student')}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors font-sans text-sm tracking-wide cursor-pointer"
            >
              <span>Ingresar como Alumno (Monitor Clínico)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: FACILITADOR (Consola del Instructor) */}
          <div
            onClick={() => onSelectRole('instructor')}
            className="group relative bg-[#12151b] hover:bg-[#161b23] border-2 border-neutral-800 hover:border-amber-500 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  Consola del Facilitador
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  INSTRUCTOR DOCENTE
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-6">
                Panel de control limpio en pestañas para gestión de escenarios clínicos. Ajuste fino de signos vitales (+ / -), inyección de arritmias letales y motor de evolución para hacer mejorar o empeorar al paciente según las intervenciones del alumno.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-neutral-300 mb-6 bg-[#0a0d11] p-3 rounded-xl border border-neutral-800/80">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Arritmias Base (FV/TV)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mejorar / Empeorar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>Vía Aérea & Drogas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>Rúbrica Megacode</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectRole('instructor')}
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors font-sans text-sm tracking-wide cursor-pointer"
            >
              <span>Ingresar como Facilitador (Instructor)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Secondary Dual Screen Switcher */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
          <button
            onClick={() => onSelectRole('split')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14181f] hover:bg-[#1d232e] border border-neutral-700 text-neutral-300 transition-colors cursor-pointer"
          >
            <Split className="w-4 h-4 text-emerald-400" />
            <span>Abrir en <strong>Vista Dividida</strong> (Monitor Alumno y Consola Facilitador juntos)</span>
          </button>

          <button
            onClick={onOpenQrModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14181f] hover:bg-[#1d232e] border border-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-sky-400" />
            <span>Compartir Código QR con Estudiantes</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto pt-6 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
        <span>TRAKAS-3000 · Sistema de Entrenamiento Clínico Avanzado</span>
        <span>Alineado con directrices AHA, ERC e ILCOR 2025</span>
      </footer>
    </div>
  );
};
