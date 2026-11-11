import { Student, Teacher, SchoolSchedule, AttendanceRecord, SystemUser } from '../types';

export const initialSystemUsers: SystemUser[] = [
  {
    id: "usr-admin-1",
    username: "admin",
    password: "admin123",
    name: "Super Administrator",
    role: "admin",
    allowedFeatures: [
      'monitoring',
      'manual_checkin',
      'export_recap',
      'student_ranks',
      'followup_actions',
      'manage_students',
      'manage_teachers',
      'manage_classes',
      'manage_schedule',
      'backup_database',
      'manage_users'
    ],
    phone: "081234567890",
    email: "admin@sekolah.sch.id",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr-piket-1",
    username: "gurupiket",
    password: "piket123",
    name: "Petugas Guru Piket",
    role: "guru_piket",
    allowedFeatures: [
      'monitoring',
      'manual_checkin',
      'export_recap',
      'student_ranks'
    ],
    phone: "081298765432",
    email: "gurupiket@sekolah.sch.id",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr-kesiswaan-1",
    username: "kesiswaan",
    password: "kesiswaan123",
    name: "Tim Kesiswaan & Bimbingan Konseling (BK)",
    role: "kesiswaan",
    allowedFeatures: [
      'monitoring',
      'student_ranks',
      'followup_actions',
      'export_recap'
    ],
    phone: "081234567891",
    email: "kesiswaan@sekolah.sch.id",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

export const initialSchedule: SchoolSchedule = {
  schoolName: "SMK EKONOMIKA DEPOK",
  schoolAddress: "Jl. Raya Sawangan No. 45, Pancoran Mas, Kota Depok, Jawa Barat",
  entryStartTime: "06:00",
  entryDeadlineTime: "07:15",
  entryEndTime: "08:30",
  exitStartTime: "14:00",
  exitEndTime: "17:00",
  cooldownSeconds: 60, // 60 detik pencegahan double tap
  activeDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
  announcementText: "📢 Selamat Datang di SMK EKONOMIKA DEPOK! Harap selalu melakukan Tap Kartu RFID saat Masuk Pagi & Pulang Sore. Utamakan Kedisiplinan & Keselamatan.",
  announcementTextEntry: "📢 SESI MASUK PAGI: Selamat Datang di SMK EKONOMIKA DEPOK! Awali hari dengan penuh semangat dan disiplin. Harap lakukan Tap Kartu RFID pada sensor gerbang.",
  announcementTextExit: "👋 SESI PULANG SEKOLAH: Terima kasih atas semangat belajar hari ini! Selamat pulang ke rumah masing-masing, hati-hati di perjalanan dan utamakan keselamatan.",
  manualGateOverride: false
};

export const initialTeachers: Teacher[] = [
  {
    id: "tch-001",
    name: "Drs. H. Bambang Sujarwo, M.Pd.",
    nip: "196805121994031005",
    position: "Kepala Sekolah & Guru PKn",
    rfidUid: "TCH-990182",
    gender: "L",
    phone: "081234567890"
  },
  {
    id: "tch-002",
    name: "Siti Rahmawati, S.Pd.",
    nip: "198207192008012015",
    position: "Waka Kurikulum & Guru Matematika",
    rfidUid: "TCH-882190",
    gender: "P",
    phone: "081298765432"
  },
  {
    id: "tch-003",
    name: "Ahmad Fauzi, S.Kom., M.TI.",
    nip: "198903142015021008",
    position: "Kepala Program & Guru Produktif RPL",
    rfidUid: "TCH-773821",
    gender: "L",
    phone: "085611223344"
  },
  {
    id: "tch-004",
    name: "Nurul Aini, S.E., M.M.",
    nip: "198511252010012019",
    position: "Waka Kesiswaan & Guru Akuntansi",
    rfidUid: "TCH-664912",
    gender: "P",
    phone: "087788990011"
  },
  {
    id: "tch-005",
    name: "Budi Hendrawan, S.Pd.",
    nip: "199104082019031011",
    position: "Guru Bahasa Inggris",
    rfidUid: "TCH-551982",
    gender: "L",
    phone: "081399887766"
  }
];

export const initialStudents: Student[] = [
  {
    id: "std-001",
    name: "Ahmad Rizky Pratama",
    nisn: "0068492011",
    class: "X MIPA 1",
    rfidUid: "0008451293",
    gender: "L",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-002",
    name: "Siti Nurhaliza",
    nisn: "0072849102",
    class: "X MIPA 1",
    rfidUid: "A34F221C",
    gender: "P",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-003",
    name: "Budi Santoso",
    nisn: "0061928475",
    class: "X MIPA 2",
    rfidUid: "0009988771",
    gender: "L",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-004",
    name: "Dewi Anggraini",
    nisn: "0073918204",
    class: "X MIPA 2",
    rfidUid: "B891002F",
    gender: "P",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-005",
    name: "Fajar Hidayat",
    nisn: "0059281740",
    class: "XI IPS 1",
    rfidUid: "0012849201",
    gender: "L",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-006",
    name: "Gita Permata",
    nisn: "0064829103",
    class: "XI IPS 1",
    rfidUid: "0039281048",
    gender: "P",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-007",
    name: "Hendrik Wijaya",
    nisn: "0058192847",
    class: "XI IPS 2",
    rfidUid: "0048291048",
    gender: "L",
    avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-008",
    name: "Indah Lestari",
    nisn: "0061829401",
    class: "XI IPS 2",
    rfidUid: "0009823145",
    gender: "P",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-009",
    name: "Joko Kusuma",
    nisn: "0049281039",
    class: "XII MIPA 2",
    rfidUid: "0007738210",
    gender: "L",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-010",
    name: "Kania Putri",
    nisn: "0051829472",
    class: "XII MIPA 2",
    rfidUid: "0006284910",
    gender: "P",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-011",
    name: "Lukman Hakim",
    nisn: "0048192048",
    class: "XII IPS 1",
    rfidUid: "0005519382",
    gender: "L",
    avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "std-012",
    name: "Maya Saphira",
    nisn: "0059182740",
    class: "XII IPS 1",
    rfidUid: "0004928103",
    gender: "P",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"
  }
];

export const getInitialAttendanceLogs = (_students?: Student[]): AttendanceRecord[] => {
  return [];
};

