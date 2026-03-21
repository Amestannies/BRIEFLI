'use client';

import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, MoreVertical, CheckCircle, AlertCircle,
  ChevronLeft, Mail, UserX, UserCheck, X,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
  barNumber?: string | null;
  createdAt: string;
}

const ROLES = ['ADMIN', 'ATTORNEY', 'PARALEGAL', 'STAFF'] as const;
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', ATTORNEY: 'Attorney', PARALEGAL: 'Paralegal', STAFF: 'Staff',
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  ATTORNEY: 'bg-blue-100 text-blue-700',
  PARALEGAL: 'bg-amber-100 text-amber-700',
  STAFF: 'bg-gray-100 text-gray-600',
};

function Avatar({ member }: { member: TeamMember }) {
  const initials = `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
  if (member.avatarUrl) {
    return <img src={member.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-[#3B4ECC]/10 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-[#3B4ECC]">{initials}</span>
    </div>
  );
}

export default function UsersSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('ATTORNEY');
  const [inviting, setInviting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<TeamMember[]>('/users').then((r) => setMembers(r.data))
      .catch(() => setError('Failed to load team members'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteFirstName.trim() || !inviteLastName.trim()) {
      setError('All invite fields are required'); return;
    }
    setInviting(true); setError(null);
    try {
      await api.post('/auth/register', {
        email: inviteEmail.trim(),
        firstName: inviteFirstName.trim(),
        lastName: inviteLastName.trim(),
        role: inviteRole,
        password: Math.random().toString(36).slice(-10) + 'Aa1!', // temp password
      });
      setSuccess(`${inviteFirstName} ${inviteLastName} has been added to the team.`);
      setShowInvite(false);
      setInviteEmail(''); setInviteFirstName(''); setInviteLastName('');
      load();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to add team member');
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleActive(member: TeamMember) {
    setOpenMenu(null);
    try {
      if (member.isActive) {
        await api.delete(`/users/${member.id}`);
        setSuccess(`${member.firstName} ${member.lastName} has been deactivated.`);
      } else {
        await api.patch(`/users/${member.id}`, { isActive: true });
        setSuccess(`${member.firstName} ${member.lastName} has been reactivated.`);
      }
      load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Action failed');
    }
  }

  async function handleRoleChange(member: TeamMember, newRole: string) {
    setOpenMenu(null);
    try {
      await api.patch(`/users/${member.id}`, { role: newRole });
      setSuccess(`Role updated for ${member.firstName} ${member.lastName}.`);
      load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to update role');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
            <p className="text-sm text-gray-500">Manage who has access to your firm.</p>
          </div>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3.5 text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Invite panel */}
      {showInvite && (
        <div className="bg-white border border-[#3B4ECC]/30 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#3B4ECC]" /> Add Team Member
            </h2>
            <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">First Name</label>
              <input type="text" value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)}
                placeholder="Jane" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Last Name</label>
              <input type="text" value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)}
                placeholder="Smith" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="jane@firmname.com" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC] bg-white">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowInvite(false)}
              className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleInvite} disabled={inviting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors">
              <Mail className="w-4 h-4" />
              {inviting ? 'Adding…' : 'Add Member'}
            </button>
          </div>
          <p className="text-xs text-gray-400">A temporary password will be generated. Ask them to change it after first login.</p>
        </div>
      )}

      {/* Members list */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No team members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div key={member.id} className={`flex items-center gap-4 p-4 ${!member.isActive ? 'opacity-50' : ''}`}>
                <Avatar member={member} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[member.role] ?? member.role}
                    </span>
                    {!member.isActive && (
                      <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  {member.barNumber && (
                    <p className="text-xs text-gray-400">Bar #{member.barNumber}</p>
                  )}
                </div>

                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenu === member.id && (
                    <div className="absolute right-0 top-8 z-10 w-48 bg-white border border-border rounded-xl shadow-lg py-1 text-sm">
                      <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Change Role</p>
                      {ROLES.map((r) => (
                        <button key={r} onClick={() => handleRoleChange(member, r)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors ${member.role === r ? 'text-[#3B4ECC] font-semibold' : 'text-gray-700'}`}>
                          <Shield className="w-3.5 h-3.5" />
                          {ROLE_LABELS[r]}
                          {member.role === r && <CheckCircle className="w-3 h-3 ml-auto" />}
                        </button>
                      ))}
                      <div className="border-t border-border my-1" />
                      <button onClick={() => handleToggleActive(member)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors ${member.isActive ? 'text-red-600' : 'text-green-600'}`}>
                        {member.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        {member.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        {members.filter(m => m.isActive).length} active member{members.filter(m => m.isActive).length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
