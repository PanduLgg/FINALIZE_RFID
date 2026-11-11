import React, { useState } from 'react';
import { Teacher } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Check, 
  X, 
  CreditCard,
  Database,
  Info,
  UserCheck
} from 'lucide-react';
import { downloadTeacherCsvTemplate } from '../lib/exportUtils';

interface TeacherBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TeacherBulkImportModal: React.FC<TeacherBulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedTeachers, setParsedTeachers] = useState<Partial<Teacher>[]>([]);
  const [isParsed, setIsParsed] = useState<boolean>(false);
  const [autoGenerateRfid, setAutoGenerateRfid] = useState<boolean>(true);
  const [autoGenerateNip, setAutoGenerateNip] = useState<boolean>(true);

  if (!isOpen) return null;

  // Parse CSV or Tab-separated text
  const parseRawText = (rawText: string) => {
    if (!rawText.trim()) {
      setParsedTeachers([]);
      setIsParsed(false);
      return;
    }

    const lines = rawText.trim().split('\n');
    const previewList: Partial<Teacher>[] = [];

    // Check if line 0 is a header line
    const firstLine = lines[0].toLowerCase();
    const startIndex = (firstLine.includes('nama') || firstLine.includes('nip') || firstLine.includes('jabatan') || firstLine.includes('rfid')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV or tab-separated values
      const cols = line.includes('\t') 
        ? line.split('\t').map(c => c.trim())
        : line.split(',').map(c => c.replace(/^"|"$/g, '').trim());

      let name = '';
      let nip = '';
      let position = '';
      let rfidUid = '';
      let gender = 'L';
      let phone = '';

      // Format columns: [nama, nip, jabatan, rfid_uid, jenis_kelamin, no_hp]
      if (cols.length >= 6) {
        name = cols[0];
        nip = cols[1];
        position = cols[2];
        rfidUid = cols[3];
        gender = cols[4];
        phone = cols[5];
      } else if (cols.length === 5) {
        name = cols[0];
        nip = cols[1];
        position = cols[2];
        rfidUid = cols[3];
        gender = cols[4];
      } else if (cols.length === 4) {
        name = cols[0];
        nip = cols[1];
        position = cols[2];
        rfidUid = cols[3];
      } else if (cols.length === 3) {
        name = cols[0];
        nip = cols[1];
        position = cols[2];
      } else if (cols.length >= 2) {
        name = cols[0];
        position = cols[1];
      }

      if (name) {
        const generatedNip = nip || (autoGenerateNip ? `19${Math.floor(70000000 + Math.random() * 20000000)}` : '');
        const generatedUid = rfidUid || (autoGenerateRfid ? `000${Math.floor(10000000 + Math.random() * 90000000)}` : '');
        
        previewList.push({
          name,
          nip: generatedNip,
          position: position || 'Guru Mata Pelajaran',
          rfidUid: generatedUid,
          gender: (gender?.toUpperCase() === 'P' ? 'P' : 'L'),
          phone: phone || ''
        });
      }
    }

    setParsedTeachers(previewList);
    setIsParsed(true);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setPastedText(content);
        parseRawText(content);
      }
    };
    reader.readAsText(file);
  };

  // Save imported teachers to database
  const handleConfirmImport = () => {
    if (parsedTeachers.length === 0) {
      alert('Tidak ada data guru yang valid untuk diimpor!');
      return;
    }

    const currentTeachers = AttendanceStorage.getTeachers();
    const newTeachersList = [...currentTeachers];

    parsedTeachers.forEach((t, idx) => {
      newTeachersList.push({
        id: `tch-bulk-${Date.now()}-${idx}`,
        name: t.name || 'Guru Baru',
        nip: t.nip || `19${Math.floor(70000000 + Math.random() * 20000000)}`,
        position: t.position || 'Guru Mata Pelajaran',
        rfidUid: t.rfidUid || `000${Math.floor(10000000 + Math.random() * 90000000)}`,
        gender: t.gender || 'L',
        phone: t.phone || ''
      });
    });

    AttendanceStorage.saveTeachers(newTeachersList);
    alert(`Berhasil mengimpor ${parsedTeachers.length} data Guru & Pegawai ke database!`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-5 text-left text-slate-100 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Import Massal Data Guru & Pegawai</h2>
              <p className="text-xs text-slate-400">Impor data guru, NIP, Jabatan/Mapel, dan nomor kartu RFID MIFARE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action helper bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Format Kolom: <strong>Nama, NIP/NUPTK, Jabatan, Nomor RFID, L/P, No HP</strong></span>
          </div>
          <button
            type="button"
            onClick={downloadTeacherCsvTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Template CSV Guru</span>
          </button>
        </div>

        {/* Input options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              Upload File CSV atau Salin & Tempel Data (Paste):
            </label>
            <label className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg cursor-pointer border border-slate-700 transition-all">
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Pilih File CSV</span>
              <input 
                type="file" 
                accept=".csv,.txt,.tsv" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>

          <textarea
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value);
              parseRawText(e.target.value);
            }}
            placeholder="Contoh:
Dra. Hj. Siti Aminah, M.Pd, 197405121998022001, Kepala Sekolah, 0008451293, P, 081234567890
Bambang Sutrisno, S.Kom, 198503142010011015, Waka Kurikulum / Guru TIK, A34F221C, L, 081298765432"
            rows={5}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500 resize-y"
          />
        </div>

        {/* Auto generation toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGenerateRfid}
              onChange={(e) => {
                setAutoGenerateRfid(e.target.checked);
                if (pastedText) parseRawText(pastedText);
              }}
              className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
            />
            <span className="text-slate-300">Otomatis buat UID RFID jika kolom kosong</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGenerateNip}
              onChange={(e) => {
                setAutoGenerateNip(e.target.checked);
                if (pastedText) parseRawText(pastedText);
              }}
              className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
            />
            <span className="text-slate-300">Otomatis buat NIP jika kolom kosong</span>
          </label>
        </div>

        {/* Preview Table */}
        {isParsed && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-purple-400">
                Pratinjau Data ({parsedTeachers.length} Guru/Pegawai Terdeteksi)
              </span>
              <span className="text-slate-400 text-[11px]">Pastikan kolom terbaca dengan benar</span>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">Nama Guru / Gelar</th>
                    <th className="p-2.5">NIP / NUPTK</th>
                    <th className="p-2.5">Jabatan / Mapel</th>
                    <th className="p-2.5">Nomor RFID</th>
                    <th className="p-2.5">L/P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50 font-mono text-[11px]">
                  {parsedTeachers.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-2.5 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="p-2.5 text-white font-sans font-bold">{t.name}</td>
                      <td className="p-2.5 text-indigo-300">{t.nip}</td>
                      <td className="p-2.5 text-purple-300 font-sans">{t.position}</td>
                      <td className="p-2.5 text-amber-300">{t.rfidUid}</td>
                      <td className="p-2.5 text-slate-300 font-sans font-bold">{t.gender}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedTeachers.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer border border-purple-400/30"
          >
            <Check className="w-4 h-4" />
            <span>Konfirmasi Impor ({parsedTeachers.length}) Guru</span>
          </button>
        </div>

      </div>
    </div>
  );
};
