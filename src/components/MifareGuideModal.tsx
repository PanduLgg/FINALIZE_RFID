import React from 'react';
import { 
  X, 
  CreditCard, 
  Scan, 
  FileSpreadsheet, 
  UserPlus, 
  CheckCircle2, 
  Lightbulb, 
  HelpCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface MifareGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
  onOpenBulkImport?: () => void;
}

export const MifareGuideModal: React.FC<MifareGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenScanner,
  onOpenBulkImport
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-6 text-left text-slate-100 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>Panduan Registrasi Kartu MIFARE (Siswa & Guru)</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] rounded-full uppercase font-bold">13.56 MHz</span>
              </h3>
              <p className="text-xs text-slate-400">
                Langkah-langkah mendaftarkan ID kartu MIFARE agar dapat dibaca otomatis atas nama Siswa maupun Guru/PTK
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 border border-blue-500/30 rounded-2xl flex items-start gap-3">
          <Lightbulb className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-blue-200">Bagaimana Alat Reader Membaca Kartu MIFARE?</h4>
            <p className="text-slate-300 leading-relaxed">
              Reader RFID USB MIFARE (13.56 MHz) bekerja seperti keyboard (*Keyboard Wedge*). Saat kartu fisik ditap ke alat reader, reader akan mengirimkan deretan angka/huruf unik (**UID / CSN**) seperti <code>0008451293</code> atau <code>A34F221C</code> secara instan.
            </p>
          </div>
        </div>

        {/* 3 Registration Methods */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            3 Cara Registrasi Kode Kartu MIFARE ke Nama Siswa:
          </h4>

          {/* Method 1 */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-black text-amber-400">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">1</span>
                <span>METODE 1: Menggunakan Mode Pengenalan MIFARE (Paling Praktis)</span>
              </span>
              {onOpenScanner && (
                <button
                  onClick={() => { onClose(); onOpenScanner(); }}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] rounded-lg transition-all"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Buka Mode Pengenalan</span>
                </button>
              )}
            </div>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1 leading-relaxed">
              <li>Klik tombol <strong className="text-amber-300">"Mode Pengenalan MIFARE"</strong> di Tab Kelola Data Siswa.</li>
              <li>Ambil kartu MIFARE fisik lalu <strong>tempelkan (tap) ke USB Card Reader</strong>.</li>
              <li>Sistem akan mendeteksi kode UID kartu tersebut. Jika kartu belum terdaftar, klik <strong className="text-emerald-400">"Pasangkan ke Siswa Yang Ada"</strong> atau <strong className="text-blue-400">"Daftarkan Sebagai Siswa Baru"</strong>.</li>
              <li>Kartu fisik secara otomatis langsung aktif & terikat ke profil nama siswa tersebut!</li>
            </ol>
          </div>

          {/* Method 2 */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-black text-blue-400">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">2</span>
                <span>METODE 2: Bulk Import dari Excel / CSV Massal</span>
              </span>
              {onOpenBulkImport && (
                <button
                  onClick={() => { onClose(); onOpenBulkImport(); }}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] rounded-lg transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Buka Bulk Import</span>
                </button>
              )}
            </div>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1 leading-relaxed">
              <li>Download template CSV melalui tombol <strong className="text-amber-300">"Bulk Import & RFID"</strong>.</li>
              <li>Isi kolom <code>rfid_uid_mifare</code> dengan nomor seri/UID kartu yang tercetak pada fisik kartu MIFARE atau hasil scan reader.</li>
              <li>Upload kembali file CSV atau tempel (*paste*) data tabel Excel ke sistem. Seluruh kartu siswa langsung terdaftar massal!</li>
            </ol>
          </div>

          {/* Method 3 */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <span className="flex items-center gap-2 text-sm font-black text-emerald-400">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">3</span>
              <span>METODE 3: Input Manual / Edit Siswa Satuan</span>
            </span>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1 leading-relaxed">
              <li>Klik tombol <strong className="text-emerald-400">"+ Siswa Baru"</strong> atau tombol <strong>Edit (Ikon Pensil)</strong> pada baris nama siswa di tabel.</li>
              <li>Arahkan kursor ke kolom input <strong>"UID RFID MIFARE"</strong>.</li>
              <li><strong>Tap kartu MIFARE fisik Anda ke reader</strong> (nomor UID kartu akan terisi otomatis), lalu klik **Simpan**.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-lg"
          >
            Mengerti & Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
