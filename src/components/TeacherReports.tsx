import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, SchoolSchedule, AttendanceRecord, PairedDailyAttendance } from '../types';
import { AttendanceStorage } from '../lib/storage';
import {
  exportTeacherAttendanceToExcel,
  exportTeacherAttendanceToCSV,
  printTeacherAttendanceReport,
  pairAttendanceRecords
} from '../lib/exportUtils';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  CalendarDays,
  CalendarRange,
  Sliders,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  LogOut,
  Building2,
  RotateCcw,
  UserCheck,
  Award
} from 'lucide-react';

interface TeacherReportsProps {
  schedule: SchoolSchedule;
  showToast: (msg: string) => void;
  onNavigateTab: (tab: 'reports' | 'discipline_reports' | 'teacher_reports' | 'backup') => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const TeacherReports: React.FC<TeacherReportsProps> = ({
  schedule,
  showToast,
  onNavigateTab
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>(() => AttendanceStorage.getTeachers());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => AttendanceStorage.getAttendanceRecords());

  useEffect(() => {
    const unsub = AttendanceStorage.subscribeToSync(() => {
      setTeachers(AttendanceStorage.getTeachers());
      setAttendanceRecords(AttendanceStorage.getAttendanceRecords());
    });
    return () => unsub();
  }, []);

  // Period Selector Mode
  const [reportPeriodMode, setReportPeriodMode] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');

  // Daily Mode: Single Day
  const [reportDailyDate, setReportDailyDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Weekly Mode: Reference Date for Week
  const [reportWeeklyRefDate, setReportWeeklyRefDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Monthly Mode: Month & Year
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());

  // Custom Range Mode
  const [reportCustomStartDate, setReportCustomStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reportCustomEndDate, setReportCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [gateFilter, setGateFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('time_desc');

  // Calculate effective date bounds and labels
  const { effectiveStartDate, effectiveEndDate, periodTitleLabel, periodFilePrefix } = useMemo(() => {
    if (reportPeriodMode === 'daily') {
      const targetDate = reportDailyDate || new Date().toISOString().split('T')[0];
      return {
        effectiveStartDate: targetDate,
        effectiveEndDate: targetDate,
        periodTitleLabel: `Harian (${targetDate})`,
        periodFilePrefix: `Harian_Guru_${targetDate}`
      };
    }

    if (reportPeriodMode === 'weekly') {
      const ref = reportWeeklyRefDate ? new Date(reportWeeklyRefDate) : new Date();
      const day = ref.getDay(); // 0 = Sunday
      const diffToMonday = ref.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(ref.setDate(diffToMonday));
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);

      const startStr = monday.toISOString().split('T')[0];
      const endStr = saturday.toISOString().split('T')[0];

      return {
        effectiveStartDate: startStr,
        effectiveEndDate: endStr,
        periodTitleLabel: `Mingguan (${startStr} s/d ${endStr})`,
        periodFilePrefix: `Mingguan_Guru_${startStr}_sd_${endStr}`
      };
    }

    if (reportPeriodMode === 'monthly') {
      const startStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(reportYear, reportMonth, 0).getDate();
      const endStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      return {
        effectiveStartDate: startStr,
        effectiveEndDate: endStr,
        periodTitleLabel: `Bulanan (${MONTH_NAMES[reportMonth - 1]} ${reportYear})`,
        periodFilePrefix: `Bulanan_Guru_${reportYear}_${String(reportMonth).padStart(2, '0')}`
      };
    }

    // Custom
    const startStr = reportCustomStartDate || new Date().toISOString().split('T')[0];
    const endStr = reportCustomEndDate || new Date().toISOString().split('T')[0];
    return {
      effectiveStartDate: startStr,
      effectiveEndDate: endStr,
      periodTitleLabel: `Periode (${startStr} s/d ${endStr})`,
      periodFilePrefix: `Periode_Guru_${startStr}_sd_${endStr}`
    };
  }, [reportPeriodMode, reportDailyDate, reportWeeklyRefDate, reportMonth, reportYear, reportCustomStartDate, reportCustomEndDate]);

  // Filter raw records for teachers in date range
  const filteredTeacherRecords = useMemo(() => {
    return attendanceRecords.filter(r => {
      // Must be teacher
      const isTeacher = r.userType === 'TEACHER' || !!r.teacherId || !!r.teacherName;
      if (!isTeacher) return false;

      const recDate = r.dateFormatted || (r.timestamp ? r.timestamp.split('T')[0] : '');
      if (effectiveStartDate && recDate < effectiveStartDate) return false;
      if (effectiveEndDate && recDate > effectiveEndDate) return false;

      // Gate filter
      if (gateFilter !== 'ALL' && r.gateLocation !== gateFilter) return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesName = r.teacherName?.toLowerCase().includes(q);
        const matchesNip = r.nip?.toLowerCase().includes(q);
        const matchesPos = r.teacherPosition?.toLowerCase().includes(q);
        const matchesRfid = r.rfidUid?.toLowerCase().includes(q);
        if (!matchesName && !matchesNip && !matchesPos && !matchesRfid) return false;
      }

      return true;
    });
  }, [attendanceRecords, effectiveStartDate, effectiveEndDate, gateFilter, searchTerm]);

  // Paired daily summary for teachers (Tap Masuk + Tap Pulang)
  const pairedTeacherAttendance = useMemo(() => {
    const paired = pairAttendanceRecords(filteredTeacherRecords, 'TEACHER');

    // Status filter
    const filteredByStatus = paired.filter(item => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'TEPAT_WAKTU') return item.entryStatus === 'TEPAT_WAKTU';
      if (statusFilter === 'TERLAMBAT') return item.entryStatus === 'TERLAMBAT';
      if (statusFilter === 'PULANG') return item.exitTime && item.exitTime !== 'Belum Pulang';
      return true;
    });

    // Sorting
    return filteredByStatus.sort((a, b) => {
      if (sortBy === 'time_desc') {
        return (b.dateFormatted + (b.entryTime || '')).localeCompare(a.dateFormatted + (a.entryTime || ''));
      }
      if (sortBy === 'time_asc') {
        return (a.dateFormatted + (a.entryTime || '')).localeCompare(b.dateFormatted + (b.entryTime || ''));
      }
      if (sortBy === 'name_asc') {
        return (a.teacherName || '').localeCompare(b.teacherName || '');
      }
      if (sortBy === 'name_desc') {
        return (b.teacherName || '').localeCompare(a.teacherName || '');
      }
      return 0;
    });
  }, [filteredTeacherRecords, statusFilter, sortBy]);

  // Statistics calculation for the filtered period
  const stats = useMemo(() => {
    const totalTeachersCount = teachers.length;
    const presentCount = pairedTeacherAttendance.length;
    const onTimeCount = pairedTeacherAttendance.filter(p => p.entryStatus === 'TEPAT_WAKTU').length;
    const lateCount = pairedTeacherAttendance.filter(p => p.entryStatus === 'TERLAMBAT').length;
    const checkoutCount = pairedTeacherAttendance.filter(p => p.exitTime && p.exitTime !== 'Belum Pulang').length;

    return {
      totalTeachersCount,
      presentCount,
      onTimeCount,
      lateCount,
      checkoutCount
    };
  }, [teachers, pairedTeacherAttendance]);

  // Handlers for Export
  const handleExportExcel = () => {
    exportTeacherAttendanceToExcel(
      pairedTeacherAttendance,
      `Rekap_Presensi_Guru_${periodFilePrefix}`,
      `Presensi Guru ${periodTitleLabel}`
    );
    showToast('📊 Laporan Excel Presensi Guru Berhasil Diunduh!');
  };

  const handleExportCSV = () => {
    exportTeacherAttendanceToCSV(
      pairedTeacherAttendance,
      `Rekap_Presensi_Guru_${periodFilePrefix}`
    );
    showToast('📄 Laporan CSV Presensi Guru Berhasil Diunduh!');
  };

  const handlePrint = () => {
    printTeacherAttendanceReport(
      pairedTeacherAttendance,
      schedule,
      `Laporan Presensi Guru & PTK - ${periodTitleLabel}`
    );
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-6 text-left">
      
      {/* Sub-tab Switcher: Rekap Laporan (Siswa <-> Rapor Disiplin <-> Guru <-> Backup) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 w-fit">
        <button
          type="button"
          onClick={() => onNavigateTab('reports')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Rekapitulasi Siswa</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('discipline_reports')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>Rapor Kedisiplinan Siswa</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('teacher_reports')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-purple-600 text-white shadow-md"
        >
          <UserCheck className="w-3.5 h-3.5 text-purple-200" />
          <span>Rekapitulasi Guru & PTK</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('backup')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Backup & Database Cloud</span>
        </button>
      </div>

      {/* Top Header & Export Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Rekap & Laporan Presensi Guru & Pegawai</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Laporan presensi lengkap dengan rincian jam tap masuk, jam tap pulang, pintu gerbang, dan status kedisiplinan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border border-emerald-400/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border border-purple-400/30"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Periode Selector Tabs */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Mode Periode Laporan:</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setReportPeriodMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                reportPeriodMode === 'daily'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Per Hari (Harian)</span>
            </button>

            <button
              type="button"
              onClick={() => setReportPeriodMode('weekly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                reportPeriodMode === 'weekly'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Per Minggu (Mingguan)</span>
            </button>

            <button
              type="button"
              onClick={() => setReportPeriodMode('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                reportPeriodMode === 'monthly'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Per Bulan (Bulanan)</span>
            </button>

            <button
              type="button"
              onClick={() => setReportPeriodMode('custom')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                reportPeriodMode === 'custom'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Rentang Kustom</span>
            </button>
          </div>
        </div>

        {/* Dynamic date controls */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {reportPeriodMode === 'daily' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300">Pilih Tanggal:</label>
                <input
                  type="date"
                  value={reportDailyDate}
                  onChange={(e) => setReportDailyDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono font-bold"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setReportDailyDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-purple-300 border border-slate-700"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yest = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    setReportDailyDate(yest);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700"
                >
                  Kemarin
                </button>
              </div>
            </div>
          )}

          {reportPeriodMode === 'weekly' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300">Pilih Minggu:</label>
                <input
                  type="date"
                  value={reportWeeklyRefDate}
                  onChange={(e) => setReportWeeklyRefDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono font-bold"
                />
              </div>
              <span className="text-xs text-purple-300 font-mono">
                Rentang: {effectiveStartDate} s/d {effectiveEndDate}
              </span>
            </div>
          )}

          {reportPeriodMode === 'monthly' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300">Bulan:</label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300">Tahun:</label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold font-mono"
                >
                  {[2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {reportPeriodMode === 'custom' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300">Dari:</label>
                <input
                  type="date"
                  value={reportCustomStartDate}
                  onChange={(e) => setReportCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300">Sampai:</label>
                <input
                  type="date"
                  value={reportCustomEndDate}
                  onChange={(e) => setReportCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <div className="text-xs text-slate-400 font-medium">
            Periode Terpilih: <strong className="text-white">{periodTitleLabel}</strong>
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Nama Guru, NIP, Jabatan..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Status Kedisiplinan: Semua</option>
              <option value="TEPAT_WAKTU">Hadir Tepat Waktu</option>
              <option value="TERLAMBAT">Hadir Terlambat</option>
              <option value="PULANG">Sudah Tap Pulang</option>
            </select>
          </div>

          <div>
            <select
              value={gateFilter}
              onChange={(e) => setGateFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Lokasi Gerbang: Semua</option>
              <option value="pintu_depan">Pintu Depan (Gerbang Utama)</option>
              <option value="pintu_belakang">Pintu Belakang</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="time_desc">Waktu: Paling Baru</option>
              <option value="time_asc">Waktu: Paling Pagi</option>
              <option value="name_asc">Nama Guru A - Z</option>
              <option value="name_desc">Nama Guru Z - A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-purple-400 text-xs font-bold mb-1">
            <span>Total Guru Hadir</span>
            <Users className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-white">{stats.presentCount}</p>
          <span className="text-[10px] text-slate-400">Dari {stats.totalTeachersCount} Guru & PTK</span>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold mb-1">
            <span>Tepat Waktu</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{stats.onTimeCount}</p>
          <span className="text-[10px] text-slate-400">Presensi sebelum {schedule.entryDeadlineTime} WIB</span>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold mb-1">
            <span>Terlambat</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-400">{stats.lateCount}</p>
          <span className="text-[10px] text-slate-400">Tap setelah {schedule.entryDeadlineTime} WIB</span>
        </div>

        <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-blue-400 text-xs font-bold mb-1">
            <span>Sudah Tap Pulang</span>
            <LogOut className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-blue-400">{stats.checkoutCount}</p>
          <span className="text-[10px] text-slate-400">Tap keluar sore</span>
        </div>
      </div>

      {/* DETAILED TEACHER ATTENDANCE TABLE WITH TAP TIMESTAMPS */}
      <div className="border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg bg-slate-900/60">
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Rincian Log Presensi Guru ({pairedTeacherAttendance.length} Catatan Presensi)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Format: Waktu Tap Masuk & Tap Pulang Lengkap
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Nama Guru / Gelar</th>
                <th className="p-3">NIP / Jabatan</th>
                <th className="p-3">UID RFID</th>
                <th className="p-3 text-emerald-400">Jam Tap Masuk</th>
                <th className="p-3 text-blue-400">Jam Tap Pulang</th>
                <th className="p-3 text-center">Status Kehadiran</th>
                <th className="p-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {pairedTeacherAttendance.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-medium">
                    Belum ada catatan presensi kartu guru pada periode yang dipilih.
                  </td>
                </tr>
              ) : (
                pairedTeacherAttendance.map((item, idx) => {
                  const isLate = item.entryStatus === 'TERLAMBAT';
                  const hasExit = item.exitTime && item.exitTime !== 'Belum Pulang';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-300 font-bold whitespace-nowrap">
                        {item.dateFormatted}
                      </td>
                      <td className="p-3">
                        <p className="font-extrabold text-white text-xs">{item.teacherName || 'Guru'}</p>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-indigo-300 text-[11px] block">{item.nip || '-'}</span>
                        <span className="text-[10px] text-purple-300 block">{item.teacherPosition || 'PTK'}</span>
                      </td>
                      <td className="p-3 font-mono text-amber-300 text-[11px]">
                        {item.rfidUid}
                      </td>
                      {/* Tap Masuk */}
                      <td className="p-3">
                        <div className="font-mono font-bold text-xs text-emerald-300">
                          {item.entryTime || '-'}
                        </div>
                        <span className="text-[9px] text-slate-400 block font-medium">
                          {item.entryGate || 'Pintu Utama'}
                        </span>
                      </td>
                      {/* Tap Pulang */}
                      <td className="p-3">
                        {hasExit ? (
                          <>
                            <div className="font-mono font-bold text-xs text-blue-300">
                              {item.exitTime}
                            </div>
                            <span className="text-[9px] text-slate-400 block font-medium">
                              {item.exitGate || 'Pintu Utama'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 text-[10px] italic">Belum Pulang</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          isLate
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {isLate ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                        </span>
                      </td>
                      {/* Keterangan */}
                      <td className="p-3 text-[11px] text-slate-400">
                        {isLate && item.lateMinutes ? (
                          <span className="text-amber-300 font-bold">Telat +{item.lateMinutes} mnt</span>
                        ) : hasExit ? (
                          <span className="text-emerald-400">Hadir Lengkap</span>
                        ) : (
                          <span className="text-slate-400">Masuk</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
