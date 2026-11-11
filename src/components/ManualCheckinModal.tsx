import React, { useState } from 'react';
import { Student, GateLocation, AttendanceStatus } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { Sliders, X, CheckCircle2 } from 'lucide-react';

interface ManualCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualCheckinModal: React.FC<ManualCheckinModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [type, setType] = useState<'MASUK' | 'PULANG'>('MASUK');
  const [status, setStatus] = useState<AttendanceStatus>('TEPAT_WAKTU');
  const [gateLocation, setGateLocation] = useState<GateLocation>('pintu_depan');
  const [notes, setNotes] = useState<string>('Kartu Pelajar Ketinggalan di Rumah');

  if (!isOpen) return null;

  const students = AttendanceStorage.getStudents();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }

    const res = AttendanceStorage.createManualAttendance(
      selectedStudentId,
      type,
      status,
      gateLocation,
      notes
    );

    if (res.success) {
      alert(res.message);
      onSuccess();
      onClose();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-extrabold text-white">Absensi Manual (Ketinggalan Kartu)</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih Siswa</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">-- Pilih Siswa --</option>
              {students.map(std => (
                <option key={std.id} value={std.id}>
                  {std.name} ({std.class}) - NISN: {std.nisn || '-'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipe Absensi</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'MASUK' | 'PULANG')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="MASUK">Absen MASUK</option>
                <option value="PULANG">Absen PULANG</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status Absen</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="TEPAT_WAKTU">Tepat Waktu</option>
                <option value="TERLAMBAT">Terlambat</option>
                <option value="IZIN">Izin</option>
                <option value="SAKIT">Sakit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Titik Lokasi Gate</label>
            <select
              value={gateLocation}
              onChange={(e) => setGateLocation(e.target.value as GateLocation)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="pintu_depan">Pintu Depan</option>
              <option value="pintu_belakang">Pintu Belakang</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Alasan / Catatan Guru</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Absensi</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
