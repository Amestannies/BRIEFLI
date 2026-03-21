'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Upload, Eye, EyeOff, CheckCircle, AlertCircle, ChevronLeft, User } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  barNumber?: string | null;
  avatarUrl?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  ATTORNEY: 'Attorney',
  PARALEGAL: 'Paralegal',
  STAFF: 'Staff',
};

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [barNumber, setBarNumber] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<UserProfile>('/users/me').then((r) => {
      setProfile(r.data);
      setFirstName(r.data.firstName);
      setLastName(r.data.lastName);
      setBarNumber(r.data.barNumber ?? '');
      setAvatarPreview(r.data.avatarUrl ?? null);
    }).catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Avatar must be under 2 MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) { setError('First and last name are required'); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      let avatarUrl = profile?.avatarUrl;
      if (avatarFile && profile) {
        const presignRes = await api.post<{ uploadUrl: string; key: string }>('/documents/upload-url', {
          fileName: avatarFile.name, mimeType: avatarFile.type, folder: 'FIRM_ASSETS',
        });
        await fetch(presignRes.data.uploadUrl, { method: 'PUT', body: avatarFile, headers: { 'Content-Type': avatarFile.type } });
        const confirmRes = await api.post<{ url: string }>('/documents/confirm', { key: presignRes.data.key, fileName: avatarFile.name, mimeType: avatarFile.type, fileSize: avatarFile.size, folder: 'FIRM_ASSETS' });
        avatarUrl = confirmRes.data.url;
      }
      await api.patch(`/users/${profile?.id}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        barNumber: barNumber.trim() || null,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (!currentPw || !newPw) { setError('All password fields are required'); return; }
    if (newPw.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    setPwSaving(true); setError(null); setSuccess(null);
    try {
      await api.patch(`/users/${profile?.id}`, { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setSuccess('Password changed successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="bg-white border border-border rounded-xl p-6 animate-pulse h-24" />)}
      </div>
    );
  }

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Update your personal information and password.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3.5 text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Avatar */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-[#3B4ECC]/10 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-xl font-bold text-[#3B4ECC]">{initials || <User className="w-8 h-8 text-gray-400" />}</span>
            }
          </div>
          <div className="space-y-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload photo
            </button>
            <p className="text-xs text-gray-400">PNG, JPG up to 2 MB.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Personal Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
          <input type="email" value={profile?.email ?? ''} disabled
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
          <p className="text-xs text-gray-400 mt-1">Contact support to change your email address.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
          <input type="text" value={ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? ''} disabled
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bar Number <span className="font-normal text-gray-400">(optional)</span></label>
          <input type="text" value={barNumber} onChange={(e) => setBarNumber(e.target.value)}
            placeholder="e.g. 12345678"
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Current Password</label>
          <div className="relative">
            <input type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full px-3 py-2.5 pr-10 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
            <button type="button" onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-3 py-2.5 pr-10 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
            <button type="button" onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Minimum 8 characters.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={handlePasswordChange} disabled={pwSaving || !currentPw || !newPw || !confirmPw}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors">
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
