import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  FileSpreadsheet, 
  Printer, 
  X, 
  UserX,
  Trash2,
  ShieldAlert,
  ClipboardList,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { StudentLateRankItem, SchoolSchedule } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { LateFollowUpModal, STATUS_LABELS } from './LateFollowUpModal';

interface StudentLateLeaderboardProps {
  schedule: SchoolSchedule;
  onSelectStudent?: (studentId: string) => void;
  standalone?: boolean;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const StudentLateLeaderboard: React.FC<StudentLateLeaderboardProps> = ({
  schedule,
  standalone = false
}) => {
  const [syncVersion, setSyncVersion] = useState<number>(0);
  const [period, setPeriod] = useState<'today' | 'this_week' | 'this_month' | 'this_semester' | 'all_time' | 'custom'>('this_month');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'CAUTION'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Follow-up modal state
  const [selectedFollowUpItem, setSelectedFollowUpItem] = useState<StudentLateRankItem | null>(null);

  // Subscribe to realtime changes
  useEffect(() => {
    const unsub = AttendanceStorage.subscribeToSync(() => {
      setSyncVersion(v => v + 1);
    });
    return () => unsub();
  }, []);

  // Detail Modal for Single Student's Late Records
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentLateRankItem | null>(null);

  // Fetch ranking data
  const rankingData = useMemo(() => {
    return AttendanceStorage.getStudentLateRankings({
      period,
      startDate: customStartDate,
      endDate: customEndDate,
      classFilter: selectedClass
    });
  }, [period, customStartDate, customEndDate, selectedClass, syncVersion]);

  // All available classes for filter dropdown
  const availableClasses = useMemo(() => {
    const fromStore = AttendanceStorage.getClasses();
    const fromStudents = AttendanceStorage.getStudents().map(s => s.class).filter(Boolean);
    return Array.from(new Set([...fromStore, ...fromStudents])).sort();
  }, [syncVersion]);

  // Filtered and searched list
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rankingData.filter(item => {
      if (severityFilter !== 'ALL' && item.severity !== severityFilter) {
        return false;
      }
      if (statusFilter !== 'ALL') {
        const itemStatus = item.followUp?.status || 'BELUM_DITINDAK';
        if (itemStatus !== statusFilter) return false;
      }
      if (q) {
        const nameMatch = (item.studentName || '').toLowerCase().includes(q);
        const nisnMatch = (item.nisn || '').toLowerCase().includes(q);
        const classMatch = (item.studentClass || '').toLowerCase().includes(q);
        if (!nameMatch && !nisnMatch && !classMatch) return false;
      }
      return true;
    });
  }, [rankingData, severityFilter, statusFilter, searchQuery]);

  // Aggregated Stats
  const summaryStats = useMemo(() => {
    const totalLateStudents = filteredList.length;
    let totalOccurrences = 0;
    let totalMinutes = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let followedUpCount = 0;

    filteredList.forEach(item => {
      totalOccurrences += item.lateCount;
      totalMinutes += item.totalLateMinutes;
      if (item.severity === 'CRITICAL') criticalCount++;
      if (item.severity === 'WARNING') warningCount++;
      if (item.followUp && item.followUp.status !== 'BELUM_DITINDAK') followedUpCount++;
    });

    return {
      totalLateStudents,
      totalOccurrences,
      totalMinutes,
      avgMinutesPerLate: totalOccurrences > 0 ? Math.round(totalMinutes / totalOccurrences) : 0,
      criticalCount,
      warningCount,
      followedUpCount
    };
  }, [filteredList]);

  // Period Display Label
  const periodLabel = useMemo(() => {
    const now = new Date();
    if (period === 'today') {
      return `Hari Ini (${now.toLocaleDateString('id-ID', { dateStyle: 'full' })})`;
    } else if (period === 'this_week') {
      return `Minggu Ini (${now.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })})`;
    } else if (period === 'this_month') {
      return `Bulan ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
    } else if (period === 'this_semester') {
      return now.getMonth() >= 6 ? `Semester Ganjil ${now.getFullYear()}` : `Semester Genap ${now.getFullYear()}`;
    } else if (period === 'all_time') {
      return 'Semua Catatan Waktu';
    } else {
      return `${customStartDate} s/d ${customEndDate}`;
    }
  }, [period, customStartDate, customEndDate]);

  // Print Late Report
  const handlePrintLateReport = () => {
    if (filteredList.length === 0) {
      alert('Tidak ada data siswa terlambat untuk dicetak.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup diblokir browser. Izinkan popup untuk mencetak laporan.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Siswa Sering Terlambat - ${schedule.schoolName}</title>
        <style>
          body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; margin: 24px; color: #0f172a; font-size: 12px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { font-size: 15px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h2 { font-size: 12px; font-weight: 600; margin: 4px 0 0 0; color: #475569; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
          th { background-color: #f8fafc; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .critical { color: #dc2626; font-weight: 700; }
          .warning { color: #d97706; font-weight: 700; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${schedule.schoolName}</h1>
          <h2>LAPORAN REKAPITULASI SISWA SERING TERLAMBAT</h2>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Periode: ${periodLabel} | Filter Kelas: ${selectedClass === 'ALL' ? 'Semua Kelas' : selectedClass}</div>
        </div>

        <div class="meta">
          <div><strong>Total Siswa Terlambat:</strong> ${summaryStats.totalLateStudents} Siswa (${summaryStats.totalOccurrences} Kejadian)</div>
          <div><strong>Total Menit Keterlambatan:</strong> ${summaryStats.totalMinutes} Menit (Rata-rata: ${summaryStats.avgMinutesPerLate} menit)</div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 35px;">No</th>
              <th>Nama Siswa</th>
              <th style="width: 80px;">NISN</th>
              <th style="width: 80px;">Kelas</th>
              <th class="text-center" style="width: 70px;">Frekuensi</th>
              <th class="text-center" style="width: 80px;">Total Menit</th>
              <th class="text-center" style="width: 80px;">Rata-rata</th>
              <th>Terakhir Terlambat</th>
              <th>Status Tindak Lanjut</th>
            </tr>
          </thead>
          <tbody>
            ${filteredList.map((item, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td><strong>${item.studentName}</strong></td>
                <td>${item.nisn || '-'}</td>
                <td>${item.studentClass || '-'}</td>
                <td class="text-center ${item.severity === 'CRITICAL' ? 'critical' : item.severity === 'WARNING' ? 'warning' : ''}">${item.lateCount}x</td>
                <td class="text-center"><strong>+${item.totalLateMinutes} m</strong></td>
                <td class="text-center">${item.avgLateMinutes} m</td>
                <td>${item.latestLateDate} (${item.latestLateTime} WIB)</td>
                <td>${
                  item.severity === 'CRITICAL' 
                    ? 'Panggilan Orang Tua & BK' 
                    : item.severity === 'WARNING' 
                    ? 'Pembinaan Wali Kelas' 
                    : 'Monitoring Rutin'
                }</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div style="text-align: center; width: 220px;">
            Mengetahui,<br>Guru Piket / BK<br><br><br><br>
            <strong>( ......................................... )</strong>
          </div>
          <div style="text-align: center; width: 220px;">
            Depok, ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}<br>Kepala Sekolah<br><br><br><br>
            <strong>( ......................................... )</strong>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert('Tidak ada data siswa terlambat untuk diekspor.');
      return;
    }

    const headers = [
      'Peringkat',
      'Nama Siswa',
      'NISN',
      'Kelas',
      'Jumlah Terlambat',
      'Total Menit Terlambat',
      'Rata-rata Menit',
      'Keterlambatan Terlama (Menit)',
      'Tanggal Terakhir Terlambat',
      'Jam Terakhir Terlambat',
      'Status'
    ];

    const rows = filteredList.map((item, idx) => [
      idx + 1,
      `"${item.studentName.replace(/"/g, '""')}"`,
      `"${item.nisn || '-'}"`,
      `"${item.studentClass || '-'}"`,
      item.lateCount,
      item.totalLateMinutes,
      item.avgLateMinutes,
      item.maxLateMinutes,
      item.latestLateDate,
      item.latestLateTime,
      item.severity === 'CRITICAL' ? 'Kritis (>=5x)' : item.severity === 'WARNING' ? 'Peringatan (3-4x)' : 'Perhatian (1-2x)'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `REKAP_SISWA_TERLAMBAT_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleClearAllAttendance = async () => {
    if (window.confirm("⚠️ KONFIRMASI RESET / HAPUS TOTAL DATA KETERLAMBATAN & PRESENSI:\n\nApakah Anda yakin ingin MENGHAPUS SELURUH RIWAYAT LOG PRESENSI & KETERLAMBATAN?\n\nSeluruh catatan siswa terlambat akan di-reset menjadi kosong (0 data).")) {
      const res = await AttendanceStorage.clearAllAttendanceData();
      alert(res.message);
      setSelectedStudentDetail(null);
    }
  };

  const handleDeleteRecord = async (recId: string) => {
    if (window.confirm("Hapus catatan kejadian keterlambatan ini dari database?")) {
      await AttendanceStorage.deleteAttendanceRecordByIds([recId]);
      if (selectedStudentDetail) {
        const updated = selectedStudentDetail.records.filter(r => r.id !== recId);
        if (updated.length === 0) {
          setSelectedStudentDetail(null);
        } else {
          setSelectedStudentDetail({
            ...selectedStudentDetail,
            records: updated,
            lateCount: updated.length
          });
        }
      }
    }
  };

  return (
    <div className="space-y-5 w-full">
      
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Peringkat Siswa Sering Terlambat
            </h2>
            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[11px] rounded-md">
              Khusus Siswa
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Akumulasi frekuensi dan durasi keterlambatan siswa untuk evaluasi bimbingan konseling dan wali kelas.
          </p>
        </div>

        {/* Export, Print & Reset Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleClearAllAttendance}
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Hapus Semua Riwayat Keterlambatan / Log Presensi (Reset ke 0)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Data Terlambat</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            title="Download Rekap Keterlambatan Siswa ke File CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrintLateReport}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            title="Cetak Rekap Siswa Terlambat untuk Guru Piket / BK"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Clean & Refined) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400 block">Total Siswa Terlambat</span>
          <div className="text-xl font-bold text-white mt-1">{summaryStats.totalLateStudents} <span className="text-xs text-slate-400 font-normal">Siswa</span></div>
          <span className="text-[10px] text-slate-500">{summaryStats.totalOccurrences} total kejadian</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] font-medium text-rose-300 block">Status Kritis (≥ 5x)</span>
          <div className="text-xl font-bold text-rose-400 mt-1">{summaryStats.criticalCount} <span className="text-xs text-rose-300 font-normal">Siswa</span></div>
          <span className="text-[10px] text-slate-500">Perlu panggilan ortu / BK</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] font-medium text-amber-300 block">Status Peringatan (3-4x)</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{summaryStats.warningCount} <span className="text-xs text-amber-300 font-normal">Siswa</span></div>
          <span className="text-[10px] text-slate-500">Bimbingan Wali Kelas</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] font-medium text-slate-300 block">Akumulasi Menit</span>
          <div className="text-xl font-bold text-slate-100 mt-1">+{summaryStats.totalMinutes} <span className="text-xs text-slate-400 font-normal">Mnt</span></div>
          <span className="text-[10px] text-slate-500">Rata-rata: {summaryStats.avgMinutesPerLate} m/kejadian</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
        
        {/* Row 1: Period Selection */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'today' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_week')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'this_week' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'this_month' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_semester')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'this_semester' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semester Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all_time')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'all_time' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'custom' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kustom
            </button>
          </div>

          <div className="text-xs text-slate-300 font-medium bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Periode: </span>
            <span className="font-semibold text-white">{periodLabel}</span>
          </div>
        </div>

        {/* Row 2: Custom Dates (if custom) */}
        {period === 'custom' && (
          <div className="flex items-center gap-3 flex-wrap bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="font-medium text-slate-400">Rentang Tanggal:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <span className="text-slate-500">s/d</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        )}

        {/* Row 3: Class, Urgency & Follow-Up Filter + Search */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Pilih Kelas / Rombel:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">Semua Kelas ({availableClasses.length} Rombel)</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Urgency Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status Keterlambatan:</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">Semua Tingkat ({rankingData.length} Siswa)</option>
              <option value="CRITICAL">Kritis (≥ 5x Terlambat)</option>
              <option value="WARNING">Peringatan (3 - 4x Terlambat)</option>
              <option value="CAUTION">Perhatian (1 - 2x Terlambat)</option>
            </select>
          </div>

          {/* Follow Up Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status Tindak Lanjut:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">Semua Status Tindak Lanjut</option>
              <option value="BELUM_DITINDAK">⚠️ Belum Ditindak</option>
              <option value="BIMBINGAN_WALI_KELAS">📋 Bimbingan Wali Kelas</option>
              <option value="PANGGILAN_ORTU_BK">👨‍👩‍👧 Panggilan Ortu (BK)</option>
              <option value="SURAT_PERINGATAN_1">📜 Surat Peringatan 1 (SP 1)</option>
              <option value="SURAT_PERINGATAN_2">📜 Surat Peringatan 2 (SP 2)</option>
              <option value="SURAT_PERINGATAN_3">🚨 Surat Peringatan 3 (SP 3)</option>
              <option value="SKORSING">⛔ Skorsing Rumah</option>
              <option value="SELESAI_DIBINA">✅ Selesai Dibina</option>
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Cari Nama / NISN:</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama / NISN..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Table Leaderboard Siswa Terlambat */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-md">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 text-center w-16">Peringkat</th>
              <th className="py-3 px-4">Nama Siswa</th>
              <th className="py-3 px-4">Kelas</th>
              <th className="py-3 px-4 text-center">Frekuensi</th>
              <th className="py-3 px-4 text-center">Total Menit</th>
              <th className="py-3 px-4 text-center">Rata-Rata</th>
              <th className="py-3 px-4">Terakhir Terlambat</th>
              <th className="py-3 px-4">Status Tindak Lanjut</th>
              <th className="py-3 px-4 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <UserX className="w-6 h-6 text-slate-600" />
                    <span>Tidak ada catatan siswa terlambat pada filter dan periode ini.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((item, idx) => {
                const isCritical = item.severity === 'CRITICAL';
                const isWarning = item.severity === 'WARNING';

                return (
                  <tr 
                    key={item.studentId}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      idx === 0 ? 'bg-rose-500/5' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${
                        idx === 0 ? 'bg-rose-500 text-white font-black' :
                        idx === 1 ? 'bg-slate-700 text-slate-200' :
                        idx === 2 ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                        'text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                      <div>{item.studentName}</div>
                      <span className="block text-[11px] text-slate-400 font-mono">
                        NISN: {item.nisn || '-'}
                      </span>
                    </td>

                    {/* Class */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700/60 rounded text-[11px] text-slate-300 font-medium">
                        {item.studentClass}
                      </span>
                    </td>

                    {/* Late Count */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md font-semibold text-xs ${
                        isCritical 
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {item.lateCount}x
                      </span>
                    </td>

                    {/* Total Late Minutes */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-300 text-xs whitespace-nowrap">
                      +{item.totalLateMinutes} m
                    </td>

                    {/* Avg Late Minutes */}
                    <td className="py-3 px-4 text-center font-mono text-slate-300 text-xs whitespace-nowrap">
                      ~{item.avgLateMinutes} m
                    </td>

                    {/* Latest Late Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-300 text-[11px]">
                      <div>{item.latestLateDate}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Pkl {item.latestLateTime} WIB</div>
                    </td>

                    {/* Severity / Follow Up Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        isCritical
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          : isWarning
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {isCritical && 'Panggilan Ortu & BK'}
                        {isWarning && 'Bimbingan Wali Kelas'}
                        {!isCritical && !isWarning && 'Monitoring Rutin'}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentDetail(item)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Lihat Rincian Jam Keterlambatan Siswa"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL FOR SINGLE STUDENT LATE RECORDS */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setSelectedStudentDetail(null)} />
          <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{selectedStudentDetail.studentName}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Kelas: {selectedStudentDetail.studentClass} • NISN: {selectedStudentDetail.nisn || '-'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Telat</span>
                <span className="text-sm font-bold text-rose-400">{selectedStudentDetail.lateCount}x</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Durasi</span>
                <span className="text-sm font-bold text-amber-300 font-mono">+{selectedStudentDetail.totalLateMinutes} mnt</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Telat Terlama</span>
                <span className="text-sm font-bold text-slate-200 font-mono">+{selectedStudentDetail.maxLateMinutes} mnt</span>
              </div>
            </div>

            {/* Records List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-xs font-semibold text-slate-300 mb-1">Riwayat Kejadian Keterlambatan:</div>
              {selectedStudentDetail.records.map((rec, i) => (
                <div key={rec.id || i} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      <span>{rec.dateFormatted}</span>
                      <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 text-[10px] rounded">
                        {rec.gateName || rec.gateLocation || '-'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Jam Tap: <strong>{rec.timeFormatted} WIB</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-bold font-mono">
                        +{rec.lateMinutes || 1} Menit
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Batas: {schedule.entryDeadlineTime}
                      </div>
                    </div>
                    {rec.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Kejadian Keterlambatan Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Close */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
