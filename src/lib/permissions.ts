export type FeaturePermission =
  | 'monitoring'
  | 'manual_checkin'
  | 'export_recap'
  | 'student_ranks'
  | 'followup_actions'
  | 'manage_students'
  | 'manage_teachers'
  | 'manage_classes'
  | 'manage_schedule'
  | 'backup_database'
  | 'manage_users';

export interface PermissionDefinition {
  id: FeaturePermission;
  label: string;
  description: string;
  category: 'Guru Piket / Operasional' | 'Kesiswaan & BK' | 'Super Admin';
}

export const ALL_FEATURE_PERMISSIONS: PermissionDefinition[] = [
  {
    id: 'monitoring',
    label: 'Live Monitoring & Log Presensi',
    description: 'Melihat dashboard live monitoring kehadiran siswa dan guru real-time.',
    category: 'Guru Piket / Operasional'
  },
  {
    id: 'manual_checkin',
    label: 'Input Absensi Manual',
    description: 'Memasukkan status absensi manual bagi siswa yang izin, sakit, atau dispensasi.',
    category: 'Guru Piket / Operasional'
  },
  {
    id: 'export_recap',
    label: 'Ekspor Laporan & Cetak',
    description: 'Mengunduh laporan rekapitulasi harian/bulanan ke format Excel, CSV, dan cetak PDF.',
    category: 'Guru Piket / Operasional'
  },
  {
    id: 'student_ranks',
    label: 'Urutan Kedatangan & Rekap Terlambat',
    description: 'Melihat urutan kedatangan siswa pagi hari dan daftar siswa yang sering terlambat.',
    category: 'Guru Piket / Operasional'
  },
  {
    id: 'followup_actions',
    label: 'Tindak Lanjut Siswa Terlambat / BK',
    description: 'Mencatat pembinaan, panggilan orang tua, dan surat peringatan bagi siswa bermasalah.',
    category: 'Kesiswaan & BK'
  },
  {
    id: 'manage_students',
    label: 'Kelola Master Siswa & Pairing Kartu',
    description: 'Menambah, mengedit, menghapus data siswa, dan memprogram UID kartu RFID siswa.',
    category: 'Super Admin'
  },
  {
    id: 'manage_teachers',
    label: 'Kelola Master Guru & Staf',
    description: 'Menambah, mengedit, dan mengelola kartu RFID untuk guru dan tenaga kependidikan.',
    category: 'Super Admin'
  },
  {
    id: 'manage_classes',
    label: 'Kelola Data Kelas & Rombel',
    description: 'Mengatur daftar kelas dan tingkatan rombongan belajar di sekolah.',
    category: 'Super Admin'
  },
  {
    id: 'manage_schedule',
    label: 'Pengaturan Jam Operasional & Marquee',
    description: 'Mengatur jam masuk, batas terlambat, jam pulang, teks berjalan, dan PIN kiosk.',
    category: 'Super Admin'
  },
  {
    id: 'backup_database',
    label: 'Cadangkan & Pulihkan Database Cloud',
    description: 'Mengunduh file backup JSON dan memulihkan data sistem ke cloud Firestore.',
    category: 'Super Admin'
  },
  {
    id: 'manage_users',
    label: 'Manajemen Akun & Kontrol Hak Akses',
    description: 'Menambah akun pengguna, mengubah password, dan mengontrol hak akses fitur.',
    category: 'Super Admin'
  }
];

export const DEFAULT_ROLE_PERMISSIONS: Record<'admin' | 'guru_piket' | 'kesiswaan', FeaturePermission[]> = {
  admin: [
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
  guru_piket: [
    'monitoring',
    'manual_checkin',
    'export_recap',
    'student_ranks'
  ],
  kesiswaan: [
    'monitoring',
    'student_ranks',
    'followup_actions',
    'export_recap'
  ]
};

/**
 * Check if a user has permission to access a specific feature.
 * Admin role always has all permissions.
 * If allowedFeatures is undefined (legacy users), fallback to role defaults.
 */
export function hasUserPermission(
  user: { role?: string; allowedFeatures?: string[] } | null | undefined,
  permission: FeaturePermission
): boolean {
  if (!user || !user.role) return false;
  
  // Super admin always has full access to every feature
  if (user.role === 'admin') return true;

  // If user has specific allowedFeatures configured by admin
  if (Array.isArray(user.allowedFeatures) && user.allowedFeatures.length > 0) {
    return user.allowedFeatures.includes(permission);
  }

  // Fallback to default permissions by role
  const roleKey = user.role as 'guru_piket' | 'kesiswaan';
  const defaults = DEFAULT_ROLE_PERMISSIONS[roleKey];
  if (defaults) {
    return defaults.includes(permission);
  }

  return false;
}

/**
 * Sanitize or provide valid permissions array for a role
 */
export function getDefaultPermissionsForRole(role: 'admin' | 'guru_piket' | 'kesiswaan'): FeaturePermission[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.guru_piket;
}
