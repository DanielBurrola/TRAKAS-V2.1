/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ClinicalScenario } from '../../types/medical';
import {
  X,
  FileText,
  AlertCircle,
  Maximize2,
  Minimize2,
  Tv,
  Activity,
  CheckCircle2,
  Edit3,
  Save,
  RotateCcw,
} from 'lucide-react';

interface SampleHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: ClinicalScenario;
  isProjected?: boolean;
  onToggleProjection?: () => void;
  onUpdateScenario?: (updated: ClinicalScenario) => void;
  isInstructor?: boolean;
}

export const SampleHistoryModal: React.FC<SampleHistoryModalProps> = ({
  isOpen,
  onClose,
  scenario,
  isProjected = false,
  onToggleProjection,
  onUpdateScenario,
  isInstructor = true,
}) => {
  const [activeTab, setActiveTab] = useState<'sample' | 'xabcde' | 'reversible' | 'physiology' | 'critical'>('sample');
  const [isProjectorView, setIsProjectorView] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ClinicalScenario>(scenario);

  useEffect(() => {
    setFormData(scenario);
  }, [scenario]);

  if (!isOpen) return null;

  const handleSaveEdits = () => {
    if (onUpdateScenario) {
      onUpdateScenario(formData);
    }
    setIsEditing(false);
  };

  const handleCancelEdits = () => {
    setFormData(scenario);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-5 select-none animate-in fade-in duration-150">
      <div
        className={`bg-[#14171c] border border-neutral-700 w-full rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-100 transition-all ${
          isProjectorView ? 'max-w-6xl h-[96vh]' : 'max-w-4xl max-h-[92vh]'
        }`}
      >
        {/* Modal Top Bar */}
        <div className="p-3.5 sm:p-4 bg-[#1b2027] border-b border-neutral-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="p-2 bg-emerald-950/80 border border-emerald-600/70 rounded-xl text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>

            {isEditing ? (
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#111418] border border-neutral-600 rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                  placeholder="Título del caso clínico"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-neutral-400">Edad:</span>
                  <input
                    type="number"
                    value={formData.patientAge}
                    onChange={(e) => setFormData({ ...formData, patientAge: parseInt(e.target.value) || 0 })}
                    className="w-16 bg-[#111418] border border-neutral-600 rounded px-1.5 py-0.5 text-xs text-white"
                  />
                  <span className="text-neutral-400">Género:</span>
                  <select
                    value={formData.patientGender}
                    onChange={(e) => setFormData({ ...formData, patientGender: e.target.value as 'Masculino' | 'Femenino' })}
                    className="bg-[#111418] border border-neutral-600 rounded px-1.5 py-0.5 text-xs text-white"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                  <span className="text-neutral-400">Peso (kg):</span>
                  <input
                    type="number"
                    value={formData.patientWeightKg}
                    onChange={(e) => setFormData({ ...formData, patientWeightKg: parseInt(e.target.value) || 0 })}
                    className="w-16 bg-[#111418] border border-neutral-600 rounded px-1.5 py-0.5 text-xs text-white"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-white font-sans">
                    {formData.title}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase font-semibold">
                    {formData.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {formData.difficulty}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                  Paciente: <strong className="text-neutral-200">{formData.patientAge} años</strong> · {formData.patientGender} ({formData.patientWeightKg} kg) · Motivo: <span className="text-emerald-300 font-sans">{formData.chiefComplaint}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Mode Toggle for Facilitator */}
            {isInstructor && onUpdateScenario && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-[#252c36] hover:bg-[#2f3846] text-amber-300 hover:text-amber-200 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 border border-amber-600/60 cursor-pointer transition-colors"
                title="Modificar datos, nombre, edad, SAMPLE y XABCDE del paciente en tiempo real"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>EDITAR CASO</span>
              </button>
            )}

            {isEditing && (
              <>
                <button
                  onClick={handleSaveEdits}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 border border-emerald-400 shadow-md cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>GUARDAR</span>
                </button>
                <button
                  onClick={handleCancelEdits}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono rounded-lg border border-neutral-600 cursor-pointer"
                >
                  Cancelar
                </button>
              </>
            )}

            {/* Projection Toggle Button */}
            {onToggleProjection && (
              <button
                onClick={onToggleProjection}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isProjected
                    ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse'
                    : 'bg-[#1e2329] hover:bg-[#282f37] text-neutral-300 border-neutral-700'
                }`}
                title="Habilitar que el alumno vea esta ficha clínica directamente en su monitor"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>{isProjected ? 'PROYECTANDO' : 'PROYECTAR'}</span>
              </button>
            )}

            <button
              onClick={() => setIsProjectorView(!isProjectorView)}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-neutral-600 cursor-pointer"
            >
              {isProjectorView ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isProjectorView ? 'Normal' : 'Maximizar'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-2.5 bg-[#171b21] border-b border-neutral-700 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('sample')}
            className={`px-3.5 py-2 rounded-t-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sample'
                ? 'bg-[#14171c] text-emerald-400 border-t-2 border-emerald-500 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Historial SAMPLE
          </button>
          <button
            onClick={() => setActiveTab('xabcde')}
            className={`px-3.5 py-2 rounded-t-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'xabcde'
                ? 'bg-[#14171c] text-emerald-400 border-t-2 border-emerald-500 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Evaluación Primaria XABCDE
          </button>
          <button
            onClick={() => setActiveTab('reversible')}
            className={`px-3.5 py-2 rounded-t-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reversible'
                ? 'bg-[#14171c] text-emerald-400 border-t-2 border-emerald-500 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            5 Hs y 5 Ts (ILCOR / ECSI 2025)
          </button>
          <button
            onClick={() => setActiveTab('physiology')}
            className={`px-3.5 py-2 rounded-t-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'physiology'
                ? 'bg-[#14171c] text-emerald-400 border-t-2 border-emerald-500 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Fisiología del Monitor TRAKAS-3000
          </button>
          <button
            onClick={() => setActiveTab('critical')}
            className={`px-3.5 py-2 rounded-t-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'critical'
                ? 'bg-[#14171c] text-emerald-400 border-t-2 border-emerald-500 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Puntos Críticos AHA / ERC / ECSI
          </button>
        </div>

        {/* Modal Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#0f1115] space-y-4">
          {/* TAB 1: SAMPLE HISTORY */}
          {activeTab === 'sample' && (
            <div className="space-y-4">
              <div className="bg-[#171a20] p-3 rounded-xl border border-neutral-800 text-xs text-neutral-300">
                {isEditing ? (
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 font-mono font-bold uppercase">Resumen Clínico:</label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-white"
                      rows={2}
                    />
                  </div>
                ) : (
                  <span>Resumen del caso: <strong className="text-white">{formData.summary}</strong></span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* S */}
                <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700/80">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 font-extrabold flex items-center justify-center font-mono text-sm">
                      S
                    </span>
                    <h4 className="font-bold text-sm text-neutral-200">Signos y Síntomas (Signs & Symptoms)</h4>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={formData.sample.signosSintomas}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sample: { ...formData.sample, signosSintomas: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200"
                      rows={3}
                    />
                  ) : (
                    <p className="text-xs text-neutral-300 leading-relaxed pl-9">
                      {formData.sample.signosSintomas}
                    </p>
                  )}
                </div>

                {/* A */}
                <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700/80">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg bg-rose-950 border border-rose-700 text-rose-400 font-extrabold flex items-center justify-center font-mono text-sm">
                      A
                    </span>
                    <h4 className="font-bold text-sm text-neutral-200">Alergias (Allergies)</h4>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={formData.sample.alergias}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sample: { ...formData.sample, alergias: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200"
                      rows={3}
                    />
                  ) : (
                    <p className="text-xs text-neutral-300 leading-relaxed pl-9">
                      {formData.sample.alergias}
                    </p>
                  )}
                </div>

                {/* M */}
                <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700/80">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-700 text-sky-400 font-extrabold flex items-center justify-center font-mono text-sm">
                      M
                    </span>
                    <h4 className="font-bold text-sm text-neutral-200">Medicamentos Habituales (Medications)</h4>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={formData.sample.medicamentos}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sample: { ...formData.sample, medicamentos: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200"
                      rows={3}
                    />
                  ) : (
                    <p className="text-xs text-neutral-300 leading-relaxed pl-9">
                      {formData.sample.medicamentos}
                    </p>
                  )}
                </div>

                {/* P */}
                <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700/80">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-700 text-amber-400 font-extrabold flex items-center justify-center font-mono text-sm">
                      P
                    </span>
                    <h4 className="font-bold text-sm text-neutral-200">Pasado Médico / Patologías (Past Medical History)</h4>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={formData.sample.patologiasPrevias}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sample: { ...formData.sample, patologiasPrevias: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200"
                      rows={3}
                    />
                  ) : (
                    <p className="text-xs text-neutral-300 leading-relaxed pl-9">
                      {formData.sample.patologiasPrevias}
                    </p>
                  )}
                </div>

                {/* L */}
                <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700/80">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-400 font-extrabold flex items-center justify-center font-mono text-sm">
                      L
                    </span>
                    <h4 className="font-bold text-sm text-neutral-200">Última Ingesta (Last Oral Intake)</h4>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={formData.sample.lunchUltimaIngesta}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sample: { ...formData.sample, lunchUltimaIngesta: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200"
                      rows={3}
                    />
                  ) : (
                    <p className="text-xs text-neutral-300 leading-relaxed pl-9">
                      {formData.sample.lunchUltimaIngesta}
                    </p>
                  )}
                </div>

                {/* E */}
                <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700/80">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-700 text-purple-400 font-extrabold flex items-center justify-center font-mono text-sm">
                      E
                    </span>
                    <h4 className="font-bold text-sm text-neutral-200">Eventos Desencadenantes (Events Prior)</h4>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={formData.sample.eventosDesencadenantes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sample: { ...formData.sample, eventosDesencadenantes: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200"
                      rows={3}
                    />
                  ) : (
                    <p className="text-xs text-neutral-300 leading-relaxed pl-9">
                      {formData.sample.eventosDesencadenantes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: XABCDE PRIMARY ASSESSMENT */}
          {activeTab === 'xabcde' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-[#171a20] rounded-xl border border-neutral-700/80 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-700 text-rose-400 font-extrabold flex items-center justify-center font-mono text-base shrink-0">
                  X
                </span>
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                    eXsanguinating Hemorrhage (Control de Hemorragia Exanguinante Masiva)
                  </h5>
                  {isEditing ? (
                    <textarea
                      value={formData.xabcde.exsanguinatingHemorrhage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          xabcde: { ...formData.xabcde, exsanguinatingHemorrhage: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200 mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-xs text-neutral-200 leading-relaxed mt-1">
                      {formData.xabcde.exsanguinatingHemorrhage}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[#171a20] rounded-xl border border-neutral-700/80 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-700 text-sky-400 font-extrabold flex items-center justify-center font-mono text-base shrink-0">
                  A
                </span>
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-sky-300 uppercase tracking-wide">
                    Airway & C-Spine (Vía Aérea con Control de Columna Cervical)
                  </h5>
                  {isEditing ? (
                    <textarea
                      value={formData.xabcde.airway}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          xabcde: { ...formData.xabcde, airway: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200 mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-xs text-neutral-200 leading-relaxed mt-1">
                      {formData.xabcde.airway}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[#171a20] rounded-xl border border-neutral-700/80 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 font-extrabold flex items-center justify-center font-mono text-base shrink-0">
                  B
                </span>
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                    Breathing & Ventilation (Buena Ventilación, Auscultación y Capnografía)
                  </h5>
                  {isEditing ? (
                    <textarea
                      value={formData.xabcde.breathing}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          xabcde: { ...formData.xabcde, breathing: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200 mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-xs text-neutral-200 leading-relaxed mt-1">
                      {formData.xabcde.breathing}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[#171a20] rounded-xl border border-neutral-700/80 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-700 text-amber-400 font-extrabold flex items-center justify-center font-mono text-base shrink-0">
                  C
                </span>
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Circulation (Pulsos Centrales/Periféricos, Llenado Capilar y Tensión Arterial)
                  </h5>
                  {isEditing ? (
                    <textarea
                      value={formData.xabcde.circulation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          xabcde: { ...formData.xabcde, circulation: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200 mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-xs text-neutral-200 leading-relaxed mt-1">
                      {formData.xabcde.circulation}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[#171a20] rounded-xl border border-neutral-700/80 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-700 text-purple-400 font-extrabold flex items-center justify-center font-mono text-base shrink-0">
                  D
                </span>
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                    Disability (Estado Neurológico, Escala Glasgow, Pupilas y Glucemia Capilar)
                  </h5>
                  {isEditing ? (
                    <textarea
                      value={formData.xabcde.disability}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          xabcde: { ...formData.xabcde, disability: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200 mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-xs text-neutral-200 leading-relaxed mt-1">
                      {formData.xabcde.disability}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[#171a20] rounded-xl border border-neutral-700/80 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-300 font-extrabold flex items-center justify-center font-mono text-base shrink-0">
                  E
                </span>
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wide">
                    Exposure & Environment (Exposición Corporal y Control Térmico)
                  </h5>
                  {isEditing ? (
                    <textarea
                      value={formData.xabcde.exposure}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          xabcde: { ...formData.xabcde, exposure: e.target.value },
                        })
                      }
                      className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200 mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-xs text-neutral-200 leading-relaxed mt-1">
                      {formData.xabcde.exposure}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 5 HS & 5 TS REVERSIBLE CAUSES */}
          {activeTab === 'reversible' && (
            <div className="space-y-4">
              <div className="bg-[#171a20] p-3 rounded-xl border border-neutral-800 text-xs text-neutral-300">
                <span>Análisis de etiologías reversibles según las Guías Internacionales ILCOR / AHA / ECSI 2025 para este escenario:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 5 Hs */}
                <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700/80 space-y-3">
                  <h4 className="text-xs font-bold font-mono text-sky-400 uppercase tracking-wider border-b border-neutral-800 pb-2 flex items-center gap-1.5">
                    <span>LAS 5 H</span>
                    <span className="text-[10px] text-neutral-400 font-normal">(Hipovolemia, Hipoxia, H+, Hipo/Hiper K, Hipotermia)</span>
                  </h4>
                  <div className="space-y-2.5">
                    {formData.reversibleCauses.hList.map((h, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#0f1115] border border-neutral-800 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-neutral-200">{h.name}</strong>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              h.present
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {h.present ? 'PRESENTE' : 'DESCARTADA'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">{h.clinicalSigns}</p>
                        <p className="text-[11px] text-emerald-400 font-mono mt-1">➜ Acción: {h.intervention}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5 Ts */}
                <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700/80 space-y-3">
                  <h4 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider border-b border-neutral-800 pb-2 flex items-center gap-1.5">
                    <span>LAS 5 T</span>
                    <span className="text-[10px] text-neutral-400 font-normal">(Tensión neumotórax, Taponamiento, Tóxicos, TEP, Trombosis coronaria)</span>
                  </h4>
                  <div className="space-y-2.5">
                    {formData.reversibleCauses.tList.map((t, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#0f1115] border border-neutral-800 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-neutral-200">{t.name}</strong>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              t.present
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {t.present ? 'PRESENTE' : 'DESCARTADA'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">{t.clinicalSigns}</p>
                        <p className="text-[11px] text-emerald-400 font-mono mt-1">➜ Acción: {t.intervention}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PHYSIOLOGY & MONITOR BEHAVIOR */}
          {activeTab === 'physiology' && (
            <div className="space-y-4">
              <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700 space-y-3">
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Comportamiento Fisiológico en el Monitor TRAKAS-3000</span>
                </h4>
                {isEditing ? (
                  <textarea
                    value={formData.physiologicalNotes}
                    onChange={(e) => setFormData({ ...formData, physiologicalNotes: e.target.value })}
                    className="w-full bg-[#111418] border border-neutral-700 rounded p-2 text-xs text-neutral-200"
                    rows={4}
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">
                    {formData.physiologicalNotes}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#171a20] p-3.5 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-emerald-400 font-mono font-bold block mb-1">CANAL 1 · ECG</span>
                  <p className="text-neutral-300">
                    Ritmo inicial: <strong className="text-white">{formData.initialRhythm}</strong> a {formData.initialVitals.heartRate} lpm. Morfología precisa calibrada con bases de datos PhysioNet PTB-XL y Marriott.
                  </p>
                </div>

                <div className="bg-[#171a20] p-3.5 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-sky-400 font-mono font-bold block mb-1">CANAL 2 · PLETH SpO2</span>
                  <p className="text-neutral-300">
                    Saturación basal: <strong className="text-white">{formData.initialVitals.spO2}%</strong>. Amplitud modulada por la presión de pulso arterial ({formData.initialVitals.systolicBP}/{formData.initialVitals.diastolicBP} mmHg) e incisura dícrota fisiológica.
                  </p>
                </div>

                <div className="bg-[#171a20] p-3.5 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-yellow-400 font-mono font-bold block mb-1">CANAL 3 · CAPNOGRAFÍA</span>
                  <p className="text-neutral-300">
                    EtCO2 basal: <strong className="text-white">{formData.initialVitals.etCO2} mmHg</strong>. Curva en 4 fases reales con meseta alveolar y respuesta instantánea a compresiones de RCP o ROSC.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CRITICAL POINTS & ILCOR / ECSI CHECKLIST */}
          {activeTab === 'critical' && (
            <div className="space-y-4">
              <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700 space-y-3">
                <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Puntos Críticos de Evaluación Clínica (Guías AHA / ERC / ECSI / ILCOR 2025)</span>
                </h4>
                <ul className="space-y-2 pt-1">
                  {formData.criticalPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-200">
                      <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#171a20] p-4 rounded-xl border border-neutral-700 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Conducta Terapéutica Esperada por el Algoritmo</span>
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {formData.suggestedAction}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#1b2027] border-t border-neutral-700 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>TRAKAS-3000 Medical Engine</span>
            <span>·</span>
            <span>Escenario ID: <strong className="text-neutral-200">{formData.id}</strong></span>
            {isInstructor && (
              <span className="text-amber-400 text-[10px] bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                MODO INSTRUCTOR (EDITABLE)
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800 text-white rounded-lg font-medium text-xs cursor-pointer transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
