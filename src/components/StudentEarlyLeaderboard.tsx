import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  ChevronRight, 
  X, 
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import { StudentEarlyRankItem, SchoolSchedule } from '../types';
import { AttendanceStorage } from '../lib/storage';

interface StudentEarlyLeaderboardProps {
  schedule: SchoolSchedule;
  standalone?: boolean;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const StudentEarlyLeaderboard: React.FC<StudentEarlyLeaderboardProps> = ({
  schedule
}) => {
  const [syncVersion, setSyncVersion] = useState<number>(0);
  const [period, setPeriod] = useState<'today' | 'this_week' | 'this_month' | 'this_semester' | 'all_time' | 'custom'>('this_month');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Subscribe to realtime changes
  useEffect(() => {
    const unsub = AttendanceStorage.subscribeToSync(() => {
      setSyncVersion(v => v + 1);
    });
    return () => unsub();
  }, []);

  // Detail Modal for Single Student's Early Records
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentEarlyRankItem | null>(null);

  // Fetch ranking data
  const rankingData = useMemo(() => {
    return AttendanceStorage.getStudentEarlyRankings({
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
      if (q) {
        const nameMatch = (item.studentName || '').toLowerCase().includes(q);
        const nisnMatch = (item.nisn || '').toLowerCase().includes(q);
        const classMatch = (item.studentClass || '').toLowerCase().includes(q);
        if (!nameMatch && !nisnMatch && !classMatch) return false;
      }
      return true;
    });
  }, [rankingData, searchQuery]);

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

  // Print Early Report
  const handlePrintEarlyReport = () => {
    if (filteredList.length === 0) {
      alert('Tidak ada data siswa untuk dicetak.');
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
        <title>Peringkat Kedatangan Terpagi & Tepat Waktu - ${schedule.schoolName}</title>
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
          .top1 { background-color: #fef9c3; font-weight: 600; }
          .top2 { background-color: #f1f5f9; font-weight: 600; }
          .top3 { background-color: #ffedd5; font-weight: 600; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${schedule.schoolName || 'SMK EKONOMIKA DEPOK'}</h1>
          <h2>LAPORAN PERINGKAT SISWA TERPAGI & DISIPLIN TEPAT WAKTU</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
            Periode: <strong>${periodLabel}</strong> | Tanggal Cetak: ${new Date().toLocaleString('id-ID')}
          </p>
        </div>

        <div class="meta">
          <div>Filter Rombel: <strong>${selectedClass === 'ALL' ? 'Semua Kelas' : selectedClass}</strong></div>
          <div>Jumlah Siswa: <strong>${filteredList.length} Siswa</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">Rank</th>
              <th>Nama Lengkap Siswa</th>
              <th style="width: 90px;">NISN</th>
              <th style="width: 80px;">Kelas</th>
              <th class="text-center" style="width: 90px;">Tepat Waktu</th>
              <th class="text-center" style="width: 80px;">Total Hadir</th>
              <th class="text-center" style="width: 90px;">Jam Terpagi</th>
              <th class="text-center" style="width: 100px;">Rata-rata Masuk</th>
            </tr>
          </thead>
          <tbody>
            ${filteredList.map((item, idx) => `
              <tr class="${idx === 0 ? 'top1' : idx === 1 ? 'top2' : idx === 2 ? 'top3' : ''}">
                <td class="text-center">#${item.rank}</td>
                <td><strong>${item.studentName}</strong></td>
                <td>${item.nisn || '-'}</td>
                <td>${item.studentClass || '-'}</td>
                <td class="text-center">${item.onTimeCount} Kali</td>
                <td class="text-center">${item.totalPresent} Hari</td>
                <td class="text-center">${item.earliestTime} WIB</td>
                <td class="text-center">${item.avgArrivalTime} WIB</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div style="text-align: center; width: 220px;">
            Mengetahui,<br>Kepala Sekolah<br><br><br><br>
            <strong>_____________________</strong>
          </div>
          <div style="text-align: center; width: 220px;">
            Depok, ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}<br>
            Kesiswaan / Guru Piket<br><br><br><br>
            <strong>_____________________</strong>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
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
      alert('Tidak ada data siswa untuk diekspor.');
      return;
    }

    const headers = [
      'Peringkat',
      'Nama Siswa',
      'NISN',
      'Kelas',
      'Kehadiran Tepat Waktu (Kali)',
      'Total Kehadiran (Hari)',
      'Jam Datang Terpagi',
      'Tanggal Datang Terpagi',
      'Rata-rata Jam Datang'
    ];

    const rows = filteredList.map((item, idx) => [
      idx + 1,
      `"${item.studentName.replace(/"/g, '""')}"`,
      `"${item.nisn || '-'}"`,
      `"${item.studentClass || '-'}"`,
      item.onTimeCount,
      item.totalPresent,
      item.earliestTime,
      item.earliestDate,
      item.avgArrivalTime
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `REKAP_SISWA_TERPAGI_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleClearAllAttendance = async () => {
    if (window.confirm("⚠️ KONFIRMASI RESET / HAPUS TOTAL DATA PRESENSI:\n\nApakah Anda yakin ingin MENGHAPUS SELURUH RIWAYAT LOG PRESENSI?\n\nSemua data kehadiran, jam terpagi, dan keterlambatan akan di-reset menjadi kosong (0 data).")) {
      const res = await AttendanceStorage.clearAllAttendanceData();
      alert(res.message);
      setSelectedStudentDetail(null);
    }
  };

  const handleDeleteRecord = async (recId: string) => {
    if (window.confirm("Hapus catatan log presensi ini dari database?")) {
      await AttendanceStorage.deleteAttendanceRecordByIds([recId]);
      if (selectedStudentDetail) {
        const updated = selectedStudentDetail.records.filter(r => r.id !== recId);
        if (updated.length === 0) {
          setSelectedStudentDetail(null);
        } else {
          setSelectedStudentDetail({
            ...selectedStudentDetail,
            records: updated
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
              Peringkat Siswa Terpagi & Disiplin
            </h2>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] rounded-md">
              Khusus Siswa
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Daftar siswa dengan kehadiran tepat waktu tertinggi dan waktu tap presensi paling awal.
          </p>
        </div>

        {/* Export, Print & Reset Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleClearAllAttendance}
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Hapus Semua Riwayat Presensi / Log Absensi (Reset ke 0)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Data Presensi</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrintEarlyReport}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Podium Top 3 Cards (Clean & Readable) */}
      {filteredList.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          
          {/* Peringkat 2 */}
          <div className="order-2 md:order-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700">
                Peringkat 2
              </span>
              <span className="text-[11px] text-slate-400 font-medium">{filteredList[1].studentClass}</span>
            </div>
            <div className="my-3">
              <h4 className="font-bold text-white text-base truncate">{filteredList[1].studentName}</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">NISN: {filteredList[1].nisn || '-'}</p>
            </div>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">{filteredList[1].onTimeCount}x Tepat Waktu</span>
              <span className="text-slate-300 font-mono text-[11px]">Terpagi: {filteredList[1].earliestTime}</span>
            </div>
          </div>

          {/* Peringkat 1 */}
          <div className="order-1 md:order-2 bg-slate-900 border border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between relative shadow-md">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                Peringkat 1 Terpagi
              </span>
              <span className="text-xs font-semibold text-amber-400/90">{filteredList[0].studentClass}</span>
            </div>
            <div className="my-3">
              <h3 className="font-extrabold text-amber-200 text-lg truncate">{filteredList[0].studentName}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">NISN: {filteredList[0].nisn || '-'}</p>
            </div>
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold">{filteredList[0].onTimeCount}x Tepat Waktu</span>
              <span className="text-amber-300 font-mono font-semibold text-[11px]">Terpagi: {filteredList[0].earliestTime}</span>
            </div>
          </div>

          {/* Peringkat 3 */}
          <div className="order-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700">
                Peringkat 3
              </span>
              <span className="text-[11px] text-slate-400 font-medium">{filteredList[2].studentClass}</span>
            </div>
            <div className="my-3">
              <h4 className="font-bold text-white text-base truncate">{filteredList[2].studentName}</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">NISN: {filteredList[2].nisn || '-'}</p>
            </div>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">{filteredList[2].onTimeCount}x Tepat Waktu</span>
              <span className="text-slate-300 font-mono text-[11px]">Terpagi: {filteredList[2].earliestTime}</span>
            </div>
          </div>

        </div>
      )}

      {/* Filter & Period Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
        
        {/* Row 1: Period Selection */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'today' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_week')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'this_week' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'this_month' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_semester')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'this_semester' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semester Ini
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all_time')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'all_time' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                period === 'custom' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
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

        {/* Row 2: Custom Date Range (If custom selected) */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Rentang Tanggal:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-500">s/d</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {/* Row 3: Class Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, NISN, atau kelas..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
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

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium shrink-0">Filter Kelas:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Kelas ({availableClasses.length})</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Ranking Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-md">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 text-center w-16">Peringkat</th>
              <th className="py-3 px-4">Nama Siswa</th>
              <th className="py-3 px-4">Kelas</th>
              <th className="py-3 px-4 text-center">Tepat Waktu</th>
              <th className="py-3 px-4 text-center">Total Hadir</th>
              <th className="py-3 px-4 text-center">Jam Terpagi</th>
              <th className="py-3 px-4 text-center">Rata-Rata Masuk</th>
              <th className="py-3 px-4 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  Tidak ada data presensi masuk siswa untuk kriteria filter yang dipilih.
                </td>
              </tr>
            ) : (
              filteredList.map((item) => (
                <tr 
                  key={item.studentId}
                  className={`hover:bg-slate-800/50 transition-colors ${
                    item.rank === 1 ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${
                      item.rank === 1 
                        ? 'bg-amber-500 text-slate-950 font-black' 
                        : item.rank === 2 
                        ? 'bg-slate-700 text-slate-200' 
                        : item.rank === 3 
                        ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                        : 'text-slate-400'
                    }`}>
                      #{item.rank}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                    <div>
                      <span className="hover:text-emerald-400 transition-colors cursor-pointer" onClick={() => setSelectedStudentDetail(item)}>
                        {item.studentName}
                      </span>
                      <span className="block text-[11px] font-normal text-slate-400 font-mono">NISN: {item.nisn || '-'}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px] border border-slate-700/60">
                      {item.studentClass}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {item.onTimeCount} Kali
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap text-slate-300 font-medium">
                    {item.totalPresent} Hari
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-medium text-amber-300">
                    {item.earliestTime}
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap font-mono text-slate-300">
                    {item.avgArrivalTime}
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentDetail(item)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Rincian</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Single Student Detail Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedStudentDetail.studentName}</h3>
                <p className="text-xs text-slate-400 font-mono">Kelas: {selectedStudentDetail.studentClass} • NISN: {selectedStudentDetail.nisn || '-'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Tepat Waktu</span>
                <span className="text-sm font-bold text-emerald-400">{selectedStudentDetail.onTimeCount}x</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Total Hadir</span>
                <span className="text-sm font-bold text-white">{selectedStudentDetail.totalPresent} Hari</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Jam Terpagi</span>
                <span className="text-sm font-bold text-amber-300 font-mono">{selectedStudentDetail.earliestTime}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Rata-rata</span>
                <span className="text-sm font-bold text-slate-200 font-mono">{selectedStudentDetail.avgArrivalTime}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Riwayat Presensi Masuk ({selectedStudentDetail.records.length} Catatan):</h4>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/80 text-xs">
                {selectedStudentDetail.records.map((r) => (
                  <div key={r.id} className="p-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-medium text-white">{r.dateFormatted}</span>
                      <span className="text-[11px] text-slate-400 block">Titik Pintu: {r.gateName || r.gateLocation || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-300 text-xs">{r.timeFormatted} WIB</span>
                        <span className={`block text-[10px] font-medium ${
                          r.status === 'TEPAT_WAKTU' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {r.status === 'TEPAT_WAKTU' ? 'Tepat Waktu' : 'Terlambat'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(r.id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Catatan Log Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
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
