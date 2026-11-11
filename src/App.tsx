import React, { useState, useEffect } from 'react';
import { Role, GateLocation, SchoolSchedule, Student, AuthUser, DailyAttendanceRecap } from './types';
import { AttendanceStorage } from './lib/storage';
import { Navbar } from './components/Navbar';
import { KioskMonitor } from './components/KioskMonitor';
import { GuruPiketDashboard } from './components/GuruPiketDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ManualCheckinModal } from './components/ManualCheckinModal';
import { CardPairingModal } from './components/CardPairingModal';
import { LoginModal } from './components/LoginModal';
import { DayRolloverModal } from './components/DayRolloverModal';
import { CalendarCheck2, Database, X, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>('kiosk');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedGate, setSelectedGate] = useState<GateLocation>('pintu_depan');
  const [schedule, setSchedule] = useState<SchoolSchedule>(initialScheduleState());
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isManualCheckinOpen, setIsManualCheckinOpen] = useState<boolean>(false);
  const [pairingStudent, setPairingStudent] = useState<Student | null>(null);

  // Day Rollover Notification Modal & Toast state
  const [isDayRolloverModalOpen, setIsDayRolloverModalOpen] = useState<boolean>(false);
  const [dayRolloverData, setDayRolloverData] = useState<{
    previousDate: string;
    newDate: string;
    recap?: DailyAttendanceRecap | null;
  } | null>(null);
  const [dayRolloverToast, setDayRolloverToast] = useState<{
    visible: boolean;
    previousDate: string;
    newDate: string;
    message: string;
    recap?: DailyAttendanceRecap | null;
  } | null>(null);

  function initialScheduleState(): SchoolSchedule {
    return AttendanceStorage.getSchedule();
  }

  useEffect(() => {
    // Initialize real-time Cloud Firestore synchronization across all devices
    AttendanceStorage.initCloudSync();
    
    const rolloverRes = AttendanceStorage.checkAndProcessDayRollover();
    if (rolloverRes.rolledOver && rolloverRes.previousDate) {
      const recap = AttendanceStorage.getDailyRecapByDate(rolloverRes.previousDate);
      setDayRolloverData({
        previousDate: rolloverRes.previousDate,
        newDate: rolloverRes.newDate,
        recap
      });
      setDayRolloverToast({
        visible: true,
        previousDate: rolloverRes.previousDate,
        newDate: rolloverRes.newDate,
        message: `Sesi Baru (${rolloverRes.newDate}): Data tanggal ${rolloverRes.previousDate} telah diarsip otomatis ke database.`,
        recap
      });
    }

    setSchedule(AttendanceStorage.getSchedule());

    const handleFocusOrVisibility = () => {
      const res = AttendanceStorage.checkAndProcessDayRollover();
      if (res.rolledOver && res.previousDate) {
        const recap = AttendanceStorage.getDailyRecapByDate(res.previousDate);
        setDayRolloverData({
          previousDate: res.previousDate,
          newDate: res.newDate,
          recap
        });
        setDayRolloverToast({
          visible: true,
          previousDate: res.previousDate,
          newDate: res.newDate,
          message: `Sesi Baru (${res.newDate}): Data tanggal ${res.previousDate} telah diarsip otomatis ke database.`,
          recap
        });
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    const rolloverInterval = setInterval(() => {
      AttendanceStorage.checkAndProcessDayRollover();
    }, 10000);

    const unsubscribe = AttendanceStorage.subscribeToSync((evt) => {
      if (evt.type === 'SCHEDULE_UPDATED') {
        setSchedule(AttendanceStorage.getSchedule());
      }
      if (evt.type === 'DAY_CHANGED') {
        const payload = evt.payload as { previousDate?: string; newDate?: string; recap?: DailyAttendanceRecap } | undefined;
        const prev = payload?.previousDate || '';
        const cur = payload?.newDate || AttendanceStorage.getTodayDate();
        const recap = payload?.recap || (prev ? AttendanceStorage.getDailyRecapByDate(prev) : null);
        
        setDayRolloverData({
          previousDate: prev,
          newDate: cur,
          recap
        });
        setDayRolloverToast({
          visible: true,
          previousDate: prev,
          newDate: cur,
          message: `Pergantian Hari: Data ${prev} diarsip ke database. Hitungan hari ini (${cur}) dimulai dari 0.`,
          recap
        });
      }
      if (evt.type === 'USERS_UPDATED') {
        // Dynamically update active permissions if current user was modified by admin
        setCurrentUser(prev => {
          if (!prev) return null;
          const freshUsers = AttendanceStorage.getSystemUsers();
          const found = freshUsers.find(u => u.username.toLowerCase() === prev.username.toLowerCase());
          if (found) {
            return {
              ...prev,
              name: found.name,
              role: found.role,
              allowedFeatures: found.allowedFeatures
            };
          }
          return prev;
        });
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      clearInterval(rolloverInterval);
      unsubscribe();
    };
  }, []);

  const [globalRfidBuffer, setGlobalRfidBuffer] = useState<string>('');
  const globalBufferTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Global hardware RFID scanner listener when not in Kiosk mode
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't capture when explicitly typing in inputs/textareas/selects
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Enter') {
        if (globalRfidBuffer.trim().length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const uid = globalRfidBuffer.trim();
          setGlobalRfidBuffer('');
          
          // Switch to Kiosk Monitor and close modals
          setCurrentRole('kiosk');
          setIsLoginModalOpen(false);
          setIsManualCheckinOpen(false);
          setPairingStudent(null);

          try {
            window.focus();
          } catch {
            // Ignore if restricted
          }

          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('rfid_tap_event', {
              detail: { uid, gate: selectedGate }
            }));
          }, 60);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setGlobalRfidBuffer(prev => prev + e.key);

        if (globalBufferTimerRef.current) clearTimeout(globalBufferTimerRef.current);
        globalBufferTimerRef.current = setTimeout(() => {
          setGlobalRfidBuffer('');
        }, 1500);
      }
    };

    if (currentRole !== 'kiosk') {
      window.addEventListener('keydown', handleGlobalKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [currentRole, globalRfidBuffer, selectedGate]);

  const handleRoleChangeRequest = (targetRole: Role) => {
    if (targetRole === 'kiosk') {
      if (currentUser?.role === 'guru_piket') {
        alert('Akses Ditolak: Guru Piket tidak memiliki hak akses untuk melihat Layar Monitor.');
        return;
      }
      setCurrentRole('kiosk');
      return;
    }

    // Require logged in user for guru_piket or admin
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    // Allow logged in user
    if (currentUser.role === 'admin') {
      setCurrentRole(targetRole); // Admin can access admin and guru_piket
    } else if (currentUser.role === 'guru_piket') {
      if (targetRole === 'admin') {
        alert('Akses Ditolak: Fitur Super Admin hanya dapat diakses oleh Administrator Utama.');
      } else {
        setCurrentRole('guru_piket');
      }
    }
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole('kiosk');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 selection:bg-blue-500 selection:text-white flex flex-col">
      
      {/* Top Navigation Bar (Hidden in pure Kiosk mode) */}
      {currentRole !== 'kiosk' && (
        <Navbar
          currentRole={currentRole}
          setCurrentRole={handleRoleChangeRequest}
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          selectedGate={selectedGate}
          setSelectedGate={setSelectedGate}
          onOpenManualCheckin={() => setIsManualCheckinOpen(true)}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {currentRole === 'kiosk' && (
          <KioskMonitor
            gateLocation={selectedGate}
            setGateLocation={setSelectedGate}
            schedule={schedule}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenDashboard={(role) => setCurrentRole(role)}
          />
        )}

        {(currentRole === 'guru_piket' || currentRole === 'kesiswaan') && currentUser && (
          <div className="h-full overflow-y-auto">
            <GuruPiketDashboard
              schedule={schedule}
              currentUser={currentUser}
              onOpenManualCheckin={() => setIsManualCheckinOpen(true)}
            />
          </div>
        )}

        {currentRole === 'admin' && currentUser?.role === 'admin' && (
          <div className="h-full overflow-y-auto">
            <AdminDashboard
              schedule={schedule}
              setSchedule={setSchedule}
              onOpenCardPairing={(std) => setPairingStudent(std)}
              onOpenKioskMode={() => handleRoleChangeRequest('kiosk')}
              currentUser={currentUser}
            />
          </div>
        )}
      </main>

      {/* Day Rollover Notification Banner / Toast */}
      {dayRolloverToast?.visible && (
        <aside 
          aria-label="Notifikasi Pergantian Hari Otomatis"
          className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl shadow-emerald-950/50 backdrop-blur-md animate-fadeIn"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CalendarCheck2 className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Hari Baru
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" /> Terarsip
                </span>
              </div>
              <h4 className="text-xs font-bold text-white leading-tight">
                Absensi Hari Baru: {dayRolloverToast.newDate}
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Data kemarin ({dayRolloverToast.previousDate}) otomatis tersimpan di database. Tampilan hari ini telah direset ke 0.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => {
                    setIsDayRolloverModalOpen(true);
                    setDayRolloverToast(prev => prev ? { ...prev, visible: false } : null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span>Lihat Rincian Arsip</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setDayRolloverToast(prev => prev ? { ...prev, visible: false } : null)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[11px] transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            <button
              onClick={() => setDayRolloverToast(prev => prev ? { ...prev, visible: false } : null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Day Rollover Detail Modal */}
      {dayRolloverData && (
        <DayRolloverModal
          isOpen={isDayRolloverModalOpen}
          onClose={() => setIsDayRolloverModalOpen(false)}
          previousDate={dayRolloverData.previousDate}
          newDate={dayRolloverData.newDate}
          recap={dayRolloverData.recap}
          onViewReports={() => {
            if (currentUser?.role === 'admin') {
              setCurrentRole('admin');
            } else if (currentUser?.role === 'guru_piket' || currentUser?.role === 'kesiswaan') {
              setCurrentRole('guru_piket');
            }
          }}
        />
      )}

      {/* Single Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Manual Checkin Modal */}
      <ManualCheckinModal
        isOpen={isManualCheckinOpen}
        onClose={() => setIsManualCheckinOpen(false)}
        onSuccess={() => {
          // Trigger refresh event
        }}
      />

      {/* Card Pairing Modal */}
      <CardPairingModal
        student={pairingStudent}
        onClose={() => setPairingStudent(null)}
        onSuccess={() => {
          // Card paired successfully
        }}
      />

    </div>
  );
}
