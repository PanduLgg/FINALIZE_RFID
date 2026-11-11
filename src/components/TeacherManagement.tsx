import React, { useState, useMemo } from 'react';
import { Teacher } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { TeacherBulkImportModal } from './TeacherBulkImportModal';
import { MifareScannerModal } from './MifareScannerModal';
import { downloadTeacherCsvTemplate } from '../lib/exportUtils';
import { processAndCompressImage } from '../lib/imageUtils';
import * as XLSX from 'xlsx';
import {
  UserCheck,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  CreditCard,
  Download,
  Upload,
  UploadCloud,
  ArrowUpDown,
  CheckSquare,
  Square,
  Sparkles,
  Camera,
  X,
  Phone,
  Briefcase,
  Layers,
  Users,
  GraduationCap,
  Scan
} from 'lucide-react';

interface TeacherManagementProps {
  onOpenCardPairing?: (teacher: Teacher) => void;
  showToast: (msg: string) => void;
  onNavigateTab: (tab: 'students' | 'classes' | 'teachers') => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({
  onOpenCardPairing,
  showToast,
  onNavigateTab
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>(() => AttendanceStorage.getTeachers());
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [teacherGenderFilter, setTeacherGenderFilter] = useState<string>('ALL');
  const [teacherRfidFilter, setTeacherRfidFilter] = useState<string>('ALL');
  const [teacherSortBy, setTeacherSortBy] = useState<string>('name_asc');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Modals
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [isMifareScannerOpen, setIsMifareScannerOpen] = useState<boolean>(false);

  // Form State
  const [teacherForm, setTeacherForm] = useState<{
    name: string;
    nip: string;
    position: string;
    rfidUid: string;
    gender: 'L' | 'P';
    phone: string;
    avatarUrl: string;
  }>({
    name: '',
    nip: '',
    position: 'Guru Mata Pelajaran',
    rfidUid: '',
    gender: 'L',
    phone: '',
    avatarUrl: ''
  });

  const reloadData = () => {
    setTeachers(AttendanceStorage.getTeachers());
  };

  // Filter and sort teachers
  const filteredAndSortedTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();

    const filtered = teachers.filter(t => {
      const matchesSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        (t.nip && t.nip.toLowerCase().includes(query)) ||
        (t.position && t.position.toLowerCase().includes(query)) ||
        (t.rfidUid && t.rfidUid.toLowerCase().includes(query));

      const matchesGender = teacherGenderFilter === 'ALL' || t.gender === teacherGenderFilter;
      const hasCard = Boolean(t.rfidUid && t.rfidUid.trim() !== '');
      const matchesRfid =
        teacherRfidFilter === 'ALL' ||
        (teacherRfidFilter === 'HAS_CARD' && hasCard) ||
        (teacherRfidFilter === 'NO_CARD' && !hasCard);

      return matchesSearch && matchesGender && matchesRfid;
    });

    return filtered.sort((a, b) => {
      switch (teacherSortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name, 'id');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'id');
        case 'nip_asc':
          return (a.nip || '').localeCompare(b.nip || '', undefined, { numeric: true });
        case 'position_asc':
          return (a.position || '').localeCompare(b.position || '');
        case 'rfid_assigned_first':
          return (b.rfidUid ? 1 : 0) - (a.rfidUid ? 1 : 0);
        case 'rfid_unassigned_first':
          return (a.rfidUid ? 1 : 0) - (b.rfidUid ? 1 : 0);
        default:
          return 0;
      }
    });
  }, [teachers, teacherSearch, teacherGenderFilter, teacherRfidFilter, teacherSortBy]);

  // Bulk selection
  const handleToggleSelect = (id: string) => {
    setSelectedTeacherIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedTeacherIds.length === filteredAndSortedTeachers.length && filteredAndSortedTeachers.length > 0) {
      setSelectedTeacherIds([]);
    } else {
      setSelectedTeacherIds(filteredAndSortedTeachers.map(t => t.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedTeacherIds.length === 0) return;
    if (window.confirm(`⚠️ Hapus massal ${selectedTeacherIds.length} data guru yang dipilih?`)) {
      const updated = AttendanceStorage.bulkDeleteTeachers(selectedTeacherIds);
      setTeachers(updated);
      setSelectedTeacherIds([]);
      showToast(`🗑️ ${selectedTeacherIds.length} Data guru berhasil dihapus!`);
    }
  };

  // Add / Edit Modal handlers
  const openAddTeacherModal = () => {
    setEditingTeacher(null);
    setTeacherForm({
      name: '',
      nip: `19${Math.floor(70000000 + Math.random() * 20000000)}`,
      position: 'Guru Mata Pelajaran',
      rfidUid: `000${Math.floor(10000000 + Math.random() * 90000000)}`,
      gender: 'L',
      phone: '',
      avatarUrl: ''
    });
    setIsTeacherModalOpen(true);
  };

  const openEditTeacherModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name,
      nip: teacher.nip || '',
      position: teacher.position || 'Guru Mata Pelajaran',
      rfidUid: teacher.rfidUid || '',
      gender: teacher.gender || 'L',
      phone: teacher.phone || '',
      avatarUrl: teacher.avatarUrl || ''
    });
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.rfidUid) {
      alert('Nama Guru dan Nomor RFID UID wajib diisi!');
      return;
    }

    if (editingTeacher) {
      const updated: Teacher = {
        ...editingTeacher,
        ...teacherForm
      };
      AttendanceStorage.updateTeacher(updated);
      showToast(`✅ Data guru "${updated.name}" berhasil diperbarui!`);
    } else {
      const newTeacher: Teacher = {
        id: `tch-${Date.now()}`,
        ...teacherForm
      };
      AttendanceStorage.addTeacher(newTeacher);
      showToast(`✅ Guru baru "${newTeacher.name}" berhasil ditambahkan!`);
    }

    setIsTeacherModalOpen(false);
    reloadData();
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data guru "${name}"?`)) {
      AttendanceStorage.deleteTeacher(id);
      reloadData();
      showToast(`✅ Data guru "${name}" berhasil dihapus dari database!`);
    }
  };

  // Export Teacher List to Excel
  const handleExportTeacherList = () => {
    if (teachers.length === 0) {
      alert('Belum ada data guru untuk diekspor!');
      return;
    }

    const dataRows = teachers.map((t, idx) => ({
      'No': idx + 1,
      'Nama Guru & Tenaga Kependidikan': t.name,
      'NIP / NUPTK / NIK': t.nip || '-',
      'Jabatan / Mata Pelajaran': t.position || '-',
      'Nomor Kartu RFID MIFARE': t.rfidUid || '-',
      'Jenis Kelamin': t.gender === 'P' ? 'Perempuan' : 'Laki-laki',
      'No. WhatsApp / HP': t.phone || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Guru');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 35 },
      { wch: 22 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 }
    ];

    XLSX.writeFile(workbook, `Data_Master_Guru_RFID_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('📊 File Excel Data Guru Berhasil Diunduh!');
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-6 text-left">
      
      {/* Sub-tab Switcher: Data Master (Siswa <-> Guru <-> Kelas) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 w-fit">
        <button
          type="button"
          onClick={() => onNavigateTab('students')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Data Siswa</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('teachers')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-purple-600 text-white shadow-md"
        >
          <UserCheck className="w-3.5 h-3.5 text-purple-200" />
          <span>Data Guru & PTK ({teachers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('classes')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
          <span>Master Data Kelas</span>
        </button>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-400" />
            <span>Master Data Guru & Tenaga Kependidikan</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Total <strong className="text-purple-300">{teachers.length}</strong> guru terdaftar. Menampilkan <strong className="text-white">{filteredAndSortedTeachers.length}</strong> guru sesuai filter.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedTeacherIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer border border-rose-400/30 animate-pulse"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus ({selectedTeacherIds.length}) Guru Terpilih</span>
            </button>
          )}

          <button
            onClick={() => setIsMifareScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border border-amber-300"
            title="Scan & Deteksi Kartu MIFARE Guru / Siswa"
          >
            <Scan className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>Mode Pengenalan MIFARE</span>
          </button>

          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border border-purple-400/30"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Import CSV</span>
          </button>

          <button
            onClick={downloadTeacherCsvTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs rounded-xl border border-purple-500/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Template CSV</span>
          </button>

          <button
            onClick={handleExportTeacherList}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={openAddTeacherModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Guru / Pegawai Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-purple-400" />
            <span>Filter & Pencarian Data Guru</span>
          </div>

          {(teacherSearch || teacherGenderFilter !== 'ALL' || teacherRfidFilter !== 'ALL' || teacherSortBy !== 'name_asc') && (
            <button
              onClick={() => {
                setTeacherSearch('');
                setTeacherGenderFilter('ALL');
                setTeacherRfidFilter('ALL');
                setTeacherSortBy('name_asc');
              }}
              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              placeholder="Cari Nama, NIP, Jabatan, RFID..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Gender Filter */}
          <div>
            <select
              value={teacherGenderFilter}
              onChange={(e) => setTeacherGenderFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Semua Jenis Kelamin (L / P)</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          {/* RFID Status Filter */}
          <div>
            <select
              value={teacherRfidFilter}
              onChange={(e) => setTeacherRfidFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">Status Kartu: Semua</option>
              <option value="HAS_CARD">Sudah Punya Kartu RFID</option>
              <option value="NO_CARD">Belum Terpasang RFID</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={teacherSortBy}
              onChange={(e) => setTeacherSortBy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="name_asc">Urutkan: Nama A - Z</option>
              <option value="name_desc">Urutkan: Nama Z - A</option>
              <option value="nip_asc">Urutkan: NIP Terkecil</option>
              <option value="position_asc">Urutkan: Jabatan / Mapel</option>
              <option value="rfid_assigned_first">Prioritas Kartu Terdaftar</option>
              <option value="rfid_unassigned_first">Prioritas Tanpa Kartu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="cursor-pointer text-slate-400 hover:text-white"
                  >
                    {selectedTeacherIds.length > 0 && selectedTeacherIds.length === filteredAndSortedTeachers.length ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">Foto & Nama Guru / Gelar</th>
                <th className="p-3.5">NIP / NUPTK</th>
                <th className="p-3.5">Jabatan / Mapel</th>
                <th className="p-3.5">Nomor Kartu RFID MIFARE</th>
                <th className="p-3.5">L/P</th>
                <th className="p-3.5">Kontak / HP</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredAndSortedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                    Tidak ditemukan data guru yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredAndSortedTeachers.map((teacher, idx) => {
                  const isSelected = selectedTeacherIds.includes(teacher.id);
                  const hasRfid = Boolean(teacher.rfidUid && teacher.rfidUid.trim() !== '');

                  return (
                    <tr
                      key={teacher.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-purple-900/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(teacher.id)}
                          className="cursor-pointer text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Name & Avatar */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              teacher.avatarUrl ||
                              (teacher.gender === 'P'
                                ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80"
                                : "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=80")
                            }
                            alt={teacher.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0 shadow-xs"
                          />
                          <div>
                            <p className="font-extrabold text-white text-xs">{teacher.name}</p>
                            <span className="text-[10px] text-purple-300 block font-medium">
                              {teacher.position || 'Tenaga Pendidik'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* NIP */}
                      <td className="p-3.5">
                        <span className="font-mono text-indigo-300 font-bold bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-900/60 text-[11px]">
                          {teacher.nip || '-'}
                        </span>
                      </td>

                      {/* Jabatan / Mapel */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {(() => {
                            const pos = (teacher.position || 'Guru').trim();
                            // Split by & or / or dan if present to render clean structured badges
                            const parts = pos.split(/\s*(?:&|\/|\bdan\b)\s*/i).filter(Boolean);
                            if (parts.length > 1) {
                              return parts.map((part, pIdx) => {
                                const isRole = /kepala|waka|wali|staff|tata usaha|tu|pembina|koordinator|direktur/i.test(part);
                                return (
                                  <span
                                    key={pIdx}
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border leading-tight ${
                                      isRole
                                        ? 'bg-indigo-950/80 text-indigo-200 border-indigo-700/70 shadow-xs'
                                        : 'bg-purple-950/80 text-purple-200 border-purple-700/70 shadow-xs'
                                    }`}
                                  >
                                    {part}
                                  </span>
                                );
                              });
                            }
                            return (
                              <span className="inline-flex items-center px-2.5 py-1 bg-purple-950/80 text-purple-200 border border-purple-700/70 rounded-lg text-xs font-semibold leading-normal shadow-xs">
                                {pos}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* RFID UID */}
                      <td className="p-3.5">
                        {hasRfid ? (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-mono text-amber-300 font-bold text-xs bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-800/40">
                              {teacher.rfidUid}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Belum dipasangkan</span>
                        )}
                      </td>

                      {/* Gender */}
                      <td className="p-3.5 font-bold">
                        {teacher.gender === 'P' ? (
                          <span className="text-pink-400">P</span>
                        ) : (
                          <span className="text-blue-400">L</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="p-3.5 text-slate-300 font-mono text-[11px]">
                        {teacher.phone || '-'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditTeacherModal(teacher)}
                            className="p-1.5 text-indigo-400 hover:text-white bg-indigo-950/40 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer border border-indigo-900/60"
                            title="Edit Data Guru"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                            className="p-1.5 text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer border border-rose-900/60"
                            title="Hapus Data Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL: ADD / EDIT TEACHER */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-left text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-black text-white">
                  {editingTeacher ? 'Edit Data Guru / Pegawai' : 'Tambah Data Guru Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4">
              {/* Nama Lengkap & Gelar */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nama Lengkap beserta Gelar: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* NIP & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    NIP / NUPTK / NIK:
                  </label>
                  <input
                    type="text"
                    value={teacherForm.nip}
                    onChange={(e) => setTeacherForm({ ...teacherForm, nip: e.target.value })}
                    placeholder="197405121998022001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Jenis Kelamin:
                  </label>
                  <select
                    value={teacherForm.gender}
                    onChange={(e) => setTeacherForm({ ...teacherForm, gender: e.target.value as 'L' | 'P' })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {/* Jabatan / Mata Pelajaran */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Jabatan / Tugas / Guru Mapel:
                </label>
                <input
                  type="text"
                  value={teacherForm.position}
                  onChange={(e) => setTeacherForm({ ...teacherForm, position: e.target.value })}
                  placeholder="Contoh: Guru Matematika / Waka Kurikulum"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Nomor Kartu RFID MIFARE */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Nomor Kartu RFID MIFARE UID: <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomUid = `000${Math.floor(10000000 + Math.random() * 90000000)}`;
                      setTeacherForm({ ...teacherForm, rfidUid: randomUid });
                    }}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Acak Nomor UID</span>
                  </button>
                </div>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={teacherForm.rfidUid}
                    onChange={(e) => setTeacherForm({ ...teacherForm, rfidUid: e.target.value })}
                    placeholder="Tempelkan kartu ke reader USB / ketik UID"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* WhatsApp / No HP */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nomor WhatsApp / HP:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Foto Profil Guru (Input File JPG/PNG & Base64 Database Storage) */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  Foto Profil Guru (JPG / PNG):
                </label>

                <div className="flex items-center gap-4">
                  {/* Photo Preview */}
                  <div className="relative group shrink-0">
                    <img
                      src={teacherForm.avatarUrl || (teacherForm.gender === 'P' ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80")}
                      alt="Preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/50 shadow-md bg-slate-900"
                    />
                    {teacherForm.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setTeacherForm({ ...teacherForm, avatarUrl: '' })}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow transition-colors"
                        title="Hapus foto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Upload Actions */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload File Foto (JPG/PNG)</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressedBase64 = await processAndCompressImage(file, 256, 256, 0.82);
                                setTeacherForm(prev => ({ ...prev, avatarUrl: compressedBase64 }));
                                showToast('📸 Foto guru berhasil diunggah & siap disimpan ke database!');
                              } catch (err: any) {
                                alert(err.message || 'Gagal memproses file foto');
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* URL Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={teacherForm.avatarUrl}
                        onChange={(e) => setTeacherForm({ ...teacherForm, avatarUrl: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-purple-500 placeholder-slate-500"
                        placeholder="Atau tempel URL foto (https://...)"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Avatar Presets */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                  <span>Preset Foto Cepat:</span>
                  <button
                    type="button"
                    onClick={() => setTeacherForm({ ...teacherForm, avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80' })}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
                  >
                    👨‍🏫 Guru L
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherForm({ ...teacherForm, avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' })}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
                  >
                    👩‍🏫 Guru P
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherForm({ ...teacherForm, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' })}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
                  >
                    👩‍🏫 Guru P2
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer border border-purple-400/30"
                >
                  {editingTeacher ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      <TeacherBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          reloadData();
          showToast('✅ Berhasil mengimpor data guru!');
        }}
      />

      {/* MIFARE SCANNER RECOGNITION MODAL */}
      <MifareScannerModal
        isOpen={isMifareScannerOpen}
        onClose={() => setIsMifareScannerOpen(false)}
        onStudentUpdated={() => {
          reloadData();
          showToast('✅ Sinkronisasi kartu RFID MIFARE berhasil!');
        }}
      />

    </div>
  );
};
