import React, { useState, useMemo } from 'react';
import { 
  Award, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Filter, 
  Calendar, 
  GraduationCap, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Eye, 
  X, 
  ChevronRight, 
  Sparkles, 
  ShieldAlert,
  ArrowUpDown,
  BookOpen,
  Info
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolSchedule, StudentDisciplineSummary, DisciplineGrade } from '../types';
import { 
  calculateStudentDisciplineSummaries, 
  exportDisciplineToExcel, 
  printSingleStudentDisciplineCard, 
  printBatchStudentDisciplineCards 
} from '../lib/exportUtils';

interface StudentDisciplineReportProps {
  students: Student[];
  records: AttendanceRecord[];
  classes: string[];
  schedule: SchoolSchedule;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const StudentDisciplineReport: React.FC<StudentDisciplineReportProps> = ({
  students,
  records,
  classes,
  schedule
}) => {
  // Period Selection
  const [periodMode, setPeriodMode] = useState<'monthly' | 'semester' | 'custom'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<'ganjil' | 'genap'>('ganjil');
  const [academicYear, setAcademicYear] = useState<string>('2026/2027');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Filters & Search
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | DisciplineGrade>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<
    'score_desc' | 'score_asc' | 'late_desc' | 'alpha_desc' | 'name_asc' | 'class_asc'
  >('score_desc');

  // Preview Modal for Single Student
  const [previewSummary, setPreviewSummary] = useState<StudentDisciplineSummary | null>(null);

  // Compute Period Bounds and Label
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (periodMode === 'monthly') {
      const monthStr = String(selectedMonth).padStart(2, '0');
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      return {
        startDate: `${selectedYear}-${monthStr}-01`,
        endDate: `${selectedYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
        periodLabel: `Bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
      };
    } else if (periodMode === 'semester') {
      if (selectedSemester === 'ganjil') {
        const yearParts = academicYear.split('/');
        const year = parseInt(yearParts[0], 10) || selectedYear;
        return {
          startDate: `${year}-07-01`,
          endDate: `${year}-12-31`,
          periodLabel: `Semester Ganjil ${academicYear}`
        };
      } else {
        const yearParts = academicYear.split('/');
        const year = parseInt(yearParts[1] || yearParts[0], 10) || selectedYear;
        return {
          startDate: `${year}-01-01`,
          endDate: `${year}-06-30`,
          periodLabel: `Semester Genap ${academicYear}`
        };
      }
    } else {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        periodLabel: `Rentang ${customStartDate} s/d ${customEndDate}`
      };
    }
  }, [periodMode, selectedMonth, selectedYear, selectedSemester, academicYear, customStartDate, customEndDate]);

  // Calculate Base Summaries
  const allSummaries = useMemo(() => {
    return calculateStudentDisciplineSummaries(
      students,
      records,
      startDate,
      endDate,
      periodLabel,
      'ALL'
    );
  }, [students, records, startDate, endDate, periodLabel]);

  // Filter and Sort Summaries
  const filteredSummaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allSummaries.filter(item => {
      // Class filter
      if (selectedClass !== 'ALL' && item.student.class !== selectedClass) {
        return false;
      }
      // Grade filter
      if (gradeFilter !== 'ALL' && item.grade !== gradeFilter) {
        return false;
      }
      // Search query
      if (q) {
        const nameMatch = (item.student.name || '').toLowerCase().includes(q);
        const nisnMatch = (item.student.nisn || '').toLowerCase().includes(q);
        const classMatch = (item.student.class || '').toLowerCase().includes(q);
        if (!nameMatch && !nisnMatch && !classMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'score_desc') return b.disciplineScore - a.disciplineScore;
      if (sortBy === 'score_asc') return a.disciplineScore - b.disciplineScore;
      if (sortBy === 'late_desc') return (b.lateCount * 60 + b.totalLateMinutes) - (a.lateCount * 60 + a.totalLateMinutes);
      if (sortBy === 'alpha_desc') return b.alphaCount - a.alphaCount;
      if (sortBy === 'name_asc') return a.student.name.localeCompare(b.student.name);
      if (sortBy === 'class_asc') return a.student.class.localeCompare(b.student.class);
      return 0;
    });
  }, [allSummaries, selectedClass, gradeFilter, searchQuery, sortBy]);

  // Global Discipline Statistics
  const stats = useMemo(() => {
    const totalStudentsInScope = filteredSummaries.length;
    if (totalStudentsInScope === 0) {
      return {
        avgScore: 0,
        countGradeA: 0,
        countGradeB: 0,
        countGradeC: 0,
        countGradeD: 0,
        totalLateMins: 0,
        totalLateCount: 0,
        totalAlphaCount: 0
      };
    }

    let sumScore = 0;
    let countA = 0;
    let countB = 0;
    let countC = 0;
    let countD = 0;
    let totalMins = 0;
    let totalLates = 0;
    let totalAlphas = 0;

    filteredSummaries.forEach(s => {
      sumScore += s.disciplineScore;
      if (s.grade === 'A') countA++;
      else if (s.grade === 'B') countB++;
      else if (s.grade === 'C') countC++;
      else countD++;

      totalMins += s.totalLateMinutes;
      totalLates += s.lateCount;
      totalAlphas += s.alphaCount;
    });

    return {
      avgScore: Math.round(sumScore / totalStudentsInScope),
      countGradeA: countA,
      countGradeB: countB,
      countGradeC: countC,
      countGradeD: countD,
      totalLateMins: totalMins,
      totalLateCount: totalLates,
      totalAlphaCount: totalAlphas
    };
  }, [filteredSummaries]);

  // Export handlers
  const handleExportExcel = () => {
    const classPrefix = selectedClass !== 'ALL' ? `Kelas_${selectedClass}` : 'Semua_Siswa';
    exportDisciplineToExcel(
      filteredSummaries,
      `Rapor_Kedisiplinan_${classPrefix}`,
      periodLabel
    );
  };

  const handlePrintBatch = () => {
    if (filteredSummaries.length === 0) {
      alert('Tidak ada data siswa yang memenuhi filter untuk dicetak.');
      return;
    }
    const classTitle = selectedClass !== 'ALL' ? selectedClass : 'Seluruh Siswa';
    printBatchStudentDisciplineCards(filteredSummaries, schedule, classTitle);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner / Header Title */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white">Rapor Kedisiplinan & Presensi Siswa</h2>
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-xs rounded-full shadow-xs">
                SISTEM SKOR 0 - 100
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Perhitungan nilai kedisiplinan otomatis berdasarkan ketepatan waktu tap RFID, durasi keterlambatan, absensi, serta pencetakan lembar rapor resmi per siswa & per rombel.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border border-emerald-400/30"
            title="Download Rekap Rapor Kedisiplinan ke Format Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrintBatch}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border border-indigo-400/30"
            title="Cetak Rapor Rombel / Kelas Sekaligus ke PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rapor {selectedClass !== 'ALL' ? `Kelas ${selectedClass}` : 'Semua'}</span>
          </button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 p-4 sm:p-5 rounded-2xl shadow-lg space-y-4">
        
        {/* Row 1: Period Selection Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 pb-3.5">
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-2xl border border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriodMode('monthly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                periodMode === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📅 Bulanan
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('semester')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                periodMode === 'semester'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎓 Semesteran
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('custom')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                periodMode === 'custom'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚙️ Rentang Bebas
            </button>
          </div>

          {/* Period Details Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {periodMode === 'monthly' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            )}

            {periodMode === 'semester' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value as any)}
                  className="bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ganjil">Semester Ganjil (Juli - Des)</option>
                  <option value="genap">Semester Genap (Jan - Juni)</option>
                </select>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="2026/2027">T.A. 2026/2027</option>
                  <option value="2025/2026">T.A. 2025/2026</option>
                </select>
              </div>
            )}

            {periodMode === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 font-mono font-bold"
                />
                <span className="text-slate-400 text-xs">s/d</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>
            )}

            <span className="px-3 py-1 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-bold rounded-xl">
              {periodLabel}
            </span>
          </div>
        </div>

        {/* Row 2: Class, Grade, Search & Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Filter Kelas / Rombel</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">🏫 Semua Rombel ({students.length} Siswa)</option>
              {classes.map((cls) => {
                const count = students.filter(s => s.class === cls).length;
                return (
                  <option key={cls} value={cls}>{cls} ({count} Siswa)</option>
                );
              })}
            </select>
          </div>

          {/* Grade Predicate Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Kategori Nilai / Predikat</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">🌟 Semua Grade (A, B, C, D)</option>
              <option value="A">Grade A: Teladan (90 - 100)</option>
              <option value="B">Grade B: Baik / Disiplin (80 - 89)</option>
              <option value="C">Grade C: Cukup (70 - 79)</option>
              <option value="D">Grade D: Butuh Pembinaan (&lt; 70)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Pencarian Siswa</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari Nama / NISN Siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Urutan Tampilan</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="score_desc">🏆 Skor Tertinggi (Paling Disiplin)</option>
              <option value="score_asc">⚠️ Skor Terendah (Butuh Pembinaan)</option>
              <option value="late_desc">⏰ Keterlambatan Terbanyak</option>
              <option value="alpha_desc">🚫 Alpha / Alpa Terbanyak</option>
              <option value="name_asc">🔤 Nama Siswa (A - Z)</option>
              <option value="class_asc">🏫 Urutan Kelas</option>
            </select>
          </div>
        </div>

      </div>

      {/* Summary Score Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <div className="bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rata-rata Skor</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${
              stats.avgScore >= 85 ? 'text-emerald-400' : stats.avgScore >= 75 ? 'text-blue-400' : 'text-amber-400'
            }`}>
              {stats.avgScore}
            </span>
            <span className="text-xs text-slate-400 font-bold">/ 100</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Skor Disiplin Rombel</span>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/50 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Grade A (Teladan)</span>
          <div className="text-2xl font-black text-emerald-300">{stats.countGradeA}</div>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">Skor 90 - 100</span>
        </div>

        <div className="bg-blue-950/30 border border-blue-800/50 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Grade B (Baik)</span>
          <div className="text-2xl font-black text-blue-300">{stats.countGradeB}</div>
          <span className="text-[10px] text-blue-400/80 mt-1 block">Skor 80 - 89</span>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/50 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1">Grade C (Cukup)</span>
          <div className="text-2xl font-black text-amber-300">{stats.countGradeC}</div>
          <span className="text-[10px] text-amber-400/80 mt-1 block">Skor 70 - 79</span>
        </div>

        <div className="bg-rose-950/30 border border-rose-800/50 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-rose-400 uppercase block mb-1">Grade D (Perhatian)</span>
          <div className="text-2xl font-black text-rose-300">{stats.countGradeD}</div>
          <span className="text-[10px] text-rose-400/80 mt-1 block">Butuh Pembinaan (&lt;70)</span>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Keterlambatan</span>
          <div className="text-2xl font-black text-amber-400">{stats.totalLateCount}x</div>
          <span className="text-[10px] text-slate-400 mt-1 block">{stats.totalLateMins} Menit Akumulasi</span>
        </div>

      </div>

      {/* Discipline Table List */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-white text-sm">
              Tabel Rekap Nilai Kedisiplinan Siswa ({filteredSummaries.length} Siswa)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Klik tombol <strong>"Lihat Rapor"</strong> untuk melihat & mencetak lembar rapor individual siswa.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-3 px-3 text-center">Rank</th>
                <th className="py-3 px-3">Siswa & NISN</th>
                <th className="py-3 px-3">Kelas</th>
                <th className="py-3 px-3 text-center">Kehadiran</th>
                <th className="py-3 px-3 text-center">Tepat Waktu</th>
                <th className="py-3 px-3 text-center">Terlambat</th>
                <th className="py-3 px-3 text-center">Izin / Sakit / Alpha</th>
                <th className="py-3 px-3 text-center">Skor Disiplin</th>
                <th className="py-3 px-3 text-center">Predikat</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 bg-slate-900/30">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Tidak ada data siswa yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((item, idx) => {
                  const student = item.student;
                  const isTopRank = idx === 0 && item.disciplineScore >= 95;

                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-slate-800/60 transition-colors ${
                        isTopRank ? 'bg-amber-500/10' : item.grade === 'D' ? 'bg-rose-500/5' : ''
                      }`}
                    >
                      {/* Rank Number */}
                      <td className="py-3 px-3 text-center font-bold whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                          idx === 0 ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-300' :
                          idx === 1 ? 'bg-slate-300 text-slate-950' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>

                      {/* Student Name & NISN */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-900/80 border border-indigo-700 flex items-center justify-center font-black text-indigo-300 shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-white block text-xs">{student.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">NISN: {student.nisn || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3 font-semibold text-slate-200 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px]">
                          {student.class}
                        </span>
                      </td>

                      {/* Attendance Rate */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="font-bold text-white text-xs">{item.presentDays} / {item.totalEffectiveDays} Hari</div>
                        <span className="text-[10px] text-emerald-400 font-semibold">{item.attendanceRate}% Hadir</span>
                      </td>

                      {/* On Time */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-emerald-400 text-xs">{item.onTimeCount} Hari</span>
                        <span className="block text-[10px] text-slate-400">({item.punctualityRate}%)</span>
                      </td>

                      {/* Late & Late Mins */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.lateCount > 0 ? (
                          <div>
                            <span className="font-bold text-amber-400 text-xs">{item.lateCount} Hari</span>
                            <span className="block text-[10px] text-amber-300/80 font-mono">+{item.totalLateMinutes} Menit</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold">-</span>
                        )}
                      </td>

                      {/* Permissions / Sickness / Alpha */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-[11px]">
                        <span className="text-blue-400 font-bold" title="Izin">{item.permissionCount}I</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-purple-400 font-bold" title="Sakit">{item.sickCount}S</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className={`font-bold ${item.alphaCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} title="Alpha">
                          {item.alphaCount}A
                        </span>
                      </td>

                      {/* Discipline Score */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span className={`text-base font-black ${
                            item.disciplineScore >= 90 ? 'text-emerald-400' :
                            item.disciplineScore >= 80 ? 'text-blue-400' :
                            item.disciplineScore >= 70 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {item.disciplineScore}
                          </span>
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full ${
                                item.disciplineScore >= 90 ? 'bg-emerald-400' :
                                item.disciplineScore >= 80 ? 'bg-blue-400' :
                                item.disciplineScore >= 70 ? 'bg-amber-400' : 'bg-rose-500'
                              }`}
                              style={{ width: `${item.disciplineScore}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Grade & Predikat */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase shadow-2xs ${
                          item.grade === 'A' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                          item.grade === 'B' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                          item.grade === 'C' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          Grade {item.grade}
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                          {item.predikat.split('(')[0]}
                        </span>
                      </td>

                      {/* Action: Open Report Card Modal */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewSummary(item)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-lg transition-all border border-indigo-500/40 text-xs font-bold cursor-pointer"
                            title="Preview Rapor & Cetak PDF"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Rapor</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: INDIVIDUAL STUDENT REPORT CARD PREVIEW */}
      {previewSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Lembar Rapor Kedisiplinan Siswa</h3>
                  <p className="text-xs text-slate-400">Periode: {previewSummary.periodLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSummary(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Identity Card */}
            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Siswa</span>
                <strong className="text-white text-sm">{previewSummary.student.name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Kelas / Rombel</span>
                <strong className="text-indigo-300 text-sm">{previewSummary.student.class}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">NISN</span>
                <span className="font-mono text-slate-200">{previewSummary.student.nisn || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">RFID UID Kartu</span>
                <span className="font-mono text-slate-200">{previewSummary.student.rfidUid || '-'}</span>
              </div>
            </div>

            {/* Score & Evaluation Block */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl text-center flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase font-black text-slate-400">SKOR KEDISIPLINAN</span>
                <div className={`text-4xl font-black my-1 ${
                  previewSummary.disciplineScore >= 90 ? 'text-emerald-400' :
                  previewSummary.disciplineScore >= 80 ? 'text-blue-400' :
                  previewSummary.disciplineScore >= 70 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {previewSummary.disciplineScore}
                </div>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  GRADE: {previewSummary.grade}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-1">{previewSummary.predikat}</span>
              </div>

              <div className="sm:col-span-2 bg-slate-800/90 border border-slate-700 p-4 rounded-2xl grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Tingkat Hadir</span>
                  <strong className="text-white">{previewSummary.attendanceRate}%</strong>
                  <span className="text-[9px] text-slate-500 block">({previewSummary.presentDays}/{previewSummary.totalEffectiveDays} Hari)</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Tepat Waktu</span>
                  <strong className="text-emerald-400">{previewSummary.onTimeCount} Hari</strong>
                  <span className="text-[9px] text-slate-500 block">({previewSummary.punctualityRate}%)</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Terlambat</span>
                  <strong className="text-amber-400">{previewSummary.lateCount} Hari</strong>
                  <span className="text-[9px] text-amber-300 block">+{previewSummary.totalLateMinutes} Menit</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Alpha / Tanpa Ket</span>
                  <strong className={previewSummary.alphaCount > 0 ? 'text-rose-400' : 'text-slate-400'}>
                    {previewSummary.alphaCount} Hari
                  </strong>
                  <span className="text-[9px] text-slate-500 block">Izin: {previewSummary.permissionCount} | Sakit: {previewSummary.sickCount}</span>
                </div>
              </div>
            </div>

            {/* Recommendation Box */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-2xl text-xs">
              <span className="text-indigo-300 font-black block mb-1">📝 Rekomendasi Evaluasi & Catatan Wali Kelas:</span>
              <p className="text-slate-300 leading-relaxed">{previewSummary.recommendation}</p>
            </div>

            {/* Tap History List */}
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-2">Riwayat Tap Presensi Periode Ini:</span>
              <div className="max-h-40 overflow-y-auto bg-slate-950/60 rounded-xl border border-slate-800 divide-y divide-slate-800 text-xs">
                {previewSummary.pairedRecords.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    Belum ada log presensi tercatat di rentang periode ini.
                  </div>
                ) : (
                  previewSummary.pairedRecords.map((r, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[11px]">{r.dateFormatted}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          r.entryStatus === 'TEPAT_WAKTU' ? 'bg-emerald-500/20 text-emerald-300' :
                          r.entryStatus === 'TERLAMBAT' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {r.summaryStatus}
                        </span>
                      </div>
                      <div className="text-right text-[11px] font-mono">
                        <span className="text-emerald-400 font-bold">{r.entryTime}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="text-blue-400 font-bold">{r.exitTime}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewSummary(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  printSingleStudentDisciplineCard(previewSummary, schedule);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer border border-indigo-400/40"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ Cetak Lembar Rapor Resmi (A4)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
