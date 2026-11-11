import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, AttendanceStats, SchoolSchedule, Student, AuthUser, DailyAttendanceRecap } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { exportAttendanceToExcel, exportAttendanceToCSV, printAttendanceReport } from '../lib/exportUtils';
import { hasUserPermission } from '../lib/permissions';
import { DayRolloverModal } from './DayRolloverModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend
} from 'recharts';
import { 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  Search, 
  Sliders, 
  Users, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  RefreshCw,
  LogOut,
  FileSpreadsheet,
  Download,
  Printer,
  UserX,
  CreditCard,
  BarChart3,
  TrendingUp,
  Percent,
  ShieldAlert,
  Award,
  Database,
  CalendarCheck2
} from 'lucide-react';

interface GuruPiketDashboardProps {
  schedule: SchoolSchedule;
  onOpenManualCheckin: () => void;
  currentUser?: AuthUser | null;
}

export const GuruPiketDashboard: React.FC<GuruPiketDashboardProps> = ({
  schedule,
  onOpenManualCheckin,
  currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sudah_absen' | 'belum_absen' | 'urutan_kedatangan'>('sudah_absen');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'MASUK' | 'PULANG'>('ALL');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    totalPresentToday: 0,
    totalOnTime: 0,
    totalLate: 0,
    totalCheckoutsToday: 0,
    totalAlpha: 0,
    frontGateCount: 0,
    backGateCount: 0
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGateFilter, setSelectedGateFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [chartViewMode, setChartViewMode] = useState<'overall' | 'by_class'>('overall');

  // Day Rollover / Archived Daily Recap Modal state
  const [isRecapModalOpen, setIsRecapModalOpen] = useState<boolean>(false);
  const [recapModalData, setRecapModalData] = useState<{
    previousDate: string;
    newDate: string;
    recap?: DailyAttendanceRecap | null;
  } | null>(null);

  // Permission checks
  const canManualCheckin = hasUserPermission(currentUser, 'manual_checkin');
  const canExportRecap = hasUserPermission(currentUser, 'export_recap');
  const canViewRanks = hasUserPermission(currentUser, 'student_ranks');

  const refreshData = () => {
    // Check day rollover on every refresh
    AttendanceStorage.checkAndProcessDayRollover();
    const students = AttendanceStorage.getStudents();
    const allRecords = AttendanceStorage.getAttendanceRecords();
    const todayStr = AttendanceStorage.getTodayDate();
    const todays = allRecords.filter(r => r.dateFormatted === todayStr);

    setAllStudents(students);
    setTodayRecords(todays);
    setStats(AttendanceStorage.getStatsToday());
  };

  useEffect(() => {
    refreshData();

    // Subscribe to realtime changes
    const unsubscribe = AttendanceStorage.subscribeToSync((evt) => {
      if (
        evt.type === 'ATTENDANCE_UPDATED' || 
        evt.type === 'STUDENTS_UPDATED' || 
        evt.type === 'CLASSES_UPDATED' ||
        evt.type === 'DAY_CHANGED' ||
        evt.type === 'DAILY_RECAP_SAVED'
      ) {
        refreshData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Set of student IDs who have checked in today (MASUK)
  const checkedInStudentIds = useMemo(() => {
    return new Set(todayRecords.filter(r => r.type === 'MASUK').map(r => r.studentId));
  }, [todayRecords]);

  // Filtered List of Students who HAVE checked in today
  const filteredPresentRecords = useMemo(() => {
    return todayRecords.filter(rec => {
      const matchesSearch = rec.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (rec.nisn && rec.nisn.includes(searchTerm)) ||
                            rec.studentClass.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedTypeFilter === 'ALL' || rec.type === selectedTypeFilter;
      const matchesGate = selectedGateFilter === 'ALL' || rec.gateLocation === selectedGateFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || rec.status === selectedStatusFilter;
      const matchesClass = selectedClassFilter === 'ALL' || rec.studentClass === selectedClassFilter;

      return matchesSearch && matchesType && matchesGate && matchesStatus && matchesClass;
    });
  }, [todayRecords, searchTerm, selectedTypeFilter, selectedGateFilter, selectedStatusFilter, selectedClassFilter]);

  // Chronological arrival ranking list (Datang Pertama ke Paling Telat)
  const arrivalRanking = useMemo(() => {
    return AttendanceStorage.getArrivalRankingToday().filter(item => {
      const rec = item.record;
      const matchesSearch = rec.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            rec.studentClass.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClassFilter === 'ALL' || rec.studentClass === selectedClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [searchTerm, selectedClassFilter, todayRecords]);

  // List of Students who HAVE NOT checked in today
  const absentStudents = useMemo(() => {
    return allStudents.filter(std => !checkedInStudentIds.has(std.id));
  }, [allStudents, checkedInStudentIds]);

  const filteredAbsentStudents = useMemo(() => {
    return absentStudents.filter(std => {
      const matchesSearch = std.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            std.rfidUid.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            std.class.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClassFilter === 'ALL' || std.class === selectedClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [absentStudents, searchTerm, selectedClassFilter]);

  // Dynamic classes for filter dropdown
  const uniqueClasses = useMemo(() => {
    return Array.from(new Set([...AttendanceStorage.getClasses(), ...allStudents.map(s => s.class)])).filter(Boolean).sort();
  }, [allStudents]);

  // Late students list today
  const lateStudentsToday = useMemo(() => {
    return todayRecords.filter(r => r.status === 'TERLAMBAT' && r.type === 'MASUK');
  }, [todayRecords]);

  // Percentage Calculations for Recharts
  const totalCount = stats.totalStudents || 1;
  const onTimePercentage = Number(((stats.totalOnTime / totalCount) * 100).toFixed(1));
  const latePercentage = Number(((stats.totalLate / totalCount) * 100).toFixed(1));
  const alphaPercentage = Number(((stats.totalAlpha / totalCount) * 100).toFixed(1));
  const totalPresentPercentage = Number((((stats.totalOnTime + stats.totalLate) / totalCount) * 100).toFixed(1));

  // Data for Overall Percentage Bar Chart
  const overallPercentageChartData = useMemo(() => {
    return [
      {
        kategori: 'Tepat Waktu',
        persentase: onTimePercentage,
        jumlah: stats.totalOnTime,
        color: '#10b981', // emerald
        deskripsi: `Hadir sebelum ${schedule.entryDeadlineTime}`
      },
      {
        kategori: 'Terlambat',
        persentase: latePercentage,
        jumlah: stats.totalLate,
        color: '#f59e0b', // amber
        deskripsi: `Lewat ${schedule.entryDeadlineTime} WIB`
      },
      {
        kategori: 'Belum Hadir / Alpha',
        persentase: alphaPercentage,
        jumlah: stats.totalAlpha,
        color: '#f43f5e', // rose
        deskripsi: 'Belum tap kartu RFID'
      }
    ];
  }, [onTimePercentage, latePercentage, alphaPercentage, stats, schedule.entryDeadlineTime]);

  // Data for Class-by-Class Attendance Percentage
  const classPercentageChartData = useMemo(() => {
    return uniqueClasses.map(clsName => {
      const classStudents = allStudents.filter(s => s.class === clsName);
      const totalInClass = classStudents.length;
      const presentInClass = classStudents.filter(s => checkedInStudentIds.has(s.id)).length;
      const lateInClass = todayRecords.filter(r => r.studentClass === clsName && r.status === 'TERLAMBAT' && r.type === 'MASUK').length;
      const onTimeInClass = presentInClass - lateInClass;
      const pct = totalInClass > 0 ? Number(((presentInClass / totalInClass) * 100).toFixed(1)) : 0;
      
      return {
        kelas: clsName,
        persentaseHadir: pct,
        hadir: presentInClass,
        tepatWaktu: onTimeInClass,
        terlambat: lateInClass,
        totalSiswa: totalInClass
      };
    });
  }, [uniqueClasses, allStudents, checkedInStudentIds, todayRecords]);

  // Custom Tooltip for Recharts Overall Chart
  const CustomOverallTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.kategori}
          </p>
          <p className="text-slate-300 font-extrabold text-sm">
            {data.persentase}% <span className="text-slate-400 font-normal text-xs">({data.jumlah} Siswa)</span>
          </p>
          <p className="text-[11px] text-slate-400">{data.deskripsi}</p>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Recharts Class Chart
  const CustomClassTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white">Kelas {data.kelas}</p>
          <p className="text-emerald-400 font-extrabold text-sm">
            Tingkat Kehadiran: {data.persentaseHadir}%
          </p>
          <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800">
            <p>• Total Hadir: <span className="text-white font-bold">{data.hadir}</span> / {data.totalSiswa} Siswa</p>
            <p>• Tepat Waktu: <span className="text-emerald-400 font-bold">{data.tepatWaktu}</span></p>
            <p>• Terlambat: <span className="text-amber-400 font-bold">{data.terlambat}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] max-w-full overflow-x-hidden bg-slate-900 text-slate-100 p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-8">
      
      {/* Header Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-slate-800/80 border border-slate-700/80 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">Dashboard Guru Piket & Monitoring</h1>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] sm:text-xs font-extrabold rounded-full">
                LIVE MONITORING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 sm:mt-1">
              Pemantauan persentase kehadiran siswa hari ini, daftar keterlambatan, dan rekapitulasi data.
            </p>
          </div>
        </div>

        {/* Quick Action & Export Buttons for Authorized Guru Piket */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          
          {canManualCheckin ? (
            <button
              onClick={onOpenManualCheckin}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>+ Absen Manual</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-slate-800 text-slate-500 text-xs rounded-xl border border-slate-700 flex items-center gap-1.5" title="Izin input manual tidak diaktifkan oleh Admin">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Absen Manual (Terkunci)</span>
            </div>
          )}

          {/* Export Report Buttons for Authorized Users */}
          {canExportRecap && (
            <>
              <button
                onClick={() => exportAttendanceToExcel(todayRecords)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                title="Download Report Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </button>

              <button
                onClick={() => printAttendanceReport(todayRecords, schedule.schoolName)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                title="Cetak Laporan PDF"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Cetak</span>
              </button>
            </>
          )}
          
          <button
            onClick={() => {
              const prevDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
              const todayStr = AttendanceStorage.getTodayDate();
              const recap = AttendanceStorage.getDailyRecapByDate(prevDate) || AttendanceStorage.getDailyRecapByDate(todayStr);
              setRecapModalData({
                previousDate: prevDate,
                newDate: todayStr,
                recap
              });
              setIsRecapModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all cursor-pointer"
            title="Lihat Rincian Arsip Otomatis / Pergantian Hari"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Arsip & Reset</span>
          </button>

          <button
            onClick={refreshData}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-600 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Registered Students */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-extrabold uppercase">Total Siswa</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl lg:text-3xl font-black text-white">{stats.totalStudents}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Siswa Terdaftar</p>
          </div>
        </div>

        {/* On Time (Hadir Tepat Waktu) */}
        <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg bg-gradient-to-br from-slate-800 to-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-extrabold uppercase">Tepat Waktu</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-black text-emerald-400">{stats.totalOnTime}</span>
              <span className="text-xs font-bold text-emerald-300">({onTimePercentage}%)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Hadir sebelum {schedule.entryDeadlineTime}</p>
          </div>
        </div>

        {/* Late (Terlambat) */}
        <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg bg-gradient-to-br from-slate-800 to-amber-950/20">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-extrabold uppercase">Terlambat</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-black text-amber-400">{stats.totalLate}</span>
              <span className="text-xs font-bold text-amber-300">({latePercentage}%)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Lewat {schedule.entryDeadlineTime} WIB</p>
          </div>
        </div>

        {/* Belum Absen / Alpha Today */}
        <div className="bg-slate-800/80 border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg bg-gradient-to-br from-slate-800 to-rose-950/20">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-extrabold uppercase">Belum Absen</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-black text-rose-400">{stats.totalAlpha}</span>
              <span className="text-xs font-bold text-rose-300">({alphaPercentage}%)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Siswa Belum Tap Hari Ini</p>
          </div>
        </div>

        {/* Checkouts (Pulang) */}
        <div className="bg-slate-800/80 border border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg bg-gradient-to-br from-slate-800 to-blue-950/20 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-xs font-extrabold uppercase">Sudah Pulang</span>
            <LogOut className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl lg:text-3xl font-black text-blue-400">{stats.totalCheckoutsToday}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Tap Absen Keluar</p>
          </div>
        </div>

      </div>

      {/* RECHARTS ATTENDANCE PERCENTAGE BAR CHART SECTION */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Grafik Persentase Kehadiran Siswa Hari Ini
                </h3>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold rounded-full">
                  Recharts
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualisasi persentase kehadiran keseluruhan dan perbandingan rasio per rombel kelas hari ini.
              </p>
            </div>
          </div>

          {/* Toggle View Mode: Overall vs By Class */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs self-start sm:self-auto">
            <button
              onClick={() => setChartViewMode('overall')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                chartViewMode === 'overall'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Distribusi Keseluruhan
            </button>
            <button
              onClick={() => setChartViewMode('by_class')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                chartViewMode === 'by_class'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Persentase Per Kelas
            </button>
          </div>
        </div>

        {/* Overall Percentage Overview Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400">Total Tingkat Kehadiran</span>
              <p className="text-xl font-black text-white mt-0.5">{totalPresentPercentage}%</p>
            </div>
            <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
              {stats.totalOnTime + stats.totalLate} / {stats.totalStudents} Siswa
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400">Tingkat Ketepatan Waktu</span>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{onTimePercentage}%</p>
            </div>
            <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
              {stats.totalOnTime} Siswa
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400">Tingkat Keterlambatan</span>
              <p className="text-xl font-black text-amber-400 mt-0.5">{latePercentage}%</p>
            </div>
            <div className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold">
              {stats.totalLate} Siswa
            </div>
          </div>
        </div>

        {/* THE RECHARTS BAR CHART */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
          {chartViewMode === 'overall' ? (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overallPercentageChartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="kategori"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    unit="%"
                    domain={[0, 100]}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <Tooltip content={<CustomOverallTooltip />} />
                  <Bar
                    dataKey="persentase"
                    radius={[8, 8, 0, 0]}
                    barSize={48}
                    label={{
                      position: 'top',
                      fill: '#f8fafc',
                      fontSize: 12,
                      fontWeight: 800,
                      formatter: (val: any) => `${val}%`
                    }}
                  >
                    {overallPercentageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={classPercentageChartData}
                  margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="kelas"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    unit="%"
                    domain={[0, 100]}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <Tooltip content={<CustomClassTooltip />} />
                  <Bar
                    dataKey="persentaseHadir"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                    label={{
                      position: 'top',
                      fill: '#93c5fd',
                      fontSize: 10,
                      fontWeight: 700,
                      formatter: (val: any) => `${val}%`
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* LATE ARRIVALS ALERT PANEL */}
      {lateStudentsToday.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
              <span>Daftar Siswa Terlambat Hari Ini ({lateStudentsToday.length} Siswa)</span>
            </div>
            <span className="text-xs text-amber-300/80 font-medium">Batas Masuk: {schedule.entryDeadlineTime} WIB</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lateStudentsToday.map(student => (
              <div key={student.id} className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-white text-sm truncate">{student.studentName}</p>
                  <p className="text-xs text-slate-400">{student.studentClass} • {student.gateName}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-extrabold text-xs rounded-lg border border-amber-500/30">
                    +{student.lateMinutes || 0}m
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.timeFormatted}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN DATA PANELS: SUDAH ABSEN VS BELUM ABSEN VS URUTAN KEDATANGAN */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-6">
        
        {/* Toggle Sub-Tabs & Filter Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Sub Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-700 w-full md:w-auto">
            <button
              onClick={() => setActiveSubTab('sudah_absen')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex-1 md:flex-none justify-center cursor-pointer ${
                activeSubTab === 'sudah_absen'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Siswa Sudah Absen ({todayRecords.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('belum_absen')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex-1 md:flex-none justify-center cursor-pointer ${
                activeSubTab === 'belum_absen'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserX className="w-4 h-4 text-rose-300" />
              <span>Siswa Belum Absen ({absentStudents.length})</span>
            </button>

            {canViewRanks && (
              <button
                onClick={() => setActiveSubTab('urutan_kedatangan')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex-1 md:flex-none justify-center cursor-pointer ${
                  activeSubTab === 'urutan_kedatangan'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🏆 Urutan Kedatangan ({arrivalRanking.length})</span>
              </button>
            )}
          </div>

          {/* Search & Class / Type Filter */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama atau kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            {activeSubTab === 'sudah_absen' && (
              <>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Semua Tipe Tap</option>
                  <option value="MASUK">Absen Masuk</option>
                  <option value="PULANG">Absen Pulang</option>
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="TEPAT_WAKTU">Tepat Waktu</option>
                  <option value="TERLAMBAT">Terlambat</option>
                  <option value="PULANG">Pulang</option>
                </select>
              </>
            )}
          </div>

        </div>

        {/* VIEW 1: SISWA SUDAH ABSEN TABLE */}
        {activeSubTab === 'sudah_absen' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Nama Siswa</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-4 text-center">Tipe</th>
                  <th className="py-3.5 px-4">Waktu Masuk</th>
                  <th className="py-3.5 px-4">Waktu Pulang</th>
                  <th className="py-3.5 px-4">Titik Gate</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 bg-slate-900/40">
                {filteredPresentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      Tidak ada data siswa yang sudah absen untuk kriteria filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredPresentRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-4 font-extrabold text-white whitespace-nowrap">
                        {rec.studentName}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-300">
                        {rec.studentClass}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.type === 'MASUK' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {rec.type}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 whitespace-nowrap">
                        {rec.type === 'MASUK' ? rec.timeFormatted : '-'}
                      </td>

                      <td className="py-3 px-4 font-mono font-extrabold text-blue-400 whitespace-nowrap">
                        {rec.type === 'PULANG' ? rec.timeFormatted : 'Belum Pulang'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-200">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          {rec.gateName}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          rec.status === 'TEPAT_WAKTU'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : rec.status === 'TERLAMBAT'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {rec.status === 'TEPAT_WAKTU' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {rec.status === 'TERLAMBAT' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {rec.status === 'TEPAT_WAKTU' ? 'TEPAT WAKTU' : rec.status === 'TERLAMBAT' ? `TERLAMBAT (+${rec.lateMinutes}m)` : rec.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {rec.notes || '-'}
                        {rec.isManualOverride && (
                          <span className="ml-1 text-[10px] text-blue-400 font-semibold">(Manual Guru)</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: SISWA BELUM ABSEN TABLE */}
        {activeSubTab === 'belum_absen' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3.5 px-4 text-center">No</th>
                  <th className="py-3.5 px-4">Nama Siswa</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-4">RFID UID</th>
                  <th className="py-3.5 px-4">Status Hari Ini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 bg-slate-900/40">
                {filteredAbsentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      🎉 Semua siswa pada kriteria filter ini sudah melakukan absen!
                    </td>
                  </tr>
                ) : (
                  filteredAbsentStudents.map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{std.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-300">{std.class}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{std.rfidUid}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <UserX className="w-3.5 h-3.5" />
                          <span>Belum Tap / Alpha</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: URUTAN KEDATANGAN & KETERLAMBATAN */}
        {activeSubTab === 'urutan_kedatangan' && canViewRanks && (
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3.5 px-4 text-center">Urutan</th>
                  <th className="py-3.5 px-4">Jam Datang</th>
                  <th className="py-3.5 px-4">Nama Siswa</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-4">Titik Gate</th>
                  <th className="py-3.5 px-4">Status Kedatangan</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 bg-slate-900/40">
                {arrivalRanking.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Belum ada siswa yang melakukan tap absen masuk hari ini.
                    </td>
                  </tr>
                ) : (
                  arrivalRanking.map((item) => (
                    <tr key={item.record.id} className={`hover:bg-slate-800/60 transition-colors ${
                      item.rank === 1 ? 'bg-amber-500/10' : item.rank <= 3 ? 'bg-slate-800/30' : ''
                    }`}>
                      
                      {/* Rank Position */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                          item.rank === 1 ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300' :
                          item.rank === 2 ? 'bg-slate-300 text-slate-950 font-bold' :
                          item.rank === 3 ? 'bg-amber-700 text-white font-bold' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          #{item.rank}
                        </span>
                      </td>

                      {/* Tap Time */}
                      <td className="py-3 px-4 font-mono font-extrabold text-amber-300 text-sm whitespace-nowrap">
                        {item.record.timeFormatted} WIB
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-4 font-extrabold text-white text-sm whitespace-nowrap">
                        {item.record.studentName}
                      </td>

                      {/* Class */}
                      <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                        {item.record.studentClass}
                      </td>

                      {/* Gate */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-200">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          {item.record.gateName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.rank === 1
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
                            : !item.isLate
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {item.rank === 1 && '🥇 BURUNG HANTU (#1 TERCEPAT)'}
                          {item.rank > 1 && !item.isLate && '🟢 TEPAT WAKTU'}
                          {item.isLate && `⚠️ TERLAMBAT (+${item.record.lateMinutes}m)`}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {item.record.notes || '-'}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Day Rollover / Daily Archive Recap Modal */}
      {recapModalData && (
        <DayRolloverModal
          isOpen={isRecapModalOpen}
          onClose={() => setIsRecapModalOpen(false)}
          previousDate={recapModalData.previousDate}
          newDate={recapModalData.newDate}
          recap={recapModalData.recap}
        />
      )}

    </div>
  );
};
