import React from 'react';
import { 
  CalendarCheck2, 
  Database, 
  Sparkles, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  X, 
  ShieldCheck,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { DailyAttendanceRecap } from '../types';

interface DayRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  previousDate: string;
  newDate: string;
  recap?: DailyAttendanceRecap | null;
  onViewReports?: () => void;
}

export const DayRolloverModal: React.FC<DayRolloverModalProps> = ({
  isOpen,
  onClose,
  previousDate,
  newDate,
  recap,
  onViewReports
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/40 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header with Gradient Accent */}
        <div className="p-6 bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900 border-b border-emerald-500/20 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Pergantian Hari Otomatis
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Database className="w-3 h-3" /> Auto-Saved
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                Sesi Absensi Baru Telah Dimulai
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-200 text-sm">
          
          {/* Status Message Box */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Data Absensi Kemarin Tersimpan Aman & Tampilan Hari Ini Direset ke 0</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Sistem telah mendeteksi pergantian tanggal. Data absensi tanggal <strong className="text-white font-medium">{previousDate}</strong> telah otomatis diarsipkan ke database Firestore untuk pembuatan laporan berkala, dan catatan absensi hari ini <strong className="text-emerald-300 font-medium">({newDate})</strong> telah dimulai dari awal secara bersih.
            </p>
          </div>

          {/* Date Transition Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col justify-between">
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Hari Sebelumnya (Tersimpan / Diarsipkan)
              </div>
              <div className="text-base font-bold text-white tracking-wide">
                {previousDate}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                Tersimpan di Cloud Database
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between">
              <div className="text-xs text-emerald-300 font-medium flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Hari Ini (Aktif & Reset dari 0)
              </div>
              <div className="text-base font-bold text-emerald-200 tracking-wide">
                {newDate}
              </div>
              <div className="text-xs text-emerald-400/80 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Siap Melayani Tap Masuk & Pulang
              </div>
            </div>
          </div>

          {/* Recap Summary Stats (If available) */}
          {recap && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Ringkasan Arsip Tanggal {previousDate}</span>
                <span className="text-emerald-400 font-mono">Total {recap.totalRecordsCount} Log Tap</span>
              </div>

              {/* Student Recap Mini Grid */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  <span>Statistik Kehadiran Siswa</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <div className="text-xs text-slate-400">Total Hadir</div>
                    <div className="text-base font-bold text-emerald-400">{recap.studentStats.totalPresentToday}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <div className="text-xs text-slate-400">Tepat Waktu</div>
                    <div className="text-base font-bold text-blue-400">{recap.studentStats.totalOnTime}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <div className="text-xs text-slate-400">Terlambat</div>
                    <div className="text-base font-bold text-amber-400">{recap.studentStats.totalLate}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <div className="text-xs text-slate-400">Alpha / Belum</div>
                    <div className="text-base font-bold text-rose-400">{recap.studentStats.totalAlpha}</div>
                  </div>
                </div>
              </div>

              {/* Teacher Recap Mini Grid */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Briefcase className="w-4 h-4 text-purple-400" />
                  <span>Statistik Kehadiran Guru & PTK</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <div className="text-xs text-slate-400">Total Guru Hadir</div>
                    <div className="text-base font-bold text-purple-400">{recap.teacherStats.totalPresentToday}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <div className="text-xs text-slate-400">Tepat Waktu</div>
                    <div className="text-base font-bold text-blue-400">{recap.teacherStats.totalOnTime}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <div className="text-xs text-slate-400">Terlambat</div>
                    <div className="text-base font-bold text-amber-400">{recap.teacherStats.totalLate}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guarantee Highlights */}
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Jaminan Keamanan Data Absensi:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 ml-1">
              <li>Data kemarin tetap tersimpan utuh dan dapat dilihat pada menu Laporan Rekapitulasi & Kedisiplinan.</li>
              <li>Layar Kiosk dan Dashboard Piket bersih dari sisa data kemarin dan siap mencatat kehadiran hari ini.</li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-3">
          {onViewReports ? (
            <button
              onClick={() => {
                onClose();
                onViewReports();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              Buka Laporan Rekap
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <span>Mengerti & Lanjutkan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
