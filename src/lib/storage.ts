import { 
  Student, 
  Teacher, 
  SchoolSchedule, 
  AttendanceRecord, 
  GateLocation, 
  AttendanceAttemptResult, 
  AttendanceStats, 
  TeacherAttendanceStats, 
  StudentLateRankItem, 
  StudentEarlyRankItem, 
  SystemUser, 
  LateFollowUpAction, 
  LateFollowUpStatus, 
  UserSession,
  DailyAttendanceRecap,
  ClassAttendanceSummary
} from '../types';
import { initialSchedule, initialStudents, initialTeachers, initialSystemUsers, getInitialAttendanceLogs } from '../data/initialData';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { createNewSession, detectDeviceInfo } from './deviceDetector';
import { getDefaultPermissionsForRole } from './permissions';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  query,
  limit,
  Unsubscribe
} from 'firebase/firestore';

const STORAGE_KEYS = {
  STUDENTS: 'rfid_app_students_v1',
  TEACHERS: 'rfid_app_teachers_v1',
  SCHEDULE: 'rfid_app_schedule_v1',
  ATTENDANCE: 'rfid_app_attendance_v1',
  CLASSES: 'rfid_app_classes_v1',
  SYSTEM_USERS: 'rfid_app_system_users_v1',
  LATE_FOLLOWUPS: 'rfid_app_late_followups_v1',
  DAILY_RECAPS: 'rfid_app_daily_recaps_v1',
  LAST_ACTIVE_DATE: 'rfid_app_last_active_date_v1',
  CLOUD_SYNC_STATUS: 'rfid_app_cloud_sync_v1',
  KIOSK_PIN: 'rfid_app_kiosk_pin_v1',
  KIOSK_LOCKED: 'rfid_app_kiosk_locked_v1',
  CURRENT_SESSION_ID: 'rfid_current_session_id',
  CURRENT_USER_ID: 'rfid_current_user_id',
};

// Date helper for consistent local date calculation (WIB / Indonesian local timezone)
export function getLocalTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getIndonesianDayName(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[d.getDay()] || 'Senin';
}

// BroadcastChannel for cross-tab & cross-window instant real-time synchronization
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('rfid_attendance_sync_channel') 
  : null;

export const SESSION_MAX_DURATION_MS = 60 * 60 * 1000; // 1 Jam Maksimal (60 menit)
export const MAX_ACTIVE_DEVICES_PER_ACCOUNT = 2; // Maksimal 2 perangkat per akun

let isFirestoreInitialized = false;
let unsubscribers: Unsubscribe[] = [];

export interface DatabaseBackup {
  appVersion: string;
  exportDate: string;
  schoolName: string;
  counts: {
    students: number;
    teachers: number;
    classes: number;
    attendanceRecords: number;
    systemUsers?: number;
  };
  data: {
    students: Student[];
    teachers: Teacher[];
    classes: string[];
    schedule: SchoolSchedule;
    attendanceRecords: AttendanceRecord[];
    systemUsers?: SystemUser[];
  };
}

export class AttendanceStorage {
  private static isCloudConnected = true;

  // --- INITIALIZE CLOUD SYNC WITH FIRESTORE (MULTI-DEVICE REAL-TIME PERSISTENCE) ---
  static initCloudSync(onSyncChange?: (status: 'connected' | 'offline' | 'synced') => void) {
    if (typeof window === 'undefined' || isFirestoreInitialized) return;
    isFirestoreInitialized = true;

    try {
      // 1. Subscribe to Students Collection
      const studentsCol = collection(db, 'students');
      const unsubStudents = onSnapshot(studentsCol, (snapshot) => {
        const cloudStudents: Student[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as Student;
          if (data && data.id && data.name) {
            cloudStudents.push(data);
          }
        });
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(cloudStudents));
        this.broadcastSync('STUDENTS_UPDATED');
        if (onSyncChange) onSyncChange('synced');
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'students');
        this.isCloudConnected = false;
        if (onSyncChange) onSyncChange('offline');
      });

      // 2. Subscribe to Teachers Collection
      const teachersCol = collection(db, 'teachers');
      const unsubTeachers = onSnapshot(teachersCol, (snapshot) => {
        const cloudTeachers: Teacher[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as Teacher;
          if (data && data.id && data.name) {
            cloudTeachers.push(data);
          }
        });
        localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(cloudTeachers));
        this.broadcastSync('TEACHERS_UPDATED');
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'teachers');
      });

      // 3. Subscribe to Classes Collection
      const classesCol = collection(db, 'classes');
      const unsubClasses = onSnapshot(classesCol, (snapshot) => {
        const cloudClasses: string[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data?.name) cloudClasses.push(data.name);
        });
        const sorted = Array.from(new Set(cloudClasses)).sort();
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(sorted));
        this.broadcastSync('CLASSES_UPDATED', sorted);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'classes');
      });

      // 4. Subscribe to Settings / Schedule
      const settingsDoc = doc(db, 'settings', 'school_schedule');
      const unsubSettings = onSnapshot(settingsDoc, (docSnap) => {
        if (docSnap.exists()) {
          const cloudSchedule = docSnap.data() as SchoolSchedule;
          localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(cloudSchedule));
          this.broadcastSync('SCHEDULE_UPDATED');
        } else {
          const localSchedule = this.getSchedule();
          this.syncScheduleToCloud(localSchedule);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/school_schedule');
      });

      // 5. Subscribe to Attendance Records (Real-time Tap Log Sync Across Devices)
      const recordsCol = collection(db, 'attendance_records');
      const unsubRecords = onSnapshot(recordsCol, (snapshot) => {
        if (!snapshot.empty) {
          const cloudRecords: AttendanceRecord[] = [];
          snapshot.forEach(docSnap => {
            cloudRecords.push(docSnap.data() as AttendanceRecord);
          });
          cloudRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(cloudRecords));
          this.broadcastSync('ATTENDANCE_UPDATED');
        } else {
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
          this.broadcastSync('ATTENDANCE_UPDATED');
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'attendance_records');
      });

      // 6. Subscribe to System Users Collection (Admin / Guru Piket / Kesiswaan Accounts)
      const usersCol = collection(db, 'system_users');
      const unsubUsers = onSnapshot(usersCol, (snapshot) => {
        if (!snapshot.empty) {
          const cloudUsers: SystemUser[] = [];
          snapshot.forEach(docSnap => {
            cloudUsers.push(docSnap.data() as SystemUser);
          });
          localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(cloudUsers));
          this.broadcastSync('USERS_UPDATED');
        } else {
          const localUsers = this.getSystemUsers();
          this.seedSystemUsersToCloud(localUsers);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'system_users');
      });

      // 7. Subscribe to Late Follow-ups Collection (Tindak Lanjut Siswa Terlambat)
      const followUpsCol = collection(db, 'late_followups');
      const unsubFollowUps = onSnapshot(followUpsCol, (snapshot) => {
        if (!snapshot.empty) {
          const map: Record<string, LateFollowUpAction> = {};
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as LateFollowUpAction;
            if (data.studentId) {
              map[data.studentId] = data;
            }
          });
          localStorage.setItem(STORAGE_KEYS.LATE_FOLLOWUPS, JSON.stringify(map));
          this.broadcastSync('FOLLOWUPS_UPDATED');
        } else {
          localStorage.setItem(STORAGE_KEYS.LATE_FOLLOWUPS, JSON.stringify({}));
          this.broadcastSync('FOLLOWUPS_UPDATED');
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'late_followups');
      });

      // 8. Subscribe to Daily Attendance Recaps Collection (Arsip Rekap Harian Otomatis)
      const recapsCol = collection(db, 'daily_attendance_recap');
      const unsubRecaps = onSnapshot(recapsCol, (snapshot) => {
        if (!snapshot.empty) {
          const cloudRecaps: DailyAttendanceRecap[] = [];
          snapshot.forEach(docSnap => {
            cloudRecaps.push(docSnap.data() as DailyAttendanceRecap);
          });
          cloudRecaps.sort((a, b) => b.dateFormatted.localeCompare(a.dateFormatted));
          localStorage.setItem(STORAGE_KEYS.DAILY_RECAPS, JSON.stringify(cloudRecaps));
          this.broadcastSync('DAILY_RECAPS_SYNCED');
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'daily_attendance_recap');
      });

      unsubscribers = [unsubStudents, unsubTeachers, unsubClasses, unsubSettings, unsubRecords, unsubUsers, unsubFollowUps, unsubRecaps];
      this.isCloudConnected = true;

      // Check day rollover on sync initialization
      this.checkAndProcessDayRollover();

      if (onSyncChange) onSyncChange('connected');
    } catch (err) {
      console.warn('Firestore real-time sync initialization fallback:', err);
      this.isCloudConnected = false;
      if (onSyncChange) onSyncChange('offline');
    }
  }

  // Helper cloud seeders
  private static async seedSystemUsersToCloud(users: SystemUser[]) {
    try {
      const batch = writeBatch(db);
      for (const u of users) {
        const ref = doc(db, 'system_users', u.id);
        batch.set(ref, sanitizeForFirestore(u));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_users');
    }
  }

  private static async seedStudentsToCloud(students: Student[]) {
    try {
      const batch = writeBatch(db);
      for (const s of students) {
        const ref = doc(db, 'students', s.id);
        batch.set(ref, sanitizeForFirestore(s));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'students');
    }
  }

  private static async seedTeachersToCloud(teachers: Teacher[]) {
    try {
      const batch = writeBatch(db);
      for (const t of teachers) {
        const ref = doc(db, 'teachers', t.id);
        batch.set(ref, sanitizeForFirestore(t));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teachers');
    }
  }

  private static async seedClassesToCloud(classes: string[]) {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      const batch = writeBatch(db);
      const cleanLower = new Set(classes.map(c => c.trim().toLowerCase()));

      snap.forEach(docSnap => {
        const data = docSnap.data();
        const docName = (data.name || '').trim().toLowerCase();
        const docId = docSnap.id.toLowerCase();
        if (!cleanLower.has(docName) && !cleanLower.has(docId)) {
          batch.delete(docSnap.ref);
        }
      });

      for (const c of classes) {
        const id = c.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const ref = doc(db, 'classes', id);
        batch.set(ref, sanitizeForFirestore({ id, name: c }));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'classes');
    }
  }

  private static async seedAttendanceToCloud(records: AttendanceRecord[]) {
    try {
      const batch = writeBatch(db);
      const slice = records.slice(0, 400);
      for (const r of slice) {
        const ref = doc(db, 'attendance_records', r.id);
        batch.set(ref, sanitizeForFirestore(r));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance_records');
    }
  }

  private static async syncScheduleToCloud(schedule: SchoolSchedule) {
    try {
      await setDoc(doc(db, 'settings', 'school_schedule'), sanitizeForFirestore(schedule));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/school_schedule');
    }
  }

  // --- STUDENTS MANAGEMENT ---
  static getStudents(): Student[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!data) return [];
    try {
      const parsed: Student[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static async saveStudents(students: Student[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    this.broadcastSync('STUDENTS_UPDATED');

    // Sync in background to Cloud Firestore
    try {
      const snap = await getDocs(collection(db, 'students'));
      const activeIds = new Set(students.map(s => s.id));
      const batch = writeBatch(db);

      // Cleanly delete documents no longer present in current students list
      snap.forEach(docSnap => {
        if (!activeIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      // Upsert current students
      for (const s of students) {
        batch.set(doc(db, 'students', s.id), sanitizeForFirestore(s));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'students');
    }
  }

  static addStudent(student: Student) {
    const students = this.getStudents();
    const updated = [student, ...students];
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    this.broadcastSync('STUDENTS_UPDATED');

    // Write to Firestore
    setDoc(doc(db, 'students', student.id), sanitizeForFirestore(student)).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `students/${student.id}`);
    });

    return updated;
  }

  static updateStudent(student: Student) {
    const students = this.getStudents();
    const updated = students.map(s => s.id === student.id ? student : s);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    this.broadcastSync('STUDENTS_UPDATED');

    // Write to Firestore
    setDoc(doc(db, 'students', student.id), sanitizeForFirestore(student)).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `students/${student.id}`);
    });

    return updated;
  }

  static deleteStudent(studentId: string) {
    const students = this.getStudents();
    const updated = students.filter(s => s.id !== studentId);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    this.broadcastSync('STUDENTS_UPDATED');

    // Delete from Firestore
    deleteDoc(doc(db, 'students', studentId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `students/${studentId}`);
    });

    return updated;
  }

  static bulkDeleteStudents(studentIds: string[]) {
    const idSet = new Set(studentIds);
    const students = this.getStudents();
    const updated = students.filter(s => !idSet.has(s.id));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    this.broadcastSync('STUDENTS_UPDATED');

    // Atomic batch delete in Firestore
    try {
      const batch = writeBatch(db);
      for (const id of studentIds) {
        batch.delete(doc(db, 'students', id));
      }
      batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.DELETE, 'students/bulk');
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'students/bulk');
    }

    return updated;
  }

  static async clearAllStudents() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
    this.broadcastSync('STUDENTS_UPDATED');

    try {
      const snap = await getDocs(collection(db, 'students'));
      const batch = writeBatch(db);
      snap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'students/all');
    }
    return [];
  }

  // --- TEACHERS MANAGEMENT ---
  static getTeachers(): Teacher[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    if (!data) return [];
    try {
      const parsed: Teacher[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static async saveTeachers(teachers: Teacher[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    this.broadcastSync('TEACHERS_UPDATED');

    // Sync to Cloud Firestore with cleanup of removed docs
    try {
      const snap = await getDocs(collection(db, 'teachers'));
      const activeIds = new Set(teachers.map(t => t.id));
      const batch = writeBatch(db);

      snap.forEach(docSnap => {
        if (!activeIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      for (const t of teachers) {
        batch.set(doc(db, 'teachers', t.id), sanitizeForFirestore(t));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teachers');
    }
  }

  static addTeacher(teacher: Teacher) {
    const teachers = this.getTeachers();
    const updated = [teacher, ...teachers];
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updated));
    this.broadcastSync('TEACHERS_UPDATED');

    setDoc(doc(db, 'teachers', teacher.id), sanitizeForFirestore(teacher)).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `teachers/${teacher.id}`);
    });

    return updated;
  }

  static updateTeacher(teacher: Teacher) {
    const teachers = this.getTeachers();
    const updated = teachers.map(t => t.id === teacher.id ? teacher : t);
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updated));
    this.broadcastSync('TEACHERS_UPDATED');

    setDoc(doc(db, 'teachers', teacher.id), sanitizeForFirestore(teacher)).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `teachers/${teacher.id}`);
    });

    return updated;
  }

  static deleteTeacher(teacherId: string) {
    const teachers = this.getTeachers();
    const updated = teachers.filter(t => t.id !== teacherId);
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updated));
    this.broadcastSync('TEACHERS_UPDATED');

    deleteDoc(doc(db, 'teachers', teacherId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `teachers/${teacherId}`);
    });

    return updated;
  }

  static bulkDeleteTeachers(teacherIds: string[]) {
    const idSet = new Set(teacherIds);
    const teachers = this.getTeachers();
    const updated = teachers.filter(t => !idSet.has(t.id));
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updated));
    this.broadcastSync('TEACHERS_UPDATED');

    try {
      const batch = writeBatch(db);
      for (const id of teacherIds) {
        batch.delete(doc(db, 'teachers', id));
      }
      batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.DELETE, 'teachers/bulk');
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'teachers/bulk');
    }

    return updated;
  }

  static async clearAllTeachers() {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([]));
    this.broadcastSync('TEACHERS_UPDATED');

    try {
      const snap = await getDocs(collection(db, 'teachers'));
      const batch = writeBatch(db);
      snap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'teachers/all');
    }
    return [];
  }

  // --- RFID DUAL-ROLE CONFLICT CHECKER ---
  static isRfidUidTaken(
    uid: string,
    targetType: 'student' | 'teacher',
    excludeId?: string
  ): { taken: boolean; ownerType?: 'TEACHER' | 'STUDENT'; ownerName?: string; reason?: string } {
    const cleanUid = (uid || '').trim().toUpperCase();
    if (!cleanUid) return { taken: false };

    const students = this.getStudents();
    const teachers = this.getTeachers();

    // Check collision in teachers collection
    const matchedTeacher = teachers.find(t => 
      t.rfidUid && t.rfidUid.trim().toUpperCase() === cleanUid && t.id !== excludeId
    );
    if (matchedTeacher) {
      return {
        taken: true,
        ownerType: 'TEACHER',
        ownerName: matchedTeacher.name,
        reason: `UID [${cleanUid}] sudah terdaftar sebagai Guru/Pegawai: "${matchedTeacher.name}" (${matchedTeacher.position || 'Guru'})`
      };
    }

    // Check collision in students collection
    const matchedStudent = students.find(s => 
      s.rfidUid && s.rfidUid.trim().toUpperCase() === cleanUid && s.id !== excludeId
    );
    if (matchedStudent) {
      return {
        taken: true,
        ownerType: 'STUDENT',
        ownerName: matchedStudent.name,
        reason: `UID [${cleanUid}] sudah terdaftar sebagai Siswa: "${matchedStudent.name}" (${matchedStudent.class})`
      };
    }

    return { taken: false };
  }

  // --- CLASSES MANAGEMENT ---
  static getClasses(): string[] {
    if (typeof window === 'undefined') {
      return [];
    }
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (!data) return [];
    try {
      const parsed: string[] = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return Array.from(new Set(parsed.map(c => typeof c === 'string' ? c.trim() : '').filter(Boolean))).sort();
    } catch {
      return [];
    }
  }

  static saveClasses(classes: string[]) {
    if (typeof window === 'undefined') return [];
    const cleanList = Array.from(new Set(classes.map(c => typeof c === 'string' ? c.trim() : '').filter(Boolean))).sort();
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(cleanList));
    this.broadcastSync('CLASSES_UPDATED', cleanList);

    // Sync to Firestore
    this.seedClassesToCloud(cleanList);
    return cleanList;
  }

  static addClass(className: string): { success: boolean; message: string; classes: string[] } {
    const clean = className.trim();
    if (!clean) {
      return { success: false, message: 'Nama kelas tidak boleh kosong!', classes: this.getClasses() };
    }
    const current = this.getClasses();
    if (current.some(c => c.trim().toLowerCase() === clean.toLowerCase())) {
      return { success: false, message: `Kelas "${clean}" sudah ada dalam database!`, classes: current };
    }
    const updated = Array.from(new Set([...current, clean])).sort();
    this.saveClasses(updated);

    // Write to Firestore
    const classId = clean.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    setDoc(doc(db, 'classes', classId), { id: classId, name: clean }).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `classes/${classId}`);
    });

    return { success: true, message: `Kelas "${clean}" berhasil ditambahkan!`, classes: updated };
  }

  static addClasses(classNames: string[]): { success: boolean; addedCount: number; message: string; classes: string[] } {
    const current = this.getClasses();
    const currentLower = new Set(current.map(c => c.trim().toLowerCase()));
    let addedCount = 0;
    const toAdd: string[] = [];

    for (const raw of classNames) {
      const clean = (typeof raw === 'string' ? raw : '').trim();
      if (clean && !currentLower.has(clean.toLowerCase()) && !toAdd.some(t => t.toLowerCase() === clean.toLowerCase())) {
        toAdd.push(clean);
        addedCount++;
      }
    }

    if (toAdd.length === 0) {
      return { success: false, addedCount: 0, message: 'Tidak ada kelas baru yang valid atau kelas sudah ada!', classes: current };
    }

    const updated = Array.from(new Set([...current, ...toAdd])).sort();
    this.saveClasses(updated);
    return { success: true, addedCount, message: `Berhasil menambahkan ${addedCount} kelas baru!`, classes: updated };
  }

  static updateClass(oldName: string, newName: string): { success: boolean; message: string; classes: string[] } {
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (!cleanNew) {
      return { success: false, message: 'Nama kelas baru tidak boleh kosong!', classes: this.getClasses() };
    }

    const current = this.getClasses();
    if (cleanOld.toLowerCase() !== cleanNew.toLowerCase() && current.some(c => c.trim().toLowerCase() === cleanNew.toLowerCase())) {
      return { success: false, message: `Kelas dengan nama "${cleanNew}" sudah ada!`, classes: current };
    }

    const updatedClasses = Array.from(new Set(current.map(c => c.trim().toLowerCase() === cleanOld.toLowerCase() ? cleanNew : c.trim()))).sort();
    this.saveClasses(updatedClasses);

    // Update in Firestore
    const oldId = cleanOld.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const newId = cleanNew.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    deleteDoc(doc(db, 'classes', oldId)).catch(() => {});
    setDoc(doc(db, 'classes', newId), { id: newId, name: cleanNew }).catch(() => {});

    // Also update all students with old class name
    const students = this.getStudents();
    let studentsUpdated = false;
    const updatedStudents = students.map(s => {
      if ((s.class || '').trim().toLowerCase() === cleanOld.toLowerCase()) {
        studentsUpdated = true;
        return { ...s, class: cleanNew };
      }
      return s;
    });

    if (studentsUpdated) {
      this.saveStudents(updatedStudents);
    }

    // Also update attendance records with old class name
    const records = this.getAttendanceRecords();
    let recordsUpdated = false;
    const updatedRecords = records.map(r => {
      if ((r.studentClass || '').trim().toLowerCase() === cleanOld.toLowerCase()) {
        recordsUpdated = true;
        return { ...r, studentClass: cleanNew };
      }
      return r;
    });

    if (recordsUpdated) {
      this.saveAttendanceRecords(updatedRecords);
    }

    return { success: true, message: `Kelas "${cleanOld}" berhasil diubah menjadi "${cleanNew}"!`, classes: updatedClasses };
  }

  static deleteClass(className: string, options?: { deleteStudents?: boolean }): { success: boolean; message: string; classes: string[] } {
    const clean = className.trim();
    const current = this.getClasses();
    const updated = current.filter(c => c.trim().toLowerCase() !== clean.toLowerCase());
    
    // Save to local storage & broadcast immediately
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
    this.broadcastSync('CLASSES_UPDATED', updated);

    // Sync cloud immediately (removes class doc from Firestore)
    this.seedClassesToCloud(updated);

    const students = this.getStudents();
    if (options?.deleteStudents) {
      const studentsToDelete = students.filter(s => (s.class || '').trim().toLowerCase() === clean.toLowerCase());
      if (studentsToDelete.length > 0) {
        this.bulkDeleteStudents(studentsToDelete.map(s => s.id));
      }
    } else {
      let studentsUpdated = false;
      const modifiedStudents = students.map(s => {
        if ((s.class || '').trim().toLowerCase() === clean.toLowerCase()) {
          studentsUpdated = true;
          return { ...s, class: '' };
        }
        return s;
      });
      if (studentsUpdated) {
        this.saveStudents(modifiedStudents);
      }
    }

    return { success: true, message: `Kelas "${clean}" berhasil dihapus secara permanen!`, classes: updated };
  }

  static bulkDeleteClasses(classNames: string[], options?: { deleteStudents?: boolean }): { success: boolean; deletedCount: number; message: string; classes: string[] } {
    const targets = new Set(classNames.map(c => c.trim().toLowerCase()));
    const current = this.getClasses();
    const updated = current.filter(c => !targets.has(c.trim().toLowerCase()));
    const deletedCount = current.length - updated.length;

    // Save to local storage & broadcast immediately
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
    this.broadcastSync('CLASSES_UPDATED', updated);

    // Sync cloud immediately
    this.seedClassesToCloud(updated);

    const students = this.getStudents();
    if (options?.deleteStudents) {
      const studentsToDelete = students.filter(s => targets.has((s.class || '').trim().toLowerCase()));
      if (studentsToDelete.length > 0) {
        this.bulkDeleteStudents(studentsToDelete.map(s => s.id));
      }
    } else {
      let studentsUpdated = false;
      const modifiedStudents = students.map(s => {
        if (targets.has((s.class || '').trim().toLowerCase())) {
          studentsUpdated = true;
          return { ...s, class: '' };
        }
        return s;
      });
      if (studentsUpdated) {
        this.saveStudents(modifiedStudents);
      }
    }

    return {
      success: true,
      deletedCount,
      message: `Berhasil menghapus ${deletedCount} kelas terpilih!`,
      classes: updated
    };
  }

  // --- SYSTEM USERS & AUTHENTICATION MANAGEMENT ---
  static getSystemUsers(): SystemUser[] {
    if (typeof window === 'undefined') return initialSystemUsers;
    const data = localStorage.getItem(STORAGE_KEYS.SYSTEM_USERS);
    if (!data) {
      this.saveSystemUsers(initialSystemUsers);
      return initialSystemUsers;
    }
    try {
      const parsed: SystemUser[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      this.saveSystemUsers(initialSystemUsers);
      return initialSystemUsers;
    } catch {
      return initialSystemUsers;
    }
  }

  static async saveSystemUsers(users: SystemUser[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(users));
    this.broadcastSync('USERS_UPDATED');

    // Sync in background to Cloud Firestore
    try {
      const batch = writeBatch(db);
      for (const u of users) {
        batch.set(doc(db, 'system_users', u.id), sanitizeForFirestore(u));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_users');
    }
  }

  static addSystemUser(userData: Omit<SystemUser, 'id' | 'createdAt' | 'updatedAt'>): { success: boolean; message: string; user?: SystemUser } {
    const cleanUsername = userData.username.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, message: 'Username tidak boleh kosong!' };
    }
    if (!userData.password || userData.password.trim().length < 4) {
      return { success: false, message: 'Password minimal 4 karakter!' };
    }
    if (!userData.name || userData.name.trim().length === 0) {
      return { success: false, message: 'Nama lengkap wajib diisi!' };
    }

    const currentUsers = this.getSystemUsers();
    if (currentUsers.some(u => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh akun lain!` };
    }

    const now = new Date().toISOString();
    const newUser: SystemUser = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: cleanUsername,
      password: userData.password.trim(),
      name: userData.name.trim(),
      role: userData.role,
      allowedFeatures: Array.isArray(userData.allowedFeatures) && userData.allowedFeatures.length > 0
        ? userData.allowedFeatures
        : getDefaultPermissionsForRole(userData.role),
      phone: userData.phone?.trim() || undefined,
      email: userData.email?.trim() || undefined,
      isActive: userData.isActive !== false,
      createdAt: now,
      updatedAt: now
    };

    const updatedList = [newUser, ...currentUsers];
    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(updatedList));
    this.broadcastSync('USERS_UPDATED');

    // Write to Firestore
    setDoc(doc(db, 'system_users', newUser.id), sanitizeForFirestore(newUser)).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `system_users/${newUser.id}`);
    });

    return { success: true, message: `Akun "${newUser.name}" (@${newUser.username}) berhasil ditambahkan!`, user: newUser };
  }

  static updateSystemUser(user: SystemUser): { success: boolean; message: string } {
    const cleanUsername = user.username.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, message: 'Username tidak boleh kosong!' };
    }
    if (!user.name || user.name.trim().length === 0) {
      return { success: false, message: 'Nama pengguna wajib diisi!' };
    }

    const currentUsers = this.getSystemUsers();
    const duplicate = currentUsers.find(u => u.id !== user.id && u.username.toLowerCase() === cleanUsername);
    if (duplicate) {
      return { success: false, message: `Username "${cleanUsername}" sudah dipakai oleh pengguna lain!` };
    }

    const now = new Date().toISOString();
    const updatedUser: SystemUser = {
      ...user,
      username: cleanUsername,
      name: user.name.trim(),
      allowedFeatures: Array.isArray(user.allowedFeatures) && user.allowedFeatures.length > 0
        ? user.allowedFeatures
        : (user.allowedFeatures || getDefaultPermissionsForRole(user.role)),
      phone: user.phone?.trim() || undefined,
      email: user.email?.trim() || undefined,
      updatedAt: now
    };

    const updatedList = currentUsers.map(u => u.id === user.id ? updatedUser : u);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(updatedList));
    this.broadcastSync('USERS_UPDATED');

    // Update in Firestore
    setDoc(doc(db, 'system_users', user.id), sanitizeForFirestore(updatedUser)).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `system_users/${user.id}`);
    });

    return { success: true, message: `Data akun "${updatedUser.name}" berhasil diperbarui!` };
  }

  static deleteSystemUser(userId: string, currentLoggedInUsername?: string): { success: boolean; message: string } {
    const currentUsers = this.getSystemUsers();
    const target = currentUsers.find(u => u.id === userId);
    if (!target) {
      return { success: false, message: 'Akun tidak ditemukan!' };
    }

    // Protection: cannot delete own logged-in account
    if (currentLoggedInUsername && target.username.toLowerCase() === currentLoggedInUsername.toLowerCase()) {
      return { success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan login!' };
    }

    // Protection: ensure at least one active Admin exists
    const activeAdmins = currentUsers.filter(u => u.role === 'admin' && u.isActive && u.id !== userId);
    if (target.role === 'admin' && activeAdmins.length === 0) {
      return { success: false, message: 'Gagal: Sistem harus memiliki minimal satu akun Administrator yang aktif!' };
    }

    const updatedList = currentUsers.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(updatedList));
    this.broadcastSync('USERS_UPDATED');

    // Delete in Firestore
    deleteDoc(doc(db, 'system_users', userId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `system_users/${userId}`);
    });

    return { success: true, message: `Akun "${target.name}" (@${target.username}) berhasil dihapus permanen!` };
  }

  static toggleUserStatus(userId: string, currentLoggedInUsername?: string): { success: boolean; message: string } {
    const currentUsers = this.getSystemUsers();
    const target = currentUsers.find(u => u.id === userId);
    if (!target) return { success: false, message: 'Akun tidak ditemukan!' };

    if (currentLoggedInUsername && target.username.toLowerCase() === currentLoggedInUsername.toLowerCase()) {
      return { success: false, message: 'Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang digunakan!' };
    }

    if (target.role === 'admin' && target.isActive) {
      const otherActiveAdmins = currentUsers.filter(u => u.role === 'admin' && u.isActive && u.id !== userId);
      if (otherActiveAdmins.length === 0) {
        return { success: false, message: 'Tidak dapat menonaktifkan satu-satunya Administrator yang aktif!' };
      }
    }

    const newStatus = !target.isActive;
    const now = new Date().toISOString();
    const updatedUser: SystemUser = {
      ...target,
      isActive: newStatus,
      updatedAt: now
    };

    const updatedList = currentUsers.map(u => u.id === userId ? updatedUser : u);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(updatedList));
    this.broadcastSync('USERS_UPDATED');

    setDoc(doc(db, 'system_users', userId), sanitizeForFirestore(updatedUser)).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `system_users/${userId}`);
    });

    return { 
      success: true, 
      message: `Akun "${target.name}" berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}!` 
    };
  }

  // --- DEVICE & SESSION MANAGEMENT (MAX 2 DEVICES PER ACCOUNT & 1-HOUR EXPIRY) ---
  static authenticateUser(username: string, password: string): { 
    success: boolean; 
    user?: SystemUser; 
    session?: UserSession; 
    message: string;
    displacedSessionName?: string;
  } {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Username dan kata sandi wajib diisi!' };
    }

    const users = this.getSystemUsers();
    let found = users.find(u => u.username.toLowerCase() === cleanUser);

    if (!found) {
      // Fallback for default hardcoded credentials if database has not seeded yet
      if (cleanUser === 'admin' && cleanPass === 'admin123') {
        found = initialSystemUsers[0];
      } else if ((cleanUser === 'gurupiket' || cleanUser === 'guru') && cleanPass === 'piket123') {
        found = initialSystemUsers[1];
      } else if ((cleanUser === 'kesiswaan' || cleanUser === 'bk') && cleanPass === 'kesiswaan123') {
        found = initialSystemUsers[2] || {
          id: "usr-kesiswaan-1",
          username: "kesiswaan",
          password: "kesiswaan123",
          name: "Tim Kesiswaan & Bimbingan Konseling (BK)",
          role: "kesiswaan",
          phone: "081234567891",
          email: "kesiswaan@sekolah.sch.id",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        return { success: false, message: 'Username atau kata sandi yang Anda masukkan salah.' };
      }
    }

    if (found.password !== cleanPass) {
      return { success: false, message: 'Username atau kata sandi yang Anda masukkan salah.' };
    }

    if (!found.isActive) {
      return { 
        success: false, 
        message: 'Akun Anda sedang dinonaktifkan oleh Administrator. Silakan hubungi admin sekolah.' 
      };
    }

    // --- DEVICE & SESSION MANAGEMENT (MAX 2 DEVICES PER ACCOUNT & 1-HOUR EXPIRY) ---
    const newSession = createNewSession(found.id);
    const nowMs = Date.now();

    // Filter out same device ID and any expired sessions (> 1 Hour)
    const validExistingSessions = (found.activeSessions || []).filter(s => {
      if (s.deviceId === newSession.deviceId) return false;
      const loginTime = new Date(s.loginAt).getTime();
      return (nowMs - loginTime) < SESSION_MAX_DURATION_MS;
    });
    
    // Sort existing active sessions from oldest to newest
    validExistingSessions.sort((a, b) => new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime());

    let displacedSessionName: string | undefined;
    let retainedSessions = validExistingSessions;

    // Enforce MAX 2 Devices: If 2 or more devices already active, kick the oldest device (FIFO)
    if (validExistingSessions.length >= MAX_ACTIVE_DEVICES_PER_ACCOUNT) {
      const oldest = validExistingSessions[0];
      displacedSessionName = oldest.deviceName;
      retainedSessions = validExistingSessions.slice(validExistingSessions.length - (MAX_ACTIVE_DEVICES_PER_ACCOUNT - 1));
    }

    const updatedSessions = [...retainedSessions, newSession];
    const now = new Date().toISOString();
    const updatedUser: SystemUser = {
      ...found,
      lastLogin: now,
      updatedAt: now,
      activeSessions: updatedSessions
    };

    // Save updated user with activeSessions to storage & Firestore
    const currentUsers = this.getSystemUsers();
    const isUserInList = currentUsers.some(u => u.id === found.id);
    const updatedList = isUserInList 
      ? currentUsers.map(u => u.id === found.id ? updatedUser : u)
      : [...currentUsers, updatedUser];

    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(updatedList));
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, newSession.sessionId);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, found.id);
    this.broadcastSync('USERS_UPDATED');

    setDoc(doc(db, 'system_users', found.id), sanitizeForFirestore(updatedUser)).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `system_users/${found.id}`);
    });

    return {
      success: true,
      user: updatedUser,
      session: newSession,
      displacedSessionName,
      message: 'Login Berhasil'
    };
  }

  static getCurrentSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
  }

  static getCurrentUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  }

  static validateActiveSession(userId: string, sessionId: string): {
    isValid: boolean;
    user?: SystemUser;
    isDisplaced?: boolean;
    isExpired?: boolean;
    reason?: string;
  } {
    const users = this.getSystemUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return { isValid: false, reason: 'Pengguna tidak ditemukan dalam sistem.' };
    }

    if (!user.isActive) {
      return { isValid: false, reason: 'Akun telah dinonaktifkan oleh Administrator.' };
    }

    // Check if session ID still exists in user.activeSessions
    const activeSessions = user.activeSessions || [];
    const targetSession = activeSessions.find(s => s.sessionId === sessionId);

    if (!targetSession) {
      return {
        isValid: false,
        isDisplaced: true,
        reason: 'Sesi Anda telah berakhir karena akun ini telah login di perangkat baru atau diputus oleh Admin. (Batas maksimal 2 perangkat per akun).'
      };
    }

    // Check 1-Hour Session Expiration Limit
    const loginTime = new Date(targetSession.loginAt).getTime();
    const now = Date.now();
    if (now - loginTime > SESSION_MAX_DURATION_MS) {
      this.revokeUserSession(userId, sessionId);
      return {
        isValid: false,
        isExpired: true,
        reason: 'Sesi login Anda telah berakhir (Maksimal durasi sesi 1 Jam). Silakan masuk kembali.'
      };
    }

    // Update last seen heartbeat (touch activity)
    this.touchSessionActivity(userId, sessionId);

    return { isValid: true, user };
  }

  static touchSessionActivity(userId: string, sessionId: string) {
    const users = this.getSystemUsers();
    const user = users.find(u => u.id === userId);
    if (!user || !user.activeSessions) return;

    const targetSession = user.activeSessions.find(s => s.sessionId === sessionId);
    if (targetSession) {
      const now = new Date().toISOString();
      const lastSeenMs = targetSession.lastSeenAt ? new Date(targetSession.lastSeenAt).getTime() : 0;
      // Only throttle updates to every 30 seconds
      if (Date.now() - lastSeenMs > 30000) {
        targetSession.lastSeenAt = now;
        localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(users));
      }
    }
  }

  static recordUserLogin(userId: string) {
    const users = this.getSystemUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
      this.saveSystemUsers(users);
    }
  }

  static logoutCurrentUser(userId?: string, sessionId?: string) {
    const uid = userId || this.getCurrentUserId();
    const sid = sessionId || this.getCurrentSessionId();

    if (uid && sid) {
      this.revokeUserSession(uid, sid);
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  }

  static revokeUserSession(userId: string, sessionId: string): { success: boolean; message: string } {
    const users = this.getSystemUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User tidak ditemukan.' };

    const filteredSessions = (user.activeSessions || []).filter(s => s.sessionId !== sessionId);
    const updatedUser: SystemUser = {
      ...user,
      activeSessions: filteredSessions,
      updatedAt: new Date().toISOString()
    };

    const updatedList = users.map(u => u.id === userId ? updatedUser : u);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(updatedList));
    this.broadcastSync('USERS_UPDATED');

    setDoc(doc(db, 'system_users', userId), sanitizeForFirestore(updatedUser)).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `system_users/${userId}`);
    });

    return { success: true, message: 'Sesi perangkat berhasil diputus.' };
  }

  static getUserActiveSessions(userId: string): UserSession[] {
    const users = this.getSystemUsers();
    const user = users.find(u => u.id === userId);
    return user?.activeSessions || [];
  }

  // --- LATE FOLLOW-UPS MANAGEMENT (TINDAK LANJUT SISWA TERLAMBAT) ---
  static getLateFollowUps(): Record<string, LateFollowUpAction> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(STORAGE_KEYS.LATE_FOLLOWUPS);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  static getLateFollowUpForStudent(studentId: string): LateFollowUpAction | undefined {
    const all = this.getLateFollowUps();
    return all[studentId];
  }

  static setLateFollowUp(followUp: LateFollowUpAction): { success: boolean; message: string } {
    if (!followUp.studentId) {
      return { success: false, message: 'ID Siswa wajib ada.' };
    }

    const map = this.getLateFollowUps();
    const now = new Date().toISOString();
    const cleanAction: LateFollowUpAction = {
      ...followUp,
      id: followUp.id || `fu-${followUp.studentId}-${Date.now()}`,
      updatedAt: now
    };

    map[followUp.studentId] = cleanAction;
    localStorage.setItem(STORAGE_KEYS.LATE_FOLLOWUPS, JSON.stringify(map));
    this.broadcastSync('FOLLOWUPS_UPDATED');

    setDoc(doc(db, 'late_followups', followUp.studentId), sanitizeForFirestore(cleanAction)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `late_followups/${followUp.studentId}`);
    });

    return { success: true, message: 'Tindak lanjut siswa berhasil dicatat & disinkronkan.' };
  }

  static deleteLateFollowUp(studentId: string): { success: boolean; message: string } {
    const map = this.getLateFollowUps();
    if (map[studentId]) {
      delete map[studentId];
      localStorage.setItem(STORAGE_KEYS.LATE_FOLLOWUPS, JSON.stringify(map));
      this.broadcastSync('FOLLOWUPS_UPDATED');

      deleteDoc(doc(db, 'late_followups', studentId)).catch(err => {
        handleFirestoreError(err, OperationType.DELETE, `late_followups/${studentId}`);
      });
    }
    return { success: true, message: 'Data tindak lanjut berhasil direset.' };
  }

  // --- SCHEDULE & SETTINGS ---
  static getSchedule(): SchoolSchedule {
    if (typeof window === 'undefined') return initialSchedule;
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (!data) {
      this.saveSchedule(initialSchedule);
      return initialSchedule;
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed.schoolName === "SMK / SMA UTAMA MANDIRI" || !parsed.schoolName) {
        parsed.schoolName = "SMK EKONOMIKA DEPOK";
        parsed.schoolAddress = "Jl. Raya Sawangan No. 45, Pancoran Mas, Kota Depok, Jawa Barat";
      }
      // Ensure cooldownSeconds and antiSpamCooldownSeconds are properly populated and consistent
      const effectiveCooldown = Number(parsed.cooldownSeconds ?? parsed.antiSpamCooldownSeconds ?? 60);
      parsed.cooldownSeconds = effectiveCooldown;
      parsed.antiSpamCooldownSeconds = effectiveCooldown;
      return parsed;
    } catch {
      return initialSchedule;
    }
  }

  static saveSchedule(schedule: SchoolSchedule) {
    if (typeof window === 'undefined') return;
    const effectiveCooldown = Number(schedule.cooldownSeconds ?? schedule.antiSpamCooldownSeconds ?? 60);
    const normalizedSchedule: SchoolSchedule = {
      ...schedule,
      cooldownSeconds: effectiveCooldown,
      antiSpamCooldownSeconds: effectiveCooldown
    };
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(normalizedSchedule));
    this.broadcastSync('SCHEDULE_UPDATED');
    this.syncScheduleToCloud(normalizedSchedule);
  }

  // --- ATTENDANCE RECORDS ---
  static getAttendanceRecords(): AttendanceRecord[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!data) {
      const initialLogs = getInitialAttendanceLogs(this.getStudents());
      this.saveAttendanceRecords(initialLogs);
      return initialLogs;
    }
    try {
      const parsed: AttendanceRecord[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Filter out legacy dummy initial log entries (att-1001 s/d att-1005)
        const cleaned = parsed.filter(r => !['att-1001', 'att-1002', 'att-1003', 'att-1004', 'att-1005'].includes(r.id));
        if (cleaned.length !== parsed.length) {
          this.saveAttendanceRecords(cleaned);
        }
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  }

  static saveAttendanceRecords(records: AttendanceRecord[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    this.broadcastSync('ATTENDANCE_UPDATED');
  }

  static async clearAllAttendanceData(): Promise<{ success: boolean; message: string }> {
    this.saveAttendanceRecords([]);
    this.broadcastSync('ATTENDANCE_UPDATED');
    
    // Clear all in cloud (attendance_records collection)
    try {
      const snapshot = await getDocs(collection(db, 'attendance_records'));
      if (!snapshot.empty) {
        const docs = snapshot.docs;
        const deletePromises = docs.map(docSnap => deleteDoc(doc(db, 'attendance_records', docSnap.id)));
        await Promise.all(deletePromises);
      }
      this.saveAttendanceRecords([]);
      this.broadcastSync('ATTENDANCE_UPDATED');
      return { success: true, message: 'Seluruh riwayat log presensi berhasil dikosongkan secara permanen.' };
    } catch (err) {
      console.warn('Error clearing attendance records in cloud:', err);
      // Fallback batch delete
      try {
        const snapshot = await getDocs(collection(db, 'attendance_records'));
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach(d => batch.delete(doc(db, 'attendance_records', d.id)));
          await batch.commit();
        }
      } catch (fallbackErr) {
        console.error('Fallback batch delete failed:', fallbackErr);
      }
      this.saveAttendanceRecords([]);
      this.broadcastSync('ATTENDANCE_UPDATED');
      return { success: true, message: 'Seluruh riwayat log presensi telah dikosongkan.' };
    }
  }

  static async deleteAttendanceRecordByIds(recordIds: string[]): Promise<{ success: boolean; deletedCount: number; message: string }> {
    if (!recordIds || recordIds.length === 0) return { success: false, deletedCount: 0, message: 'Tidak ada data log yang dipilih' };
    const idSet = new Set(recordIds);
    const allRecords = this.getAttendanceRecords();
    const remaining = allRecords.filter(r => !idSet.has(r.id));
    const deletedCount = allRecords.length - remaining.length;

    this.saveAttendanceRecords(remaining);
    this.broadcastSync('ATTENDANCE_UPDATED');

    // Remove from Firestore
    try {
      const deletePromises = recordIds.map(id => deleteDoc(doc(db, 'attendance_records', id)));
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn('Error deleting records from cloud:', err);
    }

    return {
      success: true,
      deletedCount,
      message: `Berhasil menghapus ${deletedCount} riwayat log absensi.`
    };
  }

  static cleanOrphanAttendanceRecords(): { success: boolean; deletedCount: number; message: string } {
    const students = this.getStudents();
    const teachers = this.getTeachers();
    const validStudentUids = new Set(students.map(s => s.rfidUid.trim().toUpperCase()));
    const validStudentIds = new Set(students.map(s => s.id));
    const validTeacherUids = new Set(teachers.map(t => t.rfidUid.trim().toUpperCase()));
    const validTeacherIds = new Set(teachers.map(t => t.id));

    const allRecords = this.getAttendanceRecords();
    const orphanIds: string[] = [];

    const validRecords = allRecords.filter(r => {
      const uid = (r.rfidUid || '').trim().toUpperCase();
      const hasValidStudent = (r.studentId && validStudentIds.has(r.studentId)) || (uid && validStudentUids.has(uid)) || (r.studentName && r.studentName.trim().length > 0);
      const hasValidTeacher = (r.teacherId && validTeacherIds.has(r.teacherId)) || (uid && validTeacherUids.has(uid)) || (r.teacherName && r.teacherName.trim().length > 0);
      
      const isOrphan = !hasValidStudent && !hasValidTeacher;
      if (isOrphan) {
        orphanIds.push(r.id);
        return false;
      }
      return true;
    });

    const deletedCount = orphanIds.length;
    if (deletedCount > 0) {
      this.saveAttendanceRecords(validRecords);
      this.broadcastSync('ATTENDANCE_UPDATED');
      // Delete in Firestore
      try {
        const batch = writeBatch(db);
        for (const id of orphanIds.slice(0, 400)) {
          batch.delete(doc(db, 'attendance_records', id));
        }
        batch.commit().catch(() => {});
      } catch (err) {
        console.warn('Error deleting orphan records from cloud:', err);
      }
    }

    return {
      success: true,
      deletedCount,
      message: deletedCount > 0 
        ? `Berhasil membersihkan ${deletedCount} log absensi tidak bertuan / data kosong!`
        : 'Semua data absensi sudah bersih dan valid!'
    };
  }

  static autoHealAttendanceRecords(): { healedCount: number } {
    const students = this.getStudents();
    const teachers = this.getTeachers();
    const records = this.getAttendanceRecords();

    let healedCount = 0;
    const updated = records.map(r => {
      let changed = false;
      const cleanUid = (r.rfidUid || '').trim().toUpperCase();

      // Check student match if studentName is missing
      if (!r.studentName || r.studentName.trim() === '' || r.studentName === '-') {
        const match = students.find(s => (s.id && s.id === r.studentId) || (cleanUid && s.rfidUid.trim().toUpperCase() === cleanUid));
        if (match) {
          r.studentId = match.id;
          r.studentName = match.name;
          r.nisn = match.nisn || r.nisn;
          r.studentClass = match.class || r.studentClass;
          r.userType = 'STUDENT';
          changed = true;
        }
      }

      // Check teacher match if teacherName is missing
      const isTeacherOrUnknown = r.userType === 'TEACHER' || (!r.studentName && r.userType !== 'STUDENT');
      if (isTeacherOrUnknown) {
        if (!r.teacherName || r.teacherName.trim() === '' || r.teacherName === '-') {
          const match = teachers.find(t => (t.id && t.id === r.teacherId) || (cleanUid && t.rfidUid.trim().toUpperCase() === cleanUid));
          if (match) {
            r.teacherId = match.id;
            r.teacherName = match.name;
            r.nip = match.nip || r.nip;
            r.teacherPosition = match.position || r.teacherPosition;
            r.userType = 'TEACHER';
            changed = true;
          }
        }
      }

      if (changed) healedCount++;
      return r;
    });

    if (healedCount > 0) {
      this.saveAttendanceRecords(updated);
      // Update in cloud
      try {
        const batch = writeBatch(db);
        for (const r of updated.slice(0, 400)) {
          batch.set(doc(db, 'attendance_records', r.id), sanitizeForFirestore(r));
        }
        batch.commit().catch(() => {});
      } catch (err) {
        console.warn('Error saving healed records to cloud:', err);
      }
    }

    return { healedCount };
  }

  static getTodayDate(): string {
    return getLocalTodayDateString();
  }

  // --- AUTOMATED DAILY ATTENDANCE RESET & SNAPSHOT ARCHIVING ---
  static checkAndProcessDayRollover(): { rolledOver: boolean; previousDate?: string; newDate: string } {
    if (typeof window === 'undefined') return { rolledOver: false, newDate: this.getTodayDate() };
    const today = this.getTodayDate();
    const lastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE);

    if (!lastActive) {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);
      return { rolledOver: false, newDate: today };
    }

    if (lastActive !== today) {
      console.log(`[Day Rollover] Previous Date: ${lastActive} -> Today: ${today}. Auto-archiving recap and resetting daily view to 0.`);
      
      // Update active date marker to today first to prevent duplicate trigger
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);

      // Auto-save snapshot of previous day's attendance to Database and Local storage
      this.saveDailyRecapSnapshot(lastActive, 'AUTO_DAY_ROLLOVER').then(res => {
        // Broadcast day change event with archived recap across tabs
        this.broadcastSync('DAY_CHANGED', { 
          previousDate: lastActive, 
          newDate: today,
          recap: res.recap
        });
        this.broadcastSync('ATTENDANCE_UPDATED');
      }).catch(err => {
        console.warn('Auto-archive on day rollover error:', err);
        this.broadcastSync('DAY_CHANGED', { previousDate: lastActive, newDate: today });
        this.broadcastSync('ATTENDANCE_UPDATED');
      });

      return { rolledOver: true, previousDate: lastActive, newDate: today };
    }

    return { rolledOver: false, newDate: today };
  }

  static async triggerManualArchiveAndReset(targetDateStr?: string): Promise<{ success: boolean; recap: DailyAttendanceRecap; message: string }> {
    const targetDate = targetDateStr || this.getTodayDate();
    const saveRes = await this.saveDailyRecapSnapshot(targetDate, 'MANUAL_BY_ADMIN');
    
    // Broadcast notification
    this.broadcastSync('DAY_CHANGED', {
      previousDate: targetDate,
      newDate: this.getTodayDate(),
      recap: saveRes.recap
    });
    this.broadcastSync('ATTENDANCE_UPDATED');

    return {
      success: true,
      recap: saveRes.recap,
      message: `Berhasil mengarsipkan rekap absensi tanggal ${targetDate} ke database Firestore!`
    };
  }

  static async saveDailyRecapSnapshot(
    targetDateStr?: string, 
    savedBy: string = 'MANUAL_SESSION_CLOSE'
  ): Promise<{ success: boolean; recap: DailyAttendanceRecap; message: string }> {
    const dateFormatted = targetDateStr || this.getTodayDate();
    const dayName = getIndonesianDayName(dateFormatted);
    const students = this.getStudents();
    const teachers = this.getTeachers();
    const allRecords = this.getAttendanceRecords();
    const dateRecords = allRecords.filter(r => r.dateFormatted === dateFormatted);
    const classes = this.getClasses();

    // Student statistics on target date
    const studentRecords = dateRecords.filter(r => r.userType === 'STUDENT' || (!r.userType && !r.teacherId));
    const studentCheckIns = studentRecords.filter(r => r.type === 'MASUK');
    const studentCheckOuts = studentRecords.filter(r => r.type === 'PULANG');
    const studentOnTime = studentCheckIns.filter(r => r.status === 'TEPAT_WAKTU').length;
    const studentLate = studentCheckIns.filter(r => r.status === 'TERLAMBAT').length;
    const totalPresentToday = studentCheckIns.length;
    const totalStudents = students.length;
    const totalAlpha = Math.max(0, totalStudents - totalPresentToday);
    const frontGateCount = dateRecords.filter(r => r.gateLocation === 'pintu_depan').length;
    const backGateCount = dateRecords.filter(r => r.gateLocation === 'pintu_belakang').length;

    const studentStats: AttendanceStats = {
      totalStudents,
      totalPresentToday,
      totalOnTime: studentOnTime,
      totalLate: studentLate,
      totalCheckoutsToday: studentCheckOuts.length,
      totalAlpha,
      frontGateCount,
      backGateCount
    };

    // Teacher statistics on target date
    const teacherRecords = dateRecords.filter(r => r.userType === 'TEACHER' || !!r.teacherId);
    const teacherCheckIns = teacherRecords.filter(r => r.type === 'MASUK');
    const teacherCheckOuts = teacherRecords.filter(r => r.type === 'PULANG');
    const teacherStats: TeacherAttendanceStats = {
      totalTeachers: teachers.length,
      totalPresentToday: teacherCheckIns.length,
      totalOnTime: teacherCheckIns.filter(r => r.status === 'TEPAT_WAKTU').length,
      totalLate: teacherCheckIns.filter(r => r.status === 'TERLAMBAT').length,
      totalCheckoutsToday: teacherCheckOuts.length,
      frontGateCount: teacherRecords.filter(r => r.gateLocation === 'pintu_depan').length,
      backGateCount: teacherRecords.filter(r => r.gateLocation === 'pintu_belakang').length
    };

    // Per class summary breakdown
    const classSummaries: ClassAttendanceSummary[] = classes.map(cls => {
      const classStudents = students.filter(s => s.class === cls);
      const totalClassStudents = classStudents.length;
      const classStudentIds = new Set(classStudents.map(s => s.id));
      const classUids = new Set(classStudents.map(s => s.rfidUid));

      const classEntries = studentCheckIns.filter(r => 
        (r.studentClass === cls) || 
        (r.studentId && classStudentIds.has(r.studentId)) ||
        (r.rfidUid && classUids.has(r.rfidUid))
      );

      const presentCount = classEntries.length;
      const onTimeCount = classEntries.filter(r => r.status === 'TEPAT_WAKTU').length;
      const lateCount = classEntries.filter(r => r.status === 'TERLAMBAT').length;
      const alphaCount = Math.max(0, totalClassStudents - presentCount);
      const attendanceRate = totalClassStudents > 0 ? Number(((presentCount / totalClassStudents) * 100).toFixed(1)) : 0;

      return {
        className: cls,
        totalStudents: totalClassStudents,
        presentCount,
        onTimeCount,
        lateCount,
        alphaCount,
        attendanceRate
      };
    });

    const recap: DailyAttendanceRecap = {
      id: `recap-${dateFormatted}`,
      dateFormatted,
      dayName,
      timestamp: new Date().toISOString(),
      savedBy,
      studentStats,
      teacherStats,
      classSummaries,
      totalRecordsCount: dateRecords.length
    };

    // 1. Save to local storage
    const currentRecaps = this.getDailyRecaps();
    const existingIndex = currentRecaps.findIndex(r => r.dateFormatted === dateFormatted);
    let updatedRecaps: DailyAttendanceRecap[];
    if (existingIndex >= 0) {
      updatedRecaps = [...currentRecaps];
      updatedRecaps[existingIndex] = recap;
    } else {
      updatedRecaps = [recap, ...currentRecaps];
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DAILY_RECAPS, JSON.stringify(updatedRecaps));
    }

    // 2. Save to Firestore Cloud Collection
    try {
      await setDoc(doc(db, 'daily_attendance_recap', recap.id), sanitizeForFirestore(recap));
    } catch (err) {
      console.warn('Error saving daily recap to Firestore:', err);
    }

    this.broadcastSync('DAILY_RECAP_SAVED', recap);

    return {
      success: true,
      recap,
      message: `Rekap absensi harian tanggal ${dateFormatted} (${dayName}) berhasil disimpan ke database untuk laporan!`
    };
  }

  static getDailyRecaps(): DailyAttendanceRecap[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_RECAPS);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static getDailyRecapByDate(dateStr: string): DailyAttendanceRecap | null {
    const recaps = this.getDailyRecaps();
    return recaps.find(r => r.dateFormatted === dateStr) || null;
  }

  static async resetTodayAttendance(targetDateStr?: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const dateToReset = targetDateStr || this.getTodayDate();
    
    // Auto-save recap snapshot before any manual reset to ensure data is safely backed up
    await this.saveDailyRecapSnapshot(dateToReset, 'MANUAL_BEFORE_RESET');

    const allRecords = this.getAttendanceRecords();
    const recordsToKeep = allRecords.filter(r => r.dateFormatted !== dateToReset);
    const deletedCount = allRecords.length - recordsToKeep.length;

    this.saveAttendanceRecords(recordsToKeep);
    this.broadcastSync('ATTENDANCE_UPDATED');

    // Also remove target date records from active attendance_records in Firestore
    try {
      const snapshot = await getDocs(collection(db, 'attendance_records'));
      const batch = writeBatch(db);
      let count = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as AttendanceRecord;
        if (data.dateFormatted === dateToReset) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.warn('Error resetting cloud attendance for target date:', err);
    }

    return {
      success: true,
      deletedCount,
      message: `Data absensi tanggal ${dateToReset} telah tersimpan aman di database laporan dan hitungan hari ini berhasil direset ke 0.`
    };
  }

  // --- REALTIME EVENT BROADCASTING ---
  private static broadcastSync(type: string, payload?: unknown) {
    const data = { type, payload, timestamp: Date.now() };
    if (syncChannel) {
      try {
        syncChannel.postMessage(data);
      } catch {
        // Fallback
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rfid_sync', { detail: data }));
    }
  }

  static subscribeToSync(callback: (event: { type: string; payload?: unknown }) => void) {
    const channelHandler = (e: MessageEvent) => {
      if (e.data && e.data.type) {
        callback(e.data);
      }
    };

    const windowHandler = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail && customEvt.detail.type) {
        callback(customEvt.detail);
      }
    };

    const storageHandler = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('rfid_app_')) {
        callback({ type: 'STORAGE_UPDATED', payload: e.key });
      }
    };

    if (syncChannel) {
      syncChannel.addEventListener('message', channelHandler);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('rfid_sync', windowHandler);
      window.addEventListener('storage', storageHandler);
    }

    return () => {
      if (syncChannel) {
        syncChannel.removeEventListener('message', channelHandler);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('rfid_sync', windowHandler);
        window.removeEventListener('storage', storageHandler);
      }
    };
  }

  // --- CORE ATTENDANCE TAP PROCESSING ENGINE ---
  static processRfidTap(rfidUidClean: string, gateLocation: GateLocation): AttendanceAttemptResult {
    const cleanUid = rfidUidClean.trim().toUpperCase();
    const teachers = this.getTeachers();
    const students = this.getStudents();
    const schedule = this.getSchedule();
    const records = this.getAttendanceRecords();

    const now = new Date();
    const todayStr = this.getTodayDate();
    const timeFormatted = now.toTimeString().split(' ')[0]; // "HH:mm:ss"
    const scanTime = `${timeFormatted} WIB`;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const gateName = gateLocation === 'pintu_depan' ? 'Pintu Depan' : 'Pintu Belakang';

    // 1. Check if UID belongs to a TEACHER
    const teacher = teachers.find(t => t.rfidUid.trim().toUpperCase() === cleanUid);
    if (teacher) {
      // Teacher cooldown check
      const recentRecordsForTeacher = records.filter(r => r.teacherId === teacher.id);
      if (recentRecordsForTeacher.length > 0) {
        const lastRecord = recentRecordsForTeacher[0];
        const lastTime = new Date(lastRecord.timestamp).getTime();
        const diffSeconds = Math.floor((now.getTime() - lastTime) / 1000);

        if (diffSeconds < schedule.cooldownSeconds) {
          return {
            success: false,
            userType: 'TEACHER',
            teacher,
            rfidUid: cleanUid,
            scanTime,
            message: `DITOLAK: Mohon tunggu ${schedule.cooldownSeconds - diffSeconds} detik untuk tap ulang kartu.`,
            reason: 'COOLDOWN_ACTIVE'
          };
        }
      }

      // Determine Attendance Type (MASUK vs PULANG)
      const [exitStartH, exitStartM] = schedule.exitStartTime.split(':').map(Number);
      const exitStartMins = exitStartH * 60 + exitStartM;
      let type: 'MASUK' | 'PULANG' = currentMinutes >= exitStartMins ? 'PULANG' : 'MASUK';

      // Duplicate Check for Teacher
      const todayRecords = records.filter(r => r.teacherId === teacher.id && r.dateFormatted === todayStr);
      const todayEntry = todayRecords.find(r => r.type === 'MASUK');
      const todayExit = todayRecords.find(r => r.type === 'PULANG');

      if (type === 'MASUK') {
        if (todayEntry) {
          return {
            success: false,
            userType: 'TEACHER',
            teacher,
            rfidUid: cleanUid,
            scanTime,
            message: `DOUBLE ABSENSI DITOLAK: ${teacher.name} sudah absen MASUK hari ini pada pkl ${todayEntry.timeFormatted} (${todayEntry.gateName}).`,
            reason: 'ALREADY_CHECKED_IN'
          };
        }
      } else {
        if (todayExit) {
          return {
            success: false,
            userType: 'TEACHER',
            teacher,
            rfidUid: cleanUid,
            scanTime,
            message: `DOUBLE ABSENSI DITOLAK: ${teacher.name} sudah absen PULANG hari ini pada pkl ${todayExit.timeFormatted} (${todayExit.gateName}).`,
            reason: 'ALREADY_CHECKED_OUT'
          };
        }
      }

      // Calculate Status & Late Minutes
      const [deadlineH, deadlineM] = schedule.entryDeadlineTime.split(':').map(Number);
      const deadlineMins = deadlineH * 60 + deadlineM;
      let status: 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG' = 'TEPAT_WAKTU';
      let lateMinutes = 0;

      if (type === 'MASUK') {
        if (currentMinutes > deadlineMins) {
          status = 'TERLAMBAT';
          lateMinutes = currentMinutes - deadlineMins;
        } else {
          status = 'TEPAT_WAKTU';
        }
      } else {
        status = 'PULANG';
      }

      // Create New Attendance Record for Teacher
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userType: 'TEACHER',
        teacherId: teacher.id,
        teacherName: teacher.name,
        nip: teacher.nip,
        teacherPosition: teacher.position,
        rfidUid: teacher.rfidUid,
        timestamp: now.toISOString(),
        timeFormatted,
        dateFormatted: todayStr,
        type,
        status,
        gateLocation,
        gateName,
        lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
        notes: status === 'TERLAMBAT' ? `Terlambat ${lateMinutes} Menit (Batas ${schedule.entryDeadlineTime})` : undefined
      };

      const updatedRecords = [newRecord, ...records];
      this.saveAttendanceRecords(updatedRecords);

      setDoc(doc(db, 'attendance_records', newRecord.id), sanitizeForFirestore(newRecord)).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, `attendance_records/${newRecord.id}`);
      });

      const todayTeacherEntries = records.filter(r => r.dateFormatted === todayStr && r.type === 'MASUK' && (r.userType === 'TEACHER' || !!r.teacherId));
      const arrivalRank = type === 'MASUK' ? todayTeacherEntries.length + 1 : undefined;
      const arrivalRankText = arrivalRank ? `Guru Ke-${arrivalRank}` : undefined;

      const message = type === 'MASUK'
        ? (status === 'TERLAMBAT' 
            ? `ABSEN GURU TERLAMBAT: ${teacher.name} (${teacher.position}) - Terlambat ${lateMinutes} Menit` 
            : `ABSEN GURU DITERIMA: ${teacher.name} (${teacher.position}) - Tepat Waktu`)
        : `ABSEN PULANG GURU DITERIMA: ${teacher.name} (${teacher.position})`;

      return {
        success: true,
        userType: 'TEACHER',
        teacher,
        message,
        status,
        record: newRecord,
        lateMinutes,
        rfidUid: cleanUid,
        scanTime,
        arrivalRank,
        arrivalRankText
      };
    }

    // 2. Check if UID belongs to a STUDENT
    const student = students.find(s => s.rfidUid.trim().toUpperCase() === cleanUid);
    if (!student) {
      return {
        success: false,
        message: `KARTU DITOLAK: UID RFID [${cleanUid}] Tidak Terdaftar!`,
        reason: 'UNREGISTERED_CARD',
        rfidUid: cleanUid,
        scanTime
      };
    }

    // Student cooldown check
    const recentRecordsForStudent = records.filter(r => r.studentId === student.id);
    if (recentRecordsForStudent.length > 0) {
      const lastRecord = recentRecordsForStudent[0];
      const lastTime = new Date(lastRecord.timestamp).getTime();
      const diffSeconds = Math.floor((now.getTime() - lastTime) / 1000);

      if (diffSeconds < schedule.cooldownSeconds) {
        return {
          success: false,
          userType: 'STUDENT',
          student,
          rfidUid: cleanUid,
          scanTime,
          message: `DITOLAK: Mohon tunggu ${schedule.cooldownSeconds - diffSeconds} detik untuk tap ulang kartu.`,
          reason: 'COOLDOWN_ACTIVE'
        };
      }
    }

    // Determine Attendance Type (MASUK vs PULANG)
    const [entryStartH, entryStartM] = schedule.entryStartTime.split(':').map(Number);
    const [deadlineH, deadlineM] = schedule.entryDeadlineTime.split(':').map(Number);
    const [exitStartH, exitStartM] = schedule.exitStartTime.split(':').map(Number);

    const deadlineMins = deadlineH * 60 + deadlineM;
    const exitStartMins = exitStartH * 60 + exitStartM;

    let type: 'MASUK' | 'PULANG' = 'MASUK';
    if (currentMinutes >= exitStartMins) {
      type = 'PULANG';
    }

    // Duplicate Check for Student
    const todayRecords = records.filter(r => r.studentId === student.id && r.dateFormatted === todayStr);
    const todayEntry = todayRecords.find(r => r.type === 'MASUK');
    const todayExit = todayRecords.find(r => r.type === 'PULANG');

    if (type === 'MASUK') {
      if (todayEntry) {
        return {
          success: false,
          userType: 'STUDENT',
          student,
          rfidUid: cleanUid,
          scanTime,
          message: `DOUBLE ABSENSI DITOLAK: ${student.name} sudah absen MASUK hari ini pada pkl ${todayEntry.timeFormatted} (${todayEntry.gateName}).`,
          reason: 'ALREADY_CHECKED_IN'
        };
      }
    } else {
      if (todayExit) {
        return {
          success: false,
          userType: 'STUDENT',
          student,
          rfidUid: cleanUid,
          scanTime,
          message: `DOUBLE ABSENSI DITOLAK: ${student.name} sudah absen PULANG hari ini pada pkl ${todayExit.timeFormatted} (${todayExit.gateName}).`,
          reason: 'ALREADY_CHECKED_OUT'
        };
      }
    }

    // Calculate Status & Late Minutes
    let status: 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG' = 'TEPAT_WAKTU';
    let lateMinutes = 0;

    if (type === 'MASUK') {
      if (currentMinutes > deadlineMins) {
        status = 'TERLAMBAT';
        lateMinutes = currentMinutes - deadlineMins;
      } else {
        status = 'TEPAT_WAKTU';
      }
    } else {
      status = 'PULANG';
    }

    // Create New Attendance Record for Student
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userType: 'STUDENT',
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisn,
      studentClass: student.class,
      rfidUid: student.rfidUid,
      timestamp: now.toISOString(),
      timeFormatted,
      dateFormatted: todayStr,
      type,
      status,
      gateLocation,
      gateName,
      lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
      notes: status === 'TERLAMBAT' ? `Terlambat ${lateMinutes} Menit (Batas ${schedule.entryDeadlineTime})` : undefined
    };

    const updatedRecords = [newRecord, ...records];
    this.saveAttendanceRecords(updatedRecords);

    setDoc(doc(db, 'attendance_records', newRecord.id), sanitizeForFirestore(newRecord)).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `attendance_records/${newRecord.id}`);
    });

    const todayStudentEntries = records.filter(r => r.dateFormatted === todayStr && r.type === 'MASUK' && (r.userType === 'STUDENT' || (!r.userType && r.studentId)));
    const arrivalRank = type === 'MASUK' ? todayStudentEntries.length + 1 : undefined;
    const arrivalRankText = arrivalRank ? `Siswa Ke-${arrivalRank}` : undefined;

    const message = type === 'MASUK'
      ? (status === 'TERLAMBAT' 
          ? `ABSEN MASUK TERLAMBAT: ${student.name} (${student.class}) - Terlambat ${lateMinutes} Menit` 
          : `ABSEN MASUK DITERIMA: ${student.name} (${student.class}) - Tepat Waktu`)
      : `ABSEN PULANG DITERIMA: ${student.name} (${student.class})`;

    return {
      success: true,
      userType: 'STUDENT',
      message,
      status,
      record: newRecord,
      student,
      lateMinutes,
      rfidUid: cleanUid,
      scanTime,
      arrivalRank,
      arrivalRankText
    };
  }

  // --- MANUAL ATTENDANCE OVERRIDE BY GURU/ADMIN ---
  static createManualAttendance(
    studentId: string, 
    type: 'MASUK' | 'PULANG', 
    status: 'TEPAT_WAKTU' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPHA',
    gateLocation: GateLocation,
    notes: string
  ): AttendanceAttemptResult {
    const students = this.getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return { success: false, message: 'Siswa tidak ditemukan' };
    }

    const now = new Date();
    const todayStr = this.getTodayDate();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const records = this.getAttendanceRecords();

    const gateName = gateLocation === 'pintu_depan' ? 'Pintu Depan' : 'Pintu Belakang';

    const newRecord: AttendanceRecord = {
      id: `att-manual-${Date.now()}`,
      userType: 'STUDENT',
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisn,
      studentClass: student.class,
      rfidUid: student.rfidUid,
      timestamp: now.toISOString(),
      timeFormatted,
      dateFormatted: todayStr,
      type,
      status,
      gateLocation,
      gateName,
      notes: notes || `Manual oleh Guru Piket (${status})`,
      isManualOverride: true
    };

    const updated = [newRecord, ...records];
    this.saveAttendanceRecords(updated);

    // Save to Firestore
    setDoc(doc(db, 'attendance_records', newRecord.id), sanitizeForFirestore(newRecord)).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `attendance_records/${newRecord.id}`);
    });

    return {
      success: true,
      userType: 'STUDENT',
      message: `Manual Absensi Berhasil untuk ${student.name}`,
      record: newRecord,
      student
    };
  }

  // --- BACKUP & RESTORE DATABASE ---
  static generateBackupData(): DatabaseBackup {
    const students = this.getStudents();
    const teachers = this.getTeachers();
    const classes = this.getClasses();
    const schedule = this.getSchedule();
    const attendanceRecords = this.getAttendanceRecords();
    const systemUsers = this.getSystemUsers();

    return {
      appVersion: '2.0-cloud',
      exportDate: new Date().toISOString(),
      schoolName: schedule.schoolName || 'SMK EKONOMIKA DEPOK',
      counts: {
        students: students.length,
        teachers: teachers.length,
        classes: classes.length,
        attendanceRecords: attendanceRecords.length,
        systemUsers: systemUsers.length
      },
      data: {
        students,
        teachers,
        classes,
        schedule,
        attendanceRecords,
        systemUsers
      }
    };
  }

  static downloadBackupFile() {
    const backup = this.generateBackupData();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `BACKUP_ABSENSI_SMK_EKONOMIKA_${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  static async restoreBackupData(backupJson: DatabaseBackup): Promise<{ success: boolean; message: string; counts?: { students: number; teachers?: number; classes: number; attendance: number; systemUsers?: number } }> {
    try {
      if (!backupJson || !backupJson.data) {
        return { success: false, message: 'Format file cadangan tidak valid (Struktur data kosong)!' };
      }

      const { students, teachers, classes, schedule, attendanceRecords, systemUsers } = backupJson.data;

      if (!Array.isArray(students) || !Array.isArray(classes)) {
        return { success: false, message: 'File cadangan rusak: Siswa atau Kelas tidak berupa daftar yang valid.' };
      }

      // 1. Update local storage
      if (students) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      if (teachers && Array.isArray(teachers)) localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      if (classes) localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
      if (schedule) localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
      if (attendanceRecords) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
      if (systemUsers && Array.isArray(systemUsers) && systemUsers.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(systemUsers));
      }

      // 2. Batch write to Firestore Cloud
      const batch = writeBatch(db);

      // Restore students
      for (const s of students) {
        batch.set(doc(db, 'students', s.id), sanitizeForFirestore(s));
      }

      // Restore teachers
      if (teachers && Array.isArray(teachers)) {
        for (const t of teachers) {
          batch.set(doc(db, 'teachers', t.id), sanitizeForFirestore(t));
        }
      }

      // Restore classes
      for (const c of classes) {
        const id = c.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        batch.set(doc(db, 'classes', id), sanitizeForFirestore({ id, name: c }));
      }

      // Restore schedule
      if (schedule) {
        batch.set(doc(db, 'settings', 'school_schedule'), sanitizeForFirestore(schedule));
      }

      // Restore records (up to 400 records per batch)
      if (attendanceRecords && Array.isArray(attendanceRecords)) {
        for (const r of attendanceRecords.slice(0, 400)) {
          batch.set(doc(db, 'attendance_records', r.id), sanitizeForFirestore(r));
        }
      }

      // Restore system users
      if (systemUsers && Array.isArray(systemUsers) && systemUsers.length > 0) {
        for (const u of systemUsers) {
          batch.set(doc(db, 'system_users', u.id), sanitizeForFirestore(u));
        }
      }

      await batch.commit();

      // 3. Broadcast sync
      this.broadcastSync('BACKUP_RESTORED');

      return {
        success: true,
        message: `Database berhasil dipulihkan! (${students.length} Siswa, ${(teachers || []).length} Guru, ${classes.length} Kelas, ${(attendanceRecords || []).length} Riwayat Presensi, ${(systemUsers || []).length} Akun Pengguna)`,
        counts: {
          students: students.length,
          teachers: (teachers || []).length,
          classes: classes.length,
          attendance: (attendanceRecords || []).length,
          systemUsers: (systemUsers || []).length
        }
      };
    } catch (err) {
      console.error('Error during database restore:', err);
      return {
        success: false,
        message: `Gagal memulihkan database: ${err instanceof Error ? err.message : 'Kesalahan internal'}`
      };
    }
  }

  // --- STATS CALCULATOR FOR STUDENTS ---
  static getStatsToday(): AttendanceStats {
    const students = this.getStudents();
    const records = this.getAttendanceRecords();
    const todayStr = this.getTodayDate();

    // Filter student records only
    const todayRecords = records.filter(r => r.dateFormatted === todayStr && (r.userType === 'STUDENT' || (!r.userType && !r.teacherId)));

    const checkIns = todayRecords.filter(r => r.type === 'MASUK');
    const checkOuts = todayRecords.filter(r => r.type === 'PULANG');

    const totalOnTime = checkIns.filter(r => r.status === 'TEPAT_WAKTU').length;
    const totalLate = checkIns.filter(r => r.status === 'TERLAMBAT').length;
    const totalPresentToday = checkIns.length;

    const frontGateCount = todayRecords.filter(r => r.gateLocation === 'pintu_depan').length;
    const backGateCount = todayRecords.filter(r => r.gateLocation === 'pintu_belakang').length;

    const totalStudents = students.length;
    const totalAlpha = Math.max(0, totalStudents - totalPresentToday);

    return {
      totalStudents,
      totalPresentToday,
      totalOnTime,
      totalLate,
      totalCheckoutsToday: checkOuts.length,
      totalAlpha,
      frontGateCount,
      backGateCount
    };
  }

  // --- STATS CALCULATOR FOR TEACHERS ---
  static getTeacherStatsToday(): TeacherAttendanceStats {
    const teachers = this.getTeachers();
    const records = this.getAttendanceRecords();
    const todayStr = this.getTodayDate();

    // Filter teacher records only
    const todayRecords = records.filter(r => r.dateFormatted === todayStr && (r.userType === 'TEACHER' || !!r.teacherId));

    const checkIns = todayRecords.filter(r => r.type === 'MASUK');
    const checkOuts = todayRecords.filter(r => r.type === 'PULANG');

    const totalOnTime = checkIns.filter(r => r.status === 'TEPAT_WAKTU').length;
    const totalLate = checkIns.filter(r => r.status === 'TERLAMBAT').length;
    const totalPresentToday = checkIns.length;

    const frontGateCount = todayRecords.filter(r => r.gateLocation === 'pintu_depan').length;
    const backGateCount = todayRecords.filter(r => r.gateLocation === 'pintu_belakang').length;

    return {
      totalTeachers: teachers.length,
      totalPresentToday,
      totalOnTime,
      totalLate,
      totalCheckoutsToday: checkOuts.length,
      frontGateCount,
      backGateCount
    };
  }

  // --- LEADERBOARD & CHRONOLOGICAL ARRIVAL RANKING FOR TODAY ---
  static getArrivalRankingToday(filterType: 'ALL' | 'STUDENT' | 'TEACHER' = 'ALL') {
    const records = this.getAttendanceRecords();
    const todayStr = this.getTodayDate();
    
    let todayCheckIns = records.filter(r => r.dateFormatted === todayStr && r.type === 'MASUK');
    if (filterType === 'STUDENT') {
      todayCheckIns = todayCheckIns.filter(r => r.userType === 'STUDENT' || (!r.userType && !r.teacherId));
    } else if (filterType === 'TEACHER') {
      todayCheckIns = todayCheckIns.filter(r => r.userType === 'TEACHER' || !!r.teacherId);
    }

    const sorted = [...todayCheckIns].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return sorted.map((rec, index) => ({
      rank: index + 1,
      record: rec,
      isEarlyBird: index === 0,
      isTopThree: index < 3,
      isLate: rec.status === 'TERLAMBAT'
    }));
  }

  // --- KIOSK LOCK SCREEN & SECURITY PIN ---
  static getKioskPin(): string {
    if (typeof window === 'undefined') return '1234';
    const schedule = this.getSchedule();
    if (schedule.kioskPin && schedule.kioskPin.trim().length >= 4) {
      return schedule.kioskPin.trim();
    }
    const stored = localStorage.getItem(STORAGE_KEYS.KIOSK_PIN);
    return stored && stored.trim().length >= 4 ? stored.trim() : '1234';
  }

  static setKioskPin(pin: string): { success: boolean; message: string } {
    if (!pin || pin.trim().length < 4) {
      return { success: false, message: 'PIN Kiosk minimal 4 angka!' };
    }
    const cleanPin = pin.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.KIOSK_PIN, cleanPin);
    }
    const schedule = this.getSchedule();
    schedule.kioskPin = cleanPin;
    this.saveSchedule(schedule);
    return { success: true, message: 'PIN Keamanan Kiosk berhasil diperbarui!' };
  }

  static isKioskLocked(): boolean {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEYS.KIOSK_LOCKED);
    return stored === 'true';
  }

  static setKioskLocked(locked: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.KIOSK_LOCKED, locked ? 'true' : 'false');
    this.broadcastSync('KIOSK_LOCK_CHANGED');
  }

  static verifyKioskPin(inputPin: string): boolean {
    const validPin = this.getKioskPin();
    return (inputPin || '').trim() === validPin;
  }

  // --- LEADERBOARD: PERINGKAT SISWA PALING SERING TERLAMBAT (KHUSUS MURID SAJA TANPA GURU) ---
  static getStudentLateRankings(options?: {
    period?: 'today' | 'this_week' | 'this_month' | 'this_semester' | 'all_time' | 'custom';
    startDate?: string;
    endDate?: string;
    classFilter?: string;
  }): StudentLateRankItem[] {
    const students = this.getStudents();
    const records = this.getAttendanceRecords();
    const now = new Date();
    const todayStr = this.getTodayDate();
    const period = options?.period || 'this_month';
    const classFilter = options?.classFilter || 'ALL';

    let start = '1970-01-01';
    let end = '2099-12-31';

    if (period === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (period === 'this_week') {
      const current = new Date();
      const day = current.getDay(); // 0 is Sunday
      const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
      const monday = new Date(current.setDate(diff));
      start = monday.toISOString().split('T')[0];
      end = todayStr;
    } else if (period === 'this_month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      start = `${year}-${month}-01`;
      end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (period === 'this_semester') {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      if (month >= 7) {
        start = `${year}-07-01`;
        end = `${year}-12-31`;
      } else {
        start = `${year}-01-01`;
        end = `${year}-06-30`;
      }
    } else if (period === 'custom' && options?.startDate && options?.endDate) {
      start = options.startDate;
      end = options.endDate;
    }

    // STRICT FILTER: Siswa saja, type MASUK, status TERLAMBAT (atau lateMinutes > 0), dalam rentang tanggal
    const lateStudentRecords = records.filter(r => {
      // Exclude teachers strictly
      if (r.userType === 'TEACHER' || !!r.teacherId) return false;
      if (r.type !== 'MASUK') return false;
      if (r.status !== 'TERLAMBAT' && (!r.lateMinutes || r.lateMinutes <= 0)) return false;
      
      const recDate = r.dateFormatted || r.timestamp?.split('T')[0];
      if (recDate < start || recDate > end) return false;

      if (classFilter !== 'ALL' && (r.studentClass || '').trim() !== classFilter.trim()) {
        return false;
      }
      return true;
    });

    // Group by studentId / studentName
    const studentMap = new Map<string, {
      student: Student;
      records: AttendanceRecord[];
      totalLateMinutes: number;
      maxLateMinutes: number;
      latestDate: string;
      latestTime: string;
    }>();

    // Map of existing students for quick lookup
    const studentsById = new Map<string, Student>();
    students.forEach(s => studentsById.set(s.id, s));

    lateStudentRecords.forEach(rec => {
      const stdId = rec.studentId || rec.rfidUid || rec.studentName || 'unknown';
      let student = studentsById.get(rec.studentId || '');
      if (!student) {
        student = students.find(s => s.name.toLowerCase() === (rec.studentName || '').toLowerCase()) || {
          id: stdId,
          name: rec.studentName || 'Siswa',
          nisn: rec.nisn || '-',
          class: rec.studentClass || '-',
          rfidUid: rec.rfidUid
        };
      }

      if (classFilter !== 'ALL' && student.class !== classFilter) {
        return;
      }

      const existing = studentMap.get(stdId) || {
        student,
        records: [],
        totalLateMinutes: 0,
        maxLateMinutes: 0,
        latestDate: '',
        latestTime: ''
      };

      const lateMins = rec.lateMinutes || 1;
      existing.records.push(rec);
      existing.totalLateMinutes += lateMins;
      if (lateMins > existing.maxLateMinutes) {
        existing.maxLateMinutes = lateMins;
      }

      if (!existing.latestDate || rec.dateFormatted > existing.latestDate) {
        existing.latestDate = rec.dateFormatted;
        existing.latestTime = rec.timeFormatted;
      }

      studentMap.set(stdId, existing);
    });

    // Sort items by lateCount DESC, then totalLateMinutes DESC
    const followUpsMap = this.getLateFollowUps();
    const sortedList = Array.from(studentMap.values())
      .map(item => {
        const lateCount = item.records.length;
        const avgLateMinutes = Math.round(item.totalLateMinutes / lateCount);
        let severity: 'CRITICAL' | 'WARNING' | 'CAUTION' = 'CAUTION';
        if (lateCount >= 5 || item.totalLateMinutes >= 120) {
          severity = 'CRITICAL';
        } else if (lateCount >= 3 || item.totalLateMinutes >= 60) {
          severity = 'WARNING';
        }

        const followUp = followUpsMap[item.student.id] || followUpsMap[item.student.nisn] || undefined;

        return {
          student: item.student,
          studentId: item.student.id,
          studentName: item.student.name,
          nisn: item.student.nisn,
          studentClass: item.student.class,
          lateCount,
          totalLateMinutes: item.totalLateMinutes,
          avgLateMinutes,
          maxLateMinutes: item.maxLateMinutes,
          latestLateDate: item.latestDate,
          latestLateTime: item.latestTime,
          severity,
          records: item.records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
          followUp
        };
      })
      .sort((a, b) => {
        if (b.lateCount !== a.lateCount) {
          return b.lateCount - a.lateCount;
        }
        return b.totalLateMinutes - a.totalLateMinutes;
      });

    return sortedList.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }

  // --- LEADERBOARD: PERINGKAT SISWA PALING AWAL / TERPAGI & RAJIN (KHUSUS MURID TANPA GURU) ---
  static getStudentEarlyRankings(options?: {
    period?: 'today' | 'this_week' | 'this_month' | 'this_semester' | 'all_time' | 'custom';
    startDate?: string;
    endDate?: string;
    classFilter?: string;
  }): StudentEarlyRankItem[] {
    const students = this.getStudents();
    const records = this.getAttendanceRecords();
    const now = new Date();
    const todayStr = this.getTodayDate();
    const period = options?.period || 'this_month';
    const classFilter = options?.classFilter || 'ALL';

    let start = '1970-01-01';
    let end = '2099-12-31';

    if (period === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (period === 'this_week') {
      const current = new Date();
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(current.setDate(diff));
      start = monday.toISOString().split('T')[0];
      end = todayStr;
    } else if (period === 'this_month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      start = `${year}-${month}-01`;
      end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (period === 'this_semester') {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      if (month >= 7) {
        start = `${year}-07-01`;
        end = `${year}-12-31`;
      } else {
        start = `${year}-01-01`;
        end = `${year}-06-30`;
      }
    } else if (period === 'custom' && options?.startDate && options?.endDate) {
      start = options.startDate;
      end = options.endDate;
    }

    // STRICT FILTER: Siswa saja, type MASUK, dalam rentang tanggal
    const checkInRecords = records.filter(r => {
      if (r.userType === 'TEACHER' || !!r.teacherId) return false;
      if (r.type !== 'MASUK') return false;
      
      const recDate = r.dateFormatted || r.timestamp?.split('T')[0];
      if (recDate < start || recDate > end) return false;

      if (classFilter !== 'ALL' && (r.studentClass || '').trim() !== classFilter.trim()) {
        return false;
      }
      return true;
    });

    const studentMap = new Map<string, {
      student: Student;
      records: AttendanceRecord[];
      onTimeCount: number;
      totalPresent: number;
      earliestTime: string;
      earliestDate: string;
      totalMinutesSum: number;
      topRankCount: number;
    }>();

    const studentsById = new Map<string, Student>();
    students.forEach(s => studentsById.set(s.id, s));

    checkInRecords.forEach(rec => {
      const stdId = rec.studentId || rec.rfidUid || rec.studentName || 'unknown';
      let student = studentsById.get(rec.studentId || '');
      if (!student) {
        student = students.find(s => s.name.toLowerCase() === (rec.studentName || '').toLowerCase()) || {
          id: stdId,
          name: rec.studentName || 'Siswa',
          nisn: rec.nisn || '-',
          class: rec.studentClass || '-',
          rfidUid: rec.rfidUid
        };
      }

      if (classFilter !== 'ALL' && student.class !== classFilter) {
        return;
      }

      const existing = studentMap.get(stdId) || {
        student,
        records: [],
        onTimeCount: 0,
        totalPresent: 0,
        earliestTime: '23:59:59',
        earliestDate: '',
        totalMinutesSum: 0,
        topRankCount: 0
      };

      existing.records.push(rec);
      existing.totalPresent += 1;

      if (rec.status === 'TEPAT_WAKTU') {
        existing.onTimeCount += 1;
      }

      if (rec.arrivalRank && rec.arrivalRank <= 3) {
        existing.topRankCount += 1;
      }

      const timeStr = rec.timeFormatted || '07:00';
      const [hh, mm] = timeStr.split(':').map(Number);
      const minutesOfDay = (isNaN(hh) ? 7 : hh) * 60 + (isNaN(mm) ? 0 : mm);
      existing.totalMinutesSum += minutesOfDay;

      if (timeStr < existing.earliestTime) {
        existing.earliestTime = timeStr;
        existing.earliestDate = rec.dateFormatted;
      }

      studentMap.set(stdId, existing);
    });

    const sortedList = Array.from(studentMap.values())
      .map(item => {
        const count = item.totalPresent;
        const avgMinutes = count > 0 ? Math.round(item.totalMinutesSum / count) : 420;
        const avgH = String(Math.floor(avgMinutes / 60)).padStart(2, '0');
        const avgM = String(avgMinutes % 60).padStart(2, '0');
        const avgArrivalTime = `${avgH}:${avgM}`;

        return {
          student: item.student,
          studentId: item.student.id,
          studentName: item.student.name,
          nisn: item.student.nisn,
          studentClass: item.student.class,
          onTimeCount: item.onTimeCount,
          totalPresent: item.totalPresent,
          earliestTime: item.earliestTime === '23:59:59' ? '-' : item.earliestTime,
          earliestDate: item.earliestDate,
          avgArrivalTime,
          topRankCount: item.topRankCount,
          records: item.records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        };
      })
      .sort((a, b) => {
        // Sort by onTimeCount DESC, then earliestTime ASC, then avgArrivalTime ASC
        if (b.onTimeCount !== a.onTimeCount) {
          return b.onTimeCount - a.onTimeCount;
        }
        if (a.earliestTime !== b.earliestTime) {
          return a.earliestTime.localeCompare(b.earliestTime);
        }
        return a.avgArrivalTime.localeCompare(b.avgArrivalTime);
      });

    return sortedList.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }
}
