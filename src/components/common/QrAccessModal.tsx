/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, QrCode as QrIcon, Copy, Check, Users, ExternalLink } from 'lucide-react';

interface QrAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onStudentJoin?: (name: string, role: string) => void;
}

export const QrAccessModal: React.FC<QrAccessModalProps> = ({
  isOpen,
  onClose,
  roomId,
  onStudentJoin,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentRole, setStudentRole] = useState('Líder de Reanimación');

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${roomId}&role=student`
    : `https://zoll-sim.app/?room=${roomId}&role=student`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(joinUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [isOpen, joinUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName.trim() && onStudentJoin) {
      onStudentJoin(studentName.trim(), studentRole);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#181b1f] border border-neutral-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="p-4 bg-[#21262d] border-b border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-emerald-400">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-100">ACCESO INSTANTÁNEO A LA SESIÓN</h3>
              <p className="text-[11px] text-neutral-400 font-mono">SALA: #{roomId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* QR Code Presentation Box */}
          <div className="flex flex-col items-center justify-center bg-[#131518] p-5 rounded-xl border border-neutral-800">
            {qrDataUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-lg border border-neutral-300">
                <img
                  src={qrDataUrl}
                  alt={`QR para sala ${roomId}`}
                  className="w-48 h-48 block rounded-lg"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-neutral-900 rounded-xl flex items-center justify-center text-neutral-500 text-xs">
                Generando código QR...
              </div>
            )}
            <p className="text-xs text-neutral-400 text-center mt-3 max-w-xs">
              Los estudiantes pueden escanear este código con su teléfono o tablet para ver el Monitor Clínico en tiempo real.
            </p>
          </div>

          {/* Copy Link Strip */}
          <div className="flex items-center gap-2 bg-[#21262d] p-2 rounded-lg border border-neutral-700">
            <span className="text-xs font-mono text-neutral-300 truncate flex-1 pl-2">
              {joinUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white rounded text-xs font-medium flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          {/* Student Access & Role Registration Form */}
          <form onSubmit={handleRegister} className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Registro de Alumno / Operador</span>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Nombre Completo del Alumno</label>
              <input
                type="text"
                placeholder="Ej. Dra. Martínez / Enf. Gómez"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 bg-[#101215] border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Rol Asignado en el Equipo de Reanimación</label>
              <select
                value={studentRole}
                onChange={(e) => setStudentRole(e.target.value)}
                className="w-full px-3 py-2 bg-[#101215] border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 font-sans"
              >
                <option value="Líder de Reanimación (Code Leader)">Líder de Reanimación (Code Leader)</option>
                <option value="Operador del Monitor / Desfibrilador">Operador del Monitor / Desfibrilador</option>
                <option value="Compresor Torácico (RCP)">Compresor Torácico (RCP)</option>
                <option value="Vía Aérea y Ventilación">Vía Aérea y Ventilación</option>
                <option value="Acceso Vascular y Farmacología">Acceso Vascular y Farmacología</option>
                <option value="Registro y Cronometrista">Registro y Cronometrista</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-semibold text-xs rounded-lg transition-colors uppercase tracking-wider"
            >
              Acceder a la Simulación
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
