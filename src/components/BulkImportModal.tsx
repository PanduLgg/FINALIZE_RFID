import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Check, 
  X, 
  FileText, 
  Database,
  GraduationCap,
  AlertCircle,
  Sparkles,
  Layers
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedStudents, setParsedStudents] = useState<Partial<Student>[]>([]);
  const [isParsed, setIsParsed] = useState<boolean>(false);
  const [autoGenerateRfid, setAutoGenerateRfid] = useState<boolean>(true);
  const [autoGenerateNisn, setAutoGenerateNisn] = useState<boolean>(true);
  const [masterClasses, setMasterClasses] = useState<string[]>([]);
  const [selectedBatchClass, setSelectedBatchClass] = useState<string>('');

  // Load available master classes whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      const cls = AttendanceStorage.getClasses();
      setMasterClasses(cls);
      if (cls.length > 0) {
        setSelectedBatchClass(cls[0]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to normalize and match input class with master classes
  const normalizeClassName = (rawClass: string, availableClasses: string[]): { name: string; isMatched: boolean } => {
    const clean = (rawClass || '').trim().replace(/\s+/g, ' ');
    if (!clean) {
      return {
        name: availableClasses.length > 0 ? availableClasses[0] : 'Kelas Umum',
        isMatched: availableClasses.length > 0
      };
    }

    const matched = availableClasses.find(
      c => c.trim().toLowerCase() === clean.toLowerCase()
    );

    if (matched) {
      return { name: matched, isMatched: true };
    }

    return { name: clean, isMatched: false };
  };

  // Template CSV Download Generator with dynamic master classes
  const downloadTemplateCsv = () => {
    const available = masterClasses.length > 0 ? masterClasses : ["X MIPA 1", "X MIPA 2", "XI IPS 1"];
    const class1 = available[0] || 'X MIPA 1';
    const class2 = available[1] || available[0] || 'X MIPA 2';
    const class3 = available[2] || available[0] || 'XI IPS 1';

    let csvContent = `nama_siswa,nisn,kelas,rfid_uid_mifare,jenis_kelamin\n`;
    csvContent += `Ahmad Fauzi,0068492011,${class1},0008451293,L\n`;
    csvContent += `Siti Nurhaliza,0072849102,${class1},A34F221C,P\n`;
    csvContent += `Budi Santoso,0061928475,${class2},0009988771,L\n`;
    csvContent += `Dewi Lestari,0073849120,${class3},,P\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_import_siswa_master_kelas.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV or Tab-separated text
  const parseRawText = (rawText: string) => {
    if (!rawText.trim()) {
      setParsedStudents([]);
      setIsParsed(false);
      return;
    }

    const lines = rawText.trim().split('\n');
    const previewList: Partial<Student>[] = [];
    const available = masterClasses.length > 0 ? masterClasses : AttendanceStorage.getClasses();

    // Check if line 0 is a header line
    const firstLine = lines[0].toLowerCase();
    const startIndex = (firstLine.includes('nama') || firstLine.includes('kelas') || firstLine.includes('rfid') || firstLine.includes('nisn')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      // Handle CSV or tab-separated values
      const cols = line.includes('\t') 
        ? line.split('\t').map(c => c.trim())
        : line.split(',').map(c => c.replace(/^"|"$/g, '').trim());

      let name = '';
      let nisn = '';
      let rawClassName = '';
      let rfidUid = '';
      let gender = 'L';

      // Check column format
      if (cols.length >= 5) {
        // [nama, nisn, kelas, rfidUid, gender]
        name = cols[0];
        nisn = cols[1];
        rawClassName = cols[2];
        rfidUid = cols[3];
        gender = cols[4];
      } else if (cols.length === 4) {
        // [nama, kelas, rfidUid, gender] OR [nama, nisn, kelas, rfidUid]
        name = cols[0];
        if (/^\d{8,12}$/.test(cols[1])) {
          nisn = cols[1];
          rawClassName = cols[2];
          rfidUid = cols[3];
        } else {
          rawClassName = cols[1];
          rfidUid = cols[2];
          gender = cols[3];
        }
      } else if (cols.length >= 2) {
        name = cols[0];
        rawClassName = cols[1];
        rfidUid = cols[2] || '';
      }

      if (name) {
        const generatedNisn = nisn || (autoGenerateNisn ? `00${Math.floor(10000000 + Math.random() * 90000000)}` : '');
        const generatedUid = rfidUid || (autoGenerateRfid ? `000${Math.floor(10000000 + Math.random() * 90000000)}` : '');
        
        const { name: resolvedClass } = normalizeClassName(rawClassName, available);

        previewList.push({
          name: name.trim(),
          nisn: generatedNisn.trim(),
          class: resolvedClass,
          rfidUid: generatedUid.trim(),
          gender: (gender?.toUpperCase() === 'P' ? 'P' : 'L')
        });
      }
    }

    setParsedStudents(previewList);
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

  // Update class of a specific student in preview
  const handleUpdateStudentClass = (index: number, newClass: string) => {
    setParsedStudents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], class: newClass.trim() };
      return updated;
    });
  };

  // Apply default class to all students in preview
  const handleApplyClassToAll = (targetClass: string) => {
    if (!targetClass) return;
    setParsedStudents(prev => prev.map(s => ({ ...s, class: targetClass })));
  };

  // Save imported students to database
  const handleConfirmImport = () => {
    if (parsedStudents.length === 0) {
      alert('Tidak ada data siswa yang valid untuk diimpor!');
      return;
    }

    const currentStudents = AttendanceStorage.getStudents();
    const newStudentsList = [...currentStudents];
    const importedClasses: string[] = [];

    parsedStudents.forEach((std, idx) => {
      const rawClass = (std.class || '').trim();
      const fallbackClass = masterClasses[0] || 'Kelas Umum';
      const assignedClass = rawClass || fallbackClass;
      
      importedClasses.push(assignedClass);
      newStudentsList.push({
        id: `std-bulk-${Date.now()}-${idx}`,
        name: (std.name || 'Siswa Baru').trim(),
        nisn: (std.nisn || `00${Math.floor(10000000 + Math.random() * 90000000)}`).trim(),
        class: assignedClass,
        rfidUid: (std.rfidUid || `000${Math.floor(10000000 + Math.random() * 90000000)}`).trim(),
        gender: std.gender || 'L'
      });
    });

    // Save students and auto-sync classes
    AttendanceStorage.saveStudents(newStudentsList);
    AttendanceStorage.addClasses(importedClasses);

    alert(`🎉 Berhasil mengimpor ${parsedStudents.length} data siswa dengan standarisasi Master Data Kelas!`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-4xl w-full shadow-2xl space-y-5 text-left text-slate-100 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Import Massal Siswa (Sinkron Master Kelas)</h3>
              <p className="text-xs text-slate-400">
                Impor data siswa via file CSV/Excel. Format kelas otomatis diselaraskan dengan Master Data Kelas.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Classes Reference Bar */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-blue-300">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span>Daftar Master Kelas Terdaftar ({masterClasses.length} Kelas Aktif)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Format kelas pada file import akan diselaraskan dengan daftar ini
            </span>
          </div>

          {masterClasses.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Belum ada Master Kelas terdaftar. Kelas baru dari file impor akan otomatis didaftarkan ke Master Data.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
              {masterClasses.map((clsName) => (
                <button
                  key={clsName}
                  type="button"
                  onClick={() => {
                    setSelectedBatchClass(clsName);
                    if (isParsed) handleApplyClassToAll(clsName);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950/60 text-blue-200 border border-blue-800/60 hover:bg-blue-800/50 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                  title="Klik untuk memilih kelas ini"
                >
                  <span>{clsName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Download Template & Upload Action Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={downloadTemplateCsv}
            className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Unduh Template CSV (Sesuai Master Kelas)</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs">
            <Upload className="w-4 h-4" />
            <span>Upload File CSV / Excel / TXT</span>
            <input
              type="file"
              accept=".csv, .txt, .tsv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Textarea Paste Area */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Atau Tempel (Paste) Teks CSV / Excel Di Sini:</span>
            </label>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerateNisn}
                  onChange={(e) => setAutoGenerateNisn(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Auto NISN jika kosong</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerateRfid}
                  onChange={(e) => setAutoGenerateRfid(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Auto RFID jika kosong</span>
              </label>
            </div>
          </div>

          <textarea
            rows={4}
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value);
              parseRawText(e.target.value);
            }}
            placeholder={`Format CSV:\nnama_siswa,nisn,kelas,rfid_uid_mifare,jenis_kelamin\nAhmad Fauzi,0068492011,${masterClasses[0] || 'X MIPA 1'},0008451293,L\nSiti Nurhaliza,0072849102,${masterClasses[0] || 'X MIPA 1'},A34F221C,P`}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* PREVIEW TABLE */}
        {isParsed && (
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Pratinjau Data Siswa ({parsedStudents.length} Siswa Siap Diimpor)</span>
              </h4>

              {/* Batch Class Assign Tool */}
              {masterClasses.length > 0 && (
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Set Semua Kelas ke:
                  </span>
                  <select
                    value={selectedBatchClass}
                    onChange={(e) => {
                      setSelectedBatchClass(e.target.value);
                      handleApplyClassToAll(e.target.value);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                  >
                    {masterClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 shadow-inner">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-200 uppercase text-[10px] sticky top-0 font-extrabold tracking-wider">
                  <tr>
                    <th className="p-2.5 w-10 text-center">No</th>
                    <th className="p-2.5">Nama Siswa</th>
                    <th className="p-2.5">NISN</th>
                    <th className="p-2.5 min-w-[160px]">Kelas (Master Data)</th>
                    <th className="p-2.5">UID RFID MIFARE</th>
                    <th className="p-2.5">L/P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {parsedStudents.map((s, idx) => {
                    const isMatched = masterClasses.includes(s.class || '');

                    return (
                      <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-2.5 text-slate-500 text-center">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-white">{s.name}</td>
                        <td className="p-2.5 font-mono text-indigo-300 font-bold">{s.nisn}</td>
                        
                        {/* Interactive Class Select / Match Indicator */}
                        <td className="p-2.5">
                          {masterClasses.length > 0 ? (
                            <select
                              value={s.class || masterClasses[0]}
                              onChange={(e) => handleUpdateStudentClass(idx, e.target.value)}
                              className={`w-full text-xs font-bold rounded-lg px-2 py-1 border transition-colors ${
                                isMatched
                                  ? 'bg-blue-950/60 text-blue-200 border-blue-800/80 focus:border-blue-500'
                                  : 'bg-amber-950/60 text-amber-200 border-amber-700/80 focus:border-amber-500'
                              }`}
                            >
                              {!isMatched && s.class && (
                                <option value={s.class}>➕ {s.class} (Kelas Baru)</option>
                              )}
                              {masterClasses.map((cls) => (
                                <option key={cls} value={cls}>
                                  {cls}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-bold text-blue-300 bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-900/50">
                              {s.class}
                            </span>
                          )}
                        </td>

                        <td className="p-2.5 font-mono font-bold text-amber-300">{s.rfidUid}</td>
                        <td className="p-2.5 font-bold">{s.gender === 'P' ? <span className="text-pink-400">P</span> : <span className="text-blue-400">L</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedStudents.length === 0}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Database className="w-4 h-4" />
            <span>Simpan ({parsedStudents.length}) Siswa ke Database</span>
          </button>
        </div>

      </div>
    </div>
  );
};
