export type Role = 'kiosk' | 'guru_piket' | 'kesiswaan' | 'admin';

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

export interface AuthUser {
  id?: string;
  username: string;
  role: Role;
  name: string;
  allowedFeatures?: string[];
}

export interface UserSession {
  sessionId: string; // Unique session ID
  deviceId: string; // Unique persistent device ID
  deviceName: string; // e.g. "Google Chrome (Windows)"
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  loginAt: string; // ISO String
  lastSeenAt: string; // ISO String
  ip?: string;
}

export interface SystemUser {
  id: string;
  username: string; // Unique username in lowercase
  password: string; // Password (can be changed by admin)
  name: string; // Display name / full name
  role: 'admin' | 'guru_piket' | 'kesiswaan';
  allowedFeatures?: string[]; // Fitur yang diizinkan untuk diakses user ini
  phone?: string;
  email?: string;
  isActive: boolean;
  lastLogin?: string; // ISO timestamp
  activeSessions?: UserSession[]; // Max 2 devices/sessions allowed
  createdAt: string;
  updatedAt: string;
}

export type GateLocation = 'pintu_depan' | 'pintu_belakang';

export type AttendanceStatus = 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG' | 'DITOLAK' | 'IZIN' | 'SAKIT' | 'ALPHA';

export type AttendanceType = 'MASUK' | 'PULANG';

export type UserRoleType = 'STUDENT' | 'TEACHER';

export interface Student {
  id: string;
  name: string;
  nisn: string; // Nomor Induk Siswa Nasional
  class: string; // e.g., "X MIPA 1", "XI IPS 2", "XII MIPA 1"
  rfidUid: string; // e.g., "0008451293", "A34F221C"
  gender?: 'L' | 'P';
  avatarUrl?: string;
  phone?: string;
}

export interface Teacher {
  id: string;
  name: string;
  nip: string; // Nomor Induk Pegawai / NUPTK / NIK
  position: string; // Mata Pelajaran / Jabatan (e.g. "Guru Bahasa Indonesia", "Waka Kurikulum", "Kepala Sekolah")
  rfidUid: string; // e.g., "TCH-990182"
  gender?: 'L' | 'P';
  phone?: string;
  avatarUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  userType: UserRoleType; // 'STUDENT' | 'TEACHER'
  // Student fields
  studentId?: string;
  studentName?: string;
  nisn?: string;
  studentClass?: string;
  // Teacher fields
  teacherId?: string;
  teacherName?: string;
  nip?: string;
  teacherPosition?: string;
  // Common fields
  rfidUid: string;
  timestamp: string; // ISO String
  timeFormatted: string; // e.g. "06:42:15"
  dateFormatted: string; // e.g. "2026-08-17"
  type: AttendanceType; // "MASUK" | "PULANG"
  status: AttendanceStatus;
  gateLocation: GateLocation;
  gateName: string; // "Pintu Depan" | "Pintu Belakang"
  lateMinutes?: number;
  arrivalRank?: number;
  notes?: string;
  isManualOverride?: boolean;
}

export interface PairedDailyAttendance {
  id: string;
  userType: UserRoleType; // 'STUDENT' | 'TEACHER'
  dateFormatted: string;
  // Student fields
  studentId?: string;
  studentName?: string;
  nisn?: string;
  studentClass?: string;
  // Teacher fields
  teacherId?: string;
  teacherName?: string;
  nip?: string;
  teacherPosition?: string;
  // Common UID
  rfidUid: string;
  // Masuk
  entryTime: string; // e.g. "06:45:10" or "-"
  entryTimestamp?: string;
  entryStatus: AttendanceStatus | 'BELUM_HADIR';
  entryGate: string;
  lateMinutes?: number;
  // Pulang
  exitTime: string; // e.g. "15:20:00" or "Belum Pulang"
  exitTimestamp?: string;
  exitGate: string;
  // Summary
  summaryStatus: string;
  notes?: string;
  isManualOverride?: boolean;
  recordIds?: string[]; // IDs of the underlying AttendanceRecord(s)
  isOrphan?: boolean; // True if no student/teacher matches this UID
}

export type MarqueeDisplayMode = 'marquee_scroll' | 'center_pulse' | 'center_static';
export type MarqueeTheme = 'gold' | 'emerald' | 'merah_putih' | 'cyber_blue' | 'royal_purple' | 'classic_dark';
export type MarqueeSpeed = 'slow' | 'normal' | 'fast' | 'ultra_fast';
export type MarqueeFontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface SchoolSchedule {
  entryStartTime: string; // "06:00"
  entryDeadlineTime: string; // "07:15" (terlambat setelah ini)
  entryEndTime: string; // "08:30" (batas akhir absen masuk)
  exitStartTime: string; // "14:00" (mulai absen pulang)
  exitEndTime: string; // "17:00"
  cooldownSeconds: number; // e.g. 60 seconds to prevent double tap
  antiSpamCooldownSeconds?: number; // Alias for double tap cooldown in seconds
  activeDays: string[]; // ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
  schoolName: string;
  schoolAddress: string;
  announcementText: string;
  announcementTextEntry?: string; // Teks Berjalan khusus Sesi Masuk Pagi
  announcementTextExit?: string; // Teks Berjalan khusus Sesi Pulang Siang/Sore
  manualGateOverride?: boolean; // Admin Manual Gate Override untuk testing di luar jam operasional
  // Opsi Pengaturan Running Text & Marquee
  marqueeDisplayMode?: MarqueeDisplayMode;
  marqueeTheme?: MarqueeTheme;
  marqueeSpeed?: MarqueeSpeed;
  marqueeFontSize?: MarqueeFontSize;
  marqueeBadgeText?: string;
  marqueeBadgeIcon?: string;
  marqueeSubText?: string;
  lateToleranceMinutes?: number; // Toleransi keterlambatan (menit)
  kioskPin?: string; // PIN Keamanan Kiosk Screen (Default: 1234)
}

export type LateFollowUpStatus = 
  | 'BELUM_DITINDAK' 
  | 'BIMBINGAN_WALI_KELAS' 
  | 'PANGGILAN_ORTU_BK' 
  | 'SURAT_PERINGATAN_1' 
  | 'SURAT_PERINGATAN_2' 
  | 'SURAT_PERINGATAN_3' 
  | 'SKORSING' 
  | 'SELESAI_DIBINA';

export interface LateFollowUpAction {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  status: LateFollowUpStatus;
  customNotes?: string;
  actionDate: string; // YYYY-MM-DD
  officerName: string; // Petugas BK / Guru Piket / Admin
  letterNumber?: string; // Nomor Surat Panggilan / SK
  updatedAt: string;
}

export interface StudentLateRankItem {
  rank: number;
  student: Student;
  studentId: string;
  studentName: string;
  nisn?: string;
  studentClass: string;
  lateCount: number;
  totalLateMinutes: number;
  avgLateMinutes: number;
  maxLateMinutes: number;
  latestLateDate: string;
  latestLateTime: string;
  severity: 'CRITICAL' | 'WARNING' | 'CAUTION';
  records: AttendanceRecord[];
  followUp?: LateFollowUpAction;
}

export interface StudentEarlyRankItem {
  rank: number;
  student: Student;
  studentId: string;
  studentName: string;
  nisn?: string;
  studentClass: string;
  onTimeCount: number;
  totalPresent: number;
  earliestTime: string;
  earliestDate: string;
  avgArrivalTime: string;
  topRankCount: number;
  records: AttendanceRecord[];
}

export interface AttendanceAttemptResult {
  success: boolean;
  message: string;
  userType?: UserRoleType; // 'STUDENT' | 'TEACHER'
  status?: AttendanceStatus;
  record?: AttendanceRecord;
  student?: Student;
  teacher?: Teacher;
  reason?: string;
  lateMinutes?: number;
  rfidUid?: string;
  scanTime?: string;
  arrivalRank?: number;
  arrivalRankText?: string;
}

export interface AttendanceStats {
  totalStudents: number;
  totalPresentToday: number;
  totalOnTime: number;
  totalLate: number;
  totalCheckoutsToday: number;
  totalAlpha: number;
  frontGateCount: number;
  backGateCount: number;
}

export interface TeacherAttendanceStats {
  totalTeachers: number;
  totalPresentToday: number;
  totalOnTime: number;
  totalLate: number;
  totalCheckoutsToday: number;
  frontGateCount: number;
  backGateCount: number;
}

export type DisciplineGrade = 'A' | 'B' | 'C' | 'D';

export interface StudentDisciplineSummary {
  student: Student;
  periodLabel: string;
  totalEffectiveDays: number;
  presentDays: number;
  onTimeCount: number;
  lateCount: number;
  totalLateMinutes: number;
  permissionCount: number; // Izin
  sickCount: number; // Sakit
  alphaCount: number; // Tanpa keterangan
  attendanceRate: number; // percentage (0 - 100)
  punctualityRate: number; // percentage (0 - 100)
  disciplineScore: number; // score (0 - 100)
  grade: DisciplineGrade;
  predikat: string;
  recommendation: string;
  pairedRecords: PairedDailyAttendance[];
}

export interface ClassAttendanceSummary {
  className: string;
  totalStudents: number;
  presentCount: number;
  onTimeCount: number;
  lateCount: number;
  alphaCount: number;
  attendanceRate: number; // percentage (0 - 100)
}

export interface DailyAttendanceRecap {
  id: string; // e.g. "recap-2026-08-25"
  dateFormatted: string; // "2026-08-25"
  dayName: string; // "Senin", "Selasa", dll
  timestamp: string; // ISO string when archived/saved
  savedBy?: string; // "AUTO_DAY_ROLLOVER" | "MANUAL_BY_ADMIN" | "MANUAL_BY_GURU_PIKET"
  studentStats: AttendanceStats;
  teacherStats: TeacherAttendanceStats;
  classSummaries: ClassAttendanceSummary[];
  totalRecordsCount: number;
  records?: AttendanceRecord[];
  notes?: string;
}


