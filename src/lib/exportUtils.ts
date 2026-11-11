import * as XLSX from 'xlsx';
import { AttendanceRecord, PairedDailyAttendance, Student, Teacher, StudentDisciplineSummary, DisciplineGrade, SchoolSchedule } from '../types';
import { AttendanceStorage } from './storage';

export const pairAttendanceRecords = (
  records: AttendanceRecord[], 
  filterType?: 'STUDENT' | 'TEACHER',
  customStudents?: Student[],
  customTeachers?: Teacher[]
): PairedDailyAttendance[] => {
  const map = new Map<string, PairedDailyAttendance>();

  // Fetch reference data for auto-lookup fallback if student/teacher metadata is missing in the record
  const students = customStudents || (typeof window !== 'undefined' ? AttendanceStorage.getStudents() : []);
  const teachers = customTeachers || (typeof window !== 'undefined' ? AttendanceStorage.getTeachers() : []);

  // Filter if specified
  const filtered = filterType 
    ? records.filter(r => (filterType === 'TEACHER' ? (r.userType === 'TEACHER' || !!r.teacherId) : (r.userType === 'STUDENT' || (!r.userType && !r.teacherId))))
    : records;

  // Sort chronological
  const sorted = [...filtered].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const rec of sorted) {
    const isTeacher = rec.userType === 'TEACHER' || !!r_isTeacher(rec);
    const cleanUid = (rec.rfidUid || '').trim().toUpperCase();

    // Auto-Lookup / Heal missing student info
    let studentId = rec.studentId;
    let studentName = rec.studentName;
    let nisn = rec.nisn;
    let studentClass = rec.studentClass;
    let isOrphan = false;

    // Auto-Lookup / Heal missing teacher info
    let teacherId = rec.teacherId;
    let teacherName = rec.teacherName;
    let nip = rec.nip;
    let teacherPosition = rec.teacherPosition;

    if (isTeacher) {
      if (!teacherName || teacherName.trim() === '') {
        const matchedTch = teachers.find(t => t.id === rec.teacherId || (cleanUid && t.rfidUid.trim().toUpperCase() === cleanUid));
        if (matchedTch) {
          teacherId = matchedTch.id;
          teacherName = matchedTch.name;
          nip = matchedTch.nip;
          teacherPosition = matchedTch.position;
        } else {
          teacherName = rec.teacherName || (cleanUid ? `(Kartu: ${cleanUid} - Guru Tidak Ditemukan)` : '(Guru Tidak Terdaftar)');
          nip = nip || '-';
          teacherPosition = teacherPosition || '-';
          isOrphan = true;
        }
      }
    } else {
      if (!studentName || studentName.trim() === '') {
        const matchedStd = students.find(s => s.id === rec.studentId || (cleanUid && s.rfidUid.trim().toUpperCase() === cleanUid));
        if (matchedStd) {
          studentId = matchedStd.id;
          studentName = matchedStd.name;
          nisn = matchedStd.nisn;
          studentClass = matchedStd.class;
        } else {
          studentName = rec.studentName || (cleanUid ? `(Kartu: ${cleanUid} - Siswa Belum Terdaftar)` : '(Data Siswa Kosong / Terhapus)');
          nisn = nisn || '-';
          studentClass = studentClass || 'Belum Terdaftar';
          isOrphan = true;
        }
      }
    }

    const uniqueId = isTeacher 
      ? (teacherId || nip || teacherName || cleanUid || 'unknown_tch')
      : (studentId || nisn || studentName || cleanUid || 'unknown_std');

    const key = isTeacher 
      ? `${rec.dateFormatted}_TCH_${uniqueId}`
      : `${rec.dateFormatted}_STD_${uniqueId}`;

    if (!map.has(key)) {
      map.set(key, {
        id: `pair_${key}`,
        userType: isTeacher ? 'TEACHER' : 'STUDENT',
        dateFormatted: rec.dateFormatted,
        // Student fields
        studentId,
        studentName,
        nisn: nisn || '-',
        studentClass,
        // Teacher fields
        teacherId,
        teacherName,
        nip: nip || '-',
        teacherPosition,
        // Common
        rfidUid: rec.rfidUid,
        entryTime: rec.type === 'MASUK' ? rec.timeFormatted : '-',
        entryTimestamp: rec.type === 'MASUK' ? rec.timestamp : undefined,
        entryStatus: rec.type === 'MASUK' ? rec.status : 'BELUM_HADIR',
        entryGate: rec.type === 'MASUK' ? rec.gateName : '-',
        lateMinutes: rec.type === 'MASUK' ? rec.lateMinutes : undefined,
        exitTime: rec.type === 'PULANG' ? rec.timeFormatted : 'Belum Pulang',
        exitTimestamp: rec.type === 'PULANG' ? rec.timestamp : undefined,
        exitGate: rec.type === 'PULANG' ? rec.gateName : '-',
        summaryStatus: rec.status === 'TERLAMBAT' ? 'Terlambat' : rec.status === 'TEPAT_WAKTU' ? 'Tepat Waktu' : rec.status === 'PULANG' ? 'Hadir & Pulang' : rec.status,
        notes: rec.notes || '',
        isManualOverride: rec.isManualOverride || false,
        recordIds: [rec.id],
        isOrphan
      });
    } else {
      const existing = map.get(key)!;
      if (rec.id && existing.recordIds && !existing.recordIds.includes(rec.id)) {
        existing.recordIds.push(rec.id);
      }
      if (rec.type === 'MASUK') {
        existing.entryTime = rec.timeFormatted;
        existing.entryTimestamp = rec.timestamp;
        existing.entryStatus = rec.status;
        existing.entryGate = rec.gateName;
        existing.lateMinutes = rec.lateMinutes;
        if (rec.status === 'TERLAMBAT') {
          existing.summaryStatus = 'Terlambat';
        }
      } else if (rec.type === 'PULANG') {
        existing.exitTime = rec.timeFormatted;
        existing.exitTimestamp = rec.timestamp;
        existing.exitGate = rec.gateName;
        if (existing.entryStatus === 'TEPAT_WAKTU') {
          existing.summaryStatus = 'Tepat Waktu';
        } else if (existing.entryStatus === 'TERLAMBAT') {
          existing.summaryStatus = `Terlambat (+${existing.lateMinutes || 0}m)`;
        } else {
          existing.summaryStatus = 'Pulang';
        }
      }
      if (rec.notes) {
        existing.notes = existing.notes ? `${existing.notes}; ${rec.notes}` : rec.notes;
      }
      if (rec.isManualOverride) {
        existing.isManualOverride = true;
      }
    }
  }

  return Array.from(map.values());
};

function r_isTeacher(rec: AttendanceRecord): boolean {
  return rec.userType === 'TEACHER' || Boolean(rec.teacherId) || Boolean(rec.teacherName);
}

// Export Siswa to Excel with exact tap times
export const exportAttendanceToExcel = (
  items: (PairedDailyAttendance | AttendanceRecord)[], 
  filenamePrefix = 'Rekap_Absensi_Siswa_RFID',
  periodLabel?: string
) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanPrefix = filenamePrefix.replace(/\s+/g, '_');
  const filename = `${cleanPrefix}_${dateStr}.xlsx`;

  // Check if already paired or raw
  const isPaired = items.length > 0 && 'entryTime' in items[0];
  const pairedList: PairedDailyAttendance[] = isPaired 
    ? (items as PairedDailyAttendance[]) 
    : pairAttendanceRecords(items as AttendanceRecord[], 'STUDENT');

  const excelData = pairedList.map((rec, idx) => ({
    'No': idx + 1,
    'Tanggal': rec.dateFormatted,
    'NISN': rec.nisn || '-',
    'Nama Siswa': rec.studentName || '-',
    'Kelas': rec.studentClass || '-',
    'Tap Masuk (Waktu)': rec.entryTime,
    'Status Masuk': rec.entryStatus === 'TEPAT_WAKTU' ? 'Tepat Waktu' : rec.entryStatus === 'TERLAMBAT' ? `Terlambat (+${rec.lateMinutes || 0}m)` : rec.entryStatus === 'BELUM_HADIR' ? 'Belum Masuk' : rec.entryStatus,
    'Pintu Masuk': rec.entryGate,
    'Tap Pulang (Waktu)': rec.exitTime,
    'Pintu Pulang': rec.exitGate,
    'Status Keseluruhan': rec.summaryStatus,
    'Keterangan Tambahan': rec.notes || '-',
    'RFID UID': rec.rfidUid,
    'Metode': rec.isManualOverride ? 'Manual (Guru Piket)' : 'RFID Tap Otomatis'
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 15 }, // NISN
    { wch: 25 }, // Nama Siswa
    { wch: 14 }, // Kelas
    { wch: 20 }, // Tap Masuk (Waktu)
    { wch: 18 }, // Status Masuk
    { wch: 15 }, // Pintu Masuk
    { wch: 20 }, // Tap Pulang (Waktu)
    { wch: 15 }, // Pintu Pulang
    { wch: 22 }, // Status Keseluruhan
    { wch: 25 }, // Keterangan
    { wch: 15 }, // RFID UID
    { wch: 20 }  // Metode
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, periodLabel ? periodLabel.slice(0, 31) : 'Rekap Siswa');

  XLSX.writeFile(workbook, filename);
};

// Export Guru / Tenaga Pendidik to Excel with exact tap times
export const exportTeacherAttendanceToExcel = (
  items: (PairedDailyAttendance | AttendanceRecord)[], 
  filenamePrefix = 'Rekap_Absensi_Guru_RFID',
  periodLabel?: string
) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanPrefix = filenamePrefix.replace(/\s+/g, '_');
  const filename = `${cleanPrefix}_${dateStr}.xlsx`;

  const isPaired = items.length > 0 && 'entryTime' in items[0];
  const pairedList: PairedDailyAttendance[] = isPaired 
    ? (items as PairedDailyAttendance[]) 
    : pairAttendanceRecords(items as AttendanceRecord[], 'TEACHER');

  const excelData = pairedList.map((rec, idx) => ({
    'No': idx + 1,
    'Tanggal': rec.dateFormatted,
    'NIP / NUPTK': rec.nip || '-',
    'Nama Guru / PTK': rec.teacherName || '-',
    'Jabatan / Mata Pelajaran': rec.teacherPosition || '-',
    'Tap Masuk (Waktu)': rec.entryTime,
    'Status Masuk': rec.entryStatus === 'TEPAT_WAKTU' ? 'Tepat Waktu' : rec.entryStatus === 'TERLAMBAT' ? `Terlambat (+${rec.lateMinutes || 0}m)` : rec.entryStatus === 'BELUM_HADIR' ? 'Belum Masuk' : rec.entryStatus,
    'Pintu Masuk': rec.entryGate,
    'Tap Pulang (Waktu)': rec.exitTime,
    'Pintu Pulang': rec.exitGate,
    'Status Presensi': rec.summaryStatus,
    'Keterangan': rec.notes || '-',
    'RFID UID': rec.rfidUid,
    'Metode': rec.isManualOverride ? 'Manual' : 'RFID Tap Otomatis'
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 22 }, // NIP
    { wch: 30 }, // Nama Guru
    { wch: 28 }, // Jabatan
    { wch: 20 }, // Tap Masuk (Waktu)
    { wch: 18 }, // Status Masuk
    { wch: 15 }, // Pintu Masuk
    { wch: 20 }, // Tap Pulang (Waktu)
    { wch: 15 }, // Pintu Pulang
    { wch: 22 }, // Status Presensi
    { wch: 25 }, // Keterangan
    { wch: 15 }, // RFID UID
    { wch: 20 }  // Metode
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, periodLabel ? periodLabel.slice(0, 31) : 'Rekap Presensi Guru');

  XLSX.writeFile(workbook, filename);
};

export const exportAttendanceToCSV = (
  items: (PairedDailyAttendance | AttendanceRecord)[], 
  filenamePrefix = 'Rekap_Absensi_Siswa_RFID'
) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanPrefix = filenamePrefix.replace(/\s+/g, '_');
  const filename = `${cleanPrefix}_${dateStr}.csv`;

  const isPaired = items.length > 0 && 'entryTime' in items[0];
  const pairedList: PairedDailyAttendance[] = isPaired 
    ? (items as PairedDailyAttendance[]) 
    : pairAttendanceRecords(items as AttendanceRecord[], 'STUDENT');

  const headers = [
    'No',
    'Tanggal',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'Tap Masuk',
    'Status Masuk',
    'Pintu Masuk',
    'Tap Pulang',
    'Pintu Pulang',
    'Status Keseluruhan',
    'Keterangan',
    'RFID UID'
  ];

  const rows = pairedList.map((rec, idx) => [
    idx + 1,
    `"${rec.dateFormatted}"`,
    `"${rec.nisn || '-'}"`,
    `"${rec.studentName || '-'}"`,
    `"${rec.studentClass || '-'}"`,
    `"${rec.entryTime}"`,
    `"${rec.entryStatus === 'TEPAT_WAKTU' ? 'Tepat Waktu' : rec.entryStatus === 'TERLAMBAT' ? `Terlambat (+${rec.lateMinutes || 0}m)` : rec.entryStatus}"`,
    `"${rec.entryGate}"`,
    `"${rec.exitTime}"`,
    `"${rec.exitGate}"`,
    `"${rec.summaryStatus}"`,
    `"${rec.notes || '-'}"`,
    `"${rec.rfidUid}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTeacherAttendanceToCSV = (
  items: (PairedDailyAttendance | AttendanceRecord)[], 
  filenamePrefix = 'Rekap_Absensi_Guru_RFID'
) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanPrefix = filenamePrefix.replace(/\s+/g, '_');
  const filename = `${cleanPrefix}_${dateStr}.csv`;

  const isPaired = items.length > 0 && 'entryTime' in items[0];
  const pairedList: PairedDailyAttendance[] = isPaired 
    ? (items as PairedDailyAttendance[]) 
    : pairAttendanceRecords(items as AttendanceRecord[], 'TEACHER');

  const headers = [
    'No',
    'Tanggal',
    'NIP',
    'Nama Guru',
    'Jabatan',
    'Tap Masuk',
    'Status Masuk',
    'Pintu Masuk',
    'Tap Pulang',
    'Pintu Pulang',
    'Status Presensi',
    'Keterangan',
    'RFID UID'
  ];

  const rows = pairedList.map((rec, idx) => [
    idx + 1,
    `"${rec.dateFormatted}"`,
    `"${rec.nip || '-'}"`,
    `"${rec.teacherName || '-'}"`,
    `"${rec.teacherPosition || '-'}"`,
    `"${rec.entryTime}"`,
    `"${rec.entryStatus === 'TEPAT_WAKTU' ? 'Tepat Waktu' : rec.entryStatus === 'TERLAMBAT' ? `Terlambat (+${rec.lateMinutes || 0}m)` : rec.entryStatus}"`,
    `"${rec.entryGate}"`,
    `"${rec.exitTime}"`,
    `"${rec.exitGate}"`,
    `"${rec.summaryStatus}"`,
    `"${rec.notes || '-'}"`,
    `"${rec.rfidUid}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printAttendanceReport = (
  items: (PairedDailyAttendance | AttendanceRecord)[], 
  schoolName: string, 
  title = 'Laporan Rekap Absensi Siswa (Masuk & Pulang Bersandingan)',
  periodSubtitle?: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const isPaired = items.length > 0 && 'entryTime' in items[0];
  const pairedList: PairedDailyAttendance[] = isPaired 
    ? (items as PairedDailyAttendance[]) 
    : pairAttendanceRecords(items as AttendanceRecord[], 'STUDENT');

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tableRows = pairedList.map((rec, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-size: 11px;">${rec.dateFormatted}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-size: 11px;">${rec.nisn || '-'}</td>
      <td style="padding: 6px 8px; font-weight: 600;">${rec.studentName || '-'}</td>
      <td style="padding: 6px 8px;">${rec.studentClass || '-'}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #15803d;">
        ${rec.entryTime}
        ${rec.entryStatus === 'TERLAMBAT' ? `<span style="color: #b45309; font-size: 10px; display: block;">(+${rec.lateMinutes || 0}m)</span>` : ''}
      </td>
      <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${rec.entryGate}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: ${rec.exitTime === 'Belum Pulang' ? '#94a3b8' : '#1d4ed8'};">
        ${rec.exitTime}
      </td>
      <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${rec.exitGate}</td>
      <td style="padding: 6px 8px; font-weight: 600; font-size: 11px; color: ${rec.entryStatus === 'TEPAT_WAKTU' ? '#15803d' : rec.entryStatus === 'TERLAMBAT' ? '#b45309' : '#1e293b'};">
        ${rec.summaryStatus}
      </td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
          .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
          .header h2 { margin: 4px 0 0 0; font-size: 15px; color: #1e293b; font-weight: bold; }
          .header p { margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500; }
          .meta { margin-bottom: 14px; font-size: 12px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 36px; display: flex; justify-content: space-between; font-size: 12px; }
          .sign-box { text-align: center; width: 200px; }
          .sign-line { margin-top: 50px; border-top: 1px solid #0f172a; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${schoolName}</h1>
          <h2>${title}</h2>
          ${periodSubtitle ? `<p>${periodSubtitle}</p>` : ''}
        </div>
        <div class="meta">
          <span><strong>Dicetak pada:</strong> ${dateStr}</span>
          <span><strong>Total Rekap Siswa:</strong> ${pairedList.length} data</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">No</th>
              <th>Tanggal</th>
              <th>NISN</th>
              <th>Nama Siswa</th>
              <th>Kelas</th>
              <th>Tap Masuk</th>
              <th>Pintu Masuk</th>
              <th>Tap Pulang</th>
              <th>Pintu Pulang</th>
              <th>Status Absensi</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.length > 0 ? tableRows : '<tr><td colspan="10" style="text-align:center; padding: 20px;">Tidak ada data absensi untuk kriteria / periode ini.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-box">
            <p>Mengetahui,</p>
            <p><strong>Guru Piket / Admin</strong></p>
            <div class="sign-line"></div>
          </div>
          <div class="sign-box">
            <p>Kepala Sekolah,</p>
            <p>&nbsp;</p>
            <div class="sign-line"></div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const printTeacherAttendanceReport = (
  items: (PairedDailyAttendance | AttendanceRecord)[], 
  schoolName: string, 
  title = 'Laporan Rekap Presensi Guru & Tenaga Kependidikan',
  periodSubtitle?: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const isPaired = items.length > 0 && 'entryTime' in items[0];
  const pairedList: PairedDailyAttendance[] = isPaired 
    ? (items as PairedDailyAttendance[]) 
    : pairAttendanceRecords(items as AttendanceRecord[], 'TEACHER');

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tableRows = pairedList.map((rec, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-size: 11px;">${rec.dateFormatted}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-size: 11px;">${rec.nip || '-'}</td>
      <td style="padding: 6px 8px; font-weight: 600;">${rec.teacherName || '-'}</td>
      <td style="padding: 6px 8px;">${rec.teacherPosition || '-'}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #15803d;">
        ${rec.entryTime}
        ${rec.entryStatus === 'TERLAMBAT' ? `<span style="color: #b45309; font-size: 10px; display: block;">(+${rec.lateMinutes || 0}m)</span>` : ''}
      </td>
      <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${rec.entryGate}</td>
      <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: ${rec.exitTime === 'Belum Pulang' ? '#94a3b8' : '#1d4ed8'};">
        ${rec.exitTime}
      </td>
      <td style="padding: 6px 8px; font-size: 11px; color: #475569;">${rec.exitGate}</td>
      <td style="padding: 6px 8px; font-weight: 600; font-size: 11px; color: ${rec.entryStatus === 'TEPAT_WAKTU' ? '#15803d' : rec.entryStatus === 'TERLAMBAT' ? '#b45309' : '#1e293b'};">
        ${rec.summaryStatus}
      </td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
          .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
          .header h2 { margin: 4px 0 0 0; font-size: 15px; color: #1e293b; font-weight: bold; }
          .header p { margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500; }
          .meta { margin-bottom: 14px; font-size: 12px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 36px; display: flex; justify-content: space-between; font-size: 12px; }
          .sign-box { text-align: center; width: 200px; }
          .sign-line { margin-top: 50px; border-top: 1px solid #0f172a; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${schoolName}</h1>
          <h2>${title}</h2>
          ${periodSubtitle ? `<p>${periodSubtitle}</p>` : ''}
        </div>
        <div class="meta">
          <span><strong>Dicetak pada:</strong> ${dateStr}</span>
          <span><strong>Total Rekap Guru:</strong> ${pairedList.length} data</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">No</th>
              <th>Tanggal</th>
              <th>NIP / NUPTK</th>
              <th>Nama Guru / PTK</th>
              <th>Jabatan / Mapel</th>
              <th>Tap Masuk</th>
              <th>Pintu Masuk</th>
              <th>Tap Pulang</th>
              <th>Pintu Pulang</th>
              <th>Status Presensi</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.length > 0 ? tableRows : '<tr><td colspan="10" style="text-align:center; padding: 20px;">Tidak ada data presensi guru untuk kriteria / periode ini.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-box">
            <p>Mengetahui,</p>
            <p><strong>Admin Presensi / TU</strong></p>
            <div class="sign-line"></div>
          </div>
          <div class="sign-box">
            <p>Kepala Sekolah,</p>
            <p>&nbsp;</p>
            <div class="sign-line"></div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const downloadStudentCsvTemplate = () => {
  const headers = ['Nama', 'NISN', 'Kelas', 'RFID_UID', 'Jenis_Kelamin', 'No_HP'];
  const sampleRows = [
    ['Ahmad Rizky Pratama', '0068492011', 'X MIPA 1', '0008451293', 'L', '081234567890'],
    ['Siti Nurhaliza', '0072849102', 'X MIPA 1', 'A34F221C', 'P', '081298765432'],
    ['Budi Santoso', '0061928475', 'X MIPA 2', '0009988771', 'L', '085611223344'],
    ['Dewi Anggraini', '0073918204', 'X MIPA 2', 'B891002F', 'P', '087788990011']
  ];

  const csvContent = [
    headers.join(','),
    ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_import_siswa_nisn_rfid.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadTeacherCsvTemplate = () => {
  const headers = ['Nama', 'NIP', 'Jabatan', 'RFID_UID', 'Jenis_Kelamin', 'No_HP'];
  const sampleRows = [
    ['Drs. H. Bambang Sujarwo, M.Pd.', '196805121994031005', 'Kepala Sekolah & Guru PKn', 'TCH-990182', 'L', '081234567890'],
    ['Siti Rahmawati, S.Pd.', '198207192008012015', 'Waka Kurikulum & Guru Matematika', 'TCH-882190', 'P', '081298765432'],
    ['Ahmad Fauzi, S.Kom., M.TI.', '198903142015021008', 'Kepala Program & Guru RPL', 'TCH-773821', 'L', '085611223344'],
    ['Nurul Aini, S.E., M.M.', '198511252010012019', 'Waka Kesiswaan & Guru Akuntansi', 'TCH-664912', 'P', '087788990011']
  ];

  const csvContent = [
    headers.join(','),
    ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_import_guru_ptk_rfid.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// =========================================================================
// STUDENT DISCIPLINE CALCULATION & MONTHLY / SEMESTER REPORT CARD UTILITIES
// =========================================================================

export const calculateStudentDisciplineSummaries = (
  students: Student[],
  allRecords: AttendanceRecord[],
  startDate: string,
  endDate: string,
  periodLabel: string,
  targetClass: string = 'ALL'
): StudentDisciplineSummary[] => {
  // 1. Filter student pool by class if specified
  const studentList = targetClass === 'ALL' 
    ? students 
    : students.filter(s => s.class === targetClass);

  // 2. Filter attendance records within date range and student scope
  const periodRecords = allRecords.filter(r => {
    const isStudent = r.userType === 'STUDENT' || (!r.userType && !r.teacherId);
    if (!isStudent) return false;
    const date = r.dateFormatted;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  });

  // 3. Pair records into daily sessions
  const pairedPeriodRecords = pairAttendanceRecords(periodRecords, 'STUDENT', students);

  // 4. Determine unique effective active dates with attendance in this period
  const uniqueActiveDates = Array.from(new Set(periodRecords.map(r => r.dateFormatted))).sort();
  const totalEffectiveDays = Math.max(uniqueActiveDates.length, 1);

  // 5. Build summary for each student
  return studentList.map(student => {
    const cleanUid = (student.rfidUid || '').trim().toUpperCase();
    
    // Find all daily paired records for this student
    const studentDaily = pairedPeriodRecords.filter(p => 
      p.studentId === student.id || 
      (p.nisn && p.nisn === student.nisn) || 
      (cleanUid && (p.rfidUid || '').trim().toUpperCase() === cleanUid)
    ).sort((a, b) => a.dateFormatted.localeCompare(b.dateFormatted));

    let onTimeCount = 0;
    let lateCount = 0;
    let totalLateMinutes = 0;
    let permissionCount = 0;
    let sickCount = 0;
    let alphaCount = 0;

    studentDaily.forEach(rec => {
      if (rec.entryStatus === 'TEPAT_WAKTU') {
        onTimeCount++;
      } else if (rec.entryStatus === 'TERLAMBAT') {
        lateCount++;
        totalLateMinutes += (rec.lateMinutes || 0);
      } else if (rec.entryStatus === 'IZIN') {
        permissionCount++;
      } else if (rec.entryStatus === 'SAKIT') {
        sickCount++;
      } else if (rec.entryStatus === 'ALPHA' || rec.entryStatus === 'DITOLAK') {
        alphaCount++;
      }
    });

    const presentDays = onTimeCount + lateCount;
    
    // Attendance rate
    const validPresence = presentDays + sickCount + permissionCount;
    const attendanceRate = totalEffectiveDays > 0 
      ? Math.min(100, Math.round((presentDays / totalEffectiveDays) * 100))
      : 0;

    // Punctuality rate
    const punctualityRate = presentDays > 0 
      ? Math.round((onTimeCount / presentDays) * 100) 
      : (totalEffectiveDays === 0 ? 100 : 0);

    // Calculate Discipline Score (Base 100)
    // -2 per late occurrence, -0.1 per minute late (max -10 from duration)
    // -5 per alpha/unexcused absence
    // -1 per unexcused permit beyond 2
    let calculatedScore = 100;
    calculatedScore -= (lateCount * 2.5);
    calculatedScore -= Math.min(15, totalLateMinutes * 0.15);
    calculatedScore -= (alphaCount * 6);
    if (permissionCount > 3) {
      calculatedScore -= (permissionCount - 3) * 1.5;
    }

    const disciplineScore = Math.max(0, Math.min(100, Math.round(calculatedScore)));

    // Assign Grade and Predicate
    let grade: DisciplineGrade = 'A';
    let predikat = 'Sangat Baik (Disiplin Teladan)';
    let recommendation = 'Pertahankan kedisiplinan dan semangat belajar yang luar biasa ini.';

    if (disciplineScore >= 90) {
      grade = 'A';
      predikat = 'Sangat Baik (Disiplin Teladan)';
      recommendation = 'Ananda menunjukkan komitmen kehadiran dan ketepatan waktu yang sangat terpuji. Pertahankan prestasi ini.';
    } else if (disciplineScore >= 80) {
      grade = 'B';
      predikat = 'Baik (Disiplin Terjaga)';
      recommendation = 'Kedisiplinan ananda sudah baik. Tingkatkan konsistensi jam keberangkatan agar selalu hadir tepat waktu.';
    } else if (disciplineScore >= 70) {
      grade = 'C';
      predikat = 'Cukup (Perlu Ditingkatkan)';
      recommendation = `Ananda tercatat terlambat ${lateCount} kali (${totalLateMinutes} menit). Dimohon bimbingan orang tua untuk mengatur jadwal istirahat malam dan persiapan pagi.`;
    } else {
      grade = 'D';
      predikat = 'Kurang (Perlu Pembinaan Khusus)';
      recommendation = `Perhatian: Kedisiplinan ananda memerlukan penanganan khusus (${lateCount} kali terlambat, ${alphaCount} kali tanpa keterangan). Diperlukan pendampingan intensif dari Wali Kelas dan Orang Tua.`;
    }

    return {
      student,
      periodLabel,
      totalEffectiveDays,
      presentDays,
      onTimeCount,
      lateCount,
      totalLateMinutes,
      permissionCount,
      sickCount,
      alphaCount,
      attendanceRate,
      punctualityRate,
      disciplineScore,
      grade,
      predikat,
      recommendation,
      pairedRecords: studentDaily
    };
  });
};

// Export Discipline Summaries to Excel
export const exportDisciplineToExcel = (
  summaries: StudentDisciplineSummary[],
  filenamePrefix = 'Rapor_Kedisiplinan_Siswa',
  periodLabel = 'Periode'
) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

  const excelData = summaries.map((s, idx) => ({
    'No': idx + 1,
    'NISN': s.student.nisn || '-',
    'Nama Lengkap Siswa': s.student.name,
    'Kelas': s.student.class,
    'Periode': s.periodLabel,
    'Total Hari Efektif': s.totalEffectiveDays,
    'Total Hadir (Hari)': s.presentDays,
    'Tepat Waktu (Hari)': s.onTimeCount,
    'Terlambat (Hari)': s.lateCount,
    'Akumulasi Terlambat (Menit)': s.totalLateMinutes,
    'Izin (Hari)': s.permissionCount,
    'Sakit (Hari)': s.sickCount,
    'Alpha / Tanpa Ket (Hari)': s.alphaCount,
    'Persentase Hadir (%)': `${s.attendanceRate}%`,
    'Persentase Ketepatan (%)': `${s.punctualityRate}%`,
    'Skor Kedisiplinan (0-100)': s.disciplineScore,
    'Grade': s.grade,
    'Predikat Kedisiplinan': s.predikat,
    'Catatan / Rekomendasi': s.recommendation
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // NISN
    { wch: 28 }, // Nama
    { wch: 14 }, // Kelas
    { wch: 20 }, // Periode
    { wch: 16 }, // Hari Efektif
    { wch: 15 }, // Hadir
    { wch: 16 }, // Tepat Waktu
    { wch: 15 }, // Terlambat
    { wch: 22 }, // Akumulasi Menit
    { wch: 12 }, // Izin
    { wch: 12 }, // Sakit
    { wch: 14 }, // Alpha
    { wch: 18 }, // % Hadir
    { wch: 18 }, // % Tepat
    { wch: 20 }, // Skor
    { wch: 8 },  // Grade
    { wch: 26 }, // Predikat
    { wch: 45 }  // Rekomendasi
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapor Kedisiplinan');
  XLSX.writeFile(workbook, filename);
};

// Print Individual Student Discipline Report Card
export const printSingleStudentDisciplineCard = (
  summary: StudentDisciplineSummary,
  schedule: SchoolSchedule
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const student = summary.student;
  const gradeColor = summary.grade === 'A' ? '#15803d' : summary.grade === 'B' ? '#0369a1' : summary.grade === 'C' ? '#b45309' : '#b91c1c';
  const gradeBg = summary.grade === 'A' ? '#dcfce7' : summary.grade === 'B' ? '#e0f2fe' : summary.grade === 'C' ? '#fef3c7' : '#fee2e2';

  const dailyRows = summary.pairedRecords.map((r, i) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 5px 8px; text-align: center;">${i + 1}</td>
      <td style="padding: 5px 8px; font-family: monospace;">${r.dateFormatted}</td>
      <td style="padding: 5px 8px; font-family: monospace; font-weight: bold; color: ${r.entryStatus === 'TERLAMBAT' ? '#b45309' : '#15803d'};">
        ${r.entryTime}
        ${r.lateMinutes ? `<span style="font-size: 10px; color: #b45309;">(+${r.lateMinutes}m)</span>` : ''}
      </td>
      <td style="padding: 5px 8px; font-family: monospace; color: #1e40af;">${r.exitTime}</td>
      <td style="padding: 5px 8px; font-weight: 600; color: ${r.entryStatus === 'TEPAT_WAKTU' ? '#15803d' : r.entryStatus === 'TERLAMBAT' ? '#b45309' : '#475569'};">
        ${r.summaryStatus}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">${r.notes || (r.isManualOverride ? 'Manual Piket' : 'RFID Tap')}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Rapor Kedisiplinan - ${student.name} (${student.nisn || student.class})</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 12px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
          .header h1 { margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h2 { margin: 3px 0 0 0; font-size: 13px; color: #334155; font-weight: 700; text-transform: uppercase; }
          .header p { margin: 2px 0 0 0; font-size: 11px; color: #64748b; }
          .title-box { text-align: center; margin: 12px 0 16px 0; }
          .title-box h3 { margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase; text-decoration: underline; }
          .title-box span { font-size: 11px; color: #475569; font-weight: 600; }
          
          .grid-identitas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; }
          .grid-identitas table td { padding: 3px 6px; font-size: 11.5px; }
          
          .score-card-container { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-bottom: 16px; }
          .score-box { background: ${gradeBg}; border: 2px solid ${gradeColor}; border-radius: 10px; padding: 12px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; }
          .score-number { font-size: 34px; font-weight: 900; color: ${gradeColor}; line-height: 1; margin: 4px 0; }
          .grade-badge { font-size: 18px; font-weight: 900; color: ${gradeColor}; }
          .predikat-label { font-size: 11px; font-weight: 700; color: ${gradeColor}; margin-top: 2px; }

          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .stat-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; text-align: center; }
          .stat-val { font-size: 14px; font-weight: 800; color: #0f172a; }
          .stat-lbl { font-size: 10px; color: #64748b; font-weight: 600; }

          .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 14px 0 6px 0; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          table.data-table th { background: #f1f5f9; padding: 5px 8px; font-size: 10.5px; font-weight: 700; text-align: left; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
          
          .recommendation-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 12px; border-radius: 4px; margin-bottom: 18px; font-size: 11px; }
          
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 24px; text-align: center; font-size: 11px; page-break-inside: avoid; }
          .sign-line { margin-top: 55px; border-top: 1px solid #0f172a; width: 80%; margin-left: auto; margin-right: auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${schedule.schoolName || 'SMK / SMA EKONOMIKA'}</h1>
          <h2>LAPORAN REKAPITULASI PRESENSI & KEDISIPLINAN SISWA</h2>
          <p>${schedule.schoolAddress || 'Sistem Monitoring Presensi RFID Terintegrasi'}</p>
        </div>

        <div class="title-box">
          <h3>LEMBAR HASIL EVALUASI KEDISIPLINAN (RAPOR PRESENSI)</h3>
          <span>Periode: ${summary.periodLabel}</span>
        </div>

        <div class="grid-identitas">
          <table style="width: 100%;">
            <tr>
              <td style="width: 110px; color: #64748b; font-weight: 600;">Nama Lengkap</td>
              <td>: <strong>${student.name}</strong></td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">NISN</td>
              <td>: <span style="font-family: monospace; font-weight: bold;">${student.nisn || '-'}</span></td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Kelas / Rombel</td>
              <td>: <strong>${student.class}</strong></td>
            </tr>
          </table>
          <table style="width: 100%;">
            <tr>
              <td style="width: 120px; color: #64748b; font-weight: 600;">RFID UID Kartu</td>
              <td>: <span style="font-family: monospace;">${student.rfidUid || '-'}</span></td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Tanggal Cetak</td>
              <td>: ${dateStr}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Status Belajar</td>
              <td>: <span style="color: #15803d; font-weight: bold;">Aktif Terdaftar</span></td>
            </tr>
          </table>
        </div>

        <div class="score-card-container">
          <div class="score-box">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569;">SKOR DISIPLIN</span>
            <div class="score-number">${summary.disciplineScore}</div>
            <div class="grade-badge">GRADE: ${summary.grade}</div>
            <div class="predikat-label">${summary.predikat}</div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-val" style="color: #0284c7;">${summary.totalEffectiveDays} Hari</div>
              <div class="stat-lbl">Hari Efektif</div>
            </div>
            <div class="stat-item">
              <div class="stat-val" style="color: #16a34a;">${summary.onTimeCount} Hari</div>
              <div class="stat-lbl">Tepat Waktu</div>
            </div>
            <div class="stat-item">
              <div class="stat-val" style="color: #d97706;">${summary.lateCount} Hari (${summary.totalLateMinutes}m)</div>
              <div class="stat-lbl">Terlambat</div>
            </div>
            <div class="stat-item">
              <div class="stat-val" style="color: #2563eb;">${summary.permissionCount} Hari</div>
              <div class="stat-lbl">Izin / Dispensasi</div>
            </div>
            <div class="stat-item">
              <div class="stat-val" style="color: #9333ea;">${summary.sickCount} Hari</div>
              <div class="stat-lbl">Sakit (Keterangan)</div>
            </div>
            <div class="stat-item">
              <div class="stat-val" style="color: ${summary.alphaCount > 0 ? '#dc2626' : '#16a34a'};">${summary.alphaCount} Hari</div>
              <div class="stat-lbl">Tanpa Keterangan</div>
            </div>
            <div class="stat-item" style="grid-column: span 3; display: flex; justify-content: space-around; background: #e2e8f0;">
              <div>
                <span style="font-size: 10px; color: #475569; font-weight: 700;">Tingkat Kehadiran: </span>
                <strong style="color: #0f172a; font-size: 12px;">${summary.attendanceRate}%</strong>
              </div>
              <div>
                <span style="font-size: 10px; color: #475569; font-weight: 700;">Tingkat Ketepatan Waktu: </span>
                <strong style="color: #0f172a; font-size: 12px;">${summary.punctualityRate}%</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="recommendation-box">
          <strong>Catatan & Rekomendasi Evaluasi Kedisiplinan:</strong>
          <p style="margin: 4px 0 0 0;">${summary.recommendation}</p>
        </div>

        <div class="section-title">RIWAYAT TAP LOG PRESENSI HARIAN (LOG RFID)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align: center; width: 30px;">No</th>
              <th style="width: 80px;">Tanggal</th>
              <th style="width: 100px;">Tap Masuk</th>
              <th style="width: 100px;">Tap Pulang</th>
              <th>Status Presensi</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRows.length > 0 ? dailyRows : '<tr><td colspan="6" style="text-align:center; padding: 12px; color: #94a3b8;">Belum ada catatan absensi tercatat pada rentang periode ini.</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <p>Orang Tua / Wali Siswa,</p>
            <div class="sign-line"></div>
            <p style="margin-top: 4px; color: #64748b;">( .................................................. )</p>
          </div>
          <div>
            <p>Wali Kelas,</p>
            <div class="sign-line"></div>
            <p style="margin-top: 4px; font-weight: bold;">( Wali Kelas ${student.class} )</p>
          </div>
          <div>
            <p>Kepala Sekolah,</p>
            <div class="sign-line"></div>
            <p style="margin-top: 4px; font-weight: bold;">( Kepala Sekolah )</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

// Print Batch Report Cards (e.g. for Whole Class with Page Breaks)
export const printBatchStudentDisciplineCards = (
  summaries: StudentDisciplineSummary[],
  schedule: SchoolSchedule,
  classTitle?: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const cardsHtml = summaries.map(summary => {
    const student = summary.student;
    const gradeColor = summary.grade === 'A' ? '#15803d' : summary.grade === 'B' ? '#0369a1' : summary.grade === 'C' ? '#b45309' : '#b91c1c';
    const gradeBg = summary.grade === 'A' ? '#dcfce7' : summary.grade === 'B' ? '#e0f2fe' : summary.grade === 'C' ? '#fef3c7' : '#fee2e2';

    const dailyRows = summary.pairedRecords.slice(0, 15).map((r, i) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
        <td style="padding: 3px 6px; text-align: center;">${i + 1}</td>
        <td style="padding: 3px 6px; font-family: monospace;">${r.dateFormatted}</td>
        <td style="padding: 3px 6px; font-family: monospace; font-weight: bold; color: ${r.entryStatus === 'TERLAMBAT' ? '#b45309' : '#15803d'};">
          ${r.entryTime} ${r.lateMinutes ? `(+${r.lateMinutes}m)` : ''}
        </td>
        <td style="padding: 3px 6px; font-family: monospace; color: #1e40af;">${r.exitTime}</td>
        <td style="padding: 3px 6px; font-weight: 600;">${r.summaryStatus}</td>
        <td style="padding: 3px 6px; font-size: 9px; color: #64748b;">${r.notes || '-'}</td>
      </tr>
    `).join('');

    return `
      <div class="rapor-page">
        <div class="header">
          <h1>${schedule.schoolName || 'SMK / SMA EKONOMIKA'}</h1>
          <h2>LEMBAR RAPOR KEDISIPLINAN & REKAP PRESENSI SISWA</h2>
          <p>${schedule.schoolAddress || 'Sistem Monitoring Presensi RFID Terintegrasi'}</p>
        </div>

        <div class="title-box">
          <h3>RAPOR KEDISIPLINAN: ${summary.periodLabel}</h3>
          <span>Kelas: <strong>${student.class}</strong></span>
        </div>

        <div class="grid-identitas">
          <table style="width: 100%;">
            <tr><td style="width: 110px; color: #64748b;">Nama Siswa</td><td>: <strong>${student.name}</strong></td></tr>
            <tr><td style="color: #64748b;">NISN</td><td>: <span style="font-family: monospace; font-weight: bold;">${student.nisn || '-'}</span></td></tr>
          </table>
          <table style="width: 100%;">
            <tr><td style="width: 110px; color: #64748b;">Kelas</td><td>: <strong>${student.class}</strong></td></tr>
            <tr><td style="color: #64748b;">Tanggal Cetak</td><td>: ${dateStr}</td></tr>
          </table>
        </div>

        <div class="score-card-container">
          <div class="score-box" style="background: ${gradeBg}; border: 2px solid ${gradeColor};">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase;">SKOR DISIPLIN</span>
            <div class="score-number" style="color: ${gradeColor}; font-size: 30px; font-weight: 900;">${summary.disciplineScore}</div>
            <div style="font-size: 16px; font-weight: 900; color: ${gradeColor};">GRADE: ${summary.grade}</div>
            <div style="font-size: 10.5px; font-weight: 700; color: ${gradeColor};">${summary.predikat}</div>
          </div>

          <div class="stats-grid">
            <div class="stat-item"><div class="stat-val">${summary.totalEffectiveDays} Hari</div><div class="stat-lbl">Hari Efektif</div></div>
            <div class="stat-item"><div class="stat-val" style="color:#16a34a;">${summary.onTimeCount} Hari</div><div class="stat-lbl">Tepat Waktu</div></div>
            <div class="stat-item"><div class="stat-val" style="color:#d97706;">${summary.lateCount} (${summary.totalLateMinutes}m)</div><div class="stat-lbl">Terlambat</div></div>
            <div class="stat-item"><div class="stat-val">${summary.permissionCount} Hari</div><div class="stat-lbl">Izin</div></div>
            <div class="stat-item"><div class="stat-val">${summary.sickCount} Hari</div><div class="stat-lbl">Sakit</div></div>
            <div class="stat-item"><div class="stat-val" style="color:${summary.alphaCount > 0 ? '#dc2626':'#16a34a'};">${summary.alphaCount} Hari</div><div class="stat-lbl">Alpha</div></div>
            <div class="stat-item" style="grid-column: span 3; display: flex; justify-content: space-around; background: #e2e8f0; padding: 4px;">
              <div><span>Kehadiran: </span><strong>${summary.attendanceRate}%</strong></div>
              <div><span>Ketepatan: </span><strong>${summary.punctualityRate}%</strong></div>
            </div>
          </div>
        </div>

        <div class="recommendation-box">
          <strong>Rekomendasi / Catatan Kedisiplinan:</strong>
          <p style="margin: 3px 0 0 0;">${summary.recommendation}</p>
        </div>

        <div class="section-title">LOG REKAP HARIAN SISWA</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">No</th>
              <th style="width: 75px;">Tanggal</th>
              <th style="width: 90px;">Tap Masuk</th>
              <th style="width: 90px;">Tap Pulang</th>
              <th>Status</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRows.length > 0 ? dailyRows : '<tr><td colspan="6" style="text-align:center; padding: 8px;">Tidak ada log presensi tercatat.</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div><p>Orang Tua / Wali Siswa,</p><div class="sign-line"></div><p style="margin-top: 4px;">( .................................................. )</p></div>
          <div><p>Wali Kelas ${student.class},</p><div class="sign-line"></div><p style="margin-top: 4px; font-weight: bold;">( Wali Kelas )</p></div>
          <div><p>Kepala Sekolah,</p><div class="sign-line"></div><p style="margin-top: 4px; font-weight: bold;">( Kepala Sekolah )</p></div>
        </div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cetak Rapor Kelas ${classTitle || 'Siswa'}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 11px; }
          .rapor-page { page-break-after: always; padding: 12px; }
          .rapor-page:last-child { page-break-after: auto; }
          .header { text-align: center; border-bottom: 2px double #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; }
          .header h2 { margin: 2px 0 0 0; font-size: 12px; color: #334155; font-weight: 700; text-transform: uppercase; }
          .header p { margin: 1px 0 0 0; font-size: 10px; color: #64748b; }
          .title-box { text-align: center; margin: 8px 0 10px 0; }
          .title-box h3 { margin: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; text-decoration: underline; }
          
          .grid-identitas { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; margin-bottom: 10px; }
          .grid-identitas table td { padding: 2px 4px; font-size: 10.5px; }

          .score-card-container { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-bottom: 10px; }
          .score-box { border-radius: 8px; padding: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; }
          
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .stat-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 6px; text-align: center; }
          .stat-val { font-size: 12px; font-weight: 800; color: #0f172a; }
          .stat-lbl { font-size: 9px; color: #64748b; font-weight: 600; }

          .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 10px 0 4px 0; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          table.data-table th { background: #f1f5f9; padding: 4px 6px; font-size: 9.5px; font-weight: 700; text-align: left; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
          
          .recommendation-box { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 6px 10px; border-radius: 4px; margin-bottom: 12px; font-size: 10px; }
          
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 16px; text-align: center; font-size: 10px; page-break-inside: avoid; }
          .sign-line { margin-top: 45px; border-top: 1px solid #0f172a; width: 80%; margin-left: auto; margin-right: auto; }
        </style>
      </head>
      <body>
        ${cardsHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};


