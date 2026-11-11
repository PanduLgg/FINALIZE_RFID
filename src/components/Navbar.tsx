import React, { useState, useEffect } from 'react';
import { Role, GateLocation } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { 
  Monitor, 
  UserCheck, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Sliders,
  Lock,
  LogOut,
  Menu,
  X,
  MapPin,
  ChevronRight,
  Clock
} from 'lucide-react';

interface AuthUser {
  username: string;
  role: Role;
  name: string;
}

interface NavbarProps {
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentUser: AuthUser | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  selectedGate: GateLocation;
  setSelectedGate: (gate: GateLocation) => void;
  onOpenManualCheckin: () => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  setCurrentRole,
  currentUser,
  onOpenLoginModal,
  onLogout,
  selectedGate,
  setSelectedGate,
  onOpenManualCheckin,
  isMuted,
  setIsMuted
}) => {
  const [time, setTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('id-ID', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleRoleSelect = (role: Role) => {
    setCurrentRole(role);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 py-1.5 gap-1.5 sm:gap-4">
          
          {/* Logo & App Title - Matching requested school branding */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 shrink">
            <div className="bg-white p-1 sm:p-1.5 rounded-xl shrink-0 shadow-md flex items-center justify-center border border-slate-200">
              <SchoolLogo size="xs" variant="full" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="font-black text-xs sm:text-base text-white tracking-tight uppercase leading-tight select-none">
                SMK EKONOMIKA DEPOK
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold text-slate-300 tracking-wider uppercase leading-tight select-none mt-0.5">
                SMART SYSTEM RFID ATTENDANCE 
              </span>
            </div>
          </div>

          {/* Desktop Navigation (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              {currentUser?.role !== 'guru_piket' && (
                <button
                  onClick={() => setCurrentRole('kiosk')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                    currentRole === 'kiosk'
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Buka Tampilan Mode Kiosk Tap RFID Pelajar"
                >
                  <Monitor className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                  <span>Mode Kiosk</span>
                </button>
              )}

              {currentUser && (
                <button
                  onClick={() => setCurrentRole(currentUser.role)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                    currentRole === currentUser.role
                      ? currentUser.role === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {currentUser.role === 'admin' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                  )}
                  <span>{currentUser.role === 'admin' ? 'Panel Admin' : 'Guru Piket'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Tools & Auth Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Manual Checkin Button for Logged in Guru/Admin (Desktop only) */}
            {currentUser && (
              <button
                onClick={onOpenManualCheckin}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Absen Manual</span>
              </button>
            )}

            {/* Audio Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 cursor-pointer shrink-0"
              title={isMuted ? "Suara Mati" : "Suara Aktif"}
              aria-label="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Fullscreen Toggle (Desktop only) */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 hidden sm:block cursor-pointer shrink-0"
              title="Layar Penuh"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex items-center">
              {currentUser ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-extrabold text-white truncate max-w-[110px]">{currentUser.name}</span>
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase">
                      {currentUser.role === 'admin' ? 'Super Admin' : 'Guru Piket'}
                    </span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
                    title="Keluar dari Akun"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Keluar</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenLoginModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Login</span>
                </button>
              )}
            </div>

            {/* Mobile Bulk Hamburger Button - Always visible and clean on small screens */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl border border-indigo-400/40 md:hidden cursor-pointer shrink-0 transition-colors shadow-sm"
              aria-label="Buka Menu Navigasi"
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 text-amber-300" />
              ) : (
                <>
                  <Menu className="w-4 h-4" />
                  <span className="text-[11px] font-bold hidden xs:inline">Menu</span>
                </>
              )}
            </button>

          </div>

        </div>
      </div>

      {/* MOBILE BULK HAMBURGER DRAWER MENU - 100% WIDTH CONTROLLED, ZERO HORIZONTAL OVERFLOW */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 shadow-2xl px-3 sm:px-4 py-3 space-y-3 animate-in slide-in-from-top duration-200 max-h-[85vh] overflow-y-auto">
          
          {/* User Status Bar / Login CTA */}
          {currentUser ? (
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xs shrink-0">
                  {currentUser.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">{currentUser.name}</p>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase truncate">{currentUser.role === 'admin' ? 'Super Admin' : 'Guru Piket'}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenLoginModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Login Petugas / Admin</span>
            </button>
          )}

          {/* Navigation Links */}
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Navigasi Utama</p>

            {currentUser?.role !== 'guru_piket' && (
              <button
                onClick={() => handleRoleSelect('kiosk')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentRole === 'kiosk'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-black'
                    : 'bg-slate-950/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Layar Mode Kiosk (Tap Kartu)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            )}

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => handleRoleSelect('admin')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentRole === 'admin'
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-black'
                    : 'bg-slate-950/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Panel Super Admin</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            )}

            {currentUser?.role === 'guru_piket' && (
              <button
                onClick={() => handleRoleSelect('guru_piket')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentRole === 'guru_piket'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-black'
                    : 'bg-slate-950/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dashboard Guru Piket</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            )}
          </div>

          {/* Gate Selection for Mobile */}
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Lokasi Pintu Gate RFID</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSelectedGate('pintu_depan');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedGate === 'pintu_depan'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Pintu Depan</span>
              </button>
              <button
                onClick={() => {
                  setSelectedGate('pintu_belakang');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedGate === 'pintu_belakang'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Pintu Belakang</span>
              </button>
            </div>
          </div>

          {/* Quick Tools & Toggles */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {currentUser && (
              <button
                onClick={() => {
                  onOpenManualCheckin();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Input Absensi Manual</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="py-2 px-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'Suara: Mati' : 'Suara: Aktif'}</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="py-2 px-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Normal' : 'Layar Penuh'}</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </header>
  );
};
