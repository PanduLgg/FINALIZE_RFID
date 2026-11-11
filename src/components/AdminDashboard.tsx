import React, { useState, useEffect, useMemo } from 'react';
import { Student, Teacher, SchoolSchedule, AttendanceRecord, GateLocation, PairedDailyAttendance, SystemUser, Role, DailyAttendanceRecap } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { exportAttendanceToExcel, exportAttendanceToCSV, printAttendanceReport, downloadStudentCsvTemplate, pairAttendanceRecords } from '../lib/exportUtils';
import { processAndCompressImage } from '../lib/imageUtils';
import { MifareScannerModal } from './MifareScannerModal';
import { BulkImportModal } from './BulkImportModal';
import { MifareGuideModal } from './MifareGuideModal';
import { DayRolloverModal } from './DayRolloverModal';
import { TeacherManagement } from './TeacherManagement';
import { TeacherReports } from './TeacherReports';
import { StudentDisciplineReport } from './StudentDisciplineReport';
import { StudentLateLeaderboard } from './StudentLateLeaderboard';
import { StudentEarlyLeaderboard } from './StudentEarlyLeaderboard';
import { UserManagement } from './UserManagement';
import { 
  HOLIDAY_GREETINGS_PRESETS, 
  HOLIDAY_CATEGORIES, 
  MARQUEE_THEMES_CONFIG, 
  HolidayPreset 
} from '../data/holidayGreetings';
import { 
  ShieldCheck, 
  Users, 
  Clock, 
  Download, 
  Plus, 
  Trash2, 
  Edit3, 
  CreditCard, 
  Save, 
  Upload, 
  Search, 
  Filter, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Sparkles,
  FileSpreadsheet,
  Megaphone,
  RefreshCw,
  Building2,
  Scan,
  Database,
  HelpCircle,
  ArrowUpDown,
  CalendarDays,
  CalendarRange,
  RotateCcw,
  CheckSquare,
  Square,
  FileText,
  Image as ImageIcon,
  Camera,
  UploadCloud,
  X,
  GraduationCap,
  FolderPlus,
  Layers,
  School,
  BookOpen,
  AlertCircle,
  ChevronDown,
  UserCheck,
  Menu,
  ChevronLeft,
  ChevronRight,
  Award,
  Trophy,
  AlignCenter,
  AlignLeft,
  Palette,
  Gauge,
  Type,
  Play,
  Moon,
  Flag,
  Zap,
  Check,
  ChevronUp,
  TrendingDown,
  Lock,
  KeyRound
} from 'lucide-react';

interface AdminDashboardProps {
  schedule: SchoolSchedule;
  setSchedule: (sch: SchoolSchedule) => void;
  onOpenCardPairing: (student: Student) => void;
  onOpenKioskMode?: () => void;
  currentUser?: { username: string; role: Role; name: string } | null;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  schedule,
  setSchedule,
  onOpenCardPairing,
  onOpenKioskMode,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'teachers' | 'classes' | 'schedule' | 'reports' | 'discipline_reports' | 'teacher_reports' | 'leaderboard' | 'announcements' | 'backup' | 'users'>('overview');
  const [leaderboardSubTab, setLeaderboardSubTab] = useState<'today_arrival' | 'early_rank' | 'late_rank'>('today_arrival');
  const [openMenuDropdown, setOpenMenuDropdown] = useState<'master' | 'reports_db' | null>(null);
  const [isMobileAdminNavOpen, setIsMobileAdminNavOpen] = useState<boolean>(false);
  const [kioskPinInput, setKioskPinInput] = useState<string>(() => AttendanceStorage.getKioskPin() || '1234');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => AttendanceStorage.getSystemUsers());

  // Backup & Restore State
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);

  // ==========================================
  // MASTER DATA KELAS STATE (CLASSES MANAGEMENT)
  // ==========================================
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClassNames, setSelectedClassNames] = useState<string[]>([]);
  const [classSearchQuery, setClassSearchQuery] = useState<string>('');
  const [classGradeFilter, setClassGradeFilter] = useState<'ALL' | 'X' | 'XI' | 'XII' | 'OTHER'>('ALL');
  const [classSortBy, setClassSortBy] = useState<'name_asc' | 'name_desc' | 'students_desc' | 'students_asc'>('name_asc');

  // Modals for Class Management
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState<boolean>(false);
  const [addClassMode, setAddClassMode] = useState<'single' | 'batch'>('single');
  const [singleClassName, setSingleClassName] = useState<string>('');
  const [singleGradeLevel, setSingleGradeLevel] = useState<string>('X');
  const [batchClassInput, setBatchClassInput] = useState<string>('');

  const [isBulkDeleteClassModalOpen, setIsBulkDeleteClassModalOpen] = useState<boolean>(false);
  const [deleteClassWithStudents, setDeleteClassWithStudents] = useState<boolean>(false);
  const [editingClassModal, setEditingClassModal] = useState<{ oldName: string; newName: string } | null>(null);

  // MIFARE Scanner, Bulk Import & Guide Modals
  const [isMifareScannerOpen, setIsMifareScannerOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [isMifareGuideOpen, setIsMifareGuideOpen] = useState<boolean>(false);

  // Student Form State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Bulk Selection State for Deleting Students
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentForm, setStudentForm] = useState<{
    name: string;
    nisn: string;
    class: string;
    rfidUid: string;
    gender: 'L' | 'P';
    avatarUrl: string;
  }>({
    name: '',
    nisn: '',
    class: 'X MIPA 1',
    rfidUid: '',
    gender: 'L',
    avatarUrl: ''
  });

  // Schedule Form State
  const [scheduleForm, setScheduleForm] = useState<SchoolSchedule>(schedule);
  const [isResetTodayModalOpen, setIsResetTodayModalOpen] = useState<boolean>(false);

  // ==========================================
  // SEARCH, FILTER & SORT STATE FOR STUDENTS
  // ==========================================
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('ALL');
  const [studentGenderFilter, setStudentGenderFilter] = useState<string>('ALL');
  const [studentRfidFilter, setStudentRfidFilter] = useState<string>('ALL');
  const [studentSortBy, setStudentSortBy] = useState<string>('name_asc');

  // ==========================================
  // PERIOD, FILTER & SORT STATE FOR REPORTS
  // ==========================================
  const [reportPeriodMode, setReportPeriodMode] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  
  // Daily Mode: Single Day
  const [reportDailyDate, setReportDailyDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Weekly Mode: Reference Date for Week
  const [reportWeeklyRefDate, setReportWeeklyRefDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Monthly Mode: Month & Year
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());

  // Custom Range Mode
  const [reportCustomStartDate, setReportCustomStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reportCustomEndDate, setReportCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Report General Filters & Sort
  const [reportSearchTerm, setReportSearchTerm] = useState<string>('');
  const [reportClassFilter, setReportClassFilter] = useState<string>('ALL');
  const [reportGateFilter, setReportGateFilter] = useState<string>('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('ALL');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('ALL');
  const [reportSortBy, setReportSortBy] = useState<string>('time_desc');

  // Leaderboard filter (ALL, STUDENT, TEACHER)
  const [leaderboardFilter, setLeaderboardFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER'>('STUDENT');

  // Running Text & Holiday Presets State
  const [selectedHolidayCategory, setSelectedHolidayCategory] = useState<string>('all');
  const [holidaySearchQuery, setHolidaySearchQuery] = useState<string>('');
  const [simulationTapTime, setSimulationTapTime] = useState<string>('07:10');
  const [marqueePreviewSession, setMarqueePreviewSession] = useState<'entry' | 'exit'>('entry');
  const [marqueeActiveEditTab, setMarqueeActiveEditTab] = useState<'entry' | 'exit' | 'all'>('entry');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Day Rollover / Daily Archive Recap Modal State
  const [isArchiveRecapModalOpen, setIsArchiveRecapModalOpen] = useState<boolean>(false);
  const [activeRecapData, setActiveRecapData] = useState<{
    previousDate: string;
    newDate: string;
    recap?: DailyAttendanceRecap | null;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleApplyHolidayPreset = (preset: HolidayPreset) => {
    setScheduleForm(prev => ({
      ...prev,
      announcementText: preset.mainText,
      announcementTextEntry: preset.mainText,
      announcementTextExit: preset.mainText,
      marqueeTheme: preset.theme,
      marqueeDisplayMode: preset.displayMode,
      marqueeSpeed: preset.speed,
      marqueeFontSize: preset.fontSize,
      marqueeBadgeText: preset.badgeText,
      marqueeBadgeIcon: preset.badgeIcon,
      marqueeSubText: preset.subText || ''
    }));
    showToast(`✨ Preset "${preset.title}" diterapkan! Klik tombol Simpan untuk menyiarkan ke monitor.`);
  };

  const refreshAllData = () => {
    setStudents(AttendanceStorage.getStudents());
    setTeachers(AttendanceStorage.getTeachers());
    setClasses(AttendanceStorage.getClasses());
    setAttendanceRecords(AttendanceStorage.getAttendanceRecords());
    setSystemUsers(AttendanceStorage.getSystemUsers());
    const currentSchedule = AttendanceStorage.getSchedule();
    setScheduleForm(currentSchedule);
    setSchedule(currentSchedule);
  };

  useEffect(() => {
    setScheduleForm(schedule);
  }, [schedule]);

  useEffect(() => {
    refreshAllData();

    const unsubscribe = AttendanceStorage.subscribeToSync((evt) => {
      if (evt.type === 'SCHEDULE_UPDATED') {
        const sch = AttendanceStorage.getSchedule();
        setScheduleForm(sch);
        setSchedule(sch);
      } else {
        refreshAllData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Toggle manual gate override handler
  const handleToggleManualGateOverride = () => {
    const newStatus = !scheduleForm.manualGateOverride;
    const effectiveCooldown = Number(scheduleForm.cooldownSeconds ?? scheduleForm.antiSpamCooldownSeconds ?? 60);
    const updatedSchedule: SchoolSchedule = {
      ...scheduleForm,
      cooldownSeconds: effectiveCooldown,
      antiSpamCooldownSeconds: effectiveCooldown,
      manualGateOverride: newStatus
    };
    AttendanceStorage.saveSchedule(updatedSchedule);
    setSchedule(updatedSchedule);
    setScheduleForm(updatedSchedule);
    if (newStatus) {
      showToast('🔓 Mode Buka Gerbang Manual AKTIF: Kiosk dapat menerima tap kartu di luar jam operasional untuk testing & cek bug.');
    } else {
      showToast('🔒 Mode Buka Gerbang Manual NONAKTIF: Gerbang kembali mengikuti jadwal normal.');
    }
  };

  // Update schedule handler
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCooldown = Number(scheduleForm.cooldownSeconds ?? scheduleForm.antiSpamCooldownSeconds ?? 60);
    const updatedSchedule: SchoolSchedule = {
      ...scheduleForm,
      cooldownSeconds: effectiveCooldown,
      antiSpamCooldownSeconds: effectiveCooldown
    };
    AttendanceStorage.saveSchedule(updatedSchedule);
    setSchedule(updatedSchedule);
    setScheduleForm(updatedSchedule);
    showToast('✅ Pengaturan Waktu & Running Text Berhasil Disimpan & Ter-update Realtime!');
  };

  // =========================================================================
  // CLASS MANAGEMENT LOGIC & ACTION HANDLERS
  // =========================================================================
  const classStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of students) {
      if (s.class) {
        counts[s.class] = (counts[s.class] || 0) + 1;
      }
    }
    return counts;
  }, [students]);

  const filteredAndSortedClasses = useMemo(() => {
    const query = classSearchQuery.trim().toLowerCase();

    const filtered = classes.filter(cls => {
      const matchesSearch = !query || cls.toLowerCase().includes(query);

      let matchesGrade = true;
      if (classGradeFilter === 'X') {
        matchesGrade = cls.startsWith('X ') || cls.startsWith('X-') || cls.startsWith('10 ') || cls.startsWith('10-');
      } else if (classGradeFilter === 'XI') {
        matchesGrade = cls.startsWith('XI ') || cls.startsWith('XI-') || cls.startsWith('11 ') || cls.startsWith('11-');
      } else if (classGradeFilter === 'XII') {
        matchesGrade = cls.startsWith('XII ') || cls.startsWith('XII-') || cls.startsWith('12 ') || cls.startsWith('12-');
      } else if (classGradeFilter === 'OTHER') {
        matchesGrade = !cls.startsWith('X ') && !cls.startsWith('XI ') && !cls.startsWith('XII ') && !cls.startsWith('10') && !cls.startsWith('11') && !cls.startsWith('12');
      }

      return matchesSearch && matchesGrade;
    });

    return [...filtered].sort((a, b) => {
      if (classSortBy === 'name_asc') return a.localeCompare(b, undefined, { numeric: true });
      if (classSortBy === 'name_desc') return b.localeCompare(a, undefined, { numeric: true });
      if (classSortBy === 'students_desc') return (classStudentCounts[b] || 0) - (classStudentCounts[a] || 0);
      if (classSortBy === 'students_asc') return (classStudentCounts[a] || 0) - (classStudentCounts[b] || 0);
      return 0;
    });
  }, [classes, classSearchQuery, classGradeFilter, classSortBy, classStudentCounts]);

  const handleAddSingleClass = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = singleClassName.trim();
    if (!clean) {
      alert('Nama kelas tidak boleh kosong!');
      return;
    }

    const res = AttendanceStorage.addClass(clean);
    if (!res.success) {
      alert(res.message);
      return;
    }

    setSingleClassName('');
    setIsAddClassModalOpen(false);
    refreshAllData();
    showToast(`✅ ${res.message}`);
  };

  const handleAddBatchClasses = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchClassInput.trim()) {
      alert('Masukkan setidaknya satu nama kelas!');
      return;
    }

    // Split by comma or newline
    const names = batchClassInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const res = AttendanceStorage.addClasses(names);
    if (!res.success) {
      alert(res.message);
      return;
    }

    setBatchClassInput('');
    setIsAddClassModalOpen(false);
    refreshAllData();
    showToast(`✅ ${res.message}`);
  };

  const handleApplyPreset = (presetType: 'SMK' | 'SMA') => {
    let presetList: string[] = [];
    if (presetType === 'SMK') {
      presetList = [
        'X AKL 1', 'X AKL 2', 'X OTKP 1', 'X OTKP 2', 'X BDP 1', 'X BDP 2', 'X TKJ 1', 'X TKJ 2', 'X RPL 1', 'X RPL 2',
        'XI AKL 1', 'XI AKL 2', 'XI OTKP 1', 'XI OTKP 2', 'XI BDP 1', 'XI BDP 2', 'XI TKJ 1', 'XI TKJ 2', 'XI RPL 1', 'XI RPL 2',
        'XII AKL 1', 'XII AKL 2', 'XII OTKP 1', 'XII OTKP 2', 'XII BDP 1', 'XII BDP 2', 'XII TKJ 1', 'XII TKJ 2', 'XII RPL 1', 'XII RPL 2'
      ];
    } else {
      presetList = [
        'X MIPA 1', 'X MIPA 2', 'X MIPA 3', 'X IPS 1', 'X IPS 2', 'X IPS 3',
        'XI MIPA 1', 'XI MIPA 2', 'XI MIPA 3', 'XI IPS 1', 'XI IPS 2', 'XI IPS 3',
        'XII MIPA 1', 'XII MIPA 2', 'XII MIPA 3', 'XII IPS 1', 'XII IPS 2', 'XII IPS 3'
      ];
    }

    if (confirm(`Muat ${presetList.length} kelas standar ${presetType}? Kelas yang belum ada akan langsung didaftarkan.`)) {
      const res = AttendanceStorage.addClasses(presetList);
      refreshAllData();
      showToast(`✅ Berhasil memuat preset ${presetType}! (${res.addedCount} kelas baru ditambahkan)`);
    }
  };

  const handleSelectAllClasses = (checked: boolean) => {
    if (checked) {
      setSelectedClassNames(filteredAndSortedClasses);
    } else {
      setSelectedClassNames([]);
    }
  };

  const handleToggleSelectClass = (className: string) => {
    if (selectedClassNames.includes(className)) {
      setSelectedClassNames(selectedClassNames.filter(c => c !== className));
    } else {
      setSelectedClassNames([...selectedClassNames, className]);
    }
  };

  const handleSingleDeleteClass = (className: string) => {
    const clean = className.trim();
    const studentCount = classStudentCounts[clean] || classStudentCounts[className] || 0;
    let confirmMsg = `Apakah Anda yakin ingin menghapus kelas "${clean}"?`;
    if (studentCount > 0) {
      confirmMsg += `\n\n⚠️ Peringatan: Terdapat ${studentCount} siswa yang saat ini terdaftar di kelas ini.`;
    }

    if (confirm(confirmMsg)) {
      const res = AttendanceStorage.deleteClass(clean);
      setClasses(res.classes);
      setSelectedClassNames(prev => prev.filter(c => c.trim().toLowerCase() !== clean.toLowerCase()));
      refreshAllData();
      showToast(`✅ ${res.message}`);
    }
  };

  const handleConfirmBulkDeleteClasses = () => {
    if (selectedClassNames.length === 0) return;

    const res = AttendanceStorage.bulkDeleteClasses(selectedClassNames, {
      deleteStudents: deleteClassWithStudents
    });

    setClasses(res.classes);
    setSelectedClassNames([]);
    setIsBulkDeleteClassModalOpen(false);
    setDeleteClassWithStudents(false);
    refreshAllData();
    showToast(`✅ ${res.message}`);
  };

  const handleSaveRenameClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassModal || !editingClassModal.newName.trim()) return;

    const res = AttendanceStorage.updateClass(editingClassModal.oldName, editingClassModal.newName);
    if (!res.success) {
      alert(res.message);
      return;
    }

    setEditingClassModal(null);
    refreshAllData();
    showToast(`✅ ${res.message}`);
  };

  // Open modal to add or edit student
  const openAddStudentModal = () => {
    setEditingStudent(null);
    const defaultClass = classes.length > 0 ? classes[0] : 'X MIPA 1';
    setStudentForm({
      name: '',
      nisn: `00${Math.floor(10000000 + Math.random() * 90000000)}`,
      class: defaultClass,
      rfidUid: `000${Math.floor(10000000 + Math.random() * 90000000)}`,
      gender: 'L',
      avatarUrl: ''
    });
    setIsStudentModalOpen(true);
  };

  const openEditStudentModal = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      nisn: student.nisn || '',
      class: student.class,
      rfidUid: student.rfidUid,
      gender: student.gender || 'L',
      avatarUrl: student.avatarUrl || ''
    });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = (studentForm.name || '').trim();
    const cleanClass = (studentForm.class || '').trim();
    const cleanNisn = (studentForm.nisn || '').trim();
    const cleanRfid = (studentForm.rfidUid || '').trim();

    if (!cleanName || !cleanRfid) {
      alert('Nama dan RFID UID wajib diisi!');
      return;
    }

    // Also auto-register class if new
    if (cleanClass && !classes.some(c => c.trim().toLowerCase() === cleanClass.toLowerCase())) {
      AttendanceStorage.addClass(cleanClass);
    }

    if (editingStudent) {
      const updated: Student = {
        ...editingStudent,
        ...studentForm,
        name: cleanName,
        class: cleanClass,
        nisn: cleanNisn,
        rfidUid: cleanRfid
      };
      AttendanceStorage.updateStudent(updated);
      showToast(`✅ Data siswa "${updated.name}" berhasil diperbarui!`);
    } else {
      const newStudent: Student = {
        id: `std-${Date.now()}`,
        name: cleanName,
        class: cleanClass,
        nisn: cleanNisn,
        rfidUid: cleanRfid,
        gender: studentForm.gender || 'L'
      };
      AttendanceStorage.addStudent(newStudent);
      showToast(`✅ Siswa baru "${newStudent.name}" berhasil ditambahkan!`);
    }

    setIsStudentModalOpen(false);
    refreshAllData();
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data siswa "${name}"?`)) {
      AttendanceStorage.deleteStudent(id);
      refreshAllData();
      showToast(`✅ Data siswa "${name}" berhasil dihapus dari database!`);
    }
  };

  // Batch CSV Import for Students
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const lines = content.split('\n');
      let count = 0;
      const currentStudents = AttendanceStorage.getStudents();
      const newStudentsList = [...currentStudents];
      const importedClasses: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [name, nisn, className, rfidUid, gender] = line.split(',').map(s => s?.replace(/^"|"$/g, '').trim());

        if (name && rfidUid) {
          const assignedClass = className || 'X MIPA 1';
          importedClasses.push(assignedClass);
          newStudentsList.push({
            id: `std-csv-${Date.now()}-${i}`,
            name,
            nisn: nisn || `008${Math.floor(Math.random() * 1000000)}`,
            class: assignedClass,
            rfidUid,
            gender: (gender === 'P' ? 'P' : 'L')
          });
          count++;
        }
      }

      AttendanceStorage.saveStudents(newStudentsList);
      if (importedClasses.length > 0) {
        AttendanceStorage.addClasses(importedClasses);
      }
      refreshAllData();
      showToast(`✅ Berhasil mengimpor ${count} data siswa dari file CSV secara Realtime!`);
    };
    reader.readAsText(file);
  };

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set([...classes, ...students.map(s => s.class)])).filter(Boolean).sort();
  }, [classes, students]);

  // =========================================================================
  // FILTERED & SORTED STUDENTS LIST (KELOLA DATA SISWA)
  // =========================================================================
  const filteredAndSortedStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    const filtered = students.filter(s => {
      const matchesSearch = 
        !query ||
        s.name.toLowerCase().includes(query) ||
        (s.nisn && s.nisn.toLowerCase().includes(query)) ||
        s.class.toLowerCase().includes(query) ||
        s.rfidUid.toLowerCase().includes(query);

      const matchesClass = studentClassFilter === 'ALL' || s.class === studentClassFilter;
      const matchesGender = studentGenderFilter === 'ALL' || s.gender === studentGenderFilter;
      
      const hasCard = Boolean(s.rfidUid && s.rfidUid.trim() !== '');
      const matchesRfid = 
        studentRfidFilter === 'ALL' ||
        (studentRfidFilter === 'HAS_CARD' && hasCard) ||
        (studentRfidFilter === 'NO_CARD' && !hasCard);

      return matchesSearch && matchesClass && matchesGender && matchesRfid;
    });

    // Sorting logic
    return filtered.sort((a, b) => {
      switch (studentSortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name, 'id');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'id');
        case 'nisn_asc':
          return (a.nisn || '').localeCompare(b.nisn || '', undefined, { numeric: true });
        case 'nisn_desc':
          return (b.nisn || '').localeCompare(a.nisn || '', undefined, { numeric: true });
        case 'class_asc':
          return a.class.localeCompare(b.class);
        case 'class_desc':
          return b.class.localeCompare(a.class);
        case 'rfid_assigned_first':
          return (b.rfidUid ? 1 : 0) - (a.rfidUid ? 1 : 0);
        case 'rfid_unassigned_first':
          return (a.rfidUid ? 1 : 0) - (b.rfidUid ? 1 : 0);
        default:
          return 0;
      }
    });
  }, [students, studentSearch, studentClassFilter, studentGenderFilter, studentRfidFilter, studentSortBy]);

  // Bulk Selection and Deletion Helpers
  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredAndSortedStudents.length && filteredAndSortedStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredAndSortedStudents.map(s => s.id));
    }
  };

  const handleBulkDeleteSelected = () => {
    if (selectedStudentIds.length === 0) return;
    if (window.confirm(`⚠️ KONFIRMASI HAPUS MASSAL:\n\nApakah Anda yakin ingin menghapus ${selectedStudentIds.length} data siswa terpilih?`)) {
      const updated = AttendanceStorage.bulkDeleteStudents(selectedStudentIds);
      setStudents(updated);
      setSelectedStudentIds([]);
      showToast(`🗑️ ${selectedStudentIds.length} Data siswa berhasil dihapus!`);
    }
  };

  const handleClearAllStudents = () => {
    if (students.length === 0) return;
    if (window.confirm("🚨 PERINGATAN HAPUS TOTAL DATA:\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA SISWA? Tindakan ini cocok jika terjadi kesalahan impor massal.")) {
      if (window.confirm("Ketik KONFIRMASI: Lanjutkan menghapus SELURUH data siswa di database?")) {
        AttendanceStorage.clearAllStudents();
        setStudents([]);
        setSelectedStudentIds([]);
        showToast("🗑️ Seluruh data siswa telah berhasil dikosongkan!");
      }
    }
  };

  const handleResetStudentFilters = () => {
    setStudentSearch('');
    setStudentClassFilter('ALL');
    setStudentGenderFilter('ALL');
    setStudentRfidFilter('ALL');
    setStudentSortBy('name_asc');
  };

  // =========================================================================
  // DATES & LABELS CALCULATION FOR PERIOD REPORTS (PER HARI, PER MINGGU, PER BULAN)
  // =========================================================================
  const { effectiveStartDate, effectiveEndDate, periodTitleLabel, periodFilePrefix } = useMemo(() => {
    if (reportPeriodMode === 'daily') {
      const targetDate = reportDailyDate || new Date().toISOString().split('T')[0];
      const parsed = new Date(targetDate + 'T00:00:00');
      const formattedDate = parsed.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      return {
        effectiveStartDate: targetDate,
        effectiveEndDate: targetDate,
        periodTitleLabel: `Laporan Harian (${formattedDate})`,
        periodFilePrefix: `Rekap_Absensi_Harian_${targetDate}`
      };
    }

    if (reportPeriodMode === 'weekly') {
      const refDate = new Date((reportWeeklyRefDate || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      const dayOfWeek = refDate.getDay(); // 0 is Sunday, 1 is Monday...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      
      const monday = new Date(refDate);
      monday.setDate(refDate.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const startStr = monday.toISOString().split('T')[0];
      const endStr = sunday.toISOString().split('T')[0];

      const startFmt = monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const endFmt = sunday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

      return {
        effectiveStartDate: startStr,
        effectiveEndDate: endStr,
        periodTitleLabel: `Laporan Mingguan (${startFmt} - ${endFmt})`,
        periodFilePrefix: `Rekap_Absensi_Mingguan_${startStr}_sd_${endStr}`
      };
    }

    if (reportPeriodMode === 'monthly') {
      const year = reportYear || new Date().getFullYear();
      const month = reportMonth || (new Date().getMonth() + 1);
      
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const startStr = `${year}-${monthStr}-01`;
      
      const lastDay = new Date(year, month, 0).getDate();
      const endStr = `${year}-${monthStr}-${lastDay < 10 ? `0${lastDay}` : lastDay}`;
      const monthName = MONTH_NAMES[month - 1];

      return {
        effectiveStartDate: startStr,
        effectiveEndDate: endStr,
        periodTitleLabel: `Laporan Bulanan (${monthName} ${year})`,
        periodFilePrefix: `Rekap_Absensi_Bulanan_${monthName}_${year}`
      };
    }

    // Custom range
    const startStr = reportCustomStartDate || new Date().toISOString().split('T')[0];
    const endStr = reportCustomEndDate || new Date().toISOString().split('T')[0];

    return {
      effectiveStartDate: startStr,
      effectiveEndDate: endStr,
      periodTitleLabel: `Laporan Periode (${startStr} s/d ${endStr})`,
      periodFilePrefix: `Rekap_Absensi_Periode_${startStr}_sd_${endStr}`
    };
  }, [reportPeriodMode, reportDailyDate, reportWeeklyRefDate, reportMonth, reportYear, reportCustomStartDate, reportCustomEndDate]);

  // =========================================================================
  // FILTERED & SORTED ATTENDANCE RECORDS (REKAP REPORT - MASUK & PULANG BERSANDINGAN)
  // =========================================================================
  const filteredAndSortedReports: PairedDailyAttendance[] = useMemo(() => {
    // Group & pair all raw records so each student has 1 unified row per date
    const paired = pairAttendanceRecords(attendanceRecords);
    const query = reportSearchTerm.trim().toLowerCase();

    const filtered = paired.filter(rec => {
      const recDate = rec.dateFormatted; // YYYY-MM-DD
      const inDateRange = recDate >= effectiveStartDate && recDate <= effectiveEndDate;
      
      const matchesSearch = 
        !query ||
        rec.studentName.toLowerCase().includes(query) ||
        (rec.nisn && rec.nisn.toLowerCase().includes(query)) ||
        rec.studentClass.toLowerCase().includes(query) ||
        (rec.notes && rec.notes.toLowerCase().includes(query)) ||
        rec.entryGate.toLowerCase().includes(query) ||
        rec.exitGate.toLowerCase().includes(query);

      const matchesClass = reportClassFilter === 'ALL' || rec.studentClass === reportClassFilter;
      const matchesGate = reportGateFilter === 'ALL' || rec.entryGate === reportGateFilter || rec.exitGate === reportGateFilter;
      
      const matchesStatus = reportStatusFilter === 'ALL' || 
        (reportStatusFilter === 'TEPAT_WAKTU' && rec.entryStatus === 'TEPAT_WAKTU') ||
        (reportStatusFilter === 'TERLAMBAT' && rec.entryStatus === 'TERLAMBAT') ||
        (reportStatusFilter === 'PULANG' && rec.exitTime !== 'Belum Pulang');

      const matchesType = reportTypeFilter === 'ALL' ||
        (reportTypeFilter === 'MASUK' && rec.entryTime !== '-') ||
        (reportTypeFilter === 'PULANG' && rec.exitTime !== 'Belum Pulang');

      return inDateRange && matchesSearch && matchesClass && matchesGate && matchesStatus && matchesType;
    });

    // Sorting
    return filtered.sort((a, b) => {
      switch (reportSortBy) {
        case 'time_desc':
          return (b.entryTimestamp || b.exitTimestamp || '').localeCompare(a.entryTimestamp || a.exitTimestamp || '');
        case 'time_asc':
          return (a.entryTimestamp || a.exitTimestamp || '').localeCompare(b.entryTimestamp || b.exitTimestamp || '');
        case 'name_asc':
          return a.studentName.localeCompare(b.studentName, 'id');
        case 'name_desc':
          return b.studentName.localeCompare(a.studentName, 'id');
        case 'nisn_asc':
          return (a.nisn || '').localeCompare(b.nisn || '', undefined, { numeric: true });
        case 'nisn_desc':
          return (b.nisn || '').localeCompare(a.nisn || '', undefined, { numeric: true });
        case 'class_asc':
          return a.studentClass.localeCompare(b.studentClass);
        case 'late_desc':
          return (b.lateMinutes || 0) - (a.lateMinutes || 0);
        default:
          return 0;
      }
    });
  }, [attendanceRecords, effectiveStartDate, effectiveEndDate, reportSearchTerm, reportClassFilter, reportGateFilter, reportStatusFilter, reportTypeFilter, reportSortBy]);

  // Report statistics summary for current filtered view
  const reportStats = useMemo(() => {
    const total = filteredAndSortedReports.length;
    const onTime = filteredAndSortedReports.filter(r => r.entryStatus === 'TEPAT_WAKTU').length;
    const late = filteredAndSortedReports.filter(r => r.entryStatus === 'TERLAMBAT').length;
    const checkouts = filteredAndSortedReports.filter(r => r.exitTime !== 'Belum Pulang').length;
    return { total, onTime, late, checkouts };
  }, [filteredAndSortedReports]);

  // Today's Chronological Arrival Ranking (Leaderboard)
  const arrivalRankingToday = useMemo(() => {
    return AttendanceStorage.getArrivalRankingToday(leaderboardFilter);
  }, [attendanceRecords, leaderboardFilter]);

  // Export handlers (using paired side-by-side format)
  const handleExportExcel = () => {
    if (filteredAndSortedReports.length === 0) {
      alert('Tidak ada data absensi untuk diekspor!');
      return;
    }
    exportAttendanceToExcel(filteredAndSortedReports, periodFilePrefix, periodTitleLabel);
    showToast(`📊 Berhasil mengunduh Excel: ${periodTitleLabel}`);
  };

  const handleExportCSV = () => {
    if (filteredAndSortedReports.length === 0) {
      alert('Tidak ada data absensi untuk diekspor!');
      return;
    }
    exportAttendanceToCSV(filteredAndSortedReports, periodFilePrefix);
    showToast(`📄 Berhasil mengunduh CSV: ${periodTitleLabel}`);
  };

  const handlePrintReport = () => {
    if (filteredAndSortedReports.length === 0) {
      alert('Tidak ada data absensi untuk dicetak!');
      return;
    }
    printAttendanceReport(
      filteredAndSortedReports,
      schedule.schoolName,
      `Rekap Absensi Siswa - ${periodTitleLabel}`,
      `Rentang Tanggal: ${effectiveStartDate} s/d ${effectiveEndDate} | Filter: ${reportClassFilter === 'ALL' ? 'Semua Kelas' : reportClassFilter}`
    );
  };

  const handleResetTodayAttendance = async () => {
    const today = AttendanceStorage.getTodayDate();
    const res = await AttendanceStorage.resetTodayAttendance();
    setIsResetTodayModalOpen(false);
    refreshAllData();
    const recap = AttendanceStorage.getDailyRecapByDate(today);
    setActiveRecapData({
      previousDate: today,
      newDate: AttendanceStorage.getTodayDate(),
      recap
    });
    setIsArchiveRecapModalOpen(true);
    showToast(`🔄 ${res.message}`);
  };

  const handleManualArchiveToday = async () => {
    const today = AttendanceStorage.getTodayDate();
    const res = await AttendanceStorage.triggerManualArchiveAndReset(today);
    refreshAllData();
    setActiveRecapData({
      previousDate: today,
      newDate: AttendanceStorage.getTodayDate(),
      recap: res.recap
    });
    setIsArchiveRecapModalOpen(true);
    showToast(`📦 ${res.message}`);
  };

  const handleCleanOrphanRecords = () => {
    if (confirm('Bersihkan semua baris absensi yang tidak bertuan / data kosong? Riwayat absensi siswa yang valid tetap aman.')) {
      const res = AttendanceStorage.cleanOrphanAttendanceRecords();
      refreshAllData();
      showToast(`🧹 ${res.message}`);
    }
  };

  const handleAutoHealRecords = () => {
    const res = AttendanceStorage.autoHealAttendanceRecords();
    refreshAllData();
    if (res.healedCount > 0) {
      showToast(`✨ Berhasil mencocokkan & melengkapi ${res.healedCount} data absensi yang sempat kosong!`);
    } else {
      showToast('✅ Semua data absensi sudah lengkap dan sesuai data siswa/guru!');
    }
  };

  const handleDeletePairedRecord = async (rec: PairedDailyAttendance) => {
    const nameLabel = rec.studentName || `Kartu ${rec.rfidUid}`;
    if (confirm(`Apakah Anda yakin ingin menghapus log absensi tanggal ${rec.dateFormatted} untuk "${nameLabel}"?`)) {
      if (rec.recordIds && rec.recordIds.length > 0) {
        const res = await AttendanceStorage.deleteAttendanceRecordByIds(rec.recordIds);
        refreshAllData();
        showToast(`🗑️ ${res.message}`);
      } else {
        const all = AttendanceStorage.getAttendanceRecords();
        const toDelete = all.filter(r => r.dateFormatted === rec.dateFormatted && ((rec.rfidUid && r.rfidUid === rec.rfidUid) || (rec.studentId && r.studentId === rec.studentId)));
        if (toDelete.length > 0) {
          const res = await AttendanceStorage.deleteAttendanceRecordByIds(toDelete.map(r => r.id));
          refreshAllData();
          showToast(`🗑️ ${res.message}`);
        }
      }
    }
  };

  const handleApplySchedulePreset = (preset: 'reguler' | 'jumat' | 'ujian' | 'ramadhan' | 'upacara') => {
    if (preset === 'reguler') {
      setScheduleForm(prev => ({
        ...prev,
        entryStartTime: '06:00',
        entryDeadlineTime: '07:15',
        entryEndTime: '08:30',
        exitStartTime: '14:00',
        exitEndTime: '17:00',
        lateToleranceMinutes: 0
      }));
      showToast('🕒 Preset Jadwal Reguler dimuat! Jangan lupa klik Simpan.');
    } else if (preset === 'jumat') {
      setScheduleForm(prev => ({
        ...prev,
        entryStartTime: '06:00',
        entryDeadlineTime: '07:00',
        entryEndTime: '08:00',
        exitStartTime: '11:30',
        exitEndTime: '16:00',
        lateToleranceMinutes: 0
      }));
      showToast('🕌 Preset Jadwal Hari Jumat dimuat! Jangan lupa klik Simpan.');
    } else if (preset === 'ujian') {
      setScheduleForm(prev => ({
        ...prev,
        entryStartTime: '06:30',
        entryDeadlineTime: '07:30',
        entryEndTime: '09:00',
        exitStartTime: '12:30',
        exitEndTime: '16:00',
        lateToleranceMinutes: 0
      }));
      showToast('📝 Preset Jadwal Pekan Ujian dimuat! Jangan lupa klik Simpan.');
    } else if (preset === 'ramadhan') {
      setScheduleForm(prev => ({
        ...prev,
        entryStartTime: '06:30',
        entryDeadlineTime: '07:30',
        entryEndTime: '08:30',
        exitStartTime: '12:00',
        exitEndTime: '15:30',
        lateToleranceMinutes: 5
      }));
      showToast('🌙 Preset Jadwal Ramadhan dimuat! Jangan lupa klik Simpan.');
    } else if (preset === 'upacara') {
      setScheduleForm(prev => ({
        ...prev,
        entryStartTime: '05:45',
        entryDeadlineTime: '06:45',
        entryEndTime: '07:30',
        exitStartTime: '14:30',
        exitEndTime: '17:00',
        lateToleranceMinutes: 0
      }));
      showToast('🇮🇩 Preset Upacara Bendera dimuat! Jangan lupa klik Simpan.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] max-w-full overflow-x-hidden bg-slate-900 text-slate-100 p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-8">
      
      {/* Header Admin Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-slate-800/80 border border-slate-700/80 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">Panel Super Admin</h1>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] sm:text-xs font-bold rounded-full">
                KONTROL UTAMA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 sm:mt-1">
              Pengelolaan Data Siswa & NISN, Pengaturan Waktu & Jadwal, serta Download Rekap Data Absensi Harian, Mingguan, & Bulanan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          {onOpenKioskMode && (
            <button
              onClick={onOpenKioskMode}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer border border-blue-400/30 shrink-0"
              title="Buka Layar Utama Kiosk Tap RFID Pelajar"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>🖥️ Buka Mode Kiosk</span>
            </button>
          )}

          <button
            onClick={refreshAllData}
            className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-600 shrink-0"
            title="Refresh Data Admin"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ADMIN NAVIGATION: RESPONSIVE DESKTOP & MOBILE WITH PAGINATION & HAMBURGER */}
      {(() => {
        const tabList: { id: typeof activeTab; title: string; subtitle: string; group: string; icon: any; badge?: string | number }[] = [
          { id: 'overview', title: 'Ringkasan', subtitle: 'Statistik & Ringkasan Umum', group: 'Utama', icon: Building2 },
          { id: 'students', title: 'Data Siswa', subtitle: 'Kelola Siswa & NISN', group: 'Data Master', icon: Users, badge: students.length },
          { id: 'teachers', title: 'Data Guru', subtitle: 'Kelola Guru & PTK', group: 'Data Master', icon: UserCheck, badge: teachers.length },
          { id: 'classes', title: 'Data Kelas', subtitle: 'Kelola Rombel & Tingkat', group: 'Data Master', icon: GraduationCap, badge: classes.length },
          { id: 'schedule', title: 'Jadwal & Aturan', subtitle: 'Aturan Jam Masuk, Pulang & PIN Kiosk', group: 'Pengaturan', icon: Clock },
          { id: 'reports', title: 'Rekap Siswa', subtitle: 'Laporan Absensi Siswa', group: 'Laporan', icon: FileSpreadsheet, badge: 'Excel' },
          { id: 'discipline_reports', title: 'Rapor Disiplin', subtitle: 'Rapor Presensi & Skor Siswa', group: 'Laporan', icon: Award, badge: 'Rapor' },
          { id: 'leaderboard', title: 'Urutan & Peringkat', subtitle: 'Data Tercepat, Top Terpagi & Sering Terlambat', group: 'Aktivitas', icon: Sparkles, badge: 'Peringkat' },
          { id: 'teacher_reports', title: 'Rekap Guru', subtitle: 'Laporan Absensi Guru & PTK', group: 'Laporan', icon: UserCheck, badge: 'Excel' },
          { id: 'backup', title: 'Cloud Backup', subtitle: 'Database & Restore Cloud', group: 'Laporan', icon: Database, badge: 'Cloud' },
          { id: 'users', title: 'Kelola Akun', subtitle: 'Manajemen Akun Login & Hak Akses', group: 'Pengaturan', icon: KeyRound, badge: systemUsers.length },
          { id: 'announcements', title: 'Running Text', subtitle: 'Pengumuman Teks Berjalan', group: 'Pengaturan', icon: Megaphone }
        ];

        const currentIndex = tabList.findIndex(t => t.id === activeTab);
        const currentItem = tabList[currentIndex] || tabList[0];

        const goToPrevTab = () => {
          const prevIdx = (currentIndex - 1 + tabList.length) % tabList.length;
          setActiveTab(tabList[prevIdx].id);
          setOpenMenuDropdown(null);
        };

        const goToNextTab = () => {
          const nextIdx = (currentIndex + 1) % tabList.length;
          setActiveTab(tabList[nextIdx].id);
          setOpenMenuDropdown(null);
        };

        return (
          <div className="w-full space-y-3">
            
            {/* MOBILE NAVIGATION BAR (HAMBURGER & PAGINATION) */}
            <div className="md:hidden bg-slate-800/95 border border-slate-700/80 rounded-2xl p-3 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center shrink-0">
                    <currentItem.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black text-white truncate">{currentItem.title}</p>
                      {currentItem.badge !== undefined && (
                        <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono rounded font-bold shrink-0">
                          {currentItem.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{currentItem.subtitle}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileAdminNavOpen(!isMobileAdminNavOpen)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold shrink-0 transition-colors border border-slate-600 cursor-pointer"
                >
                  <Menu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pilih Menu</span>
                </button>
              </div>

              {/* Mobile Pagination Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                <button
                  onClick={goToPrevTab}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-bold border border-slate-700/60 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {currentIndex + 1} / {tabList.length}
                  </span>
                </div>

                <button
                  onClick={goToNextTab}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-bold border border-slate-700/60 cursor-pointer transition-colors"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mobile Drawer / Categorized Menu List */}
              {isMobileAdminNavOpen && (
                <div className="mt-3 pt-3 border-t border-slate-700/80 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Semua Menu Admin</span>
                    <button
                      onClick={() => setIsMobileAdminNavOpen(false)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      ✕ Tutup
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {tabList.map(tab => {
                      const Icon = tab.icon;
                      const isSelected = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsMobileAdminNavOpen(false);
                            setOpenMenuDropdown(null);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-black shadow-md'
                              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-900 border border-slate-700/40 text-xs font-semibold'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs">{tab.title}</p>
                            {tab.badge !== undefined && (
                              <span className={`text-[9px] font-mono ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {tab.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* DESKTOP / TABLET NAVIGATION (CLEAN & CONSOLIDATED WITH DROPDOWNS) */}
            <div className="hidden md:flex flex-wrap lg:flex-nowrap items-center justify-center mx-auto gap-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/80 shadow-md max-w-full w-fit">
              
              {/* 1. Ringkasan & Stats */}
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setOpenMenuDropdown(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Ringkasan</span>
              </button>

              {/* 2. DROPDOWN: KELOLA DATA MASTER (Siswa, Guru & Kelas) */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenMenuDropdown(openMenuDropdown === 'master' ? null : 'master')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'students' || activeTab === 'teachers' || activeTab === 'classes'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Users className="w-4 h-4 text-indigo-300" />
                  <span>
                    {activeTab === 'classes' ? 'Data Kelas' : activeTab === 'teachers' ? 'Data Guru' : activeTab === 'students' ? 'Data Siswa' : 'Data Master'}
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] bg-slate-900/60 text-indigo-300 rounded-md font-mono">
                    {students.length + teachers.length}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenuDropdown === 'master' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                </button>

                {/* Master Data Dropdown Popup Menu */}
                {openMenuDropdown === 'master' && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setOpenMenuDropdown(null)} 
                    />
                    <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                        Pengelolaan Data Master
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('students');
                          setOpenMenuDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeTab === 'students'
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-indigo-400" />
                          <span>Data Siswa & NISN</span>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px] font-mono">
                          {students.length} Siswa
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('teachers');
                          setOpenMenuDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeTab === 'teachers'
                            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <UserCheck className="w-4 h-4 text-purple-400" />
                          <span>Data Guru & PTK</span>
                        </div>
                        <span className="px-2 py-0.5 bg-purple-950/60 text-purple-300 border border-purple-900/60 rounded-md text-[10px] font-mono">
                          {teachers.length} Guru
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('classes');
                          setOpenMenuDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeTab === 'classes'
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <GraduationCap className="w-4 h-4 text-emerald-400" />
                          <span>Master Data Kelas</span>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px] font-mono">
                          {classes.length} Kelas
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 3. Aturan Waktu & Jadwal */}
              <button
                onClick={() => {
                  setActiveTab('schedule');
                  setOpenMenuDropdown(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Jadwal & Aturan</span>
              </button>

              {/* 4. DROPDOWN: REKAP & DATABASE (Laporan & Cloud Backup) */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenMenuDropdown(openMenuDropdown === 'reports_db' ? null : 'reports_db')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'reports' || activeTab === 'discipline_reports' || activeTab === 'teacher_reports' || activeTab === 'backup'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>
                    {activeTab === 'backup' ? 'Backup & Database' : activeTab === 'discipline_reports' ? 'Rapor Disiplin' : activeTab === 'teacher_reports' ? 'Rekap Guru' : activeTab === 'reports' ? 'Rekap Siswa' : 'Rekap & Data'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenuDropdown === 'reports_db' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                </button>

                {/* Reports & Backup Dropdown Popup Menu */}
                {openMenuDropdown === 'reports_db' && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setOpenMenuDropdown(null)} 
                    />
                    <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                        Laporan & Manajemen Data
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('reports');
                          setOpenMenuDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeTab === 'reports'
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          <span>Rekapitulasi Siswa</span>
                        </div>
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded">
                          Excel/PDF
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('discipline_reports');
                          setOpenMenuDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeTab === 'discipline_reports'
                            ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Award className="w-4 h-4 text-amber-400" />
                          <span>Rapor Kedisiplinan Siswa</span>
                        </div>
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded">
                          Rapor/Nilai
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('teacher_reports');
                          setOpenMenuDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeTab === 'teacher_reports'
                            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <UserCheck className="w-4 h-4 text-purple-400" />
                          <span>Rekapitulasi Guru & PTK</span>
                        </div>
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded">
                          Excel/PDF
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('backup');
                          setOpenMenuDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeTab === 'backup'
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Database className="w-4 h-4 text-amber-400" />
                          <span>Backup & Database Cloud</span>
                        </div>
                        <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" /> Cloud
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 5. Urutan Kedatangan */}
              <button
                onClick={() => {
                  setActiveTab('leaderboard');
                  setOpenMenuDropdown(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'leaderboard'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Urutan Datang</span>
                {arrivalRankingToday.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/20 text-amber-300 font-bold rounded-md">
                    {arrivalRankingToday.length}
                  </span>
                )}
              </button>

              {/* 6. Kelola Akun Sistem */}
              <button
                onClick={() => {
                  setActiveTab('users');
                  setOpenMenuDropdown(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>Kelola Akun</span>
                {systemUsers.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold rounded-md">
                    {systemUsers.length}
                  </span>
                )}
              </button>

              {/* 7. Running Text */}
              <button
                onClick={() => {
                  setActiveTab('announcements');
                  setOpenMenuDropdown(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'announcements'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Megaphone className="w-4 h-4" />
                <span>Running Text</span>
              </button>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & STATS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between text-indigo-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Siswa</span>
                <Users className="w-5 h-5" />
              </div>
              <p className="text-3xl font-black text-white">{students.length}</p>
              <p className="text-xs text-slate-400 mt-1">Siswa terdaftar ({classes.length} Kelas)</p>
            </div>

            <div className="bg-slate-800/80 border border-purple-500/30 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between text-purple-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Guru & PTK</span>
                <UserCheck className="w-5 h-5" />
              </div>
              <p className="text-3xl font-black text-purple-300">{teachers.length}</p>
              <p className="text-xs text-slate-400 mt-1">Tenaga pendidik & kependidikan</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between text-emerald-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Jam Masuk</span>
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-emerald-400">{schedule.entryStartTime} - {schedule.entryDeadlineTime}</p>
              <p className="text-xs text-slate-400 mt-1">Batas telat: {schedule.entryDeadlineTime} WIB</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between text-blue-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Cooldown Tap</span>
                <Sliders className="w-5 h-5" />
              </div>
              <p className="text-3xl font-black text-blue-400">
                {schedule.cooldownSeconds ?? schedule.antiSpamCooldownSeconds ?? 60} dtk
              </p>
              <p className="text-xs text-slate-400 mt-1">Pencegahan double absensi ({schedule.cooldownSeconds ?? schedule.antiSpamCooldownSeconds ?? 60} detik)</p>
            </div>

          </div>

          {/* Quick Actions Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Akses Cepat Pengelolaan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={() => setActiveTab('students')}
                className="p-4 bg-slate-900 hover:bg-slate-700/60 border border-slate-700 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <Users className="w-6 h-6 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-extrabold text-white text-xs">Data Siswa & NISN</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Filter, tambah, & bulk import siswa</p>
              </button>

              <button
                onClick={() => setActiveTab('teachers')}
                className="p-4 bg-slate-900 hover:bg-slate-700/60 border border-purple-500/40 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <UserCheck className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-extrabold text-white text-xs">Data Guru & PTK</p>
                <p className="text-[11px] text-slate-400 mt-0.5">NIP, Jabatan, & kartu RFID</p>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className="p-4 bg-slate-900 hover:bg-slate-700/60 border border-emerald-500/40 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <KeyRound className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-extrabold text-white text-xs">Kelola Akun Login</p>
                <p className="text-[11px] text-slate-400 mt-0.5">CRUD akun Admin & Guru Piket</p>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className="p-4 bg-slate-900 hover:bg-slate-700/60 border border-slate-700 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <FileSpreadsheet className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-extrabold text-white text-xs">Rekap Siswa</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Laporan Harian, Mingguan, Bulanan</p>
              </button>

              <button
                onClick={() => setActiveTab('teacher_reports')}
                className="p-4 bg-slate-900 hover:bg-slate-700/60 border border-purple-500/40 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <FileSpreadsheet className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-extrabold text-white text-xs">Rekap Guru & PTK</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tap masuk & pulang Excel/CSV</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KELOLA DATA SISWA (WITH ADVANCED SORT & FILTER) */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-6">
          
          {/* Sub-tab Switcher: Data Master (Siswa <-> Guru <-> Kelas) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-indigo-600 text-white shadow-md"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Data Siswa & NISN ({students.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('teachers')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Data Guru & PTK ({teachers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Master Data Kelas ({classes.length})</span>
            </button>
          </div>

          {/* Action Top Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Kelola Data Siswa & RFID</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Total <strong className="text-indigo-300">{students.length}</strong> siswa terdaftar. Menampilkan <strong className="text-white">{filteredAndSortedStudents.length}</strong> siswa sesuai filter.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedStudentIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteSelected}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer border border-rose-400/30 animate-pulse"
                  title="Hapus massal siswa yang dicentang"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus ({selectedStudentIds.length}) Terpilih</span>
                </button>
              )}

              <button
                onClick={handleClearAllStudents}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-950/60 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30 transition-all cursor-pointer"
                title="Hapus seluruh data siswa jika terjadi kesalahan impor total"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset Total</span>
              </button>

              <button
                onClick={() => setIsMifareGuideOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-all cursor-pointer shadow-sm"
                title="Petunjuk cara daftarkan/hubungkan kartu fisik MIFARE ke data siswa"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Panduan MIFARE</span>
              </button>

              <button
                onClick={() => setIsMifareScannerOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border border-amber-300"
                title="Buka Mode Live Detector / Pengenalan Kartu MIFARE 13.56 MHz"
              >
                <Scan className="w-4 h-4 text-slate-950" />
                <span>Pengenalan MIFARE</span>
              </button>

              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border border-blue-400/30"
                title="Import Massal Data Siswa & Kartu RFID dari CSV/Excel"
              >
                <Database className="w-4 h-4 text-amber-300" />
                <span>Bulk Import & RFID</span>
              </button>

              <button
                onClick={() => {
                  downloadStudentCsvTemplate();
                  showToast('📄 Template CSV Data Siswa & NISN Berhasil Diunduh!');
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-all cursor-pointer shadow-sm"
                title="Download Template Format CSV untuk Import Data Siswa"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Template CSV</span>
              </button>

              <button
                onClick={openAddStudentModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Siswa Baru</span>
              </button>
            </div>
          </div>

          {/* FILTER & SORT BAR FOR STUDENTS */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Filter className="w-4 h-4 text-indigo-400" />
                <span>Filter & Urutkan Data Siswa</span>
              </div>

              {(studentSearch || studentClassFilter !== 'ALL' || studentGenderFilter !== 'ALL' || studentRfidFilter !== 'ALL' || studentSortBy !== 'name_asc') && (
                <button
                  onClick={handleResetStudentFilters}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              
              {/* Search Bar */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama, NISN, kelas, atau RFID UID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Filter Kelas */}
              <div>
                <select
                  value={studentClassFilter}
                  onChange={(e) => setStudentClassFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Semua Kelas</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Filter Gender */}
              <div>
                <select
                  value={studentGenderFilter}
                  onChange={(e) => setStudentGenderFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Semua Gender</option>
                  <option value="L">Laki-Laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              {/* Filter Status RFID */}
              <div>
                <select
                  value={studentRfidFilter}
                  onChange={(e) => setStudentRfidFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Semua Status RFID</option>
                  <option value="HAS_CARD">Sudah Ada Kartu RFID</option>
                  <option value="NO_CARD">Belum Ada Kartu RFID</option>
                </select>
              </div>

            </div>

            {/* SORTING SELECTOR */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-slate-300">Urutkan Siswa:</span>
                <select
                  value={studentSortBy}
                  onChange={(e) => setStudentSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="name_asc">Nama Siswa (A - Z)</option>
                  <option value="name_desc">Nama Siswa (Z - A)</option>
                  <option value="nisn_asc">NISN (Terkecil - Terbesar)</option>
                  <option value="nisn_desc">NISN (Terbesar - Terkecil)</option>
                  <option value="class_asc">Kelas (A - Z)</option>
                  <option value="rfid_assigned_first">Status RFID (Sudah Pasang Dulu)</option>
                  <option value="rfid_unassigned_first">Status RFID (Belum Pasang Dulu)</option>
                </select>
              </div>

              <span className="text-[11px] text-slate-400 font-medium">
                Ditemukan <strong className="text-white">{filteredAndSortedStudents.length}</strong> dari total {students.length} siswa
              </span>
            </div>

          </div>

          {/* Students Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredAndSortedStudents.length > 0 && selectedStudentIds.length === filteredAndSortedStudents.length}
                      onChange={handleToggleSelectAllStudents}
                      className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0 cursor-pointer"
                      title="Pilih semua siswa di tabel"
                    />
                  </th>
                  <th className="py-3.5 px-3 text-center">No</th>
                  <th className="py-3.5 px-4">Nama Siswa</th>
                  <th className="py-3.5 px-4">NISN</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-4">UID Kartu RFID</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 bg-slate-900/40">
                {filteredAndSortedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Tidak ada data siswa yang cocok dengan filter atau pencarian Anda.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedStudents.map((std, idx) => (
                    <tr 
                      key={std.id} 
                      className={`transition-colors ${
                        selectedStudentIds.includes(std.id) ? 'bg-rose-950/30 border-l-2 border-rose-500' : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(std.id)}
                          onChange={() => handleToggleSelectStudent(std.id)}
                          className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                        {idx + 1}
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={std.avatarUrl || (std.gender === 'P' ? "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80")}
                            alt={std.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                          />
                          <div>
                            <p className="font-bold text-white text-sm">{std.name}</p>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {std.gender === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                          {std.nisn || '-'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-200">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-indigo-300 font-bold">
                          {std.class}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {std.rfidUid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg font-mono font-bold text-xs">
                            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                            {std.rfidUid}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 italic">
                            Belum Ada Kartu
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenCardPairing(std)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition-all"
                            title="Scan Kartu RFID Baru untuk Siswa Ini"
                          >
                            Assign Card
                          </button>
                          
                          <button
                            onClick={() => openEditStudentModal(std)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                            title="Edit Data Siswa & NISN"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteStudent(std.id, std.name)}
                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors border border-rose-500/30"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: KELOLA DATA GURU & TENAGA KEPENDIDIKAN (PTK) */}
      {/* ========================================================================= */}
      {activeTab === 'teachers' && (
        <TeacherManagement
          showToast={showToast}
          onNavigateTab={(tab) => {
            if (tab === 'students') setActiveTab('students');
            else if (tab === 'classes') setActiveTab('classes');
            else if (tab === 'teachers') setActiveTab('teachers');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB: KELOLA MASTER DATA KELAS (TAMBAH & HAPUS BULK KELAS) */}
      {/* ========================================================================= */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          
          {/* Sub-tab Switcher: Data Master (Siswa <-> Guru <-> Kelas) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Data Siswa & NISN ({students.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('teachers')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Data Guru & PTK ({teachers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-indigo-600 text-white shadow-md"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Master Data Kelas ({classes.length})</span>
            </button>
          </div>

          {/* Header & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl font-black text-white">Kelola Master Data Kelas</h2>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-full">
                  {classes.length} KELAS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tambah kelas baru (satuan / massal), ubah nama kelas, dan hapus kelas secara bulk / massal dengan cepat dan aman.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedClassNames.length > 0 && (
                <button
                  onClick={() => setIsBulkDeleteClassModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer border border-rose-400/40 animate-pulse"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus ({selectedClassNames.length}) Kelas Terpilih</span>
                </button>
              )}

              <button
                onClick={() => {
                  setAddClassMode('batch');
                  setIsAddClassModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-500/30 transition-all cursor-pointer shadow-sm"
                title="Tambah Banyak Kelas Sekaligus"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>+ Tambah Massal</span>
              </button>

              <button
                onClick={() => {
                  setAddClassMode('single');
                  setIsAddClassModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah 1 Kelas</span>
              </button>
            </div>
          </div>

          {/* Class Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Kelas Terdaftar</span>
              <p className="text-2xl font-black text-white mt-1">{classes.length}</p>
              <span className="text-[10px] text-indigo-400 font-medium">Aktif dalam database</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kelas Terpilih (Bulk)</span>
              <p className="text-2xl font-black text-amber-400 mt-1">{selectedClassNames.length}</p>
              <span className="text-[10px] text-slate-400 font-medium">Siap untuk aksi massal</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Siswa Terdaftar</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{students.length}</p>
              <span className="text-[10px] text-slate-400 font-medium">Di seluruh kelas</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rata-rata Siswa/Kelas</span>
              <p className="text-2xl font-black text-blue-400 mt-1">
                {classes.length > 0 ? (students.length / classes.length).toFixed(1) : 0}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">Siswa per rombel</span>
            </div>
          </div>

          {/* Search & Filter & Bulk Bar */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Filter className="w-4 h-4 text-indigo-400" />
                <span>Filter & Urutkan Daftar Kelas</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleApplyPreset('SMK')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  title="Muat preset kelas jurusan SMK (AKL, OTKP, BDP, RPL, TKJ)"
                >
                  <Sparkles className="w-3.5 h-3.5" /> + Muat Preset SMK (AKL/OTKP/TKJ/RPL)
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => handleApplyPreset('SMA')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  title="Muat preset kelas jurusan SMA (MIPA 1-3, IPS 1-3)"
                >
                  <School className="w-3.5 h-3.5" /> + Muat Preset SMA (MIPA/IPS)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                  placeholder="Cari nama kelas..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filter Tingkat */}
              <div>
                <select
                  value={classGradeFilter}
                  onChange={(e) => setClassGradeFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="ALL">Semua Tingkat Kelas</option>
                  <option value="X">Kelas X (Sepuluh)</option>
                  <option value="XI">Kelas XI (Sebelas)</option>
                  <option value="XII">Kelas XII (Dua Belas)</option>
                  <option value="OTHER">Lainnya / Format Khusus</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={classSortBy}
                  onChange={(e) => setClassSortBy(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="name_asc">Urutan Nama (A - Z)</option>
                  <option value="name_desc">Urutan Nama (Z - A)</option>
                  <option value="students_desc">Siswa Terbanyak</option>
                  <option value="students_asc">Siswa Tersedikit</option>
                </select>
              </div>

              {/* Select All / Deselect Action */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filteredAndSortedClasses.length > 0 && selectedClassNames.length === filteredAndSortedClasses.length}
                    onChange={(e) => handleSelectAllClasses(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Pilih Semua ({filteredAndSortedClasses.length})</span>
                </label>

                {selectedClassNames.length > 0 && (
                  <button
                    onClick={() => setSelectedClassNames([])}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Batal ({selectedClassNames.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Class List Table / Grid */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl overflow-hidden shadow-xl">
            {filteredAndSortedClasses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <GraduationCap className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold">Tidak ada kelas yang sesuai dengan filter pencarian.</p>
                <button
                  onClick={() => {
                    setAddClassMode('single');
                    setIsAddClassModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                >
                  + Tambah Kelas Sekarang
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={selectedClassNames.length === filteredAndSortedClasses.length && filteredAndSortedClasses.length > 0}
                          onChange={(e) => handleSelectAllClasses(e.target.checked)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-3.5 px-4">Nama Kelas</th>
                      <th className="py-3.5 px-4">Tingkat</th>
                      <th className="py-3.5 px-4">Jumlah Siswa Terdaftar</th>
                      <th className="py-3.5 px-4 text-center">Status Data</th>
                      <th className="py-3.5 px-4 text-right">Aksi Pengelolaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredAndSortedClasses.map((cls) => {
                      const count = classStudentCounts[cls] || 0;
                      const isSelected = selectedClassNames.includes(cls);

                      let gradeBadge = 'UMUM';
                      let gradeColor = 'bg-slate-700 text-slate-300';
                      if (cls.startsWith('X ') || cls.startsWith('X-') || cls.startsWith('10')) {
                        gradeBadge = 'KELAS X';
                        gradeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                      } else if (cls.startsWith('XI ') || cls.startsWith('XI-') || cls.startsWith('11')) {
                        gradeBadge = 'KELAS XI';
                        gradeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
                      } else if (cls.startsWith('XII ') || cls.startsWith('XII-') || cls.startsWith('12')) {
                        gradeBadge = 'KELAS XII';
                        gradeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                      }

                      return (
                        <tr
                          key={cls}
                          className={`transition-colors ${isSelected ? 'bg-indigo-950/40' : 'hover:bg-slate-700/30'}`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectClass(cls)}
                              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400 font-extrabold shrink-0">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-extrabold text-white text-sm">{cls}</p>
                                <p className="text-[10px] text-slate-400">Rombongan Belajar</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${gradeColor}`}>
                              {gradeBadge}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-extrabold text-sm ${count > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {count} Siswa
                              </span>
                              {count > 0 && (
                                <button
                                  onClick={() => {
                                    setStudentClassFilter(cls);
                                    setActiveTab('students');
                                  }}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                                >
                                  (Lihat Siswa →)
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            {count > 0 ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                                ✓ {count} Siswa Terdaftar
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-slate-700/50 text-slate-400 rounded-full text-[10px] font-medium">
                                Kelas Kosong
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingClassModal({ oldName: cls, newName: cls })}
                                className="p-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg transition-colors border border-indigo-500/30 cursor-pointer"
                                title="Ubah Nama Kelas"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleSingleDeleteClass(cls)}
                                className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors border border-rose-500/30 cursor-pointer"
                                title="Hapus Kelas Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SCHEDULE & RULES CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span>Pengaturan Waktu & Jam Operasional Kiosk</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Ubah jam masuk, batas waktu keterlambatan, jam pulang, dan jam operasional kiosk sesuai kebijakan sekolah.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sinkron Realtime ke Kiosk</span>
            </div>
          </div>

          {/* QUICK PRESET BUTTONS */}
          <div className="bg-slate-900/60 border border-slate-700/60 p-4 rounded-2xl space-y-2.5 w-full">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
              ⚡ Muat Preset Cepat Jam Sekolah
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 w-full">
              <button
                type="button"
                onClick={() => handleApplySchedulePreset('reguler')}
                className="px-3.5 py-3 bg-slate-800 hover:bg-indigo-950/60 hover:border-indigo-500/50 border border-slate-700 rounded-xl text-xs text-slate-200 hover:text-indigo-300 text-left transition-all cursor-pointer font-medium"
              >
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>🏫</span>
                  <span>Reguler Pagi</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Masuk: 06:00 (Telat: 07:15)</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplySchedulePreset('jumat')}
                className="px-3.5 py-3 bg-slate-800 hover:bg-emerald-950/60 hover:border-emerald-500/50 border border-slate-700 rounded-xl text-xs text-slate-200 hover:text-emerald-300 text-left transition-all cursor-pointer font-medium"
              >
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>🕌</span>
                  <span>Hari Jumat</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Masuk: 06:00 (Pulang: 11:30)</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplySchedulePreset('ujian')}
                className="px-3.5 py-3 bg-slate-800 hover:bg-amber-950/60 hover:border-amber-500/50 border border-slate-700 rounded-xl text-xs text-slate-200 hover:text-amber-300 text-left transition-all cursor-pointer font-medium"
              >
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>📝</span>
                  <span>Pekan Ujian</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Masuk: 06:30 (Telat: 07:30)</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplySchedulePreset('ramadhan')}
                className="px-3.5 py-3 bg-slate-800 hover:bg-cyan-950/60 hover:border-cyan-500/50 border border-slate-700 rounded-xl text-xs text-slate-200 hover:text-cyan-300 text-left transition-all cursor-pointer font-medium"
              >
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>🌙</span>
                  <span>Ramadhan</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Masuk: 06:30 (Pulang: 12:00)</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplySchedulePreset('upacara')}
                className="px-3.5 py-3 bg-slate-800 hover:bg-rose-950/60 hover:border-rose-500/50 border border-slate-700 rounded-xl text-xs text-slate-200 hover:text-rose-300 text-left transition-all cursor-pointer font-medium"
              >
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>🇮🇩</span>
                  <span>Upacara Senin</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Masuk: 05:45 (Telat: 06:45)</div>
              </button>
            </div>
          </div>

          {/* CONTROL BOX: BUKA GERBANG MANUAL (TESTING & DEBUG DILUAR JADWAL) */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg w-full">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  scheduleForm.manualGateOverride 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {scheduleForm.manualGateOverride ? '🔓 OVERRIDE MANUAL AKTIF' : '🔒 OTOMATIS SESUAI JADWAL'}
                </span>
                <h4 className="text-sm font-bold text-white">
                  Buka Gerbang Manual (Testing & Debugging di Luar Jam)
                </h4>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Aktifkan opsi ini jika Admin ingin melakukan uji coba tap kartu RFID, tes audio/TTS sambutan, dan cek bug di luar jam operasional sekolah (melewati batas jam 17.00 WIB) tanpa terhalang layar standby.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleManualGateOverride}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-md ${
                scheduleForm.manualGateOverride
                  ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <span>{scheduleForm.manualGateOverride ? '🔒 Matikan Override (Kunci Normal)' : '🔓 Buka Gerbang Manual Sekarang'}</span>
            </button>
          </div>

          <form onSubmit={handleSaveSchedule} className="space-y-6 w-full">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Instansi / Sekolah
                </label>
                <input
                  type="text"
                  value={scheduleForm.schoolName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, schoolName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alamat Sekolah
                </label>
                <input
                  type="text"
                  value={scheduleForm.schoolAddress}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, schoolAddress: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

            </div>

            {/* JAM OPERASIONAL LENGKAP DENGAN PENJELASAN */}
            <div className="space-y-3 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Konfigurasi Jam Sesi & Toleransi Keterlambatan
                </span>
                <span className="text-[11px] text-indigo-300 font-medium">
                  Format 24 Jam (WIB)
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 p-4 bg-slate-900/60 rounded-2xl border border-slate-700/60 w-full">
                
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-emerald-400">
                        1. Buka Masuk
                      </label>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">START</span>
                    </div>
                    <input
                      type="time"
                      value={scheduleForm.entryStartTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, entryStartTime: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      required
                    />
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['05:00', '05:30', '06:00', '06:30'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, entryStartTime: preset })}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            scheduleForm.entryStartTime === preset
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-emerald-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5 block leading-relaxed">
                    Kiosk mulai baca kartu kedatangan.
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-amber-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-amber-400">
                        2. Batas Telat
                      </label>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">DEADLINE</span>
                    </div>
                    <input
                      type="time"
                      value={scheduleForm.entryDeadlineTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, entryDeadlineTime: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono font-bold"
                      required
                    />
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['06:45', '07:00', '07:15', '07:30'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, entryDeadlineTime: preset })}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            scheduleForm.entryDeadlineTime === preset
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5 block leading-relaxed">
                    Lewat jam ini dicatat <strong className="text-amber-400">TERLAMBAT</strong>.
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-indigo-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-indigo-400">
                        3. Toleransi (M)
                      </label>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">DISPENSASI</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={scheduleForm.lateToleranceMinutes || 0}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, lateToleranceMinutes: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                    />
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0, 5, 10, 15].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, lateToleranceMinutes: preset })}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            (scheduleForm.lateToleranceMinutes || 0) === preset
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-indigo-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5 block leading-relaxed">
                    Jeda toleransi sebelum status telat.
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-purple-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-purple-400">
                        4. Tutup Masuk
                      </label>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold">CUT OFF</span>
                    </div>
                    <input
                      type="time"
                      value={scheduleForm.entryEndTime || '08:30'}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, entryEndTime: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-purple-300 focus:outline-none focus:border-purple-500 font-mono font-bold"
                      required
                    />
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['08:00', '08:30', '09:00'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, entryEndTime: preset })}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            (scheduleForm.entryEndTime || '08:30') === preset
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-purple-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5 block leading-relaxed">
                    Sesi kedatangan ditutup masuk KBM.
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-blue-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-blue-400">
                        5. Buka Pulang
                      </label>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">CHECK OUT</span>
                    </div>
                    <input
                      type="time"
                      value={scheduleForm.exitStartTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, exitStartTime: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-blue-300 focus:outline-none focus:border-blue-500 font-mono font-bold"
                      required
                    />
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['13:30', '14:00', '15:00', '15:30'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, exitStartTime: preset })}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            scheduleForm.exitStartTime === preset
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-blue-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5 block leading-relaxed">
                    Beralih otomatis ke sesi <strong className="text-blue-400">PULANG</strong>.
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-rose-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-rose-400">
                        6. Tutup Kiosk
                      </label>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono font-bold">CLOSED</span>
                    </div>
                    <input
                      type="time"
                      value={scheduleForm.exitEndTime || '17:00'}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, exitEndTime: e.target.value })}
                      className="w-full bg-slate-900 border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-rose-200 focus:outline-none focus:border-rose-500 font-mono font-bold"
                      required
                    />
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['16:30', '17:00', '17:30', '18:00'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, exitEndTime: preset })}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            (scheduleForm.exitEndTime || '17:00') === preset
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5 block leading-relaxed">
                    Kiosk standby / istirahat malam.
                  </span>
                </div>

              </div>
            </div>

            {/* INTERACTIVE TIMELINE & SIMULATOR */}
            <div className="bg-slate-950/60 border border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Simulator Uji Jam Tap Kartu Interaktif</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Coba Masukkan Jam Tap:</span>
                  <input
                    type="time"
                    value={simulationTapTime}
                    onChange={(e) => setSimulationTapTime(e.target.value)}
                    className="bg-slate-900 border border-indigo-500/50 text-indigo-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Simulation Live Result */}
              {(() => {
                const [tapH, tapM] = simulationTapTime.split(':').map(Number);
                const tapMinutes = tapH * 60 + tapM;

                const [startH, startM] = (scheduleForm.entryStartTime || '06:00').split(':').map(Number);
                const startMinutes = startH * 60 + startM;

                const [deadH, deadM] = (scheduleForm.entryDeadlineTime || '07:15').split(':').map(Number);
                const deadMinutes = deadH * 60 + deadM;

                const tolerance = scheduleForm.lateToleranceMinutes || 0;
                const effectiveDeadline = deadMinutes + tolerance;

                const [exitH, exitM] = (scheduleForm.exitStartTime || '14:00').split(':').map(Number);
                const exitMinutes = exitH * 60 + exitM;

                const [exitEndH, exitEndM] = (scheduleForm.exitEndTime || '17:00').split(':').map(Number);
                const exitEndMinutes = exitEndH * 60 + exitEndM;

                let simStatus = 'TEPAT_WAKTU';
                let simBadge = '🟢 HADIR TEPAT WAKTU';
                let simBoxClass = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300';
                let simDesc = `Siswa tap pada jam ${simulationTapTime} WIB sebelum batas ${scheduleForm.entryDeadlineTime} WIB${tolerance > 0 ? ` (+ toleransi ${tolerance}m)` : ''}.`;

                if (tapMinutes < startMinutes) {
                  simStatus = 'EARLY';
                  simBadge = '⏳ SEBELUM JAM MASUK DIBUKA';
                  simBoxClass = 'bg-slate-800/60 border-slate-600 text-slate-300';
                  simDesc = `Kiosk belum mulai membaca kartu kedatangan (baru dibuka pukul ${scheduleForm.entryStartTime} WIB).`;
                } else if (tapMinutes <= effectiveDeadline) {
                  simStatus = 'TEPAT_WAKTU';
                  simBadge = '🟢 HADIR TEPAT WAKTU';
                  simBoxClass = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300';
                  simDesc = `Siswa tercatat Tepat Waktu.`;
                } else if (tapMinutes < exitMinutes) {
                  const lateMins = tapMinutes - deadMinutes;
                  simStatus = 'TERLAMBAT';
                  simBadge = `⚠️ HADIR TERLAMBAT (+${lateMins} MENIT)`;
                  simBoxClass = 'bg-amber-950/40 border-amber-500/40 text-amber-300';
                  simDesc = `Siswa tap melebihi batas jam ${scheduleForm.entryDeadlineTime} WIB dan tercatat Terlambat ${lateMins} menit.`;
                } else if (tapMinutes <= exitEndMinutes) {
                  simStatus = 'PULANG';
                  simBadge = '🔵 SESI ABSEN PULANG';
                  simBoxClass = 'bg-blue-950/40 border-blue-500/40 text-blue-300';
                  simDesc = `Siswa tap di sesi kepulangan dan status kepulangan langsung tercatat.`;
                } else {
                  simStatus = 'CLOSED';
                  simBadge = '⛔ KIOSK SUDAH TUTUP';
                  simBoxClass = 'bg-rose-950/40 border-rose-500/40 text-rose-300';
                  simDesc = `Di luar jam operasional (setelah ${scheduleForm.exitEndTime || '17:00'} WIB).`;
                }

                return (
                  <div className={`p-3.5 rounded-xl border ${simBoxClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full`}>
                    <div>
                      <div className="font-extrabold text-xs tracking-wider">{simBadge}</div>
                      <div className="text-[11px] opacity-90 mt-0.5">{simDesc}</div>
                    </div>
                    <div className="font-mono text-xs font-black shrink-0 px-3 py-1 bg-black/40 rounded-lg">
                      Jam Simulasi: {simulationTapTime} WIB
                    </div>
                  </div>
                );
              })()}

              {/* Visual Flow summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1 w-full">
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl">
                  <div className="text-emerald-400 font-bold">🟢 Sesi Masuk (Tepat Waktu)</div>
                  <div className="text-white font-mono text-xs mt-0.5">{scheduleForm.entryStartTime} - {scheduleForm.entryDeadlineTime} WIB</div>
                  <div className="text-[10px] text-slate-400 mt-1">Dicatat Hadir Tepat Waktu.</div>
                </div>

                <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-xl">
                  <div className="text-amber-400 font-bold">⚠️ Sesi Terlambat</div>
                  <div className="text-white font-mono text-xs mt-0.5">{scheduleForm.entryDeadlineTime} - {scheduleForm.exitStartTime} WIB</div>
                  <div className="text-[10px] text-slate-400 mt-1">Dicatat Hadir Terlambat (+x menit).</div>
                </div>

                <div className="bg-blue-950/30 border border-blue-500/30 p-2.5 rounded-xl">
                  <div className="text-blue-400 font-bold">🔵 Sesi Pulang</div>
                  <div className="text-white font-mono text-xs mt-0.5">{scheduleForm.exitStartTime} - {scheduleForm.exitEndTime || '17:00'} WIB</div>
                  <div className="text-[10px] text-slate-400 mt-1">Mencatat waktu kepulangan siswa & guru.</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Batas Cooldown Anti Double-Tap (Detik)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={scheduleForm.cooldownSeconds ?? scheduleForm.antiSpamCooldownSeconds ?? 60}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setScheduleForm({
                    ...scheduleForm,
                    cooldownSeconds: val,
                    antiSpamCooldownSeconds: val
                  });
                }}
                className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                required
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Mencegah tap kartu ganda oleh orang yang sama dalam rentang detik tertentu ({scheduleForm.cooldownSeconds ?? 60} detik).
              </span>
            </div>

            {/* KIOSK LOCK SCREEN & SECURITY PIN CONFIGURATION */}
            <div className="p-4 sm:p-5 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-white">Pengaturan Kiosk Lock Screen & PIN</h4>
                    <p className="text-[11px] text-slate-400">Proteksi layar Kiosk dari interaksi murid tanpa pengawasan</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-lg border border-amber-500/30 font-mono">
                  PIN AKTIF: {AttendanceStorage.getKioskPin()}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Saat mode Kiosk terkunci, tombol sensitif (ganti gerbang, buka dashboard, login admin, dan status database) akan terlindungi dan mewajibkan petugas memasukkan PIN terlebih dahulu.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 pt-1">
                <div className="relative w-full sm:w-60">
                  <KeyRound className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={8}
                    value={kioskPinInput}
                    onChange={(e) => setKioskPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN 4-6 Angka"
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!kioskPinInput || kioskPinInput.length < 4) {
                      alert('PIN Keamanan Kiosk minimal harus 4 digit angka!');
                      return;
                    }
                    AttendanceStorage.setKioskPin(kioskPinInput);
                    showToast(`🔐 PIN Kiosk Lock Screen berhasil diperbarui menjadi "${kioskPinInput}"!`);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update PIN Kiosk</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    AttendanceStorage.setKioskPin('1234');
                    setKioskPinInput('1234');
                    showToast('🔄 PIN Kiosk dikembalikan ke default: 1234');
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Reset Default (1234)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Aturan Jam Operasional</span>
              </button>
            </div>

          </form>

          {/* DANGER ZONE: RESET ABSENSI HARI INI */}
          <div className="mt-8 pt-6 border-t border-slate-700/80 w-full space-y-4">
            
            {/* Snapshot Archive Action Box */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Arsip & Snapshot Otomatis Absensi</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Sistem secara otomatis mengarsipkan data kemarin ke database saat pergantian hari (00:00 WIB). Anda juga dapat menyimpan snapshot rekap kehadiran hari ini secara manual kapan saja.
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualArchiveToday}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-lg flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                <span>Simpan Snapshot Hari Ini</span>
              </button>
            </div>

            {/* Reset Today Action Box */}
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
              <div>
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Zona Reset: Bersihkan Data Absensi Hari Ini</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Gunakan tombol ini jika terdapat kesalahan penginputan kartu atau ingin mengulang pencatatan absensi hari ini ({new Date().toISOString().split('T')[0]}) dari awal. Data snapshot sebelum reset akan otomatis diarsipkan ke database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsResetTodayModalOpen(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-lg flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Absensi Hari Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REKAP & DOWNLOAD REPORT (PER HARI, PER MINGGU, PER BULAN + SORT/FILTER) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-6">
          
          {/* Sub-tab Switcher: Laporan & Database (Rekap Siswa <-> Rapor Disiplin <-> Rekap Guru <-> Backup Cloud) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-indigo-600 text-white shadow-md"
            >
              <Users className="w-3.5 h-3.5 text-indigo-300" />
              <span>Rekapitulasi Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('discipline_reports')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Rapor Kedisiplinan Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('teacher_reports')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Rekapitulasi Guru & PTK</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Backup & Database Cloud</span>
            </button>
          </div>

          {/* Header & Export Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Rekap & Download Laporan Absensi</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Pilih periode pelaporan (Harian, Mingguan, Bulanan, atau Custom) dan filter data untuk diunduh.
              </p>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border border-emerald-400/30"
                title={`Unduh file Excel ${periodTitleLabel}`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition-all cursor-pointer"
                title={`Unduh file CSV ${periodTitleLabel}`}
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>

              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border border-indigo-400/30"
                title={`Cetak format resmi ${periodTitleLabel}`}
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>

          {/* PERIODE SELECTOR TABS (HARIAN, MINGGUAN, BULANAN, CUSTOM) */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-700/80 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">Pilih Mode Periode Laporan:</span>
              </div>

              {/* Mode Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setReportPeriodMode('daily')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    reportPeriodMode === 'daily'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Per Hari (Harian)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportPeriodMode('weekly')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    reportPeriodMode === 'weekly'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Per Minggu (Mingguan)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportPeriodMode('monthly')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    reportPeriodMode === 'monthly'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Per Bulan (Bulanan)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportPeriodMode('custom')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    reportPeriodMode === 'custom'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Rentang Kustom</span>
                </button>
              </div>
            </div>

            {/* DYNAMIC DATE CONTROLS ACCORDING TO SELECTED MODE */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* DAILY CONTROLS */}
              {reportPeriodMode === 'daily' && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-300">Pilih Tanggal:</label>
                    <input
                      type="date"
                      value={reportDailyDate}
                      onChange={(e) => setReportDailyDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReportDailyDate(new Date().toISOString().split('T')[0])}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300 border border-slate-700"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yest = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        setReportDailyDate(yest);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700"
                    >
                      Kemarin
                    </button>
                  </div>
                </div>
              )}

              {/* WEEKLY CONTROLS */}
              {reportPeriodMode === 'weekly' && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-300">Pilih Minggu:</label>
                    <input
                      type="date"
                      value={reportWeeklyRefDate}
                      onChange={(e) => setReportWeeklyRefDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReportWeeklyRefDate(new Date().toISOString().split('T')[0])}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300 border border-slate-700"
                    >
                      Minggu Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lastWk = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        setReportWeeklyRefDate(lastWk);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700"
                    >
                      Minggu Lalu
                    </button>
                  </div>
                </div>
              )}

              {/* MONTHLY CONTROLS */}
              {reportPeriodMode === 'monthly' && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-300">Bulan & Tahun:</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={idx} value={idx + 1}>{m}</option>
                      ))}
                    </select>

                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setReportMonth(now.getMonth() + 1);
                        setReportYear(now.getFullYear());
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300 border border-slate-700"
                    >
                      Bulan Ini
                    </button>
                  </div>
                </div>
              )}

              {/* CUSTOM CONTROLS */}
              {reportPeriodMode === 'custom' && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-300">Dari:</label>
                    <input
                      type="date"
                      value={reportCustomStartDate}
                      onChange={(e) => setReportCustomStartDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-300">Sampai:</label>
                    <input
                      type="date"
                      value={reportCustomEndDate}
                      onChange={(e) => setReportCustomEndDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {/* ACTIVE PERIOD BADGE */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Periode Aktif:</span>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-black">
                  {periodTitleLabel}
                </span>
              </div>

            </div>

          </div>

          {/* FILTER & SORT BAR FOR REPORTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 p-4 bg-slate-900/80 rounded-2xl border border-slate-700/80">
            
            {/* Search */}
            <div className="md:col-span-2 relative">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cari Data Siswa</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                <input
                  type="text"
                  placeholder="Cari nama, NISN, atau kelas..."
                  value={reportSearchTerm}
                  onChange={(e) => setReportSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Kelas</label>
              <select
                value={reportClassFilter}
                onChange={(e) => setReportClassFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Kelas</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Titik Pintu</label>
              <select
                value={reportGateFilter}
                onChange={(e) => setReportGateFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Titik</option>
                <option value="pintu_depan">Pintu Depan</option>
                <option value="pintu_belakang">Pintu Belakang</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Tipe Tap</label>
              <select
                value={reportTypeFilter}
                onChange={(e) => setReportTypeFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Tipe (Masuk & Pulang)</option>
                <option value="MASUK">Absen Masuk Pagi</option>
                <option value="PULANG">Absen Pulang Sore</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Status</label>
              <select
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="TEPAT_WAKTU">Tepat Waktu</option>
                <option value="TERLAMBAT">Terlambat</option>
                <option value="PULANG">Pulang</option>
              </select>
            </div>

          </div>

          {/* REPORT STATS & SORTING HEADER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Rekam</span>
              <p className="text-xl font-black text-white">{reportStats.total}</p>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-2xl">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Tepat Waktu</span>
              <p className="text-xl font-black text-emerald-300">{reportStats.onTime}</p>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-2xl">
              <span className="text-[10px] text-amber-400 uppercase font-bold">Terlambat</span>
              <p className="text-xl font-black text-amber-300">{reportStats.late}</p>
            </div>

            <div className="bg-blue-950/30 border border-blue-500/30 p-3 rounded-2xl">
              <span className="text-[10px] text-blue-400 uppercase font-bold">Absen Pulang</span>
              <p className="text-xl font-black text-blue-300">{reportStats.checkouts}</p>
            </div>
          </div>

          {/* SORTING SELECTOR FOR REPORTS & DATA HYGIENE ACTIONS */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">Urutkan Laporan:</span>
              <select
                value={reportSortBy}
                onChange={(e) => setReportSortBy(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="time_desc">Waktu Absen (Terbaru ke Terlama)</option>
                <option value="time_asc">Waktu Absen (Terlama ke Terbaru)</option>
                <option value="name_asc">Nama Siswa (A - Z)</option>
                <option value="name_desc">Nama Siswa (Z - A)</option>
                <option value="nisn_asc">NISN (Terkecil - Terbesar)</option>
                <option value="nisn_desc">NISN (Terbesar - Terkecil)</option>
                <option value="late_desc">Keterlambatan (Paling Telat Dulu)</option>
                <option value="class_asc">Kelas (A - Z)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAutoHealRecords}
                className="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Cocokkan kembali data siswa jika nama sempat hilang atau kosong"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Perbaiki & Sinkron Data</span>
              </button>

              <button
                type="button"
                onClick={handleCleanOrphanRecords}
                className="px-2.5 py-1 bg-amber-950/50 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Hapus baris absensi yang tidak bertuan / data siswa kosong"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Data Kosong</span>
              </button>

              <span className="text-[11px] text-slate-400 font-medium ml-2">
                Total: <strong className="text-white">{filteredAndSortedReports.length}</strong> baris
              </span>
            </div>
          </div>

          {/* Results Table Preview (Masuk & Pulang Bersandingan per Siswa per Hari) */}
          <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3.5 px-4 text-center">No</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">NISN</th>
                  <th className="py-3.5 px-4">Nama Siswa</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-4">Tap Masuk</th>
                  <th className="py-3.5 px-4">Tap Pulang</th>
                  <th className="py-3.5 px-4">Status Kehadiran</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 bg-slate-900/40">
                {filteredAndSortedReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      Tidak ada data absensi untuk periode atau filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedReports.map((rec, idx) => (
                    <tr key={rec.id} className={`hover:bg-slate-800/60 transition-colors ${rec.isOrphan ? 'bg-amber-950/10' : ''}`}>
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-300">{rec.dateFormatted}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-200">{rec.nisn || '-'}</td>
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={rec.studentName ? 'text-white' : 'text-slate-400 italic'}>
                            {rec.studentName || '(Data Siswa Kosong / Terhapus)'}
                          </span>
                          {rec.isOrphan && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              UID: {rec.rfidUid}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{rec.studentClass || '-'}</td>
                      
                      {/* Tap Masuk Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              {rec.entryTime !== '-' ? `${rec.entryTime} WIB` : '-'}
                            </span>
                            {rec.entryStatus !== 'BELUM_HADIR' && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                rec.entryStatus === 'TEPAT_WAKTU' 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : rec.entryStatus === 'TERLAMBAT'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-700 text-slate-300'
                              }`}>
                                {rec.entryStatus === 'TEPAT_WAKTU' ? 'TEPAT' : rec.entryStatus === 'TERLAMBAT' ? `+${rec.lateMinutes || 0}m` : rec.entryStatus}
                              </span>
                            )}
                          </div>
                          {rec.entryGate && rec.entryGate !== '-' && (
                            <span className="text-[10px] text-slate-400 block">{rec.entryGate}</span>
                          )}
                        </div>
                      </td>

                      {/* Tap Pulang Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {rec.exitTime !== 'Belum Pulang' ? (
                              <span className="font-mono font-bold text-blue-400 text-xs">
                                {rec.exitTime} WIB
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                Belum Pulang
                              </span>
                            )}
                          </div>
                          {rec.exitGate && rec.exitGate !== '-' && (
                            <span className="text-[10px] text-slate-400 block">{rec.exitGate}</span>
                          )}
                        </div>
                      </td>

                      {/* Status Kehadiran Column */}
                      <td className="py-3.5 px-4 font-semibold whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                          rec.entryStatus === 'TEPAT_WAKTU'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : rec.entryStatus === 'TERLAMBAT'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            rec.entryStatus === 'TEPAT_WAKTU' ? 'bg-emerald-400' : rec.entryStatus === 'TERLAMBAT' ? 'bg-amber-400' : 'bg-blue-400'
                          }`} />
                          {rec.summaryStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px] max-w-xs truncate">{rec.notes || '-'}</td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeletePairedRecord(rec)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Hapus baris absensi ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: RAPOR KEDISIPLINAN & SKOR PRESENSI SISWA */}
      {/* ========================================================================= */}
      {activeTab === 'discipline_reports' && (
        <StudentDisciplineReport
          students={students}
          records={attendanceRecords}
          classes={classes}
          schedule={schedule}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB: REKAP & LAPORAN PRESENSI GURU & PTK */}
      {/* ========================================================================= */}
      {activeTab === 'teacher_reports' && (
        <TeacherReports
          schedule={schedule}
          showToast={showToast}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LEADERBOARD & PERINGKAT KEDATANGAN HUB */}
      {/* (Data Tercepat Hari Ini, Top Terpagi Siswa, & Top Terlambat Siswa) */}
      {/* ========================================================================= */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          
          {/* Sub-Navigation Switcher for Leaderboard Hub */}
          <div className="bg-slate-800/90 border border-slate-700/80 p-2 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700 text-xs font-bold w-full sm:w-auto">
              
              {/* Sub-Tab 1: Urutan Kedatangan Hari Ini */}
              <button
                type="button"
                onClick={() => setLeaderboardSubTab('today_arrival')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  leaderboardSubTab === 'today_arrival'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Urutan Hari Ini (Tercepat)</span>
                {arrivalRankingToday.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-200 text-[10px] rounded font-mono font-bold">
                    {arrivalRankingToday.length}
                  </span>
                )}
              </button>

              {/* Sub-Tab 2: Top Siswa Terpagi & Rajin */}
              <button
                type="button"
                onClick={() => setLeaderboardSubTab('early_rank')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  leaderboardSubTab === 'early_rank'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-emerald-300" />
                <span>Top Siswa Terpagi</span>
              </button>

              {/* Sub-Tab 3: Top Siswa Sering Terlambat */}
              <button
                type="button"
                onClick={() => setLeaderboardSubTab('late_rank')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  leaderboardSubTab === 'late_rank'
                    ? 'bg-rose-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                <span>Top Siswa Terlambat</span>
              </button>
            </div>
          </div>

          {/* SUB-VIEW 1: URUTAN LIVE KEDATANGAN HARI INI */}
          {leaderboardSubTab === 'today_arrival' && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <span>⚡ Data Lengkap Urutan Kedatangan Hari Ini</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Diurutkan berdasarkan urutan waktu pertama kali tap kartu RFID saat presensi masuk hari ini ({new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}).
                  </p>
                </div>

                {/* Filter Toggle: Siswa / Guru / Semua */}
                <div className="flex items-center bg-slate-900/80 p-1 rounded-2xl border border-slate-700 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setLeaderboardFilter('STUDENT')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      leaderboardFilter === 'STUDENT'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎓 Urutan Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardFilter('TEACHER')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      leaderboardFilter === 'TEACHER'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👨‍🏫 Urutan Guru
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      leaderboardFilter === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({arrivalRankingToday.length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-700">
                    <tr>
                      <th className="py-3.5 px-4 text-center">Urutan</th>
                      <th className="py-3.5 px-4">Waktu Tap</th>
                      <th className="py-3.5 px-4">Kategori</th>
                      <th className="py-3.5 px-4">Nama Lengkap</th>
                      <th className="py-3.5 px-4">Kelas / Jabatan</th>
                      <th className="py-3.5 px-4">Titik Pintu</th>
                      <th className="py-3.5 px-4">Status Kedatangan</th>
                      <th className="py-3.5 px-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 bg-slate-900/40">
                    {arrivalRankingToday.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          Belum ada catatan presensi masuk hari ini untuk filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      arrivalRankingToday.map((item) => {
                        const isTeacher = item.record.userType === 'TEACHER' || !!item.record.teacherId;
                        const displayName = isTeacher ? (item.record.teacherName || 'Guru') : (item.record.studentName || 'Siswa');
                        const subLabel = isTeacher ? (item.record.teacherPosition || 'Guru / PTK') : (item.record.studentClass || 'Siswa');
                        const idLabel = isTeacher ? `NIP: ${item.record.nip || '-'}` : `NISN: ${item.record.nisn || '-'}`;

                        return (
                          <tr key={item.record.id} className={`hover:bg-slate-800/60 transition-colors ${
                            item.rank === 1 ? 'bg-amber-500/10' : item.rank <= 3 ? 'bg-slate-800/30' : ''
                          }`}>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                                item.rank === 1 ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300' :
                                item.rank === 2 ? 'bg-slate-300 text-slate-950 font-bold' :
                                item.rank === 3 ? 'bg-amber-700 text-white font-bold' :
                                'bg-slate-800 text-slate-300'
                              }`}>
                                #{item.rank}
                              </span>
                            </td>

                            <td className="py-3 px-4 font-mono font-extrabold text-amber-300 text-sm whitespace-nowrap">
                              {item.record.timeFormatted} WIB
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                isTeacher 
                                  ? 'bg-purple-900/60 text-purple-200 border border-purple-700'
                                  : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                              }`}>
                                {isTeacher ? 'GURU / PTK' : 'SISWA'}
                              </span>
                            </td>

                            <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                              {displayName}
                              <span className="block text-[10px] text-slate-500 font-mono">{idLabel}</span>
                            </td>

                            <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                              {subLabel}
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-200">
                                {item.record.gateName}
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                item.rank === 1
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
                                  : !item.isLate
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {item.rank === 1 && `🥇 ${isTeacher ? 'GURU' : 'SISWA'} #1 TERCEPAT`}
                                {item.rank > 1 && !item.isLate && '🟢 TEPAT WAKTU'}
                                {item.isLate && `⚠️ TERLAMBAT (+${item.record.lateMinutes}m)`}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {item.record.notes || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: TOP SISWA TERPAGI & DISIPLIN (PER MINGGU / BULAN / SEMESTER / ALL-TIME) */}
          {leaderboardSubTab === 'early_rank' && (
            <StudentEarlyLeaderboard schedule={schedule} />
          )}

          {/* SUB-VIEW 3: TOP SISWA PALING SERING TERLAMBAT (PER MINGGU / BULAN / SEMESTER / ALL-TIME) */}
          {leaderboardSubTab === 'late_rank' && (
            <StudentLateLeaderboard schedule={schedule} />
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: RUNNING TEXT & ANNOUNCEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'announcements' && (
        <div className="space-y-6 w-full">
          
          {/* Header Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl">
                  <Megaphone className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-bold text-white">
                  Kelola Running Text & Pesan Hari Raya Monitor
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
                Atur pengumuman siaran langsung pada monitor kiosk Pintu Depan & Pintu Belakang. Mendukung posisi <strong>Tengah (Center)</strong>, scrolling marquee berkecepatan dinamis, tema warna khusus hari raya, dan variasi ucapan instan.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-2 rounded-2xl text-indigo-300 text-xs font-bold shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Sinkronisasi Otomatis 2 Arah</span>
            </div>
          </div>

          {/* 1. REALTIME MONITOR BANNER PREVIEW (SIMULASI LIVE KIOSK) */}
          {(() => {
            const currentTheme = scheduleForm.marqueeTheme || 'gold';
            const themeConfig = MARQUEE_THEMES_CONFIG[currentTheme] || MARQUEE_THEMES_CONFIG.gold;
            const displayMode = scheduleForm.marqueeDisplayMode || 'marquee_scroll';
            const isCentered = displayMode === 'center_pulse' || displayMode === 'center_static';
            const isPulsing = displayMode === 'center_pulse';
            
            const speedClass = scheduleForm.marqueeSpeed === 'slow'
              ? 'animate-marquee-slow'
              : scheduleForm.marqueeSpeed === 'fast'
              ? 'animate-marquee-fast'
              : scheduleForm.marqueeSpeed === 'ultra_fast'
              ? 'animate-marquee-ultra-fast'
              : 'animate-marquee-normal';

            const fontSizeClass = scheduleForm.marqueeFontSize === 'sm'
              ? 'text-xs sm:text-sm font-bold'
              : scheduleForm.marqueeFontSize === 'lg'
              ? 'text-base sm:text-lg font-black'
              : scheduleForm.marqueeFontSize === 'xl'
              ? 'text-lg sm:text-xl font-black'
              : 'text-sm sm:text-base font-extrabold';

            const badgeIcon = scheduleForm.marqueeBadgeIcon || (marqueePreviewSession === 'exit' ? '👋' : '📢');
            const badgeText = scheduleForm.marqueeBadgeText || (marqueePreviewSession === 'exit' ? 'SESI PULANG' : 'PENGUMUMAN');
            
            const mainText = marqueePreviewSession === 'exit'
              ? (scheduleForm.announcementTextExit || scheduleForm.announcementText || 'Selamat Pulang Siswa-Siswi & Guru SMK EKONOMIKA DEPOK! Hati-hati di perjalanan pulang.')
              : (scheduleForm.announcementTextEntry || scheduleForm.announcementText || 'Selamat Datang di SMK EKONOMIKA DEPOK! Harap selalu melakukan Tap Kartu RFID.');

            return (
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Pratinjau Live Banner Monitor Kiosk:</span>
                    </span>

                    {/* Preview Session Switcher */}
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-700 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setMarqueePreviewSession('entry')}
                        className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          marqueePreviewSession === 'entry'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ☀️ Sesi Masuk
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarqueePreviewSession('exit')}
                        className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          marqueePreviewSession === 'exit'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🌙 Sesi Pulang
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="px-2 py-0.5 bg-slate-800 rounded-md border border-slate-700">Tema: <strong className="text-white capitalize">{themeConfig.name}</strong></span>
                    <span className="px-2 py-0.5 bg-slate-800 rounded-md border border-slate-700">Mode: <strong className="text-white">{isCentered ? (isPulsing ? 'Center Pulse' : 'Center Static') : 'Marquee Scroll'}</strong></span>
                  </div>
                </div>

                {/* Banner Simulator Canvas */}
                <div className={`${themeConfig.bgClass} border-2 ${themeConfig.borderClass} ${themeConfig.accentGlowClass} rounded-2xl h-14 sm:h-16 flex items-center px-4 overflow-hidden shadow-lg w-full relative transition-all duration-300`}>
                  
                  {/* Badge */}
                  <div className={`flex items-center gap-1.5 ${themeConfig.badgeBgClass} px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 shadow-md z-10 mr-3 select-none`}>
                    <span className="text-sm leading-none">{badgeIcon}</span>
                    <span className={`uppercase tracking-wider text-[11px] sm:text-xs ${themeConfig.badgeTextClass} font-black`}>
                      {badgeText}
                    </span>
                  </div>

                  {/* Mode Content */}
                  {isCentered ? (
                    <div className="flex-1 flex items-center justify-center text-center overflow-hidden px-2">
                      <div className={`flex items-center justify-center gap-2 max-w-full ${isPulsing ? 'animate-pulse-glow' : ''}`}>
                        <span className={`${fontSizeClass} ${themeConfig.textClass} uppercase tracking-wide truncate block`}>
                          {mainText}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden whitespace-nowrap flex-1 flex items-center">
                      <div className={`${speedClass} gap-12 flex items-center`}>
                        <span className={`shrink-0 ${fontSizeClass} ${themeConfig.textClass} uppercase tracking-wide`}>
                          {mainText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        </span>
                        <span className={`shrink-0 ${fontSizeClass} ${themeConfig.textClass} uppercase tracking-wide`}>
                          {mainText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Live Ping Indicator */}
                  <div className="hidden sm:flex items-center gap-1.5 ml-3 shrink-0 z-10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">LIVE</span>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* 2. KOLEKSI VARIASI KATA-KATA HARI RAYA & HARI SPESIAL (1-CLICK PRESET) */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🎉</span>
                  <span>Koleksi Kata-Kata Hari Raya & Acara Spesial Sekolah</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pilih salah satu ucapan di bawah ini untuk langsung memuat teks, ikon, mode posisi, dan tema warna yang serasi.
                </p>
              </div>

              {/* Search Presets */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari hari raya / momen..."
                  value={holidaySearchQuery}
                  onChange={(e) => setHolidaySearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {HOLIDAY_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedHolidayCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedHolidayCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-900/70 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Preset Cards Grid */}
            {(() => {
              const filteredPresets = HOLIDAY_GREETINGS_PRESETS.filter(p => {
                const matchesCat = selectedHolidayCategory === 'all' || p.category === selectedHolidayCategory;
                const query = holidaySearchQuery.toLowerCase().trim();
                const matchesSearch = !query || 
                  p.title.toLowerCase().includes(query) ||
                  p.mainText.toLowerCase().includes(query) ||
                  p.categoryLabel.toLowerCase().includes(query) ||
                  p.description.toLowerCase().includes(query);
                return matchesCat && matchesSearch;
              });

              if (filteredPresets.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-700/60 text-slate-400 text-xs">
                    Tidak ditemukan ucapan untuk kata kunci "{holidaySearchQuery}".
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar w-full">
                  {filteredPresets.map(preset => {
                    const theme = MARQUEE_THEMES_CONFIG[preset.theme] || MARQUEE_THEMES_CONFIG.gold;
                    const isCenterMode = preset.displayMode === 'center_pulse' || preset.displayMode === 'center_static';
                    
                    return (
                      <div
                        key={preset.id}
                        className="bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 hover:border-indigo-500/60 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all group shadow-sm hover:shadow-md min-w-0 overflow-hidden"
                      >
                        <div className="space-y-2 min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-white text-xs min-w-0 flex-1">
                              <span className="text-base shrink-0">{preset.badgeIcon}</span>
                              <span className="truncate">{preset.title}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 whitespace-nowrap ${theme.badgeBgClass} ${theme.badgeTextClass}`}>
                              {theme.shortName || theme.name}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 break-words">
                            "{preset.mainText}"
                          </p>

                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
                            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 truncate max-w-full">
                              {isCenterMode ? '🎯 Teks Tengah' : '↔️ Marquee Meluncur'}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 truncate max-w-full">
                              Badge: {preset.badgeText}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyHolidayPreset(preset)}
                          className="w-full py-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-xs rounded-xl border border-indigo-500/40 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm mt-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>Terapkan Ucapan Ini</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* 3. PENGATURAN KUSTOMISASI DETAIL (STYLE, POSISI, SPEED & FONT) */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Kustomisasi Gaya Tampilan, Posisi & Format Running Text</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sesuaikan posisi teks (tengah / berjalan), palet tema warna, kecepatan gerak, dan badge info.
              </p>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-6">
              
              {/* OPSI 1: MODE TAMPILAN POSISI */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  1. Mode Posisi & Animasi Teks
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  <button
                    type="button"
                    onClick={() => setScheduleForm({ ...scheduleForm, marqueeDisplayMode: 'center_pulse' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      (scheduleForm.marqueeDisplayMode || 'marquee_scroll') === 'center_pulse'
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                        : 'bg-slate-900/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
                      <AlignCenter className="w-4 h-4" />
                      <span>Tengah Bercahaya (Pulse Glow)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Teks berada persis di <strong>tengah (Center)</strong> dengan efek nafas bercahaya lembut. Sangat pas untuk ucapan hari raya khidmat.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleForm({ ...scheduleForm, marqueeDisplayMode: 'center_static' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      scheduleForm.marqueeDisplayMode === 'center_static'
                        ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                      <AlignCenter className="w-4 h-4" />
                      <span>Tengah Statis (Center Clean)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Teks di posisi <strong>tengah</strong> tanpa animasi bergulir. Tampilan bersih, mantap, dan mudah dibaca dari kejauhan.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleForm({ ...scheduleForm, marqueeDisplayMode: 'marquee_scroll' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      (scheduleForm.marqueeDisplayMode || 'marquee_scroll') === 'marquee_scroll'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-900/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                      <AlignLeft className="w-4 h-4" />
                      <span>Marquee Meluncur (Scrolling)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Teks bergerak meluncur tanpa henti dari kanan ke kiri. Ideal untuk pengumuman panjang sekolah & tata tertib.
                    </p>
                  </button>

                </div>
              </div>

              {/* OPSI 2: PILIHAN TEMA WARNA (6 TEMA EKSKLUSIF) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  <span>2. Pilihan Palet Tema Warna Banner</span>
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {(Object.keys(MARQUEE_THEMES_CONFIG) as Array<keyof typeof MARQUEE_THEMES_CONFIG>).map(themeKey => {
                    const theme = MARQUEE_THEMES_CONFIG[themeKey];
                    const isSelected = (scheduleForm.marqueeTheme || 'gold') === themeKey;

                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => setScheduleForm({ ...scheduleForm, marqueeTheme: themeKey })}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-22 ${
                          isSelected
                            ? 'ring-2 ring-indigo-400 border-white shadow-lg bg-slate-900'
                            : 'border-slate-700/70 bg-slate-900/70 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white capitalize">{theme.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        
                        {/* Mini Color Strip */}
                        <div className={`h-4 w-full rounded-md ${theme.bgClass} border ${theme.borderClass} flex items-center px-1.5`}>
                          <span className={`w-2 h-2 rounded-full ${theme.badgeBgClass}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OPSI 3: KECEPATAN MARQUEE & UKURAN HURUF */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Kecepatan */}
                <div className="bg-slate-900/70 border border-slate-700/70 p-4 rounded-2xl space-y-2">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Kecepatan Animasi Marquee</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'slow', label: 'Lambat (38s)', icon: '🐢' },
                      { id: 'normal', label: 'Standar (24s)', icon: '🚶' },
                      { id: 'fast', label: 'Cepat (16s)', icon: '🏃' },
                      { id: 'ultra_fast', label: 'Kilat (10s)', icon: '⚡' }
                    ].map(spd => (
                      <button
                        key={spd.id}
                        type="button"
                        onClick={() => setScheduleForm({ ...scheduleForm, marqueeSpeed: spd.id as any })}
                        className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all cursor-pointer ${
                          (scheduleForm.marqueeSpeed || 'normal') === spd.id
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <div className="text-sm">{spd.icon}</div>
                        <div className="text-[10px] mt-0.5">{spd.label}</div>
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Hanya berlaku saat mode Marquee Meluncur aktif.
                  </span>
                </div>

                {/* Ukuran Font */}
                <div className="bg-slate-900/70 border border-slate-700/70 p-4 rounded-2xl space-y-2">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ukuran Huruf Teks Utama</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'sm', label: 'Sedang (SM)' },
                      { id: 'base', label: 'Standar (MD)' },
                      { id: 'lg', label: 'Besar (LG)' },
                      { id: 'xl', label: 'Ekstra (XL)' }
                    ].map(fnt => (
                      <button
                        key={fnt.id}
                        type="button"
                        onClick={() => setScheduleForm({ ...scheduleForm, marqueeFontSize: fnt.id as any })}
                        className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all cursor-pointer ${
                          (scheduleForm.marqueeFontSize || 'lg') === fnt.id
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <div className="text-[10px] font-bold">{fnt.label}</div>
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Pilih ukuran huruf agar proporsional dengan panjang kalimat Anda.
                  </span>
                </div>

              </div>

              {/* OPSI 4: BADGE ICON & BADGE TEXT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Badge Icon */}
                <div className="bg-slate-900/70 border border-slate-700/70 p-4 rounded-2xl space-y-2.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Pilih Ikon Label (Badge Icon)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {['📢', '🌙', '🕌', '🇮🇩', '📝', '🎓', '🏆', '🎖️', '⚡', '🎉', '🎄', '🏮', '⏰', '🌿', '👔', 'ℹ️', '⭐', '✨'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setScheduleForm({ ...scheduleForm, marqueeBadgeIcon: emoji })}
                        className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                          (scheduleForm.marqueeBadgeIcon || '📢') === emoji
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 scale-110'
                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Badge Text */}
                <div className="bg-slate-900/70 border border-slate-700/70 p-4 rounded-2xl space-y-2.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Teks Label Badge
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.marqueeBadgeText || 'PENGUMUMAN'}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, marqueeBadgeText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold uppercase"
                    placeholder="Contoh: PENGUMUMAN, HARI RAYA..."
                  />
                  <div className="flex flex-wrap gap-1">
                    {['PENGUMUMAN', 'INFO TERKINI', 'HARI RAYA', 'HUT RI', 'UJIAN', 'DISIPLIN 5S'].map(quickBadge => (
                      <button
                        key={quickBadge}
                        type="button"
                        onClick={() => setScheduleForm({ ...scheduleForm, marqueeBadgeText: quickBadge })}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 font-bold"
                      >
                        {quickBadge}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* OPSI 5: EDIT ISI TEKS BERJALAN SESI MASUK & SESI PULANG */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                      5. Isi Kalimat Running Text (Sesi Masuk & Sesi Pulang)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Tentukan pesan yang tampil di layar saat jam kedatangan pagi vs saat jam kepulangan siang/sore.
                    </p>
                  </div>

                  {/* Switcher Edit Tab */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setMarqueeActiveEditTab('entry')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        marqueeActiveEditTab === 'entry'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>☀️ Sesi Masuk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarqueeActiveEditTab('exit')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        marqueeActiveEditTab === 'exit'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>🌙 Sesi Pulang</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarqueeActiveEditTab('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        marqueeActiveEditTab === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>📢 Umum / Cadangan</span>
                    </button>
                  </div>
                </div>

                {/* 1. Teks Sesi Masuk */}
                {(marqueeActiveEditTab === 'entry' || marqueeActiveEditTab === 'all') && (
                  <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <span>☀️ Teks Berjalan Sesi Masuk (Pagi)</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, announcementTextEntry: (scheduleForm.announcementTextEntry || scheduleForm.announcementText || '').toUpperCase() })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] text-emerald-300 font-bold cursor-pointer"
                        >
                          HURUF BESAR
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, announcementTextEntry: `${scheduleForm.announcementTextEntry || scheduleForm.announcementText || ''} • ` })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] text-amber-300 font-bold cursor-pointer"
                        >
                          + Titik (•)
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, announcementTextEntry: `✨ ${scheduleForm.announcementTextEntry || scheduleForm.announcementText || ''} ✨` })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] text-indigo-300 font-bold cursor-pointer"
                        >
                          + Bintang (✨)
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={scheduleForm.announcementTextEntry ?? scheduleForm.announcementText}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, announcementTextEntry: e.target.value })}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-sans shadow-inner"
                      placeholder="Tuliskan ucapan selamat pagi dan instruksi tap kartu saat siswa/guru datang..."
                      required
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Panjang Teks Masuk: <strong>{(scheduleForm.announcementTextEntry ?? scheduleForm.announcementText)?.length || 0}</strong> karakter</span>
                      <span className="text-emerald-400 font-semibold">Tampil pada jam {scheduleForm.entryStartTime} - {scheduleForm.exitStartTime} WIB</span>
                    </div>
                  </div>
                )}

                {/* 2. Teks Sesi Pulang */}
                {(marqueeActiveEditTab === 'exit' || marqueeActiveEditTab === 'all') && (
                  <div className="bg-blue-950/20 border border-blue-500/30 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                        <span>🌙 Teks Berjalan Sesi Pulang (Siang / Sore)</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, announcementTextExit: (scheduleForm.announcementTextExit || scheduleForm.announcementText || '').toUpperCase() })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] text-blue-300 font-bold cursor-pointer"
                        >
                          HURUF BESAR
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, announcementTextExit: `${scheduleForm.announcementTextExit || scheduleForm.announcementText || ''} • ` })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] text-amber-300 font-bold cursor-pointer"
                        >
                          + Titik (•)
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, announcementTextExit: `👋 ${scheduleForm.announcementTextExit || scheduleForm.announcementText || ''} 👋` })}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] text-indigo-300 font-bold cursor-pointer"
                        >
                          + Lambaian (👋)
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={scheduleForm.announcementTextExit ?? scheduleForm.announcementText}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, announcementTextExit: e.target.value })}
                      className="w-full bg-slate-900 border border-blue-500/40 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-400 font-sans shadow-inner"
                      placeholder="Tuliskan ucapan selamat jalan / hati-hati di perjalanan saat kepulangan..."
                      required
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Panjang Teks Pulang: <strong>{(scheduleForm.announcementTextExit ?? scheduleForm.announcementText)?.length || 0}</strong> karakter</span>
                      <span className="text-blue-400 font-semibold">Tampil pada jam {scheduleForm.exitStartTime} - {scheduleForm.exitEndTime || '17:00'} WIB</span>
                    </div>
                  </div>
                )}

                {/* 3. Teks Cadangan / Fallback Umum */}
                {marqueeActiveEditTab === 'all' && (
                  <div className="bg-slate-900/60 border border-slate-700/80 p-4 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span>📢 Teks Pengumuman Cadangan (Fallback General)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={scheduleForm.announcementText}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, announcementText: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans shadow-inner"
                      placeholder="Teks umum default jika teks sesi masuk atau pulang kosong..."
                    />
                  </div>
                )}

              </div>

              {/* SAVE BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan & Siarkan Realtime Ke Semua Layar Monitor</span>
                </button>
              </div>

            </form>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: BACKUP & DATABASE CLOUD (MULTI-DEVICE FIRESTORE PERSISTENCE) */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          
          {/* Sub-tab Switcher: Laporan & Database (Rekap Siswa <-> Rapor Disiplin <-> Rekap Guru <-> Backup Cloud) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Users className="w-3.5 h-3.5 text-indigo-300" />
              <span>Rekapitulasi Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('discipline_reports')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Rapor Kedisiplinan Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('teacher_reports')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Rekapitulasi Guru & PTK</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-indigo-600 text-white shadow-md"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Backup & Database Cloud</span>
            </button>
          </div>

          {/* Cloud Database Status Card */}
          <div className="bg-slate-800/80 border border-emerald-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">Database Cloud Real-Time (Firestore)</h3>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      AKTIF & TERHUBUNG
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Data tidak lagi hanya tersimpan di browser lokal. Seluruh perangkat dapat membaca dan menulis data secara bersamaan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={refreshAllData}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkronisasi Ulang</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Akses Multi-Perangkat</span>
                <strong className="text-emerald-300 font-bold block mt-0.5">Laptop, Tablet, HP & Kiosk</strong>
                <p className="text-[10px] text-slate-500 mt-1">Data sinkron realtime saat kartu di-tap</p>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Penyimpanan Terpusat</span>
                <strong className="text-indigo-300 font-bold block mt-0.5">{students.length} Siswa • {classes.length} Kelas</strong>
                <p className="text-[10px] text-slate-500 mt-1">Tersimpan aman di Google Cloud Firestore</p>
              </div>
              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Offline Resilience</span>
                <strong className="text-blue-300 font-bold block mt-0.5">Cache Lokal Otomatis</strong>
                <p className="text-[10px] text-slate-500 mt-1">Kiosk tetap bisa tap jika koneksi internet terputus</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Download Backup Section */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Cadangkan Database (Backup JSON)</h4>
                    <p className="text-[11px] text-slate-400">Unduh seluruh snapshot database ke komputer/laptop</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Fitur ini akan menghasilkan berkas cadangan terenkripsi berformat <code className="text-indigo-300 font-mono">.json</code> yang berisi seluruh data siswa, NISN, UID kartu RFID, daftar kelas, jadwal sekolah, dan seluruh riwayat absensi.
                </p>

                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ringkasan Data yang Akan Dicadangkan:</span>
                  <div className="grid grid-cols-3 gap-2 font-mono pt-1">
                    <div className="bg-slate-950 p-2 rounded-xl text-center border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Siswa</span>
                      <strong className="text-sm text-indigo-400">{students.length}</strong>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl text-center border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Kelas</span>
                      <strong className="text-sm text-emerald-400">{classes.length}</strong>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl text-center border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Log Absen</span>
                      <strong className="text-sm text-amber-400">{attendanceRecords.length}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  AttendanceStorage.downloadBackupFile();
                  showToast('✅ Berkas cadangan database berhasil diunduh!');
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Cadangan Database (.JSON)</span>
              </button>
            </div>

            {/* Restore Database Section */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Pulihkan Database (Restore JSON)</h4>
                    <p className="text-[11px] text-slate-400">Unggah berkas cadangan untuk memulihkan seluruh data</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Pilih file cadangan <code className="text-amber-300 font-mono">.json</code> yang sebelumnya pernah Anda unduh. Sistem akan memvalidasi struktur data dan memperbarui database Cloud serta perangkat lokal.
                </p>

                {/* Upload File Input */}
                <div className="p-4 bg-slate-900 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl text-center space-y-2 transition-colors">
                  <input
                    type="file"
                    id="restore-file-input"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (loadEvt) => {
                        try {
                          const parsed = JSON.parse(loadEvt.target?.result as string);
                          if (!parsed || !parsed.data || !Array.isArray(parsed.data.students)) {
                            alert('Format file cadangan tidak valid!');
                            return;
                          }
                          setRestorePreview(parsed);
                        } catch (err) {
                          alert('Gagal membaca file JSON: Format rusak!');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                  <label
                    htmlFor="restore-file-input"
                    className="flex flex-col items-center justify-center cursor-pointer py-1"
                  >
                    <Upload className="w-7 h-7 text-slate-400 mb-1.5" />
                    <span className="text-xs font-bold text-white">Pilih File Cadangan (.JSON)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">atau seret file ke area ini</span>
                  </label>
                </div>

                {/* Preview Box if file selected */}
                {restorePreview && (
                  <div className="p-3.5 bg-indigo-950/60 border border-indigo-500/40 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-indigo-300">
                      <span className="font-bold uppercase text-[10px]">Ringkasan File Cadangan:</span>
                      <button
                        onClick={() => setRestorePreview(null)}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        Batal
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-1">
                      <p>🏫 <strong>Sekolah:</strong> {restorePreview.schoolName || restorePreview.data?.schedule?.schoolName || '-'}</p>
                      <p>📅 <strong>Waktu Ekspor:</strong> {new Date(restorePreview.exportDate).toLocaleString('id-ID')}</p>
                      <p>📊 <strong>Isi Data:</strong> {restorePreview.data?.students?.length || 0} Siswa, {restorePreview.data?.classes?.length || 0} Kelas, {restorePreview.data?.attendanceRecords?.length || 0} Log Absensi</p>
                    </div>
                  </div>
                )}
              </div>

              {restorePreview ? (
                <button
                  disabled={isRestoring}
                  onClick={async () => {
                    if (!confirm(`Konfirmasi: Pulihkan database sekarang? Seluruh data (${restorePreview.data?.students?.length || 0} siswa) akan dimuat ke Cloud Firestore.`)) {
                      return;
                    }
                    setIsRestoring(true);
                    const res = await AttendanceStorage.restoreBackupData(restorePreview);
                    setIsRestoring(false);
                    if (res.success) {
                      setRestorePreview(null);
                      refreshAllData();
                      showToast(`✅ ${res.message}`);
                    } else {
                      alert(res.message);
                    }
                  }}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>{isRestoring ? 'Memulihkan Data ke Cloud...' : 'Konfirmasi & Pulihkan Database'}</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3 bg-slate-800 text-slate-500 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Pilih File Terlebih Dahulu</span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: KELOLA AKUN PENGGUNA SISTEM & HAK AKSES (CRUD SYSTEM USERS) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <UserManagement
          showToast={showToast}
          currentUsername={currentUser?.username}
        />
      )}

      {/* ========================================================================= */}
      {/* STUDENT ADD/EDIT MODAL (NISN RESTORED, NIS & PARENT PHONE REMOVED) */}
      {/* ========================================================================= */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {editingStudent ? 'Edit Data Siswa & NISN' : 'Tambah Siswa Baru'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Ahmad Rizky Pratama"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">NISN</label>
                  <input
                    type="text"
                    value={studentForm.nisn}
                    onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 0068492011"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Kelas *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAddClassMode('single');
                        setIsAddClassModalOpen(true);
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                    >
                      + Tambah Kelas Baru
                    </button>
                  </div>
                  <select
                    value={studentForm.class}
                    onChange={(e) => setStudentForm({ ...studentForm, class: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  >
                    {uniqueClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Jenis Kelamin</label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as 'L' | 'P' })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">RFID Tag UID *</label>
                  <input
                    type="text"
                    value={studentForm.rfidUid}
                    onChange={(e) => setStudentForm({ ...studentForm, rfidUid: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 0008451293 atau A34F221C"
                    required
                  />
                </div>
              </div>

              {/* FOTO PROFIL SECTION WITH FILE UPLOAD & PREVIEW */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-700/80 space-y-3">
                <label className="block text-xs font-semibold text-slate-300">Foto Profil Siswa</label>
                
                <div className="flex items-center gap-4">
                  {/* Photo Preview */}
                  <div className="relative group shrink-0">
                    <img
                      src={studentForm.avatarUrl || (studentForm.gender === 'P' ? "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80")}
                      alt="Preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md bg-slate-900"
                    />
                    {studentForm.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setStudentForm({ ...studentForm, avatarUrl: '' })}
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
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all">
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
                                setStudentForm(prev => ({ ...prev, avatarUrl: compressedBase64 }));
                                showToast('📸 Foto siswa berhasil diunggah & siap disimpan ke database!');
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
                        value={studentForm.avatarUrl}
                        onChange={(e) => setStudentForm({ ...studentForm, avatarUrl: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
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
                    onClick={() => setStudentForm({ ...studentForm, avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' })}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
                  >
                    👦 Siswa L
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentForm({ ...studentForm, avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' })}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
                  >
                    👧 Siswi P
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentForm({ ...studentForm, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' })}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
                  >
                    👦 Siswa 2
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Simpan Siswa
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH KELAS (SATUAN / MASSAL) */}
      {/* ========================================================================= */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Tambah Data Kelas Baru</h3>
                  <p className="text-[11px] text-slate-400">Pilih metode input satuan atau sekaligus banyak (massal)</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAddClassMode('single')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  addClassMode === 'single'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + Tambah 1 Kelas
              </button>
              <button
                type="button"
                onClick={() => setAddClassMode('batch')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  addClassMode === 'batch'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + Tambah Banyak (Massal)
              </button>
            </div>

            {addClassMode === 'single' ? (
              <form onSubmit={handleAddSingleClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Kelas *
                  </label>
                  <input
                    type="text"
                    value={singleClassName}
                    onChange={(e) => setSingleClassName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                    placeholder="Contoh: X RPL 1, XI MIPA 2, XII OTKP 3"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Format disarankan: [Tingkat] [Jurusan] [Nomor], contoh: <span className="text-indigo-400 font-mono">X RPL 1</span>
                  </p>
                </div>

                {/* Quick chip suggestions */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">Contoh format cepat:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['X RPL 1', 'XI TKJ 1', 'XII OTKP 1', 'X MIPA 1', 'XI IPS 2'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setSingleClassName(chip)}
                        className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-mono cursor-pointer transition-colors"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddClassModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    Simpan Kelas
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddBatchClasses} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Daftar Nama Kelas (Pisahkan dengan Baris Baru atau Koma) *
                  </label>
                  <textarea
                    rows={6}
                    value={batchClassInput}
                    onChange={(e) => setBatchClassInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                    placeholder={`X RPL 1\nX RPL 2\nXI TKJ 1\nXI TKJ 2\nXII AKL 1\nXII AKL 2`}
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Anda dapat menyalin daftar nama kelas langsung dari Excel, Google Sheets, atau notepad.
                  </p>
                </div>

                {/* Preset Fast Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">Template Cepat:</span>
                  <button
                    type="button"
                    onClick={() => setBatchClassInput(`X RPL 1\nX RPL 2\nX TKJ 1\nX TKJ 2\nXI RPL 1\nXI RPL 2\nXI TKJ 1\nXI TKJ 2\nXII RPL 1\nXII RPL 2\nXII TKJ 1\nXII TKJ 2`)}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold"
                  >
                    Template SMK (RPL/TKJ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchClassInput(`X MIPA 1\nX MIPA 2\nX IPS 1\nX IPS 2\nXI MIPA 1\nXI MIPA 2\nXI IPS 1\nXI IPS 2\nXII MIPA 1\nXII MIPA 2\nXII IPS 1\nXII IPS 2`)}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold"
                  >
                    Template SMA (MIPA/IPS)
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddClassModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    Tambah Semua Kelas
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK DELETE KELAS */}
      {/* ========================================================================= */}
      {isBulkDeleteClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Konfirmasi Hapus Massal Kelas</h3>
                <p className="text-xs text-slate-400">Tindakan ini akan menghapus {selectedClassNames.length} kelas terpilih</p>
              </div>
            </div>

            {/* List of classes to be deleted */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 max-h-40 overflow-y-auto space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Daftar Kelas yang akan dihapus:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedClassNames.map((cls) => {
                  const studentCount = classStudentCounts[cls] || 0;
                  return (
                    <span
                      key={cls}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5"
                    >
                      <span>{cls}</span>
                      {studentCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px]">
                          {studentCount} siswa
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Warning if there are students in the classes */}
            {(() => {
              const totalAffectedStudents = selectedClassNames.reduce((acc, cls) => acc + (classStudentCounts[cls] || 0), 0);
              return (
                <div className="space-y-3">
                  {totalAffectedStudents > 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-2">
                      <p className="font-bold text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Terdapat total {totalAffectedStudents} siswa di dalam kelas-kelas ini!</span>
                      </p>
                      <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={deleteClassWithStudents}
                          onChange={(e) => setDeleteClassWithStudents(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                        />
                        <span>
                          <strong>Hapus juga seluruh data siswa</strong> di kelas tersebut dari database. (Jika tidak dicentang, data siswa tetap ada namun tanpa kelas).
                        </span>
                      </label>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Seluruh kelas yang dipilih kosong (0 siswa), aman untuk dihapus.
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsBulkDeleteClassModalOpen(false);
                  setDeleteClassWithStudents(false);
                }}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDeleteClasses}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                Ya, Hapus ({selectedClassNames.length}) Kelas Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UBAH / RENAME NAMA KELAS */}
      {/* ========================================================================= */}
      {editingClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Ubah Nama Kelas</h3>
                  <p className="text-[11px] text-slate-400">Ubah nama kelas "{editingClassModal.oldName}"</p>
                </div>
              </div>
              <button
                onClick={() => setEditingClassModal(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Kelas Baru *
                </label>
                <input
                  type="text"
                  value={editingClassModal.newName}
                  onChange={(e) => setEditingClassModal({ ...editingClassModal, newName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  💡 Seluruh siswa dan data absensi yang saat ini berada di kelas <span className="text-indigo-300 font-bold">{editingClassModal.oldName}</span> akan otomatis ter-update ke nama kelas baru ini.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClassModal(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI RESET ABSENSI HARI INI */}
      {/* ========================================================================= */}
      {isResetTodayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                  <RotateCcw className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Reset Absensi Hari Ini</h3>
                  <p className="text-[11px] text-rose-300/80">Konfirmasi Pembersihan Log Hari Ini</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetTodayModalOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-rose-950/30 rounded-2xl border border-rose-500/30 text-xs text-slate-300 space-y-2">
              <p className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                Tindakan ini akan menghapus seluruh rekaman tap masuk & pulang tanggal:
              </p>
              <div className="p-2 bg-slate-950 rounded-xl text-center font-mono font-black text-amber-300 text-sm border border-slate-800">
                📅 {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pt-1">
                <li>Cocok digunakan jika ada pengujian atau kesalahan pembacaan kartu RFID.</li>
                <li><strong className="text-emerald-400">Aman:</strong> Data master siswa, kelas, nomor RFID, dan riwayat hari sebelumnya <strong>TIDAK</strong> akan terhapus.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetTodayModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetTodayAttendance}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/50 transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ya, Reset Absensi Hari Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MIFARE SCANNER RECOGNITION MODAL */}
      <MifareScannerModal
        isOpen={isMifareScannerOpen}
        onClose={() => setIsMifareScannerOpen(false)}
        onStudentUpdated={refreshAllData}
      />

      {/* BULK IMPORT MODAL */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={refreshAllData}
      />

      {/* MIFARE REGISTRATION GUIDE MODAL */}
      <MifareGuideModal
        isOpen={isMifareGuideOpen}
        onClose={() => setIsMifareGuideOpen(false)}
        onOpenScanner={() => setIsMifareScannerOpen(true)}
        onOpenBulkImport={() => setIsBulkImportOpen(true)}
      />

      {/* DAILY ARCHIVE RECAP & DAY ROLLOVER MODAL */}
      {activeRecapData && (
        <DayRolloverModal
          isOpen={isArchiveRecapModalOpen}
          onClose={() => setIsArchiveRecapModalOpen(false)}
          previousDate={activeRecapData.previousDate}
          newDate={activeRecapData.newDate}
          recap={activeRecapData.recap}
          onViewReports={() => setActiveTab('reports')}
        />
      )}

      {/* REALTIME TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white font-bold px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          <span className="text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
