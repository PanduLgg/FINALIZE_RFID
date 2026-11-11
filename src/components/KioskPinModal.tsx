import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, KeyRound, ShieldAlert, X, Check, ShieldCheck, RefreshCw } from 'lucide-react';
import { AttendanceStorage } from '../lib/storage';

interface KioskPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
  title?: string;
  subtitle?: string;
  allowChangePin?: boolean;
}

export const KioskPinModal: React.FC<KioskPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle,
  title,
  subtitle,
  allowChangePin = false
}) => {
  const displayTitle = title || actionTitle || 'Buka Kunci Layar Kiosk';
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMessage('');
      setSuccessMessage('');
      setIsChangingPin(false);
      setNewPin('');
      setConfirmNewPin('');
    }
  }, [isOpen]);

  // Support direct keyboard input (0-9, Backspace, Enter, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!isChangingPin) {
          handleVerify();
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        handleKeypadPress('BACKSPACE');
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        handleKeypadPress(e.key);
        return;
      }
    };

    window.addEventListener('keydown', handleModalKeyDown, true);
    return () => window.removeEventListener('keydown', handleModalKeyDown, true);
  }, [isOpen, pin, isChangingPin, newPin, confirmNewPin]);

  const handleKeypadPress = (val: string) => {
    setErrorMessage('');
    if (isChangingPin) {
      if (val === 'BACKSPACE') {
        if (confirmNewPin.length > 0) {
          setConfirmNewPin(prev => prev.slice(0, -1));
        } else if (newPin.length > 0) {
          setNewPin(prev => prev.slice(0, -1));
        }
      } else if (val === 'CLEAR') {
        setNewPin('');
        setConfirmNewPin('');
      } else {
        if (newPin.length < 6) {
          setNewPin(prev => prev + val);
        } else if (confirmNewPin.length < 6) {
          setConfirmNewPin(prev => prev + val);
        }
      }
      return;
    }

    if (val === 'BACKSPACE') {
      setPin(prev => prev.slice(0, -1));
    } else if (val === 'CLEAR') {
      setPin('');
    } else {
      if (pin.length < 6) {
        const nextPin = pin + val;
        setPin(nextPin);
        // If 4 digits entered, auto-verify if matches
        if (nextPin.length >= 4 && AttendanceStorage.verifyKioskPin(nextPin)) {
          setTimeout(() => {
            onSuccess();
          }, 100);
        }
      }
    }
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setErrorMessage('Silakan masukkan PIN Kiosk');
      return;
    }

    if (AttendanceStorage.verifyKioskPin(pin)) {
      setErrorMessage('');
      onSuccess();
    } else {
      setErrorMessage('PIN Salah! Silakan masukkan PIN yang benar.');
      setPin('');
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!AttendanceStorage.verifyKioskPin(pin)) {
      setErrorMessage('PIN Lama tidak sesuai!');
      return;
    }
    if (newPin.length < 4) {
      setErrorMessage('PIN Baru minimal 4 angka!');
      return;
    }
    if (newPin !== confirmNewPin) {
      setErrorMessage('Konfirmasi PIN Baru tidak cocok!');
      return;
    }

    const res = AttendanceStorage.setKioskPin(newPin);
    if (res.success) {
      setSuccessMessage('PIN Baru berhasil disimpan!');
      setTimeout(() => {
        setIsChangingPin(false);
        setPin(newPin);
        setSuccessMessage('');
        onSuccess();
      }, 1000);
    } else {
      setErrorMessage(res.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-white">{displayTitle}</h3>
          <p className="text-xs text-slate-400">
            {subtitle ? subtitle : isChangingPin 
              ? 'Atur PIN Keamanan baru untuk mengunci monitor Kiosk.' 
              : 'Masukkan 4-6 digit PIN untuk membuka kontrol atau keluar mode Kiosk.'}
          </p>
        </div>

        {/* Normal Unlock Mode */}
        {!isChangingPin ? (
          <form onSubmit={handleVerify} className="space-y-4">
            {/* PIN Display Dots */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center gap-3">
                {[0, 1, 2, 3].map((idx) => {
                  const hasVal = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border transition-all duration-150 ${
                        hasVal
                          ? 'bg-amber-400 border-amber-300 scale-110 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{showPin ? `PIN: ${pin || '-'}` : '••• PIN Terproteksi •••'}</span>
                {pin.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                  >
                    {showPin ? 'Sembunyikan' : 'Lihat'}
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Numeric Keypad (Touch / Clickable) */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACKSPACE'].map((btn) => {
                const isClear = btn === 'CLEAR';
                const isBack = btn === 'BACKSPACE';
                return (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleKeypadPress(btn)}
                    className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                      isClear
                        ? 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs'
                        : isBack
                        ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs'
                        : 'bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white hover:border-slate-600 shadow-xs'
                    }`}
                  >
                    {isClear ? 'C' : isBack ? '⌫' : btn}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Buka Kunci Layar</span>
              </button>

              {allowChangePin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPin(true);
                    setErrorMessage('');
                  }}
                  className="text-xs text-slate-400 hover:text-amber-300 text-center py-1 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Ganti PIN Keamanan Kiosk</span>
                </button>
              )}
            </div>
          </form>
        ) : (
          /* Change PIN Mode */
          <form onSubmit={handleSaveNewPin} className="space-y-3">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                PIN Lama Saat Ini:
              </label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN Lama (cth: 1234)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                PIN Baru (4-6 Angka):
              </label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="PIN Baru"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Ulangi PIN Baru:
              </label>
              <input
                type="password"
                maxLength={6}
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value)}
                placeholder="Konfirmasi PIN Baru"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            {errorMessage && (
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold text-center">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPin(false);
                  setErrorMessage('');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Simpan PIN
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
