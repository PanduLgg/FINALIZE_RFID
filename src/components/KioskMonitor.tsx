import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GateLocation, SchoolSchedule, AttendanceAttemptResult, AttendanceRecord, AttendanceStats, Role } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { soundEngine } from '../lib/audio';
import { SchoolLogo } from './SchoolLogo';
import { MARQUEE_THEMES_CONFIG } from '../data/holidayGreetings';
import { 
  Clock, 
  MapPin, 
  CheckCircle,
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  CreditCard, 
  Megaphone,
  Sparkles,
  ShieldCheck,
  Building2,
  Bell,
  Sun,
  Moon,
  Sunset,
  Users,
  LogOut,
  UserCheck,
  Info,
  Activity,
  Calendar,
  Wifi,
  WifiOff,
  Database,
  HardDrive,
  Maximize2,
  Minimize2,
  Monitor,
  Menu,
  X,
  ChevronRight,
  Sliders,
  Award,
  GraduationCap,
  Lock,
  Unlock,
  KeyRound,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KioskPinModal } from './KioskPinModal';

interface KioskMonitorProps {
  gateLocation: GateLocation;
  setGateLocation: (gate: GateLocation) => void;
  schedule: SchoolSchedule;
  isMuted: boolean;
  setIsMuted?: (muted: boolean) => void;
  onOpenLogin: () => void;
  currentUser: { username: string; role: Role; name: string } | null;
  onLogout: () => void;
  onOpenDashboard: (role: Role) => void;
}

export const KioskMonitor: React.FC<KioskMonitorProps> = ({
  gateLocation,
  setGateLocation,
  schedule,
  isMuted,
  setIsMuted,
  onOpenLogin,
  currentUser,
  onLogout,
  onOpenDashboard
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [currentHour, setCurrentHour] = useState<number>(new Date().getHours());
  const [currentSchedule, setCurrentSchedule] = useState<SchoolSchedule>(schedule);
  const [recentLogs, setRecentLogs] = useState<AttendanceRecord[]>([]);
  const [allTodayLogs, setAllTodayLogs] = useState<AttendanceRecord[]>([]);
  const [arrivalFeedTab, setArrivalFeedTab] = useState<'all' | 'students' | 'teachers'>('all');

  // Kiosk Lock Screen & Security PIN state
  const [isKioskLocked, setIsKioskLocked] = useState<boolean>(() => AttendanceStorage.isKioskLocked());
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinModalTitle, setPinModalTitle] = useState<string>('Buka Kunci Layar Kiosk');
  const [pendingProtectedAction, setPendingProtectedAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    setCurrentSchedule(schedule);
  }, [schedule]);

  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    totalPresentToday: 0,
    totalOnTime: 0,
    totalLate: 0,
    totalCheckoutsToday: 0,
    totalAlpha: 0,
    frontGateCount: 0,
    backGateCount: 0
  });

  // Last Tap Result Overlay state
  const [activeOverlay, setActiveOverlay] = useState<AttendanceAttemptResult | null>(null);
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Buffer for USB RFID Card Reader wedge keyboard inputs
  const [keystrokeBuffer, setKeystrokeBuffer] = useState<string>('');
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Network & Database Real-time Health State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Baru saja');
  const [isDbInfoModalOpen, setIsDbInfoModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMobileKioskMenuOpen, setIsMobileKioskMenuOpen] = useState<boolean>(false);

  // Protected action executor that checks lock status
  const executeProtectedAction = (action: () => void, title: string = 'Buka Kunci Layar Kiosk') => {
    if (isKioskLocked) {
      setPinModalTitle(title);
      setPendingProtectedAction(() => action);
      setIsPinModalOpen(true);
    } else {
      action();
    }
  };

  const handleUnlockSuccess = () => {
    setIsPinModalOpen(false);
    if (pendingProtectedAction) {
      const action = pendingProtectedAction;
      setPendingProtectedAction(null);
      action();
    } else {
      setIsKioskLocked(false);
      AttendanceStorage.setKioskLocked(false);
      try {
        if ('keyboard' in navigator && (navigator as any).keyboard?.unlock) {
          (navigator as any).keyboard.unlock();
        }
      } catch {
        // Ignore if not supported
      }
    }
  };

  const handleToggleLock = () => {
    if (isKioskLocked) {
      setPinModalTitle('Buka Kunci Layar Kiosk');
      setPendingProtectedAction(() => {
        setIsKioskLocked(false);
        AttendanceStorage.setKioskLocked(false);
        try {
          if ('keyboard' in navigator && (navigator as any).keyboard?.unlock) {
            (navigator as any).keyboard.unlock();
          }
        } catch {
          // Ignore
        }
      });
      setIsPinModalOpen(true);
    } else {
      setIsKioskLocked(true);
      AttendanceStorage.setKioskLocked(true);

      // Otomatis aktifkan layar penuh (Fullscreen) saat mengunci layar kiosk
      const docEl = document.documentElement as any;
      const isCurrentlyFs = !!(document.fullscreenElement || docEl.webkitFullscreenElement || docEl.mozFullScreenElement || docEl.msFullscreenElement);
      if (!isCurrentlyFs) {
        const reqFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        if (reqFs) {
          reqFs.call(docEl).then(() => {
            try {
              if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
                (navigator as any).keyboard.lock(['Escape', 'F11', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F12']).catch(() => {});
              }
            } catch {
              // Ignore
            }
          }).catch(() => {});
        }
      } else {
        try {
          if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
            (navigator as any).keyboard.lock(['Escape', 'F11', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F12']).catch(() => {});
          }
        } catch {
          // Ignore
        }
      }
    }
  };

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;
      const isCurrentlyFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

      if (!isCurrentlyFs) {
        const reqFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        if (reqFs) {
          reqFs.call(docEl).then(() => {
            if (isKioskLocked) {
              try {
                if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
                  (navigator as any).keyboard.lock(['Escape', 'F11', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F12']).catch(() => {});
                }
              } catch {}
            }
          }).catch(() => {});
        }
      } else {
        const exitFs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
        if (exitFs) {
          exitFs.call(doc).catch(() => {});
        }
      }
    } catch {
      // Ignore if blocked
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const active = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      setIsFullscreen(active);

      if (active && isKioskLocked) {
        try {
          if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
            (navigator as any).keyboard.lock(['Escape', 'F11', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F12']).catch(() => {});
          }
        } catch {
          // Ignore
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isKioskLocked]);

  // Prevent context menu (right click) when Kiosk is locked
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (isKioskLocked) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, [isKioskLocked]);

  // Check Database & Network Health
  const checkDatabaseHealth = () => {
    try {
      if (typeof window !== 'undefined') {
        const testKey = '__rfid_db_health_test__';
        localStorage.setItem(testKey, Date.now().toString());
        localStorage.removeItem(testKey);
        setIsDbConnected(true);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    } catch {
      setIsDbConnected(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkDatabaseHealth();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check & interval heartbeat
    checkDatabaseHealth();
    const interval = setInterval(() => {
      checkDatabaseHealth();
      if (typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Refresh recent logs & stats for today ONLY (fresh daily start)
  const refreshLogsAndStats = () => {
    AttendanceStorage.checkAndProcessDayRollover();
    const all = AttendanceStorage.getAttendanceRecords();
    const todayStr = AttendanceStorage.getTodayDate();
    const todayLogs = all.filter(r => r.dateFormatted === todayStr);
    setAllTodayLogs(todayLogs);
    setRecentLogs(todayLogs.slice(0, 10)); // Keep up to 10 most recent taps
    setStats(AttendanceStorage.getStatsToday());
  };

  // Chronological arrival ranking today (separate for Student vs Teacher)
  const studentArrivalsToday = useMemo(() => {
    return allTodayLogs
      .filter(r => r.type === 'MASUK' && (r.userType === 'STUDENT' || (!r.userType && r.studentId)))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [allTodayLogs]);

  const teacherArrivalsToday = useMemo(() => {
    return allTodayLogs
      .filter(r => r.type === 'MASUK' && (r.userType === 'TEACHER' || !!r.teacherId))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [allTodayLogs]);

  const studentRankMap = useMemo(() => {
    const map = new Map<string, number>();
    studentArrivalsToday.forEach((rec, idx) => {
      if (rec.studentId) map.set(rec.studentId, idx + 1);
      map.set(rec.id, idx + 1);
    });
    return map;
  }, [studentArrivalsToday]);

  const teacherRankMap = useMemo(() => {
    const map = new Map<string, number>();
    teacherArrivalsToday.forEach((rec, idx) => {
      if (rec.teacherId) map.set(rec.teacherId, idx + 1);
      map.set(rec.id, idx + 1);
    });
    return map;
  }, [teacherArrivalsToday]);

  // Date watcher for automatic midnight / next-day rollover
  const [currentDateKey, setCurrentDateKey] = useState(() => AttendanceStorage.getTodayDate());

  useEffect(() => {
    const checkDateInterval = setInterval(() => {
      const todayStr = AttendanceStorage.getTodayDate();
      if (todayStr !== currentDateKey) {
        setCurrentDateKey(todayStr);
        AttendanceStorage.checkAndProcessDayRollover();
        refreshLogsAndStats();
      }
    }, 1000);
    return () => clearInterval(checkDateInterval);
  }, [currentDateKey]);

  useEffect(() => {
    refreshLogsAndStats();
    
    // Subscribe to realtime changes from other windows/tabs
    const unsubscribe = AttendanceStorage.subscribeToSync((evt) => {
      if (
        evt.type === 'ATTENDANCE_UPDATED' ||
        evt.type === 'STUDENTS_UPDATED' ||
        evt.type === 'SCHEDULE_UPDATED' ||
        evt.type === 'STORAGE_UPDATED' ||
        evt.type === 'DAY_CHANGED' ||
        evt.type === 'DAILY_RECAP_SAVED'
      ) {
        refreshLogsAndStats();
        setCurrentSchedule(AttendanceStorage.getSchedule());
      }
      if (evt.type === 'KIOSK_LOCK_CHANGED') {
        setIsKioskLocked(AttendanceStorage.isKioskLocked());
      }
    });

    return () => unsubscribe();
  }, []);

  // Realtime clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('id-ID', { hour12: false }));
      setDateStr(now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }));
      setCurrentHour(now.getHours());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine Session Type (MASUK vs PULANG) & Operational Cutoff (After 17:00)
  const [exitStartH, exitStartM] = (currentSchedule.exitStartTime || "14:00").split(':').map(Number);
  const exitStartMins = exitStartH * 60 + (exitStartM || 0);

  const [exitEndH, exitEndM] = (currentSchedule.exitEndTime || "17:00").split(':').map(Number);
  const exitEndMins = (exitEndH || 17) * 60 + (exitEndM || 0);

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const isCheckoutSession = currentMins >= exitStartMins;

  // Lewat jam batas tutup pembaca kartu: Kiosk beralih ke layar Selamat Datang (Standby) tanpa tap kartu
  const isAfterHours = currentMins >= exitEndMins;
  const isKioskClosed = isAfterHours && !currentSchedule.manualGateOverride;

  // Global Keypress Listener for USB RFID Card Readers, Fullscreen/F11 Interception & Custom Simulator Tap Event
  useEffect(() => {
    const handleCustomTap = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail && customEvt.detail.uid) {
        handleRfidCardTap(customEvt.detail.uid);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Intercept F11 (Fullscreen Toggle / Minimize)
      if (e.key === 'F11' || e.code === 'F11' || (e as any).keyCode === 122) {
        e.preventDefault();
        e.stopPropagation();
        if (isKioskLocked) {
          setPinModalTitle('Buka Kunci Layar Kiosk untuk Ubah Layar Penuh / Minimize');
          setPendingProtectedAction(() => {
            toggleFullscreen();
          });
          setIsPinModalOpen(true);
        } else {
          toggleFullscreen();
        }
        return;
      }

      // 2. Intercept Escape when locked (Prevent exiting fullscreen without PIN)
      if (e.key === 'Escape' || e.code === 'Escape' || (e as any).keyCode === 27) {
        if (isKioskLocked) {
          e.preventDefault();
          e.stopPropagation();
          if (!isPinModalOpen && !isDbInfoModalOpen && !isMobileKioskMenuOpen) {
            setPinModalTitle('Buka Kunci Layar Kiosk untuk Keluar');
            setPendingProtectedAction(() => {
              const doc = document as any;
              const exitFs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
              if (exitFs) {
                exitFs.call(doc).catch(() => {});
              }
            });
            setIsPinModalOpen(true);
          }
          return;
        }
      }

      // 3. Block Developer tools shortcuts and window close if Kiosk is locked
      if (isKioskLocked) {
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c', 'K', 'k'].includes(e.key)) ||
          (e.ctrlKey && ['u', 'U', 'r', 'R', 'w', 'W'].includes(e.key))
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Don't capture when explicitly typing in form inputs (like search bars or modal text fields)
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (keystrokeBuffer.trim().length > 0) {
          try {
            window.focus();
          } catch {
            // Ignore if window focus restricted by browser
          }
          handleRfidCardTap(keystrokeBuffer.trim());
          setKeystrokeBuffer('');
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setKeystrokeBuffer(prev => prev + e.key);

        if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = setTimeout(() => {
          setKeystrokeBuffer('');
        }, 1500);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('rfid_tap_event', handleCustomTap);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('rfid_tap_event', handleCustomTap);
    };
  }, [keystrokeBuffer, gateLocation, schedule, isMuted, isKioskClosed, isKioskLocked, isPinModalOpen, isDbInfoModalOpen, isMobileKioskMenuOpen]);

  // Execute Tap Processing
  const handleRfidCardTap = (rfidUid: string) => {
    // Jika sistem absensi sudah ditutup (lewat jam operasional selesai), abaikan tap kartu dan jangan buka modal hover
    if (isKioskClosed) {
      return;
    }

    const result = AttendanceStorage.processRfidTap(rfidUid, gateLocation);
    
    // Clear existing timer if any
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);

    // Show the enlarged 3-second presentation overlay as requested
    setActiveOverlay({
      ...result,
      scanTime: `${new Date().toLocaleTimeString('id-ID')} WIB`,
    });

    if (result.success) {
      // Audio & TTS Greeting Feedback
      if (!isMuted) {
        if (result.userType === 'TEACHER' && result.teacher) {
          if (result.status === 'TERLAMBAT') {
            soundEngine.playWarning();
            soundEngine.speakText(`Perhatian Bapak Ibu ${result.teacher.name}, Presensi Terlambat.`);
          } else if (result.record?.type === 'PULANG') {
            soundEngine.playSuccess();
            soundEngine.speakText(`Selamat Siang Bapak Ibu ${result.teacher.name}! Terima kasih dan hati-hati di jalan.`);
          } else {
            soundEngine.playSuccess();
            soundEngine.speakText(`Selamat Pagi Bapak Ibu ${result.teacher.name}! Presensi Diterima.`);
          }
        } else {
          if (result.status === 'TERLAMBAT') {
            soundEngine.playWarning();
            if (result.student) {
              soundEngine.speakText(`Perhatian! ${result.student.name}, Absen Terlambat`);
            }
          } else if (result.record?.type === 'PULANG') {
            soundEngine.playSuccess();
            if (result.student) {
              soundEngine.speakText(`SELAMAT SIANG, ${result.student.name}! Hati-hati di jalan.`);
            }
          } else {
            soundEngine.playSuccess();
            if (result.student) {
              soundEngine.speakText(`Selamat PAGI, ${result.student.name}! Absen Diterima.`);
            }
          }
        }
      }

      // Immediately refresh recent logs feed and dashboard stats
      refreshLogsAndStats();
    } else {
      // Rejection feedback with clear audio explanation
      if (!isMuted) {
        soundEngine.playError();
        if (result.reason === 'COOLDOWN_ACTIVE') {
          soundEngine.speakText(`Presensi Ditolak. Mohon tunggu beberapa detik sebelum tap ulang.`);
        } else if (result.reason === 'ALREADY_CHECKED_IN') {
          soundEngine.speakText(`Presensi Ditolak. Sudah tercatat absen masuk hari ini.`);
        } else if (result.reason === 'ALREADY_CHECKED_OUT') {
          soundEngine.speakText(`Presensi Ditolak. Sudah tercatat absen pulang hari ini.`);
        } else if (result.reason === 'UNREGISTERED_CARD') {
          soundEngine.speakText(`Presensi Ditolak. Kartu RFID belum terdaftar di sistem.`);
        } else {
          soundEngine.speakText(`Presensi Ditolak.`);
        }
      }
    }

    // Auto dismiss overlay after exactly 3 seconds as requested
    overlayTimerRef.current = setTimeout(() => {
      setActiveOverlay(null);
    }, 3000);
  };

  const gateTitle = gateLocation === 'pintu_depan' ? 'PINTU DEPAN' : 'PINTU BELAKANG';

  // Dynamic Greeting based on time
  const getGreetingText = () => {
    if (currentHour >= 5 && currentHour < 11) {
      return 'SELAMAT PAGI!';
    } else if (currentHour >= 11 && currentHour < 15) {
      return 'SELAMAT SIANG!';
    } else if (currentHour >= 15 && currentHour < 18) {
      return 'SELAMAT SORE!';
    } else {
      return 'SELAMAT MALAM!';
    }
  };

  const greeting = getGreetingText();

  return (
    <div className="h-full w-full max-w-full overflow-hidden bg-slate-100 text-slate-900 flex flex-col justify-between p-2 sm:p-3.5 font-sans select-none relative">
      
      {/* SCREEN AMBIENT RADIAL FLASH / BORDER GLOW ON TAP */}
      <AnimatePresence>
        {activeOverlay && (
          <motion.div
            key={`edge-glow-${activeOverlay.scanTime}`}
            initial={{ opacity: 0.85 }}
            animate={{ opacity: [0.85, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className={`fixed inset-0 pointer-events-none z-40 border-[8px] sm:border-[12px] ${
              activeOverlay.success
                ? activeOverlay.status === 'TERLAMBAT'
                  ? 'border-amber-500 shadow-[inset_0_0_80px_rgba(245,158,11,0.35)]'
                  : activeOverlay.record?.type === 'PULANG'
                  ? 'border-blue-500 shadow-[inset_0_0_80px_rgba(59,130,246,0.35)]'
                  : 'border-emerald-500 shadow-[inset_0_0_80px_rgba(16,185,129,0.35)]'
                : 'border-rose-500 shadow-[inset_0_0_80px_rgba(244,63,94,0.35)]'
            }`}
          />
        )}
      </AnimatePresence>
      
      {/* 1. KIOSK TOP INFO HEADER (AUTOMATICALLY HIDES ON TAP FOR 3 SECONDS TO HIGHLIGHT USER DATA) */}
      <AnimatePresence>
        {!activeOverlay && (
          <motion.div
            key="kiosk-top-navbar"
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 px-3 sm:px-4 shadow-xs shrink-0 w-full max-w-full"
          >
            
            {/* DESKTOP HEADER (LARGE SCREENS: FULL CONTROLS & GREETING) */}
            <div className="hidden lg:flex items-center justify-between gap-2 xl:gap-4 w-full min-w-0">
              {/* Left: School Logo & Brand Title matching requested design */}
              <div className="flex items-center gap-2.5 xl:gap-3.5 shrink-0">
                <div className="bg-white p-1 xl:p-1.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0">
                  <SchoolLogo size="sm" variant="full" />
                </div>
                
                <div className="flex flex-col justify-center min-w-0">
                  <span className="font-black text-sm sm:text-base xl:text-lg text-[#0f245c] tracking-tight uppercase leading-tight select-none">
                    SMK EKONOMIKA DEPOK
                  </span>
                  <span className="text-[9px] sm:text-[10px] xl:text-[11px] font-black text-slate-500 tracking-wider uppercase leading-tight select-none mt-0.5">
                    SMART SYSTEM RFID ATTENDANCE
                  </span>
                </div>
              </div>

              {/* Center: Dynamic Greeting & Realtime Clock */}
              <div className="flex items-center justify-center gap-2 xl:gap-3 text-center min-w-0 shrink">
                <div className="hidden xl:block min-w-0">
                  <span className="text-sm xl:text-base font-black text-slate-900 tracking-tight block truncate">
                    {greeting}
                  </span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block truncate">
                    {dateStr}
                  </span>
                </div>
                <div className="hidden xl:block h-6 w-px bg-slate-200 shrink-0" />
                <div className="bg-slate-900 px-2.5 xl:px-3 py-1 xl:py-1.5 rounded-xl border border-slate-800 shadow-inner shrink-0">
                  <div className="text-lg xl:text-2xl font-mono font-black text-amber-300 tracking-wider whitespace-nowrap">
                    {timeStr || '00:00:00'}
                  </div>
                </div>
              </div>

              {/* Right: Discreet System Access & Controls */}
              <div className="flex items-center gap-1.5 xl:gap-2 shrink-0">
                
                {/* 1. KIOSK LOCK SCREEN TOGGLE BUTTON */}
                <button
                  onClick={handleToggleLock}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap ${
                    isKioskLocked 
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 font-black ring-2 ring-amber-300' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                  title={isKioskLocked ? 'Layar Kiosk Terkunci PIN Keamanan (Klik untuk Buka Kunci)' : 'Kunci Layar Kiosk (Lock Screen Mode)'}
                >
                  {isKioskLocked ? <Lock className="w-3.5 h-3.5 text-slate-950" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span className="hidden 2xl:inline">{isKioskLocked ? 'Kiosk Terkunci' : 'Kunci Kiosk'}</span>
                </button>

                {/* REALTIME CONNECTION & DATABASE STATUS BADGE */}
                <button
                  onClick={() => setIsDbInfoModalOpen(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap ${
                    isOnline && isDbConnected
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  }`}
                  title="Klik untuk melihat Status Database Terhubung"
                >
                  <span className={`w-2 h-2 rounded-full ${isOnline && isDbConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="hidden 2xl:inline">{isOnline && isDbConnected ? 'Database Cloud' : 'Mode Offline'}</span>
                  <span className="hidden xl:inline 2xl:hidden">{isOnline && isDbConnected ? 'Cloud' : 'Offline'}</span>
                </button>

                {/* FULLSCREEN TOGGLE BUTTON (PROTECTED WHEN LOCKED) */}
                <button
                  onClick={() => {
                    executeProtectedAction(toggleFullscreen, 'Buka Kunci untuk Mengubah Mode Layar Penuh');
                  }}
                  className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shrink-0 cursor-pointer shadow-xs"
                  title={isFullscreen ? 'Keluar dari Layar Penuh' : 'Masuk ke Layar Penuh (Fullscreen)'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                {setIsMuted && (
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-1.5 sm:p-2 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isMuted ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={isMuted ? 'Suara Dimatikan' : 'Suara Aktif'}
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                )}

                {currentUser ? (
                  <button
                    onClick={() => {
                      executeProtectedAction(() => {
                        onOpenDashboard(currentUser.role);
                      }, 'Buka Kunci untuk Masuk Dashboard');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>{currentUser.role === 'admin' ? 'Panel Admin' : 'Guru Piket'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      executeProtectedAction(() => {
                        onOpenLogin();
                      }, 'Buka Kunci untuk Login Sistem');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Login Sistem</span>
                  </button>
                )}
              </div>
            </div>

            {/* MOBILE / TABLET COMPACT HEADER (ZERO HORIZONTAL OVERFLOW) */}
            <div className="flex lg:hidden items-center justify-between gap-2 w-full">
              {/* Left: Compact Logo & School Title */}
              <div className="flex items-center gap-2 min-w-0 shrink">
                <div className="bg-white p-1 rounded-lg border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0">
                  <SchoolLogo size="xs" variant="full" />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="text-xs sm:text-sm font-black text-[#0f245c] uppercase leading-tight truncate">
                    SMK EKONOMIKA DEPOK
                  </span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide truncate">
                    SMART SYSTEM RFID ATTENDANCE
                  </span>
                </div>
              </div>

              {/* Center: Digital Clock */}
              <div className="bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 shadow-xs shrink-0">
                <div className="text-xs sm:text-sm font-mono font-black text-amber-300 tracking-wider">
                  {timeStr || '00:00:00'}
                </div>
              </div>

              {/* Right: Lock & Hamburger Menu */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleToggleLock}
                  className={`p-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isKioskLocked ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={isKioskLocked ? 'Kiosk Terkunci PIN' : 'Kunci Kiosk'}
                >
                  {isKioskLocked ? <Lock className="w-3.5 h-3.5 text-slate-950" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>

                {setIsMuted && (
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isMuted ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title={isMuted ? 'Suara Dimatikan' : 'Suara Aktif'}
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => setIsMobileKioskMenuOpen(true)}
                  className="flex items-center gap-1 p-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer shrink-0 transition-colors"
                  aria-label="Buka Menu Kiosk"
                >
                  <Menu className="w-4 h-4" />
                  <span className="text-[11px] hidden xs:inline">Menu</span>
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE KIOSK CONTROL MODAL / DRAWER */}
      {isMobileKioskMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="fixed inset-0"
            onClick={() => setIsMobileKioskMenuOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 space-y-3.5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Kontrol Kiosk RFID</h3>
                  <p className="text-[10px] text-slate-500">{currentSchedule.schoolName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileKioskMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lock status banner in mobile drawer */}
            <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
              isKioskLocked ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                {isKioskLocked ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4 text-slate-500" />}
                <span className="font-bold">{isKioskLocked ? 'Mode Kiosk Terkunci' : 'Kiosk Tidak Terkunci'}</span>
              </div>
              <button
                onClick={() => {
                  setIsMobileKioskMenuOpen(false);
                  handleToggleLock();
                }}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] cursor-pointer"
              >
                {isKioskLocked ? 'Buka PIN' : 'Kunci'}
              </button>
            </div>

            {/* Gate Location Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Lokasi Pintu Gate RFID
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    executeProtectedAction(() => {
                      setGateLocation('pintu_depan');
                      setIsMobileKioskMenuOpen(false);
                    }, 'Buka Kunci untuk Ganti Gerbang');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    gateLocation === 'pintu_depan'
                      ? 'bg-blue-600 text-white shadow-md font-black'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Pintu Depan</span>
                </button>
                <button
                  onClick={() => {
                    executeProtectedAction(() => {
                      setGateLocation('pintu_belakang');
                      setIsMobileKioskMenuOpen(false);
                    }, 'Buka Kunci untuk Ganti Gerbang');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    gateLocation === 'pintu_belakang'
                      ? 'bg-blue-600 text-white shadow-md font-black'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Pintu Belakang</span>
                </button>
              </div>
            </div>

            {/* Quick Actions & Toggles */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => {
                  executeProtectedAction(() => {
                    toggleFullscreen();
                    setIsMobileKioskMenuOpen(false);
                  }, 'Buka Kunci untuk Mengubah Mode Layar Penuh');
                }}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Keluar Mode Layar Penuh' : 'Layar Penuh (Fullscreen)'}</span>
              </button>

              <button
                onClick={() => {
                  executeProtectedAction(() => {
                    setIsDbInfoModalOpen(true);
                    setIsMobileKioskMenuOpen(false);
                  }, 'Buka Kunci untuk Lihat Status Database');
                }}
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Status Database Cloud</span>
              </button>

              {currentUser ? (
                <button
                  onClick={() => {
                    executeProtectedAction(() => {
                      onOpenDashboard(currentUser.role);
                      setIsMobileKioskMenuOpen(false);
                    }, 'Buka Kunci untuk Masuk Dashboard');
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Buka {currentUser.role === 'admin' ? 'Panel Super Admin' : 'Dashboard Guru Piket'}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    executeProtectedAction(() => {
                      onOpenLogin();
                      setIsMobileKioskMenuOpen(false);
                    }, 'Buka Kunci untuk Login Sistem');
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <LogOut className="w-4 h-4 rotate-180" />
                  <span>Login Petugas / Admin</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 2. MAIN CENTER CONTENT CONTAINER (12 COLS FULL WIDTH + INLINE RESULT + HORIZONTAL RECENT LOGS) */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-2.5 my-1.5 overflow-hidden">
        
        {/* TOP MAIN BOX: KOLOM TAP KARTU RFID (12 COLS FULL WIDTH WITH INLINE TAP RESULT) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-3 sm:p-4 flex flex-col justify-between gap-2.5 relative shadow-xs overflow-hidden flex-1 min-h-0">
          
          {/* HIGH-CONTRAST SESSION HEADER & PROMINENT SCHEDULE HIGHLIGHT (HIDES ON TAP FOR EXPANDED HOVER VIEW) */}
          <AnimatePresence>
            {!activeOverlay && (
              <motion.div
                key="session-header-strip"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 shrink-0 overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Clean Session Title Badge */}
                  <span className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-2xs ${
                    isKioskClosed
                      ? 'bg-slate-800 text-white'
                      : isCheckoutSession
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {isKioskClosed ? 'OPERASIONAL SELESAI' : isCheckoutSession ? 'SESI PULANG' : 'SESI MASUK'}
                  </span>

                  {/* HIGH-CONTRAST HIGHLIGHTED TIME SCHEDULES */}
                  {isKioskClosed ? (
                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-300 px-3 py-1 rounded-xl text-xs">
                      <span className="text-slate-700 font-bold uppercase">Status Gerbang:</span>
                      <strong className="font-mono text-xs sm:text-sm font-black text-slate-900">
                        Ditutup (Lewat {currentSchedule.exitEndTime || '17:00'} WIB) • Sesi Masuk Besok {currentSchedule.entryStartTime || '06:00'} WIB
                      </strong>
                    </div>
                  ) : isCheckoutSession ? (
                    <div className="flex items-center gap-2 bg-blue-50/90 border border-blue-200 px-3 py-1 rounded-xl text-xs">
                      <span className="text-blue-800 font-bold uppercase">Jam Pulang:</span>
                      <strong className="font-mono text-sm sm:text-base font-black text-blue-950">
                        {currentSchedule.exitStartTime} - {currentSchedule.exitEndTime || '17:00'} WIB
                      </strong>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-2 bg-emerald-50/90 border border-emerald-200 px-3 py-1 rounded-xl">
                        <span className="text-emerald-800 font-bold uppercase">Jam Masuk:</span>
                        <strong className="font-mono text-sm sm:text-base font-black text-emerald-950">
                          {currentSchedule.entryStartTime} - {currentSchedule.entryDeadlineTime} WIB
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 bg-amber-50/90 border border-amber-200 px-3 py-1 rounded-xl">
                        <span className="text-amber-800 font-bold uppercase">Batas Tepat Waktu:</span>
                        <strong className="font-mono text-sm sm:text-base font-black text-amber-950">
                          {currentSchedule.entryDeadlineTime} WIB
                        </strong>
                      </div>
                      <div className="hidden lg:flex items-center gap-2 bg-blue-50/90 border border-blue-200 px-3 py-1 rounded-xl">
                        <span className="text-blue-800 font-bold uppercase">Jam Pulang:</span>
                        <strong className="font-mono text-sm font-black text-blue-950">
                          {currentSchedule.exitStartTime} WIB
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Clean Unified Gate Switcher Below Navbar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs shrink-0 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        executeProtectedAction(() => {
                          setGateLocation('pintu_depan');
                        }, 'Buka Kunci untuk Ganti Gerbang');
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        gateLocation === 'pintu_depan'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Pintu Depan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        executeProtectedAction(() => {
                          setGateLocation('pintu_belakang');
                        }, 'Buka Kunci untuk Ganti Gerbang');
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        gateLocation === 'pintu_belakang'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Pintu Belakang</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN INLINE TAP CARD CONTAINER (STANDBY WELCOME SCREEN OR ENLARGED INLINE RESULT OR ACTIVE TAP TARGET) */}
          <div className="flex-1 min-h-0 flex flex-col justify-center items-center w-full relative overflow-hidden">
            <AnimatePresence mode="popLayout">
              {isKioskClosed ? (
                /* STANDBY / WELCOME DISPLAY (AFTER CLOSED STATE - COMPACT & PERFECTLY FITTING) */
                <motion.div
                  key="closed-standby-screen"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="w-full h-full p-3 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-center flex flex-col items-center justify-center gap-2 sm:gap-3 shadow-xs overflow-y-auto"
                >
                  <div className="space-y-1 max-w-xl shrink-0">
                    <span className="text-[10px] sm:text-xs font-black tracking-widest text-slate-700 uppercase bg-slate-100 border border-slate-200 px-3 py-0.5 rounded-full inline-block">
                      {currentSchedule.schoolName}
                    </span>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                      Selamat Datang di Sistem Absensi RFID
                    </h2>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-slate-900 text-amber-300 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black shadow-xs shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>LAYANAN ABSENSI HARI INI TELAH SELESAI (LEWAT PKL {currentSchedule.exitEndTime || '17:00'} WIB)</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3.5 max-w-lg w-full text-slate-700 text-xs sm:text-sm space-y-1.5 sm:space-y-2 shadow-2xs shrink-0">
                    <p className="font-medium text-slate-600 text-[11px] sm:text-xs leading-snug">
                      Gerbang absensi RFID telah ditutup untuk hari ini. Sistem akan otomatis aktif kembali membuka tap kartu besok pagi:
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-xs pt-0.5">
                      <div className="p-2 sm:p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 text-center">
                        <span className="text-slate-500 font-bold block uppercase text-[9px] sm:text-[10px] tracking-wider">Sesi Masuk Besok</span>
                        <strong className="text-emerald-700 font-black text-xs sm:text-sm font-mono block mt-0.5">
                          {currentSchedule.entryStartTime} - {currentSchedule.entryDeadlineTime} WIB
                        </strong>
                      </div>
                      <div className="p-2 sm:p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 text-center">
                        <span className="text-slate-500 font-bold block uppercase text-[9px] sm:text-[10px] tracking-wider">Sesi Pulang Besok</span>
                        <strong className="text-blue-700 font-black text-xs sm:text-sm font-mono block mt-0.5">
                          {currentSchedule.exitStartTime} - {currentSchedule.exitEndTime || '17:00'} WIB
                        </strong>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activeOverlay ? (
                /* ENLARGED TAP RESULT CARD (EXPANDS TO FILL SCREEN & HIDES OTHER PANELS FOR 3 SECONDS) */
                <motion.div
                  key={`inline-result-${activeOverlay.teacher?.id || activeOverlay.student?.id || activeOverlay.rfidUid}-${activeOverlay.scanTime}`}
                  initial={{ opacity: 0, scale: 0.86, y: 20 }}
                  animate={{ opacity: 1, scale: [0.86, 1.04, 1], y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -20 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`w-full h-full p-4 sm:p-6 lg:p-8 rounded-3xl border-4 text-center flex flex-col items-center justify-between relative overflow-hidden shadow-2xl transition-all ${
                    activeOverlay.success
                      ? activeOverlay.status === 'TERLAMBAT'
                        ? 'bg-gradient-to-b from-amber-50/98 via-amber-50/50 to-white border-amber-500 shadow-amber-500/15'
                        : activeOverlay.record?.type === 'PULANG'
                        ? 'bg-gradient-to-b from-blue-50/98 via-blue-50/50 to-white border-blue-500 shadow-blue-500/15'
                        : 'bg-gradient-to-b from-emerald-50/98 via-emerald-50/50 to-white border-emerald-500 shadow-emerald-500/15'
                      : 'bg-gradient-to-b from-rose-50/98 via-rose-50/50 to-white border-rose-500 shadow-rose-500/15'
                  }`}
                >
                  {/* Manual Close / Dismiss Button */}
                  <button
                    onClick={() => setActiveOverlay(null)}
                    className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-800 bg-white/90 hover:bg-white rounded-full transition-all border border-slate-200 shadow-sm cursor-pointer z-10"
                    title="Tutup Hasil Tap"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>

                  <div className="flex flex-col lg:flex-row items-center justify-center gap-5 sm:gap-8 lg:gap-10 w-full max-w-5xl mx-auto my-auto py-2">
                    {/* Enlarged High-Res Avatar Photo / Icon Box */}
                    <div className="relative shrink-0">
                      {activeOverlay.reason === 'UNREGISTERED_CARD' ? (
                        <div className="w-32 h-32 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-3xl border-4 border-rose-500 bg-rose-100/90 text-rose-600 flex flex-col items-center justify-center shadow-2xl p-3 ring-4 ring-rose-400/30">
                          <AlertTriangle className="w-14 h-14 sm:w-20 sm:h-20 text-rose-600 animate-bounce mb-1" />
                          <span className="text-[10px] sm:text-xs font-black text-rose-950 uppercase tracking-wider">KARTU BELUM DAFTAR</span>
                        </div>
                      ) : (
                        <img
                          src={
                            activeOverlay.teacher?.avatarUrl || 
                            activeOverlay.student?.avatarUrl || 
                            (activeOverlay.teacher
                              ? (activeOverlay.teacher.gender === 'P'
                                  ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80"
                                  : "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80")
                              : (activeOverlay.student?.gender === 'P'
                                  ? "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80"
                                  : "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80"))
                          }
                          alt={activeOverlay.teacher?.name || activeOverlay.student?.name || "Kartu RFID"}
                          className={`w-32 h-32 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-3xl object-cover border-4 shadow-2xl transition-all ${
                            activeOverlay.success 
                              ? activeOverlay.status === 'TERLAMBAT' 
                                ? 'border-amber-500 ring-4 ring-amber-400/30' 
                                : activeOverlay.record?.type === 'PULANG'
                                ? 'border-blue-500 ring-4 ring-blue-400/30'
                                : 'border-emerald-500 ring-4 ring-emerald-400/30' 
                              : 'border-rose-500 ring-4 ring-rose-400/30'
                          }`}
                        />
                      )}
                      
                      <div className={`absolute -bottom-2 -right-2 p-2.5 rounded-full text-white shadow-xl ${
                        activeOverlay.success 
                          ? activeOverlay.record?.type === 'PULANG'
                            ? 'bg-blue-600'
                            : activeOverlay.status === 'TERLAMBAT'
                            ? 'bg-amber-600'
                            : 'bg-emerald-600' 
                          : 'bg-rose-600'
                      }`}>
                        {activeOverlay.success ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                    </div>

                    {/* Details Info with Enlarged Typography - Full Text Readability (No Truncation) */}
                    <div className="text-left space-y-2.5 sm:space-y-3 flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Role Indicator Badge */}
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-xs ${
                          activeOverlay.teacher || activeOverlay.userType === 'TEACHER'
                            ? 'bg-slate-900 text-white border border-slate-700'
                            : activeOverlay.reason === 'UNREGISTERED_CARD'
                            ? 'bg-rose-900 text-rose-100 border border-rose-700'
                            : 'bg-blue-900 text-blue-100 border border-blue-700'
                        }`}>
                          {activeOverlay.teacher || activeOverlay.userType === 'TEACHER' 
                            ? 'GURU / TENAGA KEPENDIDIKAN' 
                            : activeOverlay.reason === 'UNREGISTERED_CARD'
                            ? 'KARTU RFID TIDAK DIKENALI'
                            : 'SISWA'}
                        </span>

                        <span className={`inline-block px-3.5 py-1 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider shadow-xs ${
                          activeOverlay.success
                            ? activeOverlay.status === 'TERLAMBAT'
                              ? 'bg-amber-500 text-slate-950 font-black border border-amber-600'
                              : activeOverlay.record?.type === 'PULANG'
                              ? 'bg-blue-600 text-white font-black border border-blue-700'
                              : 'bg-emerald-600 text-white font-black border border-emerald-700'
                            : 'bg-rose-600 text-white font-black border border-rose-700'
                        }`}>
                          {activeOverlay.success
                            ? activeOverlay.status === 'TERLAMBAT'
                              ? 'PRESENSI DITERIMA (TERLAMBAT)'
                              : activeOverlay.record?.type === 'PULANG'
                              ? 'PRESENSI PULANG DITERIMA'
                              : 'PRESENSI DITERIMA (TEPAT WAKTU)'
                            : activeOverlay.reason === 'UNREGISTERED_CARD'
                            ? 'PRESENSI DITOLAK: KARTU BELUM TERDAFTAR'
                            : activeOverlay.reason === 'COOLDOWN_ACTIVE'
                            ? 'PRESENSI DITOLAK: JEDA COOLDOWN AKTIF'
                            : activeOverlay.reason === 'ALREADY_CHECKED_IN'
                            ? 'PRESENSI DITOLAK: SUDAH ABSEN MASUK'
                            : activeOverlay.reason === 'ALREADY_CHECKED_OUT'
                            ? 'PRESENSI DITOLAK: SUDAH ABSEN PULANG'
                            : 'PRESENSI DITOLAK'}
                        </span>

                        <span className="px-3 py-1 bg-white/90 text-slate-700 rounded-lg text-xs font-mono font-bold border border-slate-300 shadow-2xs">
                          {gateTitle}
                        </span>

                        {activeOverlay.success && activeOverlay.record?.type === 'MASUK' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-400 text-slate-950 rounded-lg text-xs sm:text-sm font-black border border-amber-500 shadow-xs">
                            <Award className="w-4 h-4 text-amber-900" />
                            <span>
                              {activeOverlay.arrivalRankText ||
                                (activeOverlay.teacher || activeOverlay.userType === 'TEACHER'
                                  ? `Guru Ke-${(activeOverlay.teacher?.id && teacherRankMap.get(activeOverlay.teacher.id)) || (teacherArrivalsToday.length)}`
                                  : `Siswa Ke-${(activeOverlay.student?.id && studentRankMap.get(activeOverlay.student.id)) || (studentArrivalsToday.length)}`)}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Main Full Name - Wrap Cleanly Without Ellipsis */}
                      <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight break-words whitespace-normal">
                        {activeOverlay.teacher?.name || 
                         activeOverlay.student?.name || 
                         (activeOverlay.reason === 'UNREGISTERED_CARD' ? 'Kartu RFID Belum Terdaftar' : 'Presensi Ditolak')}
                      </h3>

                      {/* Full Descriptive Message / Reason Explanation */}
                      <p className="text-slate-800 text-sm sm:text-base lg:text-lg font-bold leading-relaxed break-words whitespace-normal">
                        {activeOverlay.reason === 'UNREGISTERED_CARD'
                          ? `Kartu RFID dengan nomor UID [${activeOverlay.rfidUid || '-'}] belum terdaftar dalam sistem sekolah. Silakan daftarkan kartu ini melalui menu Master Siswa atau Master Guru.`
                          : activeOverlay.reason === 'COOLDOWN_ACTIVE'
                          ? `Kartu baru saja di-tap. Mohon tunggu beberapa detik sebelum tap ulang untuk mencegah pencatatan ganda.`
                          : activeOverlay.message}
                      </p>

                      {/* Enlarged Info Grid Pills: Clear & Fully Legible Text */}
                      {activeOverlay.teacher || activeOverlay.userType === 'TEACHER' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1.5 text-xs">
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-slate-500 text-[10px] sm:text-[11px] font-black block uppercase">JABATAN / MAPEL</span>
                            <strong className="text-slate-900 text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.teacher?.position || '-'}
                            </strong>
                          </div>
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-slate-500 text-[10px] sm:text-[11px] font-black block uppercase">NIP / NUPTK</span>
                            <strong className="text-slate-900 font-mono text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.teacher?.nip || '-'}
                            </strong>
                          </div>
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-slate-500 text-[10px] sm:text-[11px] font-black block uppercase">NOMOR KARTU RFID</span>
                            <strong className="text-amber-800 font-mono text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.teacher?.rfidUid || activeOverlay.rfidUid || '-'}
                            </strong>
                          </div>
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-slate-500 text-[10px] sm:text-[11px] font-black block uppercase">WAKTU TAP</span>
                            <strong className="text-blue-800 font-mono text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.record?.timeFormatted 
                                ? `${activeOverlay.record.timeFormatted} WIB` 
                                : activeOverlay.scanTime || `${new Date().toLocaleTimeString('id-ID')} WIB`}
                            </strong>
                          </div>
                        </div>
                      ) : activeOverlay.student ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1.5 text-xs">
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-slate-500 text-[10px] sm:text-[11px] font-bold block uppercase">KELAS</span>
                            <strong className="text-slate-900 text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.student.class || '-'}
                            </strong>
                          </div>
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-slate-500 text-[10px] sm:text-[11px] font-bold block uppercase">NISN</span>
                            <strong className="text-slate-900 font-mono text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.student.nisn || '-'}
                            </strong>
                          </div>
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-slate-500 text-[10px] sm:text-[11px] font-bold block uppercase">NOMOR KARTU RFID</span>
                            <strong className="text-amber-800 font-mono text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.student.rfidUid || activeOverlay.rfidUid || '-'}
                            </strong>
                          </div>
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-slate-500 text-[10px] sm:text-[11px] font-bold block uppercase">WAKTU TAP</span>
                            <strong className="text-blue-800 font-mono text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.record?.timeFormatted 
                                ? `${activeOverlay.record.timeFormatted} WIB` 
                                : activeOverlay.scanTime || `${new Date().toLocaleTimeString('id-ID')} WIB`}
                            </strong>
                          </div>
                        </div>
                      ) : (
                        /* Unregistered or Unknown Card Detail Grid */
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1.5 text-xs">
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-rose-200 shadow-xs">
                            <span className="text-rose-700 text-[10px] sm:text-[11px] font-black block uppercase">STATUS KARTU</span>
                            <strong className="text-rose-900 text-sm sm:text-base font-black break-words block mt-0.5">
                              Belum Terdaftar
                            </strong>
                          </div>
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-rose-200 shadow-xs">
                            <span className="text-rose-700 text-[10px] sm:text-[11px] font-black block uppercase">UID RFID TERBACA</span>
                            <strong className="text-amber-800 font-mono text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.rfidUid || '-'}
                            </strong>
                          </div>
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-rose-200 shadow-xs">
                            <span className="text-rose-700 text-[10px] sm:text-[11px] font-black block uppercase">LOKASI GERBANG</span>
                            <strong className="text-slate-900 text-sm sm:text-base font-black break-words block mt-0.5">
                              {gateTitle}
                            </strong>
                          </div>
                          <div className="bg-white/95 p-2 sm:p-2.5 rounded-xl border border-rose-200 shadow-xs">
                            <span className="text-rose-700 text-[10px] sm:text-[11px] font-black block uppercase">WAKTU TAP</span>
                            <strong className="text-blue-800 font-mono text-sm sm:text-base font-black break-words block mt-0.5">
                              {activeOverlay.scanTime || `${new Date().toLocaleTimeString('id-ID')} WIB`}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3-Second Visual Countdown Progress Line & Indicator */}
                  <div className="w-full max-w-3xl mx-auto space-y-1.5 pt-2 shrink-0">
                    <div className="w-full bg-slate-200/90 rounded-full h-2.5 overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 3, ease: "linear" }}
                        className={`h-full ${
                          activeOverlay.success
                            ? activeOverlay.status === 'TERLAMBAT'
                              ? 'bg-amber-500'
                              : activeOverlay.record?.type === 'PULANG'
                              ? 'bg-blue-600'
                              : 'bg-emerald-500'
                            : 'bg-rose-600'
                        }`}
                      />
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-600 font-bold tracking-wide flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span>Menampilkan data presensi (layar otomatis kembali siap tap dalam 3 detik)</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* STANDBY TAP CARD TARGET BOX */
                <motion.div
                  key="standby-target"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`w-full h-full py-4 sm:py-5 lg:py-6 px-4 rounded-2xl border-3 border-dashed text-center flex flex-col items-center justify-center transition-all ${
                    isCheckoutSession
                      ? 'bg-gradient-to-b from-blue-50/90 via-slate-50/50 to-white border-blue-400 shadow-[0_4px_25px_rgba(59,130,246,0.06)]'
                      : 'bg-gradient-to-b from-emerald-50/90 via-slate-50/50 to-white border-emerald-400 shadow-[0_4px_25px_rgba(16,185,129,0.06)]'
                  }`}
                >
                  {/* Big Card Icon with Pulse */}
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl border-2 flex items-center justify-center mb-2 sm:mb-3 shadow-lg relative shrink-0 ${
                    isCheckoutSession
                      ? 'bg-blue-600 text-white border-blue-300 shadow-blue-600/20'
                      : 'bg-emerald-600 text-white border-emerald-300 shadow-emerald-600/20'
                  }`}>
                    <CreditCard className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 animate-pulse" />
                    <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full animate-ping ${
                      isCheckoutSession ? 'bg-blue-300' : 'bg-emerald-300'
                    }`} />
                  </div>

                  {/* Column Label */}
                  <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 uppercase tracking-tight mb-1 shrink-0 leading-tight">
                    TAP KARTU RFID
                  </h2>

                  <p className="text-slate-700 font-extrabold text-xs sm:text-sm max-w-xl mx-auto mb-2 sm:mb-3 leading-snug shrink-0">
                    {isCheckoutSession
                      ? 'Tempelkan Kartu Pelajar RFID Anda ke alat pembaca sebelum keluar area sekolah'
                      : 'Tempelkan Kartu Pelajar RFID Anda ke alat pembaca di gerbang untuk verifikasi kehadiran'}
                  </p>

                  {/* Active Reader Status */}
                  <div className="inline-flex items-center gap-2 bg-white border-2 border-emerald-300 text-emerald-900 px-3.5 py-1.5 rounded-full text-xs font-mono font-black shadow-xs shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>READER HARDFILE READY ({gateTitle})</span>
                    {keystrokeBuffer.length > 0 && (
                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black animate-pulse ml-1.5">
                        Membaca RFID...
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Quick Stats Row (HIDES ON TAP FOR EXPANDED HOVER VIEW) */}
          <AnimatePresence>
            {!activeOverlay && (
              <motion.div
                key="bottom-stats-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center text-xs shrink-0 overflow-hidden"
              >
                <div className="bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-500 text-[9px] sm:text-[10px] block font-bold uppercase truncate">TOTAL SISWA</span>
                  <strong className="text-slate-900 text-xs sm:text-sm lg:text-base font-black">{stats.totalStudents}</strong>
                </div>
                <div className="bg-emerald-50/80 p-1.5 sm:p-2 rounded-xl border border-emerald-200/80 shadow-2xs">
                  <span className="text-emerald-700 text-[9px] sm:text-[10px] block font-bold uppercase truncate">TEPAT WAKTU</span>
                  <strong className="text-emerald-900 text-xs sm:text-sm lg:text-base font-black">{stats.totalOnTime}</strong>
                </div>
                <div className="bg-amber-50/80 p-1.5 sm:p-2 rounded-xl border border-amber-200/80 shadow-2xs">
                  <span className="text-amber-700 text-[9px] sm:text-[10px] block font-bold uppercase truncate">TERLAMBAT</span>
                  <strong className="text-amber-900 text-xs sm:text-sm lg:text-base font-black">{stats.totalLate}</strong>
                </div>
                <div className="bg-blue-50/80 p-1.5 sm:p-2 rounded-xl border border-blue-200/80 shadow-2xs">
                  <span className="text-blue-700 text-[9px] sm:text-[10px] block font-bold uppercase truncate">SUDAH PULANG</span>
                  <strong className="text-blue-900 text-xs sm:text-sm lg:text-base font-black">{stats.totalCheckoutsToday}</strong>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* BOTTOM HORIZONTAL STRIP: ABSENSI TERKINI (HIDES ON TAP FOR EXPANDED HOVER VIEW) */}
        <AnimatePresence>
          {!activeOverlay && (
            <motion.div
              key="recent-attendance-bar"
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-xs shrink-0 w-full overflow-hidden"
            >
              
              <div className="flex flex-wrap items-center justify-between pb-1.5 border-b border-slate-100 shrink-0 mb-2 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                      {isKioskClosed ? 'Rekap Absensi Hari Ini' : 'Feed Absensi & Urutan Kedatangan'}
                    </h3>
                  </div>

                  {/* Filter Tabs: Semua / Siswa / Guru */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setArrivalFeedTab('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        arrivalFeedTab === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua Terkini ({allTodayLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setArrivalFeedTab('students')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        arrivalFeedTab === 'students'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <GraduationCap className="w-3 h-3" />
                      <span>Urutan Siswa ({studentArrivalsToday.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setArrivalFeedTab('teachers')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        arrivalFeedTab === 'teachers'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Urutan Guru ({teacherArrivalsToday.length})</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                    isKioskClosed
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {!isKioskClosed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                    {isKioskClosed ? 'STANDBY' : 'LIVE FEED'}
                  </span>
                  {!isKioskClosed && (
                    <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline-block">
                      • Cooldown: {currentSchedule.cooldownSeconds}s
                    </span>
                  )}
                </div>
              </div>

              {/* HORIZONTAL GRID FOR TAP LOGS WITH RANKING */}
              {(() => {
                const logsToRender = arrivalFeedTab === 'students'
                  ? studentArrivalsToday.slice(0, 8)
                  : arrivalFeedTab === 'teachers'
                  ? teacherArrivalsToday.slice(0, 8)
                  : recentLogs.slice(0, 8);

                if (logsToRender.length === 0) {
                  return (
                    <div className="col-span-full text-center py-3 text-slate-400 font-bold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 p-2">
                      {arrivalFeedTab === 'students' 
                        ? 'Belum ada siswa yang hadir masuk hari ini.' 
                        : arrivalFeedTab === 'teachers'
                        ? 'Belum ada guru yang hadir masuk hari ini.'
                        : 'Belum ada data tap kartu hari ini.'}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 w-full">
                    {logsToRender.map((log, idx) => {
                      const isTeacher = log.userType === 'TEACHER' || !!log.teacherId || !!log.teacherName;
                      const displayName = isTeacher ? (log.teacherName || 'Guru') : (log.studentName || 'Siswa');
                      const subLabel = isTeacher ? (log.teacherPosition || 'Guru / PTK') : (log.studentClass || 'Siswa');
                      const isLatestTapped = activeOverlay?.record?.id === log.id || idx === 0;
                      
                      // Calculate arrival rank
                      const isEntry = log.type === 'MASUK';
                      const rankNum = isEntry 
                        ? (isTeacher 
                            ? (log.teacherId ? teacherRankMap.get(log.teacherId) : undefined)
                            : (log.studentId ? studentRankMap.get(log.studentId) : undefined))
                        : undefined;

                      return (
                        <div
                          key={log.id}
                          className={`p-2 border rounded-xl flex flex-col justify-between gap-1.5 transition-all shadow-2xs overflow-hidden relative ${
                            isLatestTapped && activeOverlay
                              ? 'ring-2 ring-blue-500 scale-[1.02] shadow-md bg-blue-50/90 border-blue-300'
                              : isTeacher 
                              ? 'bg-slate-50/90 border-slate-200/90 hover:border-slate-300'
                              : 'bg-slate-50/90 border-slate-200/80 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {rankNum !== undefined ? (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-0.5 ${
                                  rankNum === 1
                                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-500'
                                    : rankNum === 2
                                    ? 'bg-slate-300 text-slate-900 font-black ring-1 ring-slate-400'
                                    : rankNum === 3
                                    ? 'bg-amber-700 text-amber-50 font-black'
                                    : 'bg-slate-200 text-slate-800 font-bold'
                                }`}>
                                  {rankNum === 1 ? '🥇 #1' : rankNum === 2 ? '🥈 #2' : rankNum === 3 ? '🥉 #3' : `#${rankNum}`}
                                </span>
                              ) : (
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[9px] shrink-0 ${
                                  isTeacher ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'
                                }`}>
                                  {displayName.charAt(0)}
                                </div>
                              )}
                              
                              <span className="text-[9px] font-mono text-slate-500 font-bold">
                                {log.timeFormatted}
                              </span>
                            </div>

                            <span className={`px-1 py-0.2 text-[8px] font-black uppercase rounded shrink-0 ${
                              log.status === 'TEPAT_WAKTU'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'TERLAMBAT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {log.status === 'TEPAT_WAKTU' ? 'TEPAT' : log.status === 'TERLAMBAT' ? 'LATE' : 'PULANG'}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="font-black text-slate-900 text-xs truncate leading-tight" title={displayName}>
                              {displayName}
                            </p>
                            <span className="text-[9px] text-slate-500 font-semibold block truncate">
                              {subLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 3. FOOTER MARQUEE BANNER (PROPORTIONAL & HIGH CONTRAST) */}
      {(() => {
        const themeConfig = MARQUEE_THEMES_CONFIG[currentSchedule.marqueeTheme || 'gold'] || MARQUEE_THEMES_CONFIG.gold;
        const displayMode = currentSchedule.marqueeDisplayMode || 'marquee_scroll';
        const isCentered = displayMode === 'center_pulse' || displayMode === 'center_static';
        const isPulsing = displayMode === 'center_pulse';
        
        const speedClass = currentSchedule.marqueeSpeed === 'slow'
          ? 'animate-marquee-slow'
          : currentSchedule.marqueeSpeed === 'fast'
          ? 'animate-marquee-fast'
          : currentSchedule.marqueeSpeed === 'ultra_fast'
          ? 'animate-marquee-ultra-fast'
          : 'animate-marquee-normal';

        const fontSizeClass = currentSchedule.marqueeFontSize === 'sm'
          ? 'text-xs sm:text-sm lg:text-base font-bold'
          : currentSchedule.marqueeFontSize === 'lg'
          ? 'text-base sm:text-lg lg:text-xl font-black'
          : currentSchedule.marqueeFontSize === 'xl'
          ? 'text-lg sm:text-xl lg:text-2xl font-black'
          : 'text-sm sm:text-base lg:text-lg font-extrabold';

        const badgeIcon = currentSchedule.marqueeBadgeIcon || (isCheckoutSession ? '👋' : '📢');
        const badgeText = currentSchedule.marqueeBadgeText || (isCheckoutSession ? 'SESI PULANG' : 'PENGUMUMAN');
        const announcementText = isCheckoutSession
          ? (currentSchedule.announcementTextExit || currentSchedule.announcementText || 'Selamat Pulang Siswa-Siswi & Guru SMK Ekonomika Depok! Hati-hati di perjalanan pulang.')
          : (currentSchedule.announcementTextEntry || currentSchedule.announcementText || 'Selamat Datang di SMK Ekonomika Depok! Awali hari dengan disiplin & tap kartu RFID.');

        return (
          <div className={`${themeConfig.bgClass} border-2 ${themeConfig.borderClass} ${themeConfig.accentGlowClass} rounded-2xl h-12 sm:h-14 lg:h-16 flex items-center px-3 sm:px-4 overflow-hidden shadow-lg shrink-0 w-full relative transition-all duration-300`}>
            
            {/* Badge Indicator */}
            <div className={`flex items-center gap-1.5 ${themeConfig.badgeBgClass} px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl text-xs font-black shrink-0 shadow-md z-10 mr-3 select-none`}>
              <span className="text-sm leading-none">{badgeIcon}</span>
              <span className={`uppercase tracking-wider text-[11px] sm:text-xs ${themeConfig.badgeTextClass} font-black hidden xs:inline`}>
                {badgeText}
              </span>
            </div>

            {/* Mode 1: Center Mode (Static or Pulsing Glow) */}
            {isCentered ? (
              <div className="flex-1 flex items-center justify-center text-center overflow-hidden px-2">
                <div className={`flex items-center justify-center gap-2 max-w-full ${isPulsing ? 'animate-pulse-glow' : ''}`}>
                  <span className={`${fontSizeClass} ${themeConfig.textClass} uppercase tracking-wide truncate block`}>
                    {announcementText}
                  </span>
                </div>
              </div>
            ) : (
              /* Mode 2: Continuous Marquee Scrolling */
              <div className="overflow-hidden whitespace-nowrap flex-1 flex items-center">
                <div className={`${speedClass} gap-12 flex items-center`}>
                  <span className={`shrink-0 ${fontSizeClass} ${themeConfig.textClass} uppercase tracking-wide`}>
                    {announcementText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  </span>
                  <span className={`shrink-0 ${fontSizeClass} ${themeConfig.textClass} uppercase tracking-wide`}>
                    {announcementText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  </span>
                </div>
              </div>
            )}

            {/* Right Subtle Ambient Sparkle / Pulse dot */}
            <div className="hidden md:flex items-center gap-1.5 ml-3 shrink-0 z-10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">LIVE</span>
            </div>

          </div>
        );
      })()}

      {/* MODAL STATUS KONEKSI & DIAGNOSTIK DATABASE */}
      <AnimatePresence>
        {isDbInfoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-slate-800 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Status Koneksi & Database</h3>
                    <p className="text-xs text-slate-500 font-semibold">Spesifikasi penyimpanan data sistem RFID</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDbInfoModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                isOnline && isDbConnected
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}>
                {isOnline && isDbConnected ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Wifi className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <WifiOff className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    {isOnline && isDbConnected ? '🟢 SISTEM ONLINE & DATABASE AKTIF' : '🟡 MODE OFFLINE MANDIRI (STANDALONE)'}
                  </h4>
                  <p className="text-xs mt-0.5 font-medium opacity-90">
                    {isOnline && isDbConnected
                      ? 'Koneksi aktif. Seluruh data absensi tersimpan secara instan dan sinkron di multi-layar monitor.'
                      : 'Internet tidak terdeteksi. Jangan khawatir, sistem offline-first tetap mencatat tap kartu RFID di database lokal tanpa gangguan.'}
                  </p>
                </div>
              </div>

              {/* Detail Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Tipe Database</span>
                  <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                    Web Storage & State Engine
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-1">Struktur JSON Terenkapsulasi</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Sinkronisasi Realtime</span>
                  <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    BroadcastChannel API
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-1">Multi-Tab & Multi-Window Sync</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Kecepatan Tap RFID</span>
                  <p className="font-bold text-slate-900 mt-0.5 font-mono text-emerald-600">
                    &lt; 10 ms (Zero Latency)
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-1">Respons instan tanpa jeda web</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Status Rekam Data</span>
                  <p className="font-bold text-slate-900 mt-0.5 font-mono">
                    {stats.totalStudents} Siswa • {stats.totalPresentToday} Hadir
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-1">Waktu Sync: {lastSyncTime}</span>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-1 flex justify-end">
                <button
                  onClick={() => setIsDbInfoModalOpen(false)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Tutup Informasi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KIOSK LOCKED & WINDOWED MODE WARNING / RE-ENTER FULLSCREEN GUARDIAN */}
      <AnimatePresence>
        {isKioskLocked && !isFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border-2 border-amber-500 text-slate-100 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-lg w-[94%]"
          >
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-amber-300">Mode Kiosk Terkunci</p>
              <p className="text-[11px] text-slate-300 truncate">Layar penuh tidak aktif. Masuk kembali untuk mengunci tampilan.</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Layar Penuh</span>
              </button>
              <button
                type="button"
                onClick={handleToggleLock}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                title="Buka Kunci PIN"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KIOSK PIN SECURITY MODAL */}
      <KioskPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingProtectedAction(null);
        }}
        onSuccess={handleUnlockSuccess}
        title={pinModalTitle}
        subtitle="Masukkan 4-6 Digit PIN Keamanan Kiosk untuk Melanjutkan"
      />

    </div>
  );
};
