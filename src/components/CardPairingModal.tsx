import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { CreditCard, X, Check, Wifi } from 'lucide-react';

interface CardPairingModalProps {
  student: Student | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CardPairingModal: React.FC<CardPairingModalProps> = ({
  student,
  onClose,
  onSuccess
}) => {
  const [rfidUid, setRfidUid] = useState<string>('');

  useEffect(() => {
    if (student) {
      setRfidUid(student.rfidUid);
    }
  }, [student]);

  if (!student) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfidUid.trim()) {
      alert('Masukkan UID Kartu RFID!');
      return;
    }

    const cleanUid = rfidUid.trim().toUpperCase();
    const duplicateCheck = AttendanceStorage.isRfidUidTaken(cleanUid, 'student', student.id);
    if (duplicateCheck.taken) {
      alert(`⚠️ UID Kartu [${cleanUid}] tidak dapat digunakan!\nAlasan: ${duplicateCheck.reason}`);
      return;
    }

    const updatedStudent: Student = {
      ...student,
      rfidUid: cleanUid
    };

    AttendanceStorage.updateStudent(updatedStudent);
    alert(`Berhasil mendaftarkan kartu RFID [${updatedStudent.rfidUid}] untuk ${student.name}!`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
        
        <div className="flex justify-end">
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
          <CreditCard className="w-8 h-8 animate-pulse" />
        </div>

        <div>
          <h3 className="text-lg font-black text-white">Pasangkan Kartu RFID Pelajar</h3>
          <p className="text-xs text-slate-400 mt-1">
            Tempelkan kartu RFID baru ke alat pembaca atau ketik UID kartu secara manual.
          </p>
        </div>

        {/* Student Profile Overview */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left flex items-center gap-3">
          <img
            src={student.avatarUrl || (student.gender === 'P' ? "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80")}
            alt={student.name}
            className="w-12 h-12 rounded-xl object-cover border border-slate-700"
          />
          <div>
            <p className="font-extrabold text-white text-sm">{student.name}</p>
            <p className="text-xs text-slate-400">{student.class} • NISN: {student.nisn || '-'}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-left">
          
          <div>
            <label className="block text-xs font-semibold text-amber-400 mb-1">
              Kode UID Kartu RFID
            </label>
            <div className="relative">
              <input
                type="text"
                value={rfidUid}
                onChange={(e) => setRfidUid(e.target.value)}
                placeholder="Tempelkan kartu ke reader (e.g. 0008451293)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                autoFocus
                required
              />
              <Wifi className="w-4 h-4 text-amber-400 absolute right-3 top-3.5 animate-pulse" />
            </div>
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
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Kartu RFID</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
