import React, { useState, useMemo, useEffect } from 'react';
import { SystemUser, Role } from '../types';
import { AttendanceStorage } from '../lib/storage';
import { 
  ALL_FEATURE_PERMISSIONS, 
  DEFAULT_ROLE_PERMISSIONS, 
  FeaturePermission, 
  getDefaultPermissionsForRole 
} from '../lib/permissions';
import {
  ShieldCheck,
  UserCheck,
  Search,
  Plus,
  Trash2,
  Edit3,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Phone,
  Mail,
  User,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Sparkles,
  Info,
  Layers,
  CheckSquare,
  Square,
  GraduationCap,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Radio,
  PowerOff,
  Clock,
  Activity
} from 'lucide-react';

interface UserManagementProps {
  showToast: (msg: string) => void;
  currentUsername?: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  showToast,
  currentUsername
}) => {
  const [users, setUsers] = useState<SystemUser[]>(() => AttendanceStorage.getSystemUsers());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'guru_piket' | 'kesiswaan'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<SystemUser | null>(null);
  const [selectedUserForSessions, setSelectedUserForSessions] = useState<SystemUser | null>(null);

  // Form States
  const [formName, setFormName] = useState<string>('');
  const [formUsername, setFormUsername] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formRole, setFormRole] = useState<'admin' | 'guru_piket' | 'kesiswaan'>('guru_piket');
  const [formAllowedFeatures, setFormAllowedFeatures] = useState<string[]>([]);
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Reload data
  const reloadData = () => {
    const updatedUsers = AttendanceStorage.getSystemUsers();
    setUsers(updatedUsers);
    if (selectedUserForSessions) {
      const refreshed = updatedUsers.find(u => u.id === selectedUserForSessions.id);
      setSelectedUserForSessions(refreshed || null);
    }
  };

  const handleRevokeSession = (userId: string, sessionId: string, deviceName?: string) => {
    const res = AttendanceStorage.revokeUserSession(userId, sessionId);
    if (res.success) {
      showToast(`Sesi perangkat ${deviceName || ''} berhasil diputus.`);
      reloadData();
    } else {
      showToast(res.message);
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-cyan-400" />;
      case 'desktop':
      default:
        return <Laptop className="w-4 h-4 text-indigo-400" />;
    }
  };

  const calculateRemainingMinutes = (loginAt: string) => {
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const loginTime = new Date(loginAt).getTime();
    const elapsed = Date.now() - loginTime;
    const remaining = Math.max(0, Math.floor((ONE_HOUR_MS - elapsed) / 60000));
    return remaining;
  };

  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'rfid_app_system_users_v1') {
        reloadData();
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter(u => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.isActive) ||
        (statusFilter === 'INACTIVE' && !u.isActive);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.role === 'admin' && u.isActive).length;
  const totalPikets = users.filter(u => u.role === 'guru_piket' && u.isActive).length;
  const totalKesiswaan = users.filter(u => u.role === 'kesiswaan' && u.isActive).length;
  const totalInactive = users.filter(u => !u.isActive).length;

  // Open Add Modal
  const openAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('guru_piket');
    setFormAllowedFeatures(DEFAULT_ROLE_PERMISSIONS.guru_piket);
    setFormPhone('');
    setFormEmail('');
    setFormIsActive(true);
    setShowPassword(false);
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormPassword(''); // blank to keep current password unless changed
    setFormRole(user.role as 'admin' | 'guru_piket' | 'kesiswaan');
    const existingFeatures = Array.isArray(user.allowedFeatures) && user.allowedFeatures.length > 0
      ? user.allowedFeatures
      : getDefaultPermissionsForRole(user.role as 'admin' | 'guru_piket' | 'kesiswaan');
    setFormAllowedFeatures(existingFeatures);
    setFormPhone(user.phone || '');
    setFormEmail(user.email || '');
    setFormIsActive(user.isActive);
    setShowPassword(false);
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Handle Role Change in Form
  const handleRoleChange = (newRole: 'admin' | 'guru_piket' | 'kesiswaan') => {
    setFormRole(newRole);
    // Apply default role permissions preset when changing role
    setFormAllowedFeatures(getDefaultPermissionsForRole(newRole));
  };

  // Toggle single permission
  const handleTogglePermission = (permissionKey: FeaturePermission) => {
    setFormAllowedFeatures(prev => {
      if (prev.includes(permissionKey)) {
        return prev.filter(k => k !== permissionKey);
      } else {
        return [...prev, permissionKey];
      }
    });
  };

  // Preset permissions handlers
  const applyAllPermissions = () => {
    setFormAllowedFeatures(ALL_FEATURE_PERMISSIONS.map(p => p.id));
  };

  const applyPiketPermissions = () => {
    setFormAllowedFeatures(DEFAULT_ROLE_PERMISSIONS.guru_piket);
  };

  const applyKesiswaanPermissions = () => {
    setFormAllowedFeatures(DEFAULT_ROLE_PERMISSIONS.kesiswaan);
  };

  const clearAllPermissions = () => {
    setFormAllowedFeatures([]);
  };

  // Handle Save Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUsername = formUsername.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!cleanUsername) {
      setFormError('Username tidak valid! Gunakan kombinasi huruf kecil, angka, titik, atau garis bawah.');
      return;
    }

    if (!formName.trim()) {
      setFormError('Nama lengkap pengguna wajib diisi!');
      return;
    }

    // Role admin must always have permissions
    const finalAllowedFeatures = formRole === 'admin' 
      ? ALL_FEATURE_PERMISSIONS.map(p => p.id)
      : (formAllowedFeatures.length > 0 ? formAllowedFeatures : getDefaultPermissionsForRole(formRole));

    if (!editingUser) {
      // Create new user
      if (!formPassword || formPassword.trim().length < 4) {
        setFormError('Password minimal harus terdiri dari 4 karakter.');
        return;
      }

      const res = AttendanceStorage.addSystemUser({
        username: cleanUsername,
        password: formPassword.trim(),
        name: formName.trim(),
        role: formRole,
        allowedFeatures: finalAllowedFeatures,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        isActive: formIsActive
      });

      if (!res.success) {
        setFormError(res.message);
        return;
      }

      showToast(`✅ ${res.message}`);
      setIsAddModalOpen(false);
      reloadData();
    } else {
      // Update existing user
      const updatedUser: SystemUser = {
        ...editingUser,
        username: cleanUsername,
        name: formName.trim(),
        role: formRole,
        allowedFeatures: finalAllowedFeatures,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        isActive: formIsActive,
        password: formPassword.trim() ? formPassword.trim() : editingUser.password
      };

      const res = AttendanceStorage.updateSystemUser(updatedUser);
      if (!res.success) {
        setFormError(res.message);
        return;
      }

      showToast(`✅ ${res.message}`);
      setIsAddModalOpen(false);
      reloadData();
    }
  };

  // Handle Toggle Active Status
  const handleToggleStatus = (user: SystemUser) => {
    const res = AttendanceStorage.toggleUserStatus(user.id, currentUsername);
    if (!res.success) {
      showToast(`⚠️ ${res.message}`);
    } else {
      showToast(`⚡ ${res.message}`);
      reloadData();
    }
  };

  // Handle Confirm Delete User
  const handleConfirmDelete = () => {
    if (!deleteConfirmUser) return;
    const res = AttendanceStorage.deleteSystemUser(deleteConfirmUser.id, currentUsername);
    if (!res.success) {
      showToast(`⚠️ ${res.message}`);
    } else {
      showToast(`🗑️ ${res.message}`);
      reloadData();
    }
    setDeleteConfirmUser(null);
  };

  // Format date helper
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner & Stats */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">Manajemen Akun & Kontrol Hak Akses Fitur</h2>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                  Firestore Rules ABAC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Admin dapat mengontrol dan mengaktifkan/menonaktifkan fitur apa saja yang dapat diakses oleh setiap akun pengguna (Guru Piket, Kesiswaan & BK).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={reloadData}
              className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl border border-slate-600 transition-colors cursor-pointer"
              title="Refresh Data Akun"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Akun Baru</span>
            </button>
          </div>
        </div>

        {/* 5 Overview Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Total Akun</span>
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">{totalUsers}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tersimpan Permanen</p>
          </div>

          <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-indigo-400 mb-1">
              <span className="text-[11px] font-medium">Super Admin</span>
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-indigo-300">{totalAdmins}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Akses Penuh Semua Fitur</p>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[11px] font-medium">Guru Piket</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-300">{totalPikets}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Monitoring & Absensi</p>
          </div>

          <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-purple-400 mb-1">
              <span className="text-[11px] font-medium">Kesiswaan & BK</span>
              <GraduationCap className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-300">{totalKesiswaan}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tindak Lanjut & Rekap</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3.5 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Nonaktif</span>
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-300">{totalInactive}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Login Ditangguhkan</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama, username, kontak..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role & Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700/70 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Peran:</span>
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                roleFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                roleFilter === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setRoleFilter('guru_piket')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                roleFilter === 'guru_piket' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Guru Piket
            </button>
            <button
              onClick={() => setRoleFilter('kesiswaan')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                roleFilter === 'kesiswaan' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Kesiswaan
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700/70 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Status:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                statusFilter === 'INACTIVE' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Nonaktif
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 font-black border-b border-slate-700/80">
              <tr>
                <th className="py-3.5 px-4">Pengguna & Akun</th>
                <th className="py-3.5 px-4">Peran (Role)</th>
                <th className="py-3.5 px-4">Hak Akses Fitur</th>
                <th className="py-3.5 px-4">Perangkat Aktif (Maks 2)</th>
                <th className="py-3.5 px-4">Kontak</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4">Terakhir Login</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <User className="w-8 h-8 text-slate-600" />
                      <p className="font-bold text-slate-300">Tidak ada akun pengguna yang cocok</p>
                      <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter status.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = currentUsername && user.username.toLowerCase() === currentUsername.toLowerCase();
                  const isAdmin = user.role === 'admin';
                  const isKesiswaan = user.role === 'kesiswaan';
                  
                  const activePermissions = Array.isArray(user.allowedFeatures) && user.allowedFeatures.length > 0
                    ? user.allowedFeatures
                    : getDefaultPermissionsForRole(user.role as 'admin' | 'guru_piket' | 'kesiswaan');

                  const validActiveSessions = (user.activeSessions || []).filter(s => {
                    const loginTime = new Date(s.loginAt).getTime();
                    return (Date.now() - loginTime) < (60 * 60 * 1000);
                  });

                  return (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                      {/* Name & Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                            isAdmin 
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                              : isKesiswaan
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{user.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded text-[9px] font-bold">
                                  Akun Anda
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-slate-400">@{user.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Administrator</span>
                          </span>
                        ) : isKesiswaan ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Kesiswaan & BK</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Guru Piket</span>
                          </span>
                        )}
                      </td>

                      {/* Allowed Features Preview */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          {isAdmin ? (
                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-md text-[10px] font-bold">
                              Semua Fitur Diizinkan (Total Access)
                            </span>
                          ) : (
                            <>
                              <span className="px-2 py-0.5 bg-slate-700/80 text-white font-black text-[10px] rounded-md border border-slate-600">
                                {activePermissions.length} Fitur
                              </span>
                              {activePermissions.slice(0, 2).map(feat => {
                                const found = ALL_FEATURE_PERMISSIONS.find(p => p.id === feat);
                                return (
                                  <span key={feat} className="px-1.5 py-0.5 bg-slate-900 text-slate-300 border border-slate-700 rounded text-[9px] font-medium truncate max-w-[100px]" title={found?.label || feat}>
                                    {found?.label ? found.label.split(' ')[0] : feat}
                                  </span>
                                );
                              })}
                              {activePermissions.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  +{activePermissions.length - 2}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Active Devices & Sessions */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedUserForSessions(user)}
                          className="flex flex-col gap-1 text-left p-1.5 rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer border border-transparent hover:border-slate-600 group"
                          title="Klik untuk melihat detail & putus sesi perangkat"
                        >
                          <div className="flex items-center gap-1.5">
                            <Radio className={`w-3.5 h-3.5 ${
                              validActiveSessions.length > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-600'
                            }`} />
                            <span className={`text-[11px] font-bold ${
                              validActiveSessions.length >= 2 
                                ? 'text-amber-400' 
                                : validActiveSessions.length === 1 
                                ? 'text-emerald-400' 
                                : 'text-slate-500'
                            }`}>
                              {validActiveSessions.length} / 2 Sesi Aktif
                            </span>
                          </div>
                          {validActiveSessions.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {validActiveSessions.map((s, idx) => (
                                <span key={s.sessionId || idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-900/90 border border-slate-700 rounded text-[9px] text-slate-300">
                                  {getDeviceIcon(s.deviceType)}
                                  <span className="truncate max-w-[90px]">{s.browser || 'Browser'} ({s.os || 'OS'})</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Tidak ada perangkat aktif</span>
                          )}
                        </button>
                      </td>

                      {/* Phone & Email */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {user.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{user.phone}</span>
                            </div>
                          ) : null}
                          {user.email ? (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[120px]">{user.email}</span>
                            </div>
                          ) : null}
                          {!user.phone && !user.email && (
                            <span className="text-slate-500 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={Boolean(isCurrent)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            user.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                          } ${isCurrent ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title={isCurrent ? "Tidak dapat mengubah status akun sendiri" : "Klik untuk Ubah Status"}
                        >
                          {user.isActive ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {formatDateTime(user.lastLogin)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUserForSessions(user)}
                            className="p-1.5 bg-slate-700/80 hover:bg-cyan-600 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Kelola Sesi & Deteksi Perangkat"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 bg-slate-700/80 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Edit Data & Hak Akses Fitur"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmUser(user)}
                            disabled={Boolean(isCurrent)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-700/80 hover:bg-rose-600 text-slate-300 hover:text-white'
                            }`}
                            title={isCurrent ? "Tidak dapat menghapus akun Anda sendiri" : "Hapus Akun"}
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

      {/* ADD / EDIT USER MODAL WITH FEATURE PERMISSIONS */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl relative space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                {editingUser ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {editingUser ? 'Edit Akun & Kontrol Hak Akses Fitur' : 'Tambah Akun Pengguna Baru'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingUser
                    ? 'Perbarui profil, kata sandi, dan atur izin fitur yang boleh diakses akun ini'
                    : 'Daftarkan akun login baru dan konfigurasikan hak akses fiturnya'}
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold leading-relaxed flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Fauzi, S.Kom. atau Petugas Piket 1"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Username & Role Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Username Login <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 absolute left-3 top-2.5 font-mono text-xs">@</span>
                    <input
                      type="text"
                      required
                      placeholder="username"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Peran (Role) Utama <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'guru_piket' | 'kesiswaan')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="guru_piket">Guru Piket (Monitoring & Absen)</option>
                    <option value="kesiswaan">Kesiswaan & BK (Tindak Lanjut & Rekap)</option>
                    <option value="admin">Super Administrator (Akses Penuh)</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Kata Sandi (Password) {editingUser ? <span className="text-slate-400 font-normal">(Kosongkan jika tidak ingin mengubah)</span> : <span className="text-rose-400">*</span>}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingUser ? 'Ketik kata sandi baru...' : 'Masukkan kata sandi minimal 4 karakter'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={!editingUser}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    No. WhatsApp / HP <span className="text-slate-500 font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="081234567890"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Alamat Email <span className="text-slate-500 font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="nama@sekolah.sch.id"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-950/80">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Status Akun Aktif</p>
                    <p className="text-[11px] text-slate-400">Pengguna dapat login dan mengakses fitur sesuai izin yang diberikan.</p>
                  </div>
                </label>
              </div>

              {/* FEATURE PERMISSIONS CONTROL SECTION */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Kontrol Hak Akses Fitur Pengguna ({formAllowedFeatures.length} Dipilih)
                    </h4>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={applyAllPermissions}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-bold rounded-lg border border-indigo-500/30 transition-colors"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={applyPiketPermissions}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/30 transition-colors"
                    >
                      Default Piket
                    </button>
                    <button
                      type="button"
                      onClick={applyKesiswaanPermissions}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] font-bold rounded-lg border border-purple-500/30 transition-colors"
                    >
                      Default Kesiswaan
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {formRole === 'admin' ? (
                  <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-200 text-xs flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-400" />
                    <span>Akun Administrator otomatis memiliki akses tanpa batas ke semua fitur sistem.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                    {ALL_FEATURE_PERMISSIONS.map((permission) => {
                      const isChecked = formAllowedFeatures.includes(permission.id);
                      return (
                        <div
                          key={permission.id}
                          onClick={() => handleTogglePermission(permission.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            isChecked
                              ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0 text-indigo-400">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${isChecked ? 'text-indigo-200' : 'text-slate-300'}`}>
                              {permission.label}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Simpan Akun Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Apakah Anda yakin ingin menghapus akun <span className="font-bold text-white">"{deleteConfirmUser.name}"</span> (@{deleteConfirmUser.username}) secara permanen dari database?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE SESSIONS & DEVICE DETECTION MODAL */}
      {selectedUserForSessions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Deteksi Perangkat & Sesi Login</h3>
                  <p className="text-xs text-slate-400">
                    Akun: <span className="font-bold text-cyan-300">{selectedUserForSessions.name}</span> (@{selectedUserForSessions.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForSessions(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rule Policy Banner */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-2.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white">Kebijakan Multi-Device & Sesi 1 Jam:</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Setiap akun dibatasi maksimal <span className="text-emerald-400 font-bold">2 perangkat aktif</span> bersamaan dengan durasi sesi <span className="text-cyan-400 font-bold">maksimal 1 jam</span>. Jika pengguna login dari perangkat ke-3, perangkat dengan sesi terlama akan otomatis ditutup (FIFO).
                </p>
              </div>
            </div>

            {/* Device List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Daftar Perangkat Terdeteksi:</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                  {((selectedUserForSessions.activeSessions || []).filter(s => {
                    const t = new Date(s.loginAt).getTime();
                    return (Date.now() - t) < (60 * 60 * 1000);
                  })).length} / 2 Perangkat Aktif
                </span>
              </div>

              {(() => {
                const validSessions = (selectedUserForSessions.activeSessions || []).filter(s => {
                  const t = new Date(s.loginAt).getTime();
                  return (Date.now() - t) < (60 * 60 * 1000);
                });

                if (validSessions.length === 0) {
                  return (
                    <div className="py-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-2">
                      <Radio className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-400">Tidak Ada Perangkat Aktif</p>
                      <p className="text-[11px] text-slate-500">Pengguna belum login atau semua sesi sebelumnya telah habis.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {validSessions.map((session, idx) => {
                      const remainingMins = calculateRemainingMinutes(session.loginAt);

                      return (
                        <div
                          key={session.sessionId || idx}
                          className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                              {getDeviceIcon(session.deviceType)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-white truncate">
                                  {session.deviceName || `${session.browser || 'Browser'} di ${session.os || 'Perangkat'}`}
                                </p>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  Online
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400 mt-1">
                                <span>OS: <b className="text-slate-300">{session.os || 'Unknown'}</b></span>
                                <span>Browser: <b className="text-slate-300">{session.browser || 'Unknown'}</b></span>
                                <span className="flex items-center gap-1 text-cyan-300 font-medium">
                                  <Clock className="w-3 h-3 text-cyan-400" />
                                  Sisa Sesi: {remainingMins} mnt
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-500 mt-0.5">
                                Login: {new Date(session.loginAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB • {new Date(session.loginAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRevokeSession(selectedUserForSessions.id, session.sessionId, session.deviceName)}
                            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 text-[10px] font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                            title="Putus sesi dan keluarkan perangkat ini"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                            <span>Kick Sesi</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={reloadData}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Sesi</span>
              </button>
              <button
                onClick={() => setSelectedUserForSessions(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
