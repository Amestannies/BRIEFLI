'use client';

import Link from 'next/link';
import {
  Building2, Users, User, CreditCard, Bell, Shield, ChevronRight,
  CheckCircle,
} from 'lucide-react';

const SETTINGS_SECTIONS = [
  {
    href: '/settings/firm',
    icon: Building2,
    title: 'Firm Profile',
    desc: 'Update your firm name, logo, timezone, and branding.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/settings/users',
    icon: Users,
    title: 'Team Members',
    desc: 'Invite attorneys, manage roles, and deactivate accounts.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    href: '/settings/profile',
    icon: User,
    title: 'My Profile',
    desc: 'Edit your name, bar number, avatar, and change your password.',
    color: 'bg-green-50 text-green-600',
  },
  {
    href: '/settings/billing-prefs',
    icon: CreditCard,
    title: 'Billing Preferences',
    desc: 'Set default hourly rates, tax rate, currency, and invoice defaults.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    href: '/settings/notifications',
    icon: Bell,
    title: 'Notifications',
    desc: 'Control which email and in-app notifications you receive.',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    href: '/settings/security',
    icon: Shield,
    title: 'Security',
    desc: 'Two-factor authentication and active session management.',
    color: 'bg-gray-100 text-gray-600',
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your firm, team, and personal preferences.</p>
      </div>

      <div className="grid gap-3">
        {SETTINGS_SECTIONS.map(({ href, icon: Icon, title, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 bg-white border border-border rounded-xl p-5 hover:shadow-sm hover:border-gray-300 transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Plan badge */}
      <div className="bg-[#121845] rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-1">Current Plan</p>
          <p className="text-lg font-bold text-white">Starter</p>
          <p className="text-xs text-blue-200/60 mt-0.5">14-day free trial · Upgrade anytime</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            Active
          </div>
          <button className="px-4 py-1.5 bg-[#3B4ECC] text-white text-xs font-semibold rounded-lg hover:bg-[#2d3faa] transition-colors">
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}
