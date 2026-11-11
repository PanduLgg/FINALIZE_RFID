import React, { useState, useEffect, useRef } from 'react';
import { Student, Teacher } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { soundEngine } from '../lib/audio';
import { 
  CreditCard, 
  X, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle, 
  UserPlus, 
  UserCheck, 
  Search, 
  Sparkles,
  Smartphone,
  Info,
  GraduationCap,
  Briefcase,
  Users
} from 'lucide-react';

interface MifareScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentUpdated: () => void;
}

export const MifareScannerModal: React.FC<MifareScannerModalProps> = ({
  isOpen,
  onClose,
  onStudentUpdated
}) => {
  const [scannedUid, setScannedUid] = useState<string>('');
  const [inputBuffer, setInputBuffer] = useState<string>('');
  const [matchedStudent, setMatchedStudent] = useState<Student | null>(null);
  const [matchedTeacher, setMatchedTeacher] = useState<Teacher | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'recognized' | 'unrecognized'>('idle');
  
  // Quick Assign State
  const [assignTargetType, setAssignTargetType] = useState<'student' | 'teacher' | null>(null);
  const [searchAssignTerm, setSearchAssignTerm] = useState<string>('');
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState<Student | null>(null);
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState<Teacher | null>(null);

  // Quick Create State
  const [createTargetType, setCreateTargetType] = useState<'student' | 'teacher' | null>(null);
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    nisn: '',
    class: 'X MIPA 1',
    gender: 'L' as 'L' | 'P'
  });
  const [newTeacherForm, setNewTeacherForm] = useState({
    name: '',
    nip: '',
    position: 'Guru Mata Pelajaran',
    gender: 'L' as 'L' | 'P',
    phone: ''
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScannedUid('');
      setInputBuffer('');
      setMatchedStudent(null);
      setMatchedTeacher(null);
      setScanStatus('idle');
      setAssignTargetType(null);
      setCreateTargetType(null);
      setSelectedStudentForAssign(null);
      setSelectedTeacherForAssign(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const students = AttendanceStorage.getStudents();
  const teachers = AttendanceStorage.getTeachers();
  const availableClasses = AttendanceStorage.getClasses();

  // Process a scanned Mifare Card UID
  const handleScanCard = (uidRaw: string) => {
    const uid = uidRaw.trim().toUpperCase();
    if (!uid) return;

    setScannedUid(uid);
    setInputBuffer('');

    // 1. Search in Teachers database
    const foundTeacher = teachers.find(t => (t.rfidUid || '').trim().toUpperCase() === uid);
    if (foundTeacher) {
      setMatchedTeacher(foundTeacher);
      setMatchedStudent(null);
      setScanStatus('recognized');
      soundEngine.playSuccess();
      setAssignTargetType(null);
      setCreateTargetType(null);
      return;
    }

    // 2. Search in Students database
    const foundStudent = students.find(s => (s.rfidUid || '').trim().toUpperCase() === uid);
    if (foundStudent) {
      setMatchedStudent(foundStudent);
      setMatchedTeacher(null);
      setScanStatus('recognized');
      soundEngine.playSuccess();
      setAssignTargetType(null);
      setCreateTargetType(null);
      return;
    }

    // 3. Card not found in either
    setMatchedStudent(null);
    setMatchedTeacher(null);
    setScanStatus('unrecognized');
    soundEngine.playWarning();
    setAssignTargetType(null);
    setCreateTargetType(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputBuffer) {
      handleScanCard(inputBuffer);
    }
  };

  // Pair scanned card to an existing student
  const handleAssignToExistingStudent = () => {
    if (!selectedStudentForAssign || !scannedUid) return;

    const updated: Student = {
      ...selectedStudentForAssign,
      rfidUid: scannedUid
    };

    AttendanceStorage.updateStudent(updated);
    soundEngine.playSuccess();
    
    // Refresh view
    setMatchedStudent(updated);
    setMatchedTeacher(null);
    setScanStatus('recognized');
    setAssignTargetType(null);
    onStudentUpdated();
  };

  // Pair scanned card to an existing teacher
  const handleAssignToExistingTeacher = () => {
    if (!selectedTeacherForAssign || !scannedUid) return;

    const updated: Teacher = {
      ...selectedTeacherForAssign,
      rfidUid: scannedUid
    };

    AttendanceStorage.updateTeacher(updated);
    soundEngine.playSuccess();

    // Refresh view
    setMatchedTeacher(updated);
    setMatchedStudent(null);
    setScanStatus('recognized');
    setAssignTargetType(null);
    onStudentUpdated();
  };

  // Create new student with scanned card
  const handleCreateNewStudentWithCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.name || !scannedUid) {
      alert('Nama siswa wajib diisi!');
      return;
    }

    const cleanName = (newStudentForm.name || '').trim();
    const cleanClass = (newStudentForm.class || availableClasses[0] || 'Kelas Umum').trim();
    const cleanNisn = (newStudentForm.nisn || `00${Math.floor(10000000 + Math.random() * 90000000)}`).trim();

    const newStudent: Student = {
      id: `std-${Date.now()}`,
      name: cleanName,
      nisn: cleanNisn,
      class: cleanClass,
      rfidUid: scannedUid.trim(),
      gender: newStudentForm.gender
    };

    AttendanceStorage.addStudent(newStudent);
    soundEngine.playSuccess();

    setMatchedStudent(newStudent);
    setMatchedTeacher(null);
    setScanStatus('recognized');
    setCreateTargetType(null);
    onStudentUpdated();
  };

  // Create new teacher with scanned card
  const handleCreateNewTeacherWithCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherForm.name || !scannedUid) {
      alert('Nama guru / pegawai wajib diisi!');
      return;
    }

    const newTeacher: Teacher = {
      id: `tch-${Date.now()}`,
      name: newTeacherForm.name,
      nip: newTeacherForm.nip || `19${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`,
      position: newTeacherForm.position || 'Guru Mata Pelajaran',
      rfidUid: scannedUid,
      gender: newTeacherForm.gender,
      phone: newTeacherForm.phone || ''
    };

    AttendanceStorage.addTeacher(newTeacher);
    soundEngine.playSuccess();

    setMatchedTeacher(newTeacher);
    setMatchedStudent(null);
    setScanStatus('recognized');
    setCreateTargetType(null);
    onStudentUpdated();
  };

  // Filter students for quick assignment dropdown
  const filteredStudentsForAssign = students.filter(s => 
    s.name.toLowerCase().includes(searchAssignTerm.toLowerCase()) ||
    s.class.toLowerCase().includes(searchAssignTerm.toLowerCase()) ||
    (s.nisn && s.nisn.includes(searchAssignTerm))
  );

  // Filter teachers for quick assignment dropdown
  const filteredTeachersForAssign = teachers.filter(t => 
    t.name.toLowerCase().includes(searchAssignTerm.toLowerCase()) ||
    (t.position && t.position.toLowerCase().includes(searchAssignTerm.toLowerCase())) ||
    (t.nip && t.nip.includes(searchAssignTerm))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 text-left text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <CreditCard className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>Mode Pengenalan Kartu RFID MIFARE</span>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] rounded-full uppercase font-bold">
                  Siswa & Guru Sinkron
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Deteksi otomatis kartu MIFARE 13.56 MHz (Siswa & Guru) melalui USB Readers
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Input Field (Auto-focused) */}
        <form onSubmit={handleFormSubmit} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Wifi className="w-4 h-4 animate-ping text-amber-400" />
              <span>Status Scanner Reader USB RFID MIFARE:</span>
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              STANDBY / READY
            </span>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputBuffer}
              onChange={(e) => setInputBuffer(e.target.value)}
              placeholder="Tempelkan Kartu MIFARE Siswa/Guru ke reader / ketik UID..."
              className="w-full bg-slate-900 border border-amber-500/50 rounded-xl py-3 px-4 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg shadow cursor-pointer"
            >
              Cek UID
            </button>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Mendukung pembacaan otomatis nomor CSN desimal & HEX ISO 14443A untuk data Siswa maupun Guru.</span>
          </p>
        </form>

        {/* SCANNER RESULT SECTION */}
        {scanStatus === 'idle' && (
          <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <CreditCard className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
            <h4 className="font-extrabold text-slate-300">Belum Ada Kartu Ditempelkan</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Silakan tempelkan kartu RFID MIFARE (milik Siswa atau Guru) ke perangkat USB Reader. Sistem akan secara otomatis mengenali data pemilik kartu.
            </p>
          </div>
        )}

        {/* RECOGNIZED CARD RESULT - TEACHER */}
        {scanStatus === 'recognized' && matchedTeacher && (
          <div className="bg-purple-950/40 border border-purple-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
              <div className="flex items-center gap-2 text-purple-300 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                <span>KARTU MIFARE TERDAFTAR: GURU / PTK</span>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-purple-500/20 text-purple-200 rounded-lg border border-purple-500/30">
                UID: {scannedUid}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={matchedTeacher.avatarUrl || (matchedTeacher.gender === 'P' ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80")}
                alt={matchedTeacher.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/50 shadow-md shrink-0"
              />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-500/30 text-purple-200 text-[10px] font-black rounded">
                    GURU / PTK
                  </span>
                  <h4 className="text-base font-black text-white truncate">{matchedTeacher.name}</h4>
                </div>
                <p className="text-xs font-semibold text-purple-300">
                  NIP/NUPTK: <span className="font-mono text-white font-bold">{matchedTeacher.nip || '-'}</span> • Jabatan: <span className="text-white font-bold">{matchedTeacher.position || '-'}</span>
                </p>
                <p className="text-xs text-slate-300">
                  Gender: <span className="text-white font-bold">{matchedTeacher.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</span> {matchedTeacher.phone ? `• HP: ${matchedTeacher.phone}` : ''}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-purple-500/20">
              <button
                onClick={() => {
                  setScanStatus('idle');
                  setScannedUid('');
                  setMatchedTeacher(null);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Scan Kartu Lain
              </button>
            </div>
          </div>
        )}

        {/* RECOGNIZED CARD RESULT - STUDENT */}
        {scanStatus === 'recognized' && matchedStudent && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>KARTU MIFARE TERDAFTAR: SISWA</span>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
                UID: {scannedUid}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={matchedStudent.avatarUrl || (matchedStudent.gender === 'P' ? "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80")}
                alt={matchedStudent.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md shrink-0"
              />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-200 text-[10px] font-black rounded">
                    SISWA
                  </span>
                  <h4 className="text-base font-black text-white truncate">{matchedStudent.name}</h4>
                </div>
                <p className="text-xs font-semibold text-emerald-300">
                  NISN: <span className="font-mono text-white font-bold">{matchedStudent.nisn || '-'}</span> • Kelas: <span className="text-white font-bold">{matchedStudent.class}</span>
                </p>
                <p className="text-xs text-slate-300">
                  Gender: <span className="text-white font-bold">{matchedStudent.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</span>
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-emerald-500/20">
              <button
                onClick={() => {
                  setScanStatus('idle');
                  setScannedUid('');
                  setMatchedStudent(null);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Scan Kartu Lain
              </button>
            </div>
          </div>
        )}

        {/* UNRECOGNIZED CARD RESULT */}
        {scanStatus === 'unrecognized' && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>KARTU MIFARE BELUM TERDAFTAR!</span>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30">
                UID: {scannedUid}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Kartu dengan kode UID <strong className="text-amber-300 font-mono">{scannedUid}</strong> belum terhubung ke data Siswa maupun Guru manapun. Pilih tindakan berikut:
            </p>

            {/* ACTION OPTIONS - 4 TILES (ASSIGN STUDENT, ASSIGN TEACHER, CREATE STUDENT, CREATE TEACHER) */}
            {!assignTargetType && !createTargetType && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1. Assign to Student */}
                <button
                  onClick={() => {
                    setAssignTargetType('student');
                    setCreateTargetType(null);
                    setSearchAssignTerm('');
                    setSelectedStudentForAssign(null);
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-left transition-all space-y-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                    <UserCheck className="w-4 h-4" />
                    <span>Pasangkan ke Siswa Yang Ada</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Hubungkan kartu ke data siswa yang sudah ada di database.
                  </p>
                </button>

                {/* 2. Assign to Teacher */}
                <button
                  onClick={() => {
                    setAssignTargetType('teacher');
                    setCreateTargetType(null);
                    setSearchAssignTerm('');
                    setSelectedTeacherForAssign(null);
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-xl text-left transition-all space-y-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-purple-400 font-black text-xs">
                    <Briefcase className="w-4 h-4" />
                    <span>Pasangkan ke Guru / PTK Yang Ada</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Hubungkan kartu ke guru atau pegawai yang sudah terdaftar.
                  </p>
                </button>

                {/* 3. Register New Student */}
                <button
                  onClick={() => {
                    setCreateTargetType('student');
                    setAssignTargetType(null);
                    setNewStudentForm({
                      name: '',
                      nisn: '',
                      class: availableClasses[0] || 'X MIPA 1',
                      gender: 'L'
                    });
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl text-left transition-all space-y-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-blue-400 font-black text-xs">
                    <UserPlus className="w-4 h-4" />
                    <span>Daftarkan Siswa Baru</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Buat akun siswa baru langsung terhubung ke kartu MIFARE ini.
                  </p>
                </button>

                {/* 4. Register New Teacher */}
                <button
                  onClick={() => {
                    setCreateTargetType('teacher');
                    setAssignTargetType(null);
                    setNewTeacherForm({
                      name: '',
                      nip: '',
                      position: 'Guru Mata Pelajaran',
                      gender: 'L',
                      phone: ''
                    });
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl text-left transition-all space-y-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                    <GraduationCap className="w-4 h-4" />
                    <span>Daftarkan Guru / PTK Baru</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Buat data guru/pegawai baru menggunakan kode kartu MIFARE ini.
                  </p>
                </button>
              </div>
            )}

            {/* SUB-FORM 1: ASSIGN TO EXISTING STUDENT */}
            {assignTargetType === 'student' && (
              <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-emerald-400">Pilih Siswa untuk Kartu [{scannedUid}]:</h5>
                  <button
                    onClick={() => setAssignTargetType(null)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Kembali
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchAssignTerm}
                    onChange={(e) => setSearchAssignTerm(e.target.value)}
                    placeholder="Cari nama, kelas, atau NISN siswa..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {filteredStudentsForAssign.length === 0 ? (
                    <p className="text-center py-4 text-xs text-slate-500">Tidak ada siswa yang cocok.</p>
                  ) : (
                    filteredStudentsForAssign.map(std => (
                      <div
                        key={std.id}
                        onClick={() => setSelectedStudentForAssign(std)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          selectedStudentForAssign?.id === std.id
                            ? 'bg-emerald-500/20 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div>
                          <p className="font-extrabold text-white">{std.name}</p>
                          <p className="text-[11px] text-slate-400">Kelas: {std.class} • NISN: {std.nisn || '-'}</p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {std.rfidUid ? `UID: ${std.rfidUid}` : 'Belum Ada RFID'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setAssignTargetType(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleAssignToExistingStudent}
                    disabled={!selectedStudentForAssign}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg disabled:opacity-50 cursor-pointer shadow"
                  >
                    Pasangkan Kartu ke Siswa
                  </button>
                </div>
              </div>
            )}

            {/* SUB-FORM 2: ASSIGN TO EXISTING TEACHER */}
            {assignTargetType === 'teacher' && (
              <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-purple-400">Pilih Guru/PTK untuk Kartu [{scannedUid}]:</h5>
                  <button
                    onClick={() => setAssignTargetType(null)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Kembali
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchAssignTerm}
                    onChange={(e) => setSearchAssignTerm(e.target.value)}
                    placeholder="Cari nama, NIP, atau jabatan guru..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {filteredTeachersForAssign.length === 0 ? (
                    <p className="text-center py-4 text-xs text-slate-500">Tidak ada guru yang cocok.</p>
                  ) : (
                    filteredTeachersForAssign.map(tch => (
                      <div
                        key={tch.id}
                        onClick={() => setSelectedTeacherForAssign(tch)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          selectedTeacherForAssign?.id === tch.id
                            ? 'bg-purple-500/20 border-purple-500 text-white'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div>
                          <p className="font-extrabold text-white">{tch.name}</p>
                          <p className="text-[11px] text-slate-400">{tch.position} • NIP: {tch.nip || '-'}</p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {tch.rfidUid ? `UID: ${tch.rfidUid}` : 'Belum Ada RFID'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setAssignTargetType(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleAssignToExistingTeacher}
                    disabled={!selectedTeacherForAssign}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-lg disabled:opacity-50 cursor-pointer shadow"
                  >
                    Pasangkan Kartu ke Guru
                  </button>
                </div>
              </div>
            )}

            {/* SUB-FORM 3: CREATE NEW STUDENT */}
            {createTargetType === 'student' && (
              <form onSubmit={handleCreateNewStudentWithCard} className="bg-slate-900 p-4 rounded-xl border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-blue-400">Pendaftaran Siswa Baru dengan RFID [{scannedUid}]:</h5>
                  <button
                    type="button"
                    onClick={() => setCreateTargetType(null)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Kembali
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      value={newStudentForm.name}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white"
                      placeholder="e.g. Ahmad Rizky"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">NISN</label>
                    <input
                      type="text"
                      value={newStudentForm.nisn}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, nisn: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white"
                      placeholder="e.g. 0068492011"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kelas *</label>
                    <select
                      value={newStudentForm.class}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, class: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white"
                    >
                      {availableClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateTargetType(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-lg shadow cursor-pointer"
                  >
                    Simpan Siswa Baru
                  </button>
                </div>
              </form>
            )}

            {/* SUB-FORM 4: CREATE NEW TEACHER */}
            {createTargetType === 'teacher' && (
              <form onSubmit={handleCreateNewTeacherWithCard} className="bg-slate-900 p-4 rounded-xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-amber-400">Pendaftaran Guru / PTK Baru dengan RFID [{scannedUid}]:</h5>
                  <button
                    type="button"
                    onClick={() => setCreateTargetType(null)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Kembali
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nama Lengkap & Gelar *</label>
                    <input
                      type="text"
                      value={newTeacherForm.name}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white"
                      placeholder="e.g. Dra. Hj. Siti Aminah, M.Pd"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">NIP / NUPTK</label>
                    <input
                      type="text"
                      value={newTeacherForm.nip}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, nip: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white"
                      placeholder="e.g. 197805122005011002"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Jabatan / Mapel *</label>
                    <input
                      type="text"
                      value={newTeacherForm.position}
                      onChange={(e) => setNewTeacherForm({ ...newTeacherForm, position: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-bold text-white"
                      placeholder="e.g. Guru Matematika"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateTargetType(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-lg shadow cursor-pointer"
                  >
                    Simpan Guru Baru
                  </button>
                </div>
              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
