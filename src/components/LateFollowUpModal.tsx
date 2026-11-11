import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  UserCheck, 
  Printer, 
  Save, 
  Trash2, 
  Calendar,
  Sparkles,
  Phone,
  GraduationCap
} from 'lucide-react';
import { StudentLateRankItem, LateFollowUpAction, LateFollowUpStatus, SchoolSchedule } from '../types';
import { AttendanceStorage } from '../lib/storage';

interface LateFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StudentLateRankItem | null;
  schedule: SchoolSchedule;
  currentOfficerName?: string;
  onSaved: () => void;
}

export const STATUS_LABELS: Record<LateFollowUpStatus, { label: string; bg: string; text: string; border: string; desc: string }> = {
  BELUM_DITINDAK: {
    label: 'Belum Ditindak',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    desc: 'Belum ada catatan pembinaan dari BK / Guru Piket.'
  },
  BIMBINGAN_WALI_KELAS: {
    label: 'Bimbingan Wali Kelas',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    desc: 'Konseling tahap awal dan pengingat kedisiplinan bersama Wali Kelas.'
  },
  PANGGILAN_ORTU_BK: {
    label: 'Panggilan Orang Tua (BK)',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    desc: 'Pemanggilan orang tua / wali murid ke Ruang BK untuk klarifikasi & komitmen bersama.'
  },
  SURAT_PERINGATAN_1: {
    label: 'Surat Peringatan 1 (SP 1)',
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    desc: 'Penerbitan SP 1 tertulis atas akumulasi keterlambatan berulang.'
  },
  SURAT_PERINGATAN_2: {
    label: 'Surat Peringatan 2 (SP 2)',
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-700',
    desc: 'Peringatan keras tingkat 2 dengan pendampingan khusus Kesiswaan.'
  },
  SURAT_PERINGATAN_3: {
    label: 'Surat Peringatan 3 (SP 3)',
    bg: 'bg-red-100 dark:bg-red-950/50',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-400 dark:border-red-700',
    desc: 'Surat Peringatan Terakhir sebelum tindakan skorsing atau rapat pleno dewan guru.'
  },
  SKORSING: {
    label: 'Skorsing / Pembinaan Rumah',
    bg: 'bg-purple-100 dark:bg-purple-950/40',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    desc: 'Penyerahan sementara siswa kepada orang tua untuk pembinaan karakter di rumah.'
  },
  SELESAI_DIBINA: {
    label: 'Selesai Dibina / Disiplin Kembali',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    desc: 'Siswa telah menyelesaikan pembinaan dan menunjukkan perbaikan kehadiran yang konsisten.'
  }
};

export const LateFollowUpModal: React.FC<LateFollowUpModalProps> = ({
  isOpen,
  onClose,
  item,
  schedule,
  currentOfficerName = 'Admin / Petugas BK',
  onSaved
}) => {
  const [status, setStatus] = useState<LateFollowUpStatus>('PANGGILAN_ORTU_BK');
  const [actionDate, setActionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [officerName, setOfficerName] = useState<string>(currentOfficerName);
  const [letterNumber, setLetterNumber] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      if (item.followUp) {
        setStatus(item.followUp.status);
        setActionDate(item.followUp.actionDate || new Date().toISOString().split('T')[0]);
        setOfficerName(item.followUp.officerName || currentOfficerName);
        setLetterNumber(item.followUp.letterNumber || '');
        setCustomNotes(item.followUp.customNotes || '');
      } else {
        // Auto default recommendation based on severity
        if (item.lateCount >= 5) {
          setStatus('SURAT_PERINGATAN_1');
        } else if (item.lateCount >= 3) {
          setStatus('PANGGILAN_ORTU_BK');
        } else {
          setStatus('BIMBINGAN_WALI_KELAS');
        }
        setActionDate(new Date().toISOString().split('T')[0]);
        setOfficerName(currentOfficerName);
        setLetterNumber(`421.5/BK-TL/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
        setCustomNotes('');
      }
    }
  }, [item, currentOfficerName]);

  if (!isOpen || !item) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const followUpAction: LateFollowUpAction = {
      id: item.followUp?.id || `fu-${item.studentId}-${Date.now()}`,
      studentId: item.studentId,
      studentName: item.studentName,
      studentClass: item.studentClass,
      status,
      actionDate,
      officerName: officerName.trim() || 'Petugas BK / Kesiswaan',
      letterNumber: letterNumber.trim() || undefined,
      customNotes: customNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    AttendanceStorage.setLateFollowUp(followUpAction);
    setIsSaving(false);
    setToastMessage('Status tindak lanjut berhasil disimpan!');
    setTimeout(() => {
      setToastMessage(null);
      onSaved();
      onClose();
    }, 600);
  };

  const handleDelete = () => {
    if (confirm(`Hapus catatan tindak lanjut untuk ${item.studentName}? Status akan kembali "Belum Ditindak".`)) {
      AttendanceStorage.deleteLateFollowUp(item.studentId);
      onSaved();
      onClose();
    }
  };

  const handlePrintOfficialLetter = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Izinkan pop-up browser untuk mencetak surat.');
      return;
    }

    const recsHtml = item.records.slice(0, 10).map((r, i) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 6px 10px; text-align: center;">${i + 1}</td>
        <td style="padding: 6px 10px;">${r.dateFormatted} (${r.dayName || 'Hari Sekolah'})</td>
        <td style="padding: 6px 10px; text-align: center; font-weight: bold; color: #b91c1c;">${r.timeFormatted} WIB</td>
        <td style="padding: 6px 10px; text-align: center; color: #b91c1c;">+${r.lateMinutes || 0} Menit</td>
        <td style="padding: 6px 10px;">${r.gateLocation === 'pintu_belakang' ? 'Pintu Belakang' : 'Pintu Depan'}</td>
      </tr>
    `).join('');

    const statusInfo = STATUS_LABELS[status];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Surat Tindak Lanjut & Rekap Keterlambatan - ${item.studentName}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.4; margin: 0; padding: 20px; font-size: 14px; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
          .header h2 { margin: 0 0 4px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h3 { margin: 0 0 4px 0; font-size: 16px; font-weight: bold; }
          .header p { margin: 0; font-size: 12px; color: #333; font-style: italic; }
          .title { text-align: center; margin: 20px 0 15px 0; }
          .title h4 { margin: 0; font-size: 16px; text-decoration: underline; text-transform: uppercase; }
          .title span { font-size: 13px; font-weight: normal; }
          table.meta { width: 100%; margin-bottom: 15px; border-collapse: collapse; }
          table.meta td { padding: 4px 6px; font-size: 14px; }
          table.meta td.label { width: 180px; font-weight: bold; }
          table.data { width: 100%; border-collapse: collapse; margin: 15px 0; }
          table.data th { background: #f1f5f9; border: 1px solid #000; padding: 8px; font-size: 13px; text-align: center; }
          table.data td { border: 1px solid #000; padding: 6px 8px; font-size: 13px; }
          .action-box { border: 1px dashed #333; background: #fafafa; padding: 12px 16px; margin: 15px 0; border-radius: 4px; }
          .action-box h5 { margin: 0 0 6px 0; font-size: 14px; }
          .signatures { width: 100%; margin-top: 35px; border-collapse: collapse; }
          .signatures td { text-align: center; vertical-align: top; width: 33.3%; padding: 0 10px; font-size: 13px; }
          .sign-space { height: 70px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${schedule.schoolName || 'SMK EKONOMIKA DEPOK'}</h2>
          <h3>TIM KESISWAAN & BIMBINGAN KONSELING (BK)</h3>
          <p>${schedule.schoolAddress || 'Jl. Raya Sawangan No. 45, Pancoran Mas, Kota Depok, Jawa Barat'}</p>
        </div>

        <div class="title">
          <h4>BERITA ACARA & REKOMENDASI TINDAK LANJUT KEDISIPLINAN</h4>
          <span>Nomor: ${letterNumber || `421.5/BK/${new Date().getFullYear()}/001`}</span>
        </div>

        <p>Berdasarkan sistem pemantauan presensi digital berbasis RFID, telah tercatat akumulasi keterlambatan hadir peserta didik berikut:</p>

        <table class="meta">
          <tr><td class="label">Nama Peserta Didik</td><td>: <strong>${item.studentName}</strong></td></tr>
          <tr><td class="label">NISN / Nomor Induk</td><td>: ${item.nisn || '-'}</td></tr>
          <tr><td class="label">Kelas / Rombel</td><td>: ${item.studentClass}</td></tr>
          <tr><td class="label">Total Terlambat</td><td>: <span style="color: #b91c1c; font-weight: bold;">${item.lateCount} Kali</span> (Total akumulasi: ${item.totalLateMinutes} menit)</td></tr>
          <tr><td class="label">Keterlambatan Terakhir</td><td>: ${item.latestLateDate} (${item.latestLateTime} WIB)</td></tr>
        </table>

        <p><strong>Rincian Riwayat Keterlambatan Masuk:</strong></p>
        <table class="data">
          <thead>
            <tr>
              <th style="width: 35px;">No</th>
              <th>Tanggal Presensi</th>
              <th>Waktu Hadir</th>
              <th>Selisih Telat</th>
              <th>Lokasi Gerbang</th>
            </tr>
          </thead>
          <tbody>
            ${recsHtml}
          </tbody>
        </table>

        <div class="action-box">
          <h5><strong>KEPUTUSAN / TINDAK LANJUT BK & KESISWAAN:</strong></h5>
          <p style="margin: 4px 0;"><strong>Bentuk Tindakan:</strong> ${statusInfo.label}</p>
          <p style="margin: 4px 0;"><strong>Tanggal Ditetapkan:</strong> ${actionDate}</p>
          <p style="margin: 4px 0;"><strong>Petugas Pembina:</strong> ${officerName}</p>
          ${customNotes ? `<p style="margin: 6px 0 0 0;"><strong>Catatan & Kesepakatan:</strong> <em>"${customNotes}"</em></p>` : ''}
        </div>

        <p style="margin-top: 15px; font-size: 13px;">Demikian lembar tindak lanjut kedisiplinan ini dibuat untuk menjadi perhatian dan pembinaan bersama demi peningkatan karakter serta kedisiplinan belajar peserta didik.</p>

        <table class="signatures">
          <tr>
            <td>
              Mengetahui,<br>Orang Tua / Wali Murid
              <div class="sign-space"></div>
              ( .................................................. )
            </td>
            <td>
              Peserta Didik Bersangkutan,
              <div class="sign-space"></div>
              ( <strong>${item.studentName}</strong> )
            </td>
            <td>
              Ditetapkan di Depok, ${actionDate}<br>Guru BK / Kesiswaan
              <div class="sign-space"></div>
              ( <strong>${officerName}</strong> )
            </td>
          </tr>
        </table>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const quickNotes = [
    "Orang tua telah hadir ke sekolah & membuat komitmen tertulis.",
    "Siswa berjanji berangkat lebih awal dan tidak begadang.",
    "Kendala jarak rumah dan transportasi umum telah dicarikan solusi.",
    "Telah diberikan bimbingan konseling dan surat pernyataan disiplin.",
    "Siswa menyatakan siap menerima sanksi akademis jika mengulangi lagi."
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Tindak Lanjut Siswa Terlambat</h3>
              <p className="text-xs text-slate-300">Rekap pembinaan & tindakan kedisiplinan kesiswaan / BK</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {toastMessage && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Student Profile Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {item.studentName.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{item.studentName}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{item.studentClass}</span>
                  <span>•</span>
                  <span>NISN: {item.nisn || '-'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-center">
                <span className="block text-[10px] uppercase font-bold text-rose-500">Frekuensi</span>
                <span className="text-base font-extrabold text-rose-700 dark:text-rose-400">{item.lateCount}x Telat</span>
              </div>
              <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                <span className="block text-[10px] uppercase font-bold text-amber-500">Akumulasi</span>
                <span className="text-base font-extrabold text-amber-700 dark:text-amber-400">+{item.totalLateMinutes} mnt</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Action Status Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Status / Bentuk Tindak Lanjut:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(STATUS_LABELS) as LateFollowUpStatus[]).map((key) => {
                  const meta = STATUS_LABELS[key];
                  const isSelected = status === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setStatus(key)}
                      className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
                        isSelected 
                          ? `${meta.bg} ${meta.border} ${meta.text} ring-2 ring-indigo-500/40 font-semibold shadow-sm` 
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold">{meta.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <span className="text-[11px] opacity-80 mt-1 font-normal line-clamp-1">{meta.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Fields: Date, Officer, Letter Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Tindakan:
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={actionDate}
                    onChange={(e) => setActionDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Petugas Pembina / BK:
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="Nama Petugas BK"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Surat / Dokumen:
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={letterNumber}
                    onChange={(e) => setLetterNumber(e.target.value)}
                    placeholder="No. Surat (opsional)"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Custom Notes / Commitment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Konseling / Kesepakatan Siswa & Orang Tua:
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Tuliskan hasil pemanggilan, alasan siswa sering terlambat, dan kesepakatan yang disetujui bersama..."
                rows={3}
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
              {/* Quick Suggestion Chips */}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {quickNotes.map((note, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCustomNotes(prev => prev ? `${prev} ${note}` : note)}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition"
                  >
                    + {note}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintOfficialLetter}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Surat / Berita Acara</span>
                </button>
                {item.followUp && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset Status</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Tindak Lanjut'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
